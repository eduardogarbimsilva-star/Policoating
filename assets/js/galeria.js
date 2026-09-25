/* =========================================================
   Policoating — Galeria (fotos reais de midia.js + ilustrações)
   ========================================================= */
(function () {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  document.addEventListener("DOMContentLoaded", () => {
    const CW = window.ColorWeg, F = window.Fotos, esc = CW.esc;
    const TAM = { largura: 600, altura: 480 };
    const produto = (id) => PRODUTOS.find((p) => p.id === id);
    const itens = [];

    // 1) Fotos reais (midia.js)
    ((window.MIDIA || {}).galeria || []).forEach((f) => itens.push({
      categoria: f.categoria || "aplicacoes", titulo: f.titulo || "", sub: f.descricao || "", img: f.src, real: true
    }));

    // 2) Cores: uma de cada produto, variando
    const vistas = new Set();
    PRODUTOS.forEach((p) => p.cores.forEach((c, i) => {
      if (p.id === "cor-especial" || vistas.has(c.hex.toLowerCase()) || i > 2) return;
      vistas.add(c.hex.toLowerCase());
      itens.push({ categoria: "cores", titulo: c.nome, sub: p.nome, img: F.fotoProduto(p, c, TAM), produto: p.id });
    }));

    // 3) Acabamentos
    [["#1558d6", "Brilhante", "Azul"], ["#1558d6", "Fosco", "Azul"], ["#1558d6", "Texturizado", "Azul"],
     ["#3B5B8A", "Martelado", "Azul martelado"], ["#A5A5A5", "Metálico", "Prata RAL 9006"], ["#B06A3B", "Metálico", "Cobre"],
     ["#0E0E10", "Texturizado", "Preto RAL 9005"], ["#0E0E10", "Brilhante", "Preto RAL 9005"]].forEach(([hex, acab, nome]) =>
      itens.push({ categoria: "acabamentos", titulo: "Acabamento " + acab.toLowerCase(), sub: nome, img: F.fotoCor(hex, acab, TAM) }));

    // 4) Ambientes (casas, comércio, indústria)
    [["casa", "#0E0E10", "Fosco", "Residência", "Portão, grades e esquadrias · RAL 9005 fosco", "poliester-fosco"],
     ["sobrado", "#383E42", "Fosco", "Sobrado com sacada", "Guarda-corpo e esquadrias · RAL 7016", "poliester-fosco"],
     ["loja", "#0E4C92", "Brilhante", "Fachada comercial", "Esquadrias de alumínio · RAL 5010", "poliester-brilhante"],
     ["galpao", "#F2A900", "Brilhante", "Galpão industrial", "Estrutura metálica · RAL 1003", "poliester-brilhante"],
     ["escritorio", "#57A639", "Acetinado", "Escritório", "Móveis de aço · verde RAL 6018", "hibrida-brilhante"],
     ["casa", "#114232", "Brilhante", "Residência", "Portão e grades · RAL 6005", "poliester-brilhante"],
     ["sobrado", "#F1F0EA", "Brilhante", "Sobrado claro", "Esquadrias brancas · RAL 9016", "poliester-brilhante"],
     ["loja", "#A72920", "Brilhante", "Loja", "Fachada · vermelho RAL 3000", "poliester-brilhante"]
    ].forEach(([tipo, hex, acab, titulo, sub, id]) =>
      itens.push({ categoria: "ambientes", titulo, sub, svg: F.ambienteSVG(tipo, hex, acab), produto: id }));

    // 5) Peças
    [["portao", "#0E0E10", "Fosco", "Portão", "Poliéster fosco · RAL 9005", "poliester-fosco"],
     ["painel", "#CBD0CC", "Texturizado fino", "Painel elétrico", "Epóxi · RAL 7035", "epoxi-painel-eletrico"],
     ["cadeira", "#A72920", "Acetinado", "Cadeira de aço", "Híbrida acetinada · vermelho", "hibrida-acetinada"],
     ["estante", "#1558d6", "Brilhante", "Estante industrial", "Epóxi · azul segurança", "epoxi-anticorrosivo"],
     ["janela", "#383E42", "Fosco", "Esquadria de alumínio", "Poliéster fosco · RAL 7016", "poliester-fosco"],
     ["roda", "#A5A5A5", "Metálico", "Roda automotiva", "Metálica · prata RAL 9006", "metalica-prata"],
     ["portao", "#114232", "Brilhante", "Grade residencial", "Poliéster · RAL 6005", "poliester-brilhante"],
     ["painel", "#E75B12", "Semibrilho", "Gabinete de máquina", "Epóxi · laranja segurança", "epoxi-anticorrosivo"]
    ].forEach(([tipo, hex, acab, titulo, sub, id]) =>
      itens.push({ categoria: "aplicacoes", titulo, sub, svg: F.aplicacaoSVG(tipo, hex, acab), produto: id }));

    const grade = $("#grade-galeria");
    let filtro = "todas", visiveis = [];

    function render() {
      visiveis = itens.filter((it) => filtro === "todas" || it.categoria === filtro);
      grade.innerHTML = visiveis.map((it, i) => `
        <button type="button" class="galeria-item revelar${i % 7 === 0 ? " destaque" : ""}" data-i="${i}" aria-label="Ampliar: ${esc(it.titulo)}">
          ${it.svg ? it.svg : `<img src="${esc(it.img)}" alt="${esc(it.titulo)}" loading="lazy">`}
          <span><strong>${esc(it.titulo)}</strong>${esc(it.sub)}</span>
        </button>`).join("");
      CW.observarRevelar();
    }

    $("#filtros-galeria").addEventListener("click", (e) => {
      const b = e.target.closest("[data-filtro]");
      if (!b) return;
      filtro = b.dataset.filtro;
      $$("#filtros-galeria .chip").forEach((c) => c.classList.toggle("ativo", c === b));
      render();
    });

    /* ----- Lightbox ----- */
    const lb = $("#lightbox");
    let atual = 0;
    function mostrar(i) {
      atual = (i + visiveis.length) % visiveis.length;
      const it = visiveis[atual];
      const midia = $("#lb-midia");
      midia.classList.remove("trocando"); void midia.offsetWidth; midia.classList.add("trocando");
      midia.innerHTML = it.svg ? it.svg : `<img src="${esc(it.img)}" alt="${esc(it.titulo)}">`;
      $("#lb-titulo").textContent = it.titulo;
      $("#lb-sub").textContent = it.sub;
      const acao = $("#lb-acao");
      if (it.produto && produto(it.produto)) { acao.hidden = false; acao.textContent = "Ver produto"; acao.href = "produtos.html#produto=" + it.produto; acao.removeAttribute("target"); }
      else { acao.hidden = false; acao.textContent = "Pedir orçamento"; acao.href = CW.linkWhatsApp(`Olá! Vi na galeria "${it.titulo}${it.sub ? " – " + it.sub : ""}" e gostaria de um orçamento.`); acao.target = "_blank"; }
    }
    function abrir(i) { mostrar(i); lb.hidden = false; document.body.style.overflow = "hidden"; requestAnimationFrame(() => lb.classList.add("aberto")); $(".lb-fechar", lb).focus(); }
    function fechar() { lb.classList.remove("aberto"); document.body.style.overflow = ""; setTimeout(() => (lb.hidden = true), 250); }

    grade.addEventListener("click", (e) => { const b = e.target.closest("[data-i]"); if (b) abrir(+b.dataset.i); });
    $(".lb-fechar", lb).addEventListener("click", fechar);
    $(".lb-seta.ant", lb).addEventListener("click", () => mostrar(atual - 1));
    $(".lb-seta.prox", lb).addEventListener("click", () => mostrar(atual + 1));
    lb.addEventListener("click", (e) => { if (e.target === lb) fechar(); });
    document.addEventListener("keydown", (e) => {
      if (lb.hidden) return;
      if (e.key === "Escape") fechar();
      if (e.key === "ArrowLeft") mostrar(atual - 1);
      if (e.key === "ArrowRight") mostrar(atual + 1);
    });
    let x0 = null;
    lb.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", (e) => { if (x0 == null) return; const d = e.changedTouches[0].clientX - x0; if (Math.abs(d) > 50) mostrar(atual + (d < 0 ? 1 : -1)); x0 = null; });

    render();
  });
})();
