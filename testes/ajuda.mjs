// Ajuda "antes e depois" no painel: botão ? nos recursos e nas configurações da cotação abre 2 fotos (desligado/ligado).
// Uso: python3 testes/servidor.py 8765 &  depois  node testes/ajuda.mjs
import { chromium, BASE, contextoDemo, sementeCatalogo, logarDemo, relatorio } from "./comum.mjs";
const R = relatorio();
const nav = await chromium.launch();
for (const w of [1280, 390]) {
  const ctx = await contextoDemo(nav, { viewport: { width: w, height: 860 } });
  await ctx.addInitScript((c) => { if (localStorage.getItem("__s")) return; localStorage.setItem("__s", "1"); localStorage.setItem("policoating_demo_catalogo", JSON.stringify(c)); localStorage.setItem("policoating_demo_equipe", JSON.stringify([{ email: "dono@x.com", papel: "admin" }])); }, sementeCatalogo());
  await logarDemo(ctx, "dono@x.com", null);
  const p = await ctx.newPage(); const erros = []; p.on("pageerror", (e) => erros.push(e.message));
  await p.goto(`${BASE}/admin.html`); await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelector('[data-aba="recursos"]').click()); await p.waitForTimeout(800);
  const n = await p.$$eval("#recursos-lista .aj-botao", (l) => l.map((b) => b.dataset.ajudaAbrir));
  R.add(`AJ-01 ${w}`, "Comércio e Recursos: ? nos recursos com antes e depois", n.length >= 6 && n.includes("freight_estimate_enabled"), n.join(","));
  await p.click('#recursos-lista [data-ajuda-abrir="freight_estimate_enabled"]'); await p.waitForTimeout(900);
  const m = await p.evaluate(() => { const t = document.querySelector(".aj-tela"); if (!t) return null; const im = [...t.querySelectorAll("img")]; const c = t.querySelector(".aj-caixa").getBoundingClientRect();
    return { fotos: im.length, carregadas: im.every((i) => i.complete && i.naturalWidth > 0), chips: [...t.querySelectorAll(".aj-chip")].map((x) => x.textContent).join("/"), cabe: c.left >= 0 && c.right <= innerWidth + 1 }; });
  R.add(`AJ-02 ${w}`, "Clicar no ? abre Desligado/Ligado com as 2 fotos carregadas, cabendo na tela", m && m.fotos === 2 && m.carregadas && m.chips === "Desligado/Ligado" && m.cabe, JSON.stringify(m));
  const sw = await p.$eval('.rec-card[data-chave="freight_estimate_enabled"] [data-alternar]', (b) => b.getAttribute("aria-checked"));
  await p.keyboard.press("Escape"); await p.waitForTimeout(400);
  R.add(`AJ-03 ${w}`, "Esc fecha e o ? não mexe na chave do recurso", !(await p.$(".aj-tela")) && sw === (await p.$eval('.rec-card[data-chave="freight_estimate_enabled"] [data-alternar]', (b) => b.getAttribute("aria-checked"))));
  await p.evaluate(() => document.querySelector('[data-aba="cotacoes"]').click()); await p.waitForTimeout(800);
  await p.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true))); await p.waitForTimeout(300);
  const leg = await p.$$eval("legend .aj-botao", (l) => l.map((b) => b.dataset.ajudaAbrir));
  R.add(`AJ-04 ${w}`, "Configurações da cotação: ? em veículos, volumetria e intervalo", ["cot-veiculos", "cot-volumetria", "cot-intervalo"].every((k) => leg.includes(k)), leg.join(","));
  await p.click('legend [data-ajuda-abrir="cot-volumetria"]'); await p.waitForTimeout(900);
  R.add(`AJ-05 ${w}`, "Volumetria: as 2 fotos carregam", await p.evaluate(() => [...document.querySelectorAll(".aj-tela img")].filter((i) => i.naturalWidth > 0).length === 2));
  if (process.env.FOTO && w === 1280) await p.screenshot({ path: process.env.FOTO });
  await p.click(".aj-fechar"); await p.waitForTimeout(300);
  R.add(`AJ-06 ${w}`, "Sem erros de JavaScript", !erros.length, erros.join(" | "));
  await ctx.close();
}
await nav.close();
process.exitCode = R.imprimir() ? 1 : 0;
