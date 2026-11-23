// Janela "Novidades no site": aparece ao entrar, ~10 s, X/Esc, "não mostrar novamente" por versão, itens da equipe só para a equipe.
// Uso: python3 testes/servidor.py 8765 &  depois  node testes/novidades.mjs
import { chromium, BASE, contextoDemo, sementeCatalogo, logarDemo, relatorio } from "./comum.mjs";
const R = relatorio();
const nav = await chromium.launch();
const REC = (l) => Object.fromEntries(l.map((k) => [k, { chave: k, ligado: true, implementado: true, alvos: {} }]));
async function abrir({ admin, w = 1280 } = {}) {
  const ctx = await contextoDemo(nav, { viewport: { width: w, height: 800 } });
  await ctx.addInitScript(([c, rec, adm]) => {
    if (localStorage.getItem("__s")) return; localStorage.setItem("__s", "1");
    localStorage.setItem("policoating_novidades_ocultar", "");
    localStorage.setItem("policoating_demo_catalogo", JSON.stringify(c)); localStorage.setItem("policoating_demo_recursos", JSON.stringify(rec));
    if (adm) localStorage.setItem("policoating_demo_equipe", JSON.stringify([{ email: "dono@x.com", papel: "admin" }]));
  }, [sementeCatalogo(), REC(["b2b_quote_enabled", "freight_estimate_enabled"]), !!admin]);
  if (admin) await logarDemo(ctx, "dono@x.com", null);
  const p = await ctx.newPage(); const erros = []; p.on("pageerror", (e) => erros.push(e.message));
  return { ctx, p, erros };
}
{
  const { ctx, p, erros } = await abrir();
  await p.goto(`${BASE}/index.html`); await p.waitForTimeout(2300);
  const j = await p.evaluate(() => ({ ok: !!document.querySelector(".nv-tela.nv-visivel"), itens: [...document.querySelectorAll(".nv-lista strong")].map((x) => x.textContent), equipe: document.querySelectorAll(".nv-equipe").length }));
  R.add("NV-01", "Ao entrar aparece a janela de novidades (só itens de recursos ligados, sem itens da equipe)",
    j.ok && j.itens.some((t) => /Orçamento/.test(t)) && j.itens.some((t) => /frete/i.test(t)) && !j.itens.some((t) => /Converse/.test(t)) && j.equipe === 0, JSON.stringify(j));
  await p.mouse.move(5, 5); await p.waitForTimeout(10500);
  R.add("NV-02", "Some sozinha depois de ~10 segundos", !(await p.$(".nv-tela")));
  await p.reload(); await p.waitForTimeout(2300);
  R.add("NV-03", "Volta a aparecer na próxima visita", !!(await p.$(".nv-tela")));
  await p.click(".nv-fechar"); await p.waitForTimeout(400);
  R.add("NV-04", "O X fecha antes dos 10 segundos", !(await p.$(".nv-tela")));
  await p.reload(); await p.waitForTimeout(2300);
  await p.keyboard.press("Escape"); await p.waitForTimeout(400);
  R.add("NV-05", "Esc fecha", !(await p.$(".nv-tela")));
  await p.reload(); await p.waitForTimeout(2300);
  await p.check(".nv-nao input"); await p.click(".nv-ok"); await p.waitForTimeout(400);
  await p.reload(); await p.waitForTimeout(2500);
  R.add("NV-06", "\"Não mostrar novamente\" + Entendi: não aparece mais nesta versão", !(await p.$(".nv-tela")));
  await p.evaluate(() => localStorage.setItem("policoating_novidades_ocultar", "versao-antiga")); await p.reload(); await p.waitForTimeout(2300);
  R.add("NV-07", "Atualização nova: aparece de novo", !!(await p.$(".nv-tela")));
  R.add("NV-08", "Sem erros de JavaScript", !erros.length, erros.join(" | "));
  await ctx.close();
}
{
  const { ctx, p } = await abrir({ admin: true });
  await p.goto(`${BASE}/index.html`); await p.waitForTimeout(2600);
  R.add("NV-09", "Para o dono aparecem também os itens da equipe", (await p.$$(".nv-equipe")).length >= 2);
  await ctx.close();
}
{
  const { ctx, p } = await abrir({ w: 360 });
  await p.goto(`${BASE}/index.html`); await p.waitForTimeout(2300);
  const m = await p.evaluate(() => { const c = document.querySelector(".nv-caixa").getBoundingClientRect(); return { dentro: c.left >= 0 && c.right <= innerWidth && c.top >= 0 && c.bottom <= innerHeight, x: !!document.querySelector(".nv-fechar").getBoundingClientRect().width }; });
  R.add("NV-10", "No celular (360 px) a janela cabe inteira na tela, com o X visível", m.dentro && m.x, JSON.stringify(m));
  if (process.env.FOTO) await p.screenshot({ path: process.env.FOTO });
  await ctx.close();
}
await nav.close();
process.exitCode = R.imprimir() ? 1 : 0;
