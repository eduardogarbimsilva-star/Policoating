/* =========================================================
   Policoating — "fotos" geradas no navegador
   - fotoCor(): placa metálica pintada na cor + monte de pó, com
     brilho/textura conforme o acabamento (uma imagem por cor)
   - aplicacaoSVG(): peças pintadas (portão, painel, cadeira...)
   Se a cor tiver `foto` em produtos.js, a foto real é usada.
   ========================================================= */
(function () {
  "use strict";

  const cache = new Map();
  let ruido = null;
  let semente = 1;
  const aleatorio = () => ((semente = (semente * 16807) % 2147483647) / 2147483647);

  function rgb(hex) {
    const h = String(hex).replace("#", "");
    return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
  }
  // quantidade > 0 clareia, < 0 escurece
  function tom(hex, q, alfa) {
    const c = rgb(hex).map((v) => Math.round(q >= 0 ? v + (255 - v) * q : v * (1 + q)));
    return alfa == null ? `rgb(${c})` : `rgba(${c},${alfa})`;
  }
  const luminancia = (hex) => { const [r, g, b] = rgb(hex); return (r * 299 + g * 587 + b * 114) / 1000; };

  function tipoAcabamento(texto) {
    const t = String(texto || "").toLowerCase();
    if (/metál|metal|cromad|perol/.test(t)) return "metalico";
    if (/martel/.test(t)) return "martelado";
    if (/textur|rugos/.test(t)) return "texturizado";
    if (/fosco/.test(t)) return "fosco";
    if (/acetin|semibrilho/.test(t)) return "acetinado";
    if (/transpar|incolor/.test(t)) return "brilhante";
    return "brilhante";
  }

  function texturaRuido() {
    if (ruido) return ruido;
    ruido = document.createElement("canvas");
    ruido.width = ruido.height = 160;
    const x = ruido.getContext("2d");
    const d = x.createImageData(160, 160);
    semente = 7;
    for (let i = 0; i < d.data.length; i += 4) {
      const v = aleatorio() * 255;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = 255;
    }
    x.putImageData(d, 0, 0);
    return ruido;
  }

  function retanguloArredondado(x, px, py, w, h, r) {
    x.beginPath();
    x.moveTo(px + r, py);
    x.arcTo(px + w, py, px + w, py + h, r);
    x.arcTo(px + w, py + h, px, py + h, r);
    x.arcTo(px, py + h, px, py, r);
    x.arcTo(px, py, px + w, py, r);
    x.closePath();
  }

  /** Gera a "foto" da cor. Retorna um data URL (jpeg). */
  function fotoCor(hex, acabamento, opcoes) {
    const tipo = tipoAcabamento(acabamento);
    const o = Object.assign({ largura: 600, altura: 480, po: true }, opcoes);
    const chave = [hex, tipo, o.largura, o.altura, o.po].join("|");
    if (cache.has(chave)) return cache.get(chave);

    const W = o.largura, H = o.altura;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const x = c.getContext("2d");
    semente = rgb(hex).reduce((a, b) => a * 31 + b, 17) % 2147483646 + 1;

    // Fundo de estúdio
    let g = x.createRadialGradient(W * 0.45, H * 0.3, 10, W * 0.5, H * 0.45, W * 0.85);
    g.addColorStop(0, "#fbfcfe"); g.addColorStop(1, "#d9e0ea");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    g = x.createLinearGradient(0, H * 0.72, 0, H);
    g.addColorStop(0, "rgba(160,172,190,0)"); g.addColorStop(1, "rgba(160,172,190,.35)");
    x.fillStyle = g; x.fillRect(0, H * 0.72, W, H * 0.28);

    // Trilho e gancho
    const px = W * (o.po ? 0.17 : 0.27), pw = W * (o.po ? 0.44 : 0.46), py = H * 0.17, ph = H * 0.68;
    g = x.createLinearGradient(0, H * 0.04, 0, H * 0.075);
    g.addColorStop(0, "#c9cfd6"); g.addColorStop(0.5, "#8b949e"); g.addColorStop(1, "#5d6670");
    x.fillStyle = g; x.fillRect(0, H * 0.045, W, H * 0.03);
    const cx = px + pw / 2;
    x.strokeStyle = "#6b737c"; x.lineWidth = 3;
    x.beginPath(); x.moveTo(cx, H * 0.075); x.lineTo(cx, py - 8); x.arc(cx, py + 4, 9, -Math.PI / 2, Math.PI * 0.9); x.stroke();

    // Sombra da placa
    x.save();
    x.shadowColor = "rgba(20,30,50,.28)"; x.shadowBlur = 34; x.shadowOffsetX = 16; x.shadowOffsetY = 20;
    retanguloArredondado(x, px, py, pw, ph, 6);
    x.fillStyle = hex; x.fill();
    x.restore();

    // Placa
    x.save();
    retanguloArredondado(x, px, py, pw, ph, 6);
    x.clip();
    g = x.createLinearGradient(0, py, 0, py + ph);
    g.addColorStop(0, tom(hex, 0.14)); g.addColorStop(0.5, hex); g.addColorStop(1, tom(hex, -0.16));
    x.fillStyle = g; x.fillRect(px, py, pw, ph);

    const escura = luminancia(hex) < 90;
    if (tipo === "metalico") {
      g = x.createLinearGradient(px, 0, px + pw, 0);
      g.addColorStop(0, "rgba(0,0,0,.28)"); g.addColorStop(0.28, "rgba(255,255,255,.45)");
      g.addColorStop(0.5, "rgba(0,0,0,.08)"); g.addColorStop(0.72, "rgba(255,255,255,.35)"); g.addColorStop(1, "rgba(0,0,0,.3)");
      x.fillStyle = g; x.fillRect(px, py, pw, ph);
      for (let i = 0; i < 900; i++) {
        x.fillStyle = `rgba(255,255,255,${aleatorio() * 0.7})`;
        const s = aleatorio() * 1.6 + 0.4;
        x.fillRect(px + aleatorio() * pw, py + aleatorio() * ph, s, s);
      }
    } else if (tipo === "martelado") {
      for (let i = 0; i < 110; i++) {
        const rx = px + aleatorio() * pw, ry = py + aleatorio() * ph, r = 12 + aleatorio() * 20;
        const rg = x.createRadialGradient(rx - r * 0.3, ry - r * 0.3, 1, rx, ry, r);
        rg.addColorStop(0, "rgba(255,255,255,.12)"); rg.addColorStop(0.7, "rgba(0,0,0,.02)"); rg.addColorStop(1, "rgba(0,0,0,.09)");
        x.fillStyle = rg; x.beginPath(); x.arc(rx, ry, r, 0, Math.PI * 2); x.fill();
      }
    } else if (tipo === "texturizado") {
      x.globalAlpha = 0.5; x.globalCompositeOperation = "overlay";
      x.drawImage(texturaRuido(), px, py, pw, ph);
      x.globalCompositeOperation = "source-over"; x.globalAlpha = 1;
      for (let i = 0; i < 2600; i++) {
        const claro = aleatorio() > 0.5;
        x.fillStyle = claro ? "rgba(255,255,255,.16)" : "rgba(0,0,0,.2)";
        x.beginPath(); x.arc(px + aleatorio() * pw, py + aleatorio() * ph, aleatorio() * 1.8 + 0.6, 0, Math.PI * 2); x.fill();
      }
    } else {
      x.globalAlpha = tipo === "fosco" ? 0.1 : 0.05; x.globalCompositeOperation = "overlay";
      x.drawImage(texturaRuido(), px, py, pw * 2, ph * 2);
      x.globalCompositeOperation = "source-over"; x.globalAlpha = 1;
    }

    // Reflexo (depende do brilho)
    const reflexo = { brilhante: 0.55, acetinado: 0.28, fosco: 0.08, texturizado: 0.1, martelado: 0.3, metalico: 0.35 }[tipo];
    g = x.createLinearGradient(px, py, px + pw, py + ph);
    g.addColorStop(0, `rgba(255,255,255,${reflexo * (escura ? 0.55 : 0.45)})`);
    g.addColorStop(0.32, "rgba(255,255,255,0)");
    g.addColorStop(0.46, `rgba(255,255,255,${reflexo * 0.5})`);
    g.addColorStop(0.52, "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(0,0,0,.12)");
    x.fillStyle = g; x.fillRect(px, py, pw, ph);
    if (tipo === "brilhante" || tipo === "acetinado") {
      x.fillStyle = `rgba(255,255,255,${reflexo * 0.7})`;
      x.fillRect(px, py, pw, 2);
    }
    x.restore();

    // Furo do gancho e borda
    x.fillStyle = "#cfd6df"; x.beginPath(); x.arc(cx, py + 14, 6, 0, Math.PI * 2); x.fill();
    x.strokeStyle = tom(hex, -0.3, 0.5); x.lineWidth = 1;
    retanguloArredondado(x, px + 0.5, py + 0.5, pw - 1, ph - 1, 6); x.stroke();
    x.strokeStyle = "#6b737c"; x.lineWidth = 3;
    x.beginPath(); x.arc(cx, py + 4, 9, Math.PI * 0.1, Math.PI * 0.9); x.stroke();

    // Monte de pó
    if (o.po) {
      const bx = W * 0.76, by = H * 0.9, hw = W * 0.19, hh = H * 0.21;
      g = x.createRadialGradient(bx, by + 4, 4, bx, by + 4, hw * 1.3);
      g.addColorStop(0, "rgba(20,30,50,.3)"); g.addColorStop(1, "rgba(20,30,50,0)");
      x.fillStyle = g; x.beginPath(); x.ellipse(bx, by + 4, hw * 1.3, hh * 0.22, 0, 0, Math.PI * 2); x.fill();
      x.save();
      x.beginPath();
      x.moveTo(bx - hw, by);
      x.bezierCurveTo(bx - hw * 0.62, by - hh * 0.25, bx - hw * 0.35, by - hh * 1.02, bx - hw * 0.04, by - hh);
      x.bezierCurveTo(bx + hw * 0.3, by - hh * 0.98, bx + hw * 0.6, by - hh * 0.3, bx + hw, by);
      x.bezierCurveTo(bx + hw * 0.5, by + hh * 0.12, bx - hw * 0.5, by + hh * 0.12, bx - hw, by);
      x.closePath();
      x.clip();
      g = x.createLinearGradient(bx - hw, by - hh, bx + hw, by);
      g.addColorStop(0, tom(hex, 0.22)); g.addColorStop(0.55, tom(hex, 0.02)); g.addColorStop(1, tom(hex, -0.25));
      x.fillStyle = g; x.fillRect(bx - hw, by - hh, hw * 2, hh * 1.2);
      x.globalCompositeOperation = "overlay"; x.globalAlpha = 0.55;
      x.drawImage(texturaRuido(), bx - hw, by - hh, hw * 2, hh * 1.2);
      x.restore();
      for (let i = 0; i < 380; i++) {
        const a = aleatorio() * Math.PI, d = hw * (0.9 + aleatorio() * 0.55);
        x.fillStyle = tom(hex, (aleatorio() - 0.5) * 0.3, 0.35 + aleatorio() * 0.5);
        x.beginPath(); x.arc(bx + Math.cos(a) * d * (aleatorio() > 0.5 ? 1 : -1), by + Math.sin(a) * hh * 0.12, aleatorio() * 1.7 + 0.4, 0, Math.PI * 2); x.fill();
      }
    }

    const url = c.toDataURL("image/jpeg", 0.86);
    cache.set(chave, url);
    return url;
  }

  /** URL da foto de uma cor de produto (foto real, se houver, senão gerada) */
  function fotoProduto(produto, cor, opcoes) {
    cor = cor || produto.cores[0];
    if (cor.foto) return cor.foto;
    return fotoCor(cor.hex, produto.acabamento, opcoes);
  }

  /* ---------- Peças pintadas (aplicações) ---------- */
  let idAp = 0;
  function aplicacaoSVG(tipo, hex, acabamento) {
    const id = "ap" + ++idAp;
    const fx = tipoAcabamento(acabamento);
    const brilho = { brilhante: 0.5, acetinado: 0.28, fosco: 0.08, texturizado: 0.12, martelado: 0.3, metalico: 0.45 }[fx];
    const escuro = tom(hex, -0.3), claro = tom(hex, 0.25);
    const pecas = {
      portao: `<g fill="${hex}"><rect x="60" y="60" width="280" height="12"/><rect x="60" y="226" width="280" height="12"/>
        <rect x="60" y="60" width="14" height="178"/><rect x="326" y="60" width="14" height="178"/><rect x="60" y="143" width="280" height="9"/>
        ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="${96 + i * 30}" y="72" width="8" height="154"/>`).join("")}
        ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<path d="M${100 + i * 30} 44 l-7 16 h14z"/>`).join("")}</g>`,
      painel: `<rect x="120" y="40" width="160" height="206" rx="5" fill="${hex}"/><rect x="128" y="48" width="144" height="190" rx="3" fill="none" stroke="${escuro}" stroke-width="2"/>
        <rect x="252" y="120" width="8" height="40" rx="3" fill="#2b2f36"/><g fill="${escuro}"><rect x="142" y="66" width="60" height="4" rx="2"/><rect x="142" y="76" width="60" height="4" rx="2"/><rect x="142" y="86" width="60" height="4" rx="2"/></g>
        <rect x="142" y="190" width="40" height="28" rx="2" fill="#fff" opacity=".9"/><path d="M158 196 l-4 9 h6 l-3 8 9-11 h-6 l3-6z" fill="#f7c600" stroke="#111" stroke-width=".7"/>`,
      cadeira: `<rect x="170" y="190" width="100" height="8" rx="3" fill="#2b2f36"/><rect x="176" y="96" width="70" height="80" rx="8" fill="#2b2f36"/>
        <g fill="${hex}"><rect x="168" y="80" width="10" height="170" rx="4"/><rect x="262" y="182" width="10" height="68" rx="4"/>
        <rect x="168" y="80" width="82" height="9" rx="4"/><rect x="168" y="182" width="104" height="11" rx="4"/><rect x="168" y="236" width="104" height="7" rx="3"/></g>`,
      estante: `<g fill="${hex}"><rect x="110" y="40" width="10" height="210"/><rect x="280" y="40" width="10" height="210"/>
        ${[0, 1, 2, 3].map((i) => `<rect x="110" y="${60 + i * 58}" width="180" height="8"/>`).join("")}</g>
        <g><rect x="130" y="34" width="36" height="26" fill="#c9a06a"/><rect x="176" y="40" width="50" height="20" fill="#b58b56"/><rect x="140" y="98" width="60" height="20" fill="#d7b079"/>
        <rect x="210" y="92" width="30" height="26" fill="#c9a06a"/><rect x="130" y="150" width="44" height="26" fill="#b58b56"/><rect x="190" y="210" width="70" height="24" fill="#d7b079"/></g>`,
      janela: `<rect x="90" y="46" width="220" height="200" fill="${hex}"/><rect x="104" y="60" width="92" height="172" fill="#cfe7f5"/><rect x="204" y="60" width="92" height="172" fill="#cfe7f5"/>
        <path d="M110 70 l40 0 -40 60z M214 70 l30 0 -30 45z" fill="#fff" opacity=".5"/><rect x="186" y="140" width="6" height="30" rx="2" fill="${escuro}"/>`,
      roda: `<circle cx="200" cy="148" r="104" fill="#1e1f22"/><circle cx="200" cy="148" r="80" fill="${hex}"/><circle cx="200" cy="148" r="70" fill="${escuro}"/>
        ${[0, 1, 2, 3, 4].map((i) => `<rect x="194" y="82" width="12" height="66" rx="5" fill="${hex}" transform="rotate(${i * 72} 200 148)"/>`).join("")}
        <circle cx="200" cy="148" r="18" fill="${hex}"/><circle cx="200" cy="148" r="7" fill="${claro}"/>`
    };
    return `<svg viewBox="0 0 400 290" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Peça pintada">
      <defs>
        <radialGradient id="${id}f" cx=".45" cy=".3" r=".9"><stop offset="0" stop-color="#fbfcfe"/><stop offset="1" stop-color="#d9e0ea"/></radialGradient>
        <linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="${brilho}"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/>
          <stop offset=".5" stop-color="#fff" stop-opacity="${brilho * 0.5}"/><stop offset=".56" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient>
        <g id="${id}p">${pecas[tipo] || pecas.painel}</g>
        <filter id="${id}w"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/></filter>
        <mask id="${id}m"><use href="#${id}p" filter="url(#${id}w)"/></mask>
      </defs>
      <rect width="400" height="290" fill="url(#${id}f)"/>
      <ellipse cx="200" cy="256" rx="150" ry="10" fill="#000" opacity=".1"/>
      <use href="#${id}p"/>
      <rect width="400" height="290" fill="url(#${id}b)" mask="url(#${id}m)"/>
    </svg>`;
  }


  /* ---------- Ambientes (casas, loja, galpão, escritório) ----------
     Só as partes metálicas (portões, grades, esquadrias, estruturas)
     recebem a cor da tinta em pó. */
  let idAmb = 0;
  function ambienteSVG(tipo, hex, acabamento) {
    const id = "amb" + ++idAmb;
    const fx = tipoAcabamento(acabamento);
    const brilho = { brilhante: 0.45, acetinado: 0.25, fosco: 0.06, texturizado: 0.1, martelado: 0.25, metalico: 0.4 }[fx];
    const esc = tom(hex, -0.35);
    const ceu = `<linearGradient id="${id}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9cc6f0"/><stop offset="1" stop-color="#e6f1fb"/></linearGradient>`;
    const grama = `<rect y="330" width="600" height="70" fill="#8fbf6a"/><rect y="340" width="600" height="60" fill="#cfd4da"/><rect y="346" width="600" height="3" fill="#b7bec6"/>`;
    const nuvens = `<g fill="#fff" opacity=".85"><ellipse cx="90" cy="60" rx="46" ry="14"/><ellipse cx="120" cy="52" rx="30" ry="12"/><ellipse cx="480" cy="44" rx="40" ry="11"/></g>`;
    const arvore = (x) => `<rect x="${x - 5}" y="270" width="10" height="64" fill="#7a5436"/><circle cx="${x}" cy="255" r="34" fill="#5f9e4a"/><circle cx="${x - 20}" cy="272" r="22" fill="#6fae55"/><circle cx="${x + 22}" cy="268" r="24" fill="#6fae55"/>`;
    const janela = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#bfe0f5"/><path d="M${x + 6} ${y + 6} l${w * 0.35} 0 -${w * 0.35} ${h * 0.5}z" fill="#fff" opacity=".45"/>`;
    const moldura = (x, y, w, h) => `<rect x="${x - 5}" y="${y - 5}" width="${w + 10}" height="5"/><rect x="${x - 5}" y="${y + h}" width="${w + 10}" height="5"/>
      <rect x="${x - 5}" y="${y}" width="5" height="${h}"/><rect x="${x + w}" y="${y}" width="5" height="${h}"/><rect x="${x + w / 2 - 2}" y="${y}" width="4" height="${h}"/>`;
    const grade = (x, y, w, h, passo) => {
      let r = `<rect x="${x}" y="${y}" width="${w}" height="5"/><rect x="${x}" y="${y + h - 5}" width="${w}" height="5"/>`;
      for (let i = x; i <= x + w - 4; i += passo) r += `<rect x="${i}" y="${y}" width="4" height="${h}"/>`;
      return r;
    };

    const cenas = {
      casa: {
        fundo: `<rect width="600" height="400" fill="url(#${id}c)"/>${nuvens}${grama}${arvore(530)}
          <rect x="150" y="170" width="300" height="165" fill="#efe6d8"/><path d="M130 175 L300 90 L470 175z" fill="#b5522e"/><path d="M130 175 L300 90 L470 175" fill="none" stroke="#8e3f22" stroke-width="4"/>
          ${janela(185, 205, 80, 60)}${janela(335, 205, 80, 60)}<rect x="275" y="250" width="50" height="85" fill="#7a5436"/><circle cx="316" cy="295" r="3" fill="#e9c46a"/>`,
        pecas: `${moldura(185, 205, 80, 60)}${moldura(335, 205, 80, 60)}${grade(20, 280, 250, 60, 14)}${grade(330, 280, 250, 60, 14)}
          <rect x="16" y="270" width="10" height="72"/><rect x="262" y="270" width="10" height="72"/><rect x="328" y="270" width="10" height="72"/><rect x="574" y="270" width="10" height="72"/>`
      },
      sobrado: {
        fundo: `<rect width="600" height="400" fill="url(#${id}c)"/>${nuvens}${grama}${arvore(70)}
          <rect x="170" y="80" width="280" height="255" fill="#e7e2da"/><rect x="160" y="70" width="300" height="14" fill="#4a4e52"/>
          ${janela(200, 110, 90, 70)}${janela(330, 110, 90, 70)}<rect x="160" y="190" width="300" height="10" fill="#cfc7bb"/>
          ${janela(200, 230, 90, 100)}<rect x="330" y="240" width="60" height="95" fill="#5b4636"/>`,
        pecas: `${moldura(200, 110, 90, 70)}${moldura(330, 110, 90, 70)}${moldura(200, 230, 90, 100)}${grade(160, 160, 300, 40, 12)}
          <rect x="324" y="234" width="72" height="6"/><rect x="324" y="234" width="6" height="101"/><rect x="390" y="234" width="6" height="101"/>`
      },
      loja: {
        fundo: `<rect width="600" height="400" fill="url(#${id}c)"/>${grama}
          <rect x="60" y="70" width="480" height="265" fill="#d7dbe0"/><rect x="60" y="70" width="480" height="60" fill="#1c2f55"/>
          <text x="300" y="110" text-anchor="middle" font-family="Inter,Arial" font-weight="800" font-size="26" fill="#fff" letter-spacing="3">LOJA</text>
          ${janela(90, 160, 170, 170)}${janela(340, 160, 170, 170)}<rect x="270" y="170" width="60" height="165" fill="#bfe0f5" opacity=".9"/>`,
        pecas: `${moldura(90, 160, 170, 170)}${moldura(340, 160, 170, 170)}<rect x="264" y="164" width="72" height="6"/><rect x="264" y="164" width="6" height="171"/><rect x="330" y="164" width="6" height="171"/>
          <path d="M60 130 h480 l-20 22 h-440z"/>`
      },
      galpao: {
        fundo: `<rect width="600" height="400" fill="url(#${id}c)"/>${nuvens}${grama}
          <path d="M60 170 L300 90 L540 170 V335 H60z" fill="#b9c1ca"/>
          ${Array.from({ length: 24 }, (_, i) => `<rect x="${64 + i * 20}" y="170" width="2" height="165" fill="#a3acb6"/>`).join("")}
          <rect x="230" y="210" width="140" height="125" fill="#5f6873"/>
          ${Array.from({ length: 12 }, (_, i) => `<rect x="230" y="${214 + i * 10}" width="140" height="2" fill="#4c545e"/>`).join("")}`,
        pecas: `<rect x="56" y="166" width="10" height="170"/><rect x="534" y="166" width="10" height="170"/><rect x="295" y="92" width="10" height="80"/>
          <path d="M56 170 L300 86 L544 170 L536 176 L300 96 L64 176z"/>
          <rect x="222" y="202" width="156" height="8"/><rect x="222" y="202" width="8" height="133"/><rect x="370" y="202" width="8" height="133"/>`
      },
      escritorio: {
        fundo: `<rect width="600" height="400" fill="#eef1f5"/><rect y="320" width="600" height="80" fill="#c9b79c"/>
          ${janela(360, 60, 180, 150)}<rect x="80" y="210" width="220" height="14" fill="#d9c3a1"/><rect x="90" y="150" width="60" height="44" rx="3" fill="#2b2f36"/>
          <rect x="116" y="194" width="8" height="16" fill="#2b2f36"/><rect x="190" y="180" width="70" height="30" fill="#e7e2d8"/>
          <rect x="400" y="236" width="70" height="46" rx="8" fill="#2b2f36"/><rect x="398" y="282" width="80" height="10" rx="4" fill="#2b2f36"/>`,
        pecas: `${moldura(360, 60, 180, 150)}<rect x="88" y="224" width="8" height="98"/><rect x="284" y="224" width="8" height="98"/><rect x="88" y="300" width="204" height="6"/>
          <rect x="398" y="226" width="8" height="96"/><rect x="470" y="276" width="8" height="46"/><rect x="398" y="226" width="60" height="6"/>
          <rect x="30" y="120" width="8" height="200"/><rect x="30" y="160" width="40" height="5"/><rect x="30" y="220" width="40" height="5"/><rect x="30" y="280" width="40" height="5"/>`
      }
    };
    const c = cenas[tipo] || cenas.casa;
    return `<svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ambiente com peças metálicas pintadas">
      <defs>${ceu}
        <linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="${brilho}"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient>
        <g id="${id}p">${c.pecas}</g>
        <filter id="${id}w"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/></filter>
        <mask id="${id}m"><use href="#${id}p" filter="url(#${id}w)"/></mask>
      </defs>
      ${c.fundo}
      <use href="#${id}p" fill="${hex}" stroke="${esc}" stroke-width=".6"/>
      <rect width="600" height="400" fill="url(#${id}b)" mask="url(#${id}m)"/>
    </svg>`;
  }

  window.Fotos = { fotoCor, fotoProduto, aplicacaoSVG, ambienteSVG, tipoAcabamento, tom };
})();
