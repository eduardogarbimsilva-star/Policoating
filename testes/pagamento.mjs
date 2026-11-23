// E09 — função "pagamento" (Mercado Pago) testada no Node, sem internet: banco, função de frete e API do Mercado Pago imitados.
// Uso: node testes/pagamento.mjs
import { relatorio } from "./comum.mjs";

const ENV = { SUPABASE_URL: "https://banco.teste", SUPABASE_SERVICE_ROLE_KEY: "chave-servidor", MP_ACCESS_TOKEN: "APP_USR-teste", MP_WEBHOOK_SECRET: "segredo-webhook" };
globalThis.Deno = { env: { get: (k) => ENV[k] } };
const F = await import("../supabase/functions/pagamento/index.ts");
const R = relatorio();

/* ---------- regras puras ---------- */
R.add("PAG-01", "Situações do Mercado Pago → pedido", F.situacao("approved") === "aprovado" && F.situacao("rejected") === "recusado" && F.situacao("in_process") === "pendente" && F.situacao("refunded") === "estornado");
R.add("PAG-02", "Forma de pagamento em português", F.metodo("bank_transfer") === "Pix" && F.metodo("credit_card") === "Cartão de crédito");
const PED = { numero: "PC-261123-AB12C", cliente_id: "u1", status: "recebido", total: 1160, tem_combinar: false, destino_cep: "14801000", destino_cidade: "Araraquara", destino_uf: "SP",
  criado_em: new Date().toISOString(), pagamento_status: null,
  itens: [{ id: "pol-0001", codigo: "POL-0001", nome: "Poliéster Preto", embalagem: "Caixa 25 kg", qtd: 1, subtotal: 800 }, { id: "pol-0001", codigo: "POL-0001", nome: "Poliéster Preto", embalagem: "Caixa 5 kg", qtd: 2, subtotal: 360 }] };
const it = F.itensPreferencia(PED, 612.5);
R.add("PAG-03", "Itens da preferência: valores do pedido (servidor) + frete", it.length === 3 && it[0].unit_price === 800 && it[1].title.startsWith("2 × Caixa 5 kg") && it[2].id === "FRETE" && it[2].unit_price === 612.5 && it.every((x) => x.currency_id === "BRL"));
async function assinar(dataId, reqId, ts, segredo = ENV.MP_WEBHOOK_SECRET) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(`id:${dataId};request-id:${reqId};ts:${ts};`)));
  return `ts=${ts},v1=${Array.from(s).map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}
R.add("PAG-04", "Assinatura do aviso: aceita a certa, recusa a errada ou sem segredo",
  await F.assinaturaValida(await assinar("123", "req-1", "1700000000"), "req-1", "123", ENV.MP_WEBHOOK_SECRET) &&
  !(await F.assinaturaValida(await assinar("123", "req-1", "1700000000", "outro"), "req-1", "123", ENV.MP_WEBHOOK_SECRET)) &&
  !(await F.assinaturaValida(await assinar("999", "req-1", "1700000000"), "req-1", "123", ENV.MP_WEBHOOK_SECRET)) &&
  !(await F.assinaturaValida(await assinar("123", "req-1", "1700000000"), "req-1", "123", "")));

/* ---------- serviços imitados ---------- */
function imitar({ recurso = true, liberado = true, frete = { zona: "externo", valor: 612.5, prazo_dias: 2 }, pedido = {}, mpPag = null, mpPref = true } = {}) {
  const T = { pedidos: [{ ...PED, ...pedido }], pagamentos: [], recursos: [{ chave: "direct_checkout_enabled", ligado: recurso, implementado: true }],
    produtos: [{ id: "pol-0001", categoria: "poliester" }], clientes: [{ id: "u1", nome: "Maria Teste Silva", tipo: "pf", numero: "500" }] };
  const log = { preferencia: null, cabecalhosPref: null, fretePedido: null, consultasMP: 0 };
  let seq = 0;
  const filtro = (l, q) => l.filter((x) => [...q.entries()].every(([k, v]) => ["select", "order", "limit"].includes(k) || (v.startsWith("eq.") ? String(x[k]) === decodeURIComponent(v.slice(3)) : v.startsWith("in.") ? v.slice(4, -1).split(",").includes(String(x[k])) : true)));
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(String(url)), m = (init.method || "GET").toUpperCase();
    const json = (o, s = 200) => new Response(o === null ? null : JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });
    if (u.pathname === "/auth/v1/user") { const t = (init.headers.Authorization || "").replace("Bearer ", ""); return t === "h.u1.s" ? json({ id: "u1", email: "maria@x.com" }) : t === "h.u2.s" ? json({ id: "u2", email: "outro@x.com" }) : json({}, 401); }
    if (u.pathname === "/rest/v1/rpc/recurso_disponivel") return json(liberado);
    if (u.pathname === "/functions/v1/frete") { log.fretePedido = JSON.parse(init.body); return json(frete); }
    if (u.host === "api.mercadopago.com" && u.pathname === "/checkout/preferences") { log.preferencia = JSON.parse(init.body); log.cabecalhosPref = init.headers; return mpPref ? json({ id: "pref-1", init_point: "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-1" }, 201) : json({ message: "erro" }, 500); }
    if (u.host === "api.mercadopago.com" && u.pathname.startsWith("/v1/payments/")) { log.consultasMP++; return mpPag ? json(mpPag) : json({}, 404); }
    const tab = u.pathname.replace("/rest/v1/", "");
    if (!T[tab]) return json({}, 404);
    if (m === "GET") { let l = filtro(T[tab], u.searchParams); if (u.searchParams.get("order")) l = [...l].reverse(); return json(l.slice(0, +(u.searchParams.get("limit") || 999))); }
    if (m === "POST") { const n = { id: ++seq, status: "pendente", criado_em: new Date().toISOString(), ...JSON.parse(init.body) }; T[tab].push(n); return json([n], 201); }
    if (m === "PATCH") { filtro(T[tab], u.searchParams).forEach((x) => Object.assign(x, JSON.parse(init.body))); return json(null, 204); }
    return json({}, 405);
  };
  return { T, log };
}
const pedir = (corpo, token, extra = {}) => F.atender(new Request("https://f.teste/pagamento" + (extra.qs || ""), { method: "POST",
  headers: { "content-type": "application/json", origin: "https://policoatingtintas.com.br", ...(token ? { authorization: "Bearer " + token } : {}), ...(extra.h || {}) }, body: JSON.stringify(corpo) }));

{ imitar({ recurso: false }); const r = await pedir({ acao: "criar", numero: PED.numero }, "h.u1.s");
  R.add("PAG-05", "Recurso \"Compra direta\" desligado: não cria pagamento", r.status === 403); }
{ imitar(); const r = await pedir({ acao: "criar", numero: PED.numero });
  R.add("PAG-06", "Sem login: não cria pagamento", r.status === 401); }
{ imitar(); const r = await pedir({ acao: "criar", numero: PED.numero }, "h.u2.s");
  R.add("PAG-07", "Pedido de outra pessoa: não encontrado", r.status === 404); }
{ imitar({ pedido: { tem_combinar: true } }); const r = await pedir({ acao: "criar", numero: PED.numero }, "h.u1.s");
  R.add("PAG-08", "Item com preço a consultar: só pelo WhatsApp", r.status === 409 && /WhatsApp/.test((await r.json()).erro)); }
{ imitar({ liberado: false }); const r = await pedir({ acao: "criar", numero: PED.numero }, "h.u1.s");
  R.add("PAG-09", "Produto não liberado para compra direta: recusa", r.status === 409); }
{ imitar({ frete: { zona: "manual", valor: null } }); const r = await pedir({ acao: "criar", numero: PED.numero }, "h.u1.s");
  R.add("PAG-10", "Frete sem valor confiável: não cobra online (nunca inventa frete)", r.status === 409 && /frete/i.test((await r.json()).erro)); }
{ imitar({ pedido: { criado_em: new Date(Date.now() - 3 * 3600e3).toISOString() } }); const r = await pedir({ acao: "criar", numero: PED.numero }, "h.u1.s");
  R.add("PAG-11", "Pedido antigo (mais de 2 h): pede para montar de novo", r.status === 409); }
{ const { T, log } = imitar(); const r = await pedir({ acao: "criar", numero: PED.numero, total: 1 }, "h.u1.s"); const d = await r.json();
  R.add("PAG-12", "Cria a cobrança: produtos do pedido + frete estimado; o valor enviado pelo navegador é ignorado",
    r.status === 200 && d.produtos === 1160 && d.frete === 612.5 && d.total === 1772.5 && d.link.includes("mercadopago.com.br"), JSON.stringify(d));
  const p = log.preferencia;
  R.add("PAG-13", "Preferência: referência = número do pedido, aviso na função, volta para a conta, sem boleto, chave de idempotência",
    p.external_reference === PED.numero && p.notification_url === "https://banco.teste/functions/v1/pagamento?acao=webhook" && p.back_urls.success.startsWith("https://policoatingtintas.com.br/conta?pagamento=ok") &&
    p.items.reduce((t, x) => t + x.unit_price, 0) === 1772.5 && p.payment_methods.excluded_payment_types[0].id === "ticket" && /^pc-\d+$/.test(log.cabecalhosPref["X-Idempotency-Key"]));
  R.add("PAG-14", "Frete pedido com o CEP e o número do cadastro", log.fretePedido.cep === "14801000" && log.fretePedido.numero === "500" && log.fretePedido.acao === "estimar");
  R.add("PAG-15", "Registro: pagamento pendente com os valores; pedido marcado como aguardando", T.pagamentos[0].valor_total === 1772.5 && T.pagamentos[0].mp_preferencia === "pref-1" && T.pedidos[0].pagamento_status === "pendente" && T.pedidos[0].frete_valor === 612.5);

  // aviso do Mercado Pago
  const aviso = async (pg, assinatura) => { ENV.__ = 0; imitarMP(pg); const ts = String(Math.floor(Date.now() / 1000));
    return pedir({ type: "payment", data: { id: String(pg.id) } }, null, { qs: `?acao=webhook&data.id=${pg.id}&type=payment`, h: { "x-request-id": "req-9", "x-signature": assinatura || (await assinar(String(pg.id), "req-9", ts)) } }); };
  const imitarMP = (pg) => { const f = globalThis.fetch; globalThis.fetch = async (url, init) => (String(url).includes("/v1/payments/") ? new Response(JSON.stringify(pg), { status: 200 }) : f(url, init)); };
  let rw = await aviso({ id: 555, status: "approved", external_reference: PED.numero, transaction_amount: 1772.5, currency_id: "BRL", payment_type_id: "bank_transfer", date_approved: "2026-11-23T12:00:00Z" }, "ts=1,v1=deadbeef");
  R.add("PAG-16", "Aviso com assinatura falsa: recusado e nada muda", rw.status === 401 && T.pedidos[0].pagamento_status === "pendente");
  rw = await aviso({ id: 556, status: "approved", external_reference: PED.numero, transaction_amount: 10, currency_id: "BRL", payment_type_id: "credit_card" });
  R.add("PAG-17", "Pago com valor diferente: NÃO marca como pago (alerta para conferir)", T.pedidos[0].pagamento_status === "pendente" && /diferente/.test(T.pagamentos[0].detalhe.alerta));
  rw = await aviso({ id: 557, status: "approved", external_reference: PED.numero, transaction_amount: 1772.5, currency_id: "BRL", payment_type_id: "bank_transfer", date_approved: "2026-11-23T12:00:00Z" });
  R.add("PAG-18", "Pix aprovado com o valor certo: pedido pago, com forma e data", (await rw.json()).status === "aprovado" && T.pedidos[0].pagamento_status === "aprovado" && T.pedidos[0].pagamento_metodo === "Pix" && T.pedidos[0].pago_em === "2026-11-23T12:00:00Z" && T.pagamentos[0].mp_pagamento === "557");
  rw = await aviso({ id: 556, status: "rejected", external_reference: PED.numero, transaction_amount: 1772.5, currency_id: "BRL", payment_type_id: "credit_card" });
  R.add("PAG-19", "Aviso atrasado de tentativa recusada não desfaz o pagamento aprovado", T.pedidos[0].pagamento_status === "aprovado");
  rw = await aviso({ id: 557, status: "refunded", external_reference: PED.numero, transaction_amount: 1772.5, currency_id: "BRL", payment_type_id: "bank_transfer" });
  R.add("PAG-20", "Estorno feito no Mercado Pago: pedido marcado como estornado", T.pedidos[0].pagamento_status === "estornado");
  const r2 = await pedir({ acao: "criar", numero: PED.numero }, "h.u1.s");
  R.add("PAG-21", "Pedido que já saiu de \"recebido\" ou já pago não gera nova cobrança", (T.pedidos[0].pagamento_status = "aprovado") && (await pedir({ acao: "criar", numero: PED.numero }, "h.u1.s")).status === 409 && r2.status !== 500);
}
{ const sem = ENV.MP_ACCESS_TOKEN; ENV.MP_ACCESS_TOKEN = ""; imitar(); const r = await pedir({ acao: "criar", numero: PED.numero }, "h.u1.s"); ENV.MP_ACCESS_TOKEN = sem;
  R.add("PAG-22", "Sem a chave do Mercado Pago nos Secrets: mensagem clara (envie pelo WhatsApp)", r.status === 503 && /WhatsApp/.test((await r.json()).erro)); }
{ const { T } = imitar({ mpPref: false }); const r = await pedir({ acao: "criar", numero: PED.numero }, "h.u1.s");
  R.add("PAG-23", "Mercado Pago fora do ar: avisa e não deixa pedido marcado como pendente", r.status === 502 && T.pedidos[0].pagamento_status === null && T.pagamentos[0].status === "expirado"); }
process.exitCode = R.imprimir() ? 1 : 0;
