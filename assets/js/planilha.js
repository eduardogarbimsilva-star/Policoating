/* Policoating — planilhas do Excel (.xlsx) com acabamento profissional, geradas no próprio navegador.
 *
 * Sem biblioteca externa: monta o arquivo Office Open XML (um .zip com XMLs) aqui mesmo.
 * Cada aba sai com faixa de título da empresa, período, cabeçalho azul fixo, filtro,
 * linhas zebradas, R$ / kg / datas como números de verdade (dá para somar e filtrar no Excel),
 * linha de TOTAL que acompanha o filtro (SUBTOTAL) e configuração de impressão
 * (paisagem, cabe na largura da folha, cabeçalho repetido e "Página X de Y").
 *
 * Uso:
 *   Planilha.baixar("vendas-2026-09", {
 *     titulo: "Vendas da semana", subtitulo: "01/09/2026 a 07/09/2026",
 *     abas: [
 *       { nome: "Resumo", resumo: [["Pedidos", 12, "int"], ["Vendido", 1234.5, "brl"]] },
 *       { nome: "Pedidos", colunas: [{ t: "Pedido" }, { t: "Data", tipo: "datahora" }, { t: "Valor", tipo: "brl", soma: true }],
 *         linhas: [["1001", new Date(), 99.9]] },
 *     ],
 *   });
 *
 * Tipos de coluna: texto (padrão), int, dec, brl, kg, pct, data, datahora, status (texto colorido).
 */
(function () {
  "use strict";

  const EMPRESA = "Policoating";
  const COR = { marinho: "0B1424", azul: "1558D6", azulClaro: "EAF1FE", zebra: "F5F8FD", linha: "D6DEEA", cinza: "5A6775", texto: "111418", branco: "FFFFFF", totalFundo: "DCE7FB" };
  const CORES_STATUS = {
    recebido: "1558D6", confirmado: "0D3FA6", confirmada: "0D3FA6", enviado: "B26A00", "em separação": "B26A00",
    entregue: "2E7D32", concluído: "2E7D32", concluido: "2E7D32", sim: "2E7D32", ativo: "2E7D32",
    cancelado: "C62828", cancelada: "C62828", reembolsado: "C62828", não: "C62828", bloqueado: "C62828",
  };

  /* ---------------- ZIP (sem compressão, com CRC-32) ---------------- */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function zip(arquivos) {
    const enc = new TextEncoder(), partes = [], central = [];
    let pos = 0;
    const agora = new Date();
    const hora = (agora.getHours() << 11) | (agora.getMinutes() << 5) | (agora.getSeconds() >> 1);
    const dia = ((agora.getFullYear() - 1980) << 9) | ((agora.getMonth() + 1) << 5) | agora.getDate();
    arquivos.forEach(([nome, conteudo]) => {
      const n = enc.encode(nome), d = typeof conteudo === "string" ? enc.encode(conteudo) : conteudo, c = crc32(d);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, hora, true); h.setUint16(12, dia, true); h.setUint32(14, c, true); h.setUint32(18, d.length, true);
      h.setUint32(22, d.length, true); h.setUint16(26, n.length, true); h.setUint16(28, 0, true);
      const e = new DataView(new ArrayBuffer(46));
      e.setUint32(0, 0x02014b50, true); e.setUint16(4, 20, true); e.setUint16(6, 20, true); e.setUint16(8, 0x0800, true);
      e.setUint16(10, 0, true); e.setUint16(12, hora, true); e.setUint16(14, dia, true); e.setUint32(16, c, true);
      e.setUint32(20, d.length, true); e.setUint32(24, d.length, true); e.setUint16(28, n.length, true);
      e.setUint32(42, pos, true);
      partes.push(new Uint8Array(h.buffer), n, d); central.push(new Uint8Array(e.buffer), n);
      pos += 30 + n.length + d.length;
    });
    const tam = central.reduce((s, x) => s + x.length, 0), fim = new DataView(new ArrayBuffer(22));
    fim.setUint32(0, 0x06054b50, true); fim.setUint16(8, arquivos.length, true); fim.setUint16(10, arquivos.length, true);
    fim.setUint32(12, tam, true); fim.setUint32(16, pos, true);
    return new Blob([...partes, ...central, new Uint8Array(fim.buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }

  /* ---------------- utilidades ---------------- */
  // eslint-disable-next-line no-control-regex
  const xml = (s) => String(s == null ? "" : s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const letra = (i) => { let s = ""; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  const ref = (c, r) => letra(c) + r;
  const nomeAba = (s, usados) => {
    let base = String(s || "Aba").replace(/[[\]:*?/\\]/g, " ").replace(/^'+|'+$/g, "").trim().slice(0, 31) || "Aba", n = base, k = 2;
    while (usados.has(n.toLowerCase())) { const suf = ` (${k++})`; n = base.slice(0, 31 - suf.length) + suf; }
    usados.add(n.toLowerCase()); return n;
  };
  const refAba = (n) => `'${n.replace(/'/g, "''")}'`;
  const serial = (d) => {
    if (!(d instanceof Date)) d = paraData(d);
    if (!d || isNaN(d)) return null;
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()) / 1000 / 86400 + 25569;
  };
  function paraData(v) {
    if (v == null || v === "") return null;
    if (v instanceof Date) return v;
    const s = String(v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + "T12:00:00");
    const d = new Date(s); return isNaN(d) ? null : d;
  }

  /* ---------------- estilos (registro com deduplicação) ---------------- */
  function Estilos() {
    const fontes = ['<font><sz val="10"/><color rgb="FF' + COR.texto + '"/><name val="Calibri"/><family val="2"/></font>'];
    const fundos = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
    const bordas = ["<border><left/><right/><top/><bottom/><diagonal/></border>"];
    const formatos = [], xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
    const idx = (lista, s) => { let i = lista.indexOf(s); if (i < 0) { lista.push(s); i = lista.length - 1; } return i; };
    const FMT = { int: 3, texto: 49 };
    const CODIGOS = {
      dec: "#,##0.00", kg: '#,##0.00" kg"', brl: '"R$" #,##0.00;[Red]-"R$" #,##0.00', pct: "0.0%",
      data: "dd/mm/yyyy", datahora: "dd/mm/yyyy hh:mm",
    };
    const numFmt = (tipo) => {
      if (FMT[tipo] != null) return FMT[tipo];
      const codigo = CODIGOS[tipo]; if (!codigo) return 0;
      let i = formatos.findIndex((f) => f.codigo === codigo);
      if (i < 0) { formatos.push({ id: 164 + formatos.length, codigo }); i = formatos.length - 1; }
      return formatos[i].id;
    };
    /** o = { negrito, italico, tam, cor, fundo, borda: "fina"|"total"|"base", h: left|center|right, v, quebra, tipo, recuo } */
    function estilo(o = {}) {
      const f = idx(fontes, `<font>${o.negrito ? "<b/>" : ""}${o.italico ? "<i/>" : ""}${o.sublinhado ? '<u/>' : ""}<sz val="${o.tam || 10}"/><color rgb="FF${o.cor || COR.texto}"/><name val="Calibri"/><family val="2"/></font>`);
      const fi = o.fundo ? idx(fundos, `<fill><patternFill patternType="solid"><fgColor rgb="FF${o.fundo}"/><bgColor indexed="64"/></patternFill></fill>`) : 0;
      const cl = `<color rgb="FF${COR.linha}"/>`;
      const b = o.borda === "fina" ? idx(bordas, `<border><left style="thin">${cl}</left><right style="thin">${cl}</right><top style="thin">${cl}</top><bottom style="thin">${cl}</bottom><diagonal/></border>`)
        : o.borda === "total" ? idx(bordas, `<border><left style="thin">${cl}</left><right style="thin">${cl}</right><top style="double"><color rgb="FF${COR.azul}"/></top><bottom style="medium"><color rgb="FF${COR.azul}"/></bottom><diagonal/></border>`)
          : o.borda === "base" ? idx(bordas, `<border><left/><right/><top/><bottom style="thin">${cl}</bottom><diagonal/></border>`) : 0;
      const n = numFmt(o.tipo);
      const al = (o.h || o.v || o.quebra || o.recuo) ? `<alignment${o.h ? ` horizontal="${o.h}"` : ""} vertical="${o.v || "center"}"${o.quebra ? ' wrapText="1"' : ""}${o.recuo ? ` indent="${o.recuo}"` : ""}/>` : '<alignment vertical="center"/>';
      return idx(xfs, `<xf numFmtId="${n}" fontId="${f}" fillId="${fi}" borderId="${b}" xfId="0"${n ? ' applyNumberFormat="1"' : ""} applyFont="1"${fi ? ' applyFill="1"' : ""}${b ? ' applyBorder="1"' : ""} applyAlignment="1">${al}</xf>`);
    }
    estilo.xml = () => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${formatos.length ? `<numFmts count="${formatos.length}">${formatos.map((f) => `<numFmt numFmtId="${f.id}" formatCode="${xml(f.codigo)}"/>`).join("")}</numFmts>` : ""}<fonts count="${fontes.length}">${fontes.join("")}</fonts><fills count="${fundos.length}">${fundos.join("")}</fills><borders count="${bordas.length}">${bordas.join("")}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join("")}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
    return estilo;
  }

  /* ---------------- células ---------------- */
  const NUMERICOS = ["int", "dec", "brl", "kg", "pct"];
  function celula(c, r, valor, tipo, s) {
    const R = ref(c, r);
    if (valor == null || valor === "") return `<c r="${R}" s="${s}"/>`;
    if (valor && typeof valor === "object" && valor.formula) {
      const v = valor.valor != null && isFinite(valor.valor) ? `<v>${valor.valor}</v>` : "";
      return `<c r="${R}" s="${s}"${typeof valor.valor === "string" ? ' t="str"' : ""}><f>${xml(valor.formula)}</f>${typeof valor.valor === "string" ? `<v>${xml(valor.valor)}</v>` : v}</c>`;
    }
    if (tipo === "data" || tipo === "datahora") {
      const n = serial(valor);
      if (n != null) return `<c r="${R}" s="${s}"><v>${tipo === "data" ? Math.floor(n) : n}</v></c>`;
    } else if (NUMERICOS.includes(tipo) && typeof valor === "number" && isFinite(valor)) {
      return `<c r="${R}" s="${s}"><v>${valor}</v></c>`;
    } else if (typeof valor === "number" && isFinite(valor) && tipo !== "texto") {
      return `<c r="${R}" s="${s}"><v>${valor}</v></c>`;
    }
    let t = String(valor); if (t.length > 32000) t = t.slice(0, 32000) + "…";
    return `<c r="${R}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xml(t)}</t></is></c>`;
  }
  const larguraTexto = (v, tipo) => {
    if (v == null) return 0;
    if (tipo === "brl") return String((+v || 0).toFixed(2)).length + 7;
    if (tipo === "kg") return String((+v || 0).toFixed(2)).length + 6;
    if (tipo === "datahora") return 16;
    if (tipo === "data") return 11;
    return Math.max(...String(v).split("\n").map((l) => l.length));
  };

  /* ---------------- abas ---------------- */
  function abaTabela(aba, E, meta) {
    const cols = aba.colunas.map((c) => (typeof c === "string" ? { t: c } : c));
    const n = cols.length, ultima = letra(n - 1), linhas = aba.linhas || [];
    const LTIT = 1, LSUB = 2, LCAB = 4, L0 = 5, Lfim = L0 + Math.max(linhas.length, 1) - 1;
    const sTit = E({ negrito: true, tam: 16, cor: COR.branco, fundo: COR.marinho, recuo: 1 });
    const sSub = E({ tam: 10, cor: "C9D6E5", fundo: COR.marinho, recuo: 1 });
    const sFaixa = E({ fundo: COR.azul });
    const alinh = (c) => (NUMERICOS.includes(c.tipo) ? "right" : (c.tipo || "").startsWith("data") || c.centro ? "center" : "left");
    const sCab = cols.map((c) => E({ negrito: true, cor: COR.branco, fundo: COR.azul, borda: "fina", h: alinh(c), quebra: true, recuo: alinh(c) === "center" ? 0 : 1 }));
    const estiloDado = (c, z, status) => E({
      tipo: c.tipo === "status" ? undefined : c.tipo, borda: "fina", fundo: z ? COR.zebra : undefined, quebra: !!c.quebra, v: c.quebra ? "top" : "center",
      h: alinh(c), recuo: alinh(c) === "center" ? 0 : 1,
      negrito: !!status || !!c.negrito, cor: status || undefined,
    });
    const rows = [];
    rows.push(`<row r="${LTIT}" spans="1:${n}" ht="30" customHeight="1">${cols.map((_, i) => i === 0 ? celula(0, LTIT, `${EMPRESA}  ·  ${aba.titulo || aba.nome}`, "texto", sTit) : `<c r="${ref(i, LTIT)}" s="${sTit}"/>`).join("")}</row>`);
    const sub = [(aba.titulo || aba.nome) !== meta.titulo ? meta.titulo : null, aba.subtitulo || meta.subtitulo, `Gerado em ${new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}${meta.autor ? " por " + meta.autor : ""}`, `${linhas.length.toLocaleString("pt-BR")} ${linhas.length === 1 ? "registro" : "registros"}`].filter(Boolean).join("   ·   ");
    rows.push(`<row r="${LSUB}" spans="1:${n}" ht="20" customHeight="1">${cols.map((_, i) => i === 0 ? celula(0, LSUB, sub, "texto", sSub) : `<c r="${ref(i, LSUB)}" s="${sSub}"/>`).join("")}</row>`);
    rows.push(`<row r="3" spans="1:${n}" ht="4" customHeight="1">${cols.map((_, i) => `<c r="${ref(i, 3)}" s="${sFaixa}"/>`).join("")}</row>`);
    rows.push(`<row r="${LCAB}" spans="1:${n}" ht="30" customHeight="1">${cols.map((c, i) => celula(i, LCAB, c.t, "texto", sCab[i])).join("")}</row>`);
    const cache = new Map(), est = (c, i, z, st) => { const k = i + "|" + z + "|" + (st || ""); if (!cache.has(k)) cache.set(k, estiloDado(c, z, st)); return cache.get(k); };
    if (!linhas.length) {
      const sV = E({ italico: true, cor: COR.cinza, borda: "fina", h: "center" });
      rows.push(`<row r="${L0}" spans="1:${n}" ht="24" customHeight="1">${cols.map((_, i) => i === 0 ? celula(0, L0, aba.vazio || "Nenhum registro neste período.", "texto", sV) : `<c r="${ref(i, L0)}" s="${sV}"/>`).join("")}</row>`);
    }
    linhas.forEach((l, k) => {
      const r = L0 + k, z = k % 2;
      rows.push(`<row r="${r}" spans="1:${n}">${cols.map((c, i) => {
        let v = l[i]; if (typeof v === "boolean") v = v ? "Sim" : "Não";
        const st = c.tipo === "status" && v ? (c.cores || CORES_STATUS)[String(v).toLowerCase()] : null;
        return celula(i, r, v, c.tipo, est(c, i, z, st));
      }).join("")}</row>`);
    });
    // TOTAL: SUBTOTAL(109) soma só o que está visível no filtro
    const temTotal = linhas.length && cols.some((c) => c.soma || c.media);
    let Ltot = null;
    if (temTotal) {
      Ltot = Lfim + 1;
      const sTL = E({ negrito: true, borda: "total", fundo: COR.totalFundo, cor: COR.marinho });
      rows.push(`<row r="${Ltot}" spans="1:${n}" ht="22" customHeight="1">${cols.map((c, i) => {
        const faixa = `${letra(i)}${L0}:${letra(i)}${Lfim}`;
        const nums = linhas.map((l) => +l[i]).filter((x) => isFinite(x));
        if (c.soma) return celula(i, Ltot, { formula: `SUBTOTAL(109,${faixa})`, valor: +nums.reduce((s, x) => s + x, 0).toFixed(6) }, c.tipo, E({ negrito: true, borda: "total", fundo: COR.totalFundo, cor: COR.marinho, tipo: c.tipo, h: "right" }));
        if (c.media) return celula(i, Ltot, { formula: `SUBTOTAL(101,${faixa})`, valor: nums.length ? nums.reduce((s, x) => s + x, 0) / nums.length : 0 }, c.tipo, E({ negrito: true, borda: "total", fundo: COR.totalFundo, cor: COR.marinho, tipo: c.tipo, h: "right" }));
        if (i === 0) return celula(i, Ltot, "TOTAL", "texto", sTL);
        return `<c r="${ref(i, Ltot)}" s="${sTL}"/>`;
      }).join("")}</row>`);
    }
    // larguras
    const larg = cols.map((c, i) => {
      if (c.w) return c.w;
      const m = Math.max(larguraTexto(c.t, "texto") + 4, ...linhas.slice(0, 800).map((l) => larguraTexto(l[i], c.tipo) + 4));
      return Math.round(Math.min(c.quebra ? 48 : 42, Math.max(c.tipo === "status" ? 12 : 8, m)) * 10) / 10;
    });
    const Lult = Ltot || Lfim;
    const merges = [`A${LTIT}:${ultima}${LTIT}`, `A${LSUB}:${ultima}${LSUB}`].concat(linhas.length ? [] : [`A${L0}:${ultima}${L0}`]);
    const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><tabColor rgb="FF${aba.cor || COR.azul}"/><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${ultima}${Lult}"/><sheetViews><sheetView workbookViewId="0" showGridLines="0"${aba.ativa ? ' tabSelected="1"' : ""} zoomScale="100"><pane ySplit="${LCAB}" topLeftCell="A${L0}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${L0}" sqref="A${L0}"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="16" customHeight="1"/><cols>${larg.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols><sheetData>${rows.join("")}</sheetData>${linhas.length ? `<autoFilter ref="A${LCAB}:${ultima}${Lfim}"/>` : ""}<mergeCells count="${merges.length}">${merges.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells><printOptions horizontalCentered="1"/><pageMargins left="0.4" right="0.4" top="0.55" bottom="0.6" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="${n > 6 ? "landscape" : "portrait"}" fitToWidth="1" fitToHeight="0"/><headerFooter><oddFooter>&amp;L&amp;8&amp;K5A6775${xml(EMPRESA + " · " + (aba.titulo || meta.titulo || aba.nome))}&amp;R&amp;8&amp;K5A6775Página &amp;P de &amp;N</oddFooter></headerFooter></worksheet>`;
    return { sheet, filtro: linhas.length ? `$A$${LCAB}:$${ultima}$${Lfim}` : null, titulos: `$${LCAB}:$${LCAB}` };
  }

  /** Aba de resumo: indicadores em "cartões" + (opcional) links para as outras abas */
  function abaResumo(aba, E, meta, outras) {
    const sTit = E({ negrito: true, tam: 18, cor: COR.branco, fundo: COR.marinho, recuo: 1 });
    const sSub = E({ tam: 10, cor: "C9D6E5", fundo: COR.marinho, recuo: 1 });
    const sFaixa = E({ fundo: COR.azul });
    const sSec = E({ negrito: true, tam: 11, cor: COR.azul, borda: "base" });
    const sRot = E({ tam: 10, cor: COR.cinza, borda: "fina", fundo: COR.zebra, recuo: 1 });
    const sVal = (tipo) => (NUMERICOS.includes(tipo) ? E({ negrito: true, tam: 13, cor: COR.marinho, borda: "fina", tipo, h: "right", recuo: 1 })
      : E({ negrito: true, tam: 11, cor: COR.marinho, borda: "fina", h: "left", recuo: 1, quebra: true }));
    const sLink = E({ cor: COR.azul, sublinhado: true, recuo: 1 });
    const sNota = E({ italico: true, cor: COR.cinza, tam: 9, quebra: true, v: "top" });
    const rows = [], links = [], merges = ["A1:D1", "A2:D2"];
    let r = 1;
    rows.push(`<row r="1" ht="36" customHeight="1">${[0, 1, 2, 3].map((i) => i ? `<c r="${ref(i, 1)}" s="${sTit}"/>` : celula(0, 1, `${EMPRESA}  ·  ${meta.titulo}`, "texto", sTit)).join("")}</row>`);
    rows.push(`<row r="2" ht="22" customHeight="1">${[0, 1, 2, 3].map((i) => i ? `<c r="${ref(i, 2)}" s="${sSub}"/>` : celula(0, 2, [meta.subtitulo, `Gerado em ${new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}${meta.autor ? " por " + meta.autor : ""}`].filter(Boolean).join("   ·   "), "texto", sSub)).join("")}</row>`);
    rows.push(`<row r="3" ht="4" customHeight="1">${[0, 1, 2, 3].map((i) => `<c r="${ref(i, 3)}" s="${sFaixa}"/>`).join("")}</row>`);
    r = 5;
    rows.push(`<row r="${r}" ht="22" customHeight="1">${celula(0, r, aba.secao || "Indicadores", "texto", sSec)}${celula(1, r, "", "texto", sSec)}</row>`); r++;
    (aba.resumo || []).forEach(([rot, val, tipo]) => {
      rows.push(`<row r="${r}" ht="26" customHeight="1">${celula(0, r, rot, "texto", sRot)}${celula(1, r, val, tipo || (typeof val === "number" ? "dec" : "texto"), sVal(tipo))}</row>`); r++;
    });
    if (outras.length) {
      r++;
      rows.push(`<row r="${r}" ht="22" customHeight="1">${celula(0, r, "Abas desta planilha", "texto", sSec)}${celula(1, r, "", "texto", sSec)}</row>`); r++;
      outras.forEach((o) => {
        rows.push(`<row r="${r}" ht="18" customHeight="1">${celula(0, r, "→  " + o.nome, "texto", sLink)}${celula(1, r, o.descricao || `${(o.linhas || []).length.toLocaleString("pt-BR")} ${(o.linhas || []).length === 1 ? "registro" : "registros"}`, "texto", E({ cor: COR.cinza }))}</row>`);
        links.push(`<hyperlink ref="A${r}" location="${xml(refAba(o.nomeFinal) + "!A1")}" display="${xml(o.nome)}"/>`); r++;
      });
    }
    if (aba.nota) { r++; rows.push(`<row r="${r}" ht="44" customHeight="1">${celula(0, r, aba.nota, "texto", sNota)}</row>`); merges.push(`A${r}:D${r}`); }
    const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><tabColor rgb="FF${COR.marinho}"/><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:D${r}"/><sheetViews><sheetView workbookViewId="0" showGridLines="0" tabSelected="1"/></sheetViews><sheetFormatPr defaultRowHeight="16"/><cols><col min="1" max="1" width="34" customWidth="1"/><col min="2" max="2" width="46" customWidth="1"/><col min="3" max="4" width="14" customWidth="1"/></cols><sheetData>${rows.join("")}</sheetData><mergeCells count="${merges.length}">${merges.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>${links.length ? `<hyperlinks>${links.join("")}</hyperlinks>` : ""}<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/><headerFooter><oddFooter>&amp;L&amp;8&amp;K5A6775${xml(EMPRESA + " · " + meta.titulo)}&amp;R&amp;8&amp;K5A6775Página &amp;P de &amp;N</oddFooter></headerFooter></worksheet>`;
    return { sheet };
  }

  /* ---------------- pasta de trabalho ---------------- */
  function gerar(meta) {
    const E = Estilos(), usados = new Set();
    const abas = (meta.abas || []).filter(Boolean);
    abas.forEach((a) => { a.nomeFinal = nomeAba(a.nome, usados); });
    const temResumo = abas.some((a) => a.resumo);
    if (!temResumo && abas[0]) abas[0].ativa = true;
    const tabelas = abas.filter((a) => !a.resumo);
    const feitas = abas.map((a) => (a.resumo ? abaResumo(a, E, meta, tabelas) : abaTabela(a, E, meta)));
    const nomes = [];
    feitas.forEach((f, i) => {
      if (f.filtro) nomes.push(`<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">${xml(refAba(abas[i].nomeFinal))}!${f.filtro}</definedName>`);
      if (f.titulos) nomes.push(`<definedName name="_xlnm.Print_Titles" localSheetId="${i}">${xml(refAba(abas[i].nomeFinal))}!${f.titulos}</definedName>`);
    });
    const agoraISO = new Date().toISOString().replace(/\.\d+Z$/, "Z");
    const arquivos = [
      ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${abas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`],
      ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`],
      ["docProps/core.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xml(EMPRESA + " · " + meta.titulo)}</dc:title><dc:subject>${xml(meta.subtitulo || "")}</dc:subject><dc:creator>${xml(meta.autor || EMPRESA)}</dc:creator><cp:lastModifiedBy>${xml(meta.autor || EMPRESA)}</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${agoraISO}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${agoraISO}</dcterms:modified></cp:coreProperties>`],
      ["docProps/app.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Microsoft Excel</Application><Company>${xml(EMPRESA)}</Company></Properties>`],
      ["xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><workbookPr date1904="0"/><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="28800" windowHeight="15000" activeTab="0"/></bookViews><sheets>${abas.map((a, i) => `<sheet name="${xml(a.nomeFinal)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>${nomes.length ? `<definedNames>${nomes.join("")}</definedNames>` : ""}<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`],
      ["xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${abas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${abas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ];
    feitas.forEach((f, i) => arquivos.push([`xl/worksheets/sheet${i + 1}.xml`, f.sheet]));
    arquivos.push(["xl/styles.xml", E.xml()]);   // por último: as abas registram os estilos que usam
    return zip(arquivos);
  }

  function baixarBlob(blob, nome) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nome;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  function baixar(nome, meta) {
    const arq = /\.xlsx$/i.test(nome) ? nome : nome + ".xlsx";
    baixarBlob(gerar(meta), arq);
    return arq;
  }

  /* ---------------- tabela genérica (cópia de segurança) ---------------- */
  const SIGLAS = new Set(["id", "uf", "cep", "cpf", "cnpj", "nf", "ie", "sku", "url", "rg", "nfe", "ncm", "cfop"]);
  const ACENTOS = { numero: "número", codigo: "código", preco: "preço", precos: "preços", descricao: "descrição", observacoes: "observações", observacao: "observação", obs: "observação",
    razao: "razão", situacao: "situação", inscricao: "inscrição", endereco: "endereço", minimo: "mínimo", minimos: "mínimos", ultimo: "último", ultima: "última", promocao: "promoção",
    configuracoes: "configurações", solicitacoes: "solicitações", responsavel: "responsável", conteudo: "conteúdo", titulo: "título", video: "vídeo", orcamento: "orçamento",
    disponivel: "disponível", pais: "país", saida: "saída", movimentacao: "movimentação", referencia: "referência", nivel: "nível", funcao: "função", papel: "papel", categoria: "categoria",
    aplicacao: "aplicação", aplicacoes: "aplicações", informacoes: "informações", instalacao: "instalação", emissao: "emissão", logradouro: "logradouro", tamanho: "tamanho" };
  const humano = (k) => String(k).split(/[_\s.]+/).filter(Boolean).map((p, i) => {
    let b = p.toLowerCase();
    if (SIGLAS.has(b)) return b.toUpperCase();
    b = ACENTOS[b] || b;
    return i ? b : b.charAt(0).toUpperCase() + b.slice(1);
  }).join(" ");
  const ISO_DATA = /^\d{4}-\d{2}-\d{2}$/, ISO_DH = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;
  const texto = (v) => (v == null ? "" : typeof v === "object" ? JSON.stringify(v) : v);

  /** Transforma uma lista de objetos (linhas do banco) em aba: colunas legíveis e tipos certos.
   *  Listas de objetos dentro de uma coluna (ex.: itens do pedido) viram uma aba separada. */
  function abasDeRegistros(nome, registros, opcoes = {}) {
    const ordem = [], vistos = new Set(), filhos = {};
    registros.forEach((r) => Object.keys(r || {}).forEach((k) => { if (!vistos.has(k)) { vistos.add(k); ordem.push(k); } }));
    const colunas = [];
    ordem.forEach((k) => {
      const vals = registros.map((r) => r && r[k]).filter((v) => v != null && v !== "");
      if (vals.length && vals.every((v) => Array.isArray(v)) && vals.some((v) => v.length && v.every((x) => x && typeof x === "object" && !Array.isArray(x)))) { filhos[k] = true; return; }
      if (vals.length && vals.every((v) => v && typeof v === "object" && !Array.isArray(v))) {
        const sub = []; vals.forEach((v) => Object.keys(v).forEach((s) => { if (!sub.includes(s)) sub.push(s); }));
        if (sub.length <= 30) { sub.forEach((s) => colunas.push({ k, s, t: humano(k) + " · " + humano(s) })); return; }
      }
      colunas.push({ k, t: humano(k) });
    });
    colunas.forEach((c) => {
      const vals = registros.map((r) => { const v = r && r[c.k]; return c.s ? v && v[c.s] : v; }).filter((v) => v != null && v !== "");
      const nomeCol = (c.s || c.k).toLowerCase();
      if (!vals.length) c.tipo = "texto";
      else if (vals.every((v) => typeof v === "number")) c.tipo = /preco|preço|valor|total(?!_kg)|promo|custo|subtotal/.test(nomeCol) ? "brl" : /(^|_)kg|peso/.test(nomeCol) ? "kg" : vals.every((v) => Number.isInteger(v)) ? (/(^|_)(id|numero|codigo|cep|telefone)(_|$)/.test(nomeCol) ? "texto" : "int") : "dec";
      else if (vals.every((v) => typeof v === "string" && ISO_DATA.test(v))) c.tipo = "data";
      else if (vals.every((v) => typeof v === "string" && (ISO_DH.test(v) || ISO_DATA.test(v)))) c.tipo = "datahora";
      else if (vals.every((v) => typeof v === "boolean")) c.tipo = "status";
      else c.tipo = "texto";
      if (/^status$|situa/.test(nomeCol)) c.tipo = "status";
      if (vals.some((v) => typeof v === "string" && v.length > 60) || vals.some((v) => typeof v === "object")) c.quebra = true;
    });
    const linhas = registros.map((r) => colunas.map((c) => {
      let v = r && r[c.k]; if (c.s) v = v && v[c.s];
      if (typeof v === "boolean") return v ? "Sim" : "Não";
      if (c.tipo === "status" && v != null) return String(v).charAt(0).toUpperCase() + String(v).slice(1);
      if (c.tipo === "data" || c.tipo === "datahora") return v || null;
      return texto(v);
    }));
    const principal = { nome: opcoes.titulo || humano(nome), titulo: opcoes.titulo || humano(nome), descricao: opcoes.descricao, colunas: colunas.map((c) => ({ t: c.t, tipo: c.tipo, quebra: c.quebra })), linhas };
    const extras = Object.keys(filhos).map((k) => {
      const chave = ordem.find((x) => /^(numero|codigo|id)$/.test(x)) || ordem[0];
      const sub = [];
      registros.forEach((r) => ((r && r[k]) || []).forEach((x) => sub.push(Object.assign({ [chave + "_origem"]: r[chave] }, x))));
      return abasDeRegistros(nome + "_" + k, sub, { titulo: `${opcoes.titulo || humano(nome)} · ${humano(k)}` })[0];
    });
    return [principal, ...extras];
  }

  window.Planilha = { baixar, gerar, baixarBlob, abasDeRegistros, humano, zip };
})();
