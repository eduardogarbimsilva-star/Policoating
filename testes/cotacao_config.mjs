// Cotação configurável no painel (campos, produto opcional, veículos, peso máximo), animação ao cotar e central de avisos.
// Uso: python3 testes/servidor.py 8765 &  depois  node testes/cotacao_config.mjs
import { chromium, BASE, contextoDemo, sementeCatalogo, logarDemo, relatorio } from "./comum.mjs";
const R = relatorio();
const nav = await chromium.launch();
const espera = (p, ms) => p.waitForTimeout(ms);
const REC = (l) => Object.fromEntries(l.map((k) => [k, { chave: k, ligado: true, implementado: true, alvos: {} }]));
const VIACEP = { logradouro: "Avenida Brasil", bairro: "Centro", localidade: "Araraquara", uf: "SP", estado: "São Paulo", regiao: "Sudeste", ddd: "16", ibge: "3503208" };
async function site({ cfg, admin, movimento } = {}) {
  const ctx = await contextoDemo(nav, movimento ? {} : { reducedMotion: "reduce" });
  await ctx.route("https://viacep.com.br/**", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify(VIACEP) }));
  await ctx.addInitScript(([c, rec, cfg, adm]) => {
    if (localStorage.getItem("__s")) return; localStorage.setItem("__s", "1");
    localStorage.setItem("policoating_demo_catalogo", JSON.stringify(c));
    localStorage.setItem("policoating_demo_recursos", JSON.stringify(rec));
    if (cfg) localStorage.setItem("policoating_demo_config", JSON.stringify({ whatsapp: "5516996304811", cotacao: cfg }));
    if (adm) localStorage.setItem("policoating_demo_equipe", JSON.stringify([{ email: "dono@x.com", papel: "admin" }]));
  }, [sementeCatalogo(), REC(["b2b_quote_enabled"]), cfg || null, !!admin]);
  if (admin) await logarDemo(ctx, "dono@x.com", null);
  const p = await ctx.newPage(); const erros = []; p.on("pageerror", (e) => erros.push(e.message));
  return { ctx, p, erros };
}
const dadosBasicos = async (p) => {
  const se = async (sel, v) => { if (await p.isVisible(sel)) await p.fill(sel, v); };   // pula campos ocultos pela configuração
  await p.fill("#cot-cep", "14801000"); await espera(p, 500); await se("#cot-numero", "500");
  await se("#cot-doc", "11222333000181"); await se("#cot-tel", "16999990000"); await se("#cot-nome", "Metalúrgica Teste Ltda");
  await se("#cot-desc", "Pintura de 200 portões de aço, cor preta, acabamento brilhante.");
};

{ // padrão: produto opcional → cotação só de frete com peso
  const { ctx, p, erros } = await site();
  await p.goto(`${BASE}/cotacao.html`); await espera(p, 900);
  R.add("CFG-01", "Produto opcional por padrão: etiqueta 'opcional' e aviso de que cota só o frete", !(await p.$eval("#cot-prod-opc", (e) => e.hidden)) && /só o frete/.test(await p.textContent("#cot-itens")));
  await dadosBasicos(p);
  await p.click("#cot-enviar"); await espera(p, 300);
  R.add("CFG-02", "Sem produtos e sem peso: pede o peso total", /peso/i.test(await p.textContent("#cot-erro")));
  await p.fill("#cot-peso", "120"); await p.click("#cot-enviar"); await espera(p, 800);
  R.add("CFG-03", "Cotação só de frete gerada (sem produtos, 120 kg)", /COT-/.test(await p.textContent("#cot-sucesso").catch(() => "")) && /120 kg/.test(await p.textContent("#cot-sucesso")));
  R.add("CFG-04", "Sem erros de JavaScript", !erros.length, erros.join(" | "));
  await ctx.close();
}
{ // configuração: nome oculto, e-mail obrigatório, produto obrigatório, veículos e peso máximo
  const cfg = { campos: { nome: "oculto", email: "obrigatorio", produtos: "obrigatorio", horario: "obrigatorio" }, veiculos: { ativo: true, lista: [{ nome: "Carro", pesoMax: 50 }, { nome: "Caminhão", pesoMax: 200 }] }, pesoMaximo: { ativo: true, kg: 300 } };
  const { ctx, p, erros } = await site({ cfg });
  await p.goto(`${BASE}/cotacao.html`); await espera(p, 900);
  const vis = await p.evaluate(() => ({ nome: !document.querySelector('[data-campo-cot="nome"]').hidden, emailOpc: !document.querySelector('[data-campo-cot="email"] .cot-opc').hidden, veic: !document.querySelector('[data-campo-cot="veiculo"]').hidden, horario: document.querySelector("#cot-horario option[data-vazio]").textContent }));
  R.add("CFG-05", "Config aplicada: nome oculto, e-mail sem 'opcional', veículo visível, horário obrigatório (Selecione…)", !vis.nome && !vis.emailOpc && vis.veic && vis.horario === "Selecione…", JSON.stringify(vis));
  await dadosBasicos(p);
  await p.click("#cot-enviar"); await espera(p, 200);
  R.add("CFG-06", "Produto obrigatório: sem produto não envia", /produto/i.test(await p.textContent("#cot-erro")));
  await p.fill("#cot-busca", "POL-0001"); await espera(p, 150); await p.keyboard.press("Enter"); await espera(p, 300);
  const v1 = await p.evaluate(() => ({ sel: document.querySelector("#cot-veiculo").value, carro: document.querySelector('#cot-veiculo option[value="Carro"]').disabled, dica: document.querySelector("#cot-veiculo-dica").textContent }));
  R.add("CFG-07", "1 caixa de 25 kg: sugere Carro (até 50 kg)", v1.sel === "Carro" && !v1.carro && /Carro/.test(v1.dica), JSON.stringify(v1));
  await p.fill('.cot-item [data-campo="qtd"]', "4"); await p.dispatchEvent('.cot-item [data-campo="qtd"]', "change"); await espera(p, 300);
  const v2 = await p.evaluate(() => ({ sel: document.querySelector("#cot-veiculo").value, carro: document.querySelector('#cot-veiculo option[value="Carro"]').disabled }));
  R.add("CFG-08", "4 caixas (100 kg): Carro fica bloqueado e sugere Caminhão", v2.sel === "Caminhão" && v2.carro, JSON.stringify(v2));
  await p.click("#cot-enviar"); await espera(p, 200);
  R.add("CFG-10", "Horário obrigatório pela config: pede o horário", /horário/i.test(await p.textContent("#cot-erro")));
  await p.selectOption("#cot-horario", "manha");
  await p.click("#cot-enviar"); await espera(p, 200);
  R.add("CFG-11", "E-mail obrigatório pela config: pede o e-mail", /e-mail/i.test(await p.textContent("#cot-erro")));
  await p.fill("#cot-email", "compras@teste.com.br");
  await p.fill("#cot-peso", "350"); await p.dispatchEvent("#cot-peso", "input"); await espera(p, 200);
  await p.click("#cot-enviar"); await espera(p, 200);
  R.add("CFG-09", "Peso máximo (300 kg): 350 kg é recusado", /máximo|veículo/i.test(await p.textContent("#cot-erro")), await p.textContent("#cot-erro"));
  await p.fill("#cot-peso", "100"); await p.dispatchEvent("#cot-peso", "input"); await espera(p, 200);
  await p.click("#cot-enviar"); await espera(p, 800);
  const ok = await p.textContent("#cot-sucesso").catch(() => "");
  R.add("CFG-12", "Cotação gerada com o veículo no comprovante", /COT-/.test(ok) && /Caminhão \(até 200 kg\)/.test(ok), ok.slice(0, 200));
  R.add("CFG-13", "Sem erros de JavaScript", !erros.length, erros.join(" | "));
  await ctx.close();
}
{ // painel: o administrador muda a configuração e o site obedece
  const { ctx, p, erros } = await site({ admin: true });
  await p.goto(`${BASE}/admin.html`); await espera(p, 1200);
  await p.click('.admin-abas [data-aba="cotacoes"]'); await espera(p, 400);
  await p.click("#cot-cfg > summary"); await espera(p, 600);
  await p.click('#cot-cfg-campos [data-campo="documento"][data-modo="oculto"]');
  await p.click('#cot-cfg-campos [data-campo="produtos"][data-modo="oculto"]');
  await p.check("#cot-cfg-veic-ativo"); await p.fill('#cot-cfg-veiculos [data-v="nome"]', "Van"); await p.fill('#cot-cfg-veiculos [data-v="pesoMax"]', "800");
  await p.click("#cot-cfg-salvar"); await espera(p, 600);
  R.add("CFG-14", "Painel salva a configuração sem erro", !(await p.textContent("#cot-cfg-erro")));
  await p.goto(`${BASE}/cotacao.html`); await espera(p, 900);
  const vis = await p.evaluate(() => ({ doc: !document.querySelector('[data-campo-cot="documento"]').hidden, prod: !document.querySelector("#cot-e-produtos").hidden, van: !!document.querySelector('#cot-veiculo option[value="Van"]'), etapas: [...document.querySelectorAll("#cot-progresso li:not([hidden])")].length }));
  R.add("CFG-15", "Site obedece: CPF/CNPJ e Produtos ocultos, veículo Van, 3 etapas", !vis.doc && !vis.prod && vis.van && vis.etapas === 3, JSON.stringify(vis));
  R.add("CFG-16", "Sem erros de JavaScript", !erros.length, erros.join(" | "));
  await ctx.close();
}
{ // animação ao cotar (com movimento): aparece e fica pelo menos 6 s
  const { ctx, p } = await site({ movimento: true });
  await p.goto(`${BASE}/cotacao.html`); await espera(p, 900);
  await dadosBasicos(p); await p.fill("#cot-peso", "50");
  const t0 = Date.now(); await p.click("#cot-enviar"); await espera(p, 400);
  const cena = await p.evaluate(() => { const t = document.querySelector(".ca-tela"); return t && (t.querySelector(".ca-caminhao") ? "caminhão" : t.querySelector(".ca-aviao") ? "avião" : "?"); });
  await p.waitForSelector(".cot-comp-num", { timeout: 12000 });
  const dur = Date.now() - t0;
  R.add("CFG-17", "Animação aparece ao cotar (caminhão ou avião) e libera depois de ~6 s", !!cena && dur >= 5800 && !(await p.$(".ca-tela")), `${cena}, ${dur} ms`);
  await ctx.close();
}
{ // avisos: muda a situação da cotação → aparece no sino
  const { ctx, p, erros } = await site();
  await p.goto(`${BASE}/cotacao.html`); await espera(p, 900);
  await dadosBasicos(p); await p.fill("#cot-peso", "50"); await p.click("#cot-enviar"); await espera(p, 900);
  await p.goto(`${BASE}/index.html`); await espera(p, 2200);   // primeira conferência: só memoriza
  await p.evaluate(() => { const k = "policoating_demo_cotacoes"; const v = JSON.parse(localStorage.getItem(k)); v[0].status = "proposta_enviada"; v[0].valor_proposta = 1234.5; localStorage.setItem(k, JSON.stringify(v)); });
  await p.evaluate(() => window.Avisos.conferir()); await espera(p, 800);
  const sino = await p.evaluate(() => ({ visivel: !document.querySelector(".btn-avisos").hidden, cont: document.querySelector(".avisos-cont").textContent }));
  await p.click(".btn-avisos"); await espera(p, 200);
  const txt = await p.textContent(".avisos-painel");
  R.add("AV-01", "Sino mostra 1 aviso: proposta enviada com o valor", sino.visivel && sino.cont === "1" && /Proposta enviada: R\$\s?1\.234,50/.test(txt), JSON.stringify(sino) + " " + txt.slice(0, 120));
  await p.click("[data-ler-todos]"); await espera(p, 200);
  R.add("AV-02", "Marcar como lidos zera o contador", await p.$eval(".avisos-cont", (e) => e.hidden));
  R.add("AV-03", "Sem erros de JavaScript", !erros.length, erros.join(" | "));
  await ctx.close();
}
await nav.close();
process.exitCode = R.imprimir() ? 1 : 0;
