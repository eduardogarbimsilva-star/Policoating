// E03 — Comércio e Recursos: aba do painel, liga/desliga com requisito, exceções e histórico.
// (As regras do banco — só admin com 2 etapas, auditoria, formato — são testadas em SQL na PARTE R.)
// Uso: python3 testes/servidor.py 8765 &  depois  node testes/e03.mjs
import { chromium, BASE, contextoDemo, sementeCatalogo, logarDemo, relatorio } from "./comum.mjs";

const R = relatorio();
const nav = await chromium.launch();
const espera = (p, ms) => p.waitForTimeout(ms);

async function painel(papel, recursosDemo) {
  const ctx = await contextoDemo(nav);
  const email = papel === "admin" ? "dono@policoatingtintas.com.br" : "vend@policoatingtintas.com.br";
  await ctx.addInitScript(([c, eq, rec]) => {
    if (localStorage.getItem("__semente")) return; localStorage.setItem("__semente", "1");
    localStorage.setItem("policoating_demo_catalogo", JSON.stringify(c));
    localStorage.setItem("policoating_demo_equipe", JSON.stringify(eq));
    if (rec) localStorage.setItem("policoating_demo_recursos", JSON.stringify(rec));
  }, [sementeCatalogo(), [{ email: "dono@policoatingtintas.com.br", papel: "admin" }, { email: "vend@policoatingtintas.com.br", papel: "vendedor" }], recursosDemo || null]);
  await logarDemo(ctx, email, null);
  const p = await ctx.newPage(); const erros = []; p.on("pageerror", (e) => erros.push(e.message));
  p.on("dialog", (d) => d.type() === "prompt" ? d.accept("Teste E03") : d.accept());
  await p.goto(`${BASE}/admin.html`); await espera(p, 1200);
  return { ctx, p, erros };
}
const abrirAba = async (p) => { await p.click('.admin-abas [data-aba="recursos"]'); await espera(p, 600); };

// V31-E03-01 — vendedor não vê a aba
{
  const { ctx, p } = await painel("vendedor");
  const tem = !!(await p.$('.admin-abas [data-aba="recursos"]'));
  R.add("V31-E03-01", "Vendedor não vê Comércio e Recursos", !tem, tem ? "aba visível" : "");
  await ctx.close();
}

// V31-E03-02 — estado seguro: tudo desligado, recursos não prontos não podem ser ligados
{
  const { ctx, p, erros } = await painel("admin");
  await abrirAba(p);
  const cards = await p.$$eval(".rec-card", (l) => l.map((c) => ({ k: c.dataset.chave, on: c.querySelector("[data-alternar]").getAttribute("aria-checked") === "true", dis: c.querySelector("[data-alternar]").disabled, req: !!c.querySelector(".rec-req") })));
  const ligados = cards.filter((c) => c.on).map((c) => c.k);
  const travados = cards.filter((c) => c.dis && c.req).length;
  R.add("V31-E03-02", "13 recursos; só a aprovação manual ligada; os não prontos ficam travados com requisito",
    cards.length === 13 && ligados.join() === "manual_quote_approval" && travados === 12 && !erros.length, `${cards.length} recursos, ligados=${ligados.join()}, travados=${travados} erros=${erros.join(" | ")}`);
  const pub = await ctx.newPage(); await pub.goto(`${BASE}/index.html`); await espera(pub, 500);
  const algum = await pub.evaluate(() => window.Recursos.DEF.some((d) => window.Recursos.ligado(d.chave) && d.chave !== "manual_quote_approval"));
  R.add("V31-E03-03", "No site público nenhum recurso novo aparece ligado", !algum);
  await ctx.close();
}

// V31-E03-04 — recurso pronto: liga com motivo, histórico registra; desligar volta
{
  const pronto = { b2b_quote_enabled: { chave: "b2b_quote_enabled", ligado: false, alvos: {}, implementado: true, requisito: "" } };
  const { ctx, p, erros } = await painel("admin", pronto);
  await abrirAba(p);
  const sw = '.rec-card[data-chave="b2b_quote_enabled"] [data-alternar]';
  await p.click(sw); await espera(p, 600);
  const on = await p.getAttribute(sw, "aria-checked");
  const selo = (await p.textContent('.rec-card[data-chave="b2b_quote_enabled"] .rec-selo')).trim();
  const hist = (await p.textContent("#recursos-historico tr")).replace(/\s+/g, " ").trim();
  R.add("V31-E03-04", "Ligar recurso pronto grava quem, quando, mudança e motivo", on === "true" && selo === "Ligado" && /desligado\s*→\s*ligado/.test(hist) && /Teste E03/.test(hist) && !erros.length, hist.slice(0, 110));

  // exceções: só os escolhidos + produto POL-0001
  const card = '.rec-card[data-chave="b2b_quote_enabled"]';
  await p.click(`${card} summary`); await espera(p, 200);
  await p.check(`${card} input[value="escolhidos"]`);
  await p.fill(`${card} [data-add-prod]`, "POL-0001 — Poliéster Brilhante Teste POL-0001"); await p.dispatchEvent(`${card} [data-add-prod]`, "change"); await espera(p, 200);
  await p.click(`${card} [data-salvar-alvos]`); await espera(p, 700);
  const resumo = (await p.textContent(`${card} [data-resumo]`)).trim();
  const pub = await ctx.newPage(); await pub.goto(`${BASE}/produtos.html`); await espera(pub, 700);
  const regra = await pub.evaluate(() => ["pol-0001", "pol-0002"].map((id) => window.Recursos.disponivel("b2b_quote_enabled", window.PRODUTOS.find((x) => x.id === id))));
  R.add("V31-E03-05", "Só os escolhidos: vale para POL-0001 e não para POL-0002", /Só os escolhidos · vale para 1 de 2/.test(resumo) && regra.join() === "true,false", `resumo="${resumo}" regra=${regra}`);

  await p.click(sw); await espera(p, 600);
  const pub2 = await pub.evaluate(async () => { await window.Recursos.recarregar(); return window.Recursos.disponivel("b2b_quote_enabled", window.PRODUTOS[0]); });
  R.add("V31-E03-06", "Desligar o mestre desliga em todos os produtos e preserva as exceções", (await p.getAttribute(sw, "aria-checked")) === "false" && pub2 === false
    && (await p.evaluate(() => !!((window.Recursos.todos().b2b_quote_enabled.alvos.produtos || {})["pol-0001"]))), JSON.stringify(await p.evaluate(() => window.Recursos.todos().b2b_quote_enabled.alvos)));
  await ctx.close();
}

await nav.close();
process.exitCode = R.imprimir() ? 1 : 0;
