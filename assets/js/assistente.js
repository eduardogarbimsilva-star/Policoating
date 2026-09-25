/* =========================================================
   Policoating — Assistente de compras
   - Entende pedidos em português ("portão preto fosco externo")
     e sugere produtos já com a cor certa
   - Comprar novamente (pedidos recentes), vistos recentemente,
     favoritos, carrinho e atalho para o vendedor no WhatsApp
   - Opcional: IA de verdade (Claude) via função do Supabase,
     configurada em config.js -> assistente.endpoint
   ========================================================= */
(function () {
  "use strict";

  const CFG = window.SITE_CONFIG || {};
  const CFG_IA = CFG.assistente || {};
  const CHAVE_CONVERSA = "policoating_assistente";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const ic = (n) => (window.Icone ? window.Icone(n) : "");
  const CW = () => window.ColorWeg;
  const esc = (s) => CW().esc(s);

  /* ---------- Entendimento do texto (sem IA externa) ---------- */
  const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  // palavra -> termos que podem aparecer no nome da cor
  const CORES = {
    preto: ["preto", "9005", "9004"], branco: ["branco", "9016", "9010", "9003"], cinza: ["cinza", "7035", "7032", "7001", "7016", "munsell"],
    grafite: ["grafite", "antracite", "7024", "7016"], azul: ["azul", "5010", "5005", "5015"], vermelho: ["vermelho", "3000"],
    amarelo: ["amarelo", "1003"], verde: ["verde", "6005", "6018"], laranja: ["laranja", "2004"], prata: ["prata", "aluminio", "9006", "9007"],
    bege: ["bege", "areia", "1015", "1019"], marrom: ["marrom", "bronze", "8017", "8019"], cobre: ["cobre"], bronze: ["bronze"], dourado: ["ouro", "champagne"],
    // cores fora do catálogo padrão (atendidas sob medida)
    rosa: ["rosa"], roxo: ["roxo"], lilas: ["lilas"], vinho: ["vinho"], bordo: ["bordo"], turquesa: ["turquesa"], magenta: ["magenta"]
  };
  const ACABAMENTOS = { fosco: "fosco", brilhante: "brilhante", brilho: "brilhante", acetinado: "acetinado", semibrilho: "semibrilho",
    texturizado: "textur", textura: "textur", rugoso: "rugoso", martelado: "martel", metalico: "metalico", metalizado: "metalico" };
  // pistas de aplicação -> categoria sugerida
  const PISTAS = [
    [/externo|externa|fachada|portao|grade|gradil|janela|esquadria|sol|chuva|muro|cerca|poste|urbano/, "poliester"],
    [/quimic|anticorros|painel eletrico|quadro de comando|maquina|industria|prateleira/, "epoxi"],
    [/interno|interna|movel|moveis|cadeira|mesa|estante|eletro|luminaria|gondola|escritorio/, "hibrida"],
    [/textur|rugos|martel|risco|imperfeic/, "texturizada"],
    [/metalic|cromad|perol|roda|cobre|bronze|ouro|dourad/, "metalica"],
    [/churrasq|escapament|forno|fogao|temperatura|calor/, "especiais"],
    [/primer|fundo|zinco|galvaniz|verniz|sob medida|especial/, "especiais"]
  ];

  // pistas que apontam para um produto específico
  const PISTAS_PRODUTO = [
    [/churrasq|escapament|forno|fogao|lareira|calor|alta temperatura|motor/, "alta-temperatura"],
    [/primer|zinco|galvaniz|anticorrosivo de fundo|fundo/, "primer-zinco"],
    [/verniz|transparent|incolor/, "verniz-po"],
    [/painel eletrico|quadro de comando|quadro eletrico|gabinete/, "epoxi-painel-eletrico"],
    [/martel|hammer/, "texturizada-martelada"],
    [/fachada|esquadria|perfil de aluminio|arquitet/, "poliester-fosco"],
    [/sob medida|pantone|cor especial|amostra fisica/, "cor-especial"]
  ];

  function interpretar(texto) {
    const t = norm(texto);
    const cores = Object.keys(CORES).filter((c) => new RegExp("\\b" + c).test(t));
    // Código RAL: "RAL 9005" ou só "9005", se existir no catálogo
    const codigosCatalogo = new Set([].concat(...(window.PRODUTOS || []).map((p) => p.cores.map((c) => (c.nome.match(/\d{4}/) || [])[0]))));
    const numero = (t.match(/ral\s*(\d{4})/) || [])[1] || (t.match(/\b\d{4}\b/g) || []).find((n) => codigosCatalogo.has(n));
    const ral = numero || null;
    const acab = Object.keys(ACABAMENTOS).filter((a) => t.includes(a)).map((a) => ACABAMENTOS[a]);
    const cats = PISTAS.filter(([re]) => re.test(t)).map(([, c]) => c);
    let intencao = "buscar";
    if (/\b(oi|ola|bom dia|boa tarde|boa noite|e ai)\b/.test(t) && t.length < 25) intencao = "saudacao";
    if (/repet|de novo|novamente|ultimo pedido|ultimos pedidos|meus pedidos|comprar mais|recompr|pedido anterior/.test(t)) intencao = "pedidos";
    if (/vist|olhei|recente/.test(t) && !/pedido/.test(t)) intencao = "vistos";
    if (/favorit/.test(t)) intencao = "favoritos";
    if (/carrinho|finalizar|fechar pedido/.test(t)) intencao = "carrinho";
    if (/vendedor|atendente|humano|pessoa|whats|falar com|ligar|telefone/.test(t)) intencao = "vendedor";
    if (/preco|valor|quanto custa|orcamento|desconto/.test(t)) intencao = "preco";
    if (/prazo|entrega|frete|envio|chega/.test(t)) intencao = "entrega";
    if (/ficha tecnica|fispq|boletim|laudo/.test(t)) intencao = "ficha";
    if (/qual (po|tinta) usar|nao sei qual|me ajuda a escolher|indica/.test(t)) intencao = cats.length || cores.length ? "buscar" : "guia";
    const alvos = PISTAS_PRODUTO.filter(([re]) => re.test(t)).map(([, id]) => id);
    return { t, cores, ral, acab, cats, alvos, intencao };
  }

  function buscarProdutos(q) {
    const tokens = q.t.split(/[^a-z0-9]+/).filter((w) => w.length > 3);
    const termosCor = [].concat(...q.cores.map((c) => CORES[c]));
    const avaliar = (p, usarCor) => {
      let pontos = 0;
      const texto = norm([p.nome, p.linha, p.descricao, p.acabamento, (CATEGORIAS[p.categoria] || {}).nome].join(" "));
      if (q.cats.length) pontos += q.cats.includes(p.categoria) ? 6 - q.cats.indexOf(p.categoria) : -3;
      q.acab.forEach((a) => { if (norm(p.acabamento).includes(a) || norm(p.nome).includes(a)) pontos += 3; });
      tokens.forEach((w) => { if (texto.includes(w)) pontos += 1; });
      let cor = null;
      if (usarCor) {
        // Código RAL exato tem prioridade sobre o nome da cor
        if (q.ral) cor = p.cores.find((c) => c.nome.includes(q.ral));
        if (cor) pontos += 7;
        else if (termosCor.length) {
          cor = p.cores.find((c) => termosCor.some((tm) => norm(c.nome).includes(tm)));
          pontos += cor ? 4 : -2;
        }
      }
      if (q.alvos.includes(p.id)) pontos += 8;
      if (p.id === "cor-especial" && !q.alvos.includes(p.id)) pontos -= 3;
      return { p, cor: cor || p.cores[0], pontos, corExata: !!cor };
    };
    const ordenar = (lista) => lista.filter((r) => r.pontos > 0).sort((a, b) => b.pontos - a.pontos || b.corExata - a.corExata);
    const produtos = window.PRODUTOS || [];
    let resultados = ordenar(produtos.map((p) => avaliar(p, true)));
    // Nenhum produto tem a cor pedida: mostra as linhas certas e avisa que fazemos sob medida
    const pediuCor = termosCor.length || q.ral;
    const corEncontrada = resultados.some((r) => r.corExata);
    if (pediuCor && !corEncontrada) resultados = ordenar(produtos.map((p) => avaliar(p, false))).map((r) => Object.assign(r, { semCor: true }));
    // Mantém só o que é relevante: a linha certa (quando identificada) e pontuação próxima da melhor
    if (q.cats.length) {
      const naLinha = resultados.filter((r) => q.cats.includes(r.p.categoria));
      if (naLinha.length) resultados = naLinha;
    }
    const melhor = resultados.length ? resultados[0].pontos : 0;
    return resultados.filter((r) => r.pontos >= melhor * 0.6).slice(0, 3);
  }

  /* ---------- Interface ---------- */
  let aberto = false, historico = [], ocupado = false;

  function salvar() { try { sessionStorage.setItem(CHAVE_CONVERSA, JSON.stringify(historico.slice(-30))); } catch (e) { /* ignora */ } }
  function carregar() { try { return JSON.parse(sessionStorage.getItem(CHAVE_CONVERSA)) || []; } catch (e) { return []; } }

  function montar() {
    document.body.insertAdjacentHTML("beforeend", `
      <button type="button" class="assist-botao" aria-label="Abrir assistente de compras" aria-expanded="false">
        ${ic("conversa")}<span>Assistente</span>
      </button>
      <section class="assist-painel" role="dialog" aria-label="Assistente Policoating" aria-hidden="true">
        <header class="assist-topo">
          <div class="assist-avatar">${ic("bussola")}</div>
          <div><strong>Assistente Policoating</strong><small><i></i>${CFG_IA.endpoint ? "Inteligência artificial" : "Online"} · responde na hora</small></div>
          <button type="button" class="assist-fechar" aria-label="Fechar assistente">×</button>
        </header>
        <div class="assist-mensagens" aria-live="polite"></div>
        <div class="assist-atalhos"></div>
        <form class="assist-form">
          <input type="text" maxlength="400" placeholder="Ex.: portão preto fosco para área externa" aria-label="Escreva sua mensagem" autocomplete="off">
          <button type="submit" aria-label="Enviar">${ic("seta")}</button>
        </form>
        <a class="assist-whats" data-whats-assist target="_blank" rel="noopener">${CW().iconeWhats()} Falar com um vendedor no WhatsApp</a>
      </section>`);

    $(".assist-botao").addEventListener("click", () => alternar(!aberto));
    $(".assist-fechar").addEventListener("click", () => alternar(false));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && aberto) alternar(false); });
    $(".assist-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const campo = $(".assist-form input");
      const texto = campo.value.trim();
      if (!texto || ocupado) return;
      campo.value = "";
      responder(texto);
    });
    $(".assist-atalhos").addEventListener("click", (e) => {
      const b = e.target.closest("[data-atalho]");
      if (b) responder(b.textContent.trim(), b.dataset.atalho);
    });
    $(".assist-mensagens").addEventListener("click", aoClicarNaMensagem);
    $("[data-whats-assist]").addEventListener("click", (e) => {
      e.currentTarget.href = CW().linkWhatsApp(mensagemVendedor());
    });

    historico = carregar();
    if (historico.length) historico.forEach((m) => desenhar(m, false));
    atualizarAtalhos();
  }

  function alternar(v) {
    aberto = v;
    $(".assist-painel").classList.toggle("aberto", v);
    $(".assist-painel").setAttribute("aria-hidden", !v);
    $(".assist-botao").setAttribute("aria-expanded", v);
    $(".assist-botao").classList.toggle("ativo", v);
    if (v) {
      if (!historico.length) boasVindas();
      setTimeout(() => $(".assist-form input").focus(), 200);
      rolar();
    }
  }

  function nomeCliente() {
    const C = window.Conta;
    return C && C.usuario ? C.nomeExibicao() : "";
  }

  function boasVindas() {
    const nome = nomeCliente();
    adicionar({ de: "bot", texto: `Olá${nome ? ", " + nome : ""}! Sou o assistente da Policoating. Posso encontrar a tinta ideal para a sua peça, repetir um pedido ou chamar um vendedor. O que você procura?` });
  }

  function atualizarAtalhos() {
    const opcoes = [["buscar", "Buscar produto"], ["pedidos", "Comprar novamente"], ["vistos", "Vistos recentemente"],
      ["favoritos", "Meus favoritos"], ["guia", "Qual pó usar?"], ["carrinho", "Ver carrinho"], ["vendedor", "Falar com vendedor"]];
    $(".assist-atalhos").innerHTML = opcoes.map(([k, t]) => `<button type="button" data-atalho="${k}">${t}</button>`).join("");
  }

  function adicionar(msg) {
    historico.push(msg);
    salvar();
    desenhar(msg, true);
  }

  function desenhar(msg, animar) {
    const caixa = $(".assist-mensagens");
    const el = document.createElement("div");
    el.className = "assist-msg " + (msg.de === "eu" ? "eu" : "bot") + (animar ? " entrando" : "");
    let html = msg.texto ? `<p>${esc(msg.texto).replace(/\n/g, "<br>")}</p>` : "";
    if (msg.produtos && msg.produtos.length) html += `<div class="assist-produtos">${msg.produtos.map(cartaoProduto).join("")}</div>`;
    if (msg.pedidos && msg.pedidos.length) html += `<div class="assist-pedidos">${msg.pedidos.map(cartaoPedido).join("")}</div>`;
    if (msg.acoes && msg.acoes.length) html += `<div class="assist-acoes">${msg.acoes.map(botaoAcao).join("")}</div>`;
    el.innerHTML = html;
    caixa.appendChild(el);
    rolar();
  }

  function rolar() { const c = $(".assist-mensagens"); if (c) c.scrollTop = c.scrollHeight; }

  function cartaoProduto(item) {
    const p = CW().buscarProduto(item.id);
    if (!p) return "";
    const cor = p.cores.find((c) => c.nome === item.cor) || p.cores[0];
    const foto = CW().fotoProduto(p, cor, { largura: 240, altura: 192 });
    return `<div class="assist-produto">
      ${foto ? `<img src="${foto}" alt="" width="240" height="192" data-produto="${esc(p.id)}" data-cor="${esc(cor.nome)}">` : ""}
      <div><strong>${esc(p.nome)}</strong><small><i style="background:${cor.hex}"></i>${esc(cor.nome)}</small>
        <span><button type="button" data-ver="${esc(p.id)}">Ver detalhes</button>
        <button type="button" class="primario" data-add="${esc(p.id)}" data-cor="${esc(cor.nome)}">+ Carrinho</button></span></div>
    </div>`;
  }

  function cartaoPedido(ped, i) {
    const qtd = (ped.itens || []).reduce((s, it) => s + (+it.qtd || 0), 0);
    const data = ped.criado_em ? new Date(ped.criado_em).toLocaleDateString("pt-BR") : "";
    return `<div class="assist-pedido"><div><strong>Pedido ${esc(ped.numero)}</strong><small>${data} · ${qtd} ${qtd === 1 ? "item" : "itens"}</small>
      <small>${esc((ped.itens || []).map((it) => it.nome).slice(0, 2).join(", "))}${(ped.itens || []).length > 2 ? "…" : ""}</small></div>
      <button type="button" data-repetir="${i}">Comprar novamente</button></div>`;
  }

  const ACOES = {
    whatsapp: ["conversa", "Falar com vendedor"], carrinho: ["carrinho", "Abrir carrinho"], guia: ["bussola", "Fazer o guia"],
    pedidos: ["caixa", "Meus pedidos"], favoritos: ["coracao", "Meus favoritos"], entrar: ["usuario", "Entrar na conta"],
    catalogo: ["grade", "Ver catálogo"], fichas: ["documento", "Fichas técnicas"]
  };
  function botaoAcao(a) {
    const [icone, texto] = ACOES[a] || ACOES.whatsapp;
    return `<button type="button" data-acao-assist="${a}">${ic(icone)}${texto}</button>`;
  }

  let pedidosMostrados = [];
  function aoClicarNaMensagem(e) {
    const ver = e.target.closest("[data-ver]");
    if (ver) { CW().abrirProduto(ver.dataset.ver); return; }
    const add = e.target.closest("[data-add]");
    if (add) {
      const p = CW().buscarProduto(add.dataset.add);
      CW().adicionarAoCarrinho(p.id, add.dataset.cor, p.embalagens[0], 1);
      add.textContent = "Adicionado ✓";
      add.disabled = true;
      return;
    }
    const rep = e.target.closest("[data-repetir]");
    if (rep) {
      const ped = pedidosMostrados[+rep.dataset.repetir];
      (ped && ped.itens || []).forEach((it) => { if (CW().buscarProduto(it.id)) CW().adicionarAoCarrinho(it.id, it.cor, it.embalagem, it.qtd); });
      adicionar({ de: "bot", texto: `Pronto! Coloquei os itens do pedido ${ped.numero} no carrinho. Quer revisar e enviar?`, acoes: ["carrinho", "whatsapp"] });
      return;
    }
    const acao = e.target.closest("[data-acao-assist]");
    if (acao) executarAcao(acao.dataset.acaoAssist);
  }

  function executarAcao(a) {
    const destinos = { guia: "recursos.html#guia", pedidos: "conta.html#pedidos", favoritos: "conta.html#favoritos", entrar: "conta.html",
      catalogo: "produtos.html", fichas: "recursos.html#documentos" };
    if (a === "carrinho") { alternar(false); CW().abrirCarrinho(); return; }
    if (a === "whatsapp") { window.open(CW().linkWhatsApp(mensagemVendedor()), "_blank", "noopener"); return; }
    if (destinos[a]) location.href = destinos[a];
  }

  function mensagemVendedor() {
    const ultimas = historico.filter((m) => m.de === "eu" && !m.atalho).slice(-3).map((m) => "• " + m.texto).join("\n");
    return `Olá! Estou no site da ${CFG.empresa || "Policoating"} e gostaria de falar com um vendedor.` + (ultimas ? `\n\nO que eu procurei:\n${ultimas}` : "");
  }

  function digitando(v) {
    const caixa = $(".assist-mensagens");
    const atual = $(".assist-digitando", caixa);
    if (v && !atual) { caixa.insertAdjacentHTML("beforeend", `<div class="assist-msg bot assist-digitando"><span></span><span></span><span></span></div>`); rolar(); }
    if (!v && atual) atual.remove();
  }

  /* ---------- Respostas ---------- */
  async function responder(texto, atalho) {
    adicionar(atalho ? { de: "eu", texto, atalho: true } : { de: "eu", texto });
    ocupado = true;
    digitando(true);
    let resposta;
    try {
      resposta = atalho ? await respostaLocal(texto, atalho)
        : CFG_IA.endpoint ? await respostaIA(texto).catch(() => respostaLocal(texto)) : await respostaLocal(texto);
    } catch (e) {
      resposta = { texto: "Desculpe, tive um problema agora. Quer falar direto com um vendedor?", acoes: ["whatsapp"] };
    }
    await new Promise((r) => setTimeout(r, 450));
    digitando(false);
    ocupado = false;
    adicionar(Object.assign({ de: "bot" }, resposta));
  }

  async function respostaLocal(texto, atalho) {
    const q = interpretar(texto);
    const intencao = atalho || q.intencao;
    const C = window.Conta;

    if (intencao === "saudacao") return { texto: "Olá! Me conte a peça, o ambiente e a cor que você precisa. Ex.: \"grade externa preta fosca\" ou \"painel elétrico cinza RAL 7035\"." };
    if (intencao === "buscar" && atalho) return { texto: "Claro! Descreva a peça, onde ela fica (interna ou externa), a cor e o acabamento que deseja. Eu encontro as opções para você." };
    if (intencao === "guia") return { texto: "O guia faz 3 perguntas rápidas e indica o produto ideal. Se preferir, me diga aqui onde a peça fica e o acabamento desejado.", acoes: ["guia"] };
    if (intencao === "vendedor") return { texto: "Vou te conectar com um vendedor pelo WhatsApp. Ele recebe o resumo do que você procurou por aqui.", acoes: ["whatsapp"] };
    if (intencao === "preco") return { texto: "Os preços dependem da cor, da quantidade e da região de entrega, por isso o orçamento é feito pelo vendedor. Adicione os produtos ao carrinho e envie; a resposta costuma ser rápida.", acoes: ["carrinho", "whatsapp"] };
    if (intencao === "entrega") return { texto: "Atendemos todo o Brasil. O prazo e o frete são confirmados pelo vendedor junto com o orçamento, conforme o CEP de entrega do seu cadastro.", acoes: ["whatsapp"] };
    if (intencao === "ficha") return { texto: "Enviamos o boletim técnico e a FISPQ de qualquer produto. Abra o produto e toque em \"Ficha técnica\", ou peça na página de documentos.", acoes: ["fichas"] };

    if (intencao === "carrinho") {
      const itens = CW().itensCarrinho();
      if (!itens.length) return { texto: "Seu carrinho está vazio. Quer que eu encontre um produto para você?", acoes: ["catalogo"] };
      return { texto: `Você tem ${CW().totalItens()} ${CW().totalItens() === 1 ? "item" : "itens"} no carrinho. Quer revisar e enviar o pedido ao vendedor?`, acoes: ["carrinho"] };
    }
    if (intencao === "vistos") {
      const vistos = CW().lerVistos().slice(0, 4);
      if (!vistos.length) return { texto: "Você ainda não abriu nenhum produto. Me diga o que procura que eu mostro as opções." };
      return { texto: "Estes são os produtos que você viu por último:", produtos: vistos.map((id) => ({ id })) };
    }
    if (intencao === "favoritos") {
      const favs = CW().lerFavoritos().slice(0, 4);
      if (!favs.length) return { texto: "Você ainda não tem favoritos. Toque no coração de um produto para salvá-lo." };
      return { texto: "Seus produtos favoritos:", produtos: favs.map((id) => ({ id })), acoes: ["favoritos"] };
    }
    if (intencao === "pedidos") {
      if (!C || !C.usuario) return { texto: "Para comprar novamente, entre na sua conta. Assim eu mostro seus últimos pedidos e repito qualquer um com um toque.", acoes: ["entrar"] };
      const pedidos = (await C.listarPedidos()).slice(0, 3);
      pedidosMostrados = pedidos;
      if (!pedidos.length) return { texto: "Você ainda não enviou pedidos. Quer que eu ajude a montar o primeiro?", acoes: ["catalogo"] };
      return { texto: "Seus pedidos mais recentes. Toque em \"Comprar novamente\" para colocar os itens no carrinho:", pedidos };
    }

    // Busca de produtos
    const achados = buscarProdutos(q);
    if (!achados.length) {
      return { texto: "Não encontrei um produto exato para isso. Pode me dizer onde a peça fica (interna ou externa) e o acabamento desejado? Se preferir, um vendedor ajuda na hora.", acoes: ["guia", "whatsapp"] };
    }
    const semCor = achados.some((r) => r.semCor);
    let msg = semCor
      ? "Essa cor não está no nosso catálogo padrão, mas a Policoating desenvolve cores sob medida. Estas são as linhas indicadas para a sua peça; o vendedor confirma a cor:"
      : achados.length === 1 ? "Encontrei esta opção para você:" : "Encontrei estas opções para você:";
    return { texto: msg, produtos: achados.map((r) => ({ id: r.p.id, cor: r.cor.nome })), acoes: semCor ? ["whatsapp"] : [] };
  }

  /* ---------- IA de verdade (opcional) ---------- */
  function catalogoResumido() {
    return (window.PRODUTOS || []).map((p) => ({
      id: p.id, nome: p.nome, linha: (CATEGORIAS[p.categoria] || {}).nome, acabamento: p.acabamento,
      descricao: p.descricao, cura: p.cura, cores: p.cores.map((c) => c.nome), embalagens: p.embalagens
    }));
  }

  async function respostaIA(texto) {
    const mensagens = historico.filter((m) => m.texto).slice(-10).map((m) => ({ papel: m.de === "eu" ? "cliente" : "assistente", texto: m.texto.slice(0, 600) }));
    const C = window.Conta;
    const r = await fetch(CFG_IA.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: (CFG.supabase || {}).anonKey || "" },
      body: JSON.stringify({
        mensagens, catalogo: catalogoResumido(),
        contexto: { logado: !!(C && C.usuario), nome: nomeCliente(), itensNoCarrinho: CW().totalItens(), vistos: CW().lerVistos().slice(0, 5) }
      })
    });
    if (!r.ok) throw new Error("IA indisponível");
    const d = await r.json();
    const ids = new Set((window.PRODUTOS || []).map((p) => p.id));
    const resposta = {
      texto: String(d.resposta || "").slice(0, 1200),
      produtos: (d.produtos || []).filter((p) => ids.has(p.id)).slice(0, 3),
      acoes: (d.acoes || []).filter((a) => ACOES[a]).slice(0, 3)
    };
    // "comprar novamente" continua sendo feito pelo site, com os pedidos reais do cliente
    if ((d.acoes || []).includes("pedidos") && C && C.usuario) return respostaLocal(texto, "pedidos");
    if (!resposta.texto) throw new Error("Resposta vazia");
    return resposta;
  }

  window.Assistente = { abrir: () => alternar(true), interpretar, buscarProdutos };
  document.addEventListener("DOMContentLoaded", montar);
})();
