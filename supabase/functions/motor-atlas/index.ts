// =========================================================
// Motor na web para os programas ATLAS CONTROL e ATLAS DAILY
//
// Os programas ATLAS usam a IA (Claude) direto do computador. Com este motor, a chave
// da Anthropic deixa de ficar em cada computador: ela fica só aqui, nos Secrets do
// Supabase, e cada computador usa um CÓDIGO DE ACESSO que pode ser trocado ou
// cancelado a qualquer momento, sem mexer nos outros.
//
// Funciona como uma ponte: o programa manda o pedido do mesmo jeito que mandaria para
// a Anthropic; a função confere o código, aplica os limites, troca o código pela chave
// verdadeira e devolve a resposta (inclusive aos pouquinhos, em tempo real).
// O consumo de cada código fica na tabela ia_uso (PARTE Q do setup.sql).
//
// Configuração (painel do Supabase):
//   1. Edge Functions -> Deploy a new function -> nome "motor-atlas" -> cole este arquivo
//   2. Desative "Verify JWT"
//   3. Secrets:
//      ANTHROPIC_API_KEY  a chave da Anthropic (a mesma da Central IA)
//      ATLAS_CODIGOS      códigos de acesso, um por computador ou setor: nome:codigo, separados por vírgula
//                         ex.: escritorio:Kq83-hT2a-99xP,estoque:Zp10-aa7B-c4Lm  (invente códigos longos)
//      IA_LIMITE_MES_USD  (opcional) limite de gasto do mês, somando Central IA e ATLAS (padrão 50)
//   4. No programa ATLAS: botão da IA -> Chave -> "Motor na web" -> endereço desta função + o código
// =========================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const API = "https://api.anthropic.com";
const MODELOS = ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-4-5"];
// Preço em dólar por milhão de tokens (entrada, saída) — confira em claude.com/pricing
const PRECOS: Record<string, [number, number]> = {
  "claude-opus-5-5": [4, 20], "claude-sonnet-5-5": [2, 10], "claude-haiku-4-5": [1, 5],
};
const MAX_TOKENS = 64000;
const PEDIDOS_POR_HORA = 200;   // por código de acesso

const env = (k: string) => (Deno.env.get(k) || "").trim();
function chaveServidor() {
  const antiga = env("SUPABASE_SERVICE_ROLE_KEY");
  if (antiga) return antiga;
  try { const k = Object.values(JSON.parse(env("SUPABASE_SECRET_KEYS") || "{}"))[0]; return typeof k === "string" ? k : ""; } catch { return ""; }
}
function codigos(): Map<string, string> {
  const m = new Map<string, string>();
  for (const par of env("ATLAS_CODIGOS").split(",")) {
    const i = par.indexOf(":");
    const nome = par.slice(0, i).trim(), codigo = par.slice(i + 1).trim();
    if (i > 0 && codigo.length >= 12) m.set(codigo, nome);
  }
  return m;
}
const acessos = new Map<string, number[]>();
function excedeu(nome: string) {
  const agora = Date.now(), lista = (acessos.get(nome) || []).filter((t) => agora - t < 3600000);
  lista.push(agora); acessos.set(nome, lista);
  return lista.length > PEDIDOS_POR_HORA;
}

/** Erro no mesmo formato da Anthropic: o programa ATLAS mostra a mensagem certa ao usuário */
function erroApi(status: number, tipo: string, mensagem: string, cors: HeadersInit) {
  return Response.json({ type: "error", error: { type: tipo, message: mensagem } }, { status, headers: cors });
}

/** Lê o consumo de tokens da resposta (normal ou em tempo real) */
async function lerUso(corpo: ReadableStream<Uint8Array>, emTempoReal: boolean) {
  const texto = await new Response(corpo).text();
  const uso = { entrada: 0, saida: 0, cacheLeitura: 0, cacheEscrita: 0, buscas: 0, modelo: "" };
  const somar = (u: Record<string, any> | undefined, final: boolean) => {
    if (!u) return;
    if (u.input_tokens != null) uso.entrada = u.input_tokens;
    if (u.cache_read_input_tokens != null) uso.cacheLeitura = u.cache_read_input_tokens;
    if (u.cache_creation_input_tokens != null) uso.cacheEscrita = u.cache_creation_input_tokens;
    if (u.output_tokens != null) uso.saida = final ? u.output_tokens : Math.max(uso.saida, u.output_tokens);
    if (u.server_tool_use?.web_search_requests != null) uso.buscas = u.server_tool_use.web_search_requests;
  };
  try {
    if (!emTempoReal) { const j = JSON.parse(texto); uso.modelo = j.model || ""; somar(j.usage, true); return uso; }
    for (const linha of texto.split("\n")) {
      if (!linha.startsWith("data:")) continue;
      const ev = JSON.parse(linha.slice(5));
      if (ev.type === "message_start") { uso.modelo = ev.message?.model || ""; somar(ev.message?.usage, false); }
      if (ev.type === "message_delta") somar(ev.usage, true);
    }
  } catch { /* resposta incompleta: grava o que deu para ler */ }
  return uso;
}

Deno.serve(async (req) => {
  // Os programas ATLAS rodam fora de um site (programa do Windows ou app instalado): qualquer origem,
  // mas sempre com um código de acesso válido.
  const cors: Record<string, string> = {
    "Access-Control-Allow-Origin": req.headers.get("origin") || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": req.headers.get("access-control-request-headers") || "content-type, x-api-key, anthropic-version, anthropic-beta",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin, Access-Control-Request-Headers",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const caminho = new URL(req.url).pathname;
  if (req.method !== "POST" || !/\/v1\/messages$/.test(caminho)) {
    return erroApi(404, "not_found_error", "O motor do ATLAS só atende pedidos de conversa (/v1/messages).", cors);
  }

  const chave = env("ANTHROPIC_API_KEY");
  if (!chave) return erroApi(500, "api_error", "O motor está sem a chave da Anthropic (Secret ANTHROPIC_API_KEY).", cors);
  const nome = codigos().get((req.headers.get("x-api-key") || "").trim());
  if (!nome) return erroApi(401, "authentication_error", "Código de acesso do motor inválido ou cancelado. Confira com o administrador.", cors);
  if (excedeu(nome)) return erroApi(429, "rate_limit_error", "Muitos pedidos deste computador na última hora. Aguarde um pouco.", cors);

  let corpo: Record<string, any>;
  try { corpo = await req.json(); } catch { return erroApi(400, "invalid_request_error", "Pedido inválido.", cors); }
  if (!MODELOS.includes(corpo.model)) return erroApi(400, "invalid_request_error", `Modelo não liberado no motor: ${corpo.model}. Liberados: ${MODELOS.join(", ")}.`, cors);
  if (!(+corpo.max_tokens > 0)) corpo.max_tokens = 16000;
  corpo.max_tokens = Math.min(+corpo.max_tokens, MAX_TOKENS);
  delete corpo.mcp_servers; delete corpo.container;

  // Limite de gasto do mês (somando Central IA e ATLAS)
  const url = env("SUPABASE_URL"), chaveSb = chaveServidor();
  const adm = url && chaveSb ? createClient(url, chaveSb, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  const limite = +(env("IA_LIMITE_MES_USD") || 50);
  if (adm && limite > 0) {
    const agora = new Date(), inicio = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), 1)).toISOString();
    const { data } = await adm.from("ia_uso").select("custo_usd").gte("criado_em", inicio).limit(100000);
    const gasto = (data || []).reduce((s, r) => s + (+r.custo_usd || 0), 0);
    if (gasto >= limite) return erroApi(429, "rate_limit_error", `O limite mensal de IA (US$ ${limite}) foi atingido. Fale com o administrador.`, cors);
  }

  const cabecalhos: Record<string, string> = {
    "content-type": "application/json",
    "x-api-key": chave,
    "anthropic-version": req.headers.get("anthropic-version") || "2023-06-01",
  };
  const betas = req.headers.get("anthropic-beta");
  if (betas) cabecalhos["anthropic-beta"] = betas;

  const resposta = await fetch(`${API}/v1/messages${new URL(req.url).search}`, { method: "POST", headers: cabecalhos, body: JSON.stringify(corpo) });
  const emTempoReal = (resposta.headers.get("content-type") || "").includes("text/event-stream");

  const extras: Record<string, string> = { ...cors, "content-type": resposta.headers.get("content-type") || "application/json", "cache-control": "no-store" };
  const rid = resposta.headers.get("request-id"); if (rid) extras["request-id"] = rid;
  const retry = resposta.headers.get("retry-after"); if (retry) extras["retry-after"] = retry;
  if (!resposta.body) return new Response(null, { status: resposta.status, headers: extras });

  // Uma cópia vai para o programa, a outra é lida aqui para registrar o consumo
  const [paraPrograma, paraContar] = resposta.body.tee();
  const registrar = (async () => {
    const u = await lerUso(paraContar, emTempoReal);
    if (!adm || !resposta.ok) return;
    const [pe, ps] = PRECOS[corpo.model] || PRECOS["claude-opus-5-5"];
    const usd = (u.entrada * pe + u.saida * ps + u.cacheLeitura * pe * 0.05 + u.cacheEscrita * pe * 1.25) / 1e6 + u.buscas * 0.01;
    const { error } = await adm.from("ia_uso").insert({
      email: `atlas:${nome}`, origem: "atlas", ferramenta: "atlas", modelo: u.modelo || corpo.model,
      entrada: u.entrada + u.cacheLeitura + u.cacheEscrita, saida: u.saida, buscas: u.buscas, custo_usd: usd, erro: null,
    });
    if (error) console.error("ia_uso:", error.message);
  })();
  // deno-lint-ignore no-explicit-any
  (globalThis as any).EdgeRuntime?.waitUntil?.(registrar);

  return new Response(paraPrograma, { status: resposta.status, headers: extras });
});
