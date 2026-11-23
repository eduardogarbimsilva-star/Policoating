// E06/E07/E08 — cotação com número: página, seletor de produtos, CEP com informações, comprovante,
// acompanhamento, histórico do cliente e painel da equipe. Modo demonstração (sem Supabase).
// Uso: python3 testes/servidor.py 8765 &  depois  node testes/e06_e08.mjs
import { chromium, BASE, contextoDemo, sementeCatalogo, logarDemo, relatorio, PERFIL_PF } from "./comum.mjs";

const R = relatorio();
const nav = await chromium.launch();
const espera = (p, ms) => p.waitForTimeout(ms);
const REC = (lista) => Object.fromEntries(lista.map((k) => [k, { chave: k, ligado: true, implementado: true, alvos: {} }]));
const CEPS = {
  "15990000": { logradouro: "", bairro: "", localidade: "Matão", uf: "SP", estado: "São Paulo", regiao: "Sudeste", ddd: "16", ibge: "3529302" },
  outro: { logradouro: "Avenida Brasil", bairro: "Centro", localidade: "Araraquara", uf: "SP", estado: "São Paulo", regiao: "Sudeste", ddd: "16", ibge: "3503208" }
};

async function site({ recursos, viewport, login, admin } = {}) {
  const ctx = await contextoDemo(nav, viewport ? { viewport } : {});
  await ctx.route("https://viacep.com.br/**", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify(/15990000/.test(r.request().url()) ? CEPS["15990000"] : CEPS.outro) }));
  await ctx.addInitScript(([c, rec, adm]) => {
    if (localStorage.getItem("__semente")) return; localStorage.setItem("__semente", "1");
    localStorage.setItem("policoating_demo_catalogo", JSON.stringify(c));
    if (rec) localStorage.setItem("policoating_demo_recursos", JSON.stringify(rec));
    if (adm) localStorage.setItem("policoating_demo_equipe", JSON.stringify([{ email: "dono@x.com", papel: "admin" }]));
  }, [sementeCatalogo(), recursos || null, !!admin]);
  if (login) await logarDemo(ctx, login.email, login.perfil);
  const p = await ctx.newPage(); const erros = []; p.on("pageerror", (e) => erros.push(e.message));
  return { ctx, p, erros };
}

{ // desligado: sem link no menu, página avisa e oferece WhatsApp; produto mantém "Pedir orçamento"
  const { ctx, p, erros } = await site();
  await p.goto(`${BASE}/cotacao.html`); await espera(p, 700);
  const info = await p.evaluate(() => ({ off: !document.querySelector("#cot-off").hidden, app: !document.querySelector("#cot-app").hidden, menu: !!document.querySelector("[data-menu-cotacao]") }));
  R.add("V31-E06-20", "Desligado: página avisa, sem formulário e sem link no menu", info.off && !info.app && !info.menu && !erros.length, JSON.stringify(info));
  await p.goto(`${BASE}/produtos.html#produto=pol-0001`); await espera(p, 900);
  R.add("V31-E06-21", "Desligado: produto não mostra 'Solicitar cotação' e mantém 'Pedir orçamento'", !(await p.$('[data-extra="cotacao"]')) && !!(await p.$('[data-extra="orcamento"]')));
  await ctx.close();
}

let protocolo = "";
{ // ligado: do produto até o comprovante
  const { ctx, p, erros } = await site({ recursos: REC(["b2b_quote_enabled", "b2b_whatsapp_shortcut_enabled"]) });
  await p.goto(`${BASE}/produtos.html#produto=pol-0001`); await espera(p, 900);
  R.add("V31-E06-22", "Ligado: link 'Cotação' no menu", !!(await p.$('.menu [data-menu-cotacao] a[href="cotacao"]')));
  await p.fill("#modal-qtd", "4"); await p.dispatchEvent("#modal-qtd", "input");
  await p.click('[data-extra="cotacao"]'); await p.waitForURL(/cotacao/); await espera(p, 800);
  const item = await p.evaluate(() => { const li = document.querySelector(".cot-item"); return li && { nome: li.querySelector("strong").textContent, qtd: li.querySelector("[data-campo=qtd]").value, peso: document.querySelector("#cot-peso").value, vol: document.querySelector("#cot-r-volumes").textContent }; });
  R.add("V31-E06-23", "Botão do produto leva o item (4 caixas de 25 kg): peso 100 kg e 4 volumes", item && /POL-0001/.test(item.nome) && item.qtd === "4" && item.peso === "100" && item.vol === "4 caixas", JSON.stringify(item));
  // seletor próprio (sem a lista preta do navegador)
  await p.click("#cot-busca"); await espera(p, 200);
  const sel = await p.evaluate(() => ({ aberto: !document.querySelector(".sel-painel").hidden, n: document.querySelectorAll(".sel-lista [role=option]").length, filtros: document.querySelectorAll(".sel-filtros button").length, list: document.querySelector("#cot-busca").hasAttribute("list") }));
  R.add("V31-E06-31", "Seletor de produtos abre com foto/cor, filtro por classe e sem a lista nativa", sel.aberto && sel.n === 2 && sel.filtros === 3 && !sel.list, JSON.stringify(sel));
  await p.fill("#cot-busca", "epoxi"); await espera(p, 150);
  R.add("V31-E06-32", "Busca sem acento acha 'Epóxi'", (await p.$$(".sel-lista [role=option]")).length === 1);
  await p.keyboard.press("Enter"); await espera(p, 250);
  R.add("V31-E06-24", "Enter adiciona o produto à lista", (await p.$$(".cot-item")).length === 2);
  await p.click('.cot-item[data-n="1"] [data-emb="Caixa 5 kg"]'); await espera(p, 100);
  await p.click('.cot-item[data-n="1"] [data-mais="1"]'); await espera(p, 150);
  R.add("V31-E06-33", "Embalagem e +/− ajustam quantidade e peso (25 kg vira 5 × 5 kg, + 1 = 6 caixas; total 130 kg)", (await p.textContent('.cot-item[data-n="1"] .cot-item-kg b')) === "30 kg" && (await p.textContent("#cot-r-peso")) === "130 kg");
  // validações e CEP
  await p.click("#cot-enviar"); await espera(p, 200);
  R.add("V31-E06-25", "Sem CEP: não envia e explica", /CEP/i.test(await p.textContent("#cot-erro")));
  await p.fill("#cot-cep", "14801000"); await espera(p, 500);
  const end = await p.evaluate(() => ({ rua: document.querySelector("#cot-rua").value, info: document.querySelector("#cot-cep-info").textContent.replace(/\s+/g, " "), destino: document.querySelector("#cot-rota-destino").textContent, foco: document.activeElement.id }));
  R.add("V31-E06-26", "CEP mostra cidade, estado, região, DDD e IBGE, preenche a rua; rota Matão → destino",
    end.rua === "Avenida Brasil" && /Araraquara\/SP/.test(end.info) && /Região Sudeste/.test(end.info) && /DDD\s*16/.test(end.info) && /IBGE\s*3503208/.test(end.info) && end.destino === "Araraquara/SP" && end.foco === "cot-numero", JSON.stringify(end));
  await p.fill("#cot-numero", "500");
  await p.click('.cot-chips input[value="industrial"]', { force: true }); await p.selectOption("#cot-descarga", "empilhadeira"); await p.fill("#cot-ref", "Portão azul");
  await p.fill("#cot-doc", "11222333000180"); await p.fill("#cot-tel", "16999990000"); await p.fill("#cot-nome", "Metalúrgica Teste Ltda");
  R.add("V31-E06-34", "Botão diz 'Cotar frete e produtos' e o e-mail aparece como opcional na mesma linha", /Cotar frete e produtos/.test(await p.textContent("#cot-enviar")) && await p.evaluate(() => { const l = document.querySelector("#cot-email").closest("label"), o = l.querySelector(".cot-opc"); return !!o && Math.abs(o.getBoundingClientRect().top - l.getBoundingClientRect().top) < 8; }));
  await p.click("#cot-enviar"); await espera(p, 200);
  R.add("V31-E06-27", "CNPJ com dígito errado é recusado", /CPF ou CNPJ/.test(await p.textContent("#cot-erro")));
  await p.fill("#cot-doc", "11222333000181");
  await p.fill("#cot-desc", "curta"); await p.click("#cot-enviar"); await espera(p, 200);
  R.add("V31-E06-28", "Descrição curta: pede mais detalhes", /detalhes/.test(await p.textContent("#cot-erro")));
  await p.fill("#cot-desc", "Pintura de 200 portões de aço, cor preta, acabamento brilhante. Prazo de 15 dias.");
  const prog = await p.$$eval("#cot-progresso li.feito", (l) => l.length);
  R.add("V31-E06-35", "As 4 etapas ficam marcadas como completas", prog === 4, String(prog));
  await p.click("#cot-enviar"); await espera(p, 700);
  const ok = await p.evaluate(() => {
    const b = document.querySelector("#cot-sucesso"), t = b.textContent.replace(/\s+/g, " ");
    return { cod: (b.querySelector(".cot-comp-num strong") || {}).textContent, whats: !!b.querySelector(".cot-ok-faixa .btn-whats"), form: document.querySelector("#cot-form").hidden,
      tabela: b.querySelectorAll(".cot-tabela tbody tr").length, entrega: /Indústria \/ galpão/.test(t) && /empilhadeira/.test(t) && /Portão azul/.test(t),
      kpis: b.querySelectorAll(".cot-comp-kpis > div").length, imprimir: !!b.querySelector("[data-imprimir]"), validade: /Válida até/.test(t), vol: /10 caixas/.test(t) };
  });
  protocolo = ok && ok.cod;
  R.add("V31-E06-29", "Número COT-XXXX-XXXX-XX junto da cotação completa (carga, volumes, entrega, frete, validade, imprimir) + WhatsApp",
    ok && /^COT-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{2}$/.test(ok.cod) && ok.whats && ok.form && ok.tabela === 2 && ok.entrega && ok.kpis === 4 && ok.imprimir && ok.validade && ok.vol, JSON.stringify(ok));
  const lista = await p.evaluate(() => JSON.parse(localStorage.getItem("policoating_cotacao_itens") || "[]").length);
  R.add("V31-E06-30", "Depois de cotar, a lista de itens é esvaziada", lista === 0);
  await p.click('[data-cot-aba="minhas"]'); await espera(p, 400);
  const minhas = await p.textContent("#cot-minhas");
  R.add("V31-E07-01", "'Minhas cotações' mostra o número, status e validade", minhas.includes(protocolo) && /Recebida/.test(minhas) && /faltam 7 dias/.test(minhas));
  await p.click('[data-cot-aba="consultar"]');
  await p.fill("#cot-codigo", protocolo.toLowerCase().replace(/-/g, "")); await p.click("#cot-consulta button"); await espera(p, 300);
  R.add("V31-E07-02", "Acompanhar pelo número (aceita minúsculas e sem traços)", (await p.textContent("#cot-consulta-res")).includes(protocolo));
  await p.fill("#cot-codigo", "COT-ZZZZ-ZZZZ-ZZ"); await p.click("#cot-consulta button"); await espera(p, 300);
  R.add("V31-E07-03", "Número inexistente: mensagem clara", /Não encontramos/.test(await p.textContent("#cot-consulta-res")));
  R.add("V31-E07-04", "Sem erros de JavaScript no fluxo", !erros.length, erros.join(" | "));
  await p.setViewportSize({ width: 390, height: 844 }); await p.click('[data-cot-aba="nova"]'); await espera(p, 200);
  await p.click("[data-nova]"); await espera(p, 300); await p.click("#cot-busca"); await espera(p, 200);
  R.add("V31-E07-05", "Celular (390 px): página e seletor sem rolagem lateral", await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  // painel da equipe
  await ctx.addInitScript(() => localStorage.setItem("policoating_demo_equipe", JSON.stringify([{ email: "dono@x.com", papel: "admin" }])));
  await logarDemo(ctx, "dono@x.com", null);
  const a = await ctx.newPage(); const errosA = []; a.on("pageerror", (e) => errosA.push(e.message));
  await a.setViewportSize({ width: 1280, height: 900 });
  await a.goto(`${BASE}/admin.html`); await espera(a, 1200);
  if (await a.$('.admin-abas [data-aba="cotacoes"]')) {
    await a.click('.admin-abas [data-aba="cotacoes"]'); await espera(a, 500);
    const linha = await a.textContent("#cot-adm-lista");
    R.add("V31-E08-01", "Painel: aba Cotações lista o número e o cliente", linha.includes(protocolo) && linha.includes("Metalúrgica Teste"), linha.slice(0, 120));
    await a.fill("#cot-adm-busca", protocolo.slice(4, 8)); await espera(a, 300);
    R.add("V31-E08-02", "Busca por parte do número encontra", (await a.$$(".adm-cot")).length === 1);
    await a.click(".adm-cot summary"); await espera(a, 300);
    R.add("V31-E08-06", "Painel mostra os detalhes da entrega", /Indústria \/ galpão/.test(await a.textContent(".adm-cot")) && /Portão azul/.test(await a.textContent(".adm-cot")));
    await a.selectOption(".adm-cot select[name=status]", "proposta_enviada");
    await a.fill(".adm-cot input[name=valor]", "3.250,50");
    await a.fill(".adm-cot textarea[name=resposta]", "Proposta: 100 kg a R$ 30/kg + frete.");
    await a.click(".adm-cot [data-resp] button"); await espera(a, 600);
    const ev = await a.textContent(".adm-cot [data-eventos]");
    R.add("V31-E08-03", "Equipe responde (status, valor, texto) e o histórico registra", /Proposta enviada/.test(ev) && /dono@x.com/.test(ev), ev.slice(0, 120));
    await p.click('[data-cot-aba="consultar"]'); await p.fill("#cot-codigo", protocolo); await p.click("#cot-consulta button"); await espera(p, 300);
    const res = await p.textContent("#cot-consulta-res");
    R.add("V31-E08-04", "Cliente acompanha e vê a proposta (R$ 3.250,50)", /Proposta enviada/.test(res) && /3\.250,50/.test(res), res.slice(0, 160));
    // seletor também no painel (exceções por produto)
    await a.click('.admin-abas [data-aba="recursos"]'); await espera(a, 600);
    R.add("V31-E08-07", "Painel: exceções por produto usam o seletor novo (sem lista nativa)", await a.evaluate(() => !document.querySelector("datalist#rec-prods") && !!document.querySelector("#recursos-lista .sel-caixa [data-add-prod]")));
    R.add("V31-E08-05", "Painel sem erros de JavaScript", !errosA.length, errosA.join(" | "));
  } else R.add("V31-E08-01", "Painel: aba Cotações", false, "aba não encontrada");
  await ctx.close();
}

{ // cliente logado: dados vêm da conta e histórico em Minha conta
  const { ctx, p, erros } = await site({ recursos: REC(["b2b_quote_enabled"]), login: { email: "maria@teste.com", perfil: PERFIL_PF } });
  await p.goto(`${BASE}/cotacao.html`); await espera(p, 1100);
  const pre = await p.evaluate(() => ({ nome: document.querySelector("#cot-nome").value, doc: document.querySelector("#cot-doc").value, cidade: document.querySelector("#cot-rota-destino").textContent, email: document.querySelector("#cot-email").value, rua: document.querySelector("#cot-rua").value }));
  R.add("V31-E07-06", "Logado: nome, CPF, e-mail e endereço vêm do cadastro", pre.nome === "Maria Teste Silva" && pre.doc === "529.982.247-25" && pre.cidade === "Matão/SP" && pre.email === "maria@teste.com" && pre.rua === "Rua Teste", JSON.stringify(pre));
  await p.fill("#cot-busca", "POL-0001"); await espera(p, 150); await p.keyboard.press("Enter"); await espera(p, 200);
  await p.fill("#cot-desc", "Repintura de estrutura metálica de galpão, 300 m², cor preta.");
  await p.click("#cot-enviar"); await espera(p, 700);
  const cod = await p.textContent(".cot-comp-num strong").catch(() => "");
  await p.goto(`${BASE}/conta.html#cotacoes`); await espera(p, 1200);
  const menu = await p.evaluate(() => !document.querySelector("#menu-cotacoes").hidden);
  const txt = await p.textContent("#lista-cotacoes").catch(() => "");
  R.add("V31-E07-07", "Minha conta → Minhas cotações mostra a cotação do cliente", menu && cod && txt.includes(cod), `${cod} ${txt.slice(0, 100)}`);
  R.add("V31-E07-08", "Sem erros de JavaScript", !erros.length, erros.join(" | "));
  await ctx.close();
}

await nav.close();
process.exitCode = R.imprimir() ? 1 : 0;
