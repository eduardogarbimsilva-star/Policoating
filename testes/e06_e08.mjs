// E06/E07/E08 — cotação com código: página, botão no produto, consulta, histórico do cliente e painel da equipe.
// Modo demonstração (sem Supabase). Uso: python3 testes/servidor.py 8765 &  depois  node testes/e06_e08.mjs
import { chromium, BASE, contextoDemo, sementeCatalogo, logarDemo, relatorio, PERFIL_PF } from "./comum.mjs";

const R = relatorio();
const nav = await chromium.launch();
const espera = (p, ms) => p.waitForTimeout(ms);
const REC = (lista) => Object.fromEntries(lista.map((k) => [k, { chave: k, ligado: true, implementado: true, alvos: {} }]));

async function site({ recursos, viewport, login, admin } = {}) {
  const ctx = await contextoDemo(nav, viewport ? { viewport } : {});
  await ctx.route("https://viacep.com.br/**", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ logradouro: "Avenida Brasil", bairro: "Centro", localidade: "Araraquara", uf: "SP" }) }));
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
{ // ligado: do produto até o código
  const { ctx, p, erros } = await site({ recursos: REC(["b2b_quote_enabled", "b2b_whatsapp_shortcut_enabled"]) });
  await p.goto(`${BASE}/produtos.html#produto=pol-0001`); await espera(p, 900);
  R.add("V31-E06-22", "Ligado: link 'Cotação' no menu", !!(await p.$('.menu [data-menu-cotacao] a[href="cotacao"]')));
  await p.fill("#modal-qtd", "4"); await p.dispatchEvent("#modal-qtd", "input");
  await p.click('[data-extra="cotacao"]'); await p.waitForURL(/cotacao/); await espera(p, 800);
  const item = await p.evaluate(() => { const li = document.querySelector(".cot-item"); return li && { nome: li.querySelector("strong").textContent, qtd: li.querySelector("[data-campo=qtd]").value, peso: document.querySelector("#cot-peso").value }; });
  R.add("V31-E06-23", "Botão do produto leva o item (4 caixas de 25 kg) e calcula o peso total 100 kg", item && /POL-0001/.test(item.nome) && item.qtd === "4" && item.peso === "100", JSON.stringify(item));
  // adiciona outro produto pela busca
  await p.fill("#cot-busca", "POL-0002 — Epóxi Teste"); await p.click("#cot-add"); await espera(p, 200);
  R.add("V31-E06-24", "Busca adiciona outro produto à lista", (await p.$$(".cot-item")).length === 2);
  // validações
  await p.click("#cot-enviar"); await espera(p, 200);
  R.add("V31-E06-25", "Sem nome: não envia e explica", /nome/i.test(await p.textContent("#cot-erro")));
  await p.fill("#cot-nome", "Metalúrgica Teste Ltda");
  await p.fill("#cot-doc", "11222333000180"); await p.fill("#cot-tel", "16999990000");
  await p.fill("#cot-cep", "14801000"); await espera(p, 500);
  const end = await p.evaluate(() => ({ rua: document.querySelector("#cot-rua").value, cidade: document.querySelector("#cot-cidade").value, foco: document.activeElement.id }));
  R.add("V31-E06-26", "CEP preenche rua, bairro e cidade/UF", end.rua === "Avenida Brasil" && end.cidade === "Araraquara/SP" && end.foco === "cot-numero", JSON.stringify(end));
  await p.fill("#cot-numero", "500");
  await p.click("#cot-enviar"); await espera(p, 200);
  R.add("V31-E06-27", "CNPJ com dígito errado é recusado", /CPF ou CNPJ/.test(await p.textContent("#cot-erro")));
  await p.fill("#cot-doc", "11222333000181");
  await p.fill("#cot-desc", "curta"); await p.click("#cot-enviar"); await espera(p, 200);
  R.add("V31-E06-28", "Descrição curta: pede mais detalhes", /detalhes/.test(await p.textContent("#cot-erro")));
  await p.fill("#cot-desc", "Pintura de 200 portões de aço, cor preta, acabamento brilhante. Prazo de 15 dias.");
  await p.click("#cot-enviar"); await espera(p, 600);
  const ok = await p.evaluate(() => { const b = document.querySelector(".cot-ok"); return b && { cod: b.querySelector(".cot-ok-codigo strong").textContent, whats: !!b.querySelector(".btn-whats"), form: document.querySelector("#cot-form").hidden }; });
  protocolo = ok && ok.cod;
  R.add("V31-E06-29", "Gera o código COT-XXXX-XXXX-XX e mostra o atalho do WhatsApp (recurso ligado)", ok && /^COT-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{2}$/.test(ok.cod) && ok.whats && ok.form, JSON.stringify(ok));
  const lista = await p.evaluate(() => JSON.parse(localStorage.getItem("policoating_cotacao_itens") || "[]").length);
  R.add("V31-E06-30", "Depois de enviar, a lista de itens é esvaziada", lista === 0);
  // minhas cotações neste aparelho
  await p.click('[data-ir="minhas"]'); await espera(p, 400);
  R.add("V31-E07-01", "'Minhas cotações' mostra a cotação com o código, status e validade", (await p.textContent("#cot-minhas")).includes(protocolo) && /Recebida/.test(await p.textContent("#cot-minhas")) && /válida por mais 7 dias/.test(await p.textContent("#cot-minhas")));
  // consulta pelo código (minúsculas e sem traços também valem)
  await p.click('[data-cot-aba="consultar"]');
  await p.fill("#cot-codigo", protocolo.toLowerCase().replace(/-/g, "")); await p.click("#cot-consulta button"); await espera(p, 300);
  R.add("V31-E07-02", "Consulta pelo código (aceita minúsculas e sem traços)", (await p.textContent("#cot-consulta-res")).includes(protocolo));
  await p.fill("#cot-codigo", "COT-ZZZZ-ZZZZ-ZZ"); await p.click("#cot-consulta button"); await espera(p, 300);
  R.add("V31-E07-03", "Código inexistente: mensagem clara", /Não encontramos/.test(await p.textContent("#cot-consulta-res")));
  R.add("V31-E07-04", "Sem erros de JavaScript no fluxo", !erros.length, erros.join(" | "));
  // celular: sem rolagem lateral
  await p.setViewportSize({ width: 390, height: 844 }); await p.click('[data-cot-aba="nova"]'); await p.click("[data-nova]"); await espera(p, 300);
  R.add("V31-E07-05", "Celular (390 px): página sem rolagem lateral", await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  // painel da equipe (mesmo navegador = mesma demonstração)
  await ctx.addInitScript(() => localStorage.setItem("policoating_demo_equipe", JSON.stringify([{ email: "dono@x.com", papel: "admin" }])));
  await logarDemo(ctx, "dono@x.com", null);
  const a = await ctx.newPage(); const errosA = []; a.on("pageerror", (e) => errosA.push(e.message));
  await a.setViewportSize({ width: 1280, height: 900 });
  await a.goto(`${BASE}/admin.html`); await espera(a, 1200);
  const temAba = await a.$('.admin-abas [data-aba="cotacoes"]');
  if (temAba) {
    await a.click('.admin-abas [data-aba="cotacoes"]'); await espera(a, 500);
    const linha = await a.textContent("#cot-adm-lista");
    R.add("V31-E08-01", "Painel: aba Cotações lista a cotação com o código e o cliente", linha.includes(protocolo) && linha.includes("Metalúrgica Teste"), linha.slice(0, 120));
    await a.fill("#cot-adm-busca", protocolo.slice(4, 8)); await espera(a, 300);
    R.add("V31-E08-02", "Busca por parte do código encontra", (await a.$$(".adm-cot")).length === 1);
    await a.click(".adm-cot summary"); await espera(a, 300);
    await a.selectOption(".adm-cot select[name=status]", "proposta_enviada");
    await a.fill(".adm-cot input[name=valor]", "3.250,50");
    await a.fill(".adm-cot textarea[name=resposta]", "Proposta: 100 kg a R$ 30/kg + frete.");
    await a.click(".adm-cot [data-resp] button"); await espera(a, 600);
    const ev = await a.textContent(".adm-cot [data-eventos]");
    R.add("V31-E08-03", "Equipe responde (status, valor, texto) e o histórico da cotação registra", /Proposta enviada/.test(ev) && /dono@x.com/.test(ev), ev.slice(0, 120));
    // cliente vê a resposta
    await p.click('[data-cot-aba="consultar"]'); await p.fill("#cot-codigo", protocolo); await p.click("#cot-consulta button"); await espera(p, 300);
    const res = await p.textContent("#cot-consulta-res");
    R.add("V31-E08-04", "Cliente consulta o código e vê a proposta (R$ 3.250,50)", /Proposta enviada/.test(res) && /3\.250,50/.test(res), res.slice(0, 160));
    R.add("V31-E08-05", "Painel sem erros de JavaScript", !errosA.length, errosA.join(" | "));
  } else R.add("V31-E08-01", "Painel: aba Cotações", false, "aba não encontrada");
  await ctx.close();
}

{ // cliente logado: dados preenchidos pela conta e histórico em Minha conta
  const { ctx, p, erros } = await site({ recursos: REC(["b2b_quote_enabled"]), login: { email: "maria@teste.com", perfil: PERFIL_PF } });
  await p.goto(`${BASE}/cotacao.html`); await espera(p, 900);
  const pre = await p.evaluate(() => ({ nome: document.querySelector("#cot-nome").value, doc: document.querySelector("#cot-doc").value, cidade: document.querySelector("#cot-cidade").value, email: document.querySelector("#cot-email").value }));
  R.add("V31-E07-06", "Logado: nome, CPF, e-mail e endereço vêm do cadastro", pre.nome === "Maria Teste Silva" && pre.doc === "529.982.247-25" && pre.cidade === "Matão/SP" && pre.email === "maria@teste.com", JSON.stringify(pre));
  await p.fill("#cot-busca", "POL-0001 — Poliéster Brilhante Teste POL-0001"); await p.click("#cot-add");
  await p.fill("#cot-desc", "Repintura de estrutura metálica de galpão, 300 m², cor preta.");
  await p.click("#cot-enviar"); await espera(p, 600);
  const cod = await p.textContent(".cot-ok-codigo strong").catch(() => "");
  await p.goto(`${BASE}/conta.html#cotacoes`); await espera(p, 1200);
  const menu = await p.evaluate(() => !document.querySelector("#menu-cotacoes").hidden);
  const txt = await p.textContent("#lista-cotacoes").catch(() => "");
  R.add("V31-E07-07", "Minha conta → Minhas cotações mostra a cotação do cliente", menu && cod && txt.includes(cod), `${cod} ${txt.slice(0, 100)}`);
  R.add("V31-E07-08", "Sem erros de JavaScript", !erros.length, erros.join(" | "));
  await ctx.close();
}

await nav.close();
process.exitCode = R.imprimir() ? 1 : 0;
