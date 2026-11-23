// E05 — frete por CEP na tela: bloco "Calcular frete" no produto e configuração no painel.
// O servidor (Supabase e a função "frete") é imitado. A regra de cálculo é testada em testes/frete.mjs.
// Uso: python3 testes/servidor.py 8765 &  depois  node testes/e05.mjs
import { chromium, BASE, contextoDemo, sementeCatalogo, logarDemo, relatorio } from "./comum.mjs";

const R = relatorio();
const nav = await chromium.launch();
const espera = (p, ms) => p.waitForTimeout(ms);
const PRODUTOS = Object.values(sementeCatalogo()).filter((r) => r.dados.cores.length).map((r) => ({ dados: r.dados }));

/** Site "online" com Supabase imitado; respostas da função frete por CEP */
async function siteOnline({ ligado = true, alvos = {} } = {}) {
  const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { localStorage.setItem("policoating_lgpd", "true"); localStorage.setItem("policoating_cookies", JSON.stringify("essenciais")); });
  await ctx.route(/fonts\.g|pexels|jsdelivr|googletagmanager|youtube/, (r) => r.abort());
  const pedidos = [];
  await ctx.route(/supabase\.co/, async (r) => {
    const u = r.request().url(), json = (o, s = 200) => r.fulfill({ status: s, contentType: "application/json", body: JSON.stringify(o) });
    if (u.includes("/functions/v1/frete")) {
      const corpo = JSON.parse(r.request().postData()); pedidos.push(corpo);
      if (corpo.cep === "15990000") return json({ zona: "local", estimativa: true, valor: 500, cidade: "Matão", uf: "SP", peso_kg: 25, regra: "Entrega em Matão: valor fixo." });
      if (corpo.cep === "01001000") return json({ zona: "externo", estimativa: true, valor: 937.2, km: 312.4, cidade: "São Paulo", uf: "SP", peso_kg: 50, regra: "R$ 3,00 por km rodado (só ida).", pela_cidade: false });
      return json({ zona: "manual", estimativa: true, mensagem: "Não foi possível calcular automaticamente para este endereço. Solicite a cotação do frete ao vendedor.", motivo: "sem_rota_caminhao" });
    }
    if (u.includes("/rest/v1/produtos")) return json(PRODUTOS);
    if (u.includes("/rest/v1/recursos")) return json([{ chave: "freight_estimate_enabled", ligado, implementado: true, alvos }]);
    return json([]);
  });
  const p = await ctx.newPage(); const erros = []; p.on("pageerror", (e) => erros.push(e.message));
  return { ctx, p, erros, pedidos };
}
const abrir = async (p, id) => { await p.goto(`${BASE}/produtos.html`); await espera(p, 900); await p.click(`.cartao-produto[data-id="${id}"] .btn-add`); await espera(p, 500); };

{ // desligado: sem bloco
  const { ctx, p } = await siteOnline({ ligado: false });
  await abrir(p, "pol-0001");
  R.add("V31-E05-30", "Recurso desligado: produto sem 'Calcular frete'", !(await p.$("#frete-produto .frete-box")));
  await ctx.close();
}
{ // ligado: local, externo (com peso da embalagem escolhida) e manual
  const { ctx, p, erros, pedidos } = await siteOnline();
  await abrir(p, "pol-0001");
  const tem = !!(await p.$("#frete-produto .frete-box"));
  await p.fill("#frete-cep", "15990000"); await p.click("#frete-produto button[type=submit]"); await espera(p, 400);
  const local = (await p.textContent("#frete-resultado")).replace(/\s+/g, " ").trim();
  R.add("V31-E05-31", "CEP de Matão mostra R$ 500,00 com a regra", tem && /R\$\s*500,00/.test(local) && /Matão\/SP/.test(local) && /valor fixo/.test(local), local);

  await p.click('[data-emb="Caixa 5 kg"]'); await p.fill("#modal-qtd", "10"); await p.dispatchEvent("#modal-qtd", "input");
  await p.fill("#frete-cep", "01001-000"); await p.fill("#frete-num", "12"); await p.click("#frete-produto button[type=submit]"); await espera(p, 400);
  const ext = (await p.textContent("#frete-resultado")).replace(/\s+/g, " ").trim();
  const ult = pedidos[pedidos.length - 1];
  R.add("V31-E05-32", "Fora de Matão: valor, cidade e km; envia produto, embalagem e quantidade escolhidas",
    /R\$\s*937,20/.test(ext) && /312,4 km/.test(ext) && ult.itens[0].id === "pol-0001" && ult.itens[0].embalagem === "Caixa 5 kg" && ult.itens[0].qtd === 10 && ult.numero === "12" && ult.acao === "estimar", ext + " | " + JSON.stringify(ult));

  await p.fill("#frete-cep", "69900000"); await p.click("#frete-produto button[type=submit]"); await espera(p, 400);
  const man = (await p.textContent("#frete-resultado")).replace(/\s+/g, " ").trim();
  const link = await p.getAttribute("#frete-resultado a", "href").catch(() => "");
  R.add("V31-E05-33", "Sem rota: pede cotação e oferece WhatsApp com o CEP", /cotação do frete/.test(man) && /wa\.me/.test(link || "") && /69900-000/.test(decodeURIComponent(link || "")), man.slice(0, 70));

  await p.fill("#frete-cep", "1234"); await p.click("#frete-produto button[type=submit]"); await espera(p, 200);
  R.add("V31-E05-34", "CEP incompleto: aviso sem chamar o servidor", /8 números/.test(await p.textContent("#frete-resultado")) && pedidos.length === 3 && !erros.length);
  await ctx.close();
}
{ // vale só para alguns produtos
  const { ctx, p } = await siteOnline({ alvos: { padrao: "escolhidos", produtos: { "pol-0002": true } } });
  await abrir(p, "pol-0001");
  const no1 = !!(await p.$("#frete-produto .frete-box"));
  await p.keyboard.press("Escape"); await espera(p, 300);
  await p.click('.cartao-produto[data-id="pol-0002"] .btn-add'); await espera(p, 500);
  const no2 = !!(await p.$("#frete-produto .frete-box"));
  R.add("V31-E05-35", "Só os escolhidos: aparece no POL-0002 e não no POL-0001", !no1 && no2, `pol-0001=${no1} pol-0002=${no2}`);
  await ctx.close();
}
{ // painel: tarifas padrão, validação, salvar e histórico de versão
  const ctx = await contextoDemo(nav, { viewport: { width: 1280, height: 1000 } });
  await ctx.addInitScript((c) => { if (localStorage.getItem("__s")) return; localStorage.setItem("__s", "1"); localStorage.setItem("policoating_demo_catalogo", JSON.stringify(c)); localStorage.setItem("policoating_demo_equipe", JSON.stringify([{ email: "dono@x.com", papel: "admin" }])); }, sementeCatalogo());
  await logarDemo(ctx, "dono@x.com", null);
  await ctx.route("https://viacep.com.br/**", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ logradouro: "Rua Exemplo", bairro: "Centro", localidade: "Matão", uf: "SP" }) }));
  const p = await ctx.newPage(); const erros = []; p.on("pageerror", (e) => erros.push(e.message));
  p.on("dialog", (d) => d.accept(d.type() === "prompt" ? "teste E05" : undefined));
  await p.goto(`${BASE}/admin.html`); await espera(p, 1100);
  await p.click('.admin-abas [data-aba="recursos"]'); await espera(p, 700);
  const padrao = await p.evaluate(() => ["tarifa-local", "raio", "tarifa-km", "minimo"].map((k) => document.querySelector("#fc-" + k).value).join("/"));
  R.add("V31-E05-36", "Painel mostra a regra combinada: R$ 500 / 10 km / R$ 3 por km / mínimo R$ 500", padrao === "500/10/3/500", padrao);
  await p.type("#fc-cep", "15990000", { delay: 10 }); await espera(p, 400);
  const auto = await p.inputValue("#fc-logradouro");
  await p.fill("#fc-numero", "100"); await p.fill("#fc-tarifa-km", "");
  await p.click("#fc-salvar"); await espera(p, 300);
  const erroVazio = (await p.textContent("#fc-erro")).trim();
  await p.fill("#fc-tarifa-km", "3,5".replace(",", ".")); await p.click("#fc-salvar"); await espera(p, 600);
  const salvo = await p.evaluate(() => JSON.parse(localStorage.getItem("policoating_demo_frete")));
  R.add("V31-E05-37", "CEP preenche a rua; tarifa vazia é recusada; ao salvar guarda tarifas e a versão sobe",
    auto === "Rua Exemplo" && /tarifas/.test(erroVazio) && salvo.tarifa_km === 3.5 && salvo.origem_cep === "15990000" && salvo.versao === 2 && !erros.length, JSON.stringify({ auto, erroVazio, tarifa: salvo.tarifa_km, versao: salvo.versao }));
  await p.click("#fc-localizar"); await espera(p, 300);
  R.add("V31-E05-38", "Sem servidor, 'Localizar no mapa' explica o motivo (não quebra)", /servidor/.test(await p.textContent("#fc-erro")) && !erros.length);
  await ctx.close();
}

await nav.close();
process.exitCode = R.imprimir() ? 1 : 0;
