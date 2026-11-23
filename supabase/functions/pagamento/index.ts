// =========================================================
// Policoating — Compra direta com Pix ou cartão via Mercado Pago (Supabase Edge Function) — etapa E09
//
// Como funciona:
//   1. O site registra o pedido pelo banco (criar_pedido: preços do catálogo, conferidos no servidor).
//   2. { acao: "criar", numero } → esta função confere o pedido, soma o frete estimado (função "frete"),
//      cria a preferência no Mercado Pago (Checkout Pro) e devolve o link de pagamento.
//      O cliente paga NO Mercado Pago (Pix ou cartão): o site nunca vê dados de cartão.
//   3. O Mercado Pago avisa aqui (webhook ASSINADO). A função busca o pagamento na API do Mercado Pago,
//      confere o valor e só então marca o pedido como pago.
//
// Configuração (uma vez):
//   1. Edge Functions → Deploy a new function → nome "pagamento" → cole este arquivo → Deploy
//   2. DESLIGUE "Verify JWT" (o aviso do Mercado Pago chega sem login; o cliente é conferido aqui)
//   3. Secrets: MP_ACCESS_TOKEN = Access Token de PRODUÇÃO da conta de vendedor da EMPRESA
//               MP_WEBHOOK_SECRET = "Assinatura secreta" das Notificações (Webhooks) da mesma aplicação
//      No Mercado Pago (Suas integrações → aplicação → Webhooks), a URL é:
//               https://<projeto>.supabase.co/functions/v1/pagamento?acao=webhook   (evento: Pagamentos)
//   4. Rode a PARTE AD do setup.sql. O recurso "Compra direta" continua DESLIGADO até você testar.
// =========================================================

const ORIGENS = ["https://policoatingtintas.com.br", "https://www.policoatingtintas.com.br", "http://localhost:8000", "http://localhost:8765"];
const MP = "https://api.mercadopago.com";
const PRAZO_PEDIDO_MIN = 120;        // o pedido precisa ter sido criado há menos de 2 h para pagar online
const TOLERANCIA = 0.01;

type Pedido = { numero: string; cliente_id: string; itens: any[]; status: string; total: number; tem_combinar: boolean; destino_cep: string;
  destino_cidade: string; destino_uf: string; criado_em: string; pagamento_status: string | null };

/* ---------- regras puras (testadas em testes/pagamento.mjs) ---------- */
export const centavos = (v: number) => Math.round(Number(v) * 100) / 100;
/** situação do Mercado Pago → situação do pedido */
export function situacao(mp: string) {
  if (mp === "approved") return "aprovado";
  if (mp === "rejected" || mp === "cancelled") return "recusado";
  if (mp === "refunded" || mp === "charged_back") return "estornado";
  return "pendente";   // pending, in_process, authorized, in_mediation
}
export function metodo(tipo: string) {
  return ({ bank_transfer: "Pix", account_money: "Saldo Mercado Pago", credit_card: "Cartão de crédito", debit_card: "Cartão de débito", ticket: "Boleto" } as Record<string, string>)[tipo] || tipo || "";
}
/** itens da preferência: uma linha por item do pedido (valor do servidor) + o frete */
export function itensPreferencia(p: Pedido, frete: number) {
  const linhas = (p.itens || []).map((i: any, n: number) => ({
    id: String(i.codigo || i.id || n + 1).slice(0, 60),
    title: `${i.qtd} × ${i.embalagem} — ${i.nome}`.slice(0, 250),
    quantity: 1, currency_id: "BRL", unit_price: centavos(i.subtotal)
  }));
  if (frete > 0) linhas.push({ id: "FRETE", title: `Frete até ${p.destino_cidade}/${p.destino_uf} (saindo de Matão-SP)`, quantity: 1, currency_id: "BRL", unit_price: centavos(frete) });
  return linhas;
}
/** confere a assinatura do aviso: HMAC-SHA256 de "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" com a assinatura secreta */
export async function assinaturaValida(cabecalho: string, requestId: string, dataId: string, segredo: string) {
  if (!segredo || !cabecalho) return false;
  const partes = Object.fromEntries(cabecalho.split(",").map((x) => x.trim().split("=", 2) as [string, string]));
  const ts = partes.ts, v1 = partes.v1;
  if (!ts || !v1) return false;
  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  let manifesto = "";
  if (id) manifesto += `id:${id};`;
  if (requestId) manifesto += `request-id:${requestId};`;
  manifesto += `ts:${ts};`;
  const chave = await crypto.subtle.importKey("raw", new TextEncoder().encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const assin = new Uint8Array(await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(manifesto)));
  const hex = Array.from(assin).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex.length !== v1.length) return false;
  let dif = 0; for (let i = 0; i < hex.length; i++) dif |= hex.charCodeAt(i) ^ v1.charCodeAt(i);
  return dif === 0;
}

/* ---------- banco e serviços ---------- */
const env = (k: string) => ((globalThis as any).Deno?.env.get(k) || "").trim();
function chaveServidor() {
  const antiga = env("SUPABASE_SERVICE_ROLE_KEY");
  if (antiga) return antiga;
  try { const k = Object.values(JSON.parse(env("SUPABASE_SECRET_KEYS") || "{}"))[0]; return typeof k === "string" ? k : ""; } catch { return ""; }
}
function banco(url: string, chave: string) {
  const h = { apikey: chave, Authorization: `Bearer ${chave}`, "Content-Type": "application/json" };
  return {
    async get(caminho: string) { const r = await fetch(`${url}/rest/v1/${caminho}`, { headers: h }); return r.ok ? r.json() : null; },
    async rpc(nome: string, corpo: unknown) { const r = await fetch(`${url}/rest/v1/rpc/${nome}`, { method: "POST", headers: h, body: JSON.stringify(corpo) }); return r.ok ? r.json() : null; },
    async inserir(tabela: string, linha: unknown) {
      const r = await fetch(`${url}/rest/v1/${tabela}`, { method: "POST", headers: { ...h, Prefer: "return=representation" }, body: JSON.stringify(linha) });
      try { return r.ok ? (await r.json())?.[0] ?? null : null; } catch { return null; }
    },
    async alterar(caminho: string, dados: unknown) {
      const r = await fetch(`${url}/rest/v1/${caminho}`, { method: "PATCH", headers: { ...h, Prefer: "return=minimal" }, body: JSON.stringify(dados) });
      return r.ok;
    },
    async usuario(token: string): Promise<{ id: string; email: string } | null> {
      if (!token || token.split(".").length !== 3) return null;
      const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: chave, Authorization: `Bearer ${token}` } }).catch(() => null);
      if (!r || !r.ok) return null;
      const u = await r.json().catch(() => null);
      return u && u.id ? { id: String(u.id), email: String(u.email || "").toLowerCase() } : null;
    }
  };
}
type Banco = ReturnType<typeof banco>;
async function comTempo(url: string, init: RequestInit = {}, ms = 15000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try { return await fetch(url, { ...init, signal: ctl.signal }); } finally { clearTimeout(t); }
}

/* ---------- criar o pagamento ---------- */
async function criar(req: Request, db: Banco, url: string, corpo: any, token: string, responder: (d: unknown, s?: number) => Response) {
  const mpToken = env("MP_ACCESS_TOKEN");
  if (!mpToken) return responder({ erro: "Pagamento online ainda não configurado. Envie o pedido pelo WhatsApp." }, 503);
  const eu = await db.usuario(token);
  if (!eu) return responder({ erro: "Entre na sua conta para pagar." }, 401);
  const numero = String(corpo.numero || "").toUpperCase();
  if (!/^PC-\d{6}-[A-Z0-9]{5}$/.test(numero)) return responder({ erro: "Pedido inválido." }, 400);
  const p: Pedido | undefined = (await db.get(`pedidos?select=numero,cliente_id,itens,status,total,tem_combinar,destino_cep,destino_cidade,destino_uf,criado_em,pagamento_status&numero=eq.${numero}&cliente_id=eq.${eu.id}`))?.[0];
  if (!p) return responder({ erro: "Pedido não encontrado na sua conta." }, 404);
  if (p.status !== "recebido") return responder({ erro: "Este pedido já está em andamento com o vendedor." }, 409);
  if (p.pagamento_status === "aprovado") return responder({ erro: "Este pedido já foi pago." }, 409);
  if (Date.now() - new Date(p.criado_em).getTime() > PRAZO_PEDIDO_MIN * 60000) return responder({ erro: "Pedido antigo: monte o carrinho de novo para pagar online." }, 409);
  if (p.tem_combinar || !(Number(p.total) > 0)) return responder({ erro: "Há itens com preço a consultar: finalize pelo WhatsApp com o vendedor." }, 409);

  // todos os produtos liberados para a compra direta (Comércio e Recursos)
  const ids = [...new Set((p.itens || []).map((i: any) => String(i.id)))];
  const prods: any[] = (await db.get(`produtos?select=id,categoria:dados->>categoria&id=in.(${ids.join(",")})`)) || [];
  for (const id of ids) {
    const pr = prods.find((x) => x.id === id);
    if (!pr || !(await db.rpc("recurso_disponivel", { p_chave: "direct_checkout_enabled", p_produto: id, p_categoria: pr.categoria }))) return responder({ erro: "Um dos produtos não está liberado para pagamento online. Envie pelo WhatsApp." }, 409);
  }

  // frete: mesma estimativa do site (função "frete"); sem valor confiável, não cobra online
  const cli = (await db.get(`clientes?select=nome,razao_social,tipo,numero&id=eq.${eu.id}`))?.[0] || {};
  let fr: any = null;
  try {
    const r = await comTempo(`${url}/functions/v1/frete`, { method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": (req.headers.get("x-forwarded-for") || "").split(",")[0] },
      body: JSON.stringify({ acao: "estimar", cep: p.destino_cep, numero: cli.numero || "", itens: (p.itens || []).map((i: any) => ({ id: i.id, embalagem: i.embalagem, qtd: i.qtd })) }) }, 35000);
    fr = r.ok ? await r.json() : null;
  } catch { fr = null; }
  if (!fr || fr.zona === "manual" || fr.valor == null) return responder({ erro: "Não conseguimos calcular o frete para este endereço agora. Envie o pedido pelo WhatsApp: o vendedor informa o frete." }, 409);
  const frete = centavos(fr.valor), produtos = centavos(p.total), total = centavos(produtos + frete);

  const pag = await db.inserir("pagamentos", { pedido_numero: numero, cliente_id: eu.id, valor_produtos: produtos, valor_frete: frete, valor_total: total });
  if (!pag) return responder({ erro: "Não foi possível iniciar o pagamento. Tente de novo." }, 500);
  const origem = req.headers.get("origin") || "", site = ORIGENS.includes(origem) ? origem : ORIGENS[0];
  const volta = (s: string) => `${site}/conta?pagamento=${s}&pedido=${encodeURIComponent(numero)}#pedidos`;
  const nome = String((cli.tipo === "pj" ? cli.razao_social : cli.nome) || "").trim();
  const preferencia = {
    items: itensPreferencia(p, frete),
    payer: { email: eu.email, ...(nome ? { name: nome.split(" ")[0], surname: nome.split(" ").slice(1).join(" ") } : {}) },
    external_reference: numero,
    metadata: { pagamento_id: pag.id },
    notification_url: `${url}/functions/v1/pagamento?acao=webhook`,
    back_urls: { success: volta("ok"), pending: volta("pendente"), failure: volta("falhou") },
    auto_return: "approved",
    statement_descriptor: "POLICOATING",
    payment_methods: { installments: 12, excluded_payment_types: [{ id: "ticket" }] },   // Pix e cartão (sem boleto)
    expires: true, expiration_date_to: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
  };
  let mp: any = null;
  try {
    const r = await comTempo(`${MP}/checkout/preferences`, { method: "POST", headers: { Authorization: `Bearer ${mpToken}`, "Content-Type": "application/json", "X-Idempotency-Key": `pc-${pag.id}` }, body: JSON.stringify(preferencia) });
    mp = r.ok ? await r.json() : null;
  } catch { mp = null; }
  if (!mp || !mp.init_point) {
    await db.alterar(`pagamentos?id=eq.${pag.id}`, { status: "expirado", detalhe: { erro: "preferencia" }, atualizado_em: new Date().toISOString() });
    return responder({ erro: "O Mercado Pago não respondeu agora. Tente de novo em instantes ou envie pelo WhatsApp." }, 502);
  }
  await db.alterar(`pagamentos?id=eq.${pag.id}`, { mp_preferencia: String(mp.id), atualizado_em: new Date().toISOString() });
  await db.alterar(`pedidos?numero=eq.${numero}`, { pagamento_status: "pendente", pagamento_valor: total, frete_valor: frete });
  return responder({ numero, link: mp.init_point, produtos, frete, total, prazo_dias: fr.prazo_dias ?? null, destino: `${p.destino_cidade}/${p.destino_uf}` });
}

/* ---------- aviso do Mercado Pago (webhook) ---------- */
async function webhook(req: Request, db: Banco, responder: (d: unknown, s?: number) => Response) {
  const u = new URL(req.url);
  let corpo: any = {}; try { corpo = await req.json(); } catch { /* aviso sem corpo */ }
  const tipo = String(u.searchParams.get("type") || corpo.type || corpo.topic || "");
  const dataId = String(u.searchParams.get("data.id") || corpo?.data?.id || "");
  if (!(await assinaturaValida(req.headers.get("x-signature") || "", req.headers.get("x-request-id") || "", dataId, env("MP_WEBHOOK_SECRET"))))
    return responder({ erro: "assinatura" }, 401);
  if (tipo !== "payment" || !/^\d{1,20}$/.test(dataId)) return responder({ ok: true, ignorado: true });   // outros avisos: só confirma o recebimento

  // nunca confia no corpo do aviso: busca o pagamento direto na API do Mercado Pago
  let pg: any = null;
  try { const r = await comTempo(`${MP}/v1/payments/${dataId}`, { headers: { Authorization: `Bearer ${env("MP_ACCESS_TOKEN")}` } }); pg = r.ok ? await r.json() : null; } catch { pg = null; }
  if (!pg) return responder({ erro: "consulta" }, 502);   // o Mercado Pago tenta de novo mais tarde
  const numero = String(pg.external_reference || "");
  const reg: any = (await db.get(`pagamentos?select=*&pedido_numero=eq.${encodeURIComponent(numero)}&order=criado_em.desc&limit=1`))?.[0];
  if (!reg) return responder({ ok: true, ignorado: "sem pedido" });
  let st = situacao(String(pg.status || ""));
  // aviso atrasado de uma tentativa antiga (ex.: cartão recusado) não desfaz um pagamento já aprovado
  if (reg.status === "aprovado" && reg.mp_pagamento && reg.mp_pagamento !== dataId && st !== "estornado") return responder({ ok: true, ignorado: "pagamento antigo" });
  const detalhe: Record<string, unknown> = { status: pg.status, status_detail: pg.status_detail, valor: pg.transaction_amount, moeda: pg.currency_id, parcelas: pg.installments ?? null };
  if (st === "aprovado" && (pg.currency_id !== "BRL" || Math.abs(Number(pg.transaction_amount) - Number(reg.valor_total)) > TOLERANCIA)) {
    st = "pendente"; detalhe.alerta = "valor pago diferente do pedido: conferir com o Mercado Pago antes de liberar";
  }
  const agora = new Date().toISOString();
  await db.alterar(`pagamentos?id=eq.${reg.id}`, { mp_pagamento: dataId, status: st, metodo: metodo(String(pg.payment_type_id || "")), detalhe, atualizado_em: agora });
  const ped: Record<string, unknown> = { pagamento_status: st, pagamento_metodo: metodo(String(pg.payment_type_id || "")) };
  if (st === "aprovado") ped.pago_em = pg.date_approved || agora;
  await db.alterar(`pedidos?numero=eq.${encodeURIComponent(numero)}`, ped);
  return responder({ ok: true, status: st });
}

export async function atender(req: Request): Promise<Response> {
  const origem = req.headers.get("origin") || "";
  const cors = { "Access-Control-Allow-Origin": ORIGENS.includes(origem) ? origem : ORIGENS[0], "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const responder = (dados: unknown, status = 200) => Response.json(dados, { status, headers: cors });
  if (req.method !== "POST") return responder({ erro: "Use POST." }, 405);
  const url = env("SUPABASE_URL"), chave = chaveServidor();
  if (!url || !chave) return responder({ erro: "Função sem chave de servidor." }, 500);
  const db = banco(url, chave);
  if (new URL(req.url).searchParams.get("acao") === "webhook") return await webhook(req, db, responder);

  const rec = (await db.get("recursos?select=ligado,implementado&chave=eq.direct_checkout_enabled"))?.[0];
  if (!rec || !rec.ligado || !rec.implementado) return responder({ erro: "Pagamento online desligado. Envie o pedido pelo WhatsApp." }, 403);
  let corpo: any; try { corpo = await req.json(); } catch { return responder({ erro: "Pedido inválido." }, 400); }
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (String(corpo?.acao) === "criar") return await criar(req, db, url, corpo, token, responder);
  return responder({ erro: "Ação desconhecida." }, 400);
}

if ((globalThis as any).Deno?.serve) (globalThis as any).Deno.serve(atender);
