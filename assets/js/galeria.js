/* =========================================================
   Policoating — Galeria (fotos da marca + peças reais pintadas a pó)
   ========================================================= */
(function () {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  document.addEventListener("DOMContentLoaded", () => {
    const CW = window.ColorWeg, esc = CW.esc;
    const produto = (id) => PRODUTOS.find((p) => p.id === id);
    const itens = [];

    // 1) Fotos da Policoating (midia.js)
    ((window.MIDIA || {}).galeria || []).forEach((f) => {
      const v = f.video ? CW.videoInfo(f.video) : null;
      if (f.video && !v) return;
      itens.push(v
        ? { categoria: "videos", titulo: f.titulo || "Vídeo", sub: f.descricao || "", video: v, img: f.src || v.capa || "" }
        : { categoria: "policoating", titulo: f.titulo || "", sub: f.descricao || "", img: f.src, real: true });
    });

    // 2) Fotos reais de peças metálicas pintadas a pó (fotos-reais.js), por cor
    const FR = window.FotosReais;
    if (FR) FR.FOTOS.forEach((f) => itens.push({
      categoria: f.cor, titulo: f.titulo, sub: `${f.texto} · ${f.corProduto}`, img: FR.url(f, 900), real: true, produto: f.produto
    }));

    // Filtros: Todas, Policoating e as cores que têm foto
    const filtros = $("#filtros-galeria");
    filtros.innerHTML = `<button class="chip ativo" data-filtro="todas">Todas</button>` +
      (itens.some((it) => it.categoria === "policoating") ? `<button class="chip" data-filtro="policoating">Policoating</button>` : "") +
      (itens.some((it) => it.video) ? `<button class="chip" data-filtro="videos">▶ Vídeos</button>` : "") +
      (FR ? FR.GRUPOS.filter((g) => itens.some((it) => it.categoria === g.id))
        .map((g) => `<button class="chip" data-filtro="${g.id}"><i class="chip-cor" style="background:${g.hex}"></i>${esc(g.nome)}</button>`).join("") : "");

    const grade = $("#grade-galeria");
    let filtro = "todas", visiveis = [];

    function render() {
      visiveis = itens.filter((it) => filtro === "todas" || it.categoria === filtro);
      grade.innerHTML = visiveis.map((it, i) => `
        <button type="button" class="galeria-item revelar${i % 7 === 0 ? " destaque" : ""}${it.video ? " eh-video" : ""}" data-i="${i}"${it.real ? " data-card-real" : ""} aria-label="Ampliar: ${esc(it.titulo)}">
          ${it.video ? capaVideo(it) : it.svg ? it.svg : `<img src="${esc(it.img)}" alt="${esc(it.titulo)}" loading="lazy"${it.real ? " data-foto-real" : ""} width="600" height="480"${it.cor ? ` data-produto="${esc(it.produto)}" data-cor="${esc(it.cor)}"` : ""}>`}
          <span><strong>${esc(it.titulo)}</strong>${esc(it.sub)}</span>
        </button>`).join("");
      CW.observarRevelar();
    }

    // cartão do vídeo: capa (foto, YouTube) ou o primeiro quadro do arquivo, com o botão de play
    function capaVideo(it) {
      const fundo = it.img ? `<img src="${esc(it.img)}" alt="" loading="lazy" width="600" height="480" onerror="this.remove()">`
        : `<video src="${esc(it.video.url)}#t=0.5" muted playsinline preload="metadata" aria-hidden="true"></video>`;
      return `${fundo}<i class="galeria-play" aria-hidden="true">${window.Icone ? window.Icone("play") : "▶"}</i>`;
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
      midia.classList.toggle("lb-video", !!it.video);
      midia.innerHTML = it.video ? CW.htmlVideo(it.video, "lb-video-player") : it.svg ? it.svg : `<img src="${esc(it.img)}" alt="${esc(it.titulo)}" width="600" height="480"${it.cor ? ` data-produto="${esc(it.produto)}" data-cor="${esc(it.cor)}"` : ""}>`;
      $("#lb-titulo").textContent = it.titulo;
      $("#lb-sub").textContent = it.sub;
      const acao = $("#lb-acao");
      if (it.produto && produto(it.produto)) { acao.hidden = false; acao.textContent = "Ver produto"; acao.href = "produtos.html#produto=" + it.produto; acao.removeAttribute("target"); }
      else if (it.video) { acao.hidden = false; acao.textContent = "Falar com um vendedor"; acao.href = CW.linkWhatsApp(`Olá! Vi o vídeo "${it.titulo}" na galeria da Policoating e gostaria de mais informações.`); acao.target = "_blank"; }
      else { acao.hidden = false; acao.textContent = "Pedir orçamento"; acao.href = CW.linkWhatsApp(`Olá! Vi na galeria "${it.titulo}${it.sub ? " – " + it.sub : ""}" e gostaria de um orçamento.`); acao.target = "_blank"; }
    }
    function abrir(i) { mostrar(i); lb.hidden = false; document.body.style.overflow = "hidden"; requestAnimationFrame(() => lb.classList.add("aberto")); $(".lb-fechar", lb).focus(); }
    function fechar() { lb.classList.remove("aberto"); document.body.style.overflow = ""; setTimeout(() => { lb.hidden = true; if (visiveis[atual] && visiveis[atual].video) $("#lb-midia").innerHTML = ""; }, 250); }   // para o vídeo ao fechar

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

    // Foto que não carregar sai da lista; filtro que ficar vazio some
    document.addEventListener("foto-real-falhou", (e) => {
      const i = itens.findIndex((it) => it.img === e.detail.src);
      if (i < 0) return;
      itens.splice(i, 1);
      $$("#filtros-galeria [data-filtro]").forEach((c) => {
        if (c.dataset.filtro !== "todas") c.hidden = !itens.some((it) => it.categoria === c.dataset.filtro);
      });
    });

    render();
  });
})();
