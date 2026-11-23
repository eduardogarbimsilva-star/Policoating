// Painel no celular: cada aba sem vazar, sem sobrepor e sem texto cortado (modo demonstração, dono).
// Uso: python3 testes/servidor.py 8765 &  depois  node testes/celular_painel.mjs
import { chromium, BASE, contextoDemo, sementeCatalogo, logarDemo } from "./comum.mjs";
import { detector } from "./celular.mjs";
const FOTOS = process.env.FOTOS || "";
const REC = ["floating_social_enabled", "social_click_metrics_enabled", "pwa_install_invite_enabled", "freight_estimate_enabled", "manual_quote_approval_enabled", "b2b_whatsapp_shortcut_enabled", "b2b_quote_enabled", "product_docs_enabled", "new_home_banners_enabled"];
const nav = await chromium.launch(); let total = 0;
for (const w of [360, 390]) {
  const ctx = await contextoDemo(nav, { viewport: { width: w, height: 800 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(([c, rec]) => { if (localStorage.getItem("__s")) return; localStorage.setItem("__s", "1"); localStorage.setItem("policoating_demo_catalogo", JSON.stringify(c)); localStorage.setItem("policoating_demo_equipe", JSON.stringify([{ email: "dono.da.empresa@x.com", papel: "admin" }]));
    localStorage.setItem("policoating_demo_recursos", JSON.stringify(Object.fromEntries(rec.map((k) => [k, { chave: k, ligado: true, implementado: true, alvos: {} }])))); }, [sementeCatalogo(), REC]);
  await logarDemo(ctx, "dono.da.empresa@x.com", null);
  const p = await ctx.newPage();
  await p.goto(`${BASE}/admin.html`); await p.waitForTimeout(1500);
  const abas = await p.$$eval("[data-aba]", (l) => [...new Set(l.map((x) => x.dataset.aba))]);
  for (const a of abas) {
    await p.evaluate((a) => { const b = document.querySelector(`[data-aba="${a}"]`); if (b) b.click(); }, a); await p.waitForTimeout(700);
    await p.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true))); await p.waitForTimeout(300);
    const pr = await p.evaluate(detector);
    if (pr.length) { total += pr.length; console.log(`FAIL  ${w}px painel/${a}\n   - ` + pr.slice(0, 20).join("\n   - ")); } else console.log(`PASS  ${w}px painel/${a}`);
    if (FOTOS && w === 390) await p.screenshot({ path: `${FOTOS}/painel_${a}.png`, fullPage: true });
  }
  await ctx.close();
}
await nav.close();
console.log(total ? `\n${total} problema(s)` : "\nNENHUM PROBLEMA"); process.exitCode = total ? 1 : 0;
