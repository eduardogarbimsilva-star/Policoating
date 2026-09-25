/* =========================================================
   Policoating — scripts comuns a todas as páginas
   (carrinho, modal de produto, WhatsApp, menu, animações)
   ========================================================= */
(function () {
  "use strict";

  const CFG = window.SITE_CONFIG || {};
  const PRODUTOS = window.PRODUTOS || [];
  const CATEGORIAS = window.CATEGORIAS || {};
  const CHAVE_CARRINHO = "policoating_carrinho";
  const CHAVE_CLIENTE = "policoating_cliente";
  const CHAVE_FAVORITOS = "policoating_favoritos";
  const CHAVE_LGPD = "policoating_lgpd";
  const CHAVE_VOLTAR = "policoating_voltar";
  const Conta = window.Conta || null;
  const Fotos = window.Fotos || null;
  const ic = (nome) => (window.Icone ? window.Icone(nome) : "");
  const FOTO_CARTAO = { largura: 480, altura: 384 };
  const FOTO_MODAL = { largura: 760, altura: 608 };
  function fotoProduto(p, cor, tam) {
    return Fotos ? Fotos.fotoProduto(p, cor, tam) : "";
  }
  function imgProduto(p, cor, tam, classe) {
    cor = cor || p.cores[0];
    if (!Fotos) return caixaSVG(cor.hex);
    return `<img class="${classe || "foto-produto"}" src="${fotoProduto(p, cor, tam)}" alt="${esc(p.nome)} — ${esc(cor.nome)}" width="${tam.largura}" height="${tam.altura}" decoding="async" data-produto="${esc(p.id)}" data-cor="${esc(cor.nome)}">`;
  }

  /* ---------- Utilidades ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const buscarProduto = (id) => PRODUTOS.find((p) => p.id === id);
  const formatarPreco = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  function lerStorage(chave, padrao) {
    try {
      const v = JSON.parse(localStorage.getItem(chave));
      return v ?? padrao;
    } catch (e) {
      return padrao;
    }
  }
  function gravarStorage(chave, valor) {
    try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) { /* modo privado */ }
  }

  function linkWhatsApp(mensagem) {
    const numero = String(CFG.whatsapp || "").replace(/\D/g, "");
    return "https://wa.me/" + numero + (mensagem ? "?text=" + encodeURIComponent(mensagem) : "");
  }

  /* Luminosidade para decidir cor do texto sobre uma cor de fundo */
  function ehEscura(hex) {
    const h = hex.replace("#", "");
    const r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 150;
  }

  /* ---------- Ilustração da caixa de papelão Policoating (SVG) ---------- */
  let idSvg = 0;
  function caixaSVG(cor, classe) {
    const id = "cx" + ++idSvg;
    return `
<svg class="${classe || ""}" viewBox="0 0 220 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Caixa de tinta em pó Policoating">
  <defs>
    <pattern id="${id}p" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1.1" fill="#1c2f55"/></pattern>
    <linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d7b079"/><stop offset="1" stop-color="#c49a62"/></linearGradient>
    <linearGradient id="${id}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient>
    <mask id="${id}m"><rect x="20" y="118" width="70" height="67" fill="url(#${id}h)"/></mask>
  </defs>
  <ellipse cx="112" cy="190" rx="98" ry="8" fill="#000" opacity=".12"/>
  <polygon points="20,70 65,45 205,45 160,70" fill="#e2c08e"/>
  <line x1="42.5" y1="57.5" x2="182.5" y2="57.5" stroke="#b48a55" stroke-width="1.4"/>
  <polygon points="160,70 205,45 205,158 160,185" fill="#b58b56"/>
  <rect x="20" y="70" width="140" height="115" fill="url(#${id}f)"/>
  <rect x="20" y="118" width="70" height="67" fill="url(#${id}p)" opacity=".45" mask="url(#${id}m)"/>
  <rect x="20" y="150" width="140" height="7" fill="#1c2f55"/>
  <rect x="20" y="162" width="140" height="7" fill="#1c2f55"/>
  <polygon points="160,150 205,125 205,132 160,157" fill="#15254a"/>
  <polygon points="160,162 205,137 205,144 160,169" fill="#15254a"/>
  <g fill="none" stroke="#1c2f55" stroke-width="1.3">
    <polygon points="170,92 180,86.5 180,104 170,109.5"/><polygon points="184,84 194,78.5 194,96 184,101.5"/>
    <path d="M173 104 v-9 m0 0 l-2 3 m2 -3 l2 3 M177 102 v-9 m0 0 l-2 3 m2 -3 l2 3"/>
  </g>
  <text x="90" y="126" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="19" fill="#1c2f55" textLength="118" lengthAdjust="spacingAndGlyphs">POLICOATING</text>
  <rect x="30" y="80" width="54" height="26" rx="2" fill="#fff" stroke="#1c2f55" stroke-width=".8"/>
  <rect x="33" y="83" width="18" height="20" rx="1.5" fill="${cor}" stroke="rgba(0,0,0,.15)" stroke-width=".6"/>
  <text x="55" y="92" font-family="Inter,Arial,sans-serif" font-weight="800" font-size="6.5" fill="#1c2f55">PÓ</text>
  <text x="55" y="100" font-family="Inter,Arial,sans-serif" font-weight="600" font-size="4.6" fill="#1c2f55">ELETROST.</text>
  <polygon points="20,70 160,70 160,185 20,185" fill="none" stroke="#a97f4b" stroke-width=".8"/>
</svg>`;
  }

  /* ---------- Preenche dados da empresa nas páginas ---------- */
  function aplicarConfig() {
    $$("[data-cfg]").forEach((el) => {
      const chave = el.getAttribute("data-cfg");
      if (CFG[chave] != null) el.textContent = CFG[chave];
    });
    $$("[data-whats]").forEach((el) => {
      el.href = linkWhatsApp(el.getAttribute("data-whats") || `Olá! Vim pelo site da ${CFG.empresa} e gostaria de mais informações.`);
      el.target = "_blank";
      el.rel = "noopener";
    });
    $$("[data-tel]").forEach((el) => (el.href = "tel:+" + String(CFG.whatsapp).replace(/\D/g, "")));
    $$("[data-email]").forEach((el) => (el.href = "mailto:" + CFG.email));
    $$("[data-rede]").forEach((el) => {
      const url = (CFG.redes || {})[el.getAttribute("data-rede")];
      if (url && /^https?:\/\//.test(url)) { el.href = url; el.hidden = false; el.parentElement.hidden = false; }
    });
    $$("[data-ano]").forEach((el) => (el.textContent = new Date().getFullYear()));
  }

  /* ---------- Menu mobile ---------- */
  function iniciarMenu() {
    const btn = $(".btn-menu"), menu = $(".menu");
    if (!btn || !menu) return;
    btn.addEventListener("click", () => {
      const aberto = menu.classList.toggle("aberto");
      btn.setAttribute("aria-expanded", aberto);
    });
    $$("a", menu).forEach((a) => a.addEventListener("click", () => menu.classList.remove("aberto")));
  }

  /* ---------- Carrinho ---------- */
  let carrinho = lerStorage(CHAVE_CARRINHO, []).filter((i) => buscarProduto(i.id));

  const chaveItem = (i) => `${i.id}|${i.cor}|${i.embalagem}`;
  const totalItens = () => carrinho.reduce((s, i) => s + i.qtd, 0);

  function salvarCarrinho() {
    gravarStorage(CHAVE_CARRINHO, carrinho);
    renderCarrinho();
    atualizarContador(true);
  }

  function adicionarAoCarrinho(id, cor, embalagem, qtd) {
    const p = buscarProduto(id);
    if (!p) return;
    const item = {
      id,
      cor: cor || p.cores[0].nome,
      embalagem: embalagem || p.embalagens[0],
      qtd: Math.max(1, parseInt(qtd, 10) || 1)
    };
    const existente = carrinho.find((i) => chaveItem(i) === chaveItem(item));
    if (existente) existente.qtd += item.qtd;
    else carrinho.push(item);
    salvarCarrinho();
    mostrarToast(`<strong>${esc(p.nome)}</strong> adicionado ao carrinho`, true);
  }

  function atualizarContador(animar) {
    $$(".contador").forEach((c) => {
      c.textContent = totalItens();
      if (animar) {
        c.classList.remove("pulsar");
        void c.offsetWidth;
        c.classList.add("pulsar");
      }
    });
  }

  function montarEstruturaCarrinho() {
    const html = `
<div class="sobreposicao" id="sobreposicao"></div>
<aside class="carrinho" id="carrinho" aria-label="Carrinho de compras" aria-hidden="true">
  <div class="carrinho-topo">
    <h3>Seu carrinho</h3>
    <button class="fechar" data-fechar-carrinho aria-label="Fechar carrinho">×</button>
  </div>
  <div class="carrinho-itens" id="carrinho-itens"></div>
  <div class="carrinho-rodape" id="carrinho-rodape">
    <div class="resumo"><span>Total de itens</span><strong id="carrinho-total">0</strong></div>
    <div class="campos">
      <div id="carrinho-cliente"></div>
      <textarea id="cliente-obs" rows="2" placeholder="Observações (opcional)"></textarea>
    </div>
    <button class="btn btn-whats btn-bloco" id="btn-finalizar">${iconeWhats()} Comprar pelo WhatsApp</button>
    <p class="aviso">Você será direcionado ao WhatsApp de um de nossos vendedores com o seu pedido pronto.
      <button class="limpar" id="btn-limpar">Esvaziar carrinho</button></p>
  </div>
</aside>
<div class="modal" id="modal-produto" role="dialog" aria-modal="true" aria-hidden="true"></div>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
${window.Assistente ? "" : `<a class="whats-flutuante" data-whats aria-label="Fale conosco no WhatsApp">${iconeWhats()}</a>`}`;
    document.body.insertAdjacentHTML("beforeend", html);

    renderClienteCarrinho();

    $("#sobreposicao").addEventListener("click", fecharTudo);
    $("[data-fechar-carrinho]").addEventListener("click", fecharTudo);
    $("#btn-finalizar").addEventListener("click", finalizarPedido);
    $("#btn-limpar").addEventListener("click", () => {
      if (carrinho.length && confirm("Deseja remover todos os itens do carrinho?")) {
        carrinho = [];
        salvarCarrinho();
      }
    });
    $$(".btn-carrinho").forEach((b) => b.addEventListener("click", abrirCarrinho));
    document.addEventListener("keydown", (e) => e.key === "Escape" && fecharTudo());

    // Delegação de eventos dos itens do carrinho
    $("#carrinho-itens").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-acao]");
      if (!btn) return;
      const idx = +btn.closest("[data-idx]").dataset.idx;
      const acao = btn.dataset.acao;
      if (acao === "mais") carrinho[idx].qtd++;
      if (acao === "menos") carrinho[idx].qtd = Math.max(1, carrinho[idx].qtd - 1);
      if (acao === "remover") carrinho.splice(idx, 1);
      salvarCarrinho();
    });
    $("#carrinho-itens").addEventListener("change", (e) => {
      if (!e.target.matches("input")) return;
      const idx = +e.target.closest("[data-idx]").dataset.idx;
      carrinho[idx].qtd = Math.max(1, parseInt(e.target.value, 10) || 1);
      salvarCarrinho();
    });
  }

  function renderCarrinho() {
    const lista = $("#carrinho-itens");
    if (!lista) return;
    $("#carrinho-total").textContent = totalItens();
    $("#btn-finalizar").disabled = carrinho.length === 0;
    renderClienteCarrinho();

    if (!carrinho.length) {
      lista.innerHTML = `<div class="carrinho-vazio"><div class="icone">${ic("caixa")}</div>
        <p>Seu carrinho está vazio.</p><p><a href="produtos.html">Explore nossos produtos →</a></p></div>`;
      return;
    }
    lista.innerHTML = carrinho
      .map((item, idx) => {
        const p = buscarProduto(item.id);
        const cor = p.cores.find((c) => c.nome === item.cor) || p.cores[0];
        return `
<div class="item-carrinho" data-idx="${idx}">
  ${imgProduto(p, cor, FOTO_CARTAO, "mini-foto")}
  <div>
    <h4>${esc(p.nome)}</h4>
    <div class="detalhes"><i style="background:${cor.hex}"></i>${esc(cor.nome)} · ${esc(item.embalagem)}</div>
    <div class="quantidade">
      <button data-acao="menos" aria-label="Diminuir">−</button>
      <input type="number" min="1" value="${item.qtd}" aria-label="Quantidade">
      <button data-acao="mais" aria-label="Aumentar">+</button>
    </div>
  </div>
  <button class="remover" data-acao="remover">Remover</button>
</div>`;
      })
      .join("");
  }

  function abrirCarrinho() {
    fecharModal();
    $("#toast").classList.remove("visivel");
    $("#carrinho").classList.add("aberto");
    $("#carrinho").setAttribute("aria-hidden", "false");
    $("#sobreposicao").classList.add("aberto");
    document.body.style.overflow = "hidden";
  }

  function fecharTudo() {
    $("#carrinho").classList.remove("aberto");
    $("#carrinho").setAttribute("aria-hidden", "true");
    fecharModal();
    $("#sobreposicao").classList.remove("aberto");
    document.body.style.overflow = "";
  }

  /* ---------- Dados do cliente no carrinho ---------- */
  const logado = () => !!(Conta && Conta.usuario);

  function renderClienteCarrinho() {
    const box = $("#carrinho-cliente");
    if (!box) return;
    const btn = $("#btn-finalizar");
    const textoBtn = (t) => (btn.innerHTML = `${iconeWhats()} ${t}`);

    if (logado()) {
      const p = Conta.perfil || {};
      if (!Conta.perfilCompleto()) {
        box.innerHTML = `<div class="cliente-box alerta">Complete seu cadastro (endereço e documento) para finalizar o pedido.
          <a href="conta.html#dados">Completar cadastro →</a></div>`;
        textoBtn("Completar cadastro");
        return;
      }
      const titulo = p.tipo === "pj" ? p.razao_social : p.nome;
      box.innerHTML = `<div class="cliente-box"><span>Pedido em nome de</span><strong>${esc(titulo)}</strong>
        <small>${esc(p.cidade)}/${esc(p.uf)} · CEP ${esc(p.cep)}</small><a href="conta.html#dados">Alterar dados</a></div>`;
      textoBtn("Comprar pelo WhatsApp");
      return;
    }
    if (CFG.exigirLogin) {
      box.innerHTML = `<div class="cliente-box alerta">Entre ou crie sua conta para enviar o pedido com seus dados de faturamento e entrega.</div>`;
      textoBtn("Entrar para finalizar");
      return;
    }
    if ($("#cliente-nome")) return; // mantém o que o cliente já digitou
    const cliente = lerStorage(CHAVE_CLIENTE, {});
    box.innerHTML = `<input type="text" id="cliente-nome" placeholder="Seu nome" autocomplete="name" value="${esc(cliente.nome || "")}">
      <input type="text" id="cliente-cidade" placeholder="Cidade / Estado" autocomplete="address-level2" value="${esc(cliente.cidade || "")}">`;
    textoBtn("Comprar pelo WhatsApp");
  }

  function gerarNumeroPedido() {
    const d = new Date();
    const data = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
    return "PC-" + data + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  function linhasCliente(p, email) {
    const l = ["", "*Dados do cliente*"];
    if (p.tipo === "pj") {
      l.push(`Empresa: ${p.razao_social}${p.nome_fantasia ? " (" + p.nome_fantasia + ")" : ""}`);
      l.push(`CNPJ: ${p.cnpj}${p.inscricao_estadual ? " | IE: " + p.inscricao_estadual : ""}`);
      l.push(`Responsável: ${p.responsavel}`);
    } else {
      l.push(`Nome: ${p.nome}`);
      l.push(`CPF: ${p.cpf}`);
    }
    l.push(`Telefone: ${p.telefone}`);
    l.push(`E-mail: ${email}`);
    l.push("");
    l.push("*Endereço de entrega*");
    l.push(`${p.logradouro}, ${p.numero}${p.complemento ? " - " + p.complemento : ""}`);
    l.push(`${p.bairro ? p.bairro + " - " : ""}${p.cidade}/${p.uf} - CEP ${p.cep}`);
    return l;
  }

  function finalizarPedido() {
    if (!carrinho.length) return;
    if (!logado() && CFG.exigirLogin) {
      try { sessionStorage.setItem(CHAVE_VOLTAR, location.pathname.split("/").pop() || "index.html"); } catch (e) { /* ignora */ }
      location.href = "conta.html?voltar=carrinho";
      return;
    }
    if (logado() && !Conta.perfilCompleto()) {
      location.href = "conta.html#dados";
      return;
    }

    const obs = $("#cliente-obs").value.trim();
    const numero = gerarNumeroPedido();
    const linhas = [];
    linhas.push(`Olá! Vim pelo site da *${CFG.empresa}* e gostaria de fazer um pedido.`);
    linhas.push(`*Pedido nº ${numero}*`);
    linhas.push("");
    carrinho.forEach((item, i) => {
      const p = buscarProduto(item.id);
      linhas.push(`*${i + 1}. ${p.nome}*`);
      linhas.push(`   Cor: ${item.cor} | Embalagem: ${item.embalagem} | Qtd: ${item.qtd}`);
    });
    linhas.push("");
    linhas.push(`Total de itens: ${totalItens()}`);

    if (logado()) {
      linhas.push(...linhasCliente(Conta.perfil, Conta.usuario.email));
    } else {
      const nome = ($("#cliente-nome") || {}).value || "";
      const cidade = ($("#cliente-cidade") || {}).value || "";
      gravarStorage(CHAVE_CLIENTE, { nome: nome.trim(), cidade: cidade.trim() });
      if (nome.trim()) linhas.push(`Nome: ${nome.trim()}`);
      if (cidade.trim()) linhas.push(`Cidade: ${cidade.trim()}`);
    }
    if (obs) { linhas.push(""); linhas.push(`Observações: ${obs}`); }
    linhas.push("");
    linhas.push("Aguardo o orçamento. Obrigado!");

    window.open(linkWhatsApp(linhas.join("\n")), "_blank", "noopener");

    if (logado()) {
      const itens = carrinho.map((i) => ({ id: i.id, nome: buscarProduto(i.id).nome, cor: i.cor, embalagem: i.embalagem, qtd: i.qtd }));
      Conta.registrarPedido({ numero, itens, observacoes: obs }).catch((e) => console.warn("Pedido não registrado:", e.message));
      carrinho = [];
      $("#cliente-obs").value = "";
      salvarCarrinho();
      fecharTudo();
      mostrarToast(`Pedido <strong>${numero}</strong> enviado! Acompanhe em <a href="conta.html#pedidos" style="color:var(--destaque)">Minha conta</a>.`);
    }
  }

  /* ---------- Favoritos ---------- */
  const lerFavoritos = () => lerStorage(CHAVE_FAVORITOS, []).filter(buscarProduto);
  const ehFavorito = (id) => lerFavoritos().includes(id);
  function alternarFavorito(id) {
    let favs = lerFavoritos();
    favs = favs.includes(id) ? favs.filter((f) => f !== id) : favs.concat(id);
    gravarStorage(CHAVE_FAVORITOS, favs);
    const ativo = favs.includes(id);
    $$(`[data-fav="${CSS.escape(id)}"]`).forEach((b) => {
      b.classList.toggle("ativo", ativo);
      b.setAttribute("aria-pressed", ativo);
      b.innerHTML = ic("coracao");
    });
    mostrarToast(ativo ? "Adicionado aos favoritos" : "Removido dos favoritos");
    document.dispatchEvent(new CustomEvent("favoritos:alterados"));
  }
  const botaoFav = (id) => {
    const a = ehFavorito(id);
    return `<button class="btn-fav${a ? " ativo" : ""}" data-fav="${esc(id)}" aria-pressed="${a}" aria-label="Favoritar" title="Favoritar">${ic("coracao")}</button>`;
  };

  /* ---------- Modal de produto ---------- */
  const CHAVE_VISTOS = "policoating_vistos";
  const lerVistos = () => lerStorage(CHAVE_VISTOS, []).filter(buscarProduto);
  function registrarVisto(id) {
    gravarStorage(CHAVE_VISTOS, [id].concat(lerVistos().filter((x) => x !== id)).slice(0, 8));
  }

  const FOTO_CAIXA = "assets/img/marca/caixa-policoating.jpg";
  const caixaFoto = (classe) => `<img class="${classe || "caixa-foto"}" src="${FOTO_CAIXA}" alt="Caixa de tinta em pó Policoating" width="1072" height="1008">`;

  function abrirProduto(id, corNome) {
    const p = buscarProduto(id);
    if (!p) return;
    registrarVisto(id);
    const modal = $("#modal-produto");
    let corSel = p.cores.find((c) => c.nome === corNome) || p.cores[0], embSel = p.embalagens[0];
    const cat = CATEGORIAS[p.categoria] || {};

    modal.innerHTML = `
<button class="fechar" aria-label="Fechar">×</button>
<div class="modal-corpo">
  <div class="modal-vitrine">
    <div class="modal-foto" id="modal-vitrine">${imgProduto(p, corSel, FOTO_MODAL)}</div>
    <div class="modal-miniaturas" role="tablist" aria-label="Visualização">
      <button type="button" class="ativo" data-vista="foto" aria-label="Foto da cor">${imgProduto(p, corSel, FOTO_CARTAO, "mini-foto")}</button>
      <button type="button" data-vista="caixa" aria-label="Embalagem">${caixaFoto("mini-foto")}</button>
    </div>
    <p class="modal-legenda" id="modal-legenda">${esc(corSel.nome)} · ${esc(p.acabamento || "")}</p>
  </div>
  <div class="modal-info">
    <div class="modal-topo"><span class="etiqueta" style="position:static">${esc(cat.nome || "")}</span>${botaoFav(p.id)}</div>
    <h2>${esc(p.nome)}</h2>
    <p class="desc">${esc(p.descricao)}</p>
    <ul class="ficha">
      <li><span>Linha</span><span>${esc(p.linha)}</span></li>
      <li><span>Acabamento</span><span>${esc(p.acabamento)}</span></li>
      <li><span>Rendimento</span><span>${esc(p.rendimento)}</span></li>
      <li><span>Cura</span><span>${esc(p.cura)}</span></li>
      ${p.preco ? `<li><span>Preço a partir de</span><span>${formatarPreco(p.preco)}</span></li>` : ""}
    </ul>
    <div class="campo-titulo">Cor: <span id="nome-cor">${esc(corSel.nome)}</span></div>
    <div class="seletor-cores">
      ${p.cores.map((c, i) => `<button class="${c === corSel ? "ativo" : ""}" data-cor="${i}" style="background:${c.hex}" title="${esc(c.nome)}" aria-label="${esc(c.nome)}"></button>`).join("")}
    </div>
    <div class="campo-titulo">Embalagem (caixa)</div>
    <div class="seletor-embalagem">
      ${p.embalagens.map((e, i) => `<button class="${i === 0 ? "ativo" : ""}" data-emb="${esc(e)}">${esc(e)}</button>`).join("")}
    </div>
    <div class="acoes-extra">
      <button type="button" data-extra="amostra">${ic("paleta")}Solicitar amostra</button>
      <button type="button" data-extra="ficha">${ic("documento")}Ficha técnica</button>
      <button type="button" data-extra="link">${ic("link")}Copiar link</button>
    </div>
    <div class="linha-compra">
      <div class="quantidade">
        <button data-q="-1" aria-label="Diminuir">−</button>
        <input type="number" id="modal-qtd" min="1" value="1" aria-label="Quantidade">
        <button data-q="1" aria-label="Aumentar">+</button>
      </div>
      <button class="btn btn-primario" id="modal-add" style="flex:1">Adicionar ao carrinho</button>
    </div>
  </div>
</div>`;

    $(".fechar", modal).addEventListener("click", fecharTudo);
    let vista = "foto";
    const desenharVitrine = () => {
      const alvo = $("#modal-vitrine");
      alvo.classList.remove("trocando");
      void alvo.offsetWidth;
      alvo.classList.add("trocando");
      alvo.innerHTML = vista === "foto" ? imgProduto(p, corSel, FOTO_MODAL) : caixaFoto();
      const minis = $$(".modal-miniaturas button", modal);
      minis[0].innerHTML = imgProduto(p, corSel, FOTO_CARTAO, "mini-foto");
      minis.forEach((m) => m.classList.toggle("ativo", m.dataset.vista === vista));
      $("#modal-legenda").textContent = vista === "foto" ? `${corSel.nome} · ${p.acabamento || ""}` : "Embalagem: caixa de papelão Policoating";
    };
    $$(".modal-miniaturas button", modal).forEach((b) => b.addEventListener("click", () => { vista = b.dataset.vista; desenharVitrine(); }));
    $$("[data-cor]", modal).forEach((b) =>
      b.addEventListener("click", () => {
        corSel = p.cores[+b.dataset.cor];
        $$("[data-cor]", modal).forEach((x) => x.classList.toggle("ativo", x === b));
        $("#nome-cor").textContent = corSel.nome;
        desenharVitrine();
      })
    );
    $$("[data-emb]", modal).forEach((b) =>
      b.addEventListener("click", () => {
        embSel = b.dataset.emb;
        $$("[data-emb]", modal).forEach((x) => x.classList.toggle("ativo", x === b));
      })
    );
    const qtd = $("#modal-qtd");
    $$("[data-q]", modal).forEach((b) =>
      b.addEventListener("click", () => (qtd.value = Math.max(1, (parseInt(qtd.value, 10) || 1) + +b.dataset.q)))
    );
    $$("[data-extra]", modal).forEach((b) =>
      b.addEventListener("click", () => {
        const tipo = b.dataset.extra;
        if (tipo === "link") {
          const url = location.origin + location.pathname.replace(/[^/]*$/, "") + "produtos.html#produto=" + encodeURIComponent(p.id);
          (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(
            () => mostrarToast("Link do produto copiado!"),
            () => prompt("Copie o link do produto:", url)
          );
          return;
        }
        const msg = tipo === "amostra"
          ? `Olá! Gostaria de solicitar uma amostra (painel) do produto *${p.nome}* na cor *${corSel.nome}*.`
          : `Olá! Gostaria de receber a ficha técnica (BT) e a FISPQ do produto *${p.nome}*.`;
        window.open(linkWhatsApp(msg), "_blank", "noopener");
      })
    );
    $("#modal-add").addEventListener("click", () => {
      adicionarAoCarrinho(p.id, corSel.nome, embSel, qtd.value);
      fecharTudo();
    });

    modal.classList.add("aberto");
    modal.setAttribute("aria-hidden", "false");
    $("#sobreposicao").classList.add("aberto");
    document.body.style.overflow = "hidden";
  }

  function fecharModal() {
    const m = $("#modal-produto");
    if (m) {
      m.classList.remove("aberto");
      m.setAttribute("aria-hidden", "true");
    }
  }

  /* ---------- Cartões de produto ---------- */
  function cartaoProduto(p) {
    const cat = CATEGORIAS[p.categoria] || {};
    const amostras = p.cores.slice(0, 6).map((c, i) => `<span class="amostra${i === 0 ? " ativa" : ""}" data-amostra="${i}" style="background:${c.hex}" title="${esc(c.nome)}"></span>`).join("");
    const extra = p.cores.length > 6 ? `<small>+${p.cores.length - 6}</small>` : "";
    return `
<article class="cartao-produto revelar" data-id="${esc(p.id)}">
  <div class="vitrine" data-abrir="${esc(p.id)}">
    <span class="etiqueta">${esc(cat.nome || "")}</span>
    ${botaoFav(p.id)}
    ${imgProduto(p, p.cores[0], FOTO_CARTAO)}
    <span class="ver-detalhes">Ver cores e detalhes</span>
  </div>
  <div class="info">
    <span class="linha">${esc(p.linha)}</span>
    <h3>${esc(p.nome)}</h3>
    <p class="desc">${esc(p.descricao)}</p>
    <div class="amostras">${amostras}${extra}</div>
    <div class="rodape-cartao">
      <span class="preco">${p.preco ? `<small>a partir de</small>${formatarPreco(p.preco)}` : `<small>Preço</small>Sob consulta`}</span>
      <button class="btn btn-primario btn-add" data-abrir="${esc(p.id)}">+ Carrinho</button>
    </div>
  </div>
</article>`;
  }

  function renderProdutos(container, lista) {
    if (!container) return;
    container.innerHTML = lista.length
      ? lista.map(cartaoProduto).join("")
      : `<div class="vazio"><div class="icone-vazio">${ic("busca")}</div><p>Nenhum produto encontrado. Tente outra busca ou categoria.</p></div>`;
    observarRevelar();
  }

  // Passar o mouse (ou tocar) nas bolinhas troca a foto do cartão
  function trocarFotoCartao(amostra) {
    const cartao = amostra.closest(".cartao-produto");
    const p = cartao && buscarProduto(cartao.dataset.id);
    if (!p) return;
    const cor = p.cores[+amostra.dataset.amostra];
    const img = $(".foto-produto", cartao);
    if (!cor || !img) return;
    img.dataset.cor = cor.nome;
    delete img.dataset.trocada;
    img.src = fotoProduto(p, cor, FOTO_CARTAO);
    img.alt = `${p.nome} — ${cor.nome}`;
    $$(".amostra", cartao).forEach((a) => a.classList.toggle("ativa", a === amostra));
  }
  document.addEventListener("mouseover", (e) => {
    const a = e.target.closest("[data-amostra]");
    if (a) trocarFotoCartao(a);
  });

  document.addEventListener("click", (e) => {
    const amostra = e.target.closest("[data-amostra]");
    if (amostra) { trocarFotoCartao(amostra); return; }
    const fav = e.target.closest("[data-fav]");
    if (fav) { alternarFavorito(fav.dataset.fav); return; }
    const alvo = e.target.closest("[data-abrir]");
    if (alvo) abrirProduto(alvo.dataset.abrir);
  });

  /* ---------- Toast ---------- */
  let timerToast;
  function mostrarToast(html, comAcao) {
    const t = $("#toast");
    t.innerHTML = `<span>${html}</span>${comAcao ? '<button type="button">Ver carrinho</button>' : ""}`;
    if (comAcao) $("button", t).addEventListener("click", abrirCarrinho);
    t.classList.add("visivel");
    clearTimeout(timerToast);
    timerToast = setTimeout(() => t.classList.remove("visivel"), 3500);
  }

  /* ---------- Animações de entrada ---------- */
  let observador;
  function observarRevelar() {
    const elementos = $$(".revelar:not(.visivel)");
    if (!("IntersectionObserver" in window)) {
      elementos.forEach((el) => el.classList.add("visivel"));
      return;
    }
    observador = observador || new IntersectionObserver(
      (entradas) => entradas.forEach((en) => {
        if (en.isIntersecting) {
          if (!en.target.parentElement) { observador.unobserve(en.target); return; }
          const irmaos = Array.from(en.target.parentElement.children).filter((c) => c.classList.contains("revelar"));
          const i = Math.max(0, irmaos.indexOf(en.target));
          en.target.style.transitionDelay = Math.min(i, 6) * 70 + "ms";
          en.target.classList.add("visivel");
          observador.unobserve(en.target);
          setTimeout(() => (en.target.style.transitionDelay = ""), 1200);
        }
      }),
      { threshold: 0.12 }
    );
    elementos.forEach((el) => observador.observe(el));
  }

  function iconeWhats() {
    return `<svg viewBox="0 0 32 32" width="20" height="20" aria-hidden="true" fill="currentColor"><path d="M16.04 3C8.86 3 3.03 8.82 3.03 16c0 2.29.6 4.53 1.74 6.5L3 29l6.68-1.75A12.94 12.94 0 0 0 16.04 29C23.2 29 29 23.18 29 16S23.2 3 16.04 3zm0 23.6c-1.97 0-3.9-.53-5.58-1.53l-.4-.24-3.96 1.04 1.06-3.86-.26-.4A10.56 10.56 0 0 1 5.44 16c0-5.85 4.76-10.6 10.6-10.6 5.84 0 10.57 4.75 10.57 10.6 0 5.84-4.74 10.6-10.57 10.6zm5.81-7.93c-.32-.16-1.9-.94-2.19-1.04-.3-.11-.51-.16-.73.16-.21.32-.83 1.04-1.02 1.26-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.73-1.75-1-2.4-.26-.63-.53-.54-.73-.55h-.62c-.21 0-.56.08-.85.4-.3.32-1.12 1.09-1.12 2.66s1.14 3.09 1.3 3.3c.16.21 2.25 3.43 5.44 4.81.76.33 1.35.52 1.81.67.76.24 1.46.21 2 .13.61-.09 1.9-.78 2.16-1.53.27-.75.27-1.39.19-1.53-.08-.13-.29-.21-.61-.37z"/></svg>`;
  }

  /* ---------- Aviso LGPD ---------- */
  function avisoLgpd() {
    if (lerStorage(CHAVE_LGPD, false)) return;
    document.body.insertAdjacentHTML("beforeend", `<div class="aviso-lgpd" role="region" aria-label="Aviso de privacidade">
      <p>Usamos o armazenamento do seu navegador para manter o carrinho, os favoritos e o login. Saiba mais na
      <a href="privacidade.html">Política de Privacidade</a>.</p><button class="btn btn-primario" type="button">Entendi</button></div>`);
    $(".aviso-lgpd button").addEventListener("click", () => { gravarStorage(CHAVE_LGPD, true); $(".aviso-lgpd").remove(); });
  }

  /* ---------- Link "Entrar / Minha conta" no cabeçalho ---------- */
  function atualizarCabecalhoConta() {
    $$(".link-conta").forEach((a) => {
      const t = $(".texto", a);
      if (logado()) { t.textContent = Conta.nomeExibicao() || "Minha conta"; a.title = "Minha conta"; a.classList.add("logado"); }
      else { t.textContent = "Entrar"; a.title = "Entrar ou criar conta"; a.classList.remove("logado"); }
    });
  }

  /* ---------- Inicialização ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    montarEstruturaCarrinho();
    aplicarConfig();
    iniciarMenu();
    renderCarrinho();
    atualizarContador(false);
    observarRevelar();
    avisoLgpd();
    if (location.hash.startsWith("#produto=")) abrirProduto(decodeURIComponent(location.hash.slice(9)));
    if (Conta) {
      Conta.aoMudar(() => { atualizarCabecalhoConta(); renderClienteCarrinho(); });
      atualizarCabecalhoConta();
      renderClienteCarrinho();
    }
    if (location.hash === "#carrinho" && carrinho.length) {
      history.replaceState(null, "", location.pathname + location.search);
      (window.ContaPronta || Promise.resolve()).then(abrirCarrinho);
    }
  });

  /* API pública usada pelas páginas */
  window.ColorWeg = { lerVistos, iconeWhats, totalItens: () => totalItens(), itensCarrinho: () => carrinho.slice(), fotoProduto, imgProduto, lerFavoritos, alternarFavorito, gravarStorage, lerStorage, buscarProduto, $, $$, caixaSVG, renderProdutos, abrirProduto, adicionarAoCarrinho, linkWhatsApp, ehEscura, esc, observarRevelar, mostrarToast, abrirCarrinho };
})();
