// E01 — Correções: um cenário por item da matriz V3.1 (V31-E01-01 a 08) + achados da auditoria.
// Uso: python3 testes/servidor.py 8765 &  depois  node testes/e01.mjs
import { chromium, BASE, contextoDemo, sementeCatalogo, PERFIL_PF, logarDemo, relatorio } from "./comum.mjs";

const R = relatorio();
const nav = await chromium.launch();
const espera = (p, ms) => p.waitForTimeout(ms);

// Respostas falsas do ViaCEP (o teste não depende da internet)
const CEPS = {
  "14801000": { logradouro: "Avenida Brasil", bairro: "Centro", localidade: "Araraquara", uf: "SP" },
  "15990000": { logradouro: "", bairro: "", localidade: "Matão", uf: "SP" },
  "01001000": { logradouro: "Praça da Sé", bairro: "Sé", localidade: "São Paulo", uf: "SP" }
};
async function abrirMeusDados(opcoes = {}) {
  const ctx = await contextoDemo(nav);
  await logarDemo(ctx, "cliente@teste.com", null);
  const falharUmaVez = new Set(opcoes.falharUmaVez || []);
  await ctx.route("https://viacep.com.br/**", (r) => {
    const cep = r.request().url().match(/ws\/(\d{8})/)[1];
    if (falharUmaVez.has(cep)) { falharUmaVez.delete(cep); return r.abort(); }
    r.fulfill({ contentType: "application/json", body: JSON.stringify(CEPS[cep] || { erro: true }) });
  });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/conta.html#dados`); await espera(p, 900);
  return { ctx, p };
}
const digitarCep = async (p, cep) => { await p.fill("#f-cep", ""); await p.type("#f-cep", cep, { delay: 15 }); await espera(p, 500); };

// V31-E01-01 — CPF com dígitos incorretos é recusado
{
  const { ctx, p } = await abrirMeusDados();
  await p.$eval('[name=tipo][value="pf"]', (el) => { el.checked = true; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await p.fill("#f-nome", "Maria Teste Silva");
  await p.fill("#f-cpf", "529.982.247-24");
  await p.click("#btn-salvar"); await espera(p, 300);
  const msg = (await p.textContent("#erro-dados")).trim();
  R.add("V31-E01-01", "CPF com dígito verificador errado é recusado", /CPF inválido/.test(msg), msg);
  await ctx.close();
}

// V31-E01-02 — trocar o estado depois do CEP não deixa cidade de outro estado
{
  const { ctx, p } = await abrirMeusDados();
  await digitarCep(p, "14801000");
  const antes = await p.inputValue("#f-cidade");
  await p.selectOption("#f-uf", "MG"); await espera(p, 200);
  const cidade = await p.inputValue("#f-cidade"), dica = (await p.textContent("#dica-cep")).trim();
  R.add("V31-E01-02", "Trocar o estado após o CEP limpa a cidade e avisa", antes === "Araraquara" && cidade === "" && /estado/i.test(dica), `cidade antes="${antes}" depois="${cidade}" dica="${dica}"`);
  await ctx.close();
}

// V31-E01-03a — CEP novo sem rua (CEP geral da cidade) não mantém a rua do CEP anterior
{
  const { ctx, p } = await abrirMeusDados();
  await digitarCep(p, "14801000");
  await digitarCep(p, "15990000");
  const rua = await p.inputValue("#f-rua"), cidade = await p.inputValue("#f-cidade");
  R.add("V31-E01-03", "CEP geral da cidade limpa a rua e o bairro do CEP anterior", rua === "" && cidade === "Matão", `rua="${rua}" cidade="${cidade}"`);
  await ctx.close();
}

// V31-E01-03b — se a consulta do CEP falhar, digitar o mesmo CEP de novo tenta outra vez
{
  const { ctx, p } = await abrirMeusDados({ falharUmaVez: ["01001000"] });
  await digitarCep(p, "01001000");
  const dica1 = (await p.textContent("#dica-cep")).trim();
  await digitarCep(p, "01001000");
  const rua = await p.inputValue("#f-rua");
  R.add("V31-E01-03", "Falha na consulta do CEP permite tentar de novo e preencher à mão", /manualmente/i.test(dica1) && !/failed|fetch/i.test(dica1) && rua === "Praça da Sé", `1ª: "${dica1}" | 2ª rua="${rua}"`);
  await ctx.close();
}

// V31-E01-04 — login de demonstração e saída voltam para o início deslogado
{
  const ctx = await contextoDemo(nav);
  // conta já existente (cadastro completo), ainda sem login
  await ctx.addInitScript((perfil) => {
    if (localStorage.getItem("policoating_demo_perfis")) return;
    localStorage.setItem("policoating_demo_perfis", JSON.stringify({ "maria@teste.com": Object.assign({ email: "maria@teste.com" }, perfil) }));
  }, PERFIL_PF);
  const p = await ctx.newPage();
  await p.goto(`${BASE}/conta.html`); await espera(p, 700);
  await p.fill("#acesso-email", "maria@teste.com"); await p.click("#btn-enviar-codigo"); await espera(p, 800);
  const codigo = ((await p.textContent("#codigo-demo")) || "").match(/\d{4,8}/);
  if (codigo) {
    await p.$eval("#codigo", (el, c) => { el.value = c; el.dispatchEvent(new Event("input", { bubbles: true })); }, codigo[0]);
    await p.$eval("#form-codigo", (f) => f.requestSubmit());
  }
  await espera(p, 1200);
  const logado = await p.evaluate(() => !!(window.Conta && window.Conta.usuario));
  await p.goto(`${BASE}/index.html`); await espera(p, 600);
  await p.click(".link-conta"); await espera(p, 300);
  await p.click("[data-sair]"); await p.waitForLoadState("load"); await espera(p, 700);
  const depois = await p.evaluate(() => ({ usuario: !!(window.Conta && window.Conta.usuario), texto: document.querySelector(".link-conta .texto")?.textContent.trim(), caminho: location.pathname }));
  R.add("V31-E01-04", "Entrar e sair: volta ao início e o cabeçalho mostra Entrar", logado && !depois.usuario && /Entrar/.test(depois.texto || ""), `logou=${logado} depois=${JSON.stringify(depois)}`);
  await ctx.close();
}

// V31-E01-05 — produto com dados ausentes não derruba o catálogo
{
  const ctx = await contextoDemo(nav);
  await ctx.addInitScript((c) => localStorage.setItem("policoating_demo_catalogo", JSON.stringify(c)), sementeCatalogo());
  const p = await ctx.newPage(); const erros = []; p.on("pageerror", (e) => erros.push(e.message));
  await p.goto(`${BASE}/produtos.html`); await espera(p, 900);
  const n = await p.$$eval(".cartao-produto", (l) => l.length);
  R.add("V31-E01-05", "Produto inválido é ignorado e os válidos aparecem", n === 2 && !erros.length, `${n} cartões, erros JS: ${erros.length}`);
  await ctx.close();
}

// V31-E01-06 — catálogo lento ou fora do ar mostra "carregando" e depois erro com "tentar de novo"
{
  const ctx = await nav.newContext({ viewport: { width: 1280, height: 860 } });
  await ctx.addInitScript(() => { localStorage.setItem("policoating_lgpd", "true"); localStorage.setItem("policoating_cookies", "essenciais"); });
  await ctx.route(/fonts\.g|pexels|jsdelivr|youtube|googletagmanager/, (r) => r.abort());
  let chamadas = 0;
  // (o Playwright usa a rota registrada por último primeiro: a genérica vem antes)
  await ctx.route(/supabase\.co/, (r) => r.fulfill({ status: 503, body: "{}" }));
  await ctx.route(/supabase\.co\/rest\/v1\/produtos/, async (r) => {
    chamadas++; await new Promise((ok) => setTimeout(ok, 2500));
    r.fulfill({ status: 503, contentType: "application/json", body: '{"code":"PGRST002"}' });
  });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/produtos.html`); await espera(p, 900);
  const durante = (await p.textContent("#lista-produtos")).trim();
  await espera(p, 2600);
  const depois = (await p.textContent("#lista-produtos")).trim();
  const temBotao = !!(await p.$("#lista-produtos [data-tentar-catalogo]"));
  if (temBotao) { await p.click("#lista-produtos [data-tentar-catalogo]"); await espera(p, 300); }
  R.add("V31-E01-06", "Carregamento lento mostra 'carregando'; falha mostra aviso e 'tentar de novo'",
    /Carregando/i.test(durante) && !/Nenhum produto/i.test(durante) && /não foi possível carregar/i.test(depois) && temBotao && chamadas >= 2,
    `durante="${durante.slice(0, 40)}" depois="${depois.slice(0, 50)}" botão=${temBotao} chamadas=${chamadas}`);
  await ctx.close();
}

// V31-E01-07 — títulos e legendas não ficam colados no texto da página
{
  const ctx = await contextoDemo(nav);
  const p = await ctx.newPage();
  const colados = [];
  for (const pg of ["index", "produtos", "sobre", "aplicacao", "galeria", "recursos"]) {
    await p.goto(`${BASE}/${pg}.html`); await espera(p, 300);
    const achados = await p.evaluate(() => {
      const r = [];
      document.querySelectorAll("strong, b, small, h3, h4").forEach((el) => {
        const prox = el.nextSibling, ant = el.previousSibling;
        const t = el.textContent.trim();
        if (t && prox && prox.nodeType === 3 && /^[A-Za-zÀ-ú]/.test(prox.textContent)) r.push(t + "|" + prox.textContent.trim().slice(0, 14));
        if (t && ant && ant.nodeType === 3 && /[A-Za-zÀ-ú]$/.test(ant.textContent)) r.push(ant.textContent.trim().slice(-14) + "|" + t);
      });
      return r;
    });
    achados.forEach((a) => colados.push(pg + ": " + a));
  }
  const unicos = [...new Set(colados)];
  R.add("V31-E01-07", "Nenhum título/legenda grudado no texto vizinho", unicos.length === 0, unicos.length ? `${unicos.length}: ${unicos.slice(0, 4).join(" ; ")}` : "");
  await ctx.close();
}

// V31-E01-08 — pedido pelo WhatsApp continua funcionando
{
  const ctx = await contextoDemo(nav);
  await ctx.addInitScript((c) => localStorage.setItem("policoating_demo_catalogo", JSON.stringify(c)), sementeCatalogo());
  await logarDemo(ctx, "maria@teste.com", PERFIL_PF);
  let linkWhats = "";
  await ctx.route("https://wa.me/**", (r) => { linkWhats = r.request().url(); r.fulfill({ body: "ok" }); });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/produtos.html`); await espera(p, 900);
  await p.click('.cartao-produto[data-id="pol-0001"] .btn-add'); await espera(p, 400);
  await p.click("#modal-add"); await espera(p, 400);
  await p.evaluate(() => window.ColorWeg.abrirCarrinho()); await espera(p, 300);
  await p.click("#btn-finalizar"); await espera(p, 1500);
  const msg = decodeURIComponent(linkWhats.split("text=")[1] || "");
  R.add("V31-E01-08", "Enviar pedido abre o WhatsApp com produto, cliente e endereço",
    /wa\.me\/\d+/.test(linkWhats) && /POL-0001/.test(msg) && /Maria Teste Silva/.test(msg) && /Matão\/SP/.test(msg), linkWhats ? msg.split("\n").slice(0, 2).join(" / ") : "WhatsApp não abriu");
  await ctx.close();
}

await nav.close();
process.exitCode = R.imprimir() ? 1 : 0;
