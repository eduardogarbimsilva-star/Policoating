/* =========================================================
   Color Weg Tintas — scripts comuns a todas as páginas
   (carrinho, modal de produto, WhatsApp, menu, animações)
   ========================================================= */
(function () {
  "use strict";

  const CFG = window.SITE_CONFIG || {};
  const PRODUTOS = window.PRODUTOS || [];
  const CATEGORIAS = window.CATEGORIAS || {};
  const CHAVE_CARRINHO = "colorweg_carrinho";
  const CHAVE_CLIENTE = "colorweg_cliente";

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

  /* ---------- Ilustração da lata de tinta (SVG) ---------- */
  let idSvg = 0;
  function lataSVG(cor, rotulo, classe) {
    const id = "lt" + ++idSvg;
    const nome = esc(rotulo || CFG.empresa || "");
    return `
<svg class="${classe || ""}" viewBox="0 0 200 230" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Lata de tinta ${nome}">
  <defs>
    <linearGradient id="${id}m" x1="0" x2="1">
      <stop offset="0" stop-color="#9aa3ad"/><stop offset=".25" stop-color="#eef2f5"/>
      <stop offset=".6" stop-color="#c3cad1"/><stop offset="1" stop-color="#7d8792"/>
    </linearGradient>
    <linearGradient id="${id}s" x1="0" x2="1">
      <stop offset="0" stop-color="#000" stop-opacity=".18"/><stop offset=".3" stop-color="#fff" stop-opacity=".25"/>
      <stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/>
    </linearGradient>
  </defs>
  <path d="M40 58 C40 8 160 8 160 58" fill="none" stroke="#6c7682" stroke-width="5" stroke-linecap="round"/>
  <rect x="24" y="52" width="152" height="164" rx="10" fill="url(#${id}m)"/>
  <rect x="24" y="78" width="152" height="112" fill="#fff"/>
  <rect x="24" y="78" width="152" height="44" fill="${cor}"/>
  <path d="M24 122 h152 v8 c-14 0 -14 10 -28 10 s-14 -10 -28 -10 s-14 12 -28 12 s-14 -12 -28 -12 s-14 8 -28 8 s-12 -8 -12 -8z" fill="${cor}"/>
  <rect x="24" y="182" width="152" height="8" fill="#00579d"/>
  <text x="100" y="163" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-weight="800" font-size="17" fill="#0a1f3a">COLOR WEG</text>
  <text x="100" y="178" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-weight="600" font-size="8.5" letter-spacing="1.5" fill="#5a6775">TINTAS</text>
  <rect x="24" y="52" width="152" height="164" rx="10" fill="url(#${id}s)"/>
  <ellipse cx="100" cy="52" rx="76" ry="12" fill="#b9c1c9"/>
  <ellipse cx="100" cy="50" rx="68" ry="9" fill="${cor}" stroke="#8b949e" stroke-width="2"/>
  <ellipse cx="86" cy="48" rx="20" ry="3" fill="#fff" opacity=".35"/>
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
      const r = el.getAttribute("data-rede");
      if (CFG.redes && CFG.redes[r]) el.href = CFG.redes[r];
    });
    $$("[data-ano]").forEach((el) => (el.textContent = new Date().getFullYear()));
    $$("[data-anos-mercado]").forEach((el) => (el.textContent = new Date().getFullYear() - (CFG.fundacao || 1998)));
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
    <h3>🛒 Seu carrinho</h3>
    <button class="fechar" data-fechar-carrinho aria-label="Fechar carrinho">×</button>
  </div>
  <div class="carrinho-itens" id="carrinho-itens"></div>
  <div class="carrinho-rodape" id="carrinho-rodape">
    <div class="resumo"><span>Total de itens</span><strong id="carrinho-total">0</strong></div>
    <div class="campos">
      <input type="text" id="cliente-nome" placeholder="Seu nome" autocomplete="name">
      <input type="text" id="cliente-cidade" placeholder="Cidade / Estado" autocomplete="address-level2">
      <textarea id="cliente-obs" rows="2" placeholder="Observações (opcional)"></textarea>
    </div>
    <button class="btn btn-whats btn-bloco" id="btn-finalizar">${iconeWhats()} Comprar pelo WhatsApp</button>
    <p class="aviso">Você será direcionado ao WhatsApp de um de nossos vendedores com o seu pedido pronto.
      <button class="limpar" id="btn-limpar">Esvaziar carrinho</button></p>
  </div>
</aside>
<div class="modal" id="modal-produto" role="dialog" aria-modal="true" aria-hidden="true"></div>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<a class="whats-flutuante" data-whats aria-label="Fale conosco no WhatsApp">${iconeWhats()}</a>`;
    document.body.insertAdjacentHTML("beforeend", html);

    const cliente = lerStorage(CHAVE_CLIENTE, {});
    $("#cliente-nome").value = cliente.nome || "";
    $("#cliente-cidade").value = cliente.cidade || "";

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

    if (!carrinho.length) {
      lista.innerHTML = `<div class="carrinho-vazio"><div class="icone">🎨</div>
        <p>Seu carrinho está vazio.</p><p><a href="produtos.html">Explore nossos produtos →</a></p></div>`;
      return;
    }
    lista.innerHTML = carrinho
      .map((item, idx) => {
        const p = buscarProduto(item.id);
        const cor = p.cores.find((c) => c.nome === item.cor) || p.cores[0];
        return `
<div class="item-carrinho" data-idx="${idx}">
  ${lataSVG(cor.hex)}
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

  function finalizarPedido() {
    if (!carrinho.length) return;
    const nome = $("#cliente-nome").value.trim();
    const cidade = $("#cliente-cidade").value.trim();
    const obs = $("#cliente-obs").value.trim();
    gravarStorage(CHAVE_CLIENTE, { nome, cidade });

    const linhas = [];
    linhas.push(`Olá! Vim pelo site da *${CFG.empresa}* e gostaria de fazer um pedido:`);
    linhas.push("");
    carrinho.forEach((item, i) => {
      const p = buscarProduto(item.id);
      linhas.push(`*${i + 1}. ${p.nome}*`);
      linhas.push(`   Cor: ${item.cor} | Embalagem: ${item.embalagem} | Qtd: ${item.qtd}`);
    });
    linhas.push("");
    linhas.push(`Total de itens: ${totalItens()}`);
    if (nome) linhas.push(`Nome: ${nome}`);
    if (cidade) linhas.push(`Cidade: ${cidade}`);
    if (obs) linhas.push(`Observações: ${obs}`);
    linhas.push("");
    linhas.push("Aguardo o orçamento. Obrigado!");

    window.open(linkWhatsApp(linhas.join("\n")), "_blank", "noopener");
  }

  /* ---------- Modal de produto ---------- */
  function abrirProduto(id) {
    const p = buscarProduto(id);
    if (!p) return;
    const modal = $("#modal-produto");
    let corSel = p.cores[0], embSel = p.embalagens[0];
    const cat = CATEGORIAS[p.categoria] || {};

    modal.innerHTML = `
<button class="fechar" aria-label="Fechar">×</button>
<div class="modal-corpo">
  <div class="modal-vitrine" id="modal-vitrine">${lataSVG(corSel.hex)}</div>
  <div class="modal-info">
    <span class="etiqueta" style="position:static">${esc(cat.nome || "")}</span>
    <h2>${esc(p.nome)}</h2>
    <p class="desc">${esc(p.descricao)}</p>
    <ul class="ficha">
      <li><span>Linha</span><span>${esc(p.linha)}</span></li>
      <li><span>Rendimento</span><span>${esc(p.rendimento)}</span></li>
      <li><span>Secagem</span><span>${esc(p.secagem)}</span></li>
      ${p.preco ? `<li><span>Preço a partir de</span><span>${formatarPreco(p.preco)}</span></li>` : ""}
    </ul>
    <div class="campo-titulo">Cor: <span id="nome-cor">${esc(corSel.nome)}</span></div>
    <div class="seletor-cores">
      ${p.cores.map((c, i) => `<button class="${i === 0 ? "ativo" : ""}" data-cor="${i}" style="background:${c.hex}" title="${esc(c.nome)}" aria-label="${esc(c.nome)}"></button>`).join("")}
    </div>
    <div class="campo-titulo">Embalagem</div>
    <div class="seletor-embalagem">
      ${p.embalagens.map((e, i) => `<button class="${i === 0 ? "ativo" : ""}" data-emb="${esc(e)}">${esc(e)}</button>`).join("")}
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
    $$("[data-cor]", modal).forEach((b) =>
      b.addEventListener("click", () => {
        corSel = p.cores[+b.dataset.cor];
        $$("[data-cor]", modal).forEach((x) => x.classList.toggle("ativo", x === b));
        $("#nome-cor").textContent = corSel.nome;
        $("#modal-vitrine").innerHTML = lataSVG(corSel.hex);
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
    const amostras = p.cores.slice(0, 6).map((c) => `<span class="amostra" style="background:${c.hex}" title="${esc(c.nome)}"></span>`).join("");
    const extra = p.cores.length > 6 ? `<small>+${p.cores.length - 6}</small>` : "";
    return `
<article class="cartao-produto revelar" data-id="${esc(p.id)}">
  <div class="vitrine" data-abrir="${esc(p.id)}">
    <span class="etiqueta">${esc(cat.nome || "")}</span>
    ${lataSVG(p.cores[0].hex)}
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
      : `<div class="vazio"><p style="font-size:2.4rem">🔎</p><p>Nenhum produto encontrado. Tente outra busca ou categoria.</p></div>`;
    observarRevelar();
  }

  document.addEventListener("click", (e) => {
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
          en.target.classList.add("visivel");
          observador.unobserve(en.target);
        }
      }),
      { threshold: 0.12 }
    );
    elementos.forEach((el) => observador.observe(el));
  }

  function iconeWhats() {
    return `<svg viewBox="0 0 32 32" width="20" height="20" aria-hidden="true" fill="currentColor"><path d="M16.04 3C8.86 3 3.03 8.82 3.03 16c0 2.29.6 4.53 1.74 6.5L3 29l6.68-1.75A12.94 12.94 0 0 0 16.04 29C23.2 29 29 23.18 29 16S23.2 3 16.04 3zm0 23.6c-1.97 0-3.9-.53-5.58-1.53l-.4-.24-3.96 1.04 1.06-3.86-.26-.4A10.56 10.56 0 0 1 5.44 16c0-5.85 4.76-10.6 10.6-10.6 5.84 0 10.57 4.75 10.57 10.6 0 5.84-4.74 10.6-10.57 10.6zm5.81-7.93c-.32-.16-1.9-.94-2.19-1.04-.3-.11-.51-.16-.73.16-.21.32-.83 1.04-1.02 1.26-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.73-1.75-1-2.4-.26-.63-.53-.54-.73-.55h-.62c-.21 0-.56.08-.85.4-.3.32-1.12 1.09-1.12 2.66s1.14 3.09 1.3 3.3c.16.21 2.25 3.43 5.44 4.81.76.33 1.35.52 1.81.67.76.24 1.46.21 2 .13.61-.09 1.9-.78 2.16-1.53.27-.75.27-1.39.19-1.53-.08-.13-.29-.21-.61-.37z"/></svg>`;
  }

  /* ---------- Inicialização ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    montarEstruturaCarrinho();
    aplicarConfig();
    iniciarMenu();
    renderCarrinho();
    atualizarContador(false);
    observarRevelar();
    if (location.hash.startsWith("#produto=")) abrirProduto(decodeURIComponent(location.hash.slice(9)));
  });

  /* API pública usada pelas páginas */
  window.ColorWeg = { lataSVG, renderProdutos, abrirProduto, adicionarAoCarrinho, linkWhatsApp, ehEscura, esc, observarRevelar, mostrarToast, abrirCarrinho };
})();
