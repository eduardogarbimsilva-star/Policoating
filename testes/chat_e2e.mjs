// Chat da cotação aprovada, de ponta a ponta no modo demonstração: cliente (página de cotação) e equipe (painel) ao mesmo tempo.
// Uso: python3 testes/servidor.py 8765 &  depois  node testes/chat_e2e.mjs
import { chromium, BASE, contextoDemo, sementeCatalogo, logarDemo, relatorio } from "./comum.mjs";
const R = relatorio();
const nav = await chromium.launch();
const espera = (p, ms) => p.waitForTimeout(ms);
const VIACEP = { logradouro: "Avenida Brasil", bairro: "Centro", localidade: "Araraquara", uf: "SP", estado: "São Paulo", regiao: "Sudeste", ddd: "16", ibge: "3503208" };
const REC = (l) => Object.fromEntries(l.map((k) => [k, { chave: k, ligado: true, implementado: true, alvos: {} }]));
async function contexto(rec, w = 1280) {
  const ctx = await contextoDemo(nav, { viewport: { width: w, height: 860 } });
  await ctx.route("https://viacep.com.br/**", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify(VIACEP) }));
  await ctx.addInitScript(([c, rec]) => { if (localStorage.getItem("__s")) return; localStorage.setItem("__s", "1"); localStorage.setItem("policoating_demo_catalogo", JSON.stringify(c)); localStorage.setItem("policoating_demo_recursos", JSON.stringify(rec)); localStorage.setItem("policoating_demo_equipe", JSON.stringify([{ email: "eduardo@x.com", papel: "admin" }])); }, [sementeCatalogo(), REC(rec)]);
  await logarDemo(ctx, "eduardo@x.com", null);
  return ctx;
}
/** cria uma cotação pelo formulário e muda o status (como a equipe faria) */
async function cotar(p, status) {
  await p.goto(`${BASE}/cotacao.html`); await espera(p, 900);
  const se = async (sel, v) => { if (await p.isVisible(sel)) await p.fill(sel, v); };
  await p.fill("#cot-cep", "14801000"); await espera(p, 500); await se("#cot-numero", "500");
  await se("#cot-doc", "11222333000181"); await se("#cot-tel", "16999990000"); await se("#cot-nome", "Maria Teste Silva");
  await se("#cot-desc", "Pintura de 200 portões de aço, cor preta, acabamento brilhante."); await se("#cot-peso", "120");
  await p.click("#cot-enviar"); await p.waitForSelector(".cot-comp-num", { timeout: 8000 });
  const cod = (await p.textContent(".cot-comp-num strong")).trim();
  await p.evaluate(([cod, st]) => { const k = "policoating_demo_cotacoes"; const v = JSON.parse(localStorage.getItem(k)); const c = v.find((x) => x.protocolo === cod); c.status = st; c.frete = Object.assign({}, c.frete, { zona: "externo", valor: 612.5, prazo_dias: 3 }); localStorage.setItem(k, JSON.stringify(v)); }, [cod, status]);
  return cod;
}
async function consultar(p, cod) {
  await p.goto(`${BASE}/cotacao.html`); await espera(p, 800);
  await p.click('[data-cot-aba="consultar"]'); await p.fill("#cot-codigo", cod); await p.click("#cot-consulta button"); await espera(p, 500);
}
const msgs = (p) => p.$$eval(".ch-msgs .ch-msg, .ch-msgs .ch-sistema", (l) => l.map((m) => (m.classList.contains("ch-sistema") ? "sistema" : [...m.classList].find((c) => c.startsWith("ch-a-")).slice(5)) + ":" + m.querySelector(m.classList.contains("ch-sistema") ? "span" : "p").textContent.trim()));

{ // fluxo completo
  const ctx = await contexto(["b2b_quote_enabled", "quote_chat_enabled"]);
  const cli = await ctx.newPage(); const erros = []; cli.on("pageerror", (e) => erros.push(e.message));
  const cod = await cotar(cli, "aprovada");
  await consultar(cli, cod);
  R.add("CHE-01", "Cotação aprovada: aparece o convite \"Abrir chat\"", await cli.isVisible(".ch-convite [data-chat-abrir]"));
  await cli.click(".ch-convite [data-chat-abrir]"); await espera(cli, 800);
  let m = await msgs(cli);
  R.add("CHE-02", "Chat abre com boas-vindas do assistente virtual (com o nome e o número)", await cli.isVisible(".ch-janela") && m.length === 1 && m[0].startsWith("ia:Olá, Maria!") && m[0].includes(cod), m.join(" | "));
  await cli.fill(".ch-rodape textarea", "Qual o prazo de entrega?"); await cli.keyboard.press("Enter"); await espera(cli, 700);
  m = await msgs(cli);
  R.add("CHE-03", "Enter envia; o assistente responde com o prazo da cotação", m.at(-2) === "cliente:Qual o prazo de entrega?" && /3 dias úteis/.test(m.at(-1)) && m.at(-1).startsWith("ia:"), m.slice(-2).join(" | "));
  R.add("CHE-04", "Topo mostra que é o assistente virtual e que a equipe foi avisada", /Assistente virtual · equipe avisada/.test(await cli.textContent(".ch-sub")));

  const adm = await ctx.newPage(); adm.on("pageerror", (e) => erros.push("painel: " + e.message));
  await adm.goto(`${BASE}/admin.html`); await espera(adm, 1500);
  await adm.evaluate(() => document.querySelector('[data-aba="cotacoes"]').click()); await espera(adm, 1200);
  const conv = await adm.evaluate(() => { const b = document.querySelector("#ch-conversas .ch-conv"); return b && { txt: b.textContent.replace(/\s+/g, " "), badge: (b.querySelector(".ch-badge") || {}).textContent }; });
  R.add("CHE-05", "Painel: lista de conversas com 1 mensagem não lida do cliente", !!conv && conv.txt.includes(cod) && conv.badge === "1", JSON.stringify(conv));
  await adm.click('#cot-adm-resumo [data-filtro="todas"]'); await espera(adm, 400);
  await adm.evaluate(() => document.querySelectorAll(".adm-cot").forEach((d) => (d.open = true))); await espera(adm, 300);
  R.add("CHE-06", "Painel: cotação aprovada tem o botão \"Abrir chat com o cliente\"", (await adm.$$(".ch-abrir-adm [data-chat-abrir]")).length === 1);
  await adm.click("#ch-conversas .ch-conv"); await espera(adm, 800);
  R.add("CHE-07", "Equipe só abriu (sem responder): assistente continua atendendo", /assistente virtual atendendo/.test(await adm.textContent(".ch-sub")) && await adm.$eval(".ch-sair", (b) => b.hidden));
  await adm.fill(".ch-rodape textarea", "Olá Maria! Aqui é da equipe, sua carga sai amanhã cedo."); await adm.click(".ch-enviar"); await espera(adm, 700);
  const ma = await msgs(adm);
  R.add("CHE-08", "Equipe respondeu: aviso de entrada + mensagem; \"você está atendendo\" e botão Sair", ma.at(-2).startsWith("sistema:") && /entrou na conversa/.test(ma.at(-2)) && ma.at(-1).startsWith("equipe:Olá Maria") && /você está atendendo/.test(await adm.textContent(".ch-sub")) && !(await adm.$eval(".ch-sair", (b) => b.hidden)), ma.slice(-2).join(" | "));
  await espera(cli, 4200);   // o cliente recebe pela atualização automática
  m = await msgs(cli);
  R.add("CHE-09", "Cliente recebe a resposta sozinho; topo mostra a pessoa da equipe na conversa", m.at(-1).startsWith("equipe:Olá Maria") && /\(equipe\) está na conversa/.test(await cli.textContent(".ch-sub")), m.slice(-2).join(" | "));
  await cli.fill(".ch-rodape textarea", "Perfeito, obrigada!"); await cli.keyboard.press("Enter"); await espera(cli, 700);
  m = await msgs(cli);
  R.add("CHE-10", "Com a equipe na conversa, o assistente NÃO responde", m.at(-1) === "cliente:Perfeito, obrigada!" && !(await cli.$(".ch-digitando")), m.slice(-2).join(" | "));
  await adm.keyboard.press("Escape"); await espera(adm, 600);
  await espera(cli, 4200);
  m = await msgs(cli);
  R.add("CHE-11", "Equipe fechou o chat: aviso de saída e o assistente volta", /saiu da conversa\. O assistente volta/.test(m.at(-1)) && /Assistente virtual/.test(await cli.textContent(".ch-sub")), m.at(-1));
  await cli.fill(".ch-rodape textarea", "E o frete?"); await cli.keyboard.press("Enter"); await espera(cli, 700);
  m = await msgs(cli);
  R.add("CHE-12", "Depois que a equipe sai, o assistente responde de novo", m.at(-1).startsWith("ia:") && /612,50/.test(m.at(-1)), m.at(-1));
  await cli.keyboard.press("Escape"); await espera(cli, 400);
  R.add("CHE-13", "Esc fecha o chat do cliente", !(await cli.$(".ch-tela")));
  R.add("CHE-14", "Sem erros de JavaScript", !erros.length, erros.join(" | "));
  await ctx.close();
}
{ // opções rápidas, chamar a equipe, avisos no sino (cliente e equipe) e "Minhas cotações" no menu
  const ctx = await contexto(["b2b_quote_enabled", "quote_chat_enabled"]);
  const cli = await ctx.newPage(); const erros = []; cli.on("pageerror", (e) => erros.push(e.message));
  const cod = await cotar(cli, "aprovada");
  await consultar(cli, cod);
  await cli.evaluate(() => window.Avisos.conferir()); await espera(cli, 600);   // memoriza a cotação aprovada
  await cli.click(".ch-convite [data-chat-abrir]"); await espera(cli, 800);
  const ops = await cli.$$eval(".ch-opcoes .ch-opcao", (l) => l.map((b) => b.textContent));
  R.add("CHE-19", "Opções rápidas na tela (frete, prazo, itens, validade, pagamento, alterar, falar com a equipe)", ops.length === 7 && ops.includes("Valor do frete") && ops.includes("Falar com a equipe"), ops.join(", "));
  await cli.click('.ch-opcao[data-texto="Qual o valor do frete?"]'); await espera(cli, 700);
  let m = await msgs(cli);
  R.add("CHE-20", "Tocar numa opção envia a pergunta e o assistente responde", m.at(-2) === "cliente:Qual o valor do frete?" && /612,50/.test(m.at(-1)), m.slice(-2).join(" | "));
  await cli.fill(".ch-rodape textarea", "tudo e voce?"); await cli.keyboard.press("Enter"); await espera(cli, 600);
  await cli.fill(".ch-rodape textarea", "ok"); await cli.keyboard.press("Enter"); await espera(cli, 600);
  m = await msgs(cli);
  R.add("CHE-21", "Conversa natural: cumprimento e \"ok\" com respostas próprias", /Tudo ótimo/.test(m.at(-3)) && /Combinado/.test(m.at(-1)), m.slice(-4).join(" | "));
  await cli.fill(".ch-rodape textarea", "Pode me enviar então"); await cli.keyboard.press("Enter"); await espera(cli, 700);
  m = await msgs(cli);
  R.add("CHE-22", "Não entendeu: chama a equipe, com aviso na conversa e topo \"equipe chamada\"", /chamei a equipe/.test(m.at(-2)) && /^sistema:Atendimento solicitado/.test(m.at(-1)) && /equipe chamada/.test(await cli.textContent(".ch-sub")), m.slice(-2).join(" | "));

  await cli.keyboard.press("Escape"); await espera(cli, 400);   // cliente fecha o chat: as respostas chegam pelo sino
  const adm = await ctx.newPage(); adm.on("pageerror", (e) => erros.push("painel: " + e.message));
  await adm.goto(`${BASE}/admin.html`); await espera(adm, 1500);
  await adm.evaluate(() => window.Avisos.conferirChat()); await espera(adm, 800);
  const avEq = await adm.evaluate(() => window.Avisos.lista().map((a) => a.titulo + " | " + a.texto + " | " + a.link));
  R.add("CHE-23", "Sino da equipe: \"Cliente pediu atendimento\" com a mensagem do cliente e link que abre a conversa", avEq.some((t) => t.includes("pediu atendimento") && t.includes("Pode me enviar então") && t.includes("admin#chat=" + cod)), avEq.join(" || "));
  await adm.evaluate(() => document.querySelector('[data-aba="cotacoes"]').click()); await espera(adm, 900);
  R.add("CHE-24", "Lista da equipe: conversa em destaque \"pediu atendimento\"", await adm.$$eval("#ch-conversas .ch-conv-suporte .ch-chip-sup", (l) => l.length) === 1);
  await adm.goto(`${BASE}/admin.html#chat=${cod}`); await espera(adm, 2600);
  R.add("CHE-25", "Abrir pelo link do aviso: já cai na conversa", await adm.isVisible(".ch-janela") && (await adm.textContent(".ch-sub")).includes(cod));
  await adm.fill(".ch-rodape textarea", "Oi Maria, aqui é o Eduardo. Te envio o comprovante agora."); await adm.click(".ch-enviar"); await espera(adm, 600);
  await adm.keyboard.press("Escape"); await espera(adm, 400);
  await cli.evaluate(() => window.Avisos.conferirChat()); await espera(cli, 900);
  const av = await cli.evaluate(() => ({ lista: window.Avisos.lista().map((a) => a.titulo + " | " + a.texto + " | " + a.link), cont: document.querySelector(".avisos-cont").textContent, sino: !document.querySelector(".btn-avisos").hidden }));
  R.add("CHE-26", "Sino do cliente: \"Resposta no chat\" com o texto da equipe e link para a conversa", av.sino && av.cont !== "" && av.lista.some((t) => t.includes("Resposta no chat") && t.includes("Te envio o comprovante") && t.includes("cotacao#chat=" + cod)), JSON.stringify(av));
  await cli.evaluate(() => window.Avisos.conferirChat()); await espera(cli, 600);
  R.add("CHE-27", "Mesma resposta não avisa duas vezes", (await cli.evaluate(() => window.Avisos.lista().filter((a) => a.tipo === "chat" && /Resposta no chat/.test(a.titulo)).length)) === 1);
  await cli.setViewportSize({ width: 390, height: 844 }); await espera(cli, 400);
  R.add("CHE-28", "Celular: o sino aparece no topo", await cli.isVisible(".btn-avisos"));
  await cli.setViewportSize({ width: 1280, height: 860 }); await espera(cli, 300);
  const menu = await cli.evaluate(() => { const a = document.querySelector(".mc-cot"); return a && { href: a.getAttribute("href"), oculto: a.hidden, txt: a.textContent.trim() }; });
  R.add("CHE-29", "Menu da conta tem \"Minhas cotações\" levando à aba de cotações", !!menu && !menu.oculto && menu.href === "conta#cotacoes" && /Minhas cotações/.test(menu.txt), JSON.stringify(menu));
  R.add("CHE-30", "Sem erros de JavaScript", !erros.length, erros.join(" | "));
  await ctx.close();
}
{ // só cotação aprovada; recurso desligado = nada aparece
  const ctx = await contexto(["b2b_quote_enabled", "quote_chat_enabled"]);
  const p = await ctx.newPage();
  const cod = await cotar(p, "proposta_enviada"); await consultar(p, cod);
  R.add("CHE-15", "Cotação ainda não aprovada: sem convite de chat", !(await p.$(".ch-convite")));
  await ctx.close();
  const ctx2 = await contexto(["b2b_quote_enabled"]);
  const q = await ctx2.newPage();
  const cod2 = await cotar(q, "aprovada"); await consultar(q, cod2);
  R.add("CHE-16", "Recurso \"Chat da cotação\" desligado (padrão): sem convite", !(await q.$(".ch-convite")));
  await q.goto(`${BASE}/admin.html`); await espera(q, 1500); await q.evaluate(() => document.querySelector('[data-aba="cotacoes"]').click()); await espera(q, 900);
  R.add("CHE-17", "Recurso desligado: painel sem lista de conversas nem botão de chat", !(await q.$("#ch-conversas")) && !(await q.$(".ch-abrir-adm")));
  await ctx2.close();
}
{ // celular: chat em tela cheia, sem vazar
  const ctx = await contexto(["b2b_quote_enabled", "quote_chat_enabled"], 390);
  const p = await ctx.newPage();
  const cod = await cotar(p, "aprovada"); await consultar(p, cod);
  await p.click(".ch-convite [data-chat-abrir]"); await espera(p, 800);
  await p.fill(".ch-rodape textarea", "Bom dia! Vocês entregam no sábado? Preciso receber até o fim da semana para não parar a linha de pintura."); await p.keyboard.press("Enter"); await espera(p, 800);
  const r = await p.evaluate(() => { const j = document.querySelector(".ch-janela").getBoundingClientRect(); const ms = [...document.querySelectorAll(".ch-msg")].map((m) => m.getBoundingClientRect());
    return { cheia: Math.round(j.width) === innerWidth && Math.round(j.height) >= innerHeight - 1, dentro: ms.every((b) => b.left >= 0 && b.right <= innerWidth), campo: document.querySelector(".ch-rodape textarea").getBoundingClientRect().bottom <= innerHeight }; });
  R.add("CHE-18", "Celular: chat em tela cheia, balões dentro da tela e campo visível", r.cheia && r.dentro && r.campo, JSON.stringify(r));
  if (process.env.FOTO) await p.screenshot({ path: process.env.FOTO });
  await ctx.close();
}
await nav.close();
process.exitCode = R.imprimir() ? 1 : 0;
