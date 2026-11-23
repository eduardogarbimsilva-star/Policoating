// =========================================================
// Policoating — Estimativa de frete por CEP (Supabase Edge Function) — etapa E05
//
// Regra (editável no painel, Comércio e Recursos → Frete):
//   • Destino na cidade de Matão OU até 10 km (linha reta) da saída → R$ 500 fixo.
//   • Fora disso → R$ 3 por km rodado (rota de caminhão, só ida), com mínimo de R$ 500.
//   • Sem rota confiável (CEP não encontrado, serviço fora do ar, sem rota de caminhão)
//     → "solicite cotação manual"; nunca inventa valor.
//   • Sempre é uma ESTIMATIVA; o valor final é confirmado pelo vendedor.
//
// Configuração (uma vez):
//   1. Edge Functions → Deploy a new function → nome "frete" → cole este arquivo → Deploy
//   2. Nos detalhes da função, DESLIGUE "Verify JWT" (visitantes sem login também calculam)
//   3. Secret ORS_API_KEY = chave do OpenRouteService (Edge Functions → Secrets)
//
// Pedidos (POST, JSON):
//   { acao: "estimar", cep, numero?, itens: [{ id, embalagem, qtd }] }   ← site (recurso precisa estar ligado)
//   { acao: "simular", cep, numero?, itens? }                            ← painel (administrador; ignora o liga/desliga)
//   { acao: "localizar_origem", cep, logradouro, numero, cidade, uf }    ← painel (administrador; acha a saída no mapa)
//   { acao: "cotar", nome, documento, telefone, email?, cep, logradouro, numero, complemento?, bairro,
//     descricao, peso_kg?, itens: [{ id, embalagem, cor?, qtd }] }      ← site (recurso "Cotação no site" ligado; PARTE U do setup.sql)
//     → grava a cotação com um código COT-XXXX-XXXX-XX válido por 7 dias e devolve o código
//   { acao: "consultar", protocolos: ["COT-…", …] }                      ← site (acompanhar pelo número; até 20 por pedido, com limite por IP)
// =========================================================

const ORIGENS = ["https://policoatingtintas.com.br", "https://www.policoatingtintas.com.br", "http://localhost:8000", "http://localhost:8765"];
const LIMITE_POR_IP = 30;          // cálculos por IP a cada 10 minutos
const ORS = "https://api.openrouteservice.org";

type Config = {
  origem_lat: number | null; origem_lng: number | null; origem_cidade: string; origem_uf: string;
  raio_local_m: number; tarifa_local: number; tarifa_km: number; minimo_externo: number; versao: number;
  prazo_base_dias?: number | null; km_por_dia?: number | null;
};
type Ponto = { lat: number; lng: number; confianca?: number; rotulo?: string };
type Item = { id: string; embalagem?: string; qtd?: number; cor?: string };
type Banco = ReturnType<typeof banco>;

/* ---------- regras puras (testadas em testes/frete.mjs) ---------- */
export const normalizar = (s: string) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
export const soDigitos = (s: unknown) => String(s ?? "").replace(/\D/g, "");

/** Distância em linha reta (metros) — fórmula de Haversine */
export function distanciaRetaM(a: Ponto, b: Ponto) {
  const R = 6371008.8, rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Peso total em kg a partir das embalagens do carrinho ("Caixa 25 kg", "Caixa 5 kg", "Sob medida (kg)") */
export function pesoTotalKg(itens: Item[]) {
  let kg = 0;
  for (const i of itens || []) {
    const qtd = Math.max(0, Math.min(100000, Number(i.qtd) || 0));
    const m = /(\d+(?:[.,]\d+)?)\s*kg/i.exec(String(i.embalagem || ""));
    kg += m ? qtd * Number(m[1].replace(",", ".")) : qtd;   // sob medida: a quantidade já é em kg
  }
  return Math.round(kg * 100) / 100;
}

/** Zona e valor. "local" se a cidade for a da saída OU a linha reta ≤ raio; senão por km rodado com mínimo */
export function calcularValor(cfg: Config, destino: { cidade: string; uf: string }, retaM: number, rotaM: number | null) {
  const mesmaCidade = normalizar(destino.cidade) === normalizar(cfg.origem_cidade) && normalizar(destino.uf) === normalizar(cfg.origem_uf);
  if (mesmaCidade || retaM <= cfg.raio_local_m) {
    return { zona: "local" as const, valor: Number(cfg.tarifa_local), km: null as number | null, minimoAplicado: false, motivo: mesmaCidade ? "cidade" : "raio" };
  }
  if (rotaM == null || !isFinite(rotaM) || rotaM <= 0) return { zona: "manual" as const, valor: null, km: null, minimoAplicado: false, motivo: "sem_rota" };
  const km = Math.ceil(rotaM / 100) / 10;                       // arredonda para cima, 1 casa (100,01 km → 100,1 km)
  const porKm = Math.round(km * Number(cfg.tarifa_km) * 100) / 100;
  const minimo = Number(cfg.minimo_externo);
  return { zona: "externo" as const, valor: Math.max(porKm, minimo), km, minimoAplicado: porKm < minimo, motivo: "km" };
}

/** Prazo estimado em dias úteis (só se o dono configurou no painel; senão null = o vendedor informa) */
export function prazoDias(cfg: Config, zona: string, km: number | null) {
  const base = cfg.prazo_base_dias, porDia = cfg.km_por_dia;
  if (base == null || !porDia || zona === "manual") return null;
  return Math.max(1, Number(base) + (zona === "externo" && km ? Math.ceil(km / Number(porDia)) : 0));
}

/* ---------- serviços externos ---------- */
const env = (k: string) => ((globalThis as any).Deno?.env.get(k) || "").trim();
function chaveServidor() {
  const antiga = env("SUPABASE_SERVICE_ROLE_KEY");
  if (antiga) return antiga;
  try { const k = Object.values(JSON.parse(env("SUPABASE_SECRET_KEYS") || "{}"))[0]; return typeof k === "string" ? k : ""; } catch { return ""; }
}
async function comTempo(url: string, init: RequestInit = {}, ms = 8000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try { return await fetch(url, { ...init, signal: ctl.signal }); } finally { clearTimeout(t); }
}
export async function buscarCep(cep: string) {
  const r = await comTempo(`https://viacep.com.br/ws/${cep}/json/`);
  if (!r.ok) return null;
  const d = await r.json();
  return d && !d.erro && d.localidade ? { logradouro: d.logradouro || "", bairro: d.bairro || "", cidade: d.localidade, uf: d.uf } : null;
}
/** Endereço → coordenadas pelo OpenRouteService (só aceita resultado no Brasil e na cidade certa) */
export async function geocodificar(chave: string, e: { logradouro?: string; numero?: string; cidade: string; uf: string; cep?: string }): Promise<Ponto | null> {
  const q = new URLSearchParams({ api_key: chave, country: "BR", locality: e.cidade, region: e.uf, size: "1" });
  if (e.logradouro) q.set("address", `${e.logradouro}${e.numero ? " " + e.numero : ""}`);
  if (e.cep) q.set("postalcode", e.cep.replace(/^(\d{5})(\d{3})$/, "$1-$2"));
  const r = await comTempo(`${ORS}/geocode/search/structured?${q}`);
  if (!r.ok) return null;
  const f = (await r.json())?.features?.[0];
  if (!f) return null;
  const [lng, lat] = f.geometry.coordinates;
  const loc = f.properties?.locality || f.properties?.county || "";
  if (loc && normalizar(loc) !== normalizar(e.cidade)) return null;   // caiu em outra cidade: não confia
  return { lat, lng, confianca: f.properties?.confidence, rotulo: f.properties?.label };
}
/** Distância de estrada (metros) para caminhão */
export async function distanciaRotaM(chave: string, a: Ponto, b: Ponto) {
  const r = await comTempo(`${ORS}/v2/directions/driving-hgv`, {
    method: "POST", headers: { Authorization: chave, "Content-Type": "application/json" },
    body: JSON.stringify({ coordinates: [[a.lng, a.lat], [b.lng, b.lat]], units: "m" })
  }, 12000);
  if (!r.ok) return null;
  const d = (await r.json())?.routes?.[0]?.summary?.distance;
  return typeof d === "number" ? d : null;
}

/* ---------- banco (PostgREST com a chave de servidor) ---------- */
function banco(url: string, chave: string) {
  const h = { apikey: chave, Authorization: `Bearer ${chave}`, "Content-Type": "application/json" };
  return {
    async get(caminho: string) { const r = await fetch(`${url}/rest/v1/${caminho}`, { headers: h }); return r.ok ? r.json() : null; },
    async rpc(nome: string, corpo: unknown) { const r = await fetch(`${url}/rest/v1/rpc/${nome}`, { method: "POST", headers: h, body: JSON.stringify(corpo) }); return r.ok ? r.json() : null; },
    async inserir(tabela: string, linha: unknown) { await fetch(`${url}/rest/v1/${tabela}`, { method: "POST", headers: { ...h, Prefer: "return=minimal" }, body: JSON.stringify(linha) }); },
    async inserirRetornando(tabela: string, linha: unknown) {
      const r = await fetch(`${url}/rest/v1/${tabela}`, { method: "POST", headers: { ...h, Prefer: "return=representation" }, body: JSON.stringify(linha) });
      let dados: any = null; try { dados = (await r.json())?.[0] ?? null; } catch { /* sem corpo */ }
      return { ok: r.ok && !!dados, status: r.status, dados };
    },
    /** quem está logado (cliente) a partir do token da sessão; null se o token não for de um usuário */
    async usuario(token: string): Promise<{ id: string; email: string } | null> {
      if (!token || token.split(".").length !== 3) return null;
      const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: chave, Authorization: `Bearer ${token}` } }).catch(() => null);
      if (!r || !r.ok) return null;
      const u = await r.json().catch(() => null);
      return u && u.id ? { id: String(u.id), email: String(u.email || "").toLowerCase() } : null;
    },
    async contar(caminho: string) {
      const r = await fetch(`${url}/rest/v1/${caminho}`, { method: "HEAD", headers: { ...h, Prefer: "count=exact" } });
      return Number((r.headers.get("content-range") || "*/0").split("/")[1]) || 0;
    },
    /** o token de quem chamou é de um administrador com 2 etapas? */
    async ehAdmin(token: string) {
      if (!token) return false;
      const r = await fetch(`${url}/rest/v1/rpc/eh_admin`, { method: "POST", headers: { apikey: chave, Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: "{}" });
      return r.ok && (await r.json()) === true;
    }
  };
}
async function hash(texto: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("policoating-frete:" + texto));
  return Array.from(new Uint8Array(b)).slice(0, 12).map((x) => x.toString(16).padStart(2, "0")).join("");
}

/* ---------- atendimento ---------- */
export async function atender(req: Request): Promise<Response> {
  const origem = req.headers.get("origin") || "";
  const cors = { "Access-Control-Allow-Origin": ORIGENS.includes(origem) ? origem : ORIGENS[0], "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const responder = (dados: unknown, status = 200) => Response.json(dados, { status, headers: cors });
  if (req.method !== "POST") return responder({ erro: "Use POST." }, 405);

  const url = env("SUPABASE_URL"), chave = chaveServidor(), ors = env("ORS_API_KEY");
  if (!url || !chave) return responder({ erro: "Função sem chave de servidor." }, 500);
  const db = banco(url, chave);
  let corpo: any; try { corpo = await req.json(); } catch { return responder({ erro: "Pedido inválido." }, 400); }
  const acao = String(corpo?.acao || "estimar");
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");

  // ---- painel: localizar a saída no mapa ----
  if (acao === "localizar_origem") {
    if (!(await db.ehAdmin(token))) return responder({ erro: "Só o administrador (com as 2 etapas) pode fazer isso." }, 403);
    if (!ors) return responder({ erro: "Falta o Secret ORS_API_KEY no Supabase (Edge Functions → Secrets)." }, 500);
    const cep = soDigitos(corpo.cep);
    const p = await geocodificar(ors, { logradouro: String(corpo.logradouro || ""), numero: String(corpo.numero || ""), cidade: String(corpo.cidade || ""), uf: String(corpo.uf || ""), cep: cep.length === 8 ? cep : undefined });
    if (!p) return responder({ erro: "Endereço não encontrado no mapa. Confira rua, número e cidade." }, 404);
    return responder({ lat: p.lat, lng: p.lng, rotulo: p.rotulo, confianca: p.confianca });
  }
  if (acao === "cotar") return await cotar(req, db, ors, corpo, token, responder);
  if (acao === "consultar") return await consultar(req, db, corpo, responder);
  if (acao !== "estimar" && acao !== "simular") return responder({ erro: "Ação desconhecida." }, 400);

  const simulacao = acao === "simular";
  if (simulacao && !(await db.ehAdmin(token))) return responder({ erro: "Só o administrador pode simular." }, 403);

  // ---- limite por IP (protege a cota do serviço de rotas) ----
  const ipHash = await hashIp(req);
  const desde = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  if (!simulacao && (await db.contar(`frete_estimativas?select=id&ip_hash=eq.${ipHash}&em=gte.${encodeURIComponent(desde)}`)) >= LIMITE_POR_IP)
    return responder({ erro: "Muitos cálculos seguidos. Aguarde alguns minutos ou fale com o vendedor." }, 429);

  // ---- recurso ligado? (no site) ----
  const itens = lerItens(corpo.itens);
  if (!simulacao) {
    // sem produtos (cotação só de frete) vale o liga/desliga geral; com produtos, cada um precisa estar liberado
    if (itens.some((i) => !/^[a-z0-9-]{2,60}$/.test(i.id))) return responder({ erro: "Produto inválido." }, 400);
    const vale = await recursoValeParaItens(db, "freight_estimate_enabled", itens);
    if (vale === "desligado") return responder({ erro: "Estimativa de frete indisponível no momento." }, 403);
    if (vale) return responder({ erro: "Estimativa de frete indisponível para este produto. Fale com o vendedor." }, 403);
  }

  // ---- configuração e endereço ----
  const cfg: Config | undefined = (await db.get("frete_config?select=*&id=eq.1"))?.[0];
  if (!cfg || cfg.origem_lat == null || cfg.origem_lng == null) return responder({ erro: "Frete ainda não configurado." }, 503);
  const cep = soDigitos(corpo.cep), numero = soDigitos(corpo.numero).slice(0, 6);
  if (cep.length !== 8 || /^(\d)\1+$/.test(cep)) return responder({ erro: "CEP inválido. Confira os 8 números." }, 400);
  const peso = pesoTotalKg(itens);
  const r = await calcularFrete(db, cfg, ors, cep, numero, peso, simulacao ? null : ipHash, simulacao);
  return responder({ ...r, peso_kg: peso });
}

/* ---------- partes reaproveitadas por "estimar" e "cotar" ---------- */
const MANUAL = "Não foi possível calcular automaticamente para este endereço. Solicite a cotação do frete ao vendedor.";
function lerItens(lista: unknown): Item[] {
  return Array.isArray(lista) ? lista.slice(0, 50).map((i: any) => ({
    id: String(i?.id || "").toLowerCase().slice(0, 60), embalagem: String(i?.embalagem || "").slice(0, 40),
    qtd: Number(i?.qtd) || 0, cor: String(i?.cor || "").slice(0, 60)
  })) : [];
}
async function hashIp(req: Request) {
  return hash((req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "desconhecido");
}
/** "" se o recurso vale para todos os produtos; "desligado" ou "produto" se não */
async function recursoValeParaItens(db: Banco, chave: string, itens: Item[]) {
  const rec = (await db.get(`recursos?select=ligado,implementado&chave=eq.${chave}`))?.[0];
  if (!rec || !rec.ligado || !rec.implementado) return "desligado";
  const ids = [...new Set(itens.map((i) => i.id))];
  if (!ids.length) return "";
  const prods: any[] = (await db.get(`produtos?select=id,ativo,categoria:dados->>categoria&id=in.(${ids.join(",")})`)) || [];
  for (const id of ids) {
    const p = prods.find((x) => x.id === id);
    if (!p || !p.ativo || !(await db.rpc("recurso_disponivel", { p_chave: chave, p_produto: id, p_categoria: p.categoria }))) return "produto";
  }
  return "";
}
/** Calcula o frete de um CEP (já validado). Registra a estimativa e devolve o resultado (nunca inventa valor) */
async function calcularFrete(db: Banco, cfg: Config, ors: string, cep: string, numero: string, peso: number, ipHash: string | null, simulacao: boolean) {
  const registrar = (linha: Record<string, unknown>) => db.inserir("frete_estimativas", { ip_hash: ipHash, cep, peso_kg: peso, versao: cfg.versao, simulacao, ...linha });
  const manual = async (motivo: string, extra: Record<string, unknown> = {}) => {
    await registrar({ zona: "manual", motivo, ...extra });
    return { zona: "manual", estimativa: true, mensagem: MANUAL, motivo, ...extra } as Record<string, unknown>;
  };
  const end = await buscarCep(cep).catch(() => null);
  if (!end) return manual("cep_nao_encontrado");
  const destinoTxt = { cidade: end.cidade, uf: end.uf };
  // Na cidade da saída já é local, mesmo sem achar a rua no mapa
  if (normalizar(end.cidade) === normalizar(cfg.origem_cidade) && normalizar(end.uf) === normalizar(cfg.origem_uf)) {
    const r = calcularValor(cfg, end, 0, null);
    await registrar({ zona: r.zona, cidade: end.cidade, uf: end.uf, valor: r.valor, motivo: r.motivo });
    return { zona: "local", estimativa: true, valor: r.valor, cidade: end.cidade, uf: end.uf, versao: cfg.versao, prazo_dias: prazoDias(cfg, "local", null), origem: `${cfg.origem_cidade}/${cfg.origem_uf}`, regra: `Entrega em ${cfg.origem_cidade}: valor fixo.` } as Record<string, unknown>;
  }
  if (!ors) return manual("sem_chave_rotas", destinoTxt);
  // Destino: rua + número quando houver; CEP geral da cidade = centro da cidade (estimativa pela cidade)
  const ponto = (end.logradouro ? await geocodificar(ors, { logradouro: end.logradouro, numero, cidade: end.cidade, uf: end.uf, cep }).catch(() => null) : null)
    || await geocodificar(ors, { cidade: end.cidade, uf: end.uf }).catch(() => null);
  if (!ponto) return manual("endereco_nao_localizado", destinoTxt);
  const saida = { lat: Number(cfg.origem_lat), lng: Number(cfg.origem_lng) };
  const retaM = distanciaRetaM(saida, ponto);
  const rotaM = retaM <= cfg.raio_local_m ? null : await distanciaRotaM(ors, saida, ponto).catch(() => null);
  const r = calcularValor(cfg, end, retaM, rotaM);
  if (r.zona === "manual") return manual("sem_rota_caminhao", { ...destinoTxt, distancia_radial_m: Math.round(retaM) });
  await registrar({ zona: r.zona, cidade: end.cidade, uf: end.uf, distancia_radial_m: Math.round(retaM), distancia_rota_m: rotaM == null ? null : Math.round(rotaM), valor: r.valor, motivo: r.motivo });
  const kmTxt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return {
    zona: r.zona, estimativa: true, valor: r.valor, km: r.km, minimo_aplicado: r.minimoAplicado, cidade: end.cidade, uf: end.uf, versao: cfg.versao,
    pela_cidade: !end.logradouro || !numero,
    tarifa_km: Number(cfg.tarifa_km), minimo: Number(cfg.minimo_externo),
    prazo_dias: prazoDias(cfg, r.zona, r.km), origem: `${cfg.origem_cidade}/${cfg.origem_uf}`,
    regra: r.zona === "local" ? `Até ${kmTxt(cfg.raio_local_m / 1000)} km de ${cfg.origem_cidade}: valor fixo.` : r.minimoAplicado ? `Valor mínimo para fora de ${cfg.origem_cidade}.` : `R$ ${Number(cfg.tarifa_km).toFixed(2).replace(".", ",")} por km rodado (só ida).`
  } as Record<string, unknown>;
}

/* ---------- cotação com código (E06/E07) ---------- */
const LIMITE_COTACOES_POR_HORA = 6;
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // sem 0/O e 1/I, que se confundem ao ditar o código
/** Código aleatório COT-XXXX-XXXX-XX (50 bits: não dá para adivinhar o de outra pessoa) */
export function gerarProtocolo() {
  const b = crypto.getRandomValues(new Uint8Array(10));
  const s = Array.from(b, (x) => ALFABETO[x % 32]).join("");
  return `COT-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
}
/** CPF (11) ou CNPJ (14) com dígitos verificadores certos */
export function documentoValido(doc: string) {
  const d = soDigitos(doc);
  if (!(d.length === 11 || d.length === 14) || /^(\d)\1+$/.test(d)) return false;
  const dv = (base: string, pesos: number[]) => { const s = pesos.reduce((t, p, i) => t + p * Number(base[i]), 0) % 11; return s < 2 ? 0 : 11 - s; };
  if (d.length === 11) {
    const p1 = [10, 9, 8, 7, 6, 5, 4, 3, 2], p2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
    return dv(d, p1) === Number(d[9]) && dv(d, p2) === Number(d[10]);
  }
  const q1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], q2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  return dv(d, q1) === Number(d[12]) && dv(d, q2) === Number(d[13]);
}
const OPCOES_ENTREGA: Record<string, string[]> = {
  tipo_local: ["comercial", "industrial", "residencial", "obra", "rural"],
  horario: ["comercial", "manha", "tarde", "combinar"],
  descarga: ["empilhadeira", "manual", "nao_sei"],
  prazo_desejado: ["urgente", "semana", "quinzena", "mes", "sem_pressa"]
};
/** Detalhes da entrega (opções fixas; o que vier fora delas é ignorado) */
export function lerEntrega(e: any) {
  const r: Record<string, unknown> = {};
  for (const [k, ops] of Object.entries(OPCOES_ENTREGA)) if (ops.includes(String(e?.[k] ?? ""))) r[k] = String(e[k]);
  if (typeof e?.agendamento === "boolean") r.agendamento = e.agendamento;
  const ref = texto(e?.referencia, 120); if (ref) r.referencia = ref;
  return r;
}
const texto = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

/* ---------- configuração do formulário (painel → Cotações → Configurar formulário; guardada em configuracoes.dados.cotacao) ----------
   Mesmas regras de assets/js/catalogo.js (CotacaoConfig). O CEP é sempre obrigatório. */
const PADRAO_CAMPOS: Record<string, string> = {
  produtos: "opcional", logradouro: "obrigatorio", numero: "obrigatorio", complemento: "opcional", bairro: "opcional", referencia: "opcional",
  tipo_local: "opcional", horario: "opcional", descarga: "opcional", agendamento: "opcional",
  documento: "obrigatorio", telefone: "obrigatorio", nome: "obrigatorio", email: "opcional",
  descricao: "obrigatorio", prazo_desejado: "opcional", peso: "opcional"
};
export function configCotacao(d: any) {
  d = d && typeof d === "object" ? d : {};
  const campos: Record<string, string> = {};
  for (const [k, p] of Object.entries(PADRAO_CAMPOS)) { const m = d.campos?.[k]; campos[k] = ["obrigatorio", "opcional", "oculto"].includes(m) ? m : p; }
  if (campos.telefone === "oculto" && campos.email === "oculto") campos.telefone = "obrigatorio";
  const v = d.veiculos && typeof d.veiculos === "object" ? d.veiculos : {};
  const lista = (Array.isArray(v.lista) ? v.lista : []).map((x: any) => ({ nome: String(x?.nome || "").replace(/\s+/g, " ").trim().slice(0, 40), pesoMax: Math.round(Number(x?.pesoMax) || 0) }))
    .filter((x: any) => x.nome && x.pesoMax > 0 && x.pesoMax <= 100000).slice(0, 12).sort((a: any, b: any) => a.pesoMax - b.pesoMax);
  const kg = Math.round(Number(d.pesoMaximo?.kg) || 0);
  return { campos, veiculos: { ativo: !!v.ativo && lista.length > 0, lista }, pesoMaximo: { ativo: !!d.pesoMaximo?.ativo && kg > 0 && kg <= 100000, kg } };
}

async function cotar(req: Request, db: Banco, ors: string, corpo: any, token: string, responder: (d: unknown, s?: number) => Response) {
  const cfgForm = configCotacao((await db.get("configuracoes?select=dados&id=eq.1"))?.[0]?.dados?.cotacao);
  const modo = (k: string) => cfgForm.campos[k];
  const exige = (k: string) => modo(k) === "obrigatorio", mostra = (k: string) => modo(k) !== "oculto";
  const val = (k: string, v: string) => (mostra(k) ? v : "");
  // dados do formulário (campo oculto no painel é ignorado; opcional só é conferido se veio preenchido)
  const nome = val("nome", texto(corpo.nome, 150)), documento = val("documento", soDigitos(corpo.documento)), telefone = val("telefone", soDigitos(corpo.telefone));
  const cep = soDigitos(corpo.cep), numero = val("numero", texto(corpo.numero, 20)), descricao = val("descricao", String(corpo.descricao ?? "").trim().slice(0, 2000));
  if (cep.length !== 8) return responder({ erro: "CEP inválido. Confira os 8 números." }, 400);
  if ((exige("nome") || nome) && nome.length < 3) return responder({ erro: "Informe o nome ou a razão social." }, 400);
  if ((exige("documento") || documento) && !documentoValido(documento)) return responder({ erro: "CPF ou CNPJ inválido. Confira os números." }, 400);
  if ((exige("telefone") || telefone) && !/^\d{10,11}$/.test(telefone)) return responder({ erro: "Telefone com DDD inválido." }, 400);
  if (exige("numero") && !numero) return responder({ erro: "Informe o número do endereço (ou S/N)." }, 400);
  if ((exige("descricao") || descricao) && descricao.length < 20) return responder({ erro: "Descreva o que precisa com um pouco mais de detalhe (mínimo de 20 letras)." }, 400);
  const itens = mostra("produtos") ? lerItens(corpo.itens).filter((i) => i.qtd > 0) : [];
  if (itens.length > 30 || itens.some((i) => !/^[a-z0-9-]{2,60}$/.test(i.id) || i.qtd > 100000)) return responder({ erro: "Escolha até 30 produtos com a quantidade." }, 400);
  if (exige("produtos") && !itens.length) return responder({ erro: "Escolha pelo menos um produto." }, 400);
  const entrega = lerEntrega(corpo.entrega);
  for (const k of ["tipo_local", "horario", "descarga", "prazo_desejado", "referencia", "agendamento"]) {
    if (!mostra(k)) delete entrega[k];
    else if (exige(k) && entrega[k] == null) return responder({ erro: "Preencha todos os campos obrigatórios da entrega." }, 400);
  }
  const email = val("email", texto(corpo.email, 150));
  if (exige("email") && !email) return responder({ erro: "Informe o e-mail." }, 400);

  // limite por IP (evita robôs enchendo a caixa da equipe)
  const ipHash = await hashIp(req);
  const desde = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  if ((await db.contar(`cotacoes?select=id&ip_hash=eq.${ipHash}&emitida_em=gte.${encodeURIComponent(desde)}`)) >= LIMITE_COTACOES_POR_HORA)
    return responder({ erro: "Muitas cotações seguidas deste aparelho. Aguarde um pouco ou fale com o vendedor pelo WhatsApp." }, 429);

  const vale = await recursoValeParaItens(db, "b2b_quote_enabled", itens);
  if (vale === "desligado") return responder({ erro: "A cotação pelo site está indisponível no momento. Fale com o vendedor pelo WhatsApp." }, 403);
  if (vale) return responder({ erro: "Um dos produtos não aceita cotação pelo site. Fale com o vendedor pelo WhatsApp." }, 403);

  const end = await buscarCep(cep).catch(() => null);
  if (!end) return responder({ erro: "CEP não encontrado. Confira os números." }, 400);
  const logradouro = val("logradouro", texto(corpo.logradouro, 150)) || (mostra("logradouro") ? end.logradouro : "");
  const bairro = val("bairro", texto(corpo.bairro, 80)) || (mostra("bairro") ? end.bairro : "");
  const complemento = val("complemento", texto(corpo.complemento, 80));
  if (exige("logradouro") && !logradouro) return responder({ erro: "Informe a rua." }, 400);
  if (exige("bairro") && !bairro) return responder({ erro: "Informe o bairro." }, 400);
  if (exige("complemento") && !complemento) return responder({ erro: "Informe o complemento." }, 400);

  // nomes vêm do catálogo, não do navegador
  const ids = [...new Set(itens.map((i) => i.id))];
  const prods: any[] = ids.length ? (await db.get(`produtos?select=id,nome:dados->>nome,codigo:dados->>codigo&id=in.(${ids.join(",")})`)) || [] : [];
  const itensGravados = itens.map((i) => { const p = prods.find((x) => x.id === i.id) || {}; return { id: i.id, codigo: p.codigo || i.id.toUpperCase(), nome: p.nome || i.id.toUpperCase(), embalagem: i.embalagem, cor: i.cor || null, qtd: i.qtd }; });
  const pesoCalc = pesoTotalKg(itens), pesoInf = Number(String(corpo.peso_kg ?? "").replace(",", "."));
  const peso = isFinite(pesoInf) && pesoInf > 0 && pesoInf <= 1000000 ? Math.round(pesoInf * 100) / 100 : pesoCalc;
  if ((exige("peso") || (!itens.length && mostra("peso"))) && !(peso > 0)) return responder({ erro: itens.length ? "Informe o peso total." : "Sem produtos: informe o peso total da carga." }, 400);
  // peso máximo e veículo (se ligados no painel)
  if (cfgForm.pesoMaximo.ativo && peso > cfgForm.pesoMaximo.kg) return responder({ erro: `O peso passa do máximo por cotação (${cfgForm.pesoMaximo.kg} kg). Fale com o vendedor.` }, 400);
  if (cfgForm.veiculos.ativo) {
    const v = cfgForm.veiculos.lista.find((x) => x.nome === String(corpo.entrega?.veiculo || ""));
    if (!v) return responder({ erro: "Escolha o veículo da entrega." }, 400);
    if (v.pesoMax < peso) return responder({ erro: `${v.nome} leva até ${v.pesoMax} kg. Escolha outro veículo.` }, 400);
    entrega.veiculo = v.nome; entrega.veiculo_peso_max = v.pesoMax;
  }

  // frete automático só se o recurso de frete valer (para todos os produtos, quando houver); senão a equipe calcula
  let frete: Record<string, unknown> = { zona: "manual", motivo: "frete_pelo_vendedor" };
  if (!(await recursoValeParaItens(db, "freight_estimate_enabled", itens))) {
    const cfg: Config | undefined = (await db.get("frete_config?select=*&id=eq.1"))?.[0];
    if (cfg && cfg.origem_lat != null && cfg.origem_lng != null) frete = await calcularFrete(db, cfg, ors, cep, soDigitos(numero).slice(0, 6), peso, ipHash, false);
  }

  const cliente = token ? await db.usuario(token) : null;
  const emailFinal = cliente?.email || (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email.toLowerCase() : null);
  const linha = {
    cliente_id: cliente?.id || null, ip_hash: ipHash, nome: nome || null, documento: documento || null, telefone: telefone || null, email: emailFinal, cep,
    logradouro: logradouro || null, numero: numero || null, complemento: complemento || null, bairro: bairro || null, cidade: end.cidade, uf: end.uf,
    descricao: descricao || null, itens: itensGravados, peso_kg: peso || null, frete, entrega
  };
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const r = await db.inserirRetornando("cotacoes", { ...linha, protocolo: gerarProtocolo() });
    if (r.ok) {
      const c = r.dados;
      return responder({ protocolo: c.protocolo, emitida_em: c.emitida_em, expira_em: c.expira_em, status: c.status, frete, peso_kg: peso, cidade: end.cidade, uf: end.uf, bairro, logradouro, numero, cep, itens: itensGravados, entrega });
    }
    if (r.status !== 409) return responder({ erro: "Não foi possível registrar a cotação agora. Tente de novo ou fale com o vendedor." }, 500);
  }
  return responder({ erro: "Não foi possível gerar o código. Tente de novo." }, 500);
}

/* ---------- acompanhar pelo número (com limite por IP: protege contra tentativa e erro) ---------- */
const LIMITE_CONSULTAS = 60, LIMITE_ERROS = 15;   // por IP a cada 10 minutos
export const normalizarProtocolo = (v: unknown) => {
  const t = String(v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^COT/, "");
  return t.length === 10 ? `COT-${t.slice(0, 4)}-${t.slice(4, 8)}-${t.slice(8)}` : "";
};
async function consultar(req: Request, db: Banco, corpo: any, responder: (d: unknown, s?: number) => Response) {
  const lista = [...new Set((Array.isArray(corpo.protocolos) ? corpo.protocolos : [corpo.protocolo]).slice(0, 20).map(normalizarProtocolo).filter(Boolean))];
  if (!lista.length) return responder({ erro: "Número incompleto. Ele tem o formato COT-XXXX-XXXX-XX." }, 400);
  const ipHash = await hashIp(req);
  const desde = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const recentes: any[] = (await db.get(`cotacoes_consultas?select=erros&ip_hash=eq.${ipHash}&em=gte.${encodeURIComponent(desde)}`)) || [];
  const erros = recentes.reduce((t, r) => t + (Number(r.erros) || 0), 0);
  if (recentes.length >= LIMITE_CONSULTAS || erros >= LIMITE_ERROS)
    return responder({ erro: "Muitas consultas seguidas. Aguarde alguns minutos e tente de novo." }, 429);
  const achadas: any[] = [];
  for (const p of lista) { const r = await db.rpc("consultar_cotacao", { p_protocolo: p }); if (Array.isArray(r) && r[0]) achadas.push(r[0]); }
  const falhas = lista.length - achadas.length;
  await db.inserir("cotacoes_consultas", { ip_hash: ipHash, n: lista.length, erros: falhas });
  return responder({ cotacoes: achadas, nao_encontrados: falhas });
}

if ((globalThis as any).Deno?.serve) (globalThis as any).Deno.serve(atender);
