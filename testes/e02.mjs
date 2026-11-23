// E02 — página própria de cada produto (produto?id=...), dados para o Google e página de trocas.
// Uso: python3 testes/servidor.py 8765 &  depois  node testes/e02.mjs
import { chromium, BASE, contextoDemo, sementeCatalogo, relatorio } from "./comum.mjs";

const R = relatorio();
const nav = await chromium.launch();
const espera = (p, ms) => p.waitForTimeout(ms);
async function site(viewport) {
  const ctx = await contextoDemo(nav, viewport ? { viewport } : {});
  await ctx.addInitScript((c) => { if (localStorage.getItem("__s")) return; localStorage.setItem("__s", "1"); localStorage.setItem("policoating_demo_catalogo", JSON.stringify(c)); }, sementeCatalogo());
  const p = await ctx.newPage(); const erros = []; p.on("pageerror", (e) => erros.push(e.message));
  return { ctx, p, erros };
}

{
  const { ctx, p, erros } = await site();
  await p.goto(`${BASE}/produto.html?id=pol-0001`); await espera(p, 1000);
  const info = await p.evaluate(() => {
    const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent));
    const prod = ld.find((x) => x["@type"] === "Product") || {};
    return { titulo: document.title, h1: (document.querySelector("h1") || {}).textContent, canon: (document.querySelector('link[rel="canonical"]') || {}).href,
      og: (document.querySelector('meta[property="og:url"]') || {}).content, ofertas: (prod.offers || []).map((o) => `${o.sku}=${o.price}`), marca: (prod.brand || {}).name, mpn: prod.mpn,
      devol: ((prod.offers || [])[0] || {}).hasMerchantReturnPolicy, trilha: !!ld.find((x) => x["@type"] === "BreadcrumbList"), preco: document.querySelector(".pp-preco-cx").textContent };
  });
  R.add("V31-E02-10", "Página do produto: título, h1, endereço canônico e og:url próprios", /POL-0001/.test(info.titulo) && /Teste POL-0001/.test(info.h1) && info.canon === "https://policoatingtintas.com.br/produto?id=pol-0001" && info.og === info.canon, JSON.stringify(info));
  R.add("V31-E02-11", "Dados estruturados: Product com marca, MPN, ofertas 25 kg = 750.00 e 5 kg = 150.00, política de devolução e trilha",
    info.ofertas.join() === "POL-0001-25KG=750.00,POL-0001-5KG=150.00" && info.marca === "Policoating" && info.mpn === "POL-0001" && info.devol && info.devol.merchantReturnDays === 7 && info.trilha, JSON.stringify(info));
  R.add("V31-E02-12", "Preço da caixa de 25 kg igual ao dos dados estruturados (R$ 750,00)", /750,00/.test(info.preco), info.preco);
  await p.click('.pp-emb [data-emb="Caixa 5 kg"]'); await espera(p, 150);
  R.add("V31-E02-13", "Trocar para 5 kg muda o preço (R$ 150,00) e o endereço (&emb=5), como no feed", /150,00/.test(await p.textContent(".pp-preco-cx")) && /emb=5/.test(p.url()));
  await p.click('.pp-compra [data-q="1"]'); await p.click("#pp-add"); await espera(p, 300);
  R.add("V31-E02-14", "Adicionar ao carrinho pela página (2 caixas de 5 kg)", await p.evaluate(() => { const c = window.ColorWeg.itensCarrinho(); return c.length === 1 && c[0].qtd === 2 && c[0].embalagem === "Caixa 5 kg"; }));
  R.add("V31-E02-15", "Link de trocas no rodapé e sem erros de JavaScript", !!(await p.$('footer a[href="trocas"]')) && !erros.length, erros.join(" | "));
  await p.goto(`${BASE}/produto.html?id=pol-0001&emb=5`); await espera(p, 900);
  R.add("V31-E02-16", "Link do feed com &emb=5 abre já na caixa de 5 kg", /150,00/.test(await p.textContent(".pp-preco-cx")));
  await p.goto(`${BASE}/produto.html?id=nao-existe`); await espera(p, 900);
  R.add("V31-E02-17", "Produto inexistente: aviso e noindex", /não encontrado/i.test(await p.textContent("h1")) && (await p.getAttribute('meta[name="robots"]', "content")) === "noindex");
  await p.goto(`${BASE}/produtos.html`); await espera(p, 900);
  R.add("V31-E02-18", "Cartões do catálogo têm link para a página do produto", (await p.$$('.cartao-produto a.link-produto[href^="produto?id="]')).length >= 2);
  await p.click('.cartao-produto .vitrine'); await espera(p, 500);
  R.add("V31-E02-19", "Janela do produto tem 'Página completa do produto'", !!(await p.$('#modal-produto a.link-pagina-produto[href="produto?id=pol-0001"]')) || !!(await p.$('#modal-produto a.link-pagina-produto')));
  await p.goto(`${BASE}/trocas.html`); await espera(p, 600);
  const t = await p.textContent("main");
  R.add("V31-E02-20", "Página de trocas: arrependimento em 7 dias, defeito, reembolso e como solicitar", /7 \(sete\) dias corridos/.test(t) && /art\. 49/.test(t) && /Reembolso/.test(t) && /Como solicitar/.test(t));
  await ctx.close();
}
{
  const { ctx, p } = await site({ width: 390, height: 844 });
  await p.goto(`${BASE}/produto.html?id=pol-0001`); await espera(p, 1000);
  R.add("V31-E02-21", "Celular: página do produto sem rolagem lateral", await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await ctx.close();
}
{ // E04: preço próprio da caixa de 5 kg e documentos técnicos (recursos ligados)
  const ctx = await contextoDemo(nav);
  await ctx.addInitScript((c) => {
    if (localStorage.getItem("__s")) return; localStorage.setItem("__s", "1");
    c["pol-0001"].dados.precoKg5 = 34; c["pol-0001"].dados.fds = "https://exemplo.com/fds.pdf"; c["pol-0001"].dados.ficha = "https://exemplo.com/ficha.pdf";
    localStorage.setItem("policoating_demo_catalogo", JSON.stringify(c));
    localStorage.setItem("policoating_demo_recursos", JSON.stringify(Object.fromEntries(["packaging_variants_enabled", "product_docs_enabled"].map((k) => [k, { chave: k, ligado: true, implementado: true, alvos: {} }]))));
  }, sementeCatalogo());
  const p = await ctx.newPage(); const erros = []; p.on("pageerror", (e) => erros.push(e.message));
  await p.goto(`${BASE}/produto.html?id=pol-0001&emb=5`); await espera(p, 1000);
  const ld = await p.evaluate(() => JSON.parse(document.getElementById("pp-jsonld").textContent).offers.map((o) => `${o.sku}=${o.price}`).join());
  R.add("V31-E04-03", "Caixa 5 kg com preço próprio: R$ 170,00 na página e nos dados do Google; 25 kg segue R$ 750,00", /170,00/.test(await p.textContent(".pp-preco-cx")) && ld === "POL-0001-25KG=750.00,POL-0001-5KG=170.00", ld);
  await p.click("#pp-add"); await espera(p, 200);
  R.add("V31-E04-04", "Carrinho usa o preço da caixa de 5 kg (R$ 170,00)", /170,00/.test(await p.textContent("#carrinho-valor")));
  const docs = await p.$$eval(".pp-docs a.pp-doc", (a) => a.map((x) => x.getAttribute("href")));
  R.add("V31-E04-05", "Documentos técnicos: ficha e FDS em PDF", docs.join() === "https://exemplo.com/ficha.pdf,https://exemplo.com/fds.pdf", docs.join());
  R.add("V31-E04-06", "Sem erros de JavaScript", !erros.length, erros.join(" | "));
  await ctx.close();
}
await nav.close();
process.exitCode = R.imprimir() ? 1 : 0;
