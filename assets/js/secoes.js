/* =========================================================
   Policoating — seções interativas
   - Carrossel rolante "Tipos de tinta"
   - Vitrine de ambientes (casa, sobrado, loja, galpão, escritório)
   - Aplicações: fotos reais de peças metálicas por cor
   - Guia "Qual pó usar?"
   ========================================================= */
(function () {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const menosMovimento = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Carrossel "Tipos de tinta" ---------- */
  function barra(rotulo, nota) {
    return `<div class="nota"><span>${rotulo}</span><i>${[1, 2, 3, 4, 5].map((n) => `<b class="${n <= nota ? "on" : ""}"></b>`).join("")}</i></div>`;
  }

  function cartaoTipo(chave, cat) {
    const CW = window.ColorWeg, F = window.Fotos;
    const foto = F ? F.fotoCor(cat.cor, (cat.acabamentos || [""])[0], { largura: 480, altura: 300, po: true }) : "";
    const n = cat.notas || {};
    return `<article class="tipo-card">
      <div class="tipo-foto"><div class="tipo-foto-img">${foto ? `<img src="${foto}" alt="Tinta em pó ${CW.esc(cat.nome)}" loading="lazy">` : ""}</div><span class="tipo-icone" aria-hidden="true">${window.Icone ? window.Icone(cat.icone) : ""}</span></div>
      <div class="tipo-info">
        <h3>${CW.esc(cat.nome)}</h3>
        <p>${CW.esc(cat.descricao)}</p>
        <dl>
          <dt>Ideal para</dt><dd>${CW.esc(cat.ideal || "")}</dd>
          <dt>Uso</dt><dd>${CW.esc(cat.uso || "")}</dd>
          <dt>Cura</dt><dd>${CW.esc(cat.cura || "")}</dd>
        </dl>
        <div class="notas">${barra("Resistência ao sol", n.sol || 0)}${barra("Resistência química", n.quimica || 0)}${barra("Anticorrosão", n.corrosao || 0)}</div>
        <div class="tags">${(cat.acabamentos || []).map((a) => `<span>${CW.esc(a)}</span>`).join("")}</div>
        <a class="link" href="produtos.html?categoria=${chave}">Ver produtos ${CW.esc(cat.nome.toLowerCase())} →</a>
      </div>
    </article>`;
  }

  function iniciarCarrosselTipos(raiz) {
    const trilho = $(".carrossel-trilho", raiz);
    const cards = Object.keys(window.CATEGORIAS || {}).map((k) => cartaoTipo(k, CATEGORIAS[k])).join("");
    // Conteúdo duplicado para o giro contínuo
    trilho.innerHTML = cards + cards.replace(/<article class="tipo-card">/g, '<article class="tipo-card" aria-hidden="true">');
    let pausado = menosMovimento, ultimo = 0, resto = 0;
    const metade = () => trilho.scrollWidth / 2;

    function passo(t) {
      const dt = ultimo ? Math.min(50, t - ultimo) : 16;
      ultimo = t;
      if (!pausado && trilho.scrollWidth > trilho.clientWidth) {
        resto += dt * 0.035;
        const px = Math.floor(resto);
        if (px) { trilho.scrollLeft += px; resto -= px; }
        if (trilho.scrollLeft >= metade()) trilho.scrollLeft -= metade();
      }
      requestAnimationFrame(passo);
    }
    const pausar = (v) => () => { pausado = v || menosMovimento; };
    raiz.addEventListener("mouseenter", pausar(true));
    raiz.addEventListener("mouseleave", pausar(false));
    raiz.addEventListener("focusin", pausar(true));
    raiz.addEventListener("focusout", pausar(false));
    let retomar = 0;
    trilho.addEventListener("touchstart", () => { pausado = true; clearTimeout(retomar); }, { passive: true });
    trilho.addEventListener("touchend", () => { retomar = setTimeout(pausar(false), 3500); });
    trilho.addEventListener("scroll", () => {
      if (trilho.scrollLeft >= metade()) trilho.scrollLeft -= metade();
      if (trilho.scrollLeft <= 0 && !pausado) trilho.scrollLeft += metade();
    }, { passive: true });

    const largura = () => ($(".tipo-card", trilho) || { offsetWidth: 320 }).offsetWidth + 20;
    $(".carrossel-seta.ant", raiz).addEventListener("click", () => {
      if (trilho.scrollLeft < largura()) trilho.scrollLeft += metade();
      trilho.scrollBy({ left: -largura(), behavior: "smooth" });
    });
    $(".carrossel-seta.prox", raiz).addEventListener("click", () => trilho.scrollBy({ left: largura(), behavior: "smooth" }));
    requestAnimationFrame(passo);
  }

  /* ---------- Vitrine de ambientes ---------- */
  const AMBIENTES = [
    { tipo: "casa", nome: "Residências", texto: "Portões, grades e esquadrias protegidos do sol e da chuva por muitos anos.", produto: "poliester-fosco", cor: "#0E0E10", acab: "Fosco" },
    { tipo: "sobrado", nome: "Sobrados e sacadas", texto: "Guarda-corpos e esquadrias com acabamento arquitetônico e alta retenção de cor.", produto: "poliester-fosco", cor: "#383E42", acab: "Fosco" },
    { tipo: "loja", nome: "Comércio", texto: "Fachadas e vitrines em alumínio com cor viva e brilho duradouro.", produto: "poliester-brilhante", cor: "#0E4C92", acab: "Brilhante" },
    { tipo: "galpao", nome: "Indústria", texto: "Estruturas metálicas e portas com sistema anticorrosivo de alta performance.", produto: "primer-zinco", cor: "#F2A900", acab: "Brilhante" },
    { tipo: "escritorio", nome: "Móveis e escritórios", texto: "Mesas, cadeiras e estantes de aço com acabamento uniforme e resistente a riscos.", produto: "hibrida-brilhante", cor: "#57A639", acab: "Acetinado" }
  ];
  const PALETA = ["#0E0E10", "#383E42", "#F1F0EA", "#0E4C92", "#1558d6", "#A72920", "#F2A900", "#E75B12", "#114232", "#57A639", "#A5A5A5", "#B06A3B"];

  function iniciarAmbientes(raiz) {
    const CW = window.ColorWeg, F = window.Fotos;
    if (!F) return;
    raiz.innerHTML = `
      <div class="amb-abas" role="tablist">${AMBIENTES.map((a, i) => `<button type="button" role="tab" data-amb="${i}">${a.nome}</button>`).join("")}</div>
      <div class="amb-corpo">
        <div class="amb-cena" aria-live="polite"></div>
        <div class="amb-info">
          <h3 class="amb-titulo"></h3>
          <p class="amb-texto"></p>
          <div class="campo-titulo">Experimente outra cor</div>
          <div class="amb-paleta">${PALETA.map((h) => `<button type="button" data-cor="${h}" style="background:${h}" aria-label="Cor ${h}"></button>`).join("")}</div>
          <p class="amb-produto"></p>
          <a class="btn btn-primario amb-link" href="produtos.html">Ver produto indicado</a>
        </div>
      </div>`;
    let atual = 0, cor = AMBIENTES[0].cor, timer = 0, interagiu = false;

    function desenhar(anim) {
      const a = AMBIENTES[atual];
      const cena = $(".amb-cena", raiz);
      if (anim) { cena.classList.remove("trocando"); void cena.offsetWidth; cena.classList.add("trocando"); }
      cena.innerHTML = F.ambienteSVG(a.tipo, cor, a.acab);
      $(".amb-titulo", raiz).textContent = a.nome;
      $(".amb-texto", raiz).textContent = a.texto;
      const p = (window.PRODUTOS || []).find((x) => x.id === a.produto);
      $(".amb-produto", raiz).innerHTML = p ? `Indicado: <strong>${CW.esc(p.nome)}</strong>` : "";
      $(".amb-link", raiz).href = "produtos.html#produto=" + a.produto;
      $$(".amb-abas button", raiz).forEach((b, i) => { b.classList.toggle("ativo", i === atual); b.setAttribute("aria-selected", i === atual); });
      $$(".amb-paleta button", raiz).forEach((b) => b.classList.toggle("ativo", b.dataset.cor.toLowerCase() === cor.toLowerCase()));
    }
    function ir(i, manual) {
      atual = (i + AMBIENTES.length) % AMBIENTES.length;
      cor = AMBIENTES[atual].cor;
      if (manual) interagiu = true;
      desenhar(true);
      agendar();
    }
    function agendar() {
      clearTimeout(timer);
      if (!interagiu && !menosMovimento) timer = setTimeout(() => ir(atual + 1), 6000);
    }
    $$(".amb-abas button", raiz).forEach((b) => b.addEventListener("click", () => ir(+b.dataset.amb, true)));
    $$(".amb-paleta button", raiz).forEach((b) => b.addEventListener("click", () => {
      interagiu = true; clearTimeout(timer); cor = b.dataset.cor; desenhar(true);
    }));
    desenhar(false);
    // Só começa a girar quando a seção aparece na tela
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((en, io) => { if (en[0].isIntersecting) { agendar(); io.disconnect(); } }, { threshold: 0.4 }).observe(raiz);
    }
  }

  /* ---------- Guia "Qual pó usar?" ---------- */
  const PERGUNTAS = [
    { id: "ambiente", texto: "Onde a peça vai ficar?", opcoes: [["externo", "Área externa (sol e chuva)"], ["interno", "Ambiente interno"], ["agressivo", "Ambiente agressivo (maresia, química)"], ["calor", "Calor intenso (acima de 200 °C)"]] },
    { id: "acabamento", texto: "Qual acabamento você procura?", opcoes: [["brilhante", "Liso brilhante"], ["fosco", "Fosco / acetinado"], ["textura", "Texturizado ou martelado"], ["metal", "Metálico"], ["qualquer", "Ainda não sei"]] },
    { id: "metal", texto: "Qual é o metal da peça?", opcoes: [["aco", "Aço carbono / ferro"], ["aluminio", "Alumínio"], ["galvanizado", "Aço galvanizado"]] }
  ];

  function recomendar(r) {
    const lista = [], notas = [];
    if (r.ambiente === "calor") {
      lista.push("alta-temperatura");
      notas.push("Para peças que esquentam acima de 200 °C, só a linha de alta temperatura mantém a cor e a aderência.");
    } else {
      const mapa = {
        externo: { brilhante: ["poliester-brilhante"], fosco: ["poliester-fosco"], textura: ["texturizada-rugosa"], metal: ["metalica-prata", "verniz-po"], qualquer: ["poliester-brilhante", "poliester-fosco"] },
        interno: { brilhante: ["hibrida-brilhante"], fosco: ["hibrida-acetinada"], textura: ["texturizada-martelada", "epoxi-painel-eletrico"], metal: ["metalica-prata", "metalica-cobre"], qualquer: ["hibrida-brilhante", "epoxi-anticorrosivo"] },
        agressivo: { brilhante: ["poliester-brilhante"], fosco: ["poliester-fosco"], textura: ["texturizada-rugosa"], metal: ["metalica-prata", "verniz-po"], qualquer: ["poliester-brilhante", "epoxi-anticorrosivo"] }
      };
      lista.push(...mapa[r.ambiente][r.acabamento]);
      if (r.ambiente === "externo") notas.push("Para uso externo, use poliéster: ele resiste aos raios UV sem amarelar ou perder o brilho.");
      if (r.ambiente === "interno") notas.push("Em ambientes internos, a linha híbrida oferece ótimo acabamento e custo-benefício; o epóxi é indicado quando há contato com produtos químicos.");
      if (r.ambiente === "agressivo" || (r.ambiente === "externo" && r.metal !== "aluminio")) {
        lista.unshift("primer-zinco");
        notas.push("Recomendamos um sistema de duas camadas: primer rico em zinco + acabamento. Isso multiplica a proteção contra a corrosão.");
      }
    }
    if (r.metal === "aluminio") notas.push("No alumínio, o pré-tratamento com cromatização ou nanotecnologia é essencial para a aderência.");
    if (r.metal === "galvanizado") notas.push("No aço galvanizado, faça a desgaseificação (pré-aquecimento) antes da aplicação para evitar bolhas.");
    return { ids: [...new Set(lista)], notas };
  }

  function iniciarGuia(raiz) {
    const CW = window.ColorWeg;
    const resp = {};
    raiz.innerHTML = `
      <div class="guia-passos">${PERGUNTAS.map((q, i) => `
        <fieldset class="guia-pergunta" data-q="${q.id}">
          <legend><b>${i + 1}</b> ${q.texto}</legend>
          <div class="guia-opcoes">${q.opcoes.map(([v, t]) => `<button type="button" data-v="${v}">${t}</button>`).join("")}</div>
        </fieldset>`).join("")}
      </div>
      <div class="guia-resultado" aria-live="polite" hidden></div>`;
    const res = $(".guia-resultado", raiz);

    $$(".guia-pergunta", raiz).forEach((fs) => fs.addEventListener("click", (e) => {
      const b = e.target.closest("[data-v]");
      if (!b) return;
      resp[fs.dataset.q] = b.dataset.v;
      $$("[data-v]", fs).forEach((x) => x.classList.toggle("ativo", x === b));
      fs.classList.add("respondida");
      const prox = fs.nextElementSibling;
      if (prox && !prox.classList.contains("respondida") && window.innerWidth < 860) prox.scrollIntoView({ behavior: "smooth", block: "center" });
      if (PERGUNTAS.every((q) => resp[q.id])) mostrar();
    }));

    function mostrar() {
      const r = recomendar(resp);
      const produtos = r.ids.map((id) => (window.PRODUTOS || []).find((p) => p.id === id)).filter(Boolean);
      const resumo = PERGUNTAS.map((q) => q.opcoes.find((o) => o[0] === resp[q.id])[1]).join(" · ");
      res.hidden = false;
      res.innerHTML = `<div class="guia-cabecalho"><div><span class="rotulo">Nossa recomendação</span><h3>${produtos.length > 1 ? "Estes produtos são ideais" : "Este produto é ideal"} para você</h3>
        <p class="guia-resumo">${CW.esc(resumo)}</p></div>
        <a class="btn btn-whats" target="_blank" rel="noopener" href="${CW.esc(CW.linkWhatsApp("Olá! Usei o guia do site (" + resumo + ") e gostaria de confirmar a indicação com um técnico."))}">Confirmar com um técnico</a></div>
        <ul class="guia-notas">${r.notas.map((n) => `<li>${CW.esc(n)}</li>`).join("")}</ul>
        <div class="grade-produtos"></div>`;
      CW.renderProdutos($(".grade-produtos", res), produtos);
      res.scrollIntoView({ behavior: menosMovimento ? "auto" : "smooth", block: "start" });
    }
  }

  /* ---------- Aplicações: fotos reais de peças metálicas por cor ---------- */
  function iniciarInspiracao(raiz) {
    const CW = window.ColorWeg, FR = window.FotosReais;
    if (!FR || !CW) return;
    const esc = CW.esc;
    const grupos = FR.GRUPOS.filter((g) => FR.FOTOS.some((f) => f.cor === g.id));
    raiz.innerHTML = `
      <div class="insp-filtros" role="tablist" aria-label="Filtrar por cor">
        <button type="button" class="insp-chip ativo" data-cor="">Todas</button>
        ${grupos.map((g) => `<button type="button" class="insp-chip" data-cor="${g.id}"><i style="background:${g.hex}"></i>${esc(g.nome)}</button>`).join("")}
      </div>
      <div class="insp-area">
        <button type="button" class="insp-seta anterior" aria-label="Anteriores">‹</button>
        <div class="insp-trilho" tabindex="0" aria-live="polite"></div>
        <button type="button" class="insp-seta proxima" aria-label="Próximas">›</button>
      </div>
      <p class="insp-credito">${esc(FR.credito)}. As cores das tintas indicadas são aproximadas; confirme a cor com o vendedor.</p>`;
    const trilho = $(".insp-trilho", raiz);

    function mostrar(cor) {
      const lista = FR.FOTOS.filter((f) => !cor || f.cor === cor);
      trilho.innerHTML = lista.map((f) => {
        const p = PRODUTOS.find((x) => x.id === f.produto);
        const c = p && (p.cores.find((x) => x.nome === f.corProduto) || p.cores[0]);
        return `<article class="insp-card" data-card-real>
          <img data-foto-real src="${esc(FR.url(f, 700))}" alt="${esc(f.titulo)}" loading="lazy" width="700" height="933">
          <div class="insp-legenda">
            <span class="insp-rotulo">${esc(f.texto)}</span>
            <strong>${esc(f.titulo)}</strong>
            ${p ? `<button type="button" class="insp-tinta" data-produto="${esc(p.id)}" data-cor="${esc(c.nome)}">
              <i style="background:${esc(c.hex)}"></i><span>${esc(p.nome)}<small>${esc(c.nome)}</small></span></button>` : ""}
          </div>
        </article>`;
      }).join("");
      trilho.scrollLeft = 0;
      requestAnimationFrame(() => {
        const sobra = trilho.scrollWidth > trilho.clientWidth + 4;
        $$(".insp-seta", raiz).forEach((b) => (b.hidden = !sobra));
      });
    }
    mostrar("");

    // sem nenhuma foto carregada (ex.: sem internet para o banco de fotos), a seção some
    const secao = raiz.closest("section");
    document.addEventListener("foto-real-falhou", (e) => {
      if (e.detail.pai === trilho && !trilho.children.length && !$(".insp-chip.ativo", raiz).dataset.cor && secao) secao.hidden = true;
    });

    raiz.addEventListener("click", (e) => {
      const chip = e.target.closest(".insp-chip");
      if (chip) {
        $$(".insp-chip", raiz).forEach((b) => b.classList.toggle("ativo", b === chip));
        mostrar(chip.dataset.cor);
        return;
      }
      const seta = e.target.closest(".insp-seta");
      if (seta) {
        const passo = trilho.clientWidth * 0.8 * (seta.classList.contains("anterior") ? -1 : 1);
        trilho.scrollBy({ left: passo, behavior: menosMovimento ? "auto" : "smooth" });
        return;
      }
      const card = e.target.closest(".insp-card");
      const btn = card && $(".insp-tinta", card);
      if (btn) CW.abrirProduto(btn.dataset.produto, btn.dataset.cor);
    });
  }

  /* ---------- Destaques em cápsula (estilo WEG) ---------- */
  function iniciarPilulas(raiz) {
    const itens = $$(".pilula", raiz);
    if (itens.length < 2) return;
    let atual = 0, timer = 0;
    const ir = (n) => {
      itens[atual].classList.remove("ativa");
      atual = (n + itens.length) % itens.length;
      itens[atual].classList.add("ativa");
    };
    const auto = () => { clearInterval(timer); timer = setInterval(() => ir(atual + 1), 8000); };
    $(".ant", raiz).addEventListener("click", () => { ir(atual - 1); auto(); });
    $(".prox", raiz).addEventListener("click", () => { ir(atual + 1); auto(); });
    auto();
  }

  /* ---------- Newsletter ---------- */
  function iniciarNewsletter(form) {
    const status = $(".news-status", form), CFG = window.SITE_CONFIG || {};
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = form.email.value.trim();
      const botao = $("button", form);
      botao.disabled = true;
      status.className = "news-status";
      try {
        if (!window.Conta) throw new Error("sem-servidor");
        await window.Conta.inscreverNewsletter(email);
        status.textContent = "Pronto! Você vai receber nossas novidades.";
        status.classList.add("ok");
        form.reset();
      } catch (err) {
        if (err.message === "sem-servidor") {
          // sem o cadastro online, abre o e-mail já preenchido
          location.href = `mailto:${CFG.email || "contato@policoating.com.br"}?subject=${encodeURIComponent("Quero receber a newsletter")}&body=${encodeURIComponent("Meu e-mail: " + email)}`;
          status.textContent = "Abrimos seu e-mail para concluir o cadastro.";
        } else {
          status.textContent = err.message;
          status.classList.add("erro");
        }
      } finally { botao.disabled = false; }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    $$("[data-pilulas]").forEach(iniciarPilulas);
    $$("[data-newsletter]").forEach(iniciarNewsletter);
    $$("[data-inspiracao]").forEach(iniciarInspiracao);
    $$("[data-carrossel-tipos]").forEach(iniciarCarrosselTipos);
    $$("[data-ambientes]").forEach(iniciarAmbientes);
    $$("[data-guia]").forEach(iniciarGuia);
  });

  window.Secoes = { recomendar };
})();
