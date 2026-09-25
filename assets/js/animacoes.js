/* =========================================================
   Policoating — animações
   - Cabeçalho que se ajusta ao rolar
   - Slides da página inicial (autoplay, setas, pontos, arrastar)
   - Contadores animados
   - "Vídeo" animado do processo de pintura a pó (canvas)
   Respeita a preferência do sistema por menos movimento.
   ========================================================= */
(function () {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  // Quem desliga as animações do sistema não recebe os movimentos grandes (zoom e profundidade).
  // Slides, faixa rolante e vídeos continuam, sempre com botão para pausar.
  const menosMovimento = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MIDIA = window.MIDIA || {};

  /* ---------- Cabeçalho ao rolar ---------- */
  function iniciarCabecalho() {
    const cab = $(".cabecalho");
    if (!cab) return;
    const atualizar = () => cab.classList.toggle("rolado", window.scrollY > 12);
    atualizar();
    window.addEventListener("scroll", atualizar, { passive: true });
  }

  /* ---------- Artes dos slides ---------- */
  function arteLinha() {
    const F = window.Fotos;
    if (!F) return "";
    return `<img class="cena" src="${F.cenaLinha(["#1558d6", "#e9ecef", "#383E42", "#A72920"])}" alt="Placas metálicas pintadas com tinta em pó na linha de pintura">`;
  }

  function arteCartela() {
    const cores = [["#0E0E10", "RAL 9005", "Preto intenso"], ["#383E42", "RAL 7016", "Cinza antracite"], ["#8A9597", "RAL 7001", "Cinza prata"], ["#F1F0EA", "RAL 9016", "Branco tráfego"],
      ["#0E4C92", "RAL 5010", "Azul genciana"], ["#1558d6", "RAL 5005", "Azul sinal"], ["#114232", "RAL 6005", "Verde musgo"], ["#57A639", "RAL 6018", "Verde amarelado"],
      ["#A72920", "RAL 3000", "Vermelho fogo"], ["#E75B12", "RAL 2004", "Laranja puro"], ["#F2A900", "RAL 1003", "Amarelo sinal"], ["#A5A5A5", "RAL 9006", "Alumínio branco"]];
    return `<div class="cartela">${cores.map(([hex, cod, nome], i) =>
      `<div class="cartela-chip" style="--i:${i};background-color:${hex}"><span>${cod}<small>${nome}</small></span></div>`).join("")}</div>`;
  }

  function arteFicha() {
    const F = window.Fotos, I = window.Icone || (() => "");
    const foto = F ? F.fotoCor("#1558d6", "Brilhante", { largura: 520, altura: 620, po: false }) : "";
    const linhas = [["relogio", "Cura", "10 min a 200 °C"], ["camadas", "Espessura", "60–80 µm"], ["alvo", "Rendimento", "≈ 9,5 m²/kg"],
      ["folha", "Solventes (VOC)", "0%"], ["escudo", "Proteção", "Corrosão e UV"], ["caixa", "Embalagem", "Caixas 20 e 25 kg"]];
    return `<div class="ficha-arte">${foto ? `<img src="${foto}" alt="Placa pintada com poliéster azul brilhante">` : ""}
      <div class="ficha-tabela">${linhas.map(([ic, k, v]) => `<div><span>${I(ic)}${k}</span><strong>${v}</strong></div>`).join("")}</div></div>`;
  }

  function arteCaixas() {
    const CW = window.ColorWeg;
    if (!CW) return "";
    return `${CW.caixaSVG("#f7c600", "caixa-hero")}${CW.caixaSVG("#383E42", "caixa-hero")}${CW.caixaSVG("#1558d6", "caixa-hero")}`;
  }

  const ARTES = { linha: arteLinha, cartela: arteCartela, ficha: arteFicha, caixas: arteCaixas, cores: arteCartela, spray: arteFicha };

  /* ---------- Partículas de pó (slide da pistola) ---------- */
  function particulasSpray(canvas) {
    const ctx = canvas.getContext("2d");
    let parts = [], ativo = false, raf = 0;
    function medir() {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = r.width * dpr; canvas.height = r.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function quadro() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      const ox = w * 0.44, oy = h * 0.48, alvo = w * 0.74;
      for (let i = 0; i < 6; i++) {
        parts.push({ x: ox, y: oy, vx: 2.2 + Math.random() * 2.6, vy: (Math.random() - 0.5) * 1.8, r: Math.random() * 2.2 + 0.6, v: 1 });
      }
      parts = parts.filter((p) => p.v > 0.02);
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy; p.vy += (Math.random() - 0.5) * 0.25;
        if (p.x > alvo) { p.vx *= 0.5; p.v *= 0.86; }
        p.v *= 0.992;
        ctx.fillStyle = `rgba(21,88,214,${p.v * 0.7})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + (p.x - ox) / w), 0, Math.PI * 2); ctx.fill();
      }
      if (parts.length > 700) parts.splice(0, parts.length - 700);
      raf = ativo ? requestAnimationFrame(quadro) : 0;
    }
    window.addEventListener("resize", medir);
    return {
      ligar() { if (menosMovimento || ativo) return; ativo = true; medir(); raf = requestAnimationFrame(quadro); },
      desligar() { ativo = false; cancelAnimationFrame(raf); parts = []; ctx.clearRect(0, 0, canvas.width, canvas.height); }
    };
  }

  /* ---------- Slider ---------- */
  function iniciarSlider(raiz) {
    const slides = $$(".slide", raiz);
    if (!slides.length) return;
    const pontos = $(".slider-pontos", raiz);
    const TEMPO = 7000;
    let atual = 0, timer = 0, pausado = false, spray = null;

    slides.forEach((s, i) => {
      const arte = $(".slide-arte", s);
      const foto = (MIDIA.slides || [])[i] || s.dataset.foto;
      if (foto || s.dataset.video) {
        // foto (com zoom lento) ou vídeo de fundo em tela cheia; a ilustração não é usada
        s.classList.add("com-foto");
        const fundo = document.createElement("div");
        fundo.className = "slide-fundo";
        if (foto) fundo.style.backgroundImage = `url("${foto}")`;
        s.prepend(fundo);
        if (s.dataset.video) {
          const v = document.createElement("video");
          Object.assign(v, { muted: true, loop: true, playsInline: true, autoplay: true, preload: "auto" });
          v.className = "slide-video";
          v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("aria-hidden", "true");
          if (foto) v.poster = foto;
          v.src = s.dataset.video;
          v.addEventListener("error", () => v.remove());
          fundo.appendChild(v);
          v.play().catch(() => {});
        }
        if (arte) arte.remove();
      } else if (arte && ARTES[s.dataset.arte]) {
        arte.innerHTML = ARTES[s.dataset.arte]();
        const c = $("canvas.particulas", arte);
        if (c) spray = { slide: i, ctrl: particulasSpray(c) };
      }
      s.setAttribute("aria-roledescription", "slide");
      s.setAttribute("aria-label", `${i + 1} de ${slides.length}`);
    });

    pontos.innerHTML = slides.map((_, i) => `<button type="button" aria-label="Ir para o slide ${i + 1}"><i></i></button>`).join("");
    const botoes = $$("button", pontos);

    function ir(n) {
      slides[atual].classList.remove("ativo");
      slides[atual].setAttribute("aria-hidden", "true");
      botoes[atual].classList.remove("ativo");
      atual = (n + slides.length) % slides.length;
      slides[atual].classList.add("ativo");
      slides[atual].removeAttribute("aria-hidden");
      botoes.forEach((b) => b.style.setProperty("--tempo", TEMPO + "ms"));
      void botoes[atual].offsetWidth;
      botoes[atual].classList.add("ativo");
      if (spray) (atual === spray.slide ? spray.ctrl.ligar() : spray.ctrl.desligar());
      agendar();
    }
    let parado = false;                                   // pausado pelo botão
    function agendar() {
      clearTimeout(timer);
      raiz.classList.toggle("pausado", pausado || parado);
      if (!pausado && !parado) timer = setTimeout(() => ir(atual + 1), TEMPO);
    }
    const pausar = (v) => { pausado = v; agendar(); };
    const botaoPausa = document.createElement("button");
    botaoPausa.type = "button"; botaoPausa.className = "slider-pausa";
    const rotular = () => { botaoPausa.setAttribute("aria-label", parado ? "Continuar slides e vídeo" : "Pausar slides e vídeo"); botaoPausa.classList.toggle("parado", parado); };
    rotular();
    botaoPausa.addEventListener("click", (e) => {
      e.stopPropagation();
      parado = !parado; rotular(); agendar();
      $$(".slide-video", raiz).forEach((v) => (parado ? v.pause() : v.play().catch(() => {})));
    });
    raiz.appendChild(botaoPausa);

    botoes.forEach((b, i) => b.addEventListener("click", () => ir(i)));
    $(".slider-seta.ant", raiz).addEventListener("click", () => ir(atual - 1));
    $(".slider-seta.prox", raiz).addEventListener("click", () => ir(atual + 1));
    raiz.addEventListener("mouseenter", () => pausar(true));
    raiz.addEventListener("mouseleave", () => pausar(false));
    raiz.addEventListener("focusin", () => pausar(true));
    raiz.addEventListener("focusout", () => pausar(false));
    raiz.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") ir(atual - 1);
      if (e.key === "ArrowRight") ir(atual + 1);
    });
    document.addEventListener("visibilitychange", () => pausar(document.hidden));

    // Arrastar no celular
    let inicioX = null;
    raiz.addEventListener("touchstart", (e) => { inicioX = e.touches[0].clientX; }, { passive: true });
    raiz.addEventListener("touchend", (e) => {
      if (inicioX == null) return;
      const d = e.changedTouches[0].clientX - inicioX;
      if (Math.abs(d) > 50) ir(atual + (d < 0 ? 1 : -1));
      inicioX = null;
    });

    slides.forEach((s, i) => { if (i !== 0) s.setAttribute("aria-hidden", "true"); });
    ir(0);
  }

  /* ---------- Contadores ---------- */
  function iniciarContadores() {
    const els = $$("[data-contar]");
    if (!els.length) return;
    const animar = (el) => {
      const fim = parseFloat(el.dataset.contar), pre = el.dataset.prefixo || "", suf = el.dataset.sufixo || "";
      const t0 = performance.now(), dur = 1400;
      const passo = (t) => {
        const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        el.textContent = pre + Math.round(fim * e) + suf;
        if (p < 1) requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
    };
    if (!("IntersectionObserver" in window)) return els.forEach(animar);
    const io = new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) { animar(e.target); io.unobserve(e.target); } }), { threshold: 0.6 });
    els.forEach((el) => io.observe(el));
  }

  /* ---------- "Vídeo" do processo de pintura a pó ---------- */
  const ETAPAS = [
    { nome: "Pré-tratamento", desc: "Desengraxe e fosfatização deixam o metal limpo para máxima aderência." },
    { nome: "Aplicação eletrostática", desc: "A pistola carrega o pó, que é atraído pela peça aterrada e cobre até as bordas." },
    { nome: "Cura em estufa", desc: "Entre 180 e 200 °C o pó derrete, nivela e forma um filme resistente." },
    { nome: "Peça pronta", desc: "Acabamento uniforme, resistente a impacto, riscos e corrosão." }
  ];
  const CORES_VIDEO = ["#1558d6", "#f7c600", "#e53935", "#3cb043", "#111418"];

  function iniciarVideoProcesso(raiz) {
    raiz.innerHTML = `<div class="vp-tela"><canvas width="960" height="540" aria-label="Animação do processo de pintura eletrostática a pó"></canvas>
      <button type="button" class="vp-play" aria-label="Pausar animação"></button></div>
      <div class="vp-etapas">${ETAPAS.map((e, i) => `<button type="button" data-etapa="${i}"><b>${i + 1}</b><span>${e.nome}</span></button>`).join("")}</div>
      <p class="vp-legenda" aria-live="polite"></p>`;
    const canvas = $("canvas", raiz), ctx = canvas.getContext("2d");
    const W = 960, H = 540, CICLO = 14;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const ST = [210, 480, 750];
    const TRAJ = [[0, -70], [1.5, 210], [3.5, 210], [4.5, 480], [7, 480], [8, 750], [10.5, 750], [11.5, 900], [13, 900], [14, 1060]];
    const INICIO_ETAPA = [0, 3.5, 7, 10.5];
    let t = 0, ultimo = 0, rodando = !menosMovimento, visivel = false, raf = 0, volta = 0, etapaMostrada = -1;
    let agua = [], po = [];

    const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
    const faixa = (a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
    function posicao() {
      for (let i = 0; i < TRAJ.length - 1; i++) {
        const [t0, x0] = TRAJ[i], [t1, x1] = TRAJ[i + 1];
        if (t <= t1) return x0 + (x1 - x0) * ease((t - t0) / (t1 - t0));
      }
      return TRAJ[TRAJ.length - 1][1];
    }
    const etapaAtual = () => (t < 3.5 ? 0 : t < 7 ? 1 : t < 10.5 ? 2 : 3);

    function cena() {
      const cor = CORES_VIDEO[volta % CORES_VIDEO.length];
      const tom = window.Fotos ? window.Fotos.tom : (h) => h;
      let g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#0b1424"); g.addColorStop(1, "#16284a");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#0a1220"; ctx.fillRect(0, 430, W, 110);
      ctx.strokeStyle = "rgba(255,255,255,.05)"; ctx.lineWidth = 1;
      for (let x = -((t * 40) % 60); x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 430); ctx.lineTo(x - 40, 540); ctx.stroke(); }

      // Trilho
      g = ctx.createLinearGradient(0, 96, 0, 112);
      g.addColorStop(0, "#c9cfd6"); g.addColorStop(1, "#5d6670");
      ctx.fillStyle = g; ctx.fillRect(0, 96, W, 14);

      const et = etapaAtual();
      // Estação 1 — túnel de pré-tratamento
      ctx.fillStyle = "rgba(90,170,255,.07)"; ctx.fillRect(130, 130, 160, 280);
      ctx.strokeStyle = "rgba(120,190,255,.5)"; ctx.lineWidth = 2; ctx.strokeRect(130, 130, 160, 280);
      ctx.fillStyle = "#6b7c93"; for (let i = 0; i < 5; i++) ctx.fillRect(146 + i * 30, 130, 10, 12);
      // Estação 2 — cabine
      ctx.fillStyle = "rgba(255,255,255,.04)"; ctx.fillRect(390, 130, 180, 280);
      ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.strokeRect(390, 130, 180, 280);
      ctx.save(); ctx.translate(340, 300);
      ctx.fillStyle = "#e0a800"; roundRect(ctx, -60, -18, 80, 32, 10); ctx.fill();
      ctx.fillStyle = "#2b2f36"; ctx.fillRect(20, -10, 26, 16); roundRect(ctx, -52, 8, 22, 50, 6); ctx.fill();
      ctx.restore();
      // Estação 3 — estufa
      const calor = faixa(7.6, 8.4) * (1 - faixa(10.3, 10.8));
      g = ctx.createLinearGradient(0, 130, 0, 410);
      g.addColorStop(0, `rgba(255,120,30,${0.12 + calor * 0.35})`); g.addColorStop(1, `rgba(255,60,20,${0.05 + calor * 0.25})`);
      ctx.fillStyle = "#1f2530"; ctx.fillRect(660, 130, 180, 280);
      ctx.fillStyle = g; ctx.fillRect(660, 130, 180, 280);
      ctx.strokeStyle = `rgba(255,140,60,${0.4 + calor * 0.5})`; ctx.strokeRect(660, 130, 180, 280);
      if (calor > 0) {
        ctx.strokeStyle = `rgba(255,170,90,${calor * 0.6})`; ctx.lineWidth = 2;
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          for (let y = 0; y < 60; y += 4) ctx.lineTo(700 + k * 50 + Math.sin(y / 8 + t * 6 + k) * 6, 120 - y);
          ctx.stroke();
        }
      }

      // Rótulos das estações
      ["Pré-tratamento", "Pintura", "Estufa"].forEach((nome, i) => {
        const ativo = et === i;
        ctx.fillStyle = ativo ? "#1558d6" : "rgba(255,255,255,.12)";
        ctx.beginPath(); ctx.arc(ST[i] - 50, 460, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = "700 15px Inter, Arial"; ctx.textAlign = "center"; ctx.fillText(i + 1, ST[i] - 50, 465);
        ctx.textAlign = "left"; ctx.font = (ativo ? "700 " : "500 ") + "16px Inter, Arial";
        ctx.fillStyle = ativo ? "#fff" : "rgba(255,255,255,.55)"; ctx.fillText(nome, ST[i] - 28, 466);
      });

      // Peça
      const x = posicao();
      const cobertura = faixa(4.6, 6.8), cura = faixa(8.3, 10.2);
      ctx.strokeStyle = "#8b949e"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, 110); ctx.lineTo(x, 152); ctx.stroke();
      g = ctx.createLinearGradient(x - 45, 160, x + 45, 320);
      g.addColorStop(0, "#c3cad1"); g.addColorStop(0.5, "#8f99a3"); g.addColorStop(1, "#6b747e");
      ctx.fillStyle = g; roundRect(ctx, x - 45, 160, 90, 160, 5); ctx.fill();
      if (cobertura > 0) {
        ctx.save(); roundRect(ctx, x - 45, 160, 90, 160, 5); ctx.clip();
        ctx.globalAlpha = cobertura;
        ctx.fillStyle = cor; ctx.fillRect(x - 45, 160, 90, 160 * Math.min(1, cobertura * 1.2));
        ctx.globalAlpha = cobertura * (1 - cura) * 0.6;
        for (let i = 0; i < 160; i++) {
          ctx.fillStyle = i % 2 ? "rgba(255,255,255,.5)" : "rgba(0,0,0,.35)";
          ctx.fillRect(x - 45 + ((i * 37) % 90), 160 + ((i * 53) % 160), 2, 2);
        }
        ctx.globalAlpha = cura;
        g = ctx.createLinearGradient(x - 45, 160, x + 45, 320);
        g.addColorStop(0, "rgba(255,255,255,.55)"); g.addColorStop(0.35, "rgba(255,255,255,0)");
        g.addColorStop(0.5, "rgba(255,255,255,.25)"); g.addColorStop(0.56, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(0,0,0,.2)");
        ctx.fillStyle = g; ctx.fillRect(x - 45, 160, 90, 160);
        ctx.restore();
      }
      ctx.fillStyle = "#0e1a2e";
      for (let l = 0; l < 5; l++) for (let c = 0; c < 3; c++) { ctx.beginPath(); ctx.arc(x - 22 + c * 22, 196 + l * 24, 4, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = "#8b949e"; ctx.beginPath(); ctx.arc(x, 160, 8, Math.PI, 0); ctx.stroke();

      // Água (pré-tratamento)
      if (t > 1.6 && t < 3.4) for (let i = 0; i < 4; i++) agua.push({ x: 146 + Math.random() * 130, y: 144, v: 4 + Math.random() * 3 });
      agua = agua.filter((p) => p.y < 400);
      ctx.fillStyle = "rgba(120,200,255,.7)";
      agua.forEach((p) => { p.y += p.v; ctx.fillRect(p.x, p.y, 2, 7); });

      // Pó (aplicação)
      if (t > 4.6 && t < 6.8) for (let i = 0; i < 9; i++) po.push({ x: 388, y: 298, vx: 3 + Math.random() * 4, vy: (Math.random() - 0.5) * 3.2, a: 1 });
      po = po.filter((p) => p.a > 0.05);
      po.forEach((p) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x > x - 50) { p.vx *= 0.3; p.a *= 0.7; }
        ctx.fillStyle = tom(cor, 0.2, p.a * 0.8);
        ctx.fillRect(p.x, p.y, 2.5, 2.5);
      });

      // Selo de pronto
      if (t > 11.4) {
        const a = faixa(11.4, 11.9) * (1 - faixa(13.2, 13.8));
        ctx.globalAlpha = a;
        ctx.fillStyle = "#2e7d32"; ctx.beginPath(); ctx.arc(x + 58, 170, 18, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + 49, 170); ctx.lineTo(x + 56, 177); ctx.lineTo(x + 68, 162); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.lineWidth = 1;
    }

    function roundRect(c, x, y, w, h, r) {
      c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
    }

    function atualizarLegenda() {
      const e = etapaAtual();
      if (e === etapaMostrada) return;
      etapaMostrada = e;
      $$(".vp-etapas button", raiz).forEach((b, i) => b.classList.toggle("ativo", i === e));
      $(".vp-legenda", raiz).innerHTML = `<strong>${e + 1}. ${ETAPAS[e].nome}</strong> ${ETAPAS[e].desc}`;
    }

    function quadro(agora) {
      const dt = Math.min(0.05, (agora - (ultimo || agora)) / 1000);
      ultimo = agora;
      if (rodando) {
        t += dt;
        if (t >= CICLO) { t = 0; volta++; agua = []; po = []; }
      }
      cena();
      atualizarLegenda();
      raf = rodando && visivel ? requestAnimationFrame(quadro) : 0;
    }
    function continuar() { if (!raf && visivel) { ultimo = 0; raf = requestAnimationFrame(quadro); } }

    const play = $(".vp-play", raiz);
    function alternar(v) {
      rodando = v;
      play.innerHTML = rodando ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" fill="currentColor"/></svg>';
      play.setAttribute("aria-label", rodando ? "Pausar animação" : "Reproduzir animação");
      raiz.classList.toggle("pausado", !rodando);
      if (rodando) continuar(); else { cena(); atualizarLegenda(); }
    }
    play.addEventListener("click", () => alternar(!rodando));
    $("canvas", raiz).addEventListener("click", () => alternar(!rodando));
    $$(".vp-etapas button", raiz).forEach((b) => b.addEventListener("click", () => {
      t = INICIO_ETAPA[+b.dataset.etapa] + 0.6; agua = []; po = [];
      etapaMostrada = -1;
      if (!rodando) { cena(); atualizarLegenda(); }
    }));

    if (menosMovimento) t = 12;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((en) => { visivel = en[0].isIntersecting; if (visivel) continuar(); }, { threshold: 0.2 }).observe(raiz);
    } else { visivel = true; continuar(); }
    alternar(rodando);
    cena(); atualizarLegenda();
  }

  /* ---------- Vídeos reais (midia.js) ---------- */
  function iniciarVideosReais(raiz) {
    const lista = (MIDIA.videos || []).filter((v) => v.youtube || v.arquivo);
    if (!lista.length) return;
    const esc = (window.ColorWeg || {}).esc || ((s) => s);
    raiz.hidden = false;
    $(".grade-videos", raiz).innerHTML = lista.map((v) => {
      const midia = v.youtube
        ? `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.youtube)}" title="${esc(v.titulo || "Vídeo")}" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
        : `<video controls preload="none" playsinline ${v.capa ? `poster="${esc(v.capa)}"` : ""}><source src="${esc(v.arquivo)}"></video>`;
      return `<figure class="video-card"><div class="video-quadro">${midia}</div><figcaption>${esc(v.titulo || "")}</figcaption></figure>`;
    }).join("");
  }

  /* Imagens institucionais (cena realista da linha de pintura) */
  function iniciarCenas() {
    if (!window.Fotos) return;
    $$("[data-cena]").forEach((el) => {
      el.style.backgroundImage = `url("${window.Fotos.cenaLinha(el.dataset.cena.split(","), { largura: 900, altura: 700 })}")`;
    });
  }

  /* Faixa de imagens rolando sem parar (duplica o conteúdo para o laço ficar contínuo) */
  function iniciarFaixas() {
    $$("[data-faixa]").forEach((trilho) => {
      if (trilho.dataset.pronta) return;
      trilho.dataset.pronta = "1";
      const secao = trilho.closest(".faixa-imagens");
      if (secao && !secao.querySelector(".faixa-pausa")) {
        const b = document.createElement("button");
        b.type = "button"; b.className = "faixa-pausa"; b.setAttribute("aria-label", "Pausar imagens");
        b.addEventListener("click", () => {
          const parar = !secao.classList.contains("parada");
          secao.classList.toggle("parada", parar);
          b.setAttribute("aria-label", parar ? "Continuar imagens" : "Pausar imagens");
        });
        secao.appendChild(b);
      }
      const originais = Array.from(trilho.children);
      const copiar = (el) => { const c = el.cloneNode(true); c.setAttribute("aria-hidden", "true"); c.tabIndex = -1; trilho.appendChild(c); };
      // repete até cobrir telas largas; depois duplica tudo para o laço de -50% ficar contínuo
      const vezes = Math.max(1, Math.ceil((Math.max(screen.width, innerWidth) * 1.1) / Math.max(trilho.scrollWidth, 1)));
      for (let v = 1; v < vezes; v++) originais.forEach(copiar);
      Array.from(trilho.children).forEach(copiar);
    });
  }

  /* Parallax: a imagem de fundo anda mais devagar que a página */
  function iniciarParallax() {
    const alvos = $$("[data-parallax]");
    if (!alvos.length || menosMovimento) return;
    let pedido = 0;
    const atualizar = () => {
      pedido = 0;
      const vh = innerHeight;
      alvos.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const p = (r.top + r.height / 2 - vh / 2) / vh;       // -1 … 1
        el.style.setProperty("--desloc", (p * -80).toFixed(1) + "px");
      });
    };
    addEventListener("scroll", () => { if (!pedido) pedido = requestAnimationFrame(atualizar); }, { passive: true });
    addEventListener("resize", atualizar);
    atualizar();
  }

  /* Barra fina no topo mostrando quanto da página já foi lido */
  function iniciarProgresso() {
    const barra = document.createElement("div");
    barra.className = "progresso-leitura";
    barra.setAttribute("aria-hidden", "true");
    document.body.appendChild(barra);
    let pedido = 0;
    const atualizar = () => {
      pedido = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      barra.style.transform = `scaleX(${max > 0 ? Math.min(scrollY / max, 1) : 0})`;
    };
    addEventListener("scroll", () => { if (!pedido) pedido = requestAnimationFrame(atualizar); }, { passive: true });
    atualizar();
  }

  /* Vídeo da marca: toca sem som quando aparece na tela e pausa quando sai */
  function iniciarVideoMarca() {
    $$("[data-video-marca]").forEach((caixa) => {
      const v = $("video", caixa), botao = $(".vm-som", caixa);
      if (!v) return;
      v.addEventListener("error", () => caixa.classList.add("sem-video"), true);
      // "Assistir do início": mostra os controles e recomeça o vídeo
      if (botao) botao.addEventListener("click", () => {
        botao.hidden = true;
        v.controls = true;
        v.currentTime = 0;
        v.play().catch(() => {});
      });
      if (!("IntersectionObserver" in window)) { v.controls = true; return; }
      new IntersectionObserver((ents) => ents.forEach((en) => {
        if (en.isIntersecting) v.play().catch(() => {}); else v.pause();
      }), { threshold: 0.35 }).observe(caixa);
    });
  }

  /* Segmentos: rolagem lateral com arrastar (mouse ou dedo) e setas */
  function iniciarSegmentos() {
    $$("[data-segmentos]").forEach((raiz) => {
      const trilho = $(".seg-trilho", raiz);
      const passo = () => Math.max(trilho.clientWidth * 0.8, 260);
      $(".seg-seta.ant", raiz).addEventListener("click", () => trilho.scrollBy({ left: -passo(), behavior: "smooth" }));
      $(".seg-seta.prox", raiz).addEventListener("click", () => trilho.scrollBy({ left: passo(), behavior: "smooth" }));
      let x0 = 0, s0 = 0, arrastando = false, moveu = false;
      trilho.addEventListener("pointerdown", (e) => {
        if (e.pointerType !== "mouse") return;               // no toque, a rolagem nativa já funciona
        arrastando = true; moveu = false; x0 = e.clientX; s0 = trilho.scrollLeft;
        trilho.classList.add("arrastando");
      });
      addEventListener("pointermove", (e) => {
        if (!arrastando) return;
        const d = e.clientX - x0;
        if (Math.abs(d) > 5) moveu = true;
        trilho.scrollLeft = s0 - d;
      });
      addEventListener("pointerup", () => { arrastando = false; trilho.classList.remove("arrastando"); });
      trilho.addEventListener("click", (e) => { if (moveu) { e.preventDefault(); moveu = false; } }, true);
    });
  }

  /* Botão "voltar ao topo" */
  function iniciarVoltarTopo() {
    const b = document.createElement("button");
    b.type = "button"; b.className = "voltar-topo"; b.setAttribute("aria-label", "Voltar ao topo");
    b.innerHTML = window.Icone ? window.Icone("seta") : "↑";
    document.body.appendChild(b);
    b.addEventListener("click", () => scrollTo({ top: 0, behavior: menosMovimento ? "auto" : "smooth" }));
    let pedido = 0;
    addEventListener("scroll", () => {
      if (pedido) return;
      pedido = requestAnimationFrame(() => { pedido = 0; b.classList.toggle("visivel", scrollY > innerHeight * 1.2); });
    }, { passive: true });
  }

  document.addEventListener("DOMContentLoaded", () => {
    iniciarSegmentos();
    iniciarVoltarTopo();
    iniciarFaixas();
    iniciarParallax();
    iniciarProgresso();
    iniciarVideoMarca();
    iniciarCenas();
    iniciarCabecalho();
    $$("[data-slider]").forEach(iniciarSlider);
    $$("[data-processo]").forEach(iniciarVideoProcesso);
    $$("[data-videos-reais]").forEach(iniciarVideosReais);
    iniciarContadores();
  });
})();
