// E13/E14 — sitemap e robots sem páginas privadas, recursos novos desligados por padrão, saúde do sistema no painel.
// Uso: python3 testes/servidor.py 8765 &  depois  node testes/e13_e14.mjs
import { readFileSync } from "node:fs";
import { chromium, BASE, contextoDemo, sementeCatalogo, logarDemo, relatorio } from "./comum.mjs";
const R = relatorio();
const raiz = new URL("..", import.meta.url);
const ler = (f) => readFileSync(new URL(f, raiz), "utf8");

/* ---------- sitemap e robots ---------- */
const sitemap = ler("sitemap.xml"), robots = ler("robots.txt");
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
R.add("V31-E13-06", "Sitemap sem páginas privadas (conta, painel, cotação, WhatsApp, 404) e só do domínio oficial",
  urls.length > 5 && !urls.some((u) => /\/(conta|admin|cotacao|whatsapp|404)\b/.test(u)) && urls.every((u) => u.startsWith("https://policoatingtintas.com.br/")), `${urls.length} endereços`);
R.add("V31-E13-06b", "robots.txt bloqueia conta e painel e aponta o sitemap", /Disallow: \/conta/.test(robots) && /Disallow: \/admin/.test(robots) && /Sitemap: https:\/\/policoatingtintas\.com\.br\/sitemap\.xml/.test(robots));

/* ---------- recursos novos começam DESLIGADOS ---------- */
const setup = ler("supabase/setup.sql");
const ins = /insert into public\.recursos \(chave, ligado, requisito\) values([\s\S]*?)on conflict/.exec(setup);
const linhas = ins ? [...ins[1].matchAll(/\('([a-z0-9_]+)',\s*(true|false)/g)].map((m) => [m[1], m[2]]) : [];
const ligados = linhas.filter(([, v]) => v === "true").map(([k]) => k);
R.add("V31-E14-03", "Banco: todos os recursos novos começam desligados (só 'aprovação manual das cotações' ligada, que é a opção segura)", linhas.length >= 12 && ligados.join() === "manual_quote_approval", `${linhas.length} recursos; ligados: ${ligados.join() || "nenhum"}`);
const js = ler("assets/js/recursos.js");
R.add("V31-E14-03b", "Site: sem banco, nenhum recurso novo fica ligado", /ligado: d\.chave === "manual_quote_approval"/.test(js));
R.add("V31-E14-03c", "Ligar exige administrador com 2 etapas e grava auditoria (alterar_recurso)", /if not public\.eh_admin\(\) then raise exception 'Só o administrador \(com as 2 etapas\) pode alterar recursos\.'/.test(setup) && /insert into public\.recursos_auditoria/.test(setup));
const partes = [...setup.matchAll(/^-- PARTE ([A-Z]+) —/gm)].map((m) => m[1]);
const semDesfazer = partes.filter((p) => { const i = setup.indexOf(`-- PARTE ${p} —`); return !/Desfazer/i.test(setup.slice(i, i + 1600)); });
R.add("V31-E14-06a", "Cada parte nova do SQL (R em diante) traz as instruções para desfazer", !semDesfazer.filter((p) => p >= "R" || p.length > 1).length, `sem "Desfazer": ${semDesfazer.filter((p) => p >= "R" || p.length > 1).join(",") || "nenhuma"}`);

/* ---------- painel: saúde do sistema (demonstração) ---------- */
const nav = await chromium.launch();
{
  const ctx = await contextoDemo(nav);
  await ctx.addInitScript((c) => { if (localStorage.getItem("__s")) return; localStorage.setItem("__s", "1"); localStorage.setItem("policoating_demo_catalogo", JSON.stringify(c)); localStorage.setItem("policoating_demo_equipe", JSON.stringify([{ email: "dono@x.com", papel: "admin" }])); }, sementeCatalogo());
  await logarDemo(ctx, "dono@x.com", null);
  const p = await ctx.newPage(); const erros = []; p.on("pageerror", (e) => erros.push(e.message));
  await p.goto(`${BASE}/admin.html`); await p.waitForTimeout(1200);
  await p.click('.admin-abas [data-aba="cotacoes"]'); await p.waitForTimeout(700);
  const s = await p.evaluate(() => ({ vis: !document.querySelector("#saude-sistema").hidden, kpis: document.querySelectorAll("#saude-kpis > div").length, alerta: document.querySelector("#saude-alertas").textContent }));
  R.add("V31-E13-08", "Painel mostra a saúde do sistema (cotações de 168 h, limpeza, fretes, consultas) com alertas", s.vis && s.kpis === 5 && /limpeza automática não está agendada/.test(s.alerta), JSON.stringify(s).slice(0, 160));
  R.add("V31-E13-09", "Sem erros de JavaScript no painel", !erros.length, erros.join(" | "));
  await ctx.close();
}
await nav.close();
process.exitCode = R.imprimir() ? 1 : 0;
