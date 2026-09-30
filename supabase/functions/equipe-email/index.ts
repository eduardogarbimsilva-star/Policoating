// =========================================================
// Policoating — Equipe com e-mail da empresa (Supabase Edge Function)
//
// Chamada pelo painel (aba Equipe), só por administradores. Ações:
//   adicionar: cria o apelido nome@policoatingtintas.com.br -> e-mail pessoal no ImprovMX,
//              coloca a pessoa na equipe e manda boas-vindas para o e-mail pessoal
//   remover:   tira da equipe e apaga o apelido do ImprovMX
//   trocar:    muda o login de quem já tem conta para o e-mail da empresa, criando
//              o apelido para o e-mail atual da pessoa, e avisa nos dois e-mails
//
// Configuração (passo a passo no README, seção "E-mail da empresa para a equipe"):
//   1. Edge Functions -> Deploy a new function -> nome "equipe-email" -> cole este arquivo
//   2. Desative "Verify JWT" desta função (ela confere o login por conta própria)
//   3. Secrets: IMPROVMX_API_KEY (ImprovMX -> Chaves de API), RESEND_API_KEY e AVISO_EMAIL_DE
//      Opcional: EXIGIR_2FA = nao (desliga a exigência da verificação em 2 etapas; o padrão é exigir)
//      Opcional: DOMINIO_EQUIPE (padrão policoatingtintas.com.br)
// =========================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const env = (k: string) => (Deno.env.get(k) || "").trim();
const ORIGENS = ["https://policoatingtintas.com.br", "https://www.policoatingtintas.com.br", "http://localhost:8000", "http://localhost:8765"];
const EMAIL_RE = /^[^\s@*]+@[^\s@]+\.[^\s@]+$/;
const APELIDO_RE = /^[a-z0-9][a-z0-9._-]{0,40}$/;
// compara e-mail sem diferenciar maiúsculas; "_" e "%" não viram curinga
const exato = (e: string) => e.replace(/[\\%_]/g, (c) => "\\" + c);
const esc = (t: unknown) => String(t ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]!));

function chaveServidor() {
  const antiga = env("SUPABASE_SERVICE_ROLE_KEY");
  if (antiga) return antiga;
  try { const k = Object.values(JSON.parse(env("SUPABASE_SECRET_KEYS") || "{}"))[0]; return typeof k === "string" ? k : ""; } catch { return ""; }
}

/* ---------- ImprovMX (apelidos nome@dominio -> e-mail pessoal) ---------- */
async function improvmx(metodo: string, caminho: string, corpo?: unknown) {
  const chave = env("IMPROVMX_API_KEY");
  if (!chave) return { ok: false, semChave: true, erro: "Falta o Secret IMPROVMX_API_KEY no Supabase." };
  const r = await fetch(`https://api.improvmx.com/v3/domains/${dominio()}/aliases${caminho}`, {
    method: metodo,
    headers: { Authorization: "Basic " + btoa("api:" + chave), "Content-Type": "application/json" },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  let dados: Record<string, unknown> = {};
  try { dados = await r.json(); } catch { /* sem corpo */ }
  const erros = dados.errors ? JSON.stringify(dados.errors) : String(dados.error || "");
  return { ok: r.ok && dados.success !== false, status: r.status, erro: erros, dados };
}
/** Cria o apelido para o e-mail pessoal. Se já existir apontando para outra caixa, não mexe (avisa). */
async function criarApelido(apelido: string, destino: string) {
  const r = await improvmx("POST", "/", { alias: apelido, forward: destino });
  if (r.ok) return "";
  if (!r.semChave && /exist|already/i.test(r.erro)) {
    const atual = await improvmx("GET", `/${encodeURIComponent(apelido)}`);
    const destinoAtual = String(((atual.dados || {}).alias as Record<string, unknown> || {}).forward || "").toLowerCase();
    if (destinoAtual.split(",").map((x) => x.trim()).includes(destino.toLowerCase())) return "";
    return `${apelido}@${dominio()} já existe no ImprovMX e redireciona para outra caixa. Escolha outro nome ou apague esse apelido no ImprovMX.`;
  }
  if (r.semChave) return r.erro;
  if (/limit|plan|upgrade/i.test(r.erro)) return "O plano grátis do ImprovMX chegou no limite de apelidos. Apague apelidos antigos ou mude de plano.";
  return `O ImprovMX recusou o apelido (${r.status}${r.erro ? ": " + r.erro.slice(0, 160) : ""}).`;
}
const apagarApelido = (apelido: string) => improvmx("DELETE", `/${encodeURIComponent(apelido)}`);
/** Nível de segurança da sessão ("aal1" = só e-mail, "aal2" = e-mail + código do celular). O token já foi validado pelo getUser. */
function nivelDoToken(token: string): string {
  try {
    const parte = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return String(JSON.parse(atob(parte + "===".slice((parte.length + 3) % 4))).aal || "");
  } catch { return ""; }
}
const dominio = () => (env("DOMINIO_EQUIPE") || "policoatingtintas.com.br").toLowerCase();
const daEmpresa = (email: string) => email.endsWith("@" + dominio());

/* ---------- E-mails de aviso (Resend) ---------- */
function moldura(rotulo: string, titulo: string, miolo: string) {
  const site = (env("SITE_URL") || "https://policoatingtintas.com.br").replace(/\/$/, "");
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"></head>
<body style="margin:0; padding:0; background:#eef2f7;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;"><tr><td align="center" style="padding:24px 10px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%; max-width:600px; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #dfe5ec; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:23px; color:#1d2733;">
  <tr><td style="background:#0b1424; padding:20px 28px;"><span style="font-size:22px; font-weight:900; font-style:italic; color:#ffffff;">POLI<span style="color:#4d8bff;">COATING</span></span></td></tr>
  <tr><td style="padding:28px;">
    <p style="margin:0 0 6px; font-size:12px; font-weight:700; letter-spacing:1px; color:#1558d6; text-transform:uppercase;">${rotulo}</p>
    <h1 style="margin:0 0 14px; font-size:22px; color:#0b1424;">${titulo}</h1>
    ${miolo}
    <a href="${esc(site)}/conta.html" style="display:inline-block; padding:11px 18px; border-radius:8px; background:#1558d6; color:#ffffff; font-weight:700; text-decoration:none;">Entrar no site</a>
  </td></tr>
  <tr><td style="background:#f4f7fa; padding:14px 28px; font-size:12px; color:#5a6775;">Se você não esperava este e-mail, fale com o administrador do site.</td></tr>
</table></td></tr></table></body></html>`;
}
const caixa = (email: string) => `<p style="margin:0 0 18px; padding:14px; background:#f4f7fa; border:1px solid #dfe5ec; border-radius:8px; font-size:18px; font-weight:700; text-align:center; color:#0b1424;">${esc(email)}</p>`;

async function enviar(para: string[], assunto: string, html: string, texto: string) {
  const chave = env("RESEND_API_KEY"), de = env("AVISO_EMAIL_DE");
  if (!chave || !de) return "e-mail não configurado";
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: de, to: para, subject: assunto, html, text: texto }),
  });
  return r.ok ? "ok" : `erro ${r.status}`;
}

Deno.serve(async (req) => {
  const origem = req.headers.get("origin") || "";
  const cors = {
    "Access-Control-Allow-Origin": ORIGENS.includes(origem) ? origem : ORIGENS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const responder = (dados: unknown, status = 200) => Response.json(dados, { status, headers: cors });
  const falha = (mensagem: string, status = 400) => responder({ erro: mensagem }, status);

  const url = env("SUPABASE_URL"), chave = chaveServidor();
  if (!url || !chave) return falha("Função sem chave de servidor.", 500);
  const sb = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });

  // quem está pedindo precisa estar logado e ser administrador
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: quem } = await sb.auth.getUser(token);
  const meuEmail = String(quem?.user?.email || "").toLowerCase();
  if (!meuEmail) return falha("Entre na sua conta de novo.", 401);
  // verificação em 2 etapas: o token precisa ser de uma sessão confirmada com o código do celular (aal2)
  if (env("EXIGIR_2FA") !== "nao" && nivelDoToken(token) !== "aal2") return falha("Confirme o código de 2 etapas: saia e entre de novo no painel.", 401);
  const { data: eu } = await sb.from("admins").select("papel").ilike("email", exato(meuEmail)).maybeSingle();
  if (!eu || (eu.papel && eu.papel !== "admin")) return falha("Só administradores podem mexer na equipe.", 403);

  let corpo: { acao?: string; apelido?: string; pessoal?: string; papel?: string; email?: string; atual?: string; novo?: string };
  try { corpo = await req.json(); } catch { return falha("Pedido inválido."); }
  const acao = corpo.acao || (corpo.atual ? "trocar" : "");
  const naEquipe = async (email: string) => (await sb.from("admins").select("email").ilike("email", exato(email)).maybeSingle()).data;

  /* ---------- adicionar ---------- */
  if (acao === "adicionar") {
    const apelido = String(corpo.apelido || "").trim().toLowerCase().replace(/@.*$/, "");
    const pessoal = String(corpo.pessoal || "").trim().toLowerCase();
    const papel = corpo.papel === "admin" ? "admin" : "vendedor";
    if (!APELIDO_RE.test(apelido)) return falha("Nome do e-mail inválido. Use letras, números, ponto, hífen ou sublinhado (ex.: joao.silva).");
    if (!EMAIL_RE.test(pessoal)) return falha("E-mail pessoal inválido.");
    if (daEmpresa(pessoal)) return falha("O e-mail pessoal precisa ser a caixa de verdade da pessoa (Gmail, Outlook...), não um @" + dominio() + ".");
    const email = `${apelido}@${dominio()}`;
    if (await naEquipe(email)) return falha(`${email} já está na equipe.`);
    const erroApelido = await criarApelido(apelido, pessoal);
    if (erroApelido) return falha(erroApelido, /já existe/.test(erroApelido) ? 409 : 502);
    const { error } = await sb.from("admins").insert({ email, papel });
    if (error) { await apagarApelido(apelido); return falha("Não foi possível colocar na equipe. Nada foi alterado.", 500); }
    const cargo = papel === "admin" ? "Administrador" : "Vendedor";
    const aviso = await enviar([pessoal], "Seu acesso à equipe Policoating",
      moldura("Acesso da equipe", "Bem-vindo(a) à equipe Policoating", `<p style="margin:0 0 14px;">Você foi adicionado(a) à equipe como <strong>${cargo}</strong>. Para entrar no site, use o e-mail da empresa:</p>${caixa(email)}<p style="margin:0 0 20px; color:#5a6775;">O código de acesso chega aqui, no seu e-mail de sempre (${esc(pessoal)}). Na primeira vez, clique em "Criar conta" com o e-mail da empresa.</p>`),
      `Você foi adicionado(a) à equipe Policoating como ${cargo}.\nEntre no site com: ${email}\nO código chega em ${pessoal}. Na primeira vez, clique em "Criar conta".`).catch((e) => `erro ${e}`);
    console.log(`equipe: +${email} (${papel}) -> ${pessoal} por ${meuEmail} | aviso: ${aviso}`);
    return responder({ ok: true, email, aviso });
  }

  /* ---------- remover ---------- */
  if (acao === "remover") {
    const email = String(corpo.email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return falha("E-mail inválido.");
    if (email === meuEmail) return falha("Você não pode remover o seu próprio acesso.");
    const { error } = await sb.from("admins").delete().ilike("email", exato(email));
    if (error) return falha("Não foi possível remover.", 500);
    let apelido = "";
    if (daEmpresa(email)) { const r = await apagarApelido(email.split("@")[0]); apelido = r.ok ? "apagado" : (r.semChave ? "sem chave do ImprovMX" : `não apagado (${r.status})`); }
    console.log(`equipe: -${email} por ${meuEmail} | apelido: ${apelido || "-"}`);
    return responder({ ok: true, apelido });
  }

  /* ---------- trocar (quem já tem conta passa a entrar com o e-mail da empresa) ---------- */
  if (acao !== "trocar") return falha("Ação inválida.");
  const atual = String(corpo.atual || "").trim().toLowerCase(), novo = String(corpo.novo || "").trim().toLowerCase();
  if (!EMAIL_RE.test(atual) || !EMAIL_RE.test(novo)) return falha("E-mail inválido.");
  if (!daEmpresa(novo)) return falha(`O e-mail da empresa precisa terminar em @${dominio()}.`);
  if (!APELIDO_RE.test(novo.split("@")[0])) return falha("Nome do e-mail inválido. Use letras, números, ponto, hífen ou sublinhado.");
  if (atual === novo) return falha("Esse já é o e-mail de acesso dessa pessoa.");
  if (!(await naEquipe(atual))) return falha("Essa pessoa não está na equipe. Adicione na Equipe primeiro.");
  if (await naEquipe(novo)) return falha("Esse e-mail da empresa já está na equipe.");

  let usuario: { id: string; email?: string } | null = null, emUso = false;
  for (let pagina = 1; pagina <= 50 && !(usuario && emUso); pagina++) {
    const { data, error } = await sb.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error) return falha("Não foi possível consultar as contas.", 500);
    for (const u of data.users) {
      const e = String(u.email || "").toLowerCase();
      if (e === atual) usuario = u;
      if (e === novo) emUso = true;
    }
    if (data.users.length < 200) break;
  }
  if (emUso) return falha("Esse e-mail da empresa já é usado por outra conta do site.");
  if (!usuario) return falha("Essa pessoa ainda não criou conta no site. Peça para ela entrar uma vez com o e-mail normal.");

  // o apelido novo -> e-mail atual da pessoa (se o atual já for da empresa, precisa existir o apelido feito à mão)
  if (!daEmpresa(atual)) {
    const erroApelido = await criarApelido(novo.split("@")[0], atual);
    if (erroApelido && !/IMPROVMX_API_KEY/.test(erroApelido)) return falha(erroApelido, 502);
  }
  const { error: eLogin } = await sb.auth.admin.updateUserById(usuario.id, { email: novo, email_confirm: true });
  if (eLogin) return falha(`Não foi possível trocar o e-mail: ${eLogin.message}`, 500);
  const { error: eEquipe } = await sb.from("admins").update({ email: novo }).ilike("email", exato(atual));
  if (eEquipe) {
    await sb.auth.admin.updateUserById(usuario.id, { email: atual, email_confirm: true });
    return falha("Não foi possível atualizar a equipe. Nada foi alterado.", 500);
  }
  await sb.from("clientes").update({ email: novo }).eq("id", usuario.id);

  // aviso vai só para o e-mail atual (o novo redireciona para ele, então chegaria duas vezes)
  const aviso = await enviar([atual], "Seu e-mail de acesso à Policoating mudou",
    moldura("Acesso da equipe", "Seu e-mail de acesso mudou", `<p style="margin:0 0 14px;">O administrador definiu o seu e-mail da empresa. A partir de agora, entre no site com:</p>${caixa(novo)}<p style="margin:0 0 20px; color:#5a6775;">E-mail anterior: ${esc(atual)}. Os códigos de acesso continuam chegando na sua caixa de sempre. Se você estiver com o site aberto, saia e entre de novo com o e-mail novo.</p>`),
    `Seu e-mail de acesso à Policoating mudou.\n\nNovo: ${novo}\nAnterior: ${atual}\n\nOs códigos continuam chegando na sua caixa de sempre.`).catch((e) => `erro ${e}`);
  console.log(`equipe: ${atual} -> ${novo} por ${meuEmail} | aviso: ${aviso}`);
  return responder({ ok: true, novo, aviso });
});
