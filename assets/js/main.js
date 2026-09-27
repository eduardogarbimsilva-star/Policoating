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
  const fotosDe = (p) => (Array.isArray(p.fotos) ? p.fotos.filter((u) => typeof u === "string" && u) : []);
  const imgFoto = (u, alt, classe) => `<img class="${classe || "foto-real"}" src="${esc(u)}" alt="${esc(alt || "")}" decoding="async" loading="lazy">`;
  function imgProduto(p, cor, tam, classe) {
    cor = cor || p.cores[0];
    if (!Fotos) return caixaSVG(cor.hex);
    return `<img class="${classe || "foto-produto"}" src="${esc(fotoProduto(p, cor, tam))}" alt="${esc(p.nome)} — ${esc(cor.nome)}" width="${tam.largura}" height="${tam.altura}" decoding="async" data-produto="${esc(p.id)}" data-cor="${esc(cor.nome)}">`;
  }

  /* ---------- Utilidades ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const buscarProduto = (id) => PRODUTOS.find((p) => p.id === id);
  /** Acha o produto pelo código ou pela linha de origem + cor (links e pedidos antigos, fotos de inspiração) */
  const acharProduto = (ref, corNome) => buscarProduto(ref) ||
    PRODUTOS.find((p) => p.familia === ref && (!corNome || p.cores[0].nome === corNome)) || PRODUTOS.find((p) => p.familia === ref);
  const formatarPreco = (v) => (+v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  /** Preço do produto: "combinar" (a combinar com o vendedor), "normal" ou "promo" (valores por kg) */
  function precoInfo(p) {
    const preco = +p.preco || 0, promo = +p.precoPromo || 0;
    if (p.precoCombinar || !(preco > 0)) return { tipo: "combinar", efetivo: 0 };
    const hoje = new Date().toISOString().slice(0, 10);
    if (promo > 0 && promo < preco && (!p.promoAte || hoje <= p.promoAte))
      return { tipo: "promo", preco, promo, efetivo: promo, desconto: Math.round((1 - promo / preco) * 100), ate: p.promoAte || "" };
    return { tipo: "normal", preco, efetivo: preco };
  }
  const dataCurtaBR = (iso) => (iso ? iso.split("-").reverse().join("/") : "");
  function htmlPreco(p, detalhado) {
    const pi = precoInfo(p);
    if (pi.tipo === "combinar") return `<span class="preco preco-combinar"><small>Preço</small>Valor a combinar com o vendedor</span>`;
    const caixa = detalhado ? (() => { const kg = kgDaEmbalagem(embalagemPadrao(p)); return kg ? `<small class="preco-caixa">Caixa ${kg} kg: ${formatarPreco(pi.efetivo * kg)}</small>` : ""; })() : "";
    if (pi.tipo === "promo") return `<span class="preco preco-promo"><small><s>${formatarPreco(pi.preco)}</s> <b class="selo-off">-${pi.desconto}%</b></small>${formatarPreco(pi.promo)}<em>/kg</em>${pi.ate && detalhado ? `<small>Promoção até ${dataCurtaBR(pi.ate)}</small>` : ""}${caixa}</span>`;
    return `<span class="preco"><small>Preço</small>${formatarPreco(pi.preco)}<em>/kg</em>${caixa}</span>`;
  }

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
    // redes sociais e lojas: cada link só aparece se o endereço estiver configurado
    $$("[data-rede], [data-loja]").forEach((el) => {
      const url = el.dataset.rede ? (CFG.redes || {})[el.dataset.rede] : (CFG.lojas || {})[el.dataset.loja];
      const ok = !!(url && /^https:\/\//.test(url));
      if (ok) { el.href = url; el.target = "_blank"; el.rel = "noopener"; }
      el.hidden = !ok;
    });
    $$("[data-canais]").forEach((box) => { box.hidden = !box.querySelector("[data-rede]:not([hidden]), [data-loja]:not([hidden])"); });
    $$("[data-ano]").forEach((el) => (el.textContent = new Date().getFullYear()));
  }

  document.addEventListener("config-atualizada", () => aplicarConfig());   // mudanças feitas no painel

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
  // itens antigos (produto com várias cores) são trocados pelo produto da mesma cor
  let carrinho = lerStorage(CHAVE_CARRINHO, []).map((i) => { const p = acharProduto(i.id, i.cor); return p ? Object.assign(i, { id: p.id, cor: p.cores[0].nome }) : null; }).filter(Boolean);

  const chaveItem = (i) => `${i.id}|${i.cor}|${i.embalagem}`;
  // "Sob medida": o cliente informa o total em kg (qtd = kg). Caixas: qtd = número de caixas.
  const SOB_MEDIDA = "Sob medida";
  const ehSobMedida = (emb) => emb === SOB_MEDIDA;
  // Estoque: { id: kg }. null = estoque ainda não usado (não limita a compra).
  let estoqueAtual = null, promessaEstoque = null;
  function carregarEstoque(forcar) {
    if (!promessaEstoque || forcar) {
      promessaEstoque = (window.Catalogo && window.Catalogo.estoquePublico ? window.Catalogo.estoquePublico() : Promise.resolve(null))
        .then((m) => { estoqueAtual = m; document.dispatchEvent(new CustomEvent("estoque-atualizado")); return m; });
    }
    return promessaEstoque;
  }
  const controlaEstoque = () => estoqueAtual !== null;
  const saldoDe = (id) => (controlaEstoque() ? estoqueAtual[id] || 0 : Infinity);
  const kgNoCarrinho = (id, ignorar) => carrinho.reduce((s, i, k) => s + (i.id === id && k !== ignorar ? kgDoItem(i) : 0), 0);
  /** Maior quantidade possível para o item (caixas ou kg), pelo estoque que ainda não está no carrinho */
  function maxPorEstoque(id, emb, ignorar) {
    const livre = saldoDe(id) - kgNoCarrinho(id, ignorar);
    if (livre === Infinity) return Infinity;
    return ehSobMedida(emb) ? Math.floor(livre) : Math.floor(livre / (kgDaEmbalagem(emb) || 1));
  }
  const fmtKg = (n) => (Math.round(n * 100) / 100).toLocaleString("pt-BR") + " kg";
  function htmlEstoque(p) {
    if (!controlaEstoque()) return "";
    const kg = saldoDe(p.id);
    if (kg <= 0) return `<span class="estoque esgotado">Esgotado</span>`;
    const cx = Math.floor(kg / 25);
    return `<span class="estoque disponivel">${fmtKg(kg)} em estoque${cx ? ` <small>(≈ ${cx} ${cx === 1 ? "caixa" : "caixas"} de 25 kg)</small>` : ""}</span>`;
  }
  // limites por item: até 2.000 caixas ou 50.000 kg sob medida (acima disso, o vendedor atende direto)
  const QTD_MAX = { caixas: 2000, kg: 50000 };
  const limitarQtd = (emb, n) => Math.min(ehSobMedida(emb) ? QTD_MAX.kg : QTD_MAX.caixas, Math.max(1, parseInt(n, 10) || 1));
  const kgDaEmbalagem = (emb) => { const m = String(emb || "").match(/(\d+(?:[.,]\d+)?)\s*kg/i); return m ? parseFloat(m[1].replace(",", ".")) : 0; };
  const kgDoItem = (i) => (ehSobMedida(i.embalagem) ? i.qtd : i.qtd * kgDaEmbalagem(i.embalagem));
  const embalagemPadrao = (p) => p.embalagens.find((e) => kgDaEmbalagem(e) === 25) || p.embalagens[0];
  const descreverQtd = (i) => (ehSobMedida(i.embalagem)
    ? `${i.qtd} kg (quantidade sob medida)`
    : `${i.qtd} × ${i.embalagem}${kgDaEmbalagem(i.embalagem) ? ` (${kgDoItem(i).toLocaleString("pt-BR")} kg)` : ""}`);
  const totalItens = () => carrinho.reduce((s, i) => s + (ehSobMedida(i.embalagem) ? 1 : i.qtd), 0);
  const totalKg = () => carrinho.reduce((s, i) => s + kgDoItem(i), 0);
  /** Valor estimado do carrinho (preço por kg × kg). Itens "a combinar" ficam de fora e são contados. */
  function totalValor() {
    return carrinho.reduce((t, i) => {
      const p = buscarProduto(i.id), pi = p ? precoInfo(p) : { tipo: "combinar" };
      if (pi.tipo === "combinar") t.combinar++; else t.valor += Math.round(pi.efetivo * kgDoItem(i) * 100) / 100;
      return t;
    }, { valor: 0, combinar: 0 });
  }

  function salvarCarrinho() {
    gravarStorage(CHAVE_CARRINHO, carrinho);
    renderCarrinho();
    atualizarContador(true);
  }

  function adicionarAoCarrinho(id, cor, embalagem, qtd) {
    const p = acharProduto(id, cor);
    if (!p) return false;
    const item = { id: p.id, cor: p.cores[0].nome, embalagem: embalagem || embalagemPadrao(p), qtd: 1 };
    item.qtd = limitarQtd(item.embalagem, qtd);
    const existente = carrinho.find((i) => chaveItem(i) === chaveItem(item));
    // estoque: só o que ainda está disponível
    const max = maxPorEstoque(p.id, item.embalagem, existente ? carrinho.indexOf(existente) : -1) - (existente ? 0 : 0);
    const desejado = (existente ? existente.qtd : 0) + item.qtd;
    if (max !== Infinity && desejado > max) {
      if (max <= (existente ? existente.qtd : 0) || max < 1) {
        mostrarToast(saldoDe(p.id) <= 0 ? `<strong>${esc(p.nome)}</strong> está esgotado. Peça um orçamento pelo WhatsApp.` : `Você já tem no carrinho todo o estoque disponível de <strong>${esc(p.nome)}</strong> (${fmtKg(saldoDe(p.id))}).`);
        return false;
      }
      mostrarToast(`Só temos ${fmtKg(saldoDe(p.id))} de <strong>${esc(p.nome)}</strong>. Ajustamos a quantidade ao estoque.`, true);
      if (existente) existente.qtd = max; else carrinho.push(Object.assign(item, { qtd: max }));
      salvarCarrinho();
      return true;
    }
    if (existente) existente.qtd = limitarQtd(item.embalagem, desejado);
    else carrinho.push(item);
    salvarCarrinho();
    mostrarToast(`<strong>${esc(p.nome)}</strong> adicionado ao carrinho`, true);
    return true;
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
    <div class="resumo-kg" id="carrinho-kg"></div>
    <div class="resumo-valor" id="carrinho-valor"></div>
    <div class="resumo-prazo" id="carrinho-prazo"></div>
    <div class="campos">
      <div id="carrinho-cliente"></div>
      <textarea id="cliente-obs" rows="2" maxlength="500" placeholder="Observações (opcional)"></textarea>
    </div>
    <button class="btn btn-primario btn-bloco" id="btn-finalizar">Finalizar compra</button>
    <p class="aviso">O pedido vai direto para a nossa equipe. Frete e pagamento você combina com o vendedor pelo chat do pedido, em Minha conta.
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
      const passo = ehSobMedida(carrinho[idx].embalagem) ? 5 : 1;       // sob medida anda de 5 em 5 kg
      if (acao === "mais") {
        const max = maxPorEstoque(carrinho[idx].id, carrinho[idx].embalagem, idx);
        if (carrinho[idx].qtd + passo > max) { mostrarToast(`Estoque disponível: ${fmtKg(saldoDe(carrinho[idx].id))}.`); carrinho[idx].qtd = Math.max(1, Math.min(max, carrinho[idx].qtd)); }
        else carrinho[idx].qtd = limitarQtd(carrinho[idx].embalagem, carrinho[idx].qtd + passo);
      }
      if (acao === "menos") carrinho[idx].qtd = limitarQtd(carrinho[idx].embalagem, carrinho[idx].qtd - passo);
      if (acao === "remover") carrinho.splice(idx, 1);
      salvarCarrinho();
    });
    $("#carrinho-itens").addEventListener("change", (e) => {
      if (!e.target.matches("input")) return;
      const idx = +e.target.closest("[data-idx]").dataset.idx;
      const max = maxPorEstoque(carrinho[idx].id, carrinho[idx].embalagem, idx);
      let n = limitarQtd(carrinho[idx].embalagem, e.target.value);
      if (n > max) { n = Math.max(1, max); mostrarToast(`Estoque disponível: ${fmtKg(saldoDe(carrinho[idx].id))}. Ajustamos a quantidade.`); }
      carrinho[idx].qtd = n;
      salvarCarrinho();
    });
  }

  function renderCarrinho() {
    const lista = $("#carrinho-itens");
    if (!lista) return;
    $("#carrinho-total").textContent = totalItens();
    const kg = $("#carrinho-kg");
    if (kg) kg.textContent = carrinho.length ? `≈ ${totalKg().toLocaleString("pt-BR")} kg de tinta` : "";
    const pz = $("#carrinho-prazo");
    if (pz) {
      const perf = (Conta && Conta.perfil) || {}, info = window.Loja && carrinho.length && perf.cep ? window.Loja.prazo(perf.uf, perf.cep) : null;
      pz.innerHTML = info ? `${ic("relogio")}<span>Envio <strong>${esc(window.Loja.textoEnvio(info.envio))}</strong>. Chega entre <strong>${esc(window.Loja.dataBR(info.entregaMin))}</strong> e <strong>${esc(window.Loja.dataBR(info.entregaMax))}</strong> em ${esc(perf.cidade || "")}/${esc(perf.uf || "")}.<small>Estimativa a partir de Matão-SP (${esc(info.regiao)}).</small></span>` : "";
    }
    const val = $("#carrinho-valor");
    if (val) {
      const tv = totalValor();
      val.innerHTML = !carrinho.length ? "" : `<span>Total estimado</span><strong>${tv.valor ? formatarPreco(tv.valor) : "—"}</strong>` +
        (tv.combinar ? `<small>${tv.valor ? "+ " : ""}${tv.combinar} ${tv.combinar === 1 ? "item" : "itens"} com valor a combinar com o vendedor</small>` : `<small>Frete e condições são confirmados pelo vendedor.</small>`);
    }
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
        const cor = p.cores[0], pi = precoInfo(p);
        const sub = pi.tipo === "combinar" ? `<span class="sub-combinar">Valor a combinar</span>` : `<span class="sub-valor">${formatarPreco(pi.efetivo * kgDoItem(item))}${pi.tipo === "promo" ? ` <b class="selo-off">-${pi.desconto}%</b>` : ""}</span>`;
        const excede = controlaEstoque() && kgNoCarrinho(p.id) > saldoDe(p.id);
        return `
<div class="item-carrinho${excede ? " sem-estoque" : ""}" data-idx="${idx}">
  ${imgProduto(p, cor, FOTO_CARTAO, "mini-foto")}
  <div>
    <h4>${esc(p.nome)}</h4>
    <div class="detalhes"><span class="codigo">Cód. ${esc(p.codigo || p.id)}</span> · ${esc(ehSobMedida(item.embalagem) ? "Quantidade sob medida" : item.embalagem)}</div>
    <div class="detalhes">${sub}${pi.tipo !== "combinar" ? ` <small>(${formatarPreco(pi.efetivo)}/kg)</small>` : ""}</div>
    ${excede ? `<div class="aviso-estoque">${saldoDe(p.id) <= 0 ? "Esgotado. Remova o item ou peça um orçamento." : `Estoque disponível: ${fmtKg(saldoDe(p.id))}. Diminua a quantidade.`}</div>` : ""}
    <div class="quantidade-linha">
      <div class="quantidade">
        <button data-acao="menos" aria-label="Diminuir">−</button>
        <input type="number" min="1" value="${item.qtd}" aria-label="Quantidade em ${ehSobMedida(item.embalagem) ? "kg" : "caixas"}">
        <button data-acao="mais" aria-label="Aumentar">+</button>
      </div>
      <span class="unidade">${ehSobMedida(item.embalagem) ? "kg" : (item.qtd === 1 ? "caixa" : "caixas") + (kgDaEmbalagem(item.embalagem) ? ` · ${kgDoItem(item).toLocaleString("pt-BR")} kg` : "")}</span>
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
    const textoBtn = (t) => (btn.textContent = t);

    if (logado()) {
      const p = Conta.perfil || {};
      if (!Conta.perfilCompleto()) {
        box.innerHTML = `<div class="cliente-box alerta">Complete seu cadastro (endereço e documento) para finalizar o pedido.
          <a href="conta.html#dados">Completar cadastro →</a></div>`;
        textoBtn("Completar cadastro");
        return;
      }
      const titulo = p.tipo === "pj" ? p.razao_social : p.nome;
      box.innerHTML = `<div class="cliente-box"><span>Entrega para</span><strong>${esc(titulo)}</strong>
        <small>${esc(p.cidade)}/${esc(p.uf)} · CEP ${esc(p.cep)}</small><a href="conta.html#dados">Alterar dados</a></div>`;
      textoBtn("Finalizar compra");
      return;
    }
    box.innerHTML = `<div class="cliente-box alerta">Entre ou crie sua conta para finalizar a compra com seus dados de faturamento e entrega.</div>`;
    textoBtn("Entrar para finalizar");
  }

  async function finalizarPedido() {
    if (!carrinho.length) return;
    if (!logado()) {
      try { sessionStorage.setItem(CHAVE_VOLTAR, location.pathname.split("/").pop() || "index.html"); } catch (e) { /* ignora */ }
      location.href = "conta.html?voltar=carrinho";
      return;
    }
    if (!Conta.perfilCompleto()) { location.href = "conta.html#dados"; return; }
    const btn = $("#btn-finalizar");
    btn.disabled = true;
    try {
      // confere o estoque na hora (outro cliente pode ter comprado)
      await carregarEstoque(true); renderCarrinho();
      const acima = carrinho.map((i) => buscarProduto(i.id)).filter((p, k, a) => p && a.indexOf(p) === k && controlaEstoque() && kgNoCarrinho(p.id) > saldoDe(p.id));
      if (acima.length) { mostrarToast(`O estoque mudou: ${acima.map((p) => `<strong>${esc(p.nome)}</strong> (${fmtKg(saldoDe(p.id))})`).join(", ")}. Ajuste o carrinho para continuar.`); return; }
      const tv = totalValor();
      if (!confirm(`Confirmar a compra de ${carrinho.length} ${carrinho.length === 1 ? "item" : "itens"} (${totalKg().toLocaleString("pt-BR")} kg)?\n\n` +
        (tv.valor ? `Valor dos produtos: ${formatarPreco(tv.valor)}${tv.combinar ? " + itens a combinar" : ""}\n` : "Valor a combinar com o vendedor.\n") +
        "Frete e pagamento são combinados com o vendedor pelo chat do pedido.")) return;
      btn.textContent = "Enviando pedido...";
      const numero = await window.Loja.criarPedido(carrinho.map((i) => ({ id: i.id, embalagem: i.embalagem, qtd: i.qtd })), $("#cliente-obs").value);
      carrinho = [];
      $("#cliente-obs").value = "";
      salvarCarrinho();
      carregarEstoque(true);
      location.href = "conta.html#compra=" + encodeURIComponent(numero);
    } catch (e) {
      mostrarToast(esc(e.message));
    } finally {
      btn.disabled = false; renderClienteCarrinho();
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
    const p = acharProduto(id, corNome);
    if (!p) return;
    registrarVisto(p.id);
    const modal = $("#modal-produto");
    let corSel = p.cores[0], embSel = embalagemPadrao(p);
    const cat = CATEGORIAS[p.categoria] || {};

    modal.innerHTML = `
<button class="fechar" aria-label="Fechar">×</button>
<div class="modal-corpo">
  <div class="modal-vitrine">
    <div class="modal-foto" id="modal-vitrine">${fotosDe(p).length ? imgFoto(fotosDe(p)[0], p.nome, "") : imgProduto(p, corSel, FOTO_MODAL)}</div>
    <div class="modal-miniaturas" role="tablist" aria-label="Fotos do produto">
      ${fotosDe(p).length
        ? fotosDe(p).map((u, i) => `<button type="button" class="${i ? "" : "ativo"}" data-vista="f${i}" aria-label="Foto ${i + 1}">${imgFoto(u, "", "mini-foto")}</button>`).join("")
        : `<button type="button" class="ativo" data-vista="foto" aria-label="Foto da cor">${imgProduto(p, corSel, FOTO_CARTAO, "mini-foto")}</button>`}
      <button type="button" data-vista="caixa" aria-label="Embalagem">${caixaFoto("mini-foto")}</button>
    </div>
    <p class="modal-legenda" id="modal-legenda">${esc(corSel.nome)} · ${esc(p.acabamento || "")}</p>
  </div>
  <div class="modal-info">
    <div class="modal-topo"><span class="etiqueta" style="position:static">${esc(cat.nome || "")}</span>${botaoFav(p.id)}</div>
    <h2>${esc(p.nome)}</h2>
    <p class="codigo-produto">Código: <strong>${esc(p.codigo || p.id)}</strong>${p.marca ? ` · Marca: <strong>${esc(p.marca)}</strong>` : ""}</p>
    <div class="modal-preco">${htmlPreco(p, true)}</div>
    <p class="modal-estoque" id="modal-estoque">${htmlEstoque(p)}</p>
    ${window.Loja ? `<div class="simula-prazo"><label for="sim-cep">${ic("local")} Prazo de entrega</label>
      <div><input id="sim-cep" inputmode="numeric" maxlength="9" placeholder="Seu CEP" value="${esc((Conta && Conta.perfil && Conta.perfil.cep) || "")}"><button type="button" class="btn btn-contorno-azul" id="sim-calcular">Calcular</button></div>
      <p id="sim-resultado" aria-live="polite"></p></div>` : ""}
    <p class="desc">${esc(p.descricao)}</p>
    <ul class="ficha">
      <li><span>Linha</span><span>${esc(p.linha)}</span></li>
      <li><span>Acabamento</span><span>${esc(p.acabamento)}</span></li>
      <li><span>Rendimento</span><span>${esc(p.rendimento)}</span></li>
      <li><span>Cura</span><span>${esc(p.cura)}</span></li>
      <li><span>Cor</span><span class="cor-ficha"><i style="background:${esc(corSel.hex)}"></i>${esc(corSel.nome)}</span></li>
    </ul>
    <div class="campo-titulo">Embalagem</div>
    <div class="seletor-embalagem">
      ${p.embalagens.slice().sort((x, y) => (x === embSel ? -1 : y === embSel ? 1 : 0)).map((e) => `<button class="${e === embSel ? "ativo" : ""}" data-emb="${esc(e)}">${esc(e)}</button>`).join("")}
      <button data-emb="${SOB_MEDIDA}" title="Informe a quantidade exata em kg">Sob medida (kg)</button>
    </div>
    <p class="nota-sob-medida" id="nota-sob-medida" hidden>Informe o total em quilos. O vendedor confirma a melhor combinação de embalagens.</p>
    <div class="campo-titulo campo-qtd">Quantidade <span id="unidade-qtd">(caixas)</span>
      <button type="button" class="link-calc" id="abrir-calc">${ic("calculadora")}Calcular pela área</button></div>
    <div class="calc-area" id="calc-area" hidden>
      <label>Área a pintar (m²)<input type="number" id="calc-m2" min="1" step="1" placeholder="Ex.: 80" inputmode="decimal"></label>
      <p id="calc-resultado" aria-live="polite">Some a área das peças (as duas faces, se for pintar dos dois lados).</p>
    </div>
    <div class="linha-compra" id="linha-compra">
      <div class="quantidade">
        <button data-q="-1" aria-label="Diminuir">−</button>
        <input type="number" id="modal-qtd" min="1" value="1" aria-label="Quantidade">
        <button data-q="1" aria-label="Aumentar">+</button>
      </div>
      <button class="btn btn-primario" id="modal-add" style="flex:1">Adicionar ao carrinho</button>
    </div>
    <p class="resumo-qtd" id="resumo-qtd"></p>
    <div class="esgotado-box" id="esgotado-box" hidden>
      <strong>Produto esgotado no momento.</strong>
      <span>Fale com o vendedor para saber quando chega ou pedir um orçamento.</span>
      <button type="button" class="btn btn-whats" data-extra="aviseme">${iconeWhats()} Avise-me / pedir orçamento</button>
    </div>
    <div class="acoes-extra">
      <button type="button" data-extra="ficha">${ic("documento")}Ficha técnica</button>
      <button type="button" data-extra="orcamento">${ic("conversa")}Pedir orçamento</button>
      <button type="button" data-extra="link">${ic("link")}Copiar link</button>
    </div>
  </div>
</div>`;

    $(".fechar", modal).addEventListener("click", fecharTudo);
    // estoque: mostra a quantidade e só deixa pedir até o saldo (menos o que já está no carrinho)
    function mostrarDisponibilidade() {
      if (!modal.classList.contains("aberto") && modal.dataset.produto !== p.id) return;
      $("#modal-estoque").innerHTML = htmlEstoque(p);
      const esgotado = controlaEstoque() && saldoDe(p.id) <= 0;
      $("#esgotado-box").hidden = !esgotado;
      $("#linha-compra").hidden = esgotado;
      $(".seletor-embalagem", modal).hidden = esgotado;
      $$(".campo-titulo", modal).forEach((t) => (t.hidden = esgotado && !t.id));
      if (!esgotado) atualizarQtd();
    }
    modal.dataset.produto = p.id;
    function simularPrazo() {
      const cep = ($("#sim-cep", modal) || {}).value || "", res = $("#sim-resultado", modal);
      if (!res) return;
      if (cep.replace(/\D/g, "").length !== 8) { res.textContent = cep ? "Digite os 8 números do CEP." : ""; return; }
      const info = window.Loja.prazo(null, cep);
      res.innerHTML = info ? `Envio <strong>${esc(window.Loja.textoEnvio(info.envio))}</strong> · chega entre <strong>${esc(window.Loja.dataBR(info.entregaMin))}</strong> e <strong>${esc(window.Loja.dataBR(info.entregaMax))}</strong> <small>(${esc(info.regiao)}, saindo de Matão-SP · simulação)</small>` : "CEP não encontrado.";
    }
    if ($("#sim-cep", modal)) {
      $("#sim-cep", modal).addEventListener("input", (e) => { const d = e.target.value.replace(/\D/g, "").slice(0, 8); e.target.value = d.length > 5 ? d.slice(0, 5) + "-" + d.slice(5) : d; if (d.length === 8) simularPrazo(); });
      $("#sim-calcular", modal).addEventListener("click", simularPrazo);
      simularPrazo();
    }
    carregarEstoque().then(() => { if (modal.dataset.produto === p.id) mostrarDisponibilidade(); });
    let vista = fotosDe(p).length ? "f0" : "foto";
    const desenharVitrine = () => {
      const alvo = $("#modal-vitrine");
      alvo.classList.remove("trocando");
      void alvo.offsetWidth;
      alvo.classList.add("trocando");
      alvo.innerHTML = vista === "caixa" ? caixaFoto() : /^f\d+$/.test(vista) ? imgFoto(fotosDe(p)[+vista.slice(1)], p.nome, "") : imgProduto(p, corSel, FOTO_MODAL);
      const minis = $$(".modal-miniaturas button", modal);
      minis.forEach((m) => m.classList.toggle("ativo", m.dataset.vista === vista));
      $("#modal-legenda").textContent = vista === "caixa" ? "Embalagem: caixa de papelão Policoating" : `${corSel.nome} · ${p.acabamento || ""}`;
    };
    $$(".modal-miniaturas button", modal).forEach((b) => b.addEventListener("click", () => { vista = b.dataset.vista; desenharVitrine(); }));

    $$("[data-emb]", modal).forEach((b) =>
      b.addEventListener("click", () => $$("[data-emb]", modal).forEach((x) => x.classList.toggle("ativo", x === b)))
    );
    const qtd = $("#modal-qtd");
    // quantidade: caixas (padrão) ou kg (sob medida), com o total em kg sempre visível
    const passo = () => (ehSobMedida(embSel) ? 5 : 1);
    function atualizarQtd() {
      const sob = ehSobMedida(embSel), maxE = maxPorEstoque(p.id, embSel, -1);
      let n = limitarQtd(embSel, qtd.value);
      if (maxE !== Infinity && n > maxE) {
        n = Math.max(1, maxE);
        if (qtd.value !== "" && +qtd.value > n) { qtd.value = n; mostrarToast(maxE < 1 ? "Estoque desta embalagem já está no seu carrinho." : `Estoque disponível: ${fmtKg(saldoDe(p.id) - kgNoCarrinho(p.id))}${kgNoCarrinho(p.id) ? " (fora o que já está no carrinho)" : ""}.`); }
      } else if (qtd.value !== "" && +qtd.value > n) { qtd.value = n; mostrarToast(`Máximo de ${n.toLocaleString("pt-BR")} ${sob ? "kg" : "caixas"} por item. Para mais, fale com o vendedor.`); }
      $("#modal-add").disabled = maxE !== Infinity && maxE < 1;
      $("#unidade-qtd").textContent = sob ? "(kg)" : "(caixas)";
      $("#nota-sob-medida").hidden = !sob;
      qtd.setAttribute("aria-label", sob ? "Quantidade em kg" : "Quantidade de caixas");
      const kg = sob ? n : n * kgDaEmbalagem(embSel);
      $("#resumo-qtd").textContent = sob ? `Total: ${n.toLocaleString("pt-BR")} kg` : `${n} ${n === 1 ? "caixa" : "caixas"} de ${kgDaEmbalagem(embSel)} kg = ${kg.toLocaleString("pt-BR")} kg`;
    }
    $$("[data-q]", modal).forEach((b) =>
      b.addEventListener("click", () => { qtd.value = Math.max(1, (parseInt(qtd.value, 10) || 1) + +b.dataset.q * passo()); atualizarQtd(); })
    );
    qtd.addEventListener("input", atualizarQtd);
    $$("[data-emb]", modal).forEach((b) => b.addEventListener("click", () => {
      const eraSob = ehSobMedida(embSel);
      // ao trocar entre caixas e kg, converte a quantidade para a nova unidade
      const kgAtual = eraSob ? (parseInt(qtd.value, 10) || 1) : (parseInt(qtd.value, 10) || 1) * kgDaEmbalagem(embSel);
      embSel = b.dataset.emb;
      qtd.value = ehSobMedida(embSel) ? Math.max(1, Math.round(kgAtual)) : Math.max(1, Math.ceil(kgAtual / (kgDaEmbalagem(embSel) || 1)));
      calcular(); atualizarQtd();
    }));
    // calculadora pela área (rendimento do produto + 15% de perda)
    const rendimento = parseFloat(String(p.rendimento || "").replace(",", ".").match(/[\d.]+/)) || 9;
    function calcular() {
      const m2 = parseFloat(String($("#calc-m2").value).replace(",", "."));
      if (!(m2 > 0) || $("#calc-area").hidden) return;
      const kg = (m2 / rendimento) * 1.15;
      qtd.value = ehSobMedida(embSel) ? Math.ceil(kg) : Math.ceil(kg / (kgDaEmbalagem(embSel) || 25));
      $("#calc-resultado").textContent = `≈ ${kg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg para ${m2.toLocaleString("pt-BR")} m² (rendimento ${rendimento.toLocaleString("pt-BR")} m²/kg + 15% de perda). Quantidade preenchida abaixo.`;
      atualizarQtd();
    }
    $("#abrir-calc").addEventListener("click", () => { const c = $("#calc-area"); c.hidden = !c.hidden; if (!c.hidden) $("#calc-m2").focus(); });
    $("#calc-m2").addEventListener("input", calcular);
    atualizarQtd();
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
        if (tipo === "ficha" && p.ficha && /^https:\/\//.test(p.ficha)) {   // PDF enviado pelo painel
          window.open(p.ficha, "_blank", "noopener");
          return;
        }
        const item = { embalagem: embSel, qtd: limitarQtd(embSel, qtd.value) };
        const msg = tipo === "aviseme"
          ? `Olá! O produto *${p.nome}* (código ${p.codigo || p.id}) está esgotado no site. Pode me avisar quando chegar ou fazer um orçamento?`
          : tipo === "orcamento"
          ? `Olá! Gostaria de um orçamento do produto *${p.nome}* (código ${p.codigo || p.id}), quantidade: *${descreverQtd(item)}*.`
          : `Olá! Gostaria de receber a ficha técnica (BT) e a FISPQ do produto *${p.nome}*.`;
        window.open(linkWhatsApp(msg), "_blank", "noopener");
      })
    );
    $("#modal-add").addEventListener("click", () => {
      if (adicionarAoCarrinho(p.id, corSel.nome, embSel, qtd.value)) fecharTudo();
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
    const cat = CATEGORIAS[p.categoria] || {}, c = p.cores[0], pi = precoInfo(p);
    const esgotado = controlaEstoque() && saldoDe(p.id) <= 0;
    return `
<article class="cartao-produto revelar${esgotado ? " esgotado" : ""}" data-id="${esc(p.id)}">
  <div class="vitrine" data-abrir="${esc(p.id)}">
    <span class="etiqueta">${esc(cat.nome || "")}</span>
    ${pi.tipo === "promo" ? `<span class="etiqueta-promo">-${pi.desconto}%</span>` : ""}
    ${botaoFav(p.id)}
    ${imgProduto(p, c, FOTO_CARTAO)}
    <span class="ver-detalhes">Ver detalhes</span>
  </div>
  <div class="info">
    <div class="linha-codigo"><span class="linha">${esc(p.marca || p.linha || "")}</span><span class="codigo-cartao">Cód. ${esc(p.codigo || p.id)}</span></div>
    <h3>${esc(p.nome)}</h3>
    <p class="desc">${esc(p.descricao)}</p>
    <div class="cor-cartao"><i style="background:${esc(c.hex)}"></i>${esc(c.nome)}</div>
    <div class="estoque-cartao" data-estoque-id="${esc(p.id)}">${htmlEstoque(p)}</div>
    <div class="rodape-cartao">
      ${htmlPreco(p)}
      <button class="btn ${esgotado ? "btn-contorno-azul" : "btn-primario"} btn-add" data-abrir="${esc(p.id)}">${esgotado ? "Ver / Avise-me" : "+ Carrinho"}</button>
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
    const pagina = (location.pathname.split("/").pop() || "index.html");
    $$(".link-conta").forEach((a) => {
      const t = $(".texto", a);
      if (logado()) {
        t.textContent = Conta.nomeExibicao() || "Minha conta"; a.title = "Minha conta"; a.classList.add("logado");
        a.href = "conta.html";
        a.setAttribute("aria-haspopup", "true");
        montarMenuConta(a);
      } else {
        t.textContent = "Entrar"; a.title = "Entrar ou criar conta"; a.classList.remove("logado");
        a.removeAttribute("aria-haspopup");
        // depois de entrar, a pessoa volta para esta página
        a.href = /^[a-z0-9-]+\.html$/.test(pagina) && !["conta.html", "404.html"].includes(pagina) ? "conta.html?voltar=" + pagina : "conta.html";
        const m = a.parentElement.querySelector(".menu-conta"); if (m) m.remove();
        const d = $(".ponto-notif", a); if (d) d.remove();
        papelEquipe = null; mostrarLinkPainel(null);
      }
    });
  }

  /* Menu da conta no cabeçalho (só para quem está logado) */
  function montarMenuConta(link) {
    let menu = link.parentElement.querySelector(".menu-conta");
    if (!menu) {
      menu = document.createElement("div");
      menu.className = "menu-conta"; menu.hidden = true;
      link.parentElement.classList.add("conta-ancora");
      link.insertAdjacentElement("afterend", menu);
      link.addEventListener("click", (e) => {
        if (!logado()) return;
        e.preventDefault();
        menu.hidden = !menu.hidden;
        link.setAttribute("aria-expanded", String(!menu.hidden));
      });
      document.addEventListener("click", (e) => { if (!menu.hidden && !menu.contains(e.target) && !link.contains(e.target)) { menu.hidden = true; link.setAttribute("aria-expanded", "false"); } });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) { menu.hidden = true; link.focus(); } });
      menu.addEventListener("click", async (e) => {
        if (e.target.closest("[data-sair]")) { e.preventDefault(); await Conta.sair(); location.href = "index.html"; }
      });
    }
    const u = Conta.usuario || {};
    menu.innerHTML = `
      <div class="mc-topo"><strong>${esc(Conta.nomeExibicao() || "Minha conta")}</strong><small>${esc(u.email || "")}</small></div>
      <a href="conta.html#resumo">${ic("casa")}Visão geral</a>
      <a href="conta.html#pedidos">${ic("caixa")}Minhas compras <b class="badge-menu" data-badge-cliente hidden></b></a>
      <a href="conta.html#favoritos">${ic("coracao")}Favoritos</a>
      <a href="conta.html#dados">${ic("usuario")}Meus dados</a>
      <a href="admin.html#vendas" class="mc-admin" hidden>${ic("industria")}<span>Painel da empresa</span> <b class="badge-menu" data-badge-equipe hidden></b></a>
      <button type="button" data-sair>${ic("sair")}Sair</button>`;
    if (window.Catalogo) window.Catalogo.Admin.meuPapel().then((papel) => {
      const x = $(".mc-admin", menu); if (!x) return;
      x.hidden = !papel;
      if (papel === "vendedor") $("span", x).textContent = "Área do vendedor";
      papelEquipe = papel;
      mostrarLinkPainel(papel);
      atualizarNotificacoes();
    }).catch(() => {});
  }

  /* ---------- Notificações (vendas novas, mensagens, solicitações) ---------- */
  let papelEquipe = null, timerNotif = 0;
  // vendedores e administradores ganham o atalho "Vendas" no menu principal
  function mostrarLinkPainel(papel) {
    $$(".menu").forEach((m) => {
      let li = $(".menu-painel", m);
      if (!papel) { if (li) li.remove(); return; }
      if (!li) { li = document.createElement("li"); li.className = "menu-painel"; m.appendChild(li); }
      li.innerHTML = `<a href="admin.html#vendas">${ic("grafico")}${papel === "admin" ? "Painel" : "Vendas"} <b class="badge-menu" data-badge-equipe hidden></b></a>`;
    });
  }
  function pintarBadges(sel, n, titulo) {
    $$(sel).forEach((b) => { b.hidden = !n; b.textContent = n > 99 ? "99+" : n; if (titulo) b.title = titulo; });
  }
  async function atualizarNotificacoes() {
    if (!window.Loja || !logado()) return;
    try {
      const [eq, cli] = await Promise.all([papelEquipe ? window.Loja.resumoEquipe() : null, window.Loja.resumoCliente()]);
      const nEq = eq ? (+eq.novas || 0) + (+eq.mensagens || 0) + (+eq.solicitacoes || 0) : 0, nCli = cli ? +cli.mensagens || 0 : 0;
      pintarBadges("[data-badge-equipe]", nEq, eq ? `${eq.novas} novas vendas · ${eq.enviar_hoje} para enviar hoje · ${eq.mensagens} com mensagem · ${eq.solicitacoes} solicitações` : "");
      pintarBadges("[data-badge-cliente]", nCli, "Mensagens novas nas suas compras");
      $$(".link-conta").forEach((a) => { let d = $(".ponto-notif", a); if (!d) { d = document.createElement("span"); d.className = "ponto-notif"; a.appendChild(d); } d.hidden = !(nEq + nCli); d.textContent = nEq + nCli > 99 ? "99+" : nEq + nCli; });
      document.dispatchEvent(new CustomEvent("notificacoes", { detail: { equipe: eq, cliente: cli } }));
    } catch (e) { /* tenta de novo no próximo ciclo */ }
    clearTimeout(timerNotif);
    timerNotif = setTimeout(atualizarNotificacoes, 45000);
  }
  document.addEventListener("notificacoes-atualizar", () => atualizarNotificacoes());

  /* ---------- Inicialização ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    montarEstruturaCarrinho();
    aplicarConfig();
    iniciarMenu();
    renderCarrinho();
    atualizarContador(false);
    observarRevelar();
    avisoLgpd();
    carregarEstoque();
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

  // estoque carregado: atualiza os cartões e o carrinho
  document.addEventListener("estoque-atualizado", () => {
    $$("[data-estoque-id]").forEach((el) => {
      const p = buscarProduto(el.dataset.estoqueId); if (!p) return;
      el.innerHTML = htmlEstoque(p);
      const cartao = el.closest(".cartao-produto"), esgotado = controlaEstoque() && saldoDe(p.id) <= 0, b = cartao && $(".btn-add", cartao);
      if (cartao) cartao.classList.toggle("esgotado", esgotado);
      if (b) { b.textContent = esgotado ? "Ver / Avise-me" : "+ Carrinho"; b.classList.toggle("btn-primario", !esgotado); b.classList.toggle("btn-contorno-azul", esgotado); }
    });
    renderCarrinho();
  });

  /* API pública usada pelas páginas */
  window.ColorWeg = { acharProduto, precoInfo, htmlPreco, formatarPreco, carregarEstoque, saldoDe: (id) => saldoDe(id), controlaEstoque: () => controlaEstoque(), descreverQtd, kgDoItem, embalagemPadrao, lerVistos, iconeWhats, totalItens: () => totalItens(), itensCarrinho: () => carrinho.slice(), fotoProduto, imgProduto, lerFavoritos, alternarFavorito, gravarStorage, lerStorage, buscarProduto, $, $$, caixaSVG, renderProdutos, abrirProduto, adicionarAoCarrinho, linkWhatsApp, ehEscura, esc, observarRevelar, mostrarToast, abrirCarrinho };
})();
