// Gera as imagens "antes e depois" da ajuda (botão ? nas configurações do painel).
// Cada configuração vira duas fotos reais do site (modo demonstração): desligada e ligada, no mesmo recorte.
// Uso: python3 testes/servidor.py 8765 &  depois  node ferramentas/ajuda_imagens.mjs [chave...]
import { chromium, BASE, contextoDemo, sementeCatalogo } from "../testes/comum.mjs";
import { mkdirSync } from "node:fs";
const DIR = new URL("../assets/img/ajuda/", import.meta.url).pathname;
mkdirSync(DIR, { recursive: true });
const BASE_REC = ["b2b_quote_enabled", "freight_estimate_enabled", "product_docs_enabled", "packaging_variants_enabled", "new_home_banners_enabled", "b2b_whatsapp_shortcut_enabled"];
const VIACEP = { logradouro: "Avenida Brasil", bairro: "Centro", localidade: "Araraquara", uf: "SP", estado: "São Paulo", regiao: "Sudeste", ddd: "16", ibge: "3503208" };
const CONFIG = { whatsapp: "5516996304811", redes: { instagram: "https://instagram.com/", facebook: "https://facebook.com/", whatsappBusiness: "https://wa.me/" } };   // links genéricos: só para a foto
function catalogo() {
  const c = sementeCatalogo();
  Object.assign(c["pol-0001"].dados, { nome: "Poliéster Preto Fosco", preco: 32, precoKg5: 36, ficha: "", fds: "" });
  Object.assign(c["pol-0002"].dados, { nome: "Epóxi Cinza Claro" });
  return c;
}
const dadosCotacao = async (p, peso = "120") => {
  const se = async (sel, v) => { if (await p.isVisible(sel)) await p.fill(sel, v); };
  await p.fill("#cot-cep", "14801000"); await p.waitForTimeout(500); await se("#cot-numero", "500");
  await se("#cot-doc", "11222333000181"); await se("#cot-tel", "16999990000"); await se("#cot-nome", "Metalúrgica Exemplo Ltda");
  await se("#cot-desc", "Pintura de 200 portões de aço, cor preta, acabamento fosco."); await se("#cot-peso", peso);
};
/* cada item: chave, página, tamanho da tela, recursos/config de cada lado, preparo e recorte */
const CENAS = [
  { chave: "floating_social_enabled", pagina: "index.html", w: 390, h: 760, rec: "floating_social_enabled", recorte: { x: 150, y: 420, width: 240, height: 340 }, fixo: true,
    preparo: async (p, lado) => { if (lado) { const b = await p.$(".rf-alternar"); if (b) await b.click(); await p.waitForTimeout(500); } } },
  { chave: "new_home_banners_enabled", pagina: "index.html", w: 1280, h: 900, rec: "new_home_banners_enabled", alvo: "#novidades", depoisDe: "#novidades" },
  { chave: "freight_estimate_enabled", pagina: "produto.html?id=pol-0001", w: 1280, h: 900, rec: "freight_estimate_enabled", alvo: ".pp-info, .pp-detalhes, .pp-col-info", margem: 10 },
  { chave: "product_docs_enabled", pagina: "produto.html?id=pol-0001", w: 1280, h: 900, rec: "product_docs_enabled", alvo: ".pp-docs", depoisDe: ".pp-docs", antesDe: ".pp-docs", margem: 120 },
  { chave: "packaging_variants_enabled", pagina: "produto.html?id=pol-0001", w: 1280, h: 900, rec: "packaging_variants_enabled", alvo: "#pp-preco", ate: ".pp-emb", margem: 18,
    preparo: async (p) => { await p.click('[data-emb="Caixa 5 kg"]'); await p.waitForTimeout(400); } },
  { chave: "b2b_quote_enabled", pagina: "produto.html?id=pol-0001", w: 1280, h: 900, rec: "b2b_quote_enabled", alvo: ".pp-acoes", margem: 40 },
  { chave: "b2b_whatsapp_shortcut_enabled", pagina: "cotacao.html", w: 1100, h: 900, rec: "b2b_whatsapp_shortcut_enabled", alvo: ".cot-ok-faixa", margem: 8,
    preparo: async (p) => { await dadosCotacao(p); await p.click("#cot-enviar"); await p.waitForSelector(".cot-ok-faixa", { timeout: 8000 }); await p.waitForTimeout(400); } },
  { chave: "cot-volumetria", pagina: "cotacao.html", w: 1100, h: 900, cfg: [{}, { volumetria: { modo: "opcional", fator: 300 } }], alvo: '[data-campo-cot="prazo_desejado"]', ate: '[data-campo-cot="peso"], #cot-vol', margem: 14,
    preparo: async (p) => { await dadosCotacao(p, "300"); const c = await p.$('#cot-vol-linhas [data-v="c"]'); if (c) { await p.fill('#cot-vol-linhas [data-v="qtd"]', "2"); await c.fill("100"); await p.fill('#cot-vol-linhas [data-v="l"]', "100"); await p.fill('#cot-vol-linhas [data-v="a"]', "50"); await p.waitForTimeout(300); } } },
  { chave: "cot-veiculos", pagina: "cotacao.html", w: 1100, h: 900, cfg: [{}, { veiculos: { ativo: true, lista: [{ nome: "Montana", pesoMax: 750 }, { nome: "Caminhão", pesoMax: 5000 }] } }], alvo: '[data-campo-cot="prazo_desejado"]', ate: '[data-campo-cot="peso"], [data-campo-cot="veiculo"]', margem: 14,
    preparo: async (p) => { await dadosCotacao(p, "300"); await p.waitForTimeout(300); } },
  { chave: "cot-intervalo", pagina: "cotacao.html", w: 1100, h: 900, cfg: [{ intervaloMin: 0 }, { intervaloMin: 2 }], alvo: "#cot-enviar", margem: 30,
    preparo: async (p, lado) => { if (lado) await p.evaluate(() => localStorage.setItem("policoating_cotacao_ultima", String(Date.now() - 23000))); await p.reload(); await p.waitForTimeout(1200); } }
];
const pedidos = process.argv.slice(2);
const nav = await chromium.launch();
async function foto(cena, lado, recorte) {
  const rec = BASE_REC.filter((k) => k !== cena.rec).concat(cena.rec && lado ? [cena.rec] : []);
  const cfg = Object.assign({}, CONFIG, { cotacao: cena.cfg ? cena.cfg[lado] : {} });
  const ctx = await contextoDemo(nav, { viewport: { width: cena.w, height: cena.h }, deviceScaleFactor: 1.5, reducedMotion: "reduce" });
  await ctx.route("https://viacep.com.br/**", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify(VIACEP) }));
  await ctx.addInitScript(([c, rec, cfg]) => {
    if (localStorage.getItem("__s")) return; localStorage.setItem("__s", "1");
    localStorage.setItem("policoating_demo_catalogo", JSON.stringify(c));
    localStorage.setItem("policoating_demo_recursos", JSON.stringify(Object.fromEntries(rec.map((k) => [k, { chave: k, ligado: true, implementado: true, alvos: {} }]))));
    localStorage.setItem("policoating_demo_config", JSON.stringify(cfg));
  }, [catalogo(), rec, cfg]);
  const p = await ctx.newPage();
  await p.goto(`${BASE}/${cena.pagina}`); await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelectorAll(".revelar").forEach((e) => e.classList.add("visivel")));
  // tira da foto o que não é do assunto (assistente, voltar ao topo, convite do app)
  if (cena.chave !== "floating_social_enabled") await p.addStyleTag({ content: ".assist-botao,.assist-convite,.voltar-topo,.convite-app,.redes-flutuantes,.whats-flutuante{display:none!important}" });
  if (cena.preparo) await cena.preparo(p, lado);
  // lado desligado: se o elemento do recorte existe também aqui, recorta o próprio conteúdo (sem "sobra" de outra parte da página)
  if (recorte && !cena.fixo && !lado && await p.$(cena.alvo)) recorte = null;
  if (!recorte) {
    recorte = await p.evaluate(({ alvo, ate, margem }) => {
      const a = document.querySelector(alvo); if (!a) return null;
      const r = a.getBoundingClientRect(), vis = ate ? [...document.querySelectorAll(ate)].map((e) => e.getBoundingClientRect()).filter((x) => x.height > 0) : [], b = vis.length ? { top: Math.min(...vis.map((x) => x.top)), bottom: Math.max(...vis.map((x) => x.bottom)), left: Math.min(...vis.map((x) => x.left)), right: Math.max(...vis.map((x) => x.right)) } : r, m = margem || 16;
      const top = Math.min(r.top, b.top) + scrollY - m, bot = Math.max(r.bottom, b.bottom) + scrollY + m;
      const left = Math.max(Math.min(r.left, b.left) - m, 0), right = Math.min(Math.max(r.right, b.right) + m, document.documentElement.clientWidth);
      return { x: Math.round(left), y: Math.round(Math.max(top, 0)), width: Math.round(right - left), height: Math.round(bot - Math.max(top, 0)) };
    }, { alvo: cena.alvo, ate: cena.ate || null, margem: cena.margem || 16 });
    if (!recorte) { await ctx.close(); throw new Error(`${cena.chave}: não achei ${cena.alvo}`); }
  }
  const arq = `${DIR}${cena.chave}-${lado ? "ligado" : "desligado"}.jpg`;
  if (cena.fixo) await p.screenshot({ path: arq, clip: recorte, type: "jpeg", quality: 82 });
  else await p.screenshot({ path: arq, clip: recorte, fullPage: true, type: "jpeg", quality: 82 });
  await ctx.close();
  return recorte;
}
for (const cena of CENAS) {
  if (pedidos.length && !pedidos.includes(cena.chave)) continue;
  try {
    const r = cena.recorte || await foto(cena, 1, null);   // o recorte sai do lado ligado (onde o elemento existe)
    if (cena.recorte) await foto(cena, 1, r);
    await foto(cena, 0, r);
    console.log("ok", cena.chave, JSON.stringify(r));
  } catch (e) { console.log("ERRO", cena.chave, e.message.split("\n")[0]); }
}
await nav.close();
