// =========================================================
// Policoating — E-mail da empresa para a equipe (Supabase Edge Function)
//
// O administrador define, no painel (aba Equipe), o e-mail da empresa de um
// membro (ex.: vendas@policoatingg.com.br). Esta função:
//   1. confere que quem pediu é administrador;
//   2. troca o e-mail de login do membro (Supabase Auth), já confirmado;
//   3. atualiza a equipe (admins) e o cadastro (clientes);
//   4. avisa o membro por e-mail, no endereço antigo e no novo.
// O endereço novo precisa redirecionar para a caixa real da pessoa (ex.: ImprovMX),
// senão ela não recebe o código de acesso.
//
// Configuração (passo a passo no README, seção "E-mail da empresa para a equipe"):
//   1. Edge Functions -> Deploy a new function -> nome "equipe-email" -> cole este arquivo
//   2. Desative "Verify JWT" desta função (ela confere o login por conta própria)
//   3. Secrets (os mesmos do aviso de pedido): RESEND_API_KEY e AVISO_EMAIL_DE (para o aviso)
//      Opcional: DOMINIO_EQUIPE (padrão policoatingg.com.br)
// =========================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const env = (k: string) => (Deno.env.get(k) || "").trim();
const ORIGENS = ["https://policoatingg.com.br", "https://www.policoatingg.com.br", "http://localhost:8000", "http://localhost:8765"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// compara e-mail sem diferenciar maiúsculas; "_" e "%" não viram curinga
const exato = (e: string) => e.replace(/[\\%_]/g, (c) => "\\" + c);

function chaveServidor() {
  const antiga = env("SUPABASE_SERVICE_ROLE_KEY");
  if (antiga) return antiga;
  try { const k = Object.values(JSON.parse(env("SUPABASE_SECRET_KEYS") || "{}"))[0]; return typeof k === "string" ? k : ""; } catch { return ""; }
}

const esc = (t: unknown) => String(t ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]!));

async function avisar(para: string[], antigo: string, novo: string) {
  const chave = env("RESEND_API_KEY"), de = env("AVISO_EMAIL_DE");
  if (!chave || !de) return "e-mail não configurado";
  const site = env("SITE_URL") || "https://policoatingg.com.br";
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"></head>
<body style="margin:0; padding:0; background:#eef2f7;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;"><tr><td align="center" style="padding:24px 10px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%; max-width:600px; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #dfe5ec; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:23px; color:#1d2733;">
  <tr><td style="background:#0b1424; padding:20px 28px;"><span style="font-size:22px; font-weight:900; font-style:italic; color:#ffffff;">POLI<span style="color:#4d8bff;">COATING</span></span></td></tr>
  <tr><td style="padding:28px;">
    <p style="margin:0 0 6px; font-size:12px; font-weight:700; letter-spacing:1px; color:#1558d6; text-transform:uppercase;">Acesso da equipe</p>
    <h1 style="margin:0 0 14px; font-size:22px; color:#0b1424;">Seu e-mail de acesso mudou</h1>
    <p style="margin:0 0 14px;">O administrador definiu o seu e-mail da empresa. A partir de agora, entre no site com:</p>
    <p style="margin:0 0 18px; padding:14px; background:#f4f7fa; border:1px solid #dfe5ec; border-radius:8px; font-size:18px; font-weight:700; text-align:center; color:#0b1424;">${esc(novo)}</p>
    <p style="margin:0 0 6px; color:#5a6775;">E-mail anterior: ${esc(antigo)}</p>
    <p style="margin:0 0 20px; color:#5a6775;">Os códigos de acesso continuam chegando na sua caixa de sempre. Se você estiver com o site aberto, saia e entre de novo com o e-mail novo.</p>
    <a href="${esc(site.replace(/\/$/, ""))}/conta.html" style="display:inline-block; padding:11px 18px; border-radius:8px; background:#1558d6; color:#ffffff; font-weight:700; text-decoration:none;">Entrar no site</a>
  </td></tr>
  <tr><td style="background:#f4f7fa; padding:14px 28px; font-size:12px; color:#5a6775;">Se você não esperava esta mudança, fale com o administrador do site.</td></tr>
</table></td></tr></table></body></html>`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: de, to: para, subject: "Seu e-mail de acesso à Policoating mudou", html,
      text: `Seu e-mail de acesso à Policoating mudou.\n\nNovo: ${novo}\nAnterior: ${antigo}\n\nOs códigos continuam chegando na sua caixa de sempre. Entre de novo com o e-mail novo: ${site}/conta.html` }),
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

  // 1) quem está pedindo precisa estar logado e ser administrador
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: quem } = await sb.auth.getUser(token);
  const meuEmail = String(quem?.user?.email || "").toLowerCase();
  if (!meuEmail) return falha("Entre na sua conta de novo.", 401);
  const { data: eu } = await sb.from("admins").select("papel").ilike("email", exato(meuEmail)).maybeSingle();
  if (!eu || (eu.papel && eu.papel !== "admin")) return falha("Só administradores podem definir o e-mail da empresa.", 403);

  // 2) dados do pedido
  let corpo: { atual?: string; novo?: string };
  try { corpo = await req.json(); } catch { return falha("Pedido inválido."); }
  const atual = String(corpo.atual || "").trim().toLowerCase(), novo = String(corpo.novo || "").trim().toLowerCase();
  const dominio = (env("DOMINIO_EQUIPE") || "policoatingg.com.br").toLowerCase();
  if (!EMAIL_RE.test(atual) || !EMAIL_RE.test(novo)) return falha("E-mail inválido.");
  if (!novo.endsWith("@" + dominio)) return falha(`O e-mail da empresa precisa terminar em @${dominio}.`);
  if (atual === novo) return falha("Esse já é o e-mail de acesso dessa pessoa.");

  const { data: membro } = await sb.from("admins").select("email").ilike("email", exato(atual)).maybeSingle();
  if (!membro) return falha("Essa pessoa não está na equipe. Adicione na Equipe primeiro.");
  const { data: jaEquipe } = await sb.from("admins").select("email").ilike("email", exato(novo)).maybeSingle();
  if (jaEquipe) return falha("Esse e-mail da empresa já está na equipe.");

  // 3) procura as contas de login (a antiga e se o e-mail novo já está em uso)
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

  // 4) troca o login, depois a equipe e o cadastro (desfaz o login se a equipe falhar)
  const { error: eLogin } = await sb.auth.admin.updateUserById(usuario.id, { email: novo, email_confirm: true });
  if (eLogin) return falha(`Não foi possível trocar o e-mail: ${eLogin.message}`, 500);
  const { error: eEquipe } = await sb.from("admins").update({ email: novo }).ilike("email", exato(atual));
  if (eEquipe) {
    await sb.auth.admin.updateUserById(usuario.id, { email: atual, email_confirm: true });
    return falha("Não foi possível atualizar a equipe. Nada foi alterado.", 500);
  }
  await sb.from("clientes").update({ email: novo }).eq("id", usuario.id);

  const aviso = await avisar([...new Set([atual, novo])], atual, novo).catch((e) => `erro ${e}`);
  console.log(`equipe: ${atual} -> ${novo} por ${meuEmail} | aviso: ${aviso}`);
  return responder({ ok: true, novo, aviso });
});
