/* =========================================================
   Policoating — Central IA (ia.html)
   Várias ferramentas de IA para a equipe, rodando no motor da web
   (função supabase/functions/motor-ia). Conversas ficam salvas no banco
   (tabela ia_conversas) e o consumo do mês aparece no topo.
   ========================================================= */
(function () {
  "use strict";

  const CFG = window.SITE_CONFIG || {};
  const SB = CFG.supabase || {};
  const ENDPOINT = (CFG.centralIA && CFG.centralIA.endpoint) || (SB.url ? SB.url.replace(/\/$/, "") + "/functions/v1/motor-ia" : "");
  const $ = (s, c = document) => c.querySelector(s);
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icone = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;

  /* ---------- Ferramentas (as instruções de cada uma ficam no motor: supabase/functions/motor-ia) ---------- */
  const IMG = "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif";
  const DOCS = "application/pdf,.txt,.csv,.md,.json,.xlsx,.xls";
  const FERRAMENTAS = [
    { id: "geral", nome: "Assistente geral", desc: "Pergunte qualquer coisa: dados da empresa, catálogo ou pesquisa na web.",
      icone: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
      aceita: IMG + "," + DOCS,
      exemplos: ["Como foram as vendas deste mês comparadas ao mês passado?", "Quais clientes de SP compraram poliéster preto?", "O que diz a norma sobre espessura de camada em pintura a pó?"] },
    { id: "vendas", nome: "Analista de vendas", desc: "Faturamento, kg, produtos campeões, regiões e clientes — com os números reais.",
      icone: '<path d="M4 20h16"/><path d="M7 16v-5M12 16V6M17 16v-8"/>', aceita: "",
      exemplos: ["Resumo das vendas dos últimos 30 dias por semana", "Top 10 cores mais vendidas no ano em kg", "Quais clientes não compram há mais de 90 dias?", "Faturamento por estado neste trimestre"] },
    { id: "pesquisa", nome: "Pesquisa na web", desc: "Normas, concorrentes, preços de mercado, fornecedores e tendências, com fontes.",
      icone: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/><path d="M4 11h14M11 4c2 2 3 4.5 3 7s-1 5-3 7c-2-2-3-4.5-3-7s1-5 3-7"/>', aceita: "",
      exemplos: ["Principais fabricantes de tinta em pó no Brasil e seus diferenciais", "Normas ABNT para ensaio de aderência em pintura a pó", "Tendências de cores para fachadas em 2027"] },
    { id: "conteudo", nome: "Marketing e conteúdo", desc: "Posts, mensagens de WhatsApp, e-mails de campanha e descrições de produto.",
      icone: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="m14 6 3 3"/>', aceita: IMG,
      exemplos: ["Post para Instagram sobre o poliéster fosco preto para portões", "Mensagem de WhatsApp para reativar clientes que não compram há 3 meses", "Descrição de produto para o epóxi branco"] },
    { id: "proposta", nome: "Proposta comercial", desc: "Orçamentos prontos com produtos, preços do catálogo e condições.",
      icone: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>', aceita: IMG + ",application/pdf",
      exemplos: ["Proposta de 200 kg de poliéster branco fosco para a Metalúrgica Silva", "Orçamento para pintar 350 m² de grades em preto texturizado"] },
    { id: "documentos", nome: "Leitor de documentos", desc: "Notas fiscais, fichas técnicas, laudos e pedidos: extrai e confere os dados.",
      icone: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><circle cx="11" cy="15" r="2.5"/><path d="m13 17 2 2"/>', aceita: IMG + "," + DOCS, anexoObrigatorio: true,
      exemplos: ["Extraia os itens e valores desta nota fiscal", "Compare esta ficha técnica com o nosso produto equivalente", "O que este laudo diz sobre a aderência?"] },
    { id: "cores", nome: "Identificar cor por foto", desc: "Mande a foto de uma peça ou amostra: a IA indica o RAL e o nosso produto.",
      icone: '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.2 0-1.1.9-2 2-2h2.4A4.6 4.6 0 0 0 22 10c0-3.9-4.5-7-10-7"/><circle cx="7.5" cy="11.5" r="1"/><circle cx="10.5" cy="7.5" r="1"/><circle cx="15.5" cy="7.5" r="1"/>', aceita: IMG, anexoObrigatorio: true,
      exemplos: ["Qual é esta cor? Temos algo parecido?", "Que acabamento é este e qual pó usar?"] },
    { id: "planilhas", nome: "Planilhas e ATLAS", desc: "Envie planilhas (inclusive o backup do ATLAS CONTROL/DAILY): a IA calcula com Python e faz gráficos.",
      icone: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16M15 4v16"/>', aceita: ".xlsx,.xls,.csv", anexoObrigatorio: true,
      exemplos: ["Quais transportadoras mais atrasaram nos últimos 3 meses?", "Resumo das devoluções por motivo, com gráfico", "Compare as falhas deste mês com o mês passado"] },
  ];
  const porId = Object.fromEntries(FERRAMENTAS.map((f) => [f.id, f]));

  /* ---------- Estado ---------- */
  let sb = null, eu = null, papel = "";
  let ferramenta = porId.geral;
  let conversa = novaConversa();
  let anexos = [];            // anexos esperando o envio
  let historico = [];          // conversas salvas (lista lateral)
  let respondendo = null;      // AbortController da resposta em andamento
  let bancoOk = true;          // false quando a PARTE Q ainda não foi rodada

  function novaConversa(id) { return { id: null, ferramenta: id || (ferramenta && ferramenta.id) || "geral", titulo: "", mensagens: [] }; }

  /* ---------- Utilidades de tela ---------- */
  function toast(msg) {
    const t = $("#ia-toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 3500);
  }
  function mostrar(id) { ["ia-carregando", "ia-entrar", "ia-negado", "ia-2fa", "ia-app"].forEach((x) => ($("#" + x).hidden = x !== id)); }
  function aviso(html) { const a = $("#ia-aviso"); a.innerHTML = html || ""; a.hidden = !html; }
  const usd = (v) => "US$ " + (+v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const quando = (iso) => {
    const d = new Date(iso), hoje = new Date();
    if (d.toDateString() === hoje.toDateString()) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  /* ---------- Markdown simples e seguro (o texto é escapado antes) ---------- */
  function inline(t) {
    return t
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[\s(])\*([^*\s][^*]*)\*(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>")
      .replace(/(^|[\s(])_([^_\s][^_]*)_(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');
  }
  function markdown(src) {
    const linhas = esc(src).split("\n"), out = [];
    let i = 0;
    const celulas = (l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
    while (i < linhas.length) {
      const l = linhas[i];
      if (/^```/.test(l)) {
        const bloco = []; i++;
        while (i < linhas.length && !/^```/.test(linhas[i])) bloco.push(linhas[i++]);
        i++; out.push(`<pre><code>${bloco.join("\n")}</code></pre>`); continue;
      }
      let m;
      if ((m = l.match(/^(#{1,4})\s+(.*)$/))) { const n = Math.min(4, m[1].length + 1); out.push(`<h${n}>${inline(m[2])}</h${n}>`); i++; continue; }
      if (/^\s*(-{3,}|\*{3,})\s*$/.test(l)) { out.push("<hr>"); i++; continue; }
      if (/^\s*\|.*\|\s*$/.test(l) && i + 1 < linhas.length && /^\s*\|?\s*:?-{2,}/.test(linhas[i + 1])) {
        const cab = celulas(l); i += 2; const corpo = [];
        while (i < linhas.length && /^\s*\|.*\|\s*$/.test(linhas[i])) corpo.push(celulas(linhas[i++]));
        // coluna em que todos os valores são números fica alinhada à direita (inclusive o título)
        const ehNum = (c) => /^(R\$\s?|US\$\s?)?[-+]?[\d.,]+\s?(%|kg|m²|dias?)?$/.test(c || "");
        const numCol = cab.map((_, j) => corpo.length > 0 && corpo.every((r) => !r[j] || ehNum(r[j])) && corpo.some((r) => ehNum(r[j])));
        const cl = (j) => (numCol[j] ? ' class="num"' : "");
        out.push(`<div class="ia-tabela"><table><thead><tr>${cab.map((c, j) => `<th${cl(j)}>${inline(c)}</th>`).join("")}</tr></thead><tbody>${corpo.map((r) => `<tr>${r.map((c, j) => `<td${cl(j)}>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
        continue;
      }
      if (/^\s*([-*•]|\d+[.)])\s+/.test(l)) {
        const ordenada = /^\s*\d/.test(l), itens = [];
        while (i < linhas.length && /^\s*([-*•]|\d+[.)])\s+/.test(linhas[i])) itens.push(linhas[i++].replace(/^\s*([-*•]|\d+[.)])\s+/, ""));
        out.push(`<${ordenada ? "ol" : "ul"}>${itens.map((t) => `<li>${inline(t)}</li>`).join("")}</${ordenada ? "ol" : "ul"}>`); continue;
      }
      if (/^&gt;\s?/.test(l)) {
        const q = []; while (i < linhas.length && /^&gt;\s?/.test(linhas[i])) q.push(linhas[i++].replace(/^&gt;\s?/, ""));
        out.push(`<blockquote>${inline(q.join("<br>"))}</blockquote>`); continue;
      }
      if (!l.trim()) { i++; continue; }
      const par = [];
      while (i < linhas.length && linhas[i].trim() && !/^(```|#{1,4}\s|\s*([-*•]|\d+[.)])\s+|\s*\|.*\|\s*$|&gt;)/.test(linhas[i])) par.push(linhas[i++]);
      if (!par.length) { out.push(`<p>${inline(l)}</p>`); i++; continue; }
      out.push(`<p>${inline(par.join("<br>"))}</p>`);
    }
    return out.join("");
  }

  /* ---------- Lateral ---------- */
  function desenharFerramentas() {
    $("#ia-ferramentas").innerHTML = FERRAMENTAS.map((f) => `
      <button type="button" class="ia-ferramenta${f.id === ferramenta.id ? " ativa" : ""}" data-f="${f.id}" title="${esc(f.desc)}">
        ${icone(f.icone)}<span>${esc(f.nome)}</span>
      </button>`).join("");
  }
  function desenharHistorico() {
    const termo = $("#ia-busca").value.trim().toLowerCase();
    $("#ia-busca-limpar").hidden = !termo;
    const lista = historico.filter((c) => !termo || (c.titulo + " " + (c.trecho || "")).toLowerCase().includes(termo));
    $("#ia-historico").innerHTML = lista.length ? lista.map((c) => `
      <li class="${c.id === conversa.id ? "ativa" : ""}">
        <button type="button" class="ia-hist-abrir" data-abrir="${c.id}">
          <span class="ia-hist-icone">${icone((porId[c.ferramenta] || porId.geral).icone)}</span>
          <span class="ia-hist-texto"><b>${c.fixada ? "★ " : ""}${esc(c.titulo)}</b><small>${esc((porId[c.ferramenta] || porId.geral).nome)} · ${quando(c.atualizado_em)}</small></span>
        </button>
        <span class="ia-hist-acoes">
          <button type="button" data-fixar="${c.id}" title="${c.fixada ? "Desafixar" : "Fixar no topo"}" aria-label="Fixar">${icone('<path d="M12 17v5M9 3h6l-1 6 4 4H6l4-4z"/>')}</button>
          <button type="button" data-apagar="${c.id}" title="Apagar conversa" aria-label="Apagar">${icone('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>')}</button>
        </span>
      </li>`).join("") : `<li class="ia-vazio">${termo ? "Nada encontrado." : bancoOk ? "Suas conversas aparecem aqui." : "Para salvar conversas, rode a PARTE Q do setup.sql."}</li>`;
  }
  async function carregarHistorico() {
    const { data, error } = await sb.from("ia_conversas").select("id, ferramenta, titulo, fixada, atualizado_em")
      .order("fixada", { ascending: false }).order("atualizado_em", { ascending: false }).limit(200);
    if (error) { bancoOk = false; historico = []; } else { bancoOk = true; historico = data || []; }
    desenharHistorico();
  }
  function fecharMenu() { document.body.classList.remove("ia-menu-aberto"); $("#ia-veu").hidden = true; $("#ia-abrir-menu").setAttribute("aria-expanded", "false"); }

  function escolherFerramenta(id, manterConversa) {
    ferramenta = porId[id] || porId.geral;
    if (!manterConversa) { conversa = novaConversa(ferramenta.id); anexos = []; desenharAnexos(); }
    $("#ia-arquivo").accept = ferramenta.aceita || "";
    $("#ia-anexar").hidden = !ferramenta.aceita;
    $("#ia-texto").placeholder = ferramenta.anexoObrigatorio ? "Anexe o arquivo e escreva o que quer saber..." : `Pergunte ao ${ferramenta.nome.toLowerCase()}...`;
    desenharFerramentas(); desenharConversa(); desenharHistorico(); fecharMenu();
    $("#ia-texto").focus();
  }

  /* ---------- Conversa ---------- */
  function htmlAnexo(a) {
    if (a.tipo === "imagem" && a.dados) return `<img class="ia-miniatura" src="data:${esc(a.media)};base64,${a.dados}" alt="${esc(a.nome)}">`;
    const rot = a.tipo === "pdf" ? "PDF" : a.tipo === "planilha" ? "Planilha" : a.tipo === "imagem" ? "Foto" : "Texto";
    return `<span class="ia-chip">${icone('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>')}${rot}: ${esc(a.nome)}</span>`;
  }
  function htmlMensagem(m, i) {
    if (m.papel === "usuario") {
      return `<div class="ia-msg ia-msg-usuario"><div class="ia-balao">
        ${m.anexos && m.anexos.length ? `<div class="ia-msg-anexos">${m.anexos.map(htmlAnexo).join("")}</div>` : ""}
        ${m.texto ? `<p>${esc(m.texto).replace(/\n/g, "<br>")}</p>` : ""}</div></div>`;
    }
    const imagens = (m.imagens || []).map((im) => /^image\//.test(im.media)
      ? `<figure><img src="data:${esc(im.media)};base64,${im.dados}" alt="${esc(im.nome)}"><figcaption><a download="${esc(im.nome)}" href="data:${esc(im.media)};base64,${im.dados}">Baixar ${esc(im.nome)}</a></figcaption></figure>`
      : `<a class="ia-chip" download="${esc(im.nome)}" href="data:${esc(im.media)};base64,${im.dados}">${icone('<path d="M12 4v12M6 10l6 6 6-6M4 20h16"/>')}Baixar ${esc(im.nome)}</a>`).join("");
    const fontes = m.fontes && m.fontes.length ? `<details class="ia-fontes"><summary>${m.fontes.length} fonte${m.fontes.length > 1 ? "s" : ""} pesquisada${m.fontes.length > 1 ? "s" : ""}</summary><ol>${m.fontes.map((f) => `<li><a href="${esc(f.url)}" target="_blank" rel="noopener noreferrer">${esc(f.titulo)}</a></li>`).join("")}</ol></details>` : "";
    const rodape = m.texto && !m.carregando ? `<div class="ia-msg-acoes">
        <button type="button" data-copiar="${i}">${icone('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>')}Copiar</button>
        <button type="button" data-imprimir="${i}">${icone('<path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><path d="M7 14h10v7H7z"/>')}Imprimir / PDF</button>
        <button type="button" data-whats="${i}">${icone('<path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/>')}WhatsApp</button>
        ${m.uso ? `<small title="Tokens: ${m.uso.entrada || 0} lidos, ${m.uso.saida || 0} escritos">${usd(m.uso.custo_usd)} · ${m.uso.segundos || 0}s</small>` : ""}
      </div>` : "";
    return `<div class="ia-msg ia-msg-ia">
      <span class="ia-avatar">${icone(porId.geral.icone)}</span>
      <div class="ia-resposta">
        ${m.etapa && m.carregando ? `<p class="ia-etapa"><span class="ia-girando"></span>${esc(m.etapa)}...</p>` : ""}
        <div class="ia-md">${markdown(m.texto || "")}${m.carregando && m.texto ? '<span class="ia-cursor"></span>' : ""}</div>
        ${m.erro ? `<p class="ia-erro">${esc(m.erro)}</p>` : ""}
        ${imagens ? `<div class="ia-gerados">${imagens}</div>` : ""}
        ${fontes}${rodape}
      </div></div>`;
  }
  function desenharConversa(rolar = true) {
    const c = $("#ia-conversa");
    if (!conversa.mensagens.length) {
      const f = porId[conversa.ferramenta] || ferramenta;
      c.innerHTML = `<div class="ia-boasvindas">
        <span class="ia-boasvindas-icone">${icone(f.icone)}</span>
        <h1>${esc(f.nome)}</h1>
        <p>${esc(f.desc)}</p>
        <div class="ia-exemplos">${f.exemplos.map((e) => `<button type="button" data-exemplo="${esc(e)}">${esc(e)}</button>`).join("")}</div>
      </div>`;
      return;
    }
    c.innerHTML = conversa.mensagens.map(htmlMensagem).join("");
    if (rolar) c.scrollTop = c.scrollHeight;
  }
  /** Atualiza só a última resposta (enquanto a IA escreve), sem redesenhar a conversa toda */
  let quadroPendente = 0;
  function atualizarUltima() {
    if (quadroPendente) return;
    quadroPendente = requestAnimationFrame(() => {
      quadroPendente = 0;
      const c = $("#ia-conversa"), i = conversa.mensagens.length - 1, ult = c.lastElementChild;
      const pertoDoFim = c.scrollHeight - c.scrollTop - c.clientHeight < 120;
      if (!ult || !ult.classList.contains("ia-msg-ia")) return desenharConversa();
      ult.outerHTML = htmlMensagem(conversa.mensagens[i], i);
      if (pertoDoFim) c.scrollTop = c.scrollHeight;
    });
  }

  /* ---------- Anexos ---------- */
  const lerBase64 = (arq) => new Promise((ok, falha) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1] || "");
    r.onerror = () => falha(new Error("Não foi possível ler " + arq.name));
    r.readAsDataURL(arq);
  });
  /** Foto: reduz para no máximo 1600 px (mais rápido e mais barato) e converte para JPEG */
  function prepararImagem(arq) {
    return new Promise((ok, falha) => {
      const url = URL.createObjectURL(arq), img = new Image();
      img.onload = () => {
        const escala = Math.min(1, 1600 / Math.max(img.width, img.height));
        const cv = document.createElement("canvas");
        cv.width = Math.round(img.width * escala); cv.height = Math.round(img.height * escala);
        const ctx = cv.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url);
        ok({ tipo: "imagem", nome: arq.name, media: "image/jpeg", dados: cv.toDataURL("image/jpeg", 0.86).split(",")[1] });
      };
      img.onerror = () => { URL.revokeObjectURL(url); falha(new Error(`Não foi possível abrir a foto ${arq.name}. Use JPG ou PNG.`)); };
      img.src = url;
    });
  }
  let xlsxPromise = null;
  function carregarXlsx() {
    if (!xlsxPromise) xlsxPromise = new Promise((ok, falha) => {
      if (window.XLSX) return ok(window.XLSX);
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      s.onload = () => ok(window.XLSX); s.onerror = () => { xlsxPromise = null; falha(new Error("Não foi possível carregar o leitor de planilhas.")); };
      document.head.appendChild(s);
    });
    return xlsxPromise;
  }
  /** Fora da ferramenta Planilhas, a planilha vira texto (CSV de cada aba) para a IA ler */
  async function planilhaComoTexto(arq) {
    const X = await carregarXlsx();
    const wb = X.read(await arq.arrayBuffer(), { type: "array" });
    let texto = "";
    for (const nome of wb.SheetNames) {
      const csv = X.utils.sheet_to_csv(wb.Sheets[nome], { blankrows: false });
      texto += `### Aba: ${nome}\n${csv}\n\n`;
      if (texto.length > 350000) { texto = texto.slice(0, 350000) + "\n(planilha cortada: grande demais; use a ferramenta Planilhas e ATLAS para ler tudo)"; break; }
    }
    return texto;
  }
  async function adicionarArquivos(lista) {
    for (const arq of Array.from(lista || [])) {
      if (anexos.length >= 8) { toast("No máximo 8 anexos por mensagem."); break; }
      const nome = arq.name || "arquivo", ext = (nome.split(".").pop() || "").toLowerCase();
      try {
        if (/^image\//.test(arq.type) || ["heic", "heif"].includes(ext)) anexos.push(await prepararImagem(arq));
        else if (arq.type === "application/pdf" || ext === "pdf") {
          if (arq.size > 15 * 1024 * 1024) throw new Error(`${nome} tem mais de 15 MB.`);
          anexos.push({ tipo: "pdf", nome, media: "application/pdf", dados: await lerBase64(arq) });
        } else if (["xlsx", "xls", "csv"].includes(ext)) {
          if (arq.size > 15 * 1024 * 1024) throw new Error(`${nome} tem mais de 15 MB.`);
          if (ferramenta.id === "planilhas") anexos.push({ tipo: "planilha", nome, dados: await lerBase64(arq) });
          else anexos.push({ tipo: "texto", nome, dados: ext === "csv" ? (await arq.text()).slice(0, 400000) : await planilhaComoTexto(arq) });
        } else if (["txt", "md", "json"].includes(ext) || /^text\//.test(arq.type)) {
          anexos.push({ tipo: "texto", nome, dados: (await arq.text()).slice(0, 400000) });
        } else throw new Error(`${nome}: formato não aceito. Use foto, PDF, planilha ou texto.`);
      } catch (e) { toast(e.message); }
    }
    desenharAnexos();
  }
  function desenharAnexos() {
    $("#ia-anexos").innerHTML = anexos.map((a, i) => `<span class="ia-anexo">${htmlAnexo(a)}<button type="button" data-tirar="${i}" aria-label="Tirar anexo">×</button></span>`).join("");
  }

  /* ---------- Enviar e receber (resposta aos pouquinhos) ---------- */
  async function enviar(texto) {
    texto = String(texto || "").trim();
    if (respondendo) return;
    if (!texto && !anexos.length) return;
    if (ferramenta.anexoObrigatorio && !anexos.length && !conversa.mensagens.some((m) => m.anexos && m.anexos.length)) {
      toast(ferramenta.id === "cores" ? "Anexe a foto da peça ou amostra." : "Anexe o arquivo para a análise."); return;
    }
    if (!ENDPOINT) { aviso("A Central IA precisa do Supabase configurado em <code>assets/js/config.js</code>."); return; }

    conversa.ferramenta = ferramenta.id;
    conversa.mensagens.push({ papel: "usuario", texto, anexos: anexos.slice() });
    const resposta = { papel: "ia", texto: "", carregando: true, etapa: "Pensando" };
    conversa.mensagens.push(resposta);
    anexos = []; desenharAnexos();
    $("#ia-texto").value = ""; ajustarAltura();
    desenharConversa();
    respondendo = new AbortController();
    $("#ia-enviar").hidden = true; $("#ia-parar").hidden = false;

    try {
      const { data } = await sb.auth.getSession();
      const token = data.session && data.session.access_token;
      if (!token) throw new Error("Sua sessão terminou. Entre de novo.");
      const r = await fetch(ENDPOINT, {
        method: "POST", signal: respondendo.signal,
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, apikey: SB.anonKey },
        body: JSON.stringify({ ferramenta: ferramenta.id, mensagens: conversa.mensagens.slice(0, -1).map(paraMotor) }),
      });
      if (!r.ok || !r.body) {
        let msg = `O motor de IA não respondeu (${r.status}).`;
        try { const j = await r.json(); if (j.erro) msg = j.erro; } catch (e) { /* sem corpo */ }
        if (r.status === 404) msg = "O motor de IA ainda não foi publicado no Supabase (função motor-ia). Veja o README, seção Central IA.";
        throw new Error(msg);
      }
      const leitor = r.body.getReader(), dec = new TextDecoder();
      let resto = "";
      for (;;) {
        const { value, done } = await leitor.read();
        if (done) break;
        resto += dec.decode(value, { stream: true });
        const partes = resto.split("\n"); resto = partes.pop();
        for (const linha of partes) if (linha.trim()) tratarEvento(JSON.parse(linha), resposta);
      }
      if (resto.trim()) tratarEvento(JSON.parse(resto), resposta);
    } catch (e) {
      if (e.name === "AbortError") resposta.texto += resposta.texto ? "\n\n_(Resposta interrompida.)_" : "_(Resposta interrompida.)_";
      else resposta.erro = e.message || "Falha de conexão com o motor de IA.";
    }
    resposta.carregando = false; resposta.etapa = "";
    respondendo = null;
    $("#ia-enviar").hidden = false; $("#ia-parar").hidden = true;
    desenharConversa(false); $("#ia-conversa").scrollTop = $("#ia-conversa").scrollHeight;
    if (resposta.uso) somarConsumo(resposta.uso.custo_usd);
    salvar();
  }
  function tratarEvento(ev, resposta) {
    if (ev.t === "texto") { resposta.texto += ev.d; resposta.etapa = ""; }
    else if (ev.t === "etapa") resposta.etapa = ev.d;
    else if (ev.t === "fontes") resposta.fontes = ev.lista;
    else if (ev.t === "imagem") (resposta.imagens = resposta.imagens || []).push({ nome: ev.nome, media: ev.media, dados: ev.dados });
    else if (ev.t === "arquivo") {
      // a planilha já está no motor: nas próximas perguntas vai só o id
      conversa.mensagens.forEach((m) => (m.anexos || []).forEach((a) => { if (a.tipo === "planilha" && a.nome === ev.nome && !a.file_id) { a.file_id = ev.file_id; delete a.dados; } }));
    }
    else if (ev.t === "erro") resposta.erro = ev.d;
    else if (ev.t === "fim") resposta.uso = ev.uso;
    atualizarUltima();
  }
  /** O que vai para o motor: texto e anexos (planilhas já enviadas vão só com o id) */
  function paraMotor(m) {
    return { papel: m.papel, texto: m.texto || "", anexos: (m.anexos || []).filter((a) => a.dados || a.file_id).map((a) => ({ tipo: a.tipo, nome: a.nome, media: a.media, dados: a.dados, file_id: a.file_id })) };
  }

  /* ---------- Salvar conversa no banco ---------- */
  function paraSalvar(m) {
    const o = { papel: m.papel, texto: m.texto || "" };
    if (m.anexos && m.anexos.length) o.anexos = m.anexos.map((a) => ({ tipo: a.tipo, nome: a.nome, file_id: a.file_id }));
    if (m.fontes) o.fontes = m.fontes;
    if (m.uso) o.uso = { custo_usd: m.uso.custo_usd, segundos: m.uso.segundos, entrada: m.uso.entrada, saida: m.uso.saida };
    if (m.imagens && m.imagens.length) o.texto += `\n\n_(${m.imagens.length} arquivo(s) gerado(s) nesta resposta: baixe na hora, eles não ficam salvos.)_`;
    if (m.erro) o.erro = m.erro;
    return o;
  }
  async function salvar() {
    if (!bancoOk || !conversa.mensagens.length) return;
    const primeira = conversa.mensagens.find((m) => m.papel === "usuario");
    if (!conversa.titulo) conversa.titulo = (primeira && (primeira.texto || (primeira.anexos[0] || {}).nome) || "Conversa").replace(/\s+/g, " ").slice(0, 80);
    const registro = { ferramenta: conversa.ferramenta, titulo: conversa.titulo, mensagens: conversa.mensagens.map(paraSalvar) };
    const req = conversa.id ? sb.from("ia_conversas").update(registro).eq("id", conversa.id).select("id").single()
      : sb.from("ia_conversas").insert(registro).select("id").single();
    const { data, error } = await req;
    if (error) { if (/ia_conversas|relation|schema cache/i.test(error.message)) bancoOk = false; else toast("Não foi possível salvar a conversa: " + error.message); return; }
    conversa.id = data.id;
    await carregarHistorico();
  }
  async function abrirConversa(id) {
    const { data, error } = await sb.from("ia_conversas").select("*").eq("id", id).single();
    if (error) { toast("Não foi possível abrir a conversa."); return; }
    ferramenta = porId[data.ferramenta] || porId.geral;
    conversa = { id: data.id, ferramenta: ferramenta.id, titulo: data.titulo, mensagens: data.mensagens || [] };
    anexos = []; desenharAnexos();
    escolherFerramenta(ferramenta.id, true);
  }

  /* ---------- Consumo do mês ---------- */
  let gastoMes = 0;
  function somarConsumo(v) { gastoMes += +v || 0; mostrarConsumo(); }
  function mostrarConsumo() { const b = $("#ia-consumo"); b.hidden = false; b.innerHTML = esc(usd(gastoMes)) + "<span> no mês</span>"; }
  async function carregarConsumo() {
    const agora = new Date(), inicio = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();
    const { data, error } = await sb.from("ia_uso").select("criado_em, email, origem, ferramenta, custo_usd, erro").gte("criado_em", inicio).order("criado_em", { ascending: false }).limit(20000);
    if (error) return null;
    gastoMes = (data || []).reduce((s, r) => s + (+r.custo_usd || 0), 0);
    mostrarConsumo();
    return data || [];
  }
  async function abrirConsumo() {
    const dados = await carregarConsumo();
    if (!dados) { toast("Rode a PARTE Q do setup.sql para ver o consumo."); return; }
    const agrupar = (chave) => Object.entries(dados.reduce((o, r) => { const k = chave(r); (o[k] = o[k] || { n: 0, v: 0 }); o[k].n++; o[k].v += +r.custo_usd || 0; return o; }, {})).sort((a, b) => b[1].v - a[1].v);
    const tabela = (titulo, linhas) => `<h3>${titulo}</h3><div class="ia-tabela"><table><thead><tr><th></th><th class="num">Respostas</th><th class="num">Custo</th></tr></thead><tbody>${linhas.map(([k, x]) => `<tr><td>${esc(k)}</td><td class="num">${x.n}</td><td class="num">${usd(x.v)}</td></tr>`).join("") || '<tr><td colspan="3">Nenhum uso ainda.</td></tr>'}</tbody></table></div>`;
    $("#ia-consumo-detalhe").innerHTML = `<p class="ia-total">${usd(gastoMes)} <small>em ${dados.length} respostas${papel === "admin" ? " (toda a equipe e os programas ATLAS)" : " (só as suas)"}</small></p>
      ${tabela("Por ferramenta", agrupar((r) => r.origem === "atlas" ? "Programas ATLAS" : (porId[r.ferramenta] || { nome: r.ferramenta }).nome))}
      ${papel === "admin" ? tabela("Por pessoa", agrupar((r) => r.email)) : ""}
      <p class="ia-nota">Valores estimados pelo preço público do modelo, em dólar. O limite do mês é definido no Supabase (Secret IA_LIMITE_MES_USD).</p>`;
    $("#ia-dialogo-consumo").showModal();
  }

  /* ---------- Copiar, imprimir, WhatsApp ---------- */
  function imprimir(m) {
    const w = window.open("", "_blank");
    if (!w) { toast("Permita janelas pop-up para imprimir."); return; }
    w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(conversa.titulo || "Central IA")} — Policoating</title>
      <style>body{font:14px/1.6 Inter,Segoe UI,Arial,sans-serif;color:#1d2733;max-width:760px;margin:32px auto;padding:0 20px}
      header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #1558d6;padding-bottom:10px;margin-bottom:20px}
      header b{font:700 22px Barlow,Arial,sans-serif}header b span{color:#1558d6}header small{color:#5a6775}
      table{border-collapse:collapse;width:100%;margin:12px 0}th,td{border:1px solid #dfe5ec;padding:6px 8px;text-align:left}th{background:#f4f7fa}td.num{text-align:right}
      h2,h3,h4{font-family:Barlow,Arial,sans-serif;margin:18px 0 6px}pre{background:#f4f7fa;padding:10px;white-space:pre-wrap}img{max-width:100%}</style></head>
      <body><header><b>Poli<span>coating</span></b><small>${new Date().toLocaleDateString("pt-BR")}</small></header>${markdown(m.texto)}
      ${(m.imagens || []).filter((im) => /^image\//.test(im.media)).map((im) => `<img src="data:${im.media};base64,${im.dados}" alt="">`).join("")}</body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 400);
  }
  /** Texto do WhatsApp: tira a marcação do Markdown que o WhatsApp não entende */
  function paraWhats(t) {
    return t.replace(/^#{1,4}\s+(.*)$/gm, "*$1*").replace(/\*\*([^*]+)\*\*/g, "*$1*").replace(/^\s*[-•]\s+/gm, "• ")
      .replace(/^\|?\s*:?-{2,}.*$/gm, "").replace(/^\|(.*)\|$/gm, (l, c) => c.split("|").map((x) => x.trim()).join(" · "))
      .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, "$1 ($2)").replace(/\n{3,}/g, "\n\n").trim();
  }

  /* ---------- Caixa de texto ---------- */
  function ajustarAltura() { const t = $("#ia-texto"); t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 220) + "px"; }

  function ligarEventos() {
    $("#ia-ferramentas").addEventListener("click", (e) => { const b = e.target.closest("[data-f]"); if (b && !respondendo) escolherFerramenta(b.dataset.f); });
    $("#ia-nova").addEventListener("click", () => { if (!respondendo) escolherFerramenta(ferramenta.id); });
    $("#ia-busca").addEventListener("input", desenharHistorico);
    $("#ia-busca-limpar").addEventListener("click", () => { $("#ia-busca").value = ""; desenharHistorico(); });
    $("#ia-historico").addEventListener("click", async (e) => {
      const ab = e.target.closest("[data-abrir]"), fx = e.target.closest("[data-fixar]"), ap = e.target.closest("[data-apagar]");
      if (respondendo) return;
      if (ab) abrirConversa(ab.dataset.abrir);
      if (fx) {
        const c = historico.find((x) => x.id === fx.dataset.fixar);
        await sb.from("ia_conversas").update({ fixada: !c.fixada }).eq("id", c.id); carregarHistorico();
      }
      if (ap && confirm("Apagar esta conversa?")) {
        await sb.from("ia_conversas").delete().eq("id", ap.dataset.apagar);
        if (conversa.id === ap.dataset.apagar) { conversa = novaConversa(ferramenta.id); desenharConversa(); }
        carregarHistorico();
      }
    });
    $("#ia-conversa").addEventListener("click", (e) => {
      const ex = e.target.closest("[data-exemplo]"), cp = e.target.closest("[data-copiar]"), im = e.target.closest("[data-imprimir]"), wa = e.target.closest("[data-whats]");
      if (ex) {
        if (ferramenta.anexoObrigatorio && !anexos.length) { $("#ia-texto").value = ex.dataset.exemplo; ajustarAltura(); $("#ia-arquivo").click(); return; }
        enviar(ex.dataset.exemplo);
      }
      if (cp) { navigator.clipboard.writeText(conversa.mensagens[+cp.dataset.copiar].texto).then(() => toast("Resposta copiada."), () => toast("Não foi possível copiar.")); }
      if (im) imprimir(conversa.mensagens[+im.dataset.imprimir]);
      if (wa) window.open("https://wa.me/?text=" + encodeURIComponent(paraWhats(conversa.mensagens[+wa.dataset.whats].texto).slice(0, 3500)), "_blank", "noopener");
    });
    $("#ia-form").addEventListener("submit", (e) => { e.preventDefault(); enviar($("#ia-texto").value); });
    $("#ia-texto").addEventListener("input", ajustarAltura);
    $("#ia-texto").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); enviar($("#ia-texto").value); } });
    $("#ia-texto").addEventListener("paste", (e) => { const arqs = Array.from(e.clipboardData && e.clipboardData.files || []); if (arqs.length && ferramenta.aceita) { e.preventDefault(); adicionarArquivos(arqs); } });
    $("#ia-parar").addEventListener("click", () => respondendo && respondendo.abort());
    $("#ia-anexar").addEventListener("click", () => $("#ia-arquivo").click());
    $("#ia-arquivo").addEventListener("change", (e) => { adicionarArquivos(e.target.files); e.target.value = ""; });
    $("#ia-anexos").addEventListener("click", (e) => { const b = e.target.closest("[data-tirar]"); if (b) { anexos.splice(+b.dataset.tirar, 1); desenharAnexos(); } });
    const principal = $(".ia-principal");
    principal.addEventListener("dragover", (e) => { if (ferramenta.aceita) { e.preventDefault(); principal.classList.add("ia-soltando"); } });
    principal.addEventListener("dragleave", (e) => { if (!principal.contains(e.relatedTarget)) principal.classList.remove("ia-soltando"); });
    principal.addEventListener("drop", (e) => { e.preventDefault(); principal.classList.remove("ia-soltando"); if (ferramenta.aceita) adicionarArquivos(e.dataTransfer.files); });
    $("#ia-consumo").addEventListener("click", abrirConsumo);
    $("#ia-abrir-menu").addEventListener("click", () => { document.body.classList.add("ia-menu-aberto"); $("#ia-veu").hidden = false; $("#ia-abrir-menu").setAttribute("aria-expanded", "true"); });
    $("#ia-veu").addEventListener("click", fecharMenu);
    window.addEventListener("beforeunload", (e) => { if (respondendo) { e.preventDefault(); e.returnValue = ""; } });
  }

  /* ---------- Início: só para a equipe, com 2 etapas ---------- */
  document.addEventListener("DOMContentLoaded", async () => {
    await window.ContaPronta;
    if (!window.Conta || window.Conta.modoDemo) {
      mostrar("ia-entrar");
      $("#ia-entrar").querySelector("p").textContent = "A Central IA precisa do Supabase configurado (assets/js/config.js).";
      return;
    }
    eu = window.Conta.usuario;
    if (!eu) return mostrar("ia-entrar");
    $("#ia-usuario").textContent = eu.email;
    sb = await window.Conta.cliente();
    const r = await sb.rpc("meu_papel");
    papel = r.data === "admin" || r.data === "vendedor" ? r.data : "";
    if (!papel) { $("#ia-email-negado").textContent = eu.email; return mostrar("ia-negado"); }
    const { data: nivel } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if (!nivel || nivel.currentLevel !== "aal2") return mostrar("ia-2fa");

    mostrar("ia-app");
    ligarEventos();
    const pedida = new URLSearchParams(location.search).get("ferramenta");
    escolherFerramenta(porId[pedida] ? pedida : "geral");
    carregarHistorico();
    carregarConsumo();
  });
})();
