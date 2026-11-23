// E14 — conferência do site NO AR depois de publicar (só leitura: não grava nada, não faz pedido nem cotação).
// Uso: node testes/producao.mjs   (opcional: SITE=https://policoatingtintas.com.br)
import { readFileSync } from "node:fs";
import { chromium, relatorio } from "./comum.mjs";
const SITE = process.env.SITE || "https://policoatingtintas.com.br";
const R = relatorio();
const local = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const versaoLocal = (/assets\/css\/style\.css\?v=([0-9a-f]+)/.exec(local) || [])[1];
const cfg = readFileSync(new URL("../assets/js/config.js", import.meta.url), "utf8");
const SB = (/url:\s*"(https:\/\/[^"]+)"/.exec(cfg) || [])[1], CHAVE = (/(sb_publishable_[A-Za-z0-9_-]+)/.exec(cfg) || [])[1];

const html = await (await fetch(SITE + "/")).text();
const versaoNoAr = (/assets\/css\/style\.css\?v=([0-9a-f]+)/.exec(html) || [])[1];
R.add("PROD-01", "A versão publicada é a mesma do repositório (estilo)", versaoNoAr === versaoLocal, `no ar ${versaoNoAr} · local ${versaoLocal} (o GitHub Pages leva ~1 min para atualizar)`);
for (const [id, caminho, tipo] of [["PROD-02", "/robots.txt", /Sitemap:/], ["PROD-03", "/sitemap.xml", /<urlset/], ["PROD-04", "/manifest.webmanifest", /"name"/]]) {
  const r = await fetch(SITE + caminho); R.add(id, `${caminho} responde`, r.ok && tipo.test(await r.text()), String(r.status));
}
// funções do Supabase (só OPTIONS / diagnóstico, sem gravar)
if (SB) {
  const r = await fetch(`${SB}/functions/v1/frete`, { method: "OPTIONS", headers: { origin: SITE } });
  R.add("PROD-05", "Função 'frete' publicada e aceitando o site (CORS)", r.ok && (r.headers.get("access-control-allow-origin") || "").startsWith(SITE.replace(/\/$/, "")), String(r.status));
  const g = await fetch(`${SB}/functions/v1/catalogo-google?diagnostico=1`).catch(() => null);
  const d = g && g.ok ? await g.json().catch(() => null) : null;
  R.add("PROD-06", "Feed do Google (diagnóstico) responde", !!d, d ? `feed ${d.ligado ? "LIGADO" : "desligado"} · ${d.no_feed} de ${d.produtos} produtos prontos` : `status ${g && g.status} (publique a função catalogo-google)`);
  const rec = await fetch(`${SB}/rest/v1/recursos?select=chave,ligado,implementado`, { headers: { apikey: CHAVE } }).then((x) => x.json()).catch(() => []);
  const ligados = (Array.isArray(rec) ? rec : []).filter((x) => x.ligado).map((x) => x.chave);
  R.add("PROD-07", "Recursos ligados no site (conferir se é o que o dono decidiu)", Array.isArray(rec) && rec.length > 0, ligados.join(", ") || "nenhum");
}
// páginas públicas sem erro de JavaScript
const nav = await chromium.launch();
const pags = ["/", "/produtos", "/cotacao", "/trocas", "/sobre", "/aplicacao", "/galeria", "/privacidade"];
const ctx = await nav.newContext({ viewport: { width: 1280, height: 860 } });
const p = await ctx.newPage();
let falhas = [];
for (const pg of pags) {
  const erros = []; const ouvir = (e) => erros.push(e.message); p.on("pageerror", ouvir);
  const resp = await p.goto(SITE + pg, { waitUntil: "load" }).catch((e) => ({ status: () => e.message }));
  await p.waitForTimeout(1500);
  const h1 = await p.$("h1");
  if (!resp || resp.status() !== 200 || !h1 || erros.length) falhas.push(`${pg}: ${resp && resp.status()} ${erros.join(" | ")}`.slice(0, 160));
  p.off("pageerror", ouvir);
}
R.add("PROD-08", `Páginas públicas abrem (200), com título e sem erro de JavaScript (${pags.length})`, !falhas.length, falhas.join(" ; "));
await p.goto(SITE + "/produtos"); await p.waitForTimeout(2500);
const prod = await p.$eval(".cartao-produto a.link-produto", (a) => a.getAttribute("href")).catch(() => "");
if (prod) {
  await p.goto(SITE + "/" + prod); await p.waitForTimeout(2500);
  const ld = await p.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')].some((s) => /"@type":"Product"/.test(s.textContent)));
  R.add("PROD-09", "Página de produto no ar com dados estruturados (Product)", ld, prod);
} else R.add("PROD-09", "Página de produto no ar", false, "catálogo sem produtos ou sem link");
await nav.close();
process.exitCode = R.imprimir() ? 1 : 0;
