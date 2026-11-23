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
// =========================================================

const ORIGENS = ["https://policoatingtintas.com.br", "https://www.policoatingtintas.com.br", "http://localhost:8000", "http://localhost:8765"];
const LIMITE_POR_IP = 30;          // cálculos por IP a cada 10 minutos
const ORS = "https://api.openrouteservice.org";

type Config = {
  origem_lat: number | null; origem_lng: number | null; origem_cidade: string; origem_uf: string;
  raio_local_m: number; tarifa_local: number; tarifa_km: number; minimo_externo: number; versao: number;
};
type Ponto = { lat: number; lng: number; confianca?: number; rotulo?: string };
type Item = { id: string; embalagem?: string; qtd?: number };

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
  const MANUAL = "Não foi possível calcular automaticamente para este endereço. Solicite a cotação do frete ao vendedor.";
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
  if (acao !== "estimar" && acao !== "simular") return responder({ erro: "Ação desconhecida." }, 400);

  const simulacao = acao === "simular";
  if (simulacao && !(await db.ehAdmin(token))) return responder({ erro: "Só o administrador pode simular." }, 403);

  // ---- limite por IP (protege a cota do serviço de rotas) ----
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "desconhecido";
  const ipHash = await hash(ip);
  const desde = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  if (!simulacao && (await db.contar(`frete_estimativas?select=id&ip_hash=eq.${ipHash}&em=gte.${encodeURIComponent(desde)}`)) >= LIMITE_POR_IP)
    return responder({ erro: "Muitos cálculos seguidos. Aguarde alguns minutos ou fale com o vendedor." }, 429);

  // ---- recurso ligado? (no site) ----
  const itens: Item[] = Array.isArray(corpo.itens) ? corpo.itens.slice(0, 50).map((i: any) => ({ id: String(i?.id || "").toLowerCase().slice(0, 60), embalagem: String(i?.embalagem || "").slice(0, 40), qtd: Number(i?.qtd) || 0 })) : [];
  if (!simulacao) {
    const rec = (await db.get("recursos?select=ligado,implementado&chave=eq.freight_estimate_enabled"))?.[0];
    if (!rec || !rec.ligado || !rec.implementado) return responder({ erro: "Estimativa de frete indisponível no momento." }, 403);
    if (!itens.length || itens.some((i) => !/^[a-z0-9-]{2,60}$/.test(i.id))) return responder({ erro: "Informe o produto." }, 400);
    const ids = [...new Set(itens.map((i) => i.id))];
    const prods: any[] = (await db.get(`produtos?select=id,ativo,categoria:dados->>categoria&id=in.(${ids.join(",")})`)) || [];
    for (const id of ids) {
      const p = prods.find((x) => x.id === id);
      if (!p || !p.ativo || !(await db.rpc("recurso_disponivel", { p_chave: "freight_estimate_enabled", p_produto: id, p_categoria: p.categoria })))
        return responder({ erro: "Estimativa de frete indisponível para este produto. Fale com o vendedor." }, 403);
    }
  }

  // ---- configuração e endereço ----
  const cfg: Config | undefined = (await db.get("frete_config?select=*&id=eq.1"))?.[0];
  if (!cfg || cfg.origem_lat == null || cfg.origem_lng == null) return responder({ erro: "Frete ainda não configurado." }, 503);
  const cep = soDigitos(corpo.cep), numero = soDigitos(corpo.numero).slice(0, 6);
  if (cep.length !== 8 || /^(\d)\1+$/.test(cep)) return responder({ erro: "CEP inválido. Confira os 8 números." }, 400);
  const peso = pesoTotalKg(itens);
  const registrar = (linha: Record<string, unknown>) => db.inserir("frete_estimativas", { ip_hash: simulacao ? null : ipHash, cep, peso_kg: peso, versao: cfg.versao, simulacao, ...linha });
  const manual = async (motivo: string, extra: Record<string, unknown> = {}) => {
    await registrar({ zona: "manual", motivo, ...extra });
    return responder({ zona: "manual", estimativa: true, mensagem: MANUAL, motivo, peso_kg: peso, ...extra });
  };

  const end = await buscarCep(cep).catch(() => null);
  if (!end) return manual("cep_nao_encontrado");
  const destinoTxt = { cidade: end.cidade, uf: end.uf };
  if (!ors) return manual("sem_chave_rotas", destinoTxt);

  // Na cidade da saída já é local, mesmo sem achar a rua no mapa
  if (normalizar(end.cidade) === normalizar(cfg.origem_cidade) && normalizar(end.uf) === normalizar(cfg.origem_uf)) {
    const r = calcularValor(cfg, end, 0, null);
    await registrar({ zona: r.zona, cidade: end.cidade, uf: end.uf, valor: r.valor, motivo: r.motivo });
    return responder({ zona: "local", estimativa: true, valor: r.valor, cidade: end.cidade, uf: end.uf, peso_kg: peso, versao: cfg.versao, regra: "Entrega em Matão: valor fixo." });
  }

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
  return responder({
    zona: r.zona, estimativa: true, valor: r.valor, km: r.km, minimo_aplicado: r.minimoAplicado, cidade: end.cidade, uf: end.uf, peso_kg: peso, versao: cfg.versao,
    pela_cidade: !end.logradouro || !numero,
    regra: r.zona === "local" ? "Até 10 km de Matão: valor fixo." : r.minimoAplicado ? "Valor mínimo para fora de Matão." : `R$ ${Number(cfg.tarifa_km).toFixed(2).replace(".", ",")} por km rodado (só ida).`
  });
}

if ((globalThis as any).Deno?.serve) (globalThis as any).Deno.serve(atender);
