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
//        WHATSAPP_DESTINO   WhatsApp de quem recebe, com DDI e DDD (ex.: 5516992708155;
//                           vários separados por vírgula)
//        WHATSAPP_TEMPLATE  (recomendado) nome do modelo aprovado, ex.: novo_pedido
//        WHATSAPP_IDIOMA    (opcional) idioma do modelo, padrão pt_BR
//      E-mail (opcional, pode usar só ele ou os dois):
//        RESEND_API_KEY, AVISO_EMAIL_PARA (vários separados por vírgula),
//        AVISO_EMAIL_DE (ex.: Policoating <pedidos@seudominio.com.br>)
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

async function lerCliente(id?: string): Promise<Cliente> {
  const url = env("SUPABASE_URL"), chave = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!id || !url || !chave) return {};
  try {
    const r = await fetch(`${url}/rest/v1/clientes?id=eq.${encodeURIComponent(id)}&select=*`, { headers: { apikey: chave, Authorization: `Bearer ${chave}` } });
    const d = r.ok ? await r.json() : [];
    return d[0] || {};
  } catch { return {}; }
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

async function enviarEmail(p: Pedido, c: Cliente) {
  const chave = env("RESEND_API_KEY"), para = lista("AVISO_EMAIL_PARA"), de = env("AVISO_EMAIL_DE");
  if (!chave || !para.length || !de) return "e-mail não configurado";
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: de, to: para, subject: `Novo pedido ${p.numero} — ${nomeCliente(c)}`, text: mensagem(p, c, false), reply_to: c.email || undefined }),
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
