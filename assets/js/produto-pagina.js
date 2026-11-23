/* =========================================================
   Página própria de cada produto (etapa E02): produto?id=pol-0001[&emb=25]
   - Endereço fixo para o Google (Busca e Shopping), com título, descrição, imagem e
     dados estruturados (schema.org Product + ofertas por embalagem).
   - Mesmas ações do catálogo: carrinho, cotação, frete, ficha técnica e WhatsApp.
   ========================================================= */
(function () {
  "use strict";
  const CW = window.ColorWeg, R = window.Recursos;
  const alvo = document.getElementById("pp-conteudo");
  if (!CW || !alvo) return;
  const { esc, $, $$ } = CW;
  const SITE = "https://policoatingtintas.com.br";
  const CAIXAS = ["Caixa 25 kg", "Caixa 5 kg"];
  const kgDe = (emb) => parseFloat(String(emb).replace(/[^\d,.]/g, "").replace(",", ".")) || 0;
  const reais = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const params = new URLSearchParams(location.search);
  const id = String(params.get("id") || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  const embInicial = /^(5|25)$/.test(params.get("emb") || "") ? `Caixa ${params.get("emb")} kg` : "Caixa 25 kg";
  const nomeCat = (k) => ((window.CATEGORIAS || {})[k] || {}).nome || "";
  const absoluta = (u) => (/^https?:\/\//.test(u) ? u : `${SITE}/${String(u || "").replace(/^\.?\//, "")}`);
  const urlProduto = (p, emb) => `${SITE}/produto?id=${encodeURIComponent(p.id)}${emb ? `&emb=${kgDe(emb)}` : ""}`;
  let feito = false;

  function meta(sel, attr, valor) {
    let el = document.head.querySelector(sel);
    if (!el) { el = document.createElement(sel.startsWith("link") ? "link" : "meta"); const m = /\[(\w+(?::\w+)?)="([^"]+)"\]/.exec(sel); if (m) el.setAttribute(m[1], m[2]); document.head.appendChild(el); }
    el.setAttribute(attr, valor);
  }
  function fotos(p) {
    const lista = (Array.isArray(p.fotos) ? p.fotos : []).filter((u) => typeof u === "string" && u);
    if (lista.length) return lista;
    const cor = (p.cores || [])[0];
    try { const u = window.Fotos && cor ? window.Fotos.fotoProduto(p, cor, { largura: 760, altura: 608 }) : ""; return u ? [u] : []; } catch (e) { return []; }
  }

  /** Dados estruturados para o Google (só com preço publicado; sem preço, sem oferta) */
  function jsonLd(p) {
    const pi = CW.precoInfo(p), imgs = fotos(p).map(absoluta), marca = p.marca || "Policoating";
    const d = {
      "@context": "https://schema.org", "@type": "Product",
      name: p.nome, description: p.descricao || p.nome, sku: p.codigo || p.id.toUpperCase(), mpn: p.codigo || p.id.toUpperCase(),
      brand: { "@type": "Brand", name: marca }, category: nomeCat(p.categoria) || undefined, image: imgs.length ? imgs : undefined,
      color: ((p.cores || [])[0] || {}).nome || undefined, url: urlProduto(p)
    };
    if (pi.tipo !== "combinar") {
      d.offers = CAIXAS.map((emb) => {
        const kg = kgDe(emb), o = {
          "@type": "Offer", sku: `${d.sku}-${kg}KG`, name: `${p.nome} — ${emb}`, url: urlProduto(p, emb),
          price: (CW.precoInfo(p, emb).efetivo * kg).toFixed(2), priceCurrency: "BRL", itemCondition: "https://schema.org/NewCondition",
          availability: "https://schema.org/InStock", seller: { "@type": "Organization", name: "Policoating" },
          hasMerchantReturnPolicy: { "@type": "MerchantReturnPolicy", applicableCountry: "BR", returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow", merchantReturnDays: 7, merchantReturnLink: `${SITE}/trocas` }
        };
        if (pi.tipo === "promo" && pi.ate) o.priceValidUntil = pi.ate;
        return o;
      });
    }
    let s = document.getElementById("pp-jsonld");
    if (!s) { s = document.createElement("script"); s.type = "application/ld+json"; s.id = "pp-jsonld"; document.head.appendChild(s); }
    s.textContent = JSON.stringify(d);
    // trilha (migalhas) para o Google
    let b = document.getElementById("pp-jsonld-trilha");
    if (!b) { b = document.createElement("script"); b.type = "application/ld+json"; b.id = "pp-jsonld-trilha"; document.head.appendChild(b); }
    b.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Produtos", item: `${SITE}/produtos` },
      ...(p.categoria ? [{ "@type": "ListItem", position: 3, name: nomeCat(p.categoria), item: `${SITE}/produtos?categoria=${p.categoria}` }] : []),
      { "@type": "ListItem", position: p.categoria ? 4 : 3, name: p.nome, item: urlProduto(p) }] });
  }

  function cabecalho(p) {
    const titulo = `${p.nome} | ${p.codigo || p.id.toUpperCase()} | Policoating`;
    const desc = String(p.descricao || `${p.nome}: tinta em pó Policoating.`).slice(0, 158);
    document.title = titulo;
    meta('meta[name="description"]', "content", desc);
    meta('link[rel="canonical"]', "href", urlProduto(p));
    meta('meta[property="og:title"]', "content", titulo);
    meta('meta[property="og:description"]', "content", desc);
    meta('meta[property="og:url"]', "content", urlProduto(p));
    meta('meta[property="og:type"]', "content", "product");
    const f = fotos(p)[0]; if (f) meta('meta[property="og:image"]', "content", absoluta(f));
    const rob = document.head.querySelector('meta[name="robots"]'); if (rob) rob.remove();
  }

  function naoEncontrado() {
    document.title = "Produto não encontrado | Policoating";
    meta('meta[name="robots"]', "content", "noindex");
    alvo.innerHTML = `<div class="vazio cartao-info"><h1>Produto não encontrado</h1><p>Este produto não existe ou saiu do catálogo.</p><p><a class="btn btn-primario" href="produtos">Ver todos os produtos</a></p></div>`;
  }

  function desenhar(p) {
    feito = true;
    cabecalho(p); jsonLd(p);
    const cat = nomeCat(p.categoria), cor = (p.cores || [])[0] || { nome: "", hex: "#ccc" }, lista = fotos(p), pi = CW.precoInfo(p);
    let emb = embInicial, foto = 0;
    $("#pp-migalhas").innerHTML = `<a href="./">Início</a> / <a href="produtos">Produtos</a>${p.categoria ? ` / <a href="produtos?categoria=${esc(p.categoria)}">${esc(cat)}</a>` : ""} / <span aria-current="page">${esc(p.nome)}</span>`;
    const ficha = [["Código", p.codigo || p.id.toUpperCase()], ["Marca", p.marca || "Policoating"], ["Classe", cat], ["Textura", p.textura], ["Acabamento", p.acabamento], ["Linha", p.linha], ["Rendimento", p.rendimento], ["Cura", p.cura]].filter(([, v]) => v);
    const podeCotar = window.Cotacao && R && R.disponivel("b2b_quote_enabled", p);
    alvo.innerHTML = `<article class="pp-produto">
      <div class="pp-galeria">
        <div class="pp-foto" id="pp-foto">${lista.length ? `<img src="${esc(lista[0])}" alt="${esc(p.nome)} — ${esc(cor.nome)}" width="760" height="608" decoding="async">` : CW.caixaSVG(cor.hex)}</div>
        ${lista.length > 1 ? `<div class="pp-miniaturas" role="group" aria-label="Fotos do produto">${lista.map((u, i) => `<button type="button" data-foto="${i}" aria-label="Foto ${i + 1}" aria-pressed="${i === 0}"><img src="${esc(u)}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}
      </div>
      <div class="pp-info">
        ${cat ? `<span class="etiqueta pp-etiqueta">${esc(cat)}</span>` : ""}
        <h1>${esc(p.nome)}</h1>
        <p class="codigo-produto">Código: <strong>${esc(p.codigo || p.id.toUpperCase())}</strong>${p.marca ? ` · Marca: <strong>${esc(p.marca)}</strong>` : ""}</p>
        <div class="pp-preco" id="pp-preco"></div>
        <p class="pp-desc">${esc(p.descricao || "")}</p>
        <div class="pp-cor"><i style="background:${esc(cor.hex)}"></i><span>Cor: <b>${esc(cor.nome)}</b></span></div>
        <div class="campo-titulo">Embalagem</div>
        <div class="cot-seg pp-emb" role="group" aria-label="Embalagem">${CAIXAS.map((c) => `<button type="button" data-emb="${c}" aria-pressed="${c === emb}">${c}</button>`).join("")}</div>
        <div class="pp-compra">
          <div class="cot-qtd"><button type="button" data-q="-1" aria-label="Diminuir">−</button><input type="number" id="pp-qtd" min="1" max="9999" value="1" aria-label="Quantidade de caixas"><button type="button" data-q="1" aria-label="Aumentar">+</button></div>
          <button type="button" class="btn btn-primario" id="pp-add">Adicionar ao carrinho</button>
        </div>
        <p class="pp-resumo" id="pp-resumo"></p>
        <div class="pp-acoes">
          ${podeCotar ? `<button type="button" class="btn btn-contorno-azul" id="pp-cotar">Solicitar cotação</button>` : ""}
          <a class="btn btn-whats" id="pp-whats" target="_blank" rel="noopener">Pedir orçamento no WhatsApp</a>
          ${p.ficha && /^https:\/\//.test(p.ficha) ? `<a class="btn btn-contorno-azul" href="${esc(p.ficha)}" target="_blank" rel="noopener">Ficha técnica (PDF)</a>` : ""}
        </div>
        <div id="pp-frete"></div>
        <ul class="pp-garantias">
          <li><b>Envio de Matão-SP</b> para todo o Brasil</li>
          <li><b>Trocas e devoluções</b> conforme o CDC — <a href="trocas">ver política</a></li>
          <li><b>Atendimento técnico</b> com o vendedor</li>
        </ul>
      </div>
    </article>
    ${R && R.disponivel("product_docs_enabled", p) ? `<section class="pp-docs"><h2>Documentos técnicos</h2><div class="pp-docs-lista">
      ${[["Ficha técnica (boletim técnico)", p.ficha, "Dados de aplicação, cura, rendimento e desempenho."], ["FDS — Ficha de Dados de Segurança", p.fds, "Manuseio, armazenagem, transporte e primeiros socorros."]].map(([t, u, d]) => /^https:\/\//.test(u || "")
        ? `<a class="pp-doc" href="${esc(u)}" target="_blank" rel="noopener"><span class="pp-doc-ico" aria-hidden="true">PDF</span><span><b>${t}</b><small>${d}</small></span></a>`
        : `<a class="pp-doc pp-doc-pedir" target="_blank" rel="noopener" href="${esc(CW.linkWhatsApp(`Olá! Gostaria de receber a ${t} do produto *${p.nome}* (código ${p.codigo || p.id}).`))}"><span class="pp-doc-ico" aria-hidden="true">?</span><span><b>${t}</b><small>Pedir pelo WhatsApp</small></span></a>`).join("")}
    </div></section>` : ""}
    ${ficha.length ? `<section class="pp-ficha"><h2>Ficha do produto</h2><dl>${ficha.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}<div><dt>Cor</dt><dd>${esc(cor.nome)}</dd></div></dl></section>` : ""}`;

    const qtd = $("#pp-qtd");
    function atualizar() {
      const n = Math.max(1, Math.min(9999, parseInt(qtd.value, 10) || 1)), kg = kgDe(emb), pi = CW.precoInfo(p, emb);
      $("#pp-preco").innerHTML = pi.tipo === "combinar"
        ? `<span class="pp-preco-combinar">Preço sob consulta</span><small>Fale com o vendedor ou peça uma cotação.</small>`
        : `<span class="pp-preco-cx">${reais(pi.efetivo * kg)}</span><small>${esc(emb)} · ${reais(pi.efetivo)}/kg${pi.tipo === "promo" ? ` · <s>${reais(pi.preco)}/kg</s> <b class="selo-off">-${pi.desconto}%</b>` : ""}</small>`;
      $("#pp-resumo").textContent = `${n} ${n === 1 ? "caixa" : "caixas"} de ${kg} kg = ${(n * kg).toLocaleString("pt-BR")} kg${pi.tipo !== "combinar" ? ` · ${reais(pi.efetivo * kg * n)}` : ""}`;
      $("#pp-whats").href = CW.linkWhatsApp(`Olá! Gostaria de um orçamento do produto *${p.nome}* (código ${p.codigo || p.id}), ${n} × ${emb}.`);
      $$("[data-emb]", alvo).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.emb === emb)));
      const u = new URL(location.href); u.searchParams.set("emb", String(kg)); history.replaceState(null, "", u.pathname + u.search);
    }
    $$("[data-emb]", alvo).forEach((b) => b.addEventListener("click", () => { emb = b.dataset.emb; atualizar(); }));
    $$("[data-q]", alvo).forEach((b) => b.addEventListener("click", () => { qtd.value = Math.max(1, (parseInt(qtd.value, 10) || 1) + +b.dataset.q); atualizar(); }));
    qtd.addEventListener("input", atualizar);
    $$("[data-foto]", alvo).forEach((b) => b.addEventListener("click", () => {
      foto = +b.dataset.foto; const img = $("#pp-foto img"); if (img) img.src = lista[foto];
      $$("[data-foto]", alvo).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    }));
    $("#pp-add").addEventListener("click", () => CW.adicionarAoCarrinho(p.id, cor.nome, emb, qtd.value));
    const cot = $("#pp-cotar");
    if (cot) cot.addEventListener("click", () => { window.Cotacao.lista.adicionar({ id: p.id, embalagem: emb, cor: cor.nome, qtd: parseInt(qtd.value, 10) || 1 }); location.href = "cotacao"; });
    if (window.Frete) window.Frete.montar($("#pp-frete"), p, () => [{ id: p.id, embalagem: emb, cor: cor.nome, qtd: parseInt(qtd.value, 10) || 1 }]);
    atualizar();
    relacionados(p);
  }

  function relacionados(p) {
    const box = document.getElementById("pp-relacionados"); if (!box) return;
    const outros = (window.PRODUTOS || []).filter((x) => x.id !== p.id && x.categoria === p.categoria).slice(0, 4);
    box.closest("section").hidden = !outros.length;
    if (outros.length) CW.renderProdutos(box, outros);
  }

  function tentar() {
    if (feito) return;
    if (!id) return naoEncontrado();
    const p = (window.PRODUTOS || []).find((x) => x.id === id);
    if (p) return desenhar(p);
    const est = (window.CATALOGO || {}).estado;
    if (est === "ok" || est === "erro") naoEncontrado();
  }
  document.addEventListener("catalogo-atualizado", () => { feito = false; tentar(); });
  document.addEventListener("recursos-atualizados", () => { if (feito) { feito = false; tentar(); } });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tentar); else tentar();
})();
