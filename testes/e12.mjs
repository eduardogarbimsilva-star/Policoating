// E12 — banners de novidades (só o que está ligado), foco devolvido ao fechar, contraste, menos movimento e CLS.
// Uso: python3 testes/servidor.py 8765 &  depois  node testes/e12.mjs
import { chromium, BASE, contextoDemo, sementeCatalogo, relatorio } from "./comum.mjs";
const R = relatorio();
const nav = await chromium.launch();
const espera = (p, ms) => p.waitForTimeout(ms);
const REC = (l) => Object.fromEntries(l.map((k) => [k, { chave: k, ligado: true, implementado: true, alvos: {} }]));
async function site(recursos, opcoes = {}) {
  const ctx = await contextoDemo(nav, opcoes);
  await ctx.addInitScript(([c, rec]) => { if (localStorage.getItem("__s")) return; localStorage.setItem("__s", "1"); localStorage.setItem("policoating_demo_catalogo", JSON.stringify(c)); if (rec) localStorage.setItem("policoating_demo_recursos", JSON.stringify(rec)); }, [sementeCatalogo(), recursos || null]);
  await ctx.addInitScript(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true }); });
  const p = await ctx.newPage(); const erros = []; p.on("pageerror", (e) => erros.push(e.message));
  return { ctx, p, erros };
}
const cartoes = (p) => p.$$eval("#novidades .novidade h3", (h) => h.map((x) => x.textContent));
{ const { ctx, p } = await site(REC(["b2b_quote_enabled", "freight_estimate_enabled"]));
  await p.goto(`${BASE}/index.html`); await espera(p, 900);
  R.add("V31-E12-00", "Banners desligados: seção de novidades não aparece", await p.$eval("#novidades", (s) => s.hidden));
  await ctx.close(); }
{ const { ctx, p, erros } = await site(REC(["new_home_banners_enabled", "b2b_quote_enabled", "freight_estimate_enabled"]));
  await p.goto(`${BASE}/index.html`); await espera(p, 900);
  const c = await cartoes(p);
  R.add("V31-E12-01", "Sem compra direta: banners só da cotação e do frete, e a página não fala em Pix", c.join("|") === "Cotação online com número|Frete na hora pelo CEP" && !/\bpix\b/i.test(await p.innerText("body")), c.join("|"));
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 100)); } });
  await espera(p, 500);
  const cls = await p.evaluate(() => window.__cls);
  R.add("V31-E12-04", "Animações e banners não fazem a página pular (CLS < 0,1)", cls < 0.1, cls.toFixed(3));
  R.add("V31-E12-09", "Sem erros de JavaScript", !erros.length, erros.join(" | "));
  await ctx.close(); }
{ const { ctx, p } = await site(REC(["new_home_banners_enabled", "direct_checkout_enabled"]));
  await p.goto(`${BASE}/index.html`); await espera(p, 900);
  R.add("V31-E12-02", "Com a compra direta ligada: banner 'Compra com Pix e cartão'", (await cartoes(p)).includes("Compra com Pix e cartão"));
  await ctx.close(); }
{ const { ctx, p } = await site(null, { viewport: { width: 1366, height: 900 } });
  await p.goto(`${BASE}/produtos.html`); await espera(p, 900);
  await p.focus(".cartao-produto .btn-add"); await p.keyboard.press("Enter"); await espera(p, 400);
  const dentro = await p.evaluate(() => !!document.activeElement.closest("#modal-produto"));
  await p.keyboard.press("Escape"); await espera(p, 300);
  const volta = await p.evaluate(() => document.activeElement.classList.contains("btn-add"));
  R.add("V31-E12-07", "Janela do produto: foco entra ao abrir e volta ao botão ao fechar (Esc)", dentro && volta, `dentro=${dentro} volta=${volta}`);
  await p.focus(".btn-carrinho"); await p.keyboard.press("Enter"); await espera(p, 400);
  const noCarrinho = await p.evaluate(() => !!document.activeElement.closest("#carrinho"));
  await p.keyboard.press("Escape"); await espera(p, 300);
  R.add("V31-E12-07b", "Carrinho: foco entra e volta ao botão do carrinho", noCarrinho && await p.evaluate(() => document.activeElement.classList.contains("btn-carrinho")));
  const cr = await p.evaluate(() => {
    const b = document.querySelector(".btn-whats"); const s = getComputedStyle(b);
    const L = (c) => { const [r, g, bl] = c.match(/\d+/g).slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * bl; };
    const a = L(s.color), f = L(s.backgroundColor); return (Math.max(a, f) + 0.05) / (Math.min(a, f) + 0.05);
  });
  R.add("V31-E12-05", "Botão do WhatsApp com contraste AA (≥ 4,5:1)", cr >= 4.5, cr.toFixed(2));
  await ctx.close(); }
{ const { ctx, p } = await site(REC(["new_home_banners_enabled", "b2b_quote_enabled"]), { reducedMotion: "reduce" });
  await p.goto(`${BASE}/index.html`); await espera(p, 900);
  R.add("V31-E12-10", "Menos movimento: banners sem transição", await p.$eval("#novidades .novidade", (n) => getComputedStyle(n).transitionDuration.split(",").every((d) => parseFloat(d) === 0)));
  await ctx.close(); }
{ const { ctx, p } = await site();
  await p.goto(`${BASE}/produto.html?id=pol-0001`); await espera(p, 900);
  const ok = await p.evaluate(() => { const h1 = document.querySelector("h1").textContent.trim(), m = document.querySelector("#pp-migalhas [aria-current]"); const img = document.querySelector("#pp-foto img"); return m && m.textContent.trim() === h1 && img && img.alt.startsWith(h1); });
  R.add("V31-E12-03/06", "Página do produto: trilha = título e texto da foto com o nome do produto", ok);
  await ctx.close(); }
await nav.close();
process.exitCode = R.imprimir() ? 1 : 0;
