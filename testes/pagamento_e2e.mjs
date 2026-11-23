// E09 — compra direta no site (modo demonstração): botão só quando permitido, janela de resumo, volta do Mercado Pago e situação no pedido.
// Uso: python3 testes/servidor.py 8765 &  depois  node testes/pagamento_e2e.mjs
import { chromium, BASE, contextoDemo, sementeCatalogo, logarDemo, relatorio, PERFIL_PF } from "./comum.mjs";
const R = relatorio();
const nav = await chromium.launch();
const espera = (p, ms) => p.waitForTimeout(ms);
const REC = (l) => Object.fromEntries(l.map((k) => [k, { chave: k, ligado: true, implementado: true, alvos: { padrao: "todos" } }]));
async function site({ rec, logado = true, combinar = false, w = 1280 }) {
  const ctx = await contextoDemo(nav, { viewport: { width: w, height: 860 } });
  const cat = sementeCatalogo();
  if (combinar) cat["pol-0002"].dados.precoCombinar = true;
  await ctx.addInitScript(([c, rec, comb]) => {
    if (localStorage.getItem("__s")) return; localStorage.setItem("__s", "1");
    localStorage.setItem("policoating_demo_catalogo", JSON.stringify(c)); localStorage.setItem("policoating_demo_recursos", JSON.stringify(rec));
    localStorage.setItem("policoating_carrinho", JSON.stringify([{ id: "pol-0001", embalagem: "Caixa 25 kg", qtd: 2, cor: "Preto RAL 9005" }].concat(comb ? [{ id: "pol-0002", embalagem: "Caixa 25 kg", qtd: 1, cor: "Preto RAL 9005" }] : [])));
  }, [cat, REC(rec), combinar]);
  if (logado) await logarDemo(ctx, "maria@x.com", PERFIL_PF);
  const p = await ctx.newPage(); const erros = []; p.on("pageerror", (e) => erros.push(e.message));
  await p.goto(`${BASE}/index.html`); await espera(p, 1200);
  await p.click(".btn-carrinho"); await espera(p, 500);
  return { ctx, p, erros };
}
const visivel = (p) => p.$eval("#btn-pagar", (b) => !b.hidden);

{ const { ctx, p } = await site({ rec: ["freight_estimate_enabled"] });
  R.add("PG-01", "Recurso \"Compra direta\" desligado (padrão): sem botão de pagar; o pedido pelo WhatsApp continua", !(await visivel(p)) && await p.isVisible("#btn-finalizar"));
  await ctx.close(); }
{ const { ctx, p } = await site({ rec: ["direct_checkout_enabled"] });
  R.add("PG-02", "Compra direta ligada mas sem frete pelo CEP: sem botão (o frete precisa ser calculado)", !(await visivel(p)));
  await ctx.close(); }
{ const { ctx, p } = await site({ rec: ["direct_checkout_enabled", "freight_estimate_enabled"], combinar: true });
  R.add("PG-03", "Carrinho com item de preço a consultar: sem botão de pagar", !(await visivel(p)));
  await ctx.close(); }
{ const { ctx, p, erros } = await site({ rec: ["direct_checkout_enabled", "freight_estimate_enabled"] });
  R.add("PG-04", "Tudo liberado e com preço: aparece \"Pagar com Pix ou cartão\" junto do WhatsApp", await visivel(p) && /Pix ou cartão/.test(await p.textContent("#btn-pagar")) && await p.isVisible("#btn-finalizar"));
  await p.click("#btn-pagar"); await espera(p, 1200);
  const j = await p.evaluate(() => { const t = document.querySelector(".pg-tela"); return t && { txt: t.textContent.replace(/\s+/g, " "), whats: !!t.querySelector("[data-pg-whats]") }; });
  R.add("PG-05", "Sem servidor (demonstração): o pedido é registrado e a janela explica e oferece o WhatsApp (não trava)", !!j && /PC-\d{6}-[A-Z0-9]{5}/.test(j.txt) && /servidor/.test(j.txt) && j.whats, j && j.txt.slice(0, 200));
  await p.keyboard.press("Escape"); await espera(p, 300);
  R.add("PG-06", "Esc fecha a janela de pagamento", !(await p.$(".pg-tela")));
  R.add("PG-07", "Sem erros de JavaScript", !erros.length, erros.join(" | "));
  await ctx.close(); }
{ const { ctx, p } = await site({ rec: ["direct_checkout_enabled", "freight_estimate_enabled"], logado: false });
  await p.click("#btn-pagar"); await espera(p, 800);
  R.add("PG-08", "Sem login: pagar leva para entrar na conta", /conta/.test(p.url()));
  await ctx.close(); }
{ const ctx = await contextoDemo(nav, { viewport: { width: 1280, height: 860 } });
  await logarDemo(ctx, "maria@x.com", PERFIL_PF);
  const p = await ctx.newPage();
  for (const [s, txt] of [["ok", "Pagamento recebido"], ["pendente", "em análise"], ["falhou", "não foi concluído"]]) {
    await p.goto(`${BASE}/conta.html?pagamento=${s}&pedido=PC-261123-AB12C`); await espera(p, 900);
    const a = await p.evaluate(() => { const b = document.querySelector(".pg-aviso"); return b ? b.textContent : ""; });
    R.add(`PG-09 ${s}`, `Volta do Mercado Pago (${s}): aviso claro com o número do pedido, e o endereço é limpo`, a.includes(txt) && a.includes("PC-261123-AB12C") && !/pagamento=/.test(p.url()), a);
  }
  const chips = await p.evaluate(() => [window.Pagamento.chip({ pagamento_status: "aprovado", pagamento_metodo: "Pix", pagamento_valor: 1772.5 }), window.Pagamento.chip({ pagamento_status: "pendente" }), window.Pagamento.chip({})]);
  R.add("PG-10", "Situação no pedido (conta e painel): Pago · Pix · valor; Aguardando pagamento; nada quando não é compra online",
    /Pago · Pix · R\$\s?1\.772,50/.test(chips[0]) && /Aguardando pagamento/.test(chips[1]) && chips[2] === "", chips.join(" | "));
  await ctx.close(); }
{ const { ctx, p } = await site({ rec: ["direct_checkout_enabled", "freight_estimate_enabled"], w: 360 });
  await p.click("#btn-pagar"); await espera(p, 1200);
  const m = await p.evaluate(() => { const c = document.querySelector(".pg-caixa").getBoundingClientRect(); return c.left >= 0 && c.right <= innerWidth && document.documentElement.scrollWidth <= innerWidth; });
  R.add("PG-11", "Celular (360 px): janela de pagamento cabe na tela", m);
  await ctx.close(); }
await nav.close();
process.exitCode = R.imprimir() ? 1 : 0;
