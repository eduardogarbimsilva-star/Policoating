/* =========================================================
   Animação enquanto a cotação é calculada (tela por cima, transparente)
   - Veículo da cotação: Montana → picape; caminhão → caminhão baú. Sem veículo, sorteia entre os dois e o avião.
   - Cenas: caminhão Policoating na estrada (luz do dia, névoa ao longe, rodas com aro cromado,
     escapamento, reflexo no baú e sombra no asfalto) ou jato sobre o mar (vai se afastando, faz a
     curva e volta mais perto, com rastro), com nuvens em camadas, navio com esteira, ilha e pássaros.
   - Fica no mínimo 6 segundos (em loop) e libera assim que a cotação fica pronta.
   - Botão "Pausar animação" (acessibilidade); erro fecha na hora.
   Uso: const fim = CotacaoAnimacao.mostrar(); ... await fim(true|false)
   ========================================================= */
(function () {
  "use strict";
  const MINIMO_MS = 6000;

  // camada que se repete na horizontal (dois blocos lado a lado, rolando sem emenda)
  const faixa = (cls, conteudo) => `<g class="${cls}"><g>${conteudo}</g><g transform="translate(640 0)">${conteudo}</g></g>`;
  // nuvem "fofa": vários círculos com sombra embaixo (luz vindo de cima)
  const nuvem = (x, y, s, o) => `<g transform="translate(${x} ${y}) scale(${s})" opacity="${o}">
      <ellipse cx="2" cy="10" rx="58" ry="12" fill="#c9d6e6" opacity=".55"/>
      <g fill="url(#cb3-nuvem)"><circle cx="-34" cy="2" r="16"/><circle cx="-12" cy="-8" r="22"/><circle cx="14" cy="-14" r="26"/><circle cx="40" cy="-2" r="18"/><rect x="-50" y="0" width="106" height="16" rx="8"/></g>
      <ellipse cx="6" cy="-24" rx="18" ry="6" fill="#fff" opacity=".9"/></g>`;
  /* roda realista: pneu com banda, aro cromado, cubo e parafusos (gira), mais um "borrão" de velocidade */
  const roda = (x, y) => `<g class="cb3-roda-g">
      <circle cx="${x}" cy="${y}" r="20" fill="#14171c"/>
      <circle cx="${x}" cy="${y}" r="20" fill="none" stroke="#2a2f37" stroke-width="3" stroke-dasharray="3 3"/>
      <g class="cb3-roda" style="transform-origin:${x}px ${y}px">
        <circle cx="${x}" cy="${y}" r="12" fill="url(#cb3-cromo)"/>
        <circle cx="${x}" cy="${y}" r="12" fill="none" stroke="#7d8894" stroke-width="1"/>
        ${[0, 72, 144, 216, 288].map((a) => `<circle cx="${(x + 7 * Math.cos((a * Math.PI) / 180)).toFixed(1)}" cy="${(y + 7 * Math.sin((a * Math.PI) / 180)).toFixed(1)}" r="1.6" fill="#55606c"/>`).join("")}
        <path d="M${x - 11} ${y}h22" stroke="#9aa6b2" stroke-width="1.2" opacity=".7"/>
        <circle cx="${x}" cy="${y}" r="4" fill="#3b4450"/>
      </g>
      <circle cx="${x}" cy="${y}" r="12" fill="url(#cb3-giro)" opacity=".55"/>
    </g>`;

  const estrada = (classe, rotulo, veiculo) => `<svg class="cb-cena cb-cam ${classe}" viewBox="0 0 640 300" role="img" aria-label="${rotulo}">
    <defs>
      <linearGradient id="cb3-ceu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d86e0"/><stop offset=".55" stop-color="#9fcdf7"/><stop offset=".78" stop-color="#e6f2fb"/><stop offset="1" stop-color="#ffe8c4"/></linearGradient>
      <radialGradient id="cb3-sol"><stop offset="0" stop-color="#fffbe6"/><stop offset=".25" stop-color="#fff0b0" stop-opacity=".95"/><stop offset=".6" stop-color="#ffd978" stop-opacity=".35"/><stop offset="1" stop-color="#ffd978" stop-opacity="0"/></radialGradient>
      <linearGradient id="cb3-nuvem" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e3ebf5"/></linearGradient>
      <linearGradient id="cb3-serra" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fb0d6"/><stop offset="1" stop-color="#c3d6ea"/></linearGradient>
      <linearGradient id="cb3-morro" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fae6a"/><stop offset="1" stop-color="#4f8f52"/></linearGradient>
      <linearGradient id="cb3-grama" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5fa55a"/><stop offset="1" stop-color="#3f7d43"/></linearGradient>
      <linearGradient id="cb3-nevoa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#fff6e6" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <linearGradient id="cb3-asfalto" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a525d"/><stop offset="1" stop-color="#2b3038"/></linearGradient>
      <linearGradient id="cb3-bau" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#f1f4f8"/><stop offset="1" stop-color="#d3dbe5"/></linearGradient>
      <linearGradient id="cb3-alu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef1f4"/><stop offset=".5" stop-color="#cfd6dd"/><stop offset="1" stop-color="#aeb8c2"/></linearGradient>
      <linearGradient id="cb3-branco" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#f1f4f8"/><stop offset="1" stop-color="#d5dde6"/></linearGradient>
      <clipPath id="cb3-alu-clip"><rect x="40" y="96" width="250" height="126" rx="3"/></clipPath>
      <linearGradient id="cb3-cab" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4b8bff"/><stop offset=".45" stop-color="#1d5fe0"/><stop offset="1" stop-color="#0a3189"/></linearGradient>
      <linearGradient id="cb3-vidro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9efff"/><stop offset=".5" stop-color="#8fbde6"/><stop offset="1" stop-color="#3f6f9f"/></linearGradient>
      <linearGradient id="cb3-cromo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6f8fa"/><stop offset=".45" stop-color="#a7b1bc"/><stop offset=".55" stop-color="#d5dbe1"/><stop offset="1" stop-color="#7f8a96"/></linearGradient>
      <radialGradient id="cb3-giro"><stop offset=".55" stop-color="#cfd6de" stop-opacity="0"/><stop offset="1" stop-color="#cfd6de" stop-opacity=".9"/></radialGradient>
      <linearGradient id="cb3-reflexo" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <radialGradient id="cb3-farol"><stop offset="0" stop-color="#fffbe0" stop-opacity=".9"/><stop offset="1" stop-color="#fffbe0" stop-opacity="0"/></radialGradient>
      <filter id="cb3-desf1" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.4"/></filter>
      <filter id="cb3-desf2" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
      <filter id="cb3-veloc" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3 0"/></filter>
      <filter id="cb3-textura" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4" result="r"/><feColorMatrix in="r" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .07 0"/></filter>
      <clipPath id="cb3-bau-clip"><rect x="40" y="110" width="252" height="112" rx="4"/></clipPath>
    </defs>
    <rect width="640" height="300" fill="url(#cb3-ceu)"/>
    <circle class="cb-brilho" cx="505" cy="78" r="92" fill="url(#cb3-sol)"/>
    <circle cx="505" cy="78" r="22" fill="#fff6cf"/>
    ${faixa("cb3-c1", `${nuvem(90, 58, .9, .95)}${nuvem(340, 36, .7, .85)}${nuvem(560, 72, .6, .8)}`)}
    ${faixa("cb3-c2", `<path d="M0 176 L48 150 L92 166 L150 128 L206 160 L262 138 L318 170 L380 124 L436 158 L494 140 L552 166 L600 146 L640 176 V214 H0Z" fill="url(#cb3-serra)" filter="url(#cb3-desf1)"/><path d="M150 128 l12 12 -8 -1 -6 6z M380 124 l13 13 -9 -2 -6 6z" fill="#fff" opacity=".75"/>`)}
    ${faixa("cb3-c3", `<path d="M0 196 Q60 168 128 186 T260 182 T400 188 T520 178 T640 196 V214 H0Z" fill="url(#cb3-morro)"/>
      <g fill="#3f7f45"><circle cx="40" cy="186" r="9"/><circle cx="52" cy="184" r="11"/><circle cx="210" cy="180" r="8"/><circle cx="222" cy="182" r="10"/><circle cx="430" cy="184" r="9"/><circle cx="560" cy="180" r="10"/><circle cx="572" cy="183" r="8"/></g>
      <g transform="translate(300 150)"><rect x="0" y="22" width="46" height="34" fill="#dfe6ee"/><path d="M0 22 l12 -10 l12 10 l11 -10 l11 10z" fill="#c4ced9"/><rect x="34" y="0" width="7" height="24" fill="#b6c1cd"/><rect x="6" y="34" width="8" height="8" fill="#9fb3c8"/><rect x="20" y="34" width="8" height="8" fill="#9fb3c8"/><text x="23" y="54" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="5" font-weight="800" fill="#1558d6">POLICOATING</text></g>`)}
    <rect y="150" width="640" height="70" fill="url(#cb3-nevoa)"/>
    <rect y="204" width="640" height="12" fill="url(#cb3-grama)"/>
    ${faixa("cb3-c4", `<g fill="#2f6e36">${Array.from({ length: 22 }, (_, i) => `<path d="M${i * 29 + 4} 212 l3 -7 l2 7 l3 -5 l2 5z"/>`).join("")}</g>`)}
    <rect y="214" width="640" height="86" fill="url(#cb3-asfalto)"/>
    <rect y="214" width="640" height="86" filter="url(#cb3-textura)"/>
    <rect y="216" width="640" height="3" fill="#e9edf2" opacity=".85"/>
    <rect y="290" width="640" height="3" fill="#e9edf2" opacity=".6"/>
    <line class="cb-faixa" x1="0" y1="262" x2="1280" y2="262" stroke="#ffd34d" stroke-width="5" stroke-dasharray="44 34"/>
    ${veiculo}
    ${faixa("cb3-c5", `<g filter="url(#cb3-veloc)" opacity=".85">${[30, 190, 350, 510].map((x) => `<rect x="${x}" y="278" width="7" height="22" fill="#d7dde4"/><rect x="${x - 20}" y="280" width="60" height="5" fill="#b9c2cc"/>`).join("")}</g>`)}
  </svg>`;

  /* caminhão baú (cabine branca, baú de alumínio canelado) — como o da frota */
  const BAU = `<g class="cb3-veiculo">
      <ellipse cx="214" cy="250" rx="186" ry="9" fill="#000" opacity=".35" filter="url(#cb3-desf2)"/>
      <g class="cb-sacode">
        <rect x="40" y="222" width="350" height="9" rx="2" fill="#20252c"/>
        <rect x="160" y="223" width="64" height="13" rx="2" fill="#3a414b"/>
        <rect x="40" y="96" width="250" height="126" rx="3" fill="url(#cb3-alu)" stroke="#9aa6b2" stroke-width="1.4"/>
        <g clip-path="url(#cb3-alu-clip)">
          <g stroke="#ffffff" stroke-width="2.2" opacity=".55">${Array.from({ length: 24 }, (_, i) => `<path d="M${50 + i * 10} 98v122"/>`).join("")}</g>
          <g stroke="#8794a2" stroke-width="1" opacity=".55">${Array.from({ length: 24 }, (_, i) => `<path d="M${53 + i * 10} 98v122"/>`).join("")}</g>
          <rect class="cb3-reflexo" x="-60" y="96" width="60" height="126" fill="url(#cb3-reflexo)" transform="skewX(-18)"/>
        </g>
        <rect x="40" y="96" width="250" height="7" fill="#c5ced8"/><rect x="40" y="214" width="250" height="8" fill="#8a96a3"/>
        <rect x="92" y="136" width="146" height="46" rx="6" fill="#fff" opacity=".93"/>
        <path d="M102 168 l7 -13 h8 l-7 13z M114 168 l7 -13 h8 l-7 13z" fill="#1558d6"/>
        <text x="182" y="166" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="900" font-style="italic" font-size="19" fill="#0b1424" textLength="96" lengthAdjust="spacingAndGlyphs">POLI<tspan fill="#1558d6">COATING</tspan></text>
        <rect x="36" y="198" width="6" height="16" rx="1.5" fill="#d92d20"/>
        <!-- cabine branca alta, de frente arredondada -->
        <path d="M292 120 h40 q16 0 24 12 l26 40 q6 9 6 20 v30 h-96z" fill="url(#cb3-branco)" stroke="#c9d2dc" stroke-width="1.2"/>
        <path d="M304 128 h28 q10 0 15 8 l20 32 h-63z" fill="url(#cb3-vidro)"/>
        <path d="M308 130 h8 l-6 34 h-4z" fill="#fff" opacity=".55"/>
        <path d="M300 172 h50 v38 h-50z" fill="none" stroke="#b9c3cf" stroke-width="1.3"/>
        <rect x="338" y="182" width="9" height="3" rx="1.5" fill="#9aa6b2"/>
        <rect x="282" y="142" width="4" height="22" rx="1.5" fill="#1d2430"/><path d="M286 148 h8" stroke="#1d2430" stroke-width="2.5"/>
        <path d="M352 196 h36 v20 h-36z" fill="#2a3038"/><g stroke="#4a525d" stroke-width="1.2"><path d="M356 201h28M356 206h28M356 211h28"/></g>
        <rect x="372" y="186" width="16" height="8" rx="3" fill="#fff6cf"/>
        <circle class="cb-farol" cx="398" cy="190" r="32" fill="url(#cb3-farol)"/>
        <rect x="292" y="216" width="100" height="10" rx="3" fill="#2a3038"/>
        <path d="M70 222 a24 24 0 0 1 48 0" fill="#20252c"/><path d="M118 222 a24 24 0 0 1 48 0" fill="#20252c"/><path d="M332 222 a24 24 0 0 1 48 0" fill="#e5eaf0"/>
      </g>
      ${roda(94, 238)}${roda(142, 238)}${roda(356, 238)}
    </g>`;
  /* picape Montana (branca, cabine dupla) com caixas Policoating na caçamba */
  const PICAPE = `<g class="cb3-veiculo cb3-picape">
      <ellipse cx="300" cy="250" rx="140" ry="8" fill="#000" opacity=".35" filter="url(#cb3-desf2)"/>
      <g class="cb-sacode">
        <!-- caixas na caçamba -->
        <g><rect x="176" y="150" width="40" height="34" rx="2" fill="#c89a5b"/><rect x="176" y="150" width="40" height="5" fill="#b0874e"/><text x="196" y="172" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="800" font-size="6.5" fill="#123a7a">POLICOATING</text>
          <rect x="218" y="142" width="44" height="42" rx="2" fill="#d1a565"/><rect x="218" y="142" width="44" height="5" fill="#b78c50"/><text x="240" y="167" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="800" font-size="7" fill="#123a7a">POLICOATING</text>
          <rect x="226" y="176" width="28" height="3" fill="#123a7a"/></g>
        <!-- carroceria -->
        <path d="M160 186 h120 l18 -40 q4 -8 14 -8 h52 q12 0 20 8 l26 30 q16 2 30 8 q12 5 12 16 v22 h-292z" fill="url(#cb3-branco)" stroke="#c9d2dc" stroke-width="1.2"/>
        <path d="M160 182 h122 v8 h-122z" fill="#e7ecf2"/>
        <path d="M306 146 h40 q8 0 13 6 l20 24 h-86z" fill="url(#cb3-vidro)"/>
        <path d="M300 152 l-8 24 h8z" fill="url(#cb3-vidro)" opacity=".9"/>
        <path d="M336 148 v28" stroke="#e6ebf1" stroke-width="3"/>
        <path d="M310 150 h7 l-6 22 h-4z" fill="#fff" opacity=".5"/>
        <path d="M296 180 h46 v30 h-46z M342 180 h40 v30 h-40z" fill="none" stroke="#c3ccd7" stroke-width="1.2"/>
        <rect x="330" y="188" width="8" height="2.6" rx="1.3" fill="#9aa6b2"/><rect x="370" y="188" width="8" height="2.6" rx="1.3" fill="#9aa6b2"/>
        <path d="M160 212 h292 v8 q0 6 -6 6 h-280 q-6 0 -6 -6z" fill="#2a3038"/>
        <path d="M440 190 h12 v10 h-14z" fill="#2a3038"/><rect x="430" y="182" width="20" height="7" rx="3" fill="#fff6cf"/>
        <circle class="cb-farol" cx="456" cy="186" r="28" fill="url(#cb3-farol)"/>
        <rect x="158" y="190" width="6" height="12" rx="1.5" fill="#d92d20"/>
        <path d="M186 214 a23 23 0 0 1 46 0" fill="#1b2027"/><path d="M370 214 a23 23 0 0 1 46 0" fill="#1b2027"/>
        <path d="M352 196 l14 -8" stroke="#1558d6" stroke-width="3" stroke-linecap="round"/>
      </g>
      ${roda(209, 232)}${roda(393, 232)}
    </g>`;
  const CAMINHAO = estrada("cb-cena-bau", "Caminhão baú da Policoating na estrada", BAU);
  const MONTANA = estrada("cb-cena-picape", "Picape Montana da Policoating na estrada", PICAPE);

  const AVIAO = `<svg class="cb-cena cb-avi" viewBox="0 0 640 300" role="img" aria-label="Avião indo e voltando sobre o mar">
    <defs>
      <linearGradient id="cb3-ceu2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a6fd1"/><stop offset=".55" stop-color="#8cc4f5"/><stop offset="1" stop-color="#eaf6ff"/></linearGradient>
      <radialGradient id="cb3-sol2"><stop offset="0" stop-color="#fffdf0"/><stop offset=".22" stop-color="#fff3c4" stop-opacity=".95"/><stop offset=".6" stop-color="#ffe6a0" stop-opacity=".3"/><stop offset="1" stop-color="#ffe6a0" stop-opacity="0"/></radialGradient>
      <linearGradient id="cb3-nuvem" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dfe8f3"/></linearGradient>
      <linearGradient id="cb3-mar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b86e3"/><stop offset=".4" stop-color="#155fbf"/><stop offset="1" stop-color="#0a2f6e"/></linearGradient>
            <linearGradient id="cb3-fus" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#eef2f7"/><stop offset=".8" stop-color="#c9d4e1"/><stop offset="1" stop-color="#9eacbd"/></linearGradient>
      <linearGradient id="cb3-asa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dfe6ee"/><stop offset="1" stop-color="#9aa8b8"/></linearGradient>
      <linearGradient id="cb3-motor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f7fa"/><stop offset=".6" stop-color="#b9c4d0"/><stop offset="1" stop-color="#7d8a99"/></linearGradient>
      <linearGradient id="cb3-leme" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3f86ff"/><stop offset="1" stop-color="#0b3a9c"/></linearGradient>
      <linearGradient id="cb3-rastro" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <filter id="cb3-suave" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="1.6"/></filter>
      <filter id="cb3-suave2" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="3"/></filter>
      <symbol id="cb3-jato" viewBox="-110 -40 220 80" overflow="visible">
        <path d="M-96 0 q-2 -6 6 -9 l20 -2 h120 q28 0 44 7 q8 4 8 6 q0 3 -8 6 q-16 7 -44 7 h-120 l-20 -2 q-8 -3 -6 -13z" fill="url(#cb3-fus)" stroke="#a9b6c6" stroke-width=".8"/>
        <path d="M-80 9 h134 q20 0 38 -5 q-6 9 -38 11 h-134z" fill="#1558d6"/>
        <path d="M-78 11.5 h134" stroke="#f7c600" stroke-width="1.2"/>
        <path d="M-96 -2 l-6 -30 h14 l26 26z" fill="url(#cb3-leme)"/>
        <path d="M-94 -26 l4 0 l-6 9 h-4z M-88 -26 l4 0 l-6 9 h-4z" fill="#fff" opacity=".9"/>
        <path d="M-92 2 l-14 6 h12 l16 -4z" fill="url(#cb3-asa)"/>
        <g fill="#1f3f73">${Array.from({ length: 16 }, (_, i) => `<rect x="${-66 + i * 7}" y="-5" width="3.6" height="4.4" rx="1.6"/>`).join("")}</g>
        <path d="M64 -6 q12 0 20 5 h-22z" fill="#16243a"/>
        <path d="M-58 -9 v10 M48 -9 v10" stroke="#9aa9bb" stroke-width=".7"/>
        <path d="M-10 6 l-34 26 h12 l46 -24z" fill="url(#cb3-asa)" stroke="#8796a8" stroke-width=".6"/>
        <path d="M-40 30 l-4 4 h6 l2 -4z" fill="#d92d20"/>
        <rect x="-22" y="16" width="30" height="10" rx="5" fill="url(#cb3-motor)"/>
        <ellipse cx="8" cy="21" rx="2.4" ry="4.6" fill="#2a3442"/>
        <path d="M-4 -6 l-20 -14 h8 l26 14z" fill="#c4cfdc" opacity=".9"/>
      </symbol>
    </defs>
    <rect width="640" height="300" fill="url(#cb3-ceu2)"/>
    <circle class="cb-brilho" cx="120" cy="64" r="96" fill="url(#cb3-sol2)"/>
    <circle cx="120" cy="64" r="22" fill="#fffbe6"/>
    ${faixa("cb3-n1", `<g filter="url(#cb3-suave2)" opacity=".7">${nuvem(220, 60, .55, .8)}${nuvem(500, 48, .5, .7)}</g>`)}
    <g class="cb-passaros" fill="none" stroke="#1d2733" stroke-width="1.8" stroke-linecap="round"><path class="cb-asa" d="M420 70 q6 -6 12 0 q6 -6 12 0"/><path class="cb-asa cb-asa2" d="M452 84 q5 -5 10 0 q5 -5 10 0"/><path class="cb-asa" d="M400 92 q4 -4 8 0 q4 -4 8 0"/></g>
    <g class="cb3-ida"><g class="cb3-incl-ida">
      <path class="cb3-rastro" d="M-100 -2 h-220" stroke="url(#cb3-rastro)" stroke-width="5" stroke-linecap="round" filter="url(#cb3-suave)"/>
      <use href="#cb3-jato" x="-110" y="-40" width="220" height="80"/>
      <text x="-6" y="5.6" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="900" font-style="italic" font-size="9" fill="#0b1424">POLI<tspan fill="#1558d6">COATING</tspan></text>
      <circle class="cb3-luz" cx="-104" cy="-28" r="2" fill="#ff3b30"/>
    </g></g>
    ${faixa("cb3-n2", `${nuvem(90, 134, .85, .9)}${nuvem(410, 116, 1, .95)}`)}
    <g class="cb3-volta"><g class="cb3-incl-volta">
      <path class="cb3-rastro" d="M100 -2 h220" stroke="url(#cb3-rastro)" stroke-width="5" stroke-linecap="round" filter="url(#cb3-suave)" transform="scale(-1 1) translate(0 0)"/>
      <g transform="scale(-1 1)"><use href="#cb3-jato" x="-110" y="-40" width="220" height="80"/></g>
      <text x="6" y="5.6" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="900" font-style="italic" font-size="9" fill="#0b1424">POLI<tspan fill="#1558d6">COATING</tspan></text>
      <circle class="cb3-luz" cx="104" cy="-28" r="2" fill="#ff3b30"/>
    </g></g>
    <g opacity=".85"><path d="M432 214 q44 -42 98 0z" fill="#4c8f63"/><path d="M462 214 q22 -18 44 0z" fill="#e7d6a4"/>
      <g transform="translate(484 174)"><path d="M0 40 q-2 -22 6 -38" stroke="#6b4b2e" stroke-width="3.5" fill="none"/><path d="M6 2 q-18 -4 -26 8 M6 2 q14 -10 28 0 M6 2 q-6 -16 -20 -14 M6 2 q12 -14 24 -8" stroke="#2f8f53" stroke-width="4.5" fill="none" stroke-linecap="round"/></g></g>
    <rect y="186" width="640" height="30" fill="#eaf6ff" opacity=".35"/>
    <rect y="212" width="640" height="88" fill="url(#cb3-mar)"/>
    <g class="cb3-reluz" fill="#fff4c8"><rect x="92" y="216" width="56" height="2" rx="1" opacity="0.95"/><rect x="94" y="224" width="52" height="2" rx="1" opacity="0.87"/><rect x="96" y="232" width="48" height="2" rx="1" opacity="0.79"/><rect x="98" y="240" width="44" height="2" rx="1" opacity="0.71"/><rect x="100" y="248" width="40" height="1.4" rx="1" opacity="0.63"/><rect x="102" y="256" width="36" height="1.4" rx="1" opacity="0.55"/><rect x="104" y="264" width="32" height="1.4" rx="1" opacity="0.47"/><rect x="106" y="272" width="28" height="1.4" rx="1" opacity="0.39"/><rect x="108" y="280" width="24" height="1.4" rx="1" opacity="0.31"/><rect x="110" y="288" width="20" height="1.4" rx="1" opacity="0.23"/></g>
    ${faixa("cb3-o1", `<path d="M0 224 q20 -6 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" stroke="#9ad6ff" stroke-width="1.8" fill="none" opacity=".75"/>`)}
    <g class="cb3-navio">
      <path d="M-70 258 q40 -6 76 0" stroke="#fff" stroke-width="2.4" fill="none" opacity=".7" stroke-dasharray="6 5"/>
      <path d="M0 252 h82 l-12 14 h-60z" fill="#1d2733"/><path d="M0 252 h82 l-2 3 h-79z" fill="#d92d20"/>
      <rect x="18" y="238" width="44" height="14" rx="1" fill="#f4f7fa"/><rect x="24" y="242" width="5" height="4" fill="#9fb5cc"/><rect x="32" y="242" width="5" height="4" fill="#9fb5cc"/><rect x="40" y="242" width="5" height="4" fill="#9fb5cc"/>
      <rect x="48" y="226" width="9" height="12" fill="#1558d6"/><rect x="48" y="226" width="9" height="3" fill="#f7c600"/>
      <g class="cb3-fumaca2" fill="#e8edf3"><circle cx="52" cy="222" r="4"/><circle cx="52" cy="222" r="5"/></g>
    </g>
    ${faixa("cb3-o2", `<path d="M0 266 q24 -7 48 0 t48 0 t48 0 t48 0 t48 0 t48 0 t48 0 t48 0 t48 0 t48 0 t48 0 t48 0 t48 0 t48 0" stroke="#5fb3f7" stroke-width="2" fill="none" opacity=".7"/><g fill="#fff" opacity=".75"><circle cx="100" cy="246" r="1.3"/><circle cx="260" cy="284" r="1.3"/><circle cx="420" cy="254" r="1.3"/><circle cx="580" cy="290" r="1.3"/></g>`)}
    ${faixa("cb3-n3", `<g filter="url(#cb3-suave)">${nuvem(260, 206, .95, .9)}${nuvem(610, 210, .8, .85)}</g>`)}
  </svg>`;

  const ETAPAS = ["Conferindo o CEP de entrega", "Calculando a rota saindo de Matão-SP", "Somando peso, volumes e veículo", "Gerando o número da cotação"];

  /** opcoes.veiculo: o veículo escolhido na cotação decide a cena (Montana → picape; caminhão → baú) */
  function mostrar(opcoes) {
    const v = String((opcoes && opcoes.veiculo) || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const cena = /montana|picape|pick/.test(v) ? MONTANA : /caminh|bau|truck/.test(v) ? CAMINHAO : [CAMINHAO, MONTANA, AVIAO][Math.floor(Math.random() * 3) % 3];
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
