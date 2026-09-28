// =========================================================
// Policoating — Aviso automático de pedido novo (Supabase Edge Function)
//
// Todo pedido gravado no banco dispara esta função (Database Webhook), que
// manda o pedido para o WhatsApp do vendedor pela API oficial do WhatsApp
// (Cloud API da Meta) e, se configurado, também por e-mail. Assim o vendedor
// recebe o pedido mesmo que o cliente não toque em "Enviar" no WhatsApp.
//
// Configuração (passo a passo no README, seção "Aviso automático de pedido"):
//   1. Edge Functions -> Deploy a new function -> nome "avisar-pedido" -> cole este arquivo
//   2. Desative "Verify JWT" desta função (quem protege é o AVISO_SEGREDO)
//   3. Edge Functions -> Secrets:
//        AVISO_SEGREDO      uma senha longa qualquer (a mesma do cabeçalho do webhook)
//        WHATSAPP_TOKEN     token permanente do app da Meta (usuário do sistema)
//        WHATSAPP_PHONE_ID  "Phone number ID" do número da empresa na Cloud API
//        WHATSAPP_DESTINO   WhatsApp de quem recebe, com DDI e DDD (ex.: 5516996304811;
//                           vários separados por vírgula)
//        WHATSAPP_TEMPLATE  (recomendado) nome do modelo aprovado, ex.: novo_pedido
//        WHATSAPP_IDIOMA    (opcional) idioma do modelo, padrão pt_BR
//      E-mail (opcional, pode usar só ele ou os dois):
//        RESEND_API_KEY, AVISO_EMAIL_PARA (vários separados por vírgula),
//        AVISO_EMAIL_DE (ex.: Policoating Pedidos <pedidos@policoatingtintas.com.br>)
//        SITE_URL (opcional, padrão https://policoatingtintas.com.br) para o botão "Abrir no painel"
//   4. Database -> Webhooks -> Create: tabela pedidos, evento Insert, tipo
//      "Supabase Edge Functions" -> avisar-pedido, cabeçalho
//      x-aviso-segredo = o mesmo valor de AVISO_SEGREDO
// =========================================================

const env = (k: string) => (Deno.env.get(k) || "").trim();
const lista = (k: string) => env(k).split(",").map((x) => x.trim()).filter(Boolean);

type Item = { codigo?: string; nome?: string; cor?: string; embalagem?: string; qtd?: number; kg?: number; preco_kg?: number | null; subtotal?: number | null };
type Pedido = { numero: string; cliente_id?: string; itens?: Item[]; observacoes?: string | null; total?: number | null; total_kg?: number | null; criado_em?: string };
type Cliente = Record<string, string | null>;

const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const kgTxt = (v: number) => `${(Math.round(v * 100) / 100).toLocaleString("pt-BR")} kg`;
const qtdTxt = (i: Item) => i.embalagem === "Sob medida" ? `${kgTxt(+(i.qtd || 0))} (sob medida)` : `${i.qtd} × ${i.embalagem} (${kgTxt(+(i.kg || 0))})`;
const nomeCliente = (c: Cliente) => (c.tipo === "pj" ? (c.nome_fantasia || c.razao_social) : c.nome) || c.email || "Cliente";

/** Chave de servidor que o Supabase entrega à função (a antiga service_role ou a nova sb_secret_) */
function chaveServidor() {
  const antiga = env("SUPABASE_SERVICE_ROLE_KEY");
  if (antiga) return antiga;
  try { const k = Object.values(JSON.parse(env("SUPABASE_SECRET_KEYS") || "{}"))[0]; return typeof k === "string" ? k : ""; } catch { return ""; }
}

async function lerCliente(id?: string): Promise<Cliente> {
  const url = env("SUPABASE_URL"), chave = chaveServidor();
  if (!id || !url || !chave) { console.log("sem chave de servidor: e-mail vai sem os dados do cliente"); return {}; }
  try {
    const headers: Record<string, string> = { apikey: chave };
    if (!chave.startsWith("sb_")) headers.Authorization = `Bearer ${chave}`;   // chave nova não vai no Authorization
    const r = await fetch(`${url}/rest/v1/clientes?id=eq.${encodeURIComponent(id)}&select=*`, { headers });
    if (!r.ok) console.log(`não leu o cliente: ${r.status} ${(await r.text()).slice(0, 200)}`);
    const d = r.ok ? await r.json() : [];
    return d[0] || {};
  } catch (e) { console.log(`não leu o cliente: ${e}`); return {}; }
}

function totais(p: Pedido) {
  const itens = p.itens || [];
  const kg = p.total_kg != null ? +p.total_kg : itens.reduce((s, i) => s + (+(i.kg || 0)), 0);
  const valor = p.total != null ? +p.total : itens.reduce((s, i) => s + (+(i.subtotal || 0)), 0);
  const combinar = itens.some((i) => i.preco_kg == null);
  return { kg, valor, combinar, texto: `${kgTxt(kg)}${valor ? ` · ${reais(valor)}${combinar ? " + itens a combinar" : ""}` : combinar ? " · valor a combinar" : ""}` };
}

/** Mensagem completa (texto livre do WhatsApp e corpo do e-mail) */
function mensagem(p: Pedido, c: Cliente, negrito = true) {
  const b = (t: string) => (negrito ? `*${t}*` : t), L: string[] = [];
  L.push(b(`Novo pedido pelo site: ${p.numero}`), "");
  (p.itens || []).forEach((i, n) => {
    L.push(b(`${n + 1}. ${i.nome}`), `   Código: ${i.codigo || "-"} | Cor: ${i.cor || "-"}`, `   Quantidade: ${qtdTxt(i)}`,
      `   Valor: ${i.preco_kg != null ? `${reais(+i.preco_kg)}/kg = ${reais(+(i.subtotal || 0))}` : "a combinar"}`);
  });
  L.push("", b(`Total: ${totais(p).texto}`), "", b("Cliente"));
  if (c.tipo === "pj") L.push(`Empresa: ${c.razao_social || ""}${c.nome_fantasia ? ` (${c.nome_fantasia})` : ""}`, `CNPJ: ${c.cnpj || ""}`, `Responsável: ${c.responsavel || ""}`);
  else if (c.nome) L.push(`Nome: ${c.nome}`, `CPF: ${c.cpf || ""}`);
  if (c.telefone) L.push(`Telefone: ${c.telefone}`);
  if (c.email) L.push(`E-mail: ${c.email}`);
  if (c.cidade) L.push(`Entrega: ${[c.logradouro, c.numero].filter(Boolean).join(", ")}${c.complemento ? ` - ${c.complemento}` : ""}${c.bairro ? ` - ${c.bairro}` : ""}, ${c.cidade}/${c.uf} - CEP ${c.cep}`);
  if (p.observacoes) L.push("", `Observações: ${p.observacoes}`);
  L.push("", "Veja no painel: aba Pedidos.");
  return L.join("\n");
}

// parâmetros de modelo do WhatsApp não aceitam quebra de linha nem muitos espaços
const param = (t: string, max = 900) => ({ type: "text", text: (t.replace(/[\r\n\t]+/g, " · ").replace(/ {2,}/g, " ").trim() || "-").slice(0, max) });

async function enviarWhatsApp(p: Pedido, c: Cliente) {
  const token = env("WHATSAPP_TOKEN"), phoneId = env("WHATSAPP_PHONE_ID"), destinos = lista("WHATSAPP_DESTINO").map((n) => n.replace(/\D/g, ""));
  if (!token || !phoneId || !destinos.length) return "whatsapp não configurado";
  const modelo = env("WHATSAPP_TEMPLATE");
  const resumo = (p.itens || []).map((i) => `${i.codigo || ""} ${i.nome} - ${qtdTxt(i)}`.trim()).join("; ");
  const contato = [nomeCliente(c), c.telefone, c.cidade ? `${c.cidade}/${c.uf}` : ""].filter(Boolean).join(" - ");
  const resultados: string[] = [];
  for (const to of destinos) {
    const corpo = modelo
      ? { messaging_product: "whatsapp", to, type: "template", template: { name: modelo, language: { code: env("WHATSAPP_IDIOMA") || "pt_BR" },
          components: [{ type: "body", parameters: [param(p.numero, 60), param(contato, 300), param(resumo), param(totais(p).texto, 200)] }] } }
      : { messaging_product: "whatsapp", to, type: "text", text: { preview_url: false, body: mensagem(p, c).slice(0, 4000) } };
    const r = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(corpo),
    });
    resultados.push(`${to}: ${r.ok ? "ok" : `erro ${r.status} ${(await r.text()).slice(0, 300)}`}`);
  }
  return resultados.join(" | ");
}

const esc = (t: unknown) => String(t ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]!));

/** E-mail do pedido em HTML (itens, totais, cliente e botões para responder) */
function emailHtml(p: Pedido, c: Cliente) {
  const t = totais(p), site = env("SITE_URL") || "https://policoatingtintas.com.br";
  const tel = String(c.telefone || "").replace(/\D/g, ""), zap = tel ? (tel.length <= 11 ? "55" + tel : tel) : "";
  const data = new Date(p.criado_em || Date.now()).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
  const linha = (rotulo: string, valor: unknown) => valor ? `<tr><td style="padding:3px 12px 3px 0; color:#5a6775; white-space:nowrap; vertical-align:top;">${rotulo}</td><td style="padding:3px 0; color:#1d2733;">${esc(valor)}</td></tr>` : "";
  const itens = (p.itens || []).map((i) => `<tr>
      <td style="padding:12px 0; border-bottom:1px solid #e6ebf1; vertical-align:top;"><strong style="color:#0b1424;">${esc(i.nome)}</strong><br><span style="font-size:12px; color:#5a6775;">Cód. ${esc(i.codigo || "-")} · ${esc(i.cor || "")}</span></td>
      <td style="padding:12px 8px; border-bottom:1px solid #e6ebf1; vertical-align:top; white-space:nowrap; color:#1d2733;">${esc(qtdTxt(i))}</td>
      <td style="padding:12px 0; border-bottom:1px solid #e6ebf1; vertical-align:top; text-align:right; white-space:nowrap; color:#1d2733;">${i.preco_kg != null ? `${esc(reais(+i.preco_kg))}/kg<br><strong>${esc(reais(+(i.subtotal || 0)))}</strong>` : "a combinar"}</td>
    </tr>`).join("");
  const endereco = c.cidade ? `${[c.logradouro, c.numero].filter(Boolean).join(", ")}${c.complemento ? " - " + c.complemento : ""}${c.bairro ? " - " + c.bairro : ""}, ${c.cidade}/${c.uf} · CEP ${c.cep}` : "";
  const botao = (href: string, texto: string, cor: string) => `<a href="${esc(href)}" style="display:inline-block; margin:0 8px 8px 0; padding:11px 18px; border-radius:8px; background:${cor}; color:#ffffff; font-weight:700; text-decoration:none;">${texto}</a>`;
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0; padding:0; background:#eef2f7;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;"><tr><td align="center" style="padding:24px 10px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%; max-width:600px; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #dfe5ec; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:21px;">
  <tr><td style="background:#0b1424; padding:20px 28px;"><span style="font-size:22px; font-weight:900; font-style:italic; color:#ffffff;">POLI<span style="color:#4d8bff;">COATING</span></span>
    <span style="float:right; margin-top:4px; padding:4px 10px; border-radius:20px; background:#3cb043; color:#ffffff; font-size:12px; font-weight:700;">NOVO PEDIDO</span></td></tr>
  <tr><td style="padding:26px 28px 6px;">
    <p style="margin:0; font-size:12px; font-weight:700; letter-spacing:1px; color:#1558d6; text-transform:uppercase;">Pedido pelo site · ${esc(data)}</p>
    <h1 style="margin:4px 0 2px; font-size:24px; color:#0b1424;">${esc(p.numero)}</h1>
    <p style="margin:0; color:#5a6775;">${esc(nomeCliente(c))}${c.cidade ? ` · ${esc(c.cidade)}/${esc(c.uf)}` : ""}</p>
  </td></tr>
  <tr><td style="padding:14px 28px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><th align="left" style="padding-bottom:6px; font-size:12px; color:#5a6775; border-bottom:2px solid #0b1424;">Produto</th><th align="left" style="padding:0 8px 6px; font-size:12px; color:#5a6775; border-bottom:2px solid #0b1424;">Quantidade</th><th align="right" style="padding-bottom:6px; font-size:12px; color:#5a6775; border-bottom:2px solid #0b1424;">Valor</th></tr>
      ${itens}
      <tr><td colspan="3" style="padding:14px 0 0; text-align:right; font-size:16px; color:#0b1424;"><strong>Total: ${esc(t.texto)}</strong></td></tr>
    </table>
    ${p.observacoes ? `<p style="margin:16px 0 0; padding:12px 14px; background:#fffbea; border-left:4px solid #f7c600; color:#5c4a00;"><strong>Observações:</strong> ${esc(p.observacoes)}</p>` : ""}
  </td></tr>
  <tr><td style="padding:22px 28px 0;">
    <p style="margin:0 0 8px; font-size:12px; font-weight:700; letter-spacing:1px; color:#1558d6; text-transform:uppercase;">Cliente</p>
    <table role="presentation" cellpadding="0" cellspacing="0">
      ${c.tipo === "pj" ? linha("Empresa", `${c.razao_social || ""}${c.nome_fantasia ? ` (${c.nome_fantasia})` : ""}`) + linha("CNPJ", c.cnpj) + linha("IE", c.inscricao_estadual) + linha("Responsável", c.responsavel) : linha("Nome", c.nome) + linha("CPF", c.cpf)}
      ${linha("Telefone", c.telefone)}${linha("E-mail", c.email)}${linha("Entrega", endereco)}
    </table>
    ${c.email || c.telefone ? "" : `<p style="margin:6px 0 0; color:#b3261e;">Não foi possível ler os dados do cliente. Veja o pedido no painel.</p>`}
  </td></tr>
  <tr><td style="padding:22px 28px 26px;">
    ${zap ? botao(`https://wa.me/${zap}?text=${encodeURIComponent(`Olá, ${nomeCliente(c)}! Aqui é da Policoating, sobre o seu pedido ${p.numero}.`)}`, "Chamar no WhatsApp", "#1f9d55") : ""}
    ${c.email ? botao(`mailto:${c.email}?subject=${encodeURIComponent(`Seu pedido ${p.numero} - Policoating`)}`, "Responder por e-mail", "#1558d6") : ""}
    ${botao(`${site.replace(/\/$/, "")}/admin.html#pedidos`, "Abrir no painel", "#0b1424")}
  </td></tr>
  <tr><td style="background:#f4f7fa; padding:14px 28px; font-size:12px; color:#5a6775;">Aviso automático do site Policoating. Responder este e-mail fala direto com o cliente.</td></tr>
</table></td></tr></table></body></html>`;
}

async function enviarEmail(p: Pedido, c: Cliente) {
  const chave = env("RESEND_API_KEY"), para = lista("AVISO_EMAIL_PARA"), de = env("AVISO_EMAIL_DE");
  if (!chave || !para.length || !de) return "e-mail não configurado";
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: de, to: para, subject: `Novo pedido ${p.numero} — ${nomeCliente(c)}`, html: emailHtml(p, c), text: mensagem(p, c, false), reply_to: c.email || undefined }),
  });
  return r.ok ? "ok" : `erro ${r.status} ${(await r.text()).slice(0, 300)}`;
}

Deno.serve(async (req) => {
  const segredo = env("AVISO_SEGREDO");
  if (!segredo || req.headers.get("x-aviso-segredo") !== segredo) return new Response("não autorizado", { status: 401 });
  let corpo: { type?: string; table?: string; record?: Pedido };
  try { corpo = await req.json(); } catch { return new Response("corpo inválido", { status: 400 }); }
  const p = corpo.record;
  if (corpo.type !== "INSERT" || corpo.table !== "pedidos" || !p || !p.numero) return Response.json({ ignorado: true });
  const c = await lerCliente(p.cliente_id);
  const [whatsapp, email] = await Promise.all([
    enviarWhatsApp(p, c).catch((e) => `erro ${e}`),
    enviarEmail(p, c).catch((e) => `erro ${e}`),
  ]);
  console.log(`pedido ${p.numero} | whatsapp: ${whatsapp} | e-mail: ${email}`);
  return Response.json({ pedido: p.numero, whatsapp, email });
});
