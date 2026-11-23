/* =========================================================
   Animação enquanto a cotação é calculada (tela por cima, transparente)
   - Sorteia: caminhão Policoating na estrada (entra, roda com a paisagem passando e sai)
     ou avião sobre o mar (vai, faz a curva e volta), com nuvens, navio, ilha e pássaros.
   - Fica no mínimo 6 segundos (em loop) e libera assim que a cotação fica pronta.
   - Botão "Pausar animação" (acessibilidade); erro fecha na hora.
   Uso: const fim = CotacaoAnimacao.mostrar(); ... await fim(true|false)
   ========================================================= */
(function () {
  "use strict";
  const MINIMO_MS = 6000;

  // camada que se repete na horizontal (dois blocos lado a lado, rolando sem emenda)
  const faixa = (cls, conteudo) => `<g class="${cls}"><g>${conteudo}</g><g transform="translate(640 0)">${conteudo}</g></g>`;
  const nuvem = (x, y, s, o) => `<g transform="translate(${x} ${y}) scale(${s})" opacity="${o}"><ellipse cx="0" cy="0" rx="34" ry="13"/><ellipse cx="-18" cy="4" rx="20" ry="10"/><ellipse cx="20" cy="-6" rx="22" ry="15"/><ellipse cx="38" cy="3" rx="16" ry="9"/></g>`;
  const roda = (x) => `<g class="cb-roda" style="transform-origin:${x}px 236px"><circle cx="${x}" cy="236" r="17" fill="#141a22"/><circle cx="${x}" cy="236" r="9" fill="#c8d1dc"/><circle cx="${x}" cy="236" r="3.5" fill="#5a6775"/><path d="M${x} 222v28M${x - 14} 236h28M${x - 10} 226l20 20M${x + 10} 226l-20 20" stroke="#141a22" stroke-width="2.4"/></g>`;

  const CAMINHAO = `<svg class="cb-cena cb-cam" viewBox="0 0 640 300" role="img" aria-label="Caminhão da Policoating na estrada">
    <defs>
      <linearGradient id="cb-ceu1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fbfff"/><stop offset=".7" stop-color="#d6ecff"/><stop offset="1" stop-color="#fff4dc"/></linearGradient>
      <radialGradient id="cb-sol1"><stop offset="0" stop-color="#fff6c2"/><stop offset=".45" stop-color="#ffd34d"/><stop offset="1" stop-color="#ffd34d" stop-opacity="0"/></radialGradient>
      <linearGradient id="cb-bau" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e3e9f1"/></linearGradient>
      <linearGradient id="cb-cab" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a6cf0"/><stop offset="1" stop-color="#0d3fa6"/></linearGradient>
    </defs>
    <rect width="640" height="300" fill="url(#cb-ceu1)"/>
    <circle class="cb-brilho" cx="520" cy="70" r="70" fill="url(#cb-sol1)"/>
    <circle cx="520" cy="70" r="24" fill="#ffe27a"/>
    ${faixa("cb-l1", `<g fill="#fff">${nuvem(80, 60, 1, .9)}${nuvem(330, 40, .8, .8)}${nuvem(560, 85, .7, .7)}</g>`)}
    ${faixa("cb-l2", `<path d="M0 190 L60 150 L110 175 L170 120 L240 168 L300 140 L360 176 L430 128 L500 170 L560 146 L640 190 V210 H0Z" fill="#a9c8e8"/><path d="M170 120 l14 14 -10 -2 -8 8z M430 128 l13 13 -9 -2 -8 7z" fill="#fff" opacity=".8"/>`)}
    ${faixa("cb-l3", `<g fill="#7d9cc0"><rect x="20" y="150" width="34" height="60"/><rect x="58" y="128" width="26" height="82"/><rect x="88" y="160" width="40" height="50"/><rect x="300" y="140" width="30" height="70"/><rect x="334" y="118" width="22" height="92"/><rect x="360" y="156" width="44" height="54"/><rect x="520" y="146" width="36" height="64"/><rect x="560" y="132" width="24" height="78"/></g><g fill="#c9dcf0" opacity=".9"><rect x="63" y="136" width="5" height="6"/><rect x="73" y="136" width="5" height="6"/><rect x="63" y="150" width="5" height="6"/><rect x="339" y="126" width="4" height="6"/><rect x="347" y="126" width="4" height="6"/><rect x="339" y="140" width="4" height="6"/><rect x="565" y="140" width="5" height="6"/></g>`)}
    <rect y="206" width="640" height="94" fill="#3a4350"/>
    <rect y="206" width="640" height="6" fill="#5a6573"/>
    <rect y="290" width="640" height="10" fill="#2b323d"/>
    ${faixa("cb-l4", `<g><rect x="30" y="160" width="5" height="48" fill="#5c6b7c"/><path d="M33 160 h22" stroke="#5c6b7c" stroke-width="4"/><circle cx="56" cy="162" r="4" fill="#ffe27a"/><g transform="translate(150 0)"><rect x="-4" y="176" width="8" height="32" fill="#6b4b2e"/><circle cx="0" cy="168" r="22" fill="#2f9e5b"/><circle cx="-12" cy="178" r="14" fill="#278a4e"/><circle cx="12" cy="176" r="15" fill="#33ad63"/></g><rect x="350" y="160" width="5" height="48" fill="#5c6b7c"/><path d="M353 160 h22" stroke="#5c6b7c" stroke-width="4"/><circle cx="376" cy="162" r="4" fill="#ffe27a"/><g transform="translate(480 0)"><rect x="-4" y="180" width="8" height="28" fill="#6b4b2e"/><circle cx="0" cy="172" r="20" fill="#2f9e5b"/><circle cx="12" cy="180" r="13" fill="#278a4e"/></g></g>`)}
    <line class="cb-faixa" x1="0" y1="258" x2="1280" y2="258" stroke="#ffd34d" stroke-width="6" stroke-dasharray="40 30"/>
    <g class="cb-veiculo">
      <g class="cb-fumaca" fill="#cfd6df"><circle cx="18" cy="226" r="7"/><circle cx="4" cy="218" r="9"/><circle cx="-12" cy="208" r="11"/></g>
      <g class="cb-sacode">
        <rect x="30" y="120" width="250" height="104" rx="6" fill="url(#cb-bau)" stroke="#c5d0dd" stroke-width="2"/>
        <rect x="30" y="196" width="250" height="12" fill="#1558d6"/>
        <rect x="30" y="208" width="250" height="5" fill="#f7c600"/>
        <rect x="30" y="120" width="250" height="5" fill="#1558d6"/>
        <path d="M44 150 l10 -18 h10 l-10 18z M60 150 l10 -18 h10 l-10 18z" fill="#1558d6"/>
        <text x="170" y="164" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="900" font-style="italic" font-size="27" fill="#0b1424" letter-spacing="-.5" textLength="196" lengthAdjust="spacingAndGlyphs">POLI<tspan fill="#1558d6">COATING</tspan></text>
        <text x="170" y="182" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="700" font-size="9" letter-spacing="2" fill="#5a6775" textLength="190" lengthAdjust="spacingAndGlyphs">TINTA ELETROSTÁTICA EM PÓ</text>
        <path d="M284 150 h48 q8 0 13 6 l26 32 q4 5 4 11 v22 h-91z" fill="url(#cb-cab)"/>
        <path d="M296 158 h32 q5 0 8 4 l18 22 h-58z" fill="#cfe6ff"/>
        <path d="M298 160 h10 l-6 22 h-4z" fill="#fff" opacity=".6"/>
        <rect x="360" y="206" width="16" height="9" rx="2" fill="#ffe27a"/>
        <path class="cb-farol" d="M376 210 l90 -16 v34z" fill="#fff6c2" opacity=".35"/>
        <rect x="286" y="190" width="10" height="3" rx="1" fill="#0b2a73"/>
        <rect x="276" y="216" width="100" height="10" rx="3" fill="#0b2a73"/>
        <rect x="22" y="216" width="14" height="10" rx="2" fill="#d92d20"/>
      </g>
      ${roda(78)}${roda(126)}${roda(236)}${roda(338)}
    </g>
  </svg>`;

  const AVIAO = `<svg class="cb-cena cb-avi" viewBox="0 0 640 300" role="img" aria-label="Avião indo e voltando sobre o mar">
    <defs>
      <linearGradient id="cb-ceu2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f8fe8"/><stop offset=".6" stop-color="#9fd0ff"/><stop offset="1" stop-color="#e8f5ff"/></linearGradient>
      <linearGradient id="cb-mar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c7ae0"/><stop offset="1" stop-color="#083a86"/></linearGradient>
      <radialGradient id="cb-sol2"><stop offset="0" stop-color="#fff8d6"/><stop offset=".4" stop-color="#ffe9a0"/><stop offset="1" stop-color="#ffe9a0" stop-opacity="0"/></radialGradient>
      <linearGradient id="cb-fus" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d9e3ef"/></linearGradient>
      <symbol id="cb-aviao" viewBox="-80 -30 160 60">
        <path d="M-70 4 q4 -14 22 -14 h88 q26 0 36 12 q-10 12 -36 12 h-88 q-18 0 -22 -10z" fill="url(#cb-fus)" stroke="#b8c7d8" stroke-width="1.2"/>
        <path d="M-62 -8 l-12 -20 h13 l18 20z" fill="#1558d6"/>
        <path d="M-60 -8 l-6 -10" stroke="#f7c600" stroke-width="3"/>
        <path d="M-4 6 l-26 26 h14 l38 -26z" fill="#c9d6e6"/>
        <path d="M-2 -6 l-14 -16 h10 l26 16z" fill="#c9d6e6"/>
        <path d="M44 -4 q8 0 12 4 h-12z" fill="#1d2733"/>
        <g fill="#1558d6"><circle cx="30" cy="-1" r="2.6"/><circle cx="20" cy="-1" r="2.6"/><circle cx="10" cy="-1" r="2.6"/><circle cx="0" cy="-1" r="2.6"/><circle cx="-10" cy="-1" r="2.6"/><circle cx="-20" cy="-1" r="2.6"/></g>
        <rect x="-56" y="6" width="100" height="2.4" fill="#f7c600"/>
        <rect x="-6" y="14" width="22" height="7" rx="3" fill="#8fa3ba"/>
      </symbol>
    </defs>
    <rect width="640" height="300" fill="url(#cb-ceu2)"/>
    <circle class="cb-brilho" cx="110" cy="70" r="80" fill="url(#cb-sol2)"/>
    <circle cx="110" cy="70" r="26" fill="#fff3b8"/>
    ${faixa("cb-n1", `<g fill="#fff">${nuvem(200, 50, .6, .55)}${nuvem(480, 70, .5, .5)}</g>`)}
    <g class="cb-passaros" fill="none" stroke="#1d2733" stroke-width="2" stroke-linecap="round"><path class="cb-asa" d="M420 60 q6 -6 12 0 q6 -6 12 0"/><path class="cb-asa cb-asa2" d="M452 74 q5 -5 10 0 q5 -5 10 0"/><path class="cb-asa" d="M400 82 q4 -4 8 0 q4 -4 8 0"/></g>
    <g class="cb-rota-ida"><path class="cb-rastro" d="M0 0 h-120" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-dasharray="2 10" opacity=".85"/><use href="#cb-aviao" x="-80" y="-30" width="160" height="60"/><text x="-4" y="1" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="900" font-style="italic" font-size="8.5" fill="#0b1424">POLI<tspan fill="#1558d6">COATING</tspan></text></g>
    <g class="cb-rota-volta"><path class="cb-rastro" d="M0 0 h120" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 10" opacity=".8"/><g transform="scale(-1 1)"><use href="#cb-aviao" x="-64" y="-24" width="128" height="48"/></g><text x="4" y="1" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="900" font-style="italic" font-size="7" fill="#0b1424">POLI<tspan fill="#1558d6">COATING</tspan></text></g>
    ${faixa("cb-n2", `<g fill="#fff">${nuvem(90, 130, .9, .85)}${nuvem(400, 110, 1.1, .9)}</g>`)}
    <path d="M440 214 q40 -40 90 0z" fill="#3c9a5f"/><path d="M470 214 q20 -18 40 0z" fill="#e8d39a"/>
    <g transform="translate(486 172)"><path d="M0 40 q-2 -22 6 -38" stroke="#6b4b2e" stroke-width="4" fill="none"/><path d="M6 2 q-18 -4 -26 8 M6 2 q14 -10 28 0 M6 2 q-6 -16 -20 -14 M6 2 q12 -14 24 -8" stroke="#2f9e5b" stroke-width="5" fill="none" stroke-linecap="round"/></g>
    <rect y="212" width="640" height="88" fill="url(#cb-mar)"/>
    ${faixa("cb-ondas1", `<path d="M0 226 q20 -7 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" stroke="#8fd0ff" stroke-width="2.4" fill="none" opacity=".8"/>`)}
    <g class="cb-navio"><path d="M0 250 h70 l-10 14 h-52z" fill="#1d2733"/><rect x="18" y="236" width="34" height="14" fill="#fff"/><rect x="24" y="226" width="10" height="10" fill="#d92d20"/><rect x="38" y="240" width="5" height="5" fill="#9fb5cc"/><rect x="46" y="240" width="5" height="5" fill="#9fb5cc"/></g>
    ${faixa("cb-ondas2", `<path d="M0 270 q24 -8 48 0 t48 0 t48 0 t48 0 t48 0 t48 0 t48 0 t48 0 t48 0 t48 0 t48 0 t48 0 t48 0 t48 0" stroke="#5fb0f5" stroke-width="2.4" fill="none" opacity=".7"/><g fill="#fff" opacity=".7"><circle cx="100" cy="246" r="1.6"/><circle cx="260" cy="284" r="1.6"/><circle cx="420" cy="256" r="1.6"/><circle cx="580" cy="290" r="1.6"/></g>`)}
    ${faixa("cb-n3", `<g fill="#fff">${nuvem(150, 196, 1.3, .95)}${nuvem(520, 204, 1.1, .9)}</g>`)}
  </svg>`;

  const ETAPAS = ["Conferindo o CEP de entrega", "Calculando a rota saindo de Matão-SP", "Somando peso, volumes e veículo", "Gerando o número da cotação"];

  function mostrar() {
    const cena = Math.random() < 0.5 ? CAMINHAO : AVIAO;
    const tela = document.createElement("div");
    tela.className = "cb-tela";
    tela.setAttribute("role", "status"); tela.setAttribute("aria-live", "polite");
    tela.innerHTML = `<div class="cb-caixa">
      <div class="cb-palco">${cena}<button type="button" class="cb-pausa" aria-pressed="false">Pausar animação</button></div>
      <div class="cb-info">
        <p class="cb-msg"><span class="cb-pontos" aria-hidden="true"><i></i><i></i><i></i></span><span class="cb-txt">${ETAPAS[0]}…</span></p>
        <ol class="cb-etapas" aria-hidden="true">${ETAPAS.map((e, i) => `<li class="${i === 0 ? "atual" : ""}">${e}</li>`).join("")}</ol>
        <div class="cb-barra" aria-hidden="true"><i></i></div>
      </div></div>`;
    document.body.appendChild(tela);
    document.body.classList.add("cb-aberta");
    requestAnimationFrame(() => tela.classList.add("cb-visivel"));
    const pausa = tela.querySelector(".cb-pausa");
    pausa.addEventListener("click", () => { const p = tela.classList.toggle("cb-pausada"); pausa.setAttribute("aria-pressed", String(p)); pausa.textContent = p ? "Continuar animação" : "Pausar animação"; });
    const inicio = Date.now(), txt = tela.querySelector(".cb-txt"), lis = [...tela.querySelectorAll(".cb-etapas li")];
    let n = 0;
    const giro = setInterval(() => {
      n = Math.min(n + 1, ETAPAS.length - 1);
      txt.textContent = ETAPAS[n] + "…";
      lis.forEach((li, i) => { li.className = i < n ? "feita" : i === n ? "atual" : ""; });
    }, 1500);
    /** fecha: com sucesso espera completar os 6 s; com erro fecha na hora */
    return async function fim(ok) {
      let minimo = MINIMO_MS; try { if (localStorage.getItem("policoating_teste_sem_espera")) minimo = 0; } catch (e) { /* */ }   // só nos testes automáticos
      if (ok) { const falta = minimo - (Date.now() - inicio); if (falta > 0) await new Promise((r) => setTimeout(r, falta)); }
      clearInterval(giro);
      if (ok) { txt.textContent = "Cotação pronta!"; lis.forEach((li) => (li.className = "feita")); tela.classList.add("cb-pronta"); await new Promise((r) => setTimeout(r, minimo ? 450 : 0)); }
      tela.classList.remove("cb-visivel");
      if (minimo) await new Promise((r) => setTimeout(r, 280));
      tela.remove();
      document.body.classList.remove("cb-aberta");
    };
  }

  window.CotacaoAnimacao = { mostrar, MINIMO_MS };
})();
