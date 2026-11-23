/* =========================================================
   Animação enquanto a cotação é calculada (tela por cima, transparente)
   - Sorteia uma de duas cenas: caminhão Policoating na estrada ou avião sobre o mar e as nuvens.
   - Fica no mínimo 6 segundos (em loop) e libera assim que a cotação fica pronta.
   - Quem prefere menos movimento vê a cena parada e não espera os 6 segundos.
   Uso: const fim = CotacaoAnimacao.mostrar(); ... await fim(true|false)
   ========================================================= */
(function () {
  "use strict";
  const MINIMO_MS = 6000;
  const menosMovimento = () => !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

  const CAMINHAO = `<svg class="ca-cena ca-caminhao" viewBox="0 0 320 200" role="img" aria-label="Caminhão da Policoating na estrada">
    <defs>
      <linearGradient id="ca-ceu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe0ff"/><stop offset="1" stop-color="#eef7ff"/></linearGradient>
    </defs>
    <rect width="320" height="200" fill="url(#ca-ceu)"/>
    <circle cx="262" cy="42" r="18" fill="#ffd34d"/>
    <g class="ca-nuvens-lentas" fill="#fff" opacity=".9">
      <g><ellipse cx="60" cy="40" rx="22" ry="9"/><ellipse cx="76" cy="34" rx="14" ry="9"/><ellipse cx="200" cy="58" rx="18" ry="7"/><ellipse cx="212" cy="53" rx="11" ry="7"/></g>
      <g transform="translate(320 0)"><ellipse cx="60" cy="40" rx="22" ry="9"/><ellipse cx="76" cy="34" rx="14" ry="9"/><ellipse cx="200" cy="58" rx="18" ry="7"/><ellipse cx="212" cy="53" rx="11" ry="7"/></g>
    </g>
    <g class="ca-morros">
      <g><path d="M0 128 Q40 92 80 120 T160 112 T240 118 T320 110 V150 H0Z" fill="#9cc4ea"/></g>
      <g transform="translate(320 0)"><path d="M0 128 Q40 92 80 120 T160 112 T240 118 T320 110 V150 H0Z" fill="#9cc4ea"/></g>
    </g>
    <g class="ca-postes">
      <g><rect x="40" y="104" width="3" height="46" fill="#6b7a8c"/><rect x="40" y="104" width="14" height="3" fill="#6b7a8c"/><rect x="200" y="104" width="3" height="46" fill="#6b7a8c"/><rect x="200" y="104" width="14" height="3" fill="#6b7a8c"/></g>
      <g transform="translate(320 0)"><rect x="40" y="104" width="3" height="46" fill="#6b7a8c"/><rect x="40" y="104" width="14" height="3" fill="#6b7a8c"/><rect x="200" y="104" width="3" height="46" fill="#6b7a8c"/><rect x="200" y="104" width="14" height="3" fill="#6b7a8c"/></g>
    </g>
    <rect y="150" width="320" height="50" fill="#3b4452"/>
    <rect y="150" width="320" height="4" fill="#2b323d"/>
    <line class="ca-faixa" x1="0" y1="176" x2="640" y2="176" stroke="#ffd34d" stroke-width="4" stroke-dasharray="22 18"/>
    <g class="ca-veiculo">
      <g class="ca-pula">
        <rect x="8" y="96" width="128" height="52" rx="4" fill="#fff" stroke="#d5dde8"/>
        <rect x="8" y="132" width="128" height="7" fill="#1558d6"/>
        <rect x="8" y="139" width="128" height="3" fill="#f7c600"/>
        <text x="72" y="118" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="900" font-style="italic" font-size="17" fill="#0b1424">POLI<tspan fill="#1558d6">COATING</tspan></text>
        <text x="72" y="128" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="700" font-size="6.2" letter-spacing="1.4" fill="#5a6775">TINTA ELETROSTÁTICA EM PÓ</text>
        <path d="M138 112 h22 l16 18 v18 h-38z" fill="#1558d6"/>
        <path d="M143 116 h15 l11 13 h-26z" fill="#cfe6ff"/>
        <rect x="170" y="138" width="8" height="5" rx="1" fill="#ffd34d"/>
        <rect x="134" y="142" width="44" height="6" fill="#0d3fa6"/>
      </g>
      <g class="ca-roda" style="transform-origin: 36px 150px"><circle cx="36" cy="150" r="11" fill="#1d2733"/><circle cx="36" cy="150" r="5" fill="#c7d0db"/><path d="M36 141v18M27 150h18" stroke="#1d2733" stroke-width="2"/></g>
      <g class="ca-roda" style="transform-origin: 108px 150px"><circle cx="108" cy="150" r="11" fill="#1d2733"/><circle cx="108" cy="150" r="5" fill="#c7d0db"/><path d="M108 141v18M99 150h18" stroke="#1d2733" stroke-width="2"/></g>
      <g class="ca-roda" style="transform-origin: 160px 150px"><circle cx="160" cy="150" r="11" fill="#1d2733"/><circle cx="160" cy="150" r="5" fill="#c7d0db"/><path d="M160 141v18M151 150h18" stroke="#1d2733" stroke-width="2"/></g>
    </g>
  </svg>`;

  const AVIAO = `<svg class="ca-cena ca-aviao" viewBox="0 0 320 200" role="img" aria-label="Avião sobre o mar e as nuvens">
    <defs>
      <linearGradient id="ca-ceu2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fb2ff"/><stop offset="1" stop-color="#dcefff"/></linearGradient>
      <linearGradient id="ca-mar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f78e0"/><stop offset="1" stop-color="#0b3f8f"/></linearGradient>
    </defs>
    <rect width="320" height="200" fill="url(#ca-ceu2)"/>
    <circle cx="58" cy="44" r="16" fill="#fff3b0"/>
    <g class="ca-nuvens-lentas" fill="#fff" opacity=".75">
      <g><ellipse cx="90" cy="70" rx="26" ry="9"/><ellipse cx="250" cy="40" rx="20" ry="7"/></g>
      <g transform="translate(320 0)"><ellipse cx="90" cy="70" rx="26" ry="9"/><ellipse cx="250" cy="40" rx="20" ry="7"/></g>
    </g>
    <rect y="148" width="320" height="52" fill="url(#ca-mar)"/>
    <g class="ca-ondas" fill="none" stroke="#9fd0ff" stroke-width="2" stroke-linecap="round" opacity=".8">
      <g><path d="M0 162 q10 -5 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0"/><path d="M10 180 q10 -4 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0" opacity=".6"/></g>
      <g transform="translate(320 0)"><path d="M0 162 q10 -5 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0"/><path d="M10 180 q10 -4 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0" opacity=".6"/></g>
    </g>
    <g class="ca-veiculo ca-voa">
      <g class="ca-balanca">
        <path d="M-6 98 h-44" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7" class="ca-rastro"/>
        <path d="M0 96 q4 -10 16 -10 h70 q16 0 24 10 q-8 8 -24 8 h-70 q-12 0 -16 -8z" fill="#fff" stroke="#c9d6e6"/>
        <path d="M6 88 l-6 -18 h10 l14 18z" fill="#1558d6"/>
        <path d="M44 98 l-14 26 h12 l26 -26z" fill="#d7e3f3"/>
        <path d="M46 92 l-8 -14 h8 l18 14z" fill="#d7e3f3"/>
        <circle cx="96" cy="92" r="2.4" fill="#1558d6"/><circle cx="88" cy="92" r="2.4" fill="#1558d6"/><circle cx="80" cy="92" r="2.4" fill="#1558d6"/><circle cx="72" cy="92" r="2.4" fill="#1558d6"/>
        <text x="48" y="101" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="900" font-style="italic" font-size="7" fill="#0b1424">POLI<tspan fill="#1558d6">COATING</tspan></text>
        <rect x="18" y="99" width="88" height="2" fill="#f7c600"/>
      </g>
    </g>
    <g class="ca-nuvens-rapidas" fill="#fff">
      <g><ellipse cx="40" cy="128" rx="30" ry="10"/><ellipse cx="62" cy="121" rx="18" ry="10"/><ellipse cx="200" cy="134" rx="26" ry="9"/><ellipse cx="220" cy="128" rx="15" ry="8"/></g>
      <g transform="translate(320 0)"><ellipse cx="40" cy="128" rx="30" ry="10"/><ellipse cx="62" cy="121" rx="18" ry="10"/><ellipse cx="200" cy="134" rx="26" ry="9"/><ellipse cx="220" cy="128" rx="15" ry="8"/></g>
    </g>
  </svg>`;

  const MENSAGENS = ["Conferindo o CEP de entrega…", "Calculando a rota saindo de Matão-SP…", "Somando peso e volumes…", "Gerando o número da cotação…"];

  function mostrar() {
    const parado = menosMovimento();
    const cena = Math.random() < 0.5 ? CAMINHAO : AVIAO;
    const tela = document.createElement("div");
    tela.className = "ca-tela" + (parado ? " ca-parado" : "");
    tela.setAttribute("role", "status"); tela.setAttribute("aria-live", "polite");
    tela.innerHTML = `<div class="ca-caixa">${cena}<p class="ca-msg">${MENSAGENS[0]}</p><div class="ca-barra" aria-hidden="true"><i></i></div></div>`;
    document.body.appendChild(tela);
    document.body.classList.add("ca-aberta");
    requestAnimationFrame(() => tela.classList.add("ca-visivel"));
    const inicio = Date.now();
    let n = 0;
    const msg = tela.querySelector(".ca-msg");
    const giro = setInterval(() => { n = (n + 1) % MENSAGENS.length; msg.textContent = MENSAGENS[n]; }, 1500);
    /** fecha: com sucesso espera completar os 6 s; com erro fecha na hora */
    return async function fim(ok) {
      if (ok && !parado) { const falta = MINIMO_MS - (Date.now() - inicio); if (falta > 0) await new Promise((r) => setTimeout(r, falta)); }
      clearInterval(giro);
      if (ok) msg.textContent = "Cotação pronta!";
      tela.classList.remove("ca-visivel");
      await new Promise((r) => setTimeout(r, parado ? 0 : 250));
      tela.remove();
      document.body.classList.remove("ca-aberta");
    };
  }

  window.CotacaoAnimacao = { mostrar, MINIMO_MS };
})();
