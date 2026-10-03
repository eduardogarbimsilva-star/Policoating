/* =========================================================
   Policoating — Painel da empresa (cadastro de produtos)
   ========================================================= */
(function () {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  document.addEventListener("DOMContentLoaded", async () => {
    const CW = window.ColorWeg, esc = CW.esc, A = window.Catalogo.Admin;
    const CATS = window.CATEGORIAS || {};
    const slug = (window.Fotos && window.Fotos.slug) || ((t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, "-"));
    const mostrar = (id) => ["admin-carregando", "admin-entrar", "admin-negado", "admin-2fa", "admin-painel"].forEach((x) => ($("#" + x).hidden = x !== id));

    /**
     * Verificação em 2 etapas: na primeira vez, cadastra o app autenticador (QR Code);
     * depois, pede o código de 6 números a cada vez que o navegador é aberto (a marca fica só nesta aba/sessão).
     */
    async function exigir2fa() {
      if (!A.online) return true;
      const CHAVE = "policoating_2fa_sessao", eu = String(window.Conta.usuario.id || window.Conta.usuario.email);
      let marca = ""; try { marca = sessionStorage.getItem(CHAVE) || ""; } catch (e) { /* sem sessionStorage: pede o código */ }
      let est;
      try { est = await A.estado2fa(); }
      catch (e) { mostrar("admin-2fa"); $("#dfa-form").hidden = true; $("#dfa-erro").textContent = e.message; return false; }
      if (est.ativa && est.nivel === "aal2" && marca === eu) return true;
      mostrar("admin-2fa");
      let fator = est.fator;
      $("#dfa-cadastro").hidden = est.ativa; $("#dfa-entrar").hidden = !est.ativa;
      if (!est.ativa) {
        try {
          const r = await A.iniciar2fa(); fator = r.fator;
          const svg = String(r.qr || ""), img = new Image();
          img.alt = "Código QR para o aplicativo autenticador"; img.width = img.height = 200;
          img.src = svg.startsWith("data:image/svg+xml;utf-8,") ? "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.slice(25)) : svg;
          $("#dfa-qr").replaceChildren(img);
          $("#dfa-chave").textContent = String(r.chave || "").replace(/(.{4})/g, "$1 ").trim();
        } catch (e) { $("#dfa-form").hidden = true; $("#dfa-erro").textContent = e.message; return false; }
      }
      const campo = $("#dfa-codigo"), botao = $("#dfa-ok");
      campo.focus();
      return new Promise((pronto) => {
        let enviando = false;
        const enviar = async () => {
          if (enviando) return; enviando = true; botao.disabled = true; $("#dfa-erro").textContent = "";
          try {
            await A.verificar2fa(fator, campo.value);
            try { sessionStorage.setItem(CHAVE, eu); } catch (e) { /* segue sem lembrar */ }
            if (!est.ativa) CW.mostrarToast("Verificação em 2 etapas ativada.");
            pronto(true);
          } catch (e) { $("#dfa-erro").textContent = e.message; campo.select(); }
          enviando = false; botao.disabled = false;
        };
        $("#dfa-form").addEventListener("submit", (e) => { e.preventDefault(); enviar(); });
        campo.addEventListener("input", () => { if (campo.value.replace(/\D/g, "").length === 6) enviar(); });
      });
    }

    await window.ContaPronta;
    if (!window.Conta.usuario) return mostrar("admin-entrar");
    const papel = await A.meuPapel();
    if (!papel) { $("#admin-email").textContent = window.Conta.usuario.email; return mostrar("admin-negado"); }
    if (!(await exigir2fa())) return;
    mostrar("admin-painel");
    $("#admin-demo").hidden = A.online;
    const ehAdmin = papel === "admin";
    // vendedor: só a busca de pedidos
    if (!ehAdmin) {
      document.title = "Área do vendedor | Policoating";
      $(".cabecalho-pagina h1").textContent = "Área do vendedor";
      $(".cabecalho-pagina p").textContent = "Pedidos feitos pelo site, promoções, carteira de clientes e notas de entrada.";
      $$(".admin-abas [data-aba]").forEach((b) => { if (!["produtos", "pedidos", "clientes", "notas", "relatorios"].includes(b.dataset.aba)) b.remove(); });
      document.body.classList.add("so-vendedor");
    }
    const [podeExcluir, podeExportar] = await Promise.all([A.podeExcluirPedidos(), A.podeExportarClientes()]);
    const extras = [podeExcluir && "pode excluir pedidos", podeExportar && "pode exportar clientes"].filter(Boolean);
    $("#selo-papel").textContent = (ehAdmin ? "Administrador" : "Vendedor") + (!ehAdmin && extras.length ? ` (${extras.join(", ")})` : "");
    $("#clientes-csv").hidden = !podeExportar;

    const filtro = $("#admin-filtro"), selCat = $("[name=categoria]"), selMarca = $("[name=marca]");
    let marcas = ["Policoating"];
    function preencherListas() {
      const C = window.CATEGORIAS || {};
      const opcoes = Object.entries(C).map(([k, c]) => `<option value="${esc(k)}">${esc(c.nome)}</option>`).join("");
      const vf = filtro.value, vc = selCat.value, vm = selMarca.value;
      filtro.innerHTML = `<option value="">Todos os tipos</option>` + opcoes; filtro.value = vf;
      selCat.innerHTML = opcoes; if (vc) selCat.value = vc;
      selMarca.innerHTML = `<option value="">Escolha a marca</option>` + marcas.map((m) => `<option>${esc(m)}</option>`).join(""); if (vm) selMarca.value = vm;
    }
    try { const cfg = await A.lerConfig(); marcas = cfg.marcas; } catch (e) { /* usa a padrão */ }
    preencherListas();
    document.addEventListener("config-atualizada", preencherListas);

    let registros = [];
    const fmtR = (v) => (+v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    async function carregar() {
      try { registros = await A.listar(); }
      catch (e) { CW.mostrarToast(e.message); registros = []; }
      const antigos = registros.filter((r) => (r.dados.cores || []).length > 1);
      $("#aviso-cores").hidden = !antigos.length || !ehAdmin;
      if (antigos.length) $("#aviso-cores-texto").textContent = `${antigos.length} ${antigos.length === 1 ? "produto tem" : "produtos têm"} várias cores (${antigos.reduce((n, r) => n + r.dados.cores.length, 0)} cores no total).`;
      desenhar();
    }
    $("#btn-converter").addEventListener("click", async (e) => {
      if (!confirm("Converter os produtos com várias cores em um produto por cor?\n\nCada cor ganha um código novo (POL-0001, POL-0002...), que você pode trocar depois duplicando o produto.")) return;
      e.target.disabled = true;
      try { const n = await A.converterCores(); CW.mostrarToast(`${n} produtos criados, um por cor.`); await carregar(); }
      catch (err) { CW.mostrarToast(err.message); }
      finally { e.target.disabled = false; }
    });

    function miniatura(p) {
      const c = p.cores[0];
      return `<img src="${esc(CW.fotoProduto(p, c, { largura: 96, altura: 76 }))}" alt="" width="64" height="51" data-produto="${esc(p.id)}" data-cor="${esc(c.nome)}">`;
    }
    function textoPreco(p) {
      const pi = CW.precoInfo(p);
      if (pi.tipo === "combinar") return `<span class="adm-preco combinar">Sem preço</span>`;
      if (pi.tipo === "promo") return `<span class="adm-preco"><s>${fmtR(pi.preco)}</s> <strong>${fmtR(pi.promo)}</strong> <b class="selo-off">-${pi.desconto}%</b>${pi.ate ? `<small>até ${pi.ate.split("-").reverse().join("/")}</small>` : ""}</span>`;
      const promoVencida = p.precoPromo && p.promoAte && new Date().toISOString().slice(0, 10) > p.promoAte;
      return `<span class="adm-preco"><strong>${fmtR(pi.preco)}</strong>${promoVencida ? `<small>promoção encerrada</small>` : ""}</span>`;
    }
    function desenhar() {
      const termo = slug($("#admin-busca").value || "");
      const cat = filtro.value;
      const lista = registros.filter((r) => (!cat || r.dados.categoria === cat) &&
        (!termo || slug([r.dados.nome, r.id, r.dados.codigo, r.dados.linha, (r.dados.cores || []).map((c) => c.nome).join(" ")].join(" ")).includes(termo)));
      $("#admin-contagem").textContent = registros.length
        ? `${lista.length} de ${registros.length} produtos · ${registros.filter((r) => r.ativo).length} visíveis no site`
        : "Nenhum produto cadastrado. Clique em \"+ Novo produto\" para cadastrar o primeiro. Só aparece no site o que estiver cadastrado aqui.";
      $("#admin-lista").innerHTML = lista.map((r) => {
        const p = r.dados, varias = (p.cores || []).length > 1;
        return `<tr data-id="${esc(r.id)}" class="${r.ativo ? "" : "oculto"}${selecionados.has(r.id) ? " selecionado" : ""}">
          <td class="col-sel"><input type="checkbox" data-sel ${selecionados.has(r.id) ? "checked" : ""} aria-label="Selecionar ${esc(p.nome)}"></td>
          <td><div class="admin-prod">${miniatura(p)}<div><strong>${esc(p.nome)}</strong><small>Cód. ${esc(p.codigo || r.id.toUpperCase())}${p.destaque ? " · ★ destaque" : ""}${varias ? ` · <b class="selo-cli inativo">${p.cores.length} cores (converter)</b>` : ""}${p.cores[0] && !p.cores[0].foto ? ` · <span class="sem-foto">sem foto</span>` : ""}</small></div></div></td>
          <td>${esc(((window.CATEGORIAS || {})[p.categoria] || {}).nome || p.categoria)}${p.marca ? `<small class="marca-lista">${esc(p.marca)}</small>` : ""}</td>
          <td>${textoPreco(p)}</td>
          <td>${ehAdmin ? `<button type="button" class="admin-status ${r.ativo ? "on" : ""}" data-acao="alternar">${r.ativo ? "Visível" : "Oculto"}</button>` : (r.ativo ? "Visível" : "Oculto")}</td>
          <td class="admin-botoes">${ehAdmin ? `
            <button type="button" data-acao="editar">Editar</button>
            <button type="button" data-acao="duplicar">Duplicar</button>
            <button type="button" data-acao="excluir" class="perigo">Excluir</button>` : ""}
          </td></tr>`;
      }).join("");
      listaVisivel = lista.map((r) => r.id);
      atualizarMassa();
    }

    /* ---------- Seleção múltipla ---------- */
    const selecionados = new Set();
    let listaVisivel = [];
    function atualizarMassa() {
      [...selecionados].forEach((id) => { if (!registros.some((r) => r.id === id)) selecionados.delete(id); });
      const n = selecionados.size;
      $("#acoes-massa").hidden = !n;
      $("#massa-contagem").textContent = `${n} ${n === 1 ? "selecionado" : "selecionados"}`;
      const todos = $("#sel-todos");
      todos.checked = listaVisivel.length > 0 && listaVisivel.every((id) => selecionados.has(id));
      todos.indeterminate = !todos.checked && listaVisivel.some((id) => selecionados.has(id));
    }
    $$("#massa-acao option[data-admin]").forEach((o) => { if (!ehAdmin) o.remove(); });
    function camposMassa() {
      const a = $("#massa-acao").value, C = window.CATEGORIAS || {};
      $("#massa-campos").innerHTML =
        a === "promo" ? `<input type="number" id="massa-pct" min="1" max="90" step="1" placeholder="% de desconto" aria-label="Desconto em %"><label class="massa-ate">até <input type="date" id="massa-ate" aria-label="Promoção até"></label>`
        : a === "marca" ? `<select id="massa-marca" aria-label="Marca">${marcas.map((m) => `<option>${esc(m)}</option>`).join("")}</select>`
        : a === "tipo" ? `<select id="massa-tipo" aria-label="Tipo">${Object.entries(C).map(([k, c]) => `<option value="${esc(k)}">${esc(c.nome)}</option>`).join("")}</select>`
        : a === "reajuste" ? `<input type="number" id="massa-reajuste" min="-90" max="500" step="0.5" placeholder="% (ex.: 5 ou -3)" aria-label="Reajuste em %">` : "";
    }
    $("#massa-acao").addEventListener("change", camposMassa);
    camposMassa();
    $("#sel-todos").addEventListener("change", (e) => { listaVisivel.forEach((id) => (e.target.checked ? selecionados.add(id) : selecionados.delete(id))); desenhar(); });
    $("#admin-lista").addEventListener("change", (e) => {
      if (!e.target.matches("[data-sel]")) return;
      const id = e.target.closest("tr").dataset.id;
      e.target.checked ? selecionados.add(id) : selecionados.delete(id);
      e.target.closest("tr").classList.toggle("selecionado", e.target.checked);
      atualizarMassa();
    });
    $("#massa-limpar").addEventListener("click", () => { selecionados.clear(); desenhar(); });
    $("#massa-aplicar").addEventListener("click", async (e) => {
      const ids = [...selecionados], a = $("#massa-acao").value, n = ids.length;
      if (!n) return;
      let msg = "", res = null;
      try {
        if (a === "promo") {
          const pct = +$("#massa-pct").value, ate = $("#massa-ate").value;
          if (!(pct >= 1 && pct <= 90)) return CW.mostrarToast("Informe o desconto (1 a 90%).");
          if (!confirm(`Aplicar ${pct}% de desconto em ${n} produto(s)${ate ? ` até ${ate.split("-").reverse().join("/")}` : ""}?\nProdutos com "valor a combinar" ficam de fora.`)) return;
          e.target.disabled = true;
          const q = await A.aplicarPromocao(ids, pct, ate); msg = `Promoção aplicada em ${q} produto(s).`;
        } else if (a === "sem-promo") {
          e.target.disabled = true; const q = await A.removerPromocao(ids); msg = `Promoção removida de ${q} produto(s).`;
        } else if (a === "excluir") {
          if (!confirm(`Excluir ${n} produto(s) do catálogo? Isso não pode ser desfeito.`)) return;
          e.target.disabled = true; await A.excluirVarios(ids); msg = `${n} produto(s) excluído(s).`;
        } else {
          const val = a === "marca" ? $("#massa-marca").value : a === "tipo" ? $("#massa-tipo").value : a === "reajuste" ? +$("#massa-reajuste").value : null;
          if (a === "reajuste" && !(val >= -90 && val <= 500 && val !== 0)) return CW.mostrarToast("Informe o reajuste em % (ex.: 5 ou -3).");
          if (!confirm(`Aplicar em ${n} produto(s)?`)) return;
          e.target.disabled = true;
          const fator = 1 + (val || 0) / 100, arred = (v) => Math.round(v * fator * 100) / 100;
          res = await A.alterarEmMassa(ids, (r) => {
            if (a === "mostrar") r.ativo = true;
            if (a === "ocultar") r.ativo = false;
            if (a === "marca") r.dados.marca = val;
            if (a === "tipo") r.dados.categoria = val;
            if (a === "reajuste" && !r.dados.precoCombinar && +r.dados.preco > 0) { r.dados.preco = arred(r.dados.preco); if (r.dados.precoPromo) r.dados.precoPromo = arred(r.dados.precoPromo); }
          });
          msg = `${res.ok} produto(s) alterado(s).${res.falhas.length ? ` ${res.falhas.length} com erro: ${res.falhas.slice(0, 3).join(" | ")}` : ""}`;
        }
        if (!res || !res.falhas.length) selecionados.clear();
        await carregar();
        CW.mostrarToast(msg);
      } catch (err) { CW.mostrarToast(err.message); }
      finally { e.target.disabled = false; }
    });

    $("#admin-busca").addEventListener("input", desenhar);
    filtro.addEventListener("change", desenhar);
    $("#admin-lista").addEventListener("click", async (e) => {
      const b = e.target.closest("[data-acao]"); if (!b) return;
      const id = b.closest("tr").dataset.id, r = registros.find((x) => x.id === id); if (!r) return;
      if ((r.dados.cores || []).length > 1 && b.dataset.acao !== "excluir") { CW.mostrarToast("Este produto tem várias cores. Clique em \"Converter agora\" (acima da lista) antes de editar."); return; }
      if (b.dataset.acao === "editar") abrir(r, false);
      if (b.dataset.acao === "duplicar") abrir(r, true);
      if (b.dataset.acao === "alternar") {
        b.disabled = true;
        try { await A.salvar(r.dados, !r.ativo, r.ordem, false); await carregar(); CW.mostrarToast(r.ativo ? "Produto oculto do site." : "Produto visível no site."); }
        catch (err) { CW.mostrarToast(err.message); b.disabled = false; }
      }
      if (b.dataset.acao === "excluir") {
        if (!confirm(`Excluir "${r.dados.nome}" do catálogo? Isso não pode ser desfeito.\n\nDica: para tirar do site só por um tempo, use "Visível/Oculto".`)) return;
        try { await A.excluir(id); await carregar(); CW.mostrarToast("Produto excluído."); }
        catch (err) { CW.mostrarToast(err.message); }
      }
    });

    /* ---------- Formulário ---------- */
    const modal = $("#admin-modal"), form = $("#admin-form");
    let editando = null, fichaAtual = "", fotos = [], enquadramento = {};
    const codigoAtual = () => form.codigo.value.trim().toUpperCase();
    const pastaFotos = () => (codigoAtual() || "novo").toLowerCase();
    function mostrarFicha(url) {
      fichaAtual = url || "";
      const a = $("#ficha-link");
      a.hidden = !fichaAtual; if (fichaAtual) a.href = fichaAtual;
      $("#ficha-remover").hidden = !fichaAtual;
    }
    // fotos: no mínimo 3, a primeira é a capa
    let enviando = 0;
    function desenharFotos() {
      const n = fotos.length;
      $("#fotos-contagem").textContent = enviando ? `(enviando ${enviando}...)` : n >= 3 ? `(${n} ${n === 1 ? "foto" : "fotos"})` : `(${n} de no mínimo 3)`;
      $("#fotos-contagem").className = n >= 3 ? "ok" : "falta";
      $("#fotos-grade").innerHTML = fotos.map((u, i) => `<figure data-i="${i}">
          <img src="${esc(u)}" alt="Foto ${i + 1}">${i === 0 ? `<b class="capa">Capa</b>` : ""}
          <div><button type="button" data-foto-mover="-1" aria-label="Mover para a esquerda" ${i ? "" : "disabled"}>‹</button>
          <button type="button" data-foto-mover="1" aria-label="Mover para a direita" ${i < n - 1 ? "" : "disabled"}>›</button>
          <button type="button" data-foto-remover class="perigo" aria-label="Remover foto">×</button></div>
          <button type="button" class="foto-enq" data-foto-enquadrar title="Escolher a parte da foto que aparece no catálogo">${enquadramento[u] ? "✓ Ajustada" : "Ajustar no catálogo"}</button></figure>`).join("") +
        Array.from({ length: Math.max(0, 3 - n) }, () => `<label class="foto-vaga">+ Foto<input type="file" accept="image/*,.heic,.heif" multiple hidden data-foto-vaga></label>`).join("");
    }
    async function enviarFotos(lista) {
      const arquivos = Array.from(lista).slice(0, Math.max(0, 10 - fotos.length));
      if (!arquivos.length) { erro("Máximo de 10 fotos por produto."); return; }
      enviando += arquivos.length; desenharFotos();
      const falhas = [];
      for (const arq of arquivos) {
        try { fotos.push(await A.enviarFoto(arq, pastaFotos())); }
        catch (err) { falhas.push(err.message); }
        enviando--; desenharFotos();
      }
      erro(falhas.join(" "));
    }
    $("#fotos-arquivos").addEventListener("change", (e) => { enviarFotos(e.target.files); e.target.value = ""; });
    $("#fotos-grade").addEventListener("change", (e) => { if (e.target.matches("[data-foto-vaga]")) { enviarFotos(e.target.files); e.target.value = ""; } });
    $("#fotos-grade").addEventListener("click", (e) => {
      const f = e.target.closest("figure[data-i]"); if (!f) return;
      const i = +f.dataset.i, mv = e.target.closest("[data-foto-mover]");
      if (mv) { const j = i + +mv.dataset.fotoMover; [fotos[i], fotos[j]] = [fotos[j], fotos[i]]; desenharFotos(); }
      if (e.target.closest("[data-foto-remover]")) { fotos.splice(i, 1); desenharFotos(); }
      if (e.target.closest("[data-foto-enquadrar]")) abrirEnq(fotos[i]);
    });
    /* ---------- Enquadrar a foto no quadro do catálogo (arrastar) ---------- */
    const dlgEnq = $("#dlg-enq"), enqImg = $("#enq-img"), enqQuadro = $("#enq-quadro");
    let enqUrl = "", enqPos = [50, 50];
    const enqAplicar = () => {
      enqImg.style.objectPosition = `${enqPos[0]}% ${enqPos[1]}%`;
      enqImg.style.objectFit = $("#enq-inteira").checked ? "contain" : "cover";
      enqQuadro.classList.toggle("inteira", $("#enq-inteira").checked);
    };
    function abrirEnq(url) {
      enqUrl = url;
      const e = enquadramento[url] || {};
      const m = String(e.pos || "").match(/^([\d.]+)% ([\d.]+)%$/);
      enqPos = m ? [+m[1], +m[2]] : [50, 50];
      $("#enq-inteira").checked = !!e.inteira;
      enqImg.src = url; enqAplicar();
      if (dlgEnq.showModal) dlgEnq.showModal(); else dlgEnq.setAttribute("open", "");
    }
    let arrasto = null;
    enqQuadro.addEventListener("pointerdown", (e) => {
      if ($("#enq-inteira").checked || !enqImg.naturalWidth) return;
      const fw = enqQuadro.clientWidth, fh = enqQuadro.clientHeight, esc = Math.max(fw / enqImg.naturalWidth, fh / enqImg.naturalHeight);
      arrasto = { x: e.clientX, y: e.clientY, p0: enqPos.slice(), sobraX: enqImg.naturalWidth * esc - fw, sobraY: enqImg.naturalHeight * esc - fh };
      enqQuadro.setPointerCapture(e.pointerId); enqQuadro.classList.add("arrastando"); e.preventDefault();
    });
    enqQuadro.addEventListener("pointermove", (e) => {
      if (!arrasto) return;
      const lim = (v) => Math.round(Math.min(100, Math.max(0, v)) * 10) / 10;
      if (arrasto.sobraX > 1) enqPos[0] = lim(arrasto.p0[0] - ((e.clientX - arrasto.x) / arrasto.sobraX) * 100);
      if (arrasto.sobraY > 1) enqPos[1] = lim(arrasto.p0[1] - ((e.clientY - arrasto.y) / arrasto.sobraY) * 100);
      enqAplicar();
    });
    const soltar = () => { arrasto = null; enqQuadro.classList.remove("arrastando"); };
    enqQuadro.addEventListener("pointerup", soltar); enqQuadro.addEventListener("pointercancel", soltar);
    $("#enq-inteira").addEventListener("change", enqAplicar);
    $("#enq-centro").addEventListener("click", () => { enqPos = [50, 50]; $("#enq-inteira").checked = false; enqAplicar(); });
    const fecharEnq = () => { if (dlgEnq.close) dlgEnq.close(); else dlgEnq.removeAttribute("open"); };
    $("#enq-cancelar").addEventListener("click", fecharEnq);
    $("#form-enq").addEventListener("submit", (e) => {
      e.preventDefault();
      const inteira = $("#enq-inteira").checked;
      if (!inteira && enqPos[0] === 50 && enqPos[1] === 50) delete enquadramento[enqUrl];
      else enquadramento[enqUrl] = { pos: `${enqPos[0]}% ${enqPos[1]}%`, inteira };
      fecharEnq(); desenharFotos();
    });

    // vídeo: link do YouTube/Vimeo ou arquivo enviado
    let videoAtual = "", enviandoVideo = false;
    function mostrarVideo(url) {
      videoAtual = String(url || "").trim();
      $("#video-url").value = videoAtual;
      conferirVideo();
    }
    function conferirVideo() {
      const txt = $("#video-url").value.trim(), v = CW.videoInfo(txt), st = $("#video-status");
      videoAtual = v ? v.url : "";
      $("#video-remover").hidden = !txt;
      st.className = "video-status" + (txt && !v ? " falta" : "");
      st.innerHTML = enviandoVideo ? "Enviando vídeo... (pode levar alguns minutos)"
        : !txt ? "" : !v ? "Link não reconhecido. Use um link do YouTube (youtube.com ou youtu.be), do Vimeo ou envie um arquivo MP4."
        : `✓ ${v.tipo === "youtube" ? "Vídeo do YouTube" : v.tipo === "vimeo" ? "Vídeo do Vimeo" : "Arquivo de vídeo"} · <a href="${esc(v.url)}" target="_blank" rel="noopener">abrir</a>`;
    }
    $("#video-url").addEventListener("input", conferirVideo);
    $("#video-remover").addEventListener("click", () => mostrarVideo(""));
    $("#video-arquivo").addEventListener("change", async (e) => {
      const arq = e.target.files[0]; e.target.value = ""; if (!arq) return;
      enviandoVideo = true; $("#video-enviar").classList.add("desativado"); conferirVideo();
      try { const url = await A.enviarVideo(arq, pastaFotos()); enviandoVideo = false; mostrarVideo(url); erro(""); }
      catch (err) { enviandoVideo = false; conferirVideo(); erro(err.message); }
      $("#video-enviar").classList.remove("desativado");
    });
    $("#ficha-remover").addEventListener("click", () => mostrarFicha(""));
    $("#ficha-arquivo").addEventListener("change", async (e) => {
      const arq = e.target.files[0]; if (!arq) return;
      try { mostrarFicha(await A.enviarPdf(arq, pastaFotos())); erro(""); } catch (err) { erro(err.message); }
      e.target.value = "";
    });
    // marca e tipo novos
    $("#btn-nova-marca").addEventListener("click", async () => {
      const nome = prompt("Nome da nova marca:"); if (!nome) return;
      try { const m = await A.adicionarMarca(nome); if (!marcas.includes(m)) marcas.push(m); preencherListas(); selMarca.value = m; CW.mostrarToast(`Marca "${m}" cadastrada.`); }
      catch (err) { erro(err.message); }
    });
    $("#btn-novo-tipo").addEventListener("click", async () => {
      const nome = prompt("Nome do novo tipo de produto (ex.: Primer, Verniz, Alta temperatura):"); if (!nome) return;
      try { const id = await A.adicionarTipo(nome); preencherListas(); selCat.value = id; CW.mostrarToast(`Tipo "${(window.CATEGORIAS[id] || {}).nome || nome}" cadastrado.`); }
      catch (err) { erro(err.message); }
    });
    const tom = $("#cor-tom"), hex = $("#cor-hex");
    tom.addEventListener("input", () => (hex.value = tom.value));
    hex.addEventListener("input", () => { if (/^#[0-9a-f]{6}$/i.test(hex.value)) tom.value = hex.value; });

    const modoPreco = () => "valor";   // todo produto tem preço por kg (sem "a combinar")
    function previaPreco() {
      const combinar = modoPreco() === "combinar";
      $("#precos-campos").hidden = combinar;
      if (combinar) return;
      const d = { preco: +form.preco.value || 0, precoPromo: +form.precoPromo.value || 0, promoAte: form.promoAte.value };
      const pi = CW.precoInfo(d);
      $("#preco-previa").innerHTML = !d.preco ? "" : pi.tipo === "promo"
        ? `No site: <s>${fmtR(pi.preco)}</s> <strong>${fmtR(pi.promo)}/kg</strong> <b class="selo-off">-${pi.desconto}%</b> · caixa 5 kg: ${fmtR(pi.promo * 5)} · caixa 25 kg: ${fmtR(pi.promo * 25)}`
        : `No site: <strong>${fmtR(d.preco)}/kg</strong> · caixa 5 kg: ${fmtR(d.preco * 5)} · caixa 25 kg: ${fmtR(d.preco * 25)}${d.precoPromo ? (d.precoPromo >= d.preco ? " · <span class=\"form-erro\">a promoção precisa ser menor que o preço</span>" : " · promoção encerrada") : ""}`;
    }
    ["preco", "precoPromo", "promoAte"].forEach((n) => form[n].addEventListener("input", previaPreco));

    async function abrir(r, duplicar) {
      editando = r && !duplicar ? r.id : null;
      const p = r ? JSON.parse(JSON.stringify(r.dados)) : { categoria: Object.keys(window.CATEGORIAS || {})[0], marca: marcas[0], cores: [{ nome: "", hex: "#1558d6" }] };
      $("#form-titulo").textContent = editando ? "Editar produto" : duplicar ? "Novo produto (cópia)" : "Novo produto";
      form.codigo.value = editando ? (p.codigo || r.id.toUpperCase()) : "…";
      $("#codigo-dica").textContent = editando ? "O código não muda." : "Gerado automaticamente pelo sistema.";
      if (!editando) A.proximoCodigo().then((c) => { if (!editando && !modal.hidden) form.codigo.value = c; }).catch(() => (form.codigo.value = ""));
      preencherListas();
      if (p.marca && !marcas.includes(p.marca)) { marcas.push(p.marca); preencherListas(); }
      selMarca.value = p.marca || "";
      ["nome", "linha", "acabamento", "descricao", "rendimento", "cura"].forEach((k) => (form[k].value = p[k] || ""));
      if (duplicar) form.nome.value = "";
      form.categoria.value = p.categoria;
      form.densidade.value = p.densidade || "";
      const c = (p.cores || [])[0] || { nome: "", hex: "#1558d6" };
      $("#cor-nome").value = duplicar ? "" : c.nome; hex.value = tom.value = c.hex || "#1558d6";
      fotos = duplicar ? [] : (Array.isArray(p.fotos) && p.fotos.length ? p.fotos.slice() : c.foto ? [c.foto] : []);
      enquadramento = duplicar ? {} : JSON.parse(JSON.stringify(p.enquadramento || {}));
      enviando = 0; desenharFotos();
      form.preco.value = p.preco || ""; form.precoPromo.value = p.precoPromo || ""; form.promoAte.value = p.promoAte || "";
      previaPreco();
      form.ordem.value = r ? r.ordem + (duplicar ? 1 : 0) : (registros.reduce((m, x) => Math.max(m, x.ordem), 0) + 10);
      form.destaque.checked = !!p.destaque && !duplicar;
      form.ativo.checked = r ? r.ativo : true;
      mostrarFicha(p.ficha);
      enviandoVideo = false; mostrarVideo(p.video);
      erro("");
      modal.hidden = false;
      document.body.style.overflow = "hidden";
      form.nome.focus();
    }
    function fechar() { modal.hidden = true; document.body.style.overflow = ""; }
    function erro(msg) { $("#form-erro").textContent = msg; }

    $("#btn-novo").addEventListener("click", () => abrir(null));
    $$("[data-fechar]", modal).forEach((b) => b.addEventListener("click", fechar));
    modal.addEventListener("click", (e) => { if (e.target === modal) fechar(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) fechar(); });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (enviando) return erro("Aguarde terminar o envio das fotos.");
      if (enviandoVideo) return erro("Aguarde terminar o envio do vídeo.");
      if ($("#video-url").value.trim() && !videoAtual) return erro("O link do vídeo não foi reconhecido. Corrija ou clique em Remover.");
      const cor = { nome: $("#cor-nome").value.replace(/\s+/g, " ").trim(), hex: hex.value.trim() };
      if (fotos[0]) cor.foto = fotos[0];
      const combinar = modoPreco() === "combinar";
      const dados = {
        codigo: editando ? codigoAtual() : (/^POL-\d{4,}$/.test(codigoAtual()) ? codigoAtual() : ""),
        nome: form.nome.value.replace(/\s+/g, " ").trim(),
        categoria: form.categoria.value,
        marca: selMarca.value,
        fotos: fotos.slice(),
        enquadramento: Object.fromEntries(Object.entries(enquadramento).filter(([u]) => fotos.includes(u))),
        linha: form.linha.value.trim(),
        acabamento: form.acabamento.value.trim(),
        descricao: form.descricao.value.trim(),
        rendimento: form.rendimento.value.trim(),
        cura: form.cura.value.trim(),
        cores: [cor],
        destaque: form.destaque.checked,
        precoCombinar: combinar
      };
      const antigo = editando && registros.find((x) => x.id === editando);
      if (antigo && antigo.dados.familia) dados.familia = antigo.dados.familia;
      if (form.densidade.value) dados.densidade = Number(form.densidade.value);
      if (fichaAtual) dados.ficha = fichaAtual;
      if (videoAtual) dados.video = videoAtual;
      if (!combinar) {
        dados.preco = Math.round(Number(form.preco.value) * 100) / 100;
        if (form.precoPromo.value) dados.precoPromo = Math.round(Number(form.precoPromo.value) * 100) / 100;
        if (form.promoAte.value && dados.precoPromo) dados.promoAte = form.promoAte.value;
      }
      const botao = $("#btn-salvar"); botao.disabled = true;
      try {
        const reg = await A.salvar(dados, form.ativo.checked, form.ordem.value, !editando);
        fechar();
        await carregar();
        CW.mostrarToast(`Produto ${reg.dados.codigo} salvo. ${reg.ativo ? "Ele já aparece no catálogo do site." : "Está oculto do site."}`);
      } catch (err) { erro(err.message); }
      finally { botao.disabled = false; }
    });

    carregar();
    if (!ehAdmin) $("#btn-novo").remove();

    /* ---------- Abas ---------- */
    const abas = $$(".admin-abas [data-aba]");
    const abrirAba = (nome) => {
      abas.forEach((b) => { const on = b.dataset.aba === nome; b.classList.toggle("ativo", on); b.setAttribute("aria-selected", on); });
      $$(".admin-aba").forEach((c) => (c.hidden = c.dataset.conteudo !== nome));
      if (nome === "contato") carregarConfig();
      if (nome === "clientes") carregarClientes();
      if (nome === "pedidos") carregarPedidos();
      if (nome === "galeria") carregarGaleria();
      if (nome === "equipe") carregarEquipe();
      if (nome === "notas") carregarNotas();
      if (nome === "relatorios") prepararRelatorios();
    };
    abas.forEach((b) => b.addEventListener("click", () => abrirAba(b.dataset.aba)));

    /* ---------- Alerta de pedido novo (confere a cada minuto com o painel aberto) ---------- */
    const CHAVE_VISTO = "policoating_pedidos_visto_em", tituloBase = document.title;
    const lerVisto = () => { try { return localStorage.getItem(CHAVE_VISTO) || ""; } catch (e) { return ""; } };
    // guarda a data do pedido mais recente (hora do servidor, não do computador)
    const marcarVisto = async () => {
      let v; try { v = (await A.ultimoPedidoEm()) || "1970-01-01T00:00:00Z"; } catch (e) { return; }
      if (v > lerVisto()) try { localStorage.setItem(CHAVE_VISTO, v); } catch (e) { /* ignora */ }
    };
    const abaPedidos = $('.admin-abas [data-aba="pedidos"]');
    const selo = document.createElement("span");
    selo.className = "aba-novos"; selo.hidden = true;
    if (abaPedidos) abaPedidos.appendChild(selo);
    const primeiroAcesso = lerVisto() ? Promise.resolve() : marcarVisto();   // sem registro: só avisa dos próximos
    let novosAntes = 0;
    async function conferirNovos() {
      await primeiroAcesso;
      const vendoPedidos = abaPedidos && abaPedidos.classList.contains("ativo") && !document.hidden;
      if (vendoPedidos) { await marcarVisto(); novosAntes = 0; }
      let n = 0;
      try { n = vendoPedidos ? 0 : await A.contarPedidosDesde(lerVisto()); } catch (e) { return; }
      selo.textContent = n > 99 ? "99+" : String(n); selo.hidden = !n;
      selo.title = n ? `${n} ${n === 1 ? "pedido novo" : "pedidos novos"}` : "";
      document.title = n ? `(${n}) ${tituloBase}` : tituloBase;
      if (n > novosAntes) {
        CW.mostrarToast(`${n === 1 ? "Chegou 1 pedido novo" : `Chegaram ${n} pedidos novos`}. Veja na aba Pedidos.`);
        try { if (window.Notification && Notification.permission === "granted") new Notification("Policoating: pedido novo", { body: "Abra a aba Pedidos do painel." }); } catch (e) { /* ignora */ }
      }
      novosAntes = n;
    }
    if (abaPedidos) {
      abaPedidos.addEventListener("click", () => {
        marcarVisto(); novosAntes = 0; selo.hidden = true; document.title = tituloBase;
        try { if (window.Notification && Notification.permission === "default") Notification.requestPermission(); } catch (e) { /* ignora */ }
      });
      setInterval(conferirNovos, 60000);
      document.addEventListener("visibilitychange", () => { if (!document.hidden) conferirNovos(); });
      setTimeout(conferirNovos, 1500);
    }

    /* ---------- Pedidos feitos pelo site (enviados pelo WhatsApp) ---------- */
    const nomeCliente = (c) => (c.tipo === "pj" ? (c.nome_fantasia || c.razao_social) : c.nome) || c.email || "Cliente";
    const dataBR = (d) => (d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "");
    const kgItem = (i) => (i.kg != null ? +i.kg : CW.kgDoItem({ embalagem: i.embalagem, qtd: +i.qtd || 0 }));
    const kgPedido = (p) => (p.total_kg != null ? +p.total_kg : (p.itens || []).reduce((s, i) => s + kgItem(i), 0));
    const valorPedido = (p) => (p.total != null ? +p.total : (p.itens || []).reduce((s, i) => s + (i.preco_kg != null ? (+i.preco_kg) * kgItem(i) : 0), 0));
    let pedidos = [], pedidosCarregados = false, esperaBusca = 0;
    async function carregarPedidos() {
      $("#pedidos-erro").textContent = "";
      try { pedidos = await A.listarPedidos($("#pedidos-busca").value); pedidosCarregados = true; }
      catch (e) { pedidos = []; $("#pedidos-erro").textContent = e.message; }
      desenharPedidos();
    }
    function inicioPeriodo(v) { return +v ? Date.now() - +v * 864e5 : 0; }
    function pedidosFiltrados() {
      const termo = slug($("#pedidos-busca").value || ""), desde = inicioPeriodo($("#pedidos-periodo").value);
      return pedidos.filter((p) => (!desde || new Date(p.criado_em).getTime() >= desde) &&
        (!termo || slug([p.numero, nomeCliente(p.cliente || {}), (p.cliente || {}).razao_social, (p.cliente || {}).responsavel, (p.cliente || {}).email,
          (p.cliente || {}).telefone, (p.cliente || {}).cnpj, (p.cliente || {}).cpf, (p.cliente || {}).cidade, (p.itens || []).map((i) => [i.nome, i.codigo, i.cor].join(" ")).join(" ")].join(" ")).includes(termo)));
    }
    function desenharPedidos() {
      const lista = pedidosFiltrados(), termo = $("#pedidos-busca").value.trim();
      $("#pedidos-resumo").innerHTML = pedidos.length ? `<span><strong>${lista.length}</strong> ${lista.length === 1 ? "pedido" : "pedidos"}</span><span><strong>${(Math.round(lista.reduce((s, p) => s + kgPedido(p), 0) * 100) / 100).toLocaleString("pt-BR")}</strong> kg</span>` : "";
      $("#admin-pedidos").innerHTML = lista.length ? lista.map((p) => {
        const c = p.cliente || {}, tel = String(c.telefone || "").replace(/\D/g, ""), valor = valorPedido(p), combinar = (p.itens || []).some((i) => i.preco_kg == null);
        return `<article class="adm-pedido" data-numero="${esc(p.numero)}">
          <header>
            <div><strong>${esc(p.numero)}</strong><small>${esc(dataBR(p.criado_em))}</small></div>
            <button type="button" class="btn-copiar" data-copiar="${esc(p.numero)}" title="Copiar código">${window.Icone ? window.Icone("link") : ""}Copiar código</button>
          </header>
          <div class="adm-pedido-corpo">
            <div class="adm-cliente">
              <strong>${esc(nomeCliente(c))}</strong>
              ${c.tipo === "pj" && c.cnpj ? `<small>CNPJ ${esc(c.cnpj)}${c.responsavel ? " · " + esc(c.responsavel) : ""}</small>` : c.cpf ? `<small>CPF ${esc(c.cpf)}</small>` : ""}
              <small>${esc(c.email || "")}${c.telefone ? " · " + esc(c.telefone) : ""}</small>
              ${c.cidade ? `<small>${esc([c.logradouro, c.numero].filter(Boolean).join(", "))} — ${esc(c.cidade)}/${esc(c.uf || "")} · CEP ${esc(c.cep || "")}</small>` : ""}
            </div>
            <ul>${(p.itens || []).map((i) => `<li><strong>${esc(i.nome)}</strong>${i.codigo ? ` <small class="cod">Cód. ${esc(i.codigo)}</small>` : ""}
              <small>${esc(CW.descreverQtd({ embalagem: i.embalagem, qtd: +i.qtd || 0 }))} · ${i.preco_kg != null ? `${fmtR(i.preco_kg)}/kg = ${fmtR((+i.preco_kg) * kgItem(i))}` : "valor a combinar"}</small></li>`).join("")}</ul>
            ${p.observacoes ? `<p class="obs">Obs.: ${esc(p.observacoes)}</p>` : ""}
          </div>
          <footer>
            <span>Total: <strong>${(Math.round(kgPedido(p) * 100) / 100).toLocaleString("pt-BR")} kg</strong>${valor ? ` · <strong>${fmtR(valor)}</strong>${combinar ? " + itens a combinar" : ""}` : combinar ? " · valor a combinar" : ""}</span>
            <span class="adm-pedido-botoes">
              ${podeExcluir ? `<button type="button" class="btn-excluir-pedido" data-excluir-pedido="${esc(p.numero)}">Excluir</button>` : ""}
              ${tel ? `<a class="btn btn-whats" target="_blank" rel="noopener" href="https://wa.me/${tel.length <= 11 ? "55" + tel : tel}?text=${encodeURIComponent(`Olá, ${nomeCliente(c)}! Aqui é da Policoating, sobre o seu pedido ${p.numero}.`)}">Chamar cliente</a>` : ""}
            </span>
          </footer>
        </article>`;
      }).join("") : `<p class="dica">${!pedidosCarregados ? "Carregando..." : pedidos.length ? `Nenhum pedido encontrado para "${esc(termo)}".` : "Nenhum pedido ainda. Os pedidos enviados pelo site aparecem aqui."}</p>`;
    }
    $("#pedidos-busca").addEventListener("input", () => {
      desenharPedidos();
      clearTimeout(esperaBusca);   // código completo que não está na lista: procura no histórico inteiro
      if (/^pc-\S{6,}/i.test($("#pedidos-busca").value.trim()) && !pedidosFiltrados().length) esperaBusca = setTimeout(carregarPedidos, 500);
    });
    $("#pedidos-periodo").addEventListener("change", desenharPedidos);
    $("#pedidos-atualizar").addEventListener("click", carregarPedidos);
    $("#admin-pedidos").addEventListener("click", async (e) => {
      const x = e.target.closest("[data-excluir-pedido]");
      if (x) {
        const num = x.dataset.excluirPedido;
        if (!confirm(`Excluir o pedido ${num}?\n\nEle some do painel e de Meus pedidos do cliente. Isso não pode ser desfeito.`)) return;
        x.disabled = true;
        try { await A.excluirPedido(num); pedidos = pedidos.filter((p) => p.numero !== num); desenharPedidos(); CW.mostrarToast(`Pedido ${num} excluído.`); }
        catch (err) { x.disabled = false; $("#pedidos-erro").textContent = err.message; }
        return;
      }
      const b = e.target.closest("[data-copiar]"); if (!b) return;
      (navigator.clipboard ? navigator.clipboard.writeText(b.dataset.copiar) : Promise.reject()).then(() => CW.mostrarToast("Código copiado."), () => {});
    });
    $("#pedidos-csv").addEventListener("click", () => {
      const cel = (x) => `"${String(x == null ? "" : x).replace(/"/g, '""')}"`, n = (x) => (x == null || x === "" ? "" : String(Math.round(+x * 100) / 100).replace(".", ","));
      const linhas = [["Pedido", "Data", "Cliente", "Documento", "E-mail", "Telefone", "Cidade", "UF", "Código", "Produto", "Quantidade", "Kg", "Preço/kg", "Subtotal", "Observações"]];
      pedidosFiltrados().forEach((p) => (p.itens || []).forEach((i) => {
        const c = p.cliente || {};
        linhas.push([p.numero, dataBR(p.criado_em), nomeCliente(c), c.cnpj || c.cpf || "", c.email || "", c.telefone || "", c.cidade || "", c.uf || "",
          i.codigo || i.id, i.nome, CW.descreverQtd({ embalagem: i.embalagem, qtd: +i.qtd || 0 }), n(kgItem(i)), n(i.preco_kg), i.preco_kg != null ? n((+i.preco_kg) * kgItem(i)) : "a combinar", p.observacoes || ""]);
      }));
      const csv = "\ufeff" + linhas.map((l) => l.map(cel).join(";")).join("\r\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      a.download = `pedidos-policoating-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
    });

    /* ---------- Clientes (administradores e vendedores) ---------- */
    let clientes = [], clientesCarregados = false;
    const docCliente = (c) => (c.tipo === "pj" ? (c.cnpj ? "CNPJ " + c.cnpj : "") : (c.cpf ? "CPF " + c.cpf : ""));
    const diasDesde = (d) => (d ? (Date.now() - new Date(d).getTime()) / 864e5 : Infinity);
    let bloqueios = [];
    async function carregarClientes() {
      $("#clientes-erro").textContent = "";
      try { clientes = await A.listarClientes(); clientesCarregados = true; }
      catch (e) { clientes = []; $("#clientes-erro").textContent = e.message + " (rode a PARTE F do setup.sql no Supabase)"; }
      try { bloqueios = await A.listarBloqueios(); }
      catch (e) { bloqueios = []; if (ehAdmin) $("#clientes-erro").textContent = e.message; }
      desenharClientes();
    }
    /** Bloqueios em vigor deste cliente (pela conta, e-mail ou CPF/CNPJ) */
    function bloqueiosDe(c) {
      const doc = BRso(c.tipo === "pj" ? c.cnpj : c.cpf), email = String(c.email || "").toLowerCase();
      return bloqueios.filter((b) => (c.id && b.cliente_id === c.id) || (email && String(b.email || "").toLowerCase() === email) || (doc && b.documento === doc));
    }
    const seloBloqueio = (bs) => {
      if (!bs.length) return "";
      const semPrazo = bs.some((b) => !b.ate), ate = bs.map((b) => b.ate).filter(Boolean).sort().pop();
      return `<b class="selo-cli bloqueado">${semPrazo ? "Bloqueado" : "Suspenso até " + dataCurta(ate)}</b>`;
    };
    function clientesFiltrados() {
      const termo = slug($("#clientes-busca").value || ""), f = $("#clientes-filtro").value, ordem = $("#clientes-ordem").value;
      const soDig = BRso($("#clientes-busca").value);
      const lista = clientes.filter((c) => {
        if (f === "recentes" && !(diasDesde(c.ultimo_pedido) <= 30)) return false;
        if (f === "inativos" && !(c.pedidos && diasDesde(c.ultimo_pedido) > 90)) return false;
        if (f === "sem" && c.pedidos) return false;
        if (f === "novos" && !(diasDesde(c.criado_em) <= 30)) return false;
        if (f === "bloqueados" && !bloqueiosDe(c).length) return false;
        if (!termo) return true;
        if (soDig.length >= 4 && [c.cpf, c.cnpj, c.telefone].some((x) => BRso(x).includes(soDig))) return true;
        return slug([nomeCliente(c), c.razao_social, c.nome_fantasia, c.responsavel, c.email, c.cidade, c.uf].join(" ")).includes(termo);
      });
      const por = {
        ultimo: (a, b) => String(b.ultimo_pedido || "").localeCompare(String(a.ultimo_pedido || "")),
        kg: (a, b) => b.kg - a.kg, pedidos: (a, b) => b.pedidos - a.pedidos,
        nome: (a, b) => nomeCliente(a).localeCompare(nomeCliente(b), "pt-BR"),
        cadastro: (a, b) => String(b.criado_em || "").localeCompare(String(a.criado_em || ""))
      };
      return lista.sort(por[ordem] || por.ultimo);
    }
    const BRso = (v) => String(v || "").replace(/\D/g, "");
    const dataCurta = (d) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");
    function desenharClientes() {
      const lista = clientesFiltrados();
      const ativos = clientes.filter((c) => diasDesde(c.ultimo_pedido) <= 90).length;
      $("#clientes-resumo").innerHTML = clientes.length
        ? `<span><strong>${lista.length}</strong> de ${clientes.length} clientes</span><span><strong>${ativos}</strong> compraram nos últimos 90 dias</span><span><strong>${clientes.filter((c) => !c.pedidos).length}</strong> sem pedidos</span>` : "";
      $("#admin-clientes").innerHTML = lista.length ? lista.map((c) => {
        const tel = BRso(c.telefone), inativo = c.pedidos && diasDesde(c.ultimo_pedido) > 90;
        const selo = !c.pedidos ? `<b class="selo-cli sem">Sem pedidos</b>` : inativo ? `<b class="selo-cli inativo">Sem comprar há ${Math.floor(diasDesde(c.ultimo_pedido))} dias</b>` : diasDesde(c.ultimo_pedido) <= 30 ? `<b class="selo-cli ativo">Comprou recentemente</b>` : "";
        const msg = inativo ? `Olá, ${nomeCliente(c)}! Aqui é da Policoating. Faz um tempo que não conversamos — posso ajudar com alguma tinta em pó?` : `Olá, ${nomeCliente(c)}! Aqui é da Policoating.`;
        const bs = bloqueiosDe(c);
        return `<article class="adm-cli" data-email="${esc(c.email || "")}">
          <div class="adm-cli-id">
            <strong>${esc(nomeCliente(c))}</strong> ${bs.length ? seloBloqueio(bs) : selo}
            <small>${c.tipo === "pj" ? "Empresa" : "Pessoa física"}${docCliente(c) ? " · " + esc(docCliente(c)) : ""}${c.tipo === "pj" && c.responsavel ? " · " + esc(c.responsavel) : ""}</small>
            <small>${esc(c.email || "")}${c.telefone ? " · " + esc(c.telefone) : ""}</small>
            ${c.cidade ? `<small>${esc(c.cidade)}/${esc(c.uf || "")}</small>` : ""}
            ${bs.map((b) => `<small class="motivo-bloqueio">Motivo: ${esc(b.motivo)}${b.criado_por ? ` · por ${esc(b.criado_por)}` : ""} · ${dataCurta(b.criado_em)}</small>`).join("")}
          </div>
          <dl class="adm-cli-num">
            <div><dt>Pedidos</dt><dd>${c.pedidos}</dd></div>
            <div><dt>Total</dt><dd>${Math.round(c.kg).toLocaleString("pt-BR")} kg</dd></div>
            <div><dt>Último pedido</dt><dd>${dataCurta(c.ultimo_pedido)}</dd></div>
            <div><dt>Cliente desde</dt><dd>${dataCurta(c.criado_em)}</dd></div>
          </dl>
          <div class="adm-cli-acoes">
            ${c.pedidos ? `<button type="button" class="btn btn-contorno-azul" data-ver-pedidos="${esc(c.email || nomeCliente(c))}">Ver pedidos</button>` : ""}
            ${tel ? `<a class="btn btn-whats" target="_blank" rel="noopener" href="https://wa.me/${tel.length <= 11 ? "55" + tel : tel}?text=${encodeURIComponent(msg)}">WhatsApp</a>` : ""}
            ${!ehAdmin ? "" : bs.length ? `<button type="button" class="btn-bloquear" data-desbloquear="${esc(c.email || "")}">Desbloquear</button>`
              : `<button type="button" class="btn-bloquear" data-bloquear="${esc(c.email || "")}">Suspender / bloquear</button>`}
            ${ehAdmin ? `<button type="button" class="btn-excluir-cli" data-excluir-cli="${esc(c.email || "")}">Excluir</button>` : ""}
          </div>
        </article>`;
      }).join("") : `<p class="dica">${!clientesCarregados ? "Carregando..." : clientes.length ? "Nenhum cliente encontrado com essa busca." : "Nenhum cliente cadastrado ainda."}</p>`;
    }
    /* ---------- Excluir cliente (só administradores) ---------- */
    let clienteExcluir = null;
    const dlgExcluir = $("#dlg-excluir-cli");
    const fecharExcluir = () => { if (dlgExcluir.close) dlgExcluir.close(); else dlgExcluir.removeAttribute("open"); clienteExcluir = null; };
    $("#admin-clientes").addEventListener("click", (e) => {
      const b = e.target.closest("[data-excluir-cli]"); if (!b) return;
      const c = clientes.find((x) => String(x.email || "") === b.dataset.excluirCli); if (!c) return;
      clienteExcluir = c;
      $("#excluir-cli-quem").textContent = `${nomeCliente(c)}${docCliente(c) ? " · " + docCliente(c) : ""} · ${c.email || ""} · ${c.pedidos} ${c.pedidos === 1 ? "pedido" : "pedidos"}`;
      $("#excluir-cli-pedidos").checked = false; $("#excluir-cli-confirma").value = ""; $("#excluir-cli-erro").textContent = "";
      $("#excluir-cli-pedidos").closest("label").hidden = $("#excluir-cli-dica-pedidos").hidden = !c.pedidos;
      if (dlgExcluir.showModal) dlgExcluir.showModal(); else dlgExcluir.setAttribute("open", "");
      $("#excluir-cli-confirma").focus();
    });
    $("#excluir-cli-cancelar").addEventListener("click", fecharExcluir);
    $("#form-excluir-cli").addEventListener("submit", async (e) => {
      e.preventDefault();
      const c = clienteExcluir; if (!c) return;
      if ($("#excluir-cli-confirma").value.trim().toUpperCase() !== "EXCLUIR") { $("#excluir-cli-erro").textContent = 'Digite EXCLUIR para confirmar.'; return; }
      const bt = $("#form-excluir-cli .confirmar"); bt.disabled = true;
      try {
        await A.excluirCliente(c, $("#excluir-cli-pedidos").checked);
        fecharExcluir(); CW.mostrarToast(`${esc(nomeCliente(c))} foi excluído.`); await carregarClientes();
      } catch (err) { $("#excluir-cli-erro").textContent = err.message; }
      bt.disabled = false;
    });

    /* ---------- Suspender / bloquear cliente (só administradores) ---------- */
    let clienteBloqueio = null;
    const dlgBloqueio = $("#dlg-bloqueio");
    $("#admin-clientes").addEventListener("click", async (e) => {
      const bb = e.target.closest("[data-bloquear]"), bd = e.target.closest("[data-desbloquear]");
      if (!bb && !bd) return;
      const c = clientes.find((x) => String(x.email || "") === (bb || bd).getAttribute(bb ? "data-bloquear" : "data-desbloquear"));
      if (!c) return;
      if (bb) {
        clienteBloqueio = c;
        $("#bloqueio-quem").textContent = `${nomeCliente(c)}${docCliente(c) ? " · " + docCliente(c) : ""} · ${c.email || ""}`;
        $("#bloqueio-motivo").value = ""; $("#bloqueio-dias").value = "30"; $("#bloqueio-erro").textContent = "";
        if (dlgBloqueio.showModal) dlgBloqueio.showModal(); else dlgBloqueio.setAttribute("open", "");
        $("#bloqueio-motivo").focus();
        return;
      }
      if (!confirm(`Desbloquear ${nomeCliente(c)}?\n\nEle volta a poder enviar pedidos pelo site.`)) return;
      bd.disabled = true;
      try { await A.desbloquearCliente(bloqueiosDe(c).map((b) => b.id)); CW.mostrarToast(`${esc(nomeCliente(c))} foi desbloqueado.`); await carregarClientes(); }
      catch (err) { bd.disabled = false; $("#clientes-erro").textContent = err.message; }
    });
    const fecharBloqueio = () => { if (dlgBloqueio.close) dlgBloqueio.close(); else dlgBloqueio.removeAttribute("open"); clienteBloqueio = null; };
    $("#bloqueio-cancelar").addEventListener("click", fecharBloqueio);
    $("#form-bloqueio").addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!clienteBloqueio) return;
      const dias = $("#bloqueio-dias").value, botao = $("#form-bloqueio .confirmar"), nome = nomeCliente(clienteBloqueio);
      botao.disabled = true; $("#bloqueio-erro").textContent = "";
      try {
        await A.bloquearCliente(clienteBloqueio, dias, $("#bloqueio-motivo").value);
        fecharBloqueio();
        CW.mostrarToast(dias ? `${esc(nome)} foi suspenso por ${dias} dias.` : `${esc(nome)} foi bloqueado.`);
        await carregarClientes();
      } catch (err) { $("#bloqueio-erro").textContent = err.message; }
      finally { botao.disabled = false; }
    });

    $("#clientes-busca").addEventListener("input", desenharClientes);
    $("#clientes-filtro").addEventListener("change", desenharClientes);
    $("#clientes-ordem").addEventListener("change", desenharClientes);
    $("#clientes-atualizar").addEventListener("click", carregarClientes);
    $("#admin-clientes").addEventListener("click", (e) => {
      const b = e.target.closest("[data-ver-pedidos]"); if (!b) return;
      $("#pedidos-busca").value = b.dataset.verPedidos; $("#pedidos-periodo").value = "0";
      abrirAba("pedidos");
    });
    $("#clientes-csv").addEventListener("click", () => {
      if (!podeExportar) return;
      const cel = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
      const linhas = [["Cliente", "Tipo", "Razão social", "CPF/CNPJ", "Inscrição estadual", "Responsável", "E-mail", "Telefone", "CEP", "Endereço", "Bairro", "Cidade", "UF", "Pedidos", "Total kg", "Último pedido", "Cliente desde"]];
      clientesFiltrados().forEach((c) => linhas.push([nomeCliente(c), c.tipo === "pj" ? "Empresa" : "Pessoa física", c.razao_social || "", c.cnpj || c.cpf || "", c.inscricao_estadual || "",
        c.responsavel || "", c.email || "", c.telefone || "", c.cep || "", [c.logradouro, c.numero, c.complemento].filter(Boolean).join(", "), c.bairro || "", c.cidade || "", c.uf || "",
        c.pedidos, Math.round(c.kg), dataCurta(c.ultimo_pedido), dataCurta(c.criado_em)]));
      const csv = "\ufeff" + linhas.map((l) => l.map(cel).join(";")).join("\r\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      a.download = `clientes-policoating-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
    });

    /* ---------- Contato e links ---------- */
    const formCfg = $("#form-config");
    let cfgAtual = null;
    async function carregarConfig() {
      try { cfgAtual = await A.lerConfig(); } catch (e) { $("#cfg-erro").textContent = e.message; return; }
      $$("input[name]", formCfg).forEach((i) => {
        const [grupo, chave] = i.name.split(".");
        i.value = (chave ? (cfgAtual[grupo] || {})[chave] : cfgAtual[grupo]) || "";
      });
    }
    formCfg.addEventListener("submit", async (e) => {
      e.preventDefault();
      const d = { redes: {}, lojas: {}, galeria: cfgAtual ? cfgAtual.galeria : undefined };
      const ruins = [];
      $$("input[name]", formCfg).forEach((i) => {
        const [grupo, chave] = i.name.split("."), v = i.value.trim();
        if (chave) { if (v && !/^https:\/\//.test(v)) ruins.push(i.previousSibling.textContent.trim()); d[grupo][chave] = v; }
        else d[grupo] = v;
      });
      if (ruins.length) { $("#cfg-erro").textContent = "Estes links precisam começar com https:// → " + ruins.join(", "); return; }
      const b = $("button[type=submit]", formCfg); b.disabled = true;
      try { await A.salvarConfig(d); $("#cfg-erro").textContent = ""; CW.mostrarToast("Contato e links salvos. O site já usa os novos dados."); document.dispatchEvent(new CustomEvent("config-atualizada")); }
      catch (err) { $("#cfg-erro").textContent = err.message; }
      finally { b.disabled = false; }
    });

    /* ---------- Galeria ---------- */
    let fotosGaleria = [];
    async function carregarGaleria() {
      try { fotosGaleria = (await A.lerConfig()).galeria.slice(); } catch (e) { $("#galeria-erro").textContent = e.message; return; }
      desenharGaleria();
    }
    function desenharGaleria() {
      $("#admin-galeria").innerHTML = fotosGaleria.length ? fotosGaleria.map((g, i) => `
        <figure class="admin-foto" data-i="${i}">
          <img src="${esc(g.src)}" alt="">
          <input class="g-titulo" value="${esc(g.titulo)}" placeholder="Título" maxlength="80" aria-label="Título">
          <input class="g-desc" value="${esc(g.descricao)}" placeholder="Descrição" maxlength="140" aria-label="Descrição">
          <div class="admin-foto-acoes">
            <button type="button" data-mover="-1" aria-label="Mover para a esquerda" ${i ? "" : "disabled"}>‹</button>
            <button type="button" data-mover="1" aria-label="Mover para a direita" ${i < fotosGaleria.length - 1 ? "" : "disabled"}>›</button>
            <button type="button" data-remover class="perigo">Remover</button>
          </div>
        </figure>`).join("") : `<p class="dica">Nenhuma foto. Envie fotos para montar a galeria.</p>`;
    }
    const lerCamposGaleria = () => $$(".admin-foto", $("#admin-galeria")).forEach((f) => {
      const g = fotosGaleria[+f.dataset.i]; g.titulo = $(".g-titulo", f).value.trim(); g.descricao = $(".g-desc", f).value.trim();
    });
    $("#admin-galeria").addEventListener("click", (e) => {
      const f = e.target.closest(".admin-foto"); if (!f) return;
      lerCamposGaleria();
      const i = +f.dataset.i;
      const mover = e.target.closest("[data-mover]");
      if (mover) { const j = i + Number(mover.dataset.mover); [fotosGaleria[i], fotosGaleria[j]] = [fotosGaleria[j], fotosGaleria[i]]; desenharGaleria(); }
      if (e.target.closest("[data-remover]")) { fotosGaleria.splice(i, 1); desenharGaleria(); }
    });
    $("#galeria-arquivos").addEventListener("change", async (e) => {
      lerCamposGaleria();
      const arquivos = Array.from(e.target.files); e.target.value = "";
      for (const arq of arquivos) {
        try { fotosGaleria.push({ src: await A.enviarFoto(arq, "galeria"), titulo: arq.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "), descricao: "" }); desenharGaleria(); }
        catch (err) { $("#galeria-erro").textContent = err.message; }
      }
    });
    $("#btn-salvar-galeria").addEventListener("click", async (e) => {
      lerCamposGaleria();
      e.target.disabled = true;
      try {
        const cfg = await A.lerConfig();
        await A.salvarConfig(Object.assign(cfg, { galeria: fotosGaleria }));
        $("#galeria-erro").textContent = ""; CW.mostrarToast("Galeria salva.");
      } catch (err) { $("#galeria-erro").textContent = err.message; }
      finally { e.target.disabled = false; }
    });

    /* ---------- Equipe (só administradores) ---------- */
    const CARGOS = { admin: "Administrador", vendedor: "Vendedor" };
    async function carregarEquipe() {
      let lista = [];
      try { lista = await A.listarEquipe(); } catch (e) { $("#equipe-erro").textContent = e.message; }
      const eu = String(window.Conta.usuario.email).toLowerCase(), icone = window.Icone ? window.Icone("usuario") : "";
      $("#admin-equipe").innerHTML = lista.map((m) => {
        const souEu = m.email.toLowerCase() === eu;
        const daEmpresa = m.email.toLowerCase().endsWith("@" + A.dominioEquipe());
        const btnEmail = `<button type="button" class="btn-email-empresa" data-email-empresa title="${daEmpresa ? "Trocar o e-mail da empresa" : "Definir o e-mail da empresa para o login"}">${daEmpresa ? "Trocar e-mail" : "E-mail da empresa"}</button>`;
        return `<li data-email="${esc(m.email)}"><span>${icone}${esc(m.email)}${souEu ? " <em>(você)</em>" : ""}${daEmpresa ? ' <small class="selo-empresa">e-mail da empresa</small>' : ""}</span>
          <div class="equipe-acoes">${souEu ? `<b class="cargo cargo-${m.papel}">${CARGOS[m.papel]}</b>${btnEmail}`
            : `${m.papel === "admin" ? "" : `<label class="check-excluir"><input type="checkbox" data-permissao="pode_excluir" ${m.pode_excluir ? "checked" : ""}> Pode excluir pedidos</label>
               <label class="check-excluir"><input type="checkbox" data-permissao="pode_exportar" ${m.pode_exportar ? "checked" : ""}> Pode exportar clientes</label>`}
               <select data-cargo aria-label="Cargo de ${esc(m.email)}">${Object.entries(CARGOS).map(([k, v]) => `<option value="${k}" ${k === m.papel ? "selected" : ""}>${v}</option>`).join("")}</select>
               ${btnEmail}<button type="button" class="perigo" data-remover-membro>Remover</button>`}</div></li>`;
      }).join("");
    }
    // "joao" ou "joao@policoatingtintas.com.br" = e-mail da empresa (pede o pessoal); outro e-mail completo = entra com ele mesmo
    const loginEquipe = () => {
      const v = $("#equipe-email").value.trim().toLowerCase(), dominio = A.dominioEquipe();
      if (!v) return { vazio: true, empresa: true };
      if (!v.includes("@")) return { empresa: true, apelido: v, email: `${v}@${dominio}` };
      if (v.endsWith("@" + dominio)) return { empresa: true, apelido: v.split("@")[0], email: v };
      return { empresa: false, email: v };
    };
    function mostrarPrevia() {
      const l = loginEquipe();
      $("#equipe-pessoal-campo").hidden = !l.empresa;
      $("#equipe-previa").innerHTML = l.vazio
        ? `Digite um nome (ex.: <strong>joao</strong>) para criar o e-mail da empresa, ou um e-mail completo para a pessoa entrar com ele mesmo.`
        : l.empresa
          ? `Login: <strong>${esc(l.email)}</strong>. O apelido é criado sozinho e o código chega no e-mail pessoal${$("#equipe-pessoal").value.trim() ? ` (<strong>${esc($("#equipe-pessoal").value.trim())}</strong>)` : ""}.`
          : `A pessoa entra com <strong>${esc(l.email)}</strong> (sem e-mail da empresa).`;
    }
    $("#equipe-email").addEventListener("input", mostrarPrevia);
    $("#equipe-pessoal").addEventListener("input", mostrarPrevia);
    mostrarPrevia();
    $("#form-equipe").addEventListener("submit", async (e) => {
      e.preventDefault();
      const l = loginEquipe(), cargo = $("#equipe-cargo").value, botao = e.submitter || $("#form-equipe button");
      if (l.vazio) { $("#equipe-erro").textContent = "Digite o nome do e-mail da empresa ou um e-mail completo."; return; }
      botao.disabled = true; $("#equipe-erro").textContent = "";
      try {
        if (l.empresa) {
          const r = await A.adicionarMembroEmpresa(l.apelido, $("#equipe-pessoal").value, cargo);
          CW.mostrarToast(`${CARGOS[cargo]} adicionado: ${esc(r.email)}.${r.aviso === "ok" ? " A pessoa recebeu as instruções no e-mail pessoal." : ""}`);
        } else {
          await A.salvarMembro(l.email, cargo);
          CW.mostrarToast(`${CARGOS[cargo]} adicionado.`);
        }
        $("#equipe-email").value = ""; $("#equipe-pessoal").value = ""; mostrarPrevia(); carregarEquipe();
      } catch (err) { $("#equipe-erro").textContent = err.message; }
      finally { botao.disabled = false; }
    });
    $("#admin-equipe").addEventListener("change", async (e) => {
      const chk = e.target.closest("[data-permissao]");
      if (chk) {
        const email = chk.closest("[data-email]").dataset.email, oque = { pode_excluir: "excluir pedidos", pode_exportar: "exportar clientes" }[chk.dataset.permissao];
        try { await A.permitir(email, chk.dataset.permissao, chk.checked); CW.mostrarToast(chk.checked ? `${email} agora pode ${oque}.` : `${email} não pode mais ${oque}.`); }
        catch (err) { chk.checked = !chk.checked; $("#equipe-erro").textContent = err.message; }
        return;
      }
      const sel = e.target.closest("[data-cargo]"); if (!sel) return;
      const email = sel.closest("[data-email]").dataset.email;
      try { await A.salvarMembro(email, sel.value); CW.mostrarToast(`${email} agora é ${CARGOS[sel.value]}.`); carregarEquipe(); }
      catch (err) { $("#equipe-erro").textContent = err.message; carregarEquipe(); }
    });
    $("#admin-equipe").addEventListener("click", async (e) => {
      const be = e.target.closest("[data-email-empresa]");
      if (be) {
        const atual = be.closest("[data-email]").dataset.email, dominio = A.dominioEquipe();
        const eu = String(window.Conta.usuario.email).toLowerCase() === atual.toLowerCase();
        const sugestao = atual.toLowerCase().endsWith("@" + dominio) ? atual : atual.split("@")[0].normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9.]+/g, ".").replace(/^\.+|\.+$/g, "") + "@" + dominio;
        const novo = (prompt(`E-mail da empresa para o login de ${atual}\n(precisa terminar em @${dominio})`, sugestao) || "").trim().toLowerCase();
        if (!novo) return;
        if (!novo.endsWith("@" + dominio) || !/^[^\s@*]+@/.test(novo)) { $("#equipe-erro").textContent = `O e-mail da empresa precisa terminar em @${dominio}.`; return; }
        if (!confirm(`Trocar o login de ${atual} para ${novo}?\n\nO e-mail da empresa passa a redirecionar para ${atual.toLowerCase().endsWith("@" + dominio) ? "a mesma caixa de antes" : atual}, e é por lá que chegam os códigos.\n\nA pessoa recebe um aviso por e-mail.${eu ? "\n\nComo é o seu próprio login, você vai sair e entrar de novo com o e-mail novo." : ""}`)) return;
        be.disabled = true; $("#equipe-erro").textContent = "";
        try {
          const r = await A.definirEmailEmpresa(atual, novo);
          CW.mostrarToast(`Login trocado para ${esc(r.novo)}.${r.aviso === "ok" ? " A pessoa foi avisada por e-mail." : ""}`);
          if (eu) { await window.Conta.sair(); location.href = "conta.html"; return; }
          carregarEquipe();
        } catch (err) { be.disabled = false; $("#equipe-erro").textContent = err.message; }
        return;
      }
      const b = e.target.closest("[data-remover-membro]"); if (!b) return;
      const email = b.closest("[data-email]").dataset.email;
      if (!confirm(`Remover o acesso de ${email}?${email.toLowerCase().endsWith("@" + A.dominioEquipe()) ? "\n\nO e-mail da empresa também é apagado (para de redirecionar)." : ""}`)) return;
      try { const r = await A.removerMembro(email) || {}; carregarEquipe(); CW.mostrarToast(r.apelido === "apagado" ? "Acesso removido e e-mail da empresa apagado." : "Acesso removido."); }
      catch (err) { $("#equipe-erro").textContent = err.message; }
    });

    /* ---------- Notas de entrada (NFs de compra: lote, NF, fornecedor e arquivos) ---------- */
    let notas = [], notaArquivos = [];
    const diaBR = (d) => (d ? new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString("pt-BR") : "");
    const tamanho = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.max(1, Math.round(b / 1024)) + " KB");
    const extDe = (n) => (String(n).toLowerCase().match(/\.([a-z0-9]+)$/) || [, "arq"])[1];
    const podeVer = (a) => /^(pdf|jpg|jpeg|png)$/.test(extDe(a.nome));
    function desenharEscolhidos() {
      $("#nota-escolhidos").innerHTML = notaArquivos.map((f, i) => `<li><b class="ext ext-${esc(extDe(f.name))}">${esc(extDe(f.name).toUpperCase())}</b>
        <span>${esc(f.name)}</span><small>${tamanho(f.size)}</small><button type="button" data-tirar="${i}" aria-label="Tirar ${esc(f.name)}">×</button></li>`).join("");
    }
    $("#nota-arquivos").addEventListener("change", (e) => {
      notaArquivos = notaArquivos.concat(Array.from(e.target.files)).slice(0, 5); e.target.value = "";
      $("#nota-erro").textContent = ""; desenharEscolhidos();
    });
    $("#nota-escolhidos").addEventListener("click", (e) => {
      const b = e.target.closest("[data-tirar]"); if (!b) return;
      notaArquivos.splice(+b.dataset.tirar, 1); desenharEscolhidos();
    });
    // fornecedor já usado: preenche o código sozinho
    $("#nota-form").fornecedor.addEventListener("change", (e) => {
      const f = e.target.value.trim().toLowerCase(), cod = $("#nota-form").fornecedor_codigo;
      const achou = notas.find((n) => n.fornecedor.toLowerCase() === f && n.fornecedor_codigo);
      if (achou && !cod.value) cod.value = achou.fornecedor_codigo;
    });
    $("#nota-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target, btn = $("#nota-salvar");
      const campos = { lote: f.lote.value, nf: f.nf.value, fornecedor: f.fornecedor.value, fornecedor_codigo: f.fornecedor_codigo.value, data_nf: f.data_nf.value, obs: f.obs.value };
      const repetida = notas.find((n) => n.nf.replace(/\D/g, "") && n.nf.replace(/\D/g, "") === campos.nf.replace(/\D/g, "") && n.fornecedor.toLowerCase() === campos.fornecedor.trim().toLowerCase());
      if (repetida && !confirm(`Já existe a NF ${repetida.nf} de ${repetida.fornecedor} (lote ${repetida.lote}). Guardar mesmo assim?`)) return;
      btn.disabled = true; btn.textContent = "Enviando..."; $("#nota-erro").textContent = "";
      try {
        await A.salvarNota(campos, notaArquivos);
        f.reset(); notaArquivos = []; desenharEscolhidos();
        CW.mostrarToast("Nota guardada.");
        await carregarNotas();
      } catch (err) { $("#nota-erro").textContent = err.message; }
      btn.disabled = false; btn.textContent = "Salvar nota";
    });
    async function carregarNotas() {
      $("#notas-erro").textContent = "";
      try { notas = await A.listarNotas(); }
      catch (e) { notas = []; $("#notas-erro").textContent = e.message; }
      const fornecedores = [...new Set(notas.map((n) => n.fornecedor))].sort((a, b) => a.localeCompare(b, "pt-BR"));
      $("#notas-fornecedores").innerHTML = fornecedores.map((x) => `<option value="${esc(x)}">`).join("");
      desenharNotas();
    }
    function desenharNotas() {
      const termo = slug($("#notas-busca").value || "").replace(/-/g, " ").trim(), dias = +$("#notas-periodo").value || 0;
      const lista = notas.filter((n) => {
        if (dias && diasDesde(n.data_nf || n.criado_em) > dias) return false;
        if (!termo) return true;
        const alvo = slug([n.lote, n.nf, n.fornecedor, n.fornecedor_codigo, n.obs].join(" ")).replace(/-/g, " ");
        return termo.split(" ").every((t) => alvo.includes(t));
      });
      $("#notas-resumo").innerHTML = `<b>${lista.length}</b> ${lista.length === 1 ? "nota" : "notas"}${lista.length !== notas.length ? ` de ${notas.length}` : ""}`;
      $("#notas-lista").innerHTML = lista.length ? lista.map((n) => `<article class="nota-cartao" data-nota="${esc(String(n.id))}">
          <div class="nota-topo">
            <div><span class="nota-rotulo">Lote</span><strong class="nota-lote">${esc(n.lote)}</strong></div>
            <div><span class="nota-rotulo">NF</span><strong>${esc(n.nf)}</strong></div>
            <div><span class="nota-rotulo">Fornecedor</span><strong>${esc(n.fornecedor)}</strong>${n.fornecedor_codigo ? ` <small>cód. ${esc(n.fornecedor_codigo)}</small>` : ""}</div>
            ${n.data_nf ? `<div><span class="nota-rotulo">Data da NF</span><strong>${diaBR(n.data_nf)}</strong></div>` : ""}
          </div>
          ${n.obs ? `<p class="nota-obs">${esc(n.obs)}</p>` : ""}
          <ul class="nota-arqs">${(n.arquivos || []).map((a, i) => `<li><b class="ext ext-${esc(extDe(a.nome))}">${esc(extDe(a.nome).toUpperCase())}</b><span>${esc(a.nome)}</span>${a.tamanho ? `<small>${tamanho(a.tamanho)}</small>` : ""}
              ${podeVer(a) ? `<button type="button" class="btn-mini" data-ver="${i}">Abrir</button>` : ""}<button type="button" class="btn-mini" data-baixar="${i}">Baixar</button></li>`).join("")}</ul>
          <p class="nota-rodape">Guardada ${diaBR(n.criado_em)}${n.criado_por ? ` por ${esc(n.criado_por)}` : ""}${ehAdmin ? ` · <button type="button" class="link-perigo" data-excluir-nota>Excluir</button>` : ""}</p>
        </article>`).join("") : `<p class="dica">${notas.length ? "Nenhuma nota encontrada com essa busca." : "Nenhuma nota guardada ainda. Preencha o lote, a NF e o fornecedor acima e escolha o arquivo."}</p>`;
    }
    $("#notas-busca").addEventListener("input", desenharNotas);
    $("#notas-periodo").addEventListener("change", desenharNotas);
    $("#notas-atualizar").addEventListener("click", carregarNotas);
    $("#notas-lista").addEventListener("click", async (e) => {
      const card = e.target.closest("[data-nota]"); if (!card) return;
      const n = notas.find((x) => String(x.id) === card.dataset.nota); if (!n) return;
      const bv = e.target.closest("[data-ver]"), bb = e.target.closest("[data-baixar]");
      if (bv || bb) {
        const arq = n.arquivos[+(bv || bb).dataset[bv ? "ver" : "baixar"]];
        const janela = bv ? window.open("", "_blank") : null;   // abre já (o navegador bloqueia janela aberta depois de esperar)
        try {
          const url = await A.linkArquivoNota(arq, !!bb);
          if (janela) { janela.opener = null; janela.location.href = url; }
          else { const a = document.createElement("a"); a.href = url; a.download = arq.nome; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove(); }
        } catch (err) { if (janela) janela.close(); $("#notas-erro").textContent = err.message; }
        return;
      }
      if (e.target.closest("[data-excluir-nota]")) {
        if (!confirm(`Excluir a NF ${n.nf} (${n.fornecedor}, lote ${n.lote}) e os arquivos dela?\n\nNão dá para desfazer.`)) return;
        try { await A.excluirNota(n); CW.mostrarToast("Nota excluída."); await carregarNotas(); }
        catch (err) { $("#notas-erro").textContent = err.message; }
      }
    });

    /* ---------- Relatórios: vendas da semana, relatório do mês e cópia de segurança ---------- */
    const CANCELADOS = ["cancelado", "cancelada", "reembolsado"];
    const SITUACAO = { recebido: "Recebido", confirmado: "Confirmado", confirmada: "Confirmado", enviado: "Enviado", entregue: "Entregue", cancelado: "Cancelado", cancelada: "Cancelado", reembolsado: "Reembolsado" };
    const diaISO = (d) => d.toLocaleDateString("sv-SE");   // AAAA-MM-DD no horário local
    const dBR = (iso) => (iso ? new Date(iso.length === 10 ? iso + "T12:00:00" : iso).toLocaleDateString("pt-BR") : "");
    const hBR = (iso) => (iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "");
    const r2 = (n) => Math.round((+n || 0) * 100) / 100;
    const docRel = (c) => (c.tipo === "pj" ? c.cnpj : c.cpf) || "";
    const vendido = (p) => !CANCELADOS.includes(String(p.status || "").toLowerCase());
    function semana(desloc) {
      const hoje = new Date(), seg = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - ((hoje.getDay() + 6) % 7) + 7 * desloc);
      const dom = new Date(seg.getFullYear(), seg.getMonth(), seg.getDate() + 6);
      $("#rel-sem-de").value = diaISO(seg); $("#rel-sem-ate").value = diaISO(dom);
    }
    let relPronto = false;
    function prepararRelatorios() {
      if (relPronto) return; relPronto = true;
      semana(0);
      const h = new Date(); $("#rel-mes").value = `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}`;
      if (!ehAdmin) $("#rel-backup").remove();
      previaSemana(); previaMes();
    }
    $$("[data-semana]").forEach((b) => b.addEventListener("click", () => { semana(+b.dataset.semana); previaSemana(); }));
    ["#rel-sem-de", "#rel-sem-ate"].forEach((id) => $(id).addEventListener("change", previaSemana));
    $("#rel-mes").addEventListener("change", previaMes);

    function periodoSemana() {
      const de = $("#rel-sem-de").value, ate = $("#rel-sem-ate").value;
      if (!de || !ate) throw new Error("Escolha as datas da semana.");
      if (ate < de) throw new Error("A data final é antes da inicial.");
      if ((new Date(ate) - new Date(de)) / 864e5 > 92) throw new Error("Escolha um período de no máximo 3 meses.");
      return { de, ate };
    }
    function periodoMes() {
      const m = $("#rel-mes").value; if (!/^\d{4}-\d{2}$/.test(m)) throw new Error("Escolha o mês.");
      const [a, mm] = m.split("-").map(Number), fim = new Date(a, mm, 0).getDate();
      return { de: `${m}-01`, ate: `${m}-${String(fim).padStart(2, "0")}`, nome: new Date(a, mm - 1, 15).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) };
    }
    function resumo(pedidos) {
      const ok = pedidos.filter(vendido), clientesU = new Set(ok.map((p) => p.cliente_id || (p.cliente || {}).email));
      const total = r2(ok.reduce((s, p) => s + valorPedido(p), 0)), kg = r2(ok.reduce((s, p) => s + kgPedido(p), 0));
      return { pedidos: ok.length, cancelados: pedidos.length - ok.length, total, kg, clientes: clientesU.size, ticket: ok.length ? r2(total / ok.length) : 0 };
    }
    function maisVendidos(pedidos) {
      const m = new Map();
      pedidos.filter(vendido).forEach((p) => (p.itens || []).forEach((i) => {
        const k = i.codigo || i.id || i.nome, x = m.get(k) || { codigo: i.codigo || "", nome: i.nome || "", kg: 0, valor: 0, pedidos: new Set(), clientes: new Set(), combinar: 0 };
        x.kg += kgItem(i); if (i.preco_kg != null) x.valor += (+i.preco_kg) * kgItem(i); else x.combinar++;
        x.pedidos.add(p.numero); x.clientes.add(p.cliente_id || (p.cliente || {}).email); m.set(k, x);
      }));
      return [...m.values()].map((x) => ({ codigo: x.codigo, nome: x.nome, kg: r2(x.kg), valor: r2(x.valor), pedidos: x.pedidos.size, clientes: x.clientes.size, combinar: x.combinar }))
        .sort((a, b) => b.kg - a.kg || b.valor - a.valor);
    }
    const linhaPedido = (p) => { const c = p.cliente || {}; return [p.numero, hBR(p.criado_em), SITUACAO[p.status] || p.status || "", nomeCliente(c), docRel(c), c.email || "", c.telefone || "", [c.cidade, c.uf].filter(Boolean).join("/"), r2(kgPedido(p)), vendido(p) ? r2(valorPedido(p)) : 0, (p.itens || []).some((i) => i.preco_kg == null) ? "sim" : "", p.observacoes || ""]; };
    const CAB_PEDIDOS = ["Pedido", "Data", "Situação", "Cliente", "CPF/CNPJ", "E-mail", "Telefone", "Cidade/UF", "Kg", "Valor (R$)", "Tem item a combinar", "Observações"];
    const linhasItens = (pedidos) => pedidos.flatMap((p) => (p.itens || []).map((i) => [p.numero, dBR(p.criado_em), SITUACAO[p.status] || p.status || "", nomeCliente(p.cliente || {}), i.codigo || "", i.nome || "", i.embalagem || "", +i.qtd || 0, r2(kgItem(i)), i.preco_kg != null ? r2(i.preco_kg) : "a combinar", i.preco_kg != null ? r2((+i.preco_kg) * kgItem(i)) : ""]));
    const CAB_ITENS = ["Pedido", "Data", "Situação", "Cliente", "Código", "Produto", "Embalagem", "Qtd", "Kg", "R$/kg", "Valor (R$)"];
    const notasDoPeriodo = (lista, de, ate) => lista.filter((n) => { const d = n.data_nf || diaISO(new Date(n.criado_em)); return d >= de && d <= ate; })
      .sort((a, b) => String(a.data_nf || a.criado_em).localeCompare(String(b.data_nf || b.criado_em)));

    async function previaSemana() {
      const el = $("#rel-sem-previa"); let per; try { per = periodoSemana(); } catch (e) { el.textContent = e.message; return; }
      el.textContent = "Calculando...";
      try { const r = resumo(await A.pedidosPeriodo(per.de, per.ate)); el.innerHTML = `${dBR(per.de)} a ${dBR(per.ate)}: <b>${r.pedidos}</b> ${r.pedidos === 1 ? "pedido" : "pedidos"} · <b>${r.kg.toLocaleString("pt-BR")}</b> kg · <b>${fmtR(r.total)}</b>${r.cancelados ? ` · ${r.cancelados} cancelado(s)` : ""}`; }
      catch (e) { el.textContent = e.message; }
    }
    async function previaMes() {
      const el = $("#rel-mes-previa"); let per; try { per = periodoMes(); } catch (e) { el.textContent = e.message; return; }
      el.textContent = "Calculando...";
      try {
        const [ped, nts] = await Promise.all([A.pedidosPeriodo(per.de, per.ate), A.listarNotas().catch(() => [])]);
        const r = resumo(ped), top = maisVendidos(ped)[0], nn = notasDoPeriodo(nts, per.de, per.ate).length;
        el.innerHTML = `${per.nome}: <b>${r.pedidos}</b> pedidos · <b>${fmtR(r.total)}</b> · <b>${nn}</b> ${nn === 1 ? "nota" : "notas"} de entrada${top ? `<br>Mais vendido: <b>${esc(top.nome)}</b> (${top.kg.toLocaleString("pt-BR")} kg)` : ""}`;
      } catch (e) { el.textContent = e.message; }
    }

    // Planilha do Excel (.xlsx) com várias abas; se a biblioteca não carregar, baixa CSV da primeira aba de dados
    let xlsxPromessa = null;
    const carregarXlsx = () => (xlsxPromessa = xlsxPromessa || new Promise((ok, falha) => {
      if (window.XLSX) return ok(window.XLSX);
      const sc = document.createElement("script"); sc.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
      sc.onload = () => (window.XLSX ? ok(window.XLSX) : falha(new Error("x"))); sc.onerror = () => { xlsxPromessa = null; falha(new Error("x")); };
      document.head.appendChild(sc);
    }));
    function baixarArquivo(blob, nome) {
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nome;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }
    async function baixarPlanilha(nome, abas) {
      try {
        const X = await carregarXlsx(), wb = X.utils.book_new();
        abas.forEach(([titulo, linhas]) => {
          const ws = X.utils.aoa_to_sheet(linhas);
          ws["!cols"] = (linhas[0] || []).map((_, j) => ({ wch: Math.min(48, Math.max(8, ...linhas.map((l) => String(l[j] == null ? "" : l[j]).length + 2))) }));
          X.utils.book_append_sheet(wb, ws, titulo.slice(0, 31));
        });
        X.writeFile(wb, nome + ".xlsx");
      } catch (e) {
        const cel = (v) => (typeof v === "number" ? String(v).replace(".", ",") : `"${String(v == null ? "" : v).replace(/"/g, '""')}"`);
        const csv = "\ufeff" + abas.map(([t, l]) => [[t]].concat(l).map((x) => x.map(cel).join(";")).join("\r\n")).join("\r\n\r\n");
        baixarArquivo(new Blob([csv], { type: "text/csv;charset=utf-8" }), nome + ".csv");
      }
    }
    // Versão para imprimir / salvar em PDF (abre numa janela nova)
    function abrirImpressao(janela, titulo, subtitulo, blocos) {
      const tabela = (cab, linhas, direita) => `<table><thead><tr>${cab.map((c, j) => `<th${direita.includes(j) ? ' class="n"' : ""}>${esc(c)}</th>`).join("")}</tr></thead><tbody>${linhas.length ? linhas.map((l) => `<tr>${l.map((v, j) => `<td${direita.includes(j) ? ' class="n"' : ""}>${esc(typeof v === "number" ? v.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : v)}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${cab.length}" class="vazio">Nada no período.</td></tr>`}</tbody></table>`;
      janela.document.open();
      janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>
        body{font:13px/1.45 system-ui,Segoe UI,Arial,sans-serif;color:#111418;margin:28px}h1{font-size:20px;margin:0}h2{font-size:15px;margin:24px 0 8px;color:#1558d6}
        .sub{color:#5a6775;margin:2px 0 16px}.cards{display:flex;flex-wrap:wrap;gap:10px}.card{border:1px solid #d6dde6;border-radius:8px;padding:8px 12px;min-width:120px}
        .card b{display:block;font-size:17px}.card span{color:#5a6775;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
        table{width:100%;border-collapse:collapse;font-size:11.5px}th,td{border-bottom:1px solid #e3e8ef;padding:5px 6px;text-align:left;vertical-align:top}th{background:#f2f5f9}
        .n{text-align:right;white-space:nowrap}.vazio{color:#5a6775;text-align:center}.rodape{margin-top:24px;color:#5a6775;font-size:11px}
        @media print{body{margin:10mm}.naoimprime{display:none}h2{break-after:avoid}tr{break-inside:avoid}}
        </style></head><body><p class="naoimprime"><button onclick="print()">Imprimir / salvar em PDF</button></p><h1>${esc(titulo)}</h1><p class="sub">${esc(subtitulo)}</p>
        ${blocos.map((b) => b.cartoes ? `<div class="cards">${b.cartoes.map(([r, v]) => `<div class="card"><span>${esc(r)}</span><b>${esc(v)}</b></div>`).join("")}</div>` : `<h2>${esc(b.titulo)}</h2>${tabela(b.cab, b.linhas, b.direita || [])}`).join("")}
        <p class="rodape">Policoating · gerado em ${esc(new Date().toLocaleString("pt-BR"))}</p></body></html>`);
      janela.document.close();
      setTimeout(() => { try { janela.focus(); janela.print(); } catch (e) { /* o usuário imprime pelo botão */ } }, 400);
    }
    const cartoesResumo = (r) => [["Pedidos", String(r.pedidos)], ["Vendido", fmtR(r.total)], ["Quilos", r.kg.toLocaleString("pt-BR") + " kg"], ["Clientes", String(r.clientes)], ["Ticket médio", fmtR(r.ticket)], ["Cancelados", String(r.cancelados)]];
    async function gerar(botao, fn) {
      $("#rel-erro").textContent = ""; const txt = botao.innerHTML; botao.disabled = true; botao.textContent = "Gerando...";
      try { await fn(); } catch (e) { $("#rel-erro").textContent = e.message; }
      botao.disabled = false; botao.innerHTML = txt;
    }
    async function dadosSemana() {
      const per = periodoSemana(), ped = await A.pedidosPeriodo(per.de, per.ate);
      return { per, ped, r: resumo(ped), top: maisVendidos(ped) };
    }
    async function dadosMes() {
      const per = periodoMes(), [ped, nts] = await Promise.all([A.pedidosPeriodo(per.de, per.ate), A.listarNotas().catch(() => [])]);
      return { per, ped, r: resumo(ped), top: maisVendidos(ped), notas: notasDoPeriodo(nts, per.de, per.ate) };
    }
    const linhasTop = (top) => top.map((x, i) => [i + 1, x.codigo, x.nome, x.kg, x.valor, x.pedidos, x.clientes]);
    const CAB_TOP = ["#", "Código", "Produto", "Kg", "Valor (R$)", "Pedidos", "Clientes"];
    const linhasNotas = (ns) => ns.map((n) => [dBR(n.data_nf) || dBR(n.criado_em), n.nf, n.lote, n.fornecedor, n.fornecedor_codigo || "", (n.arquivos || []).map((a) => a.nome).join(", "), n.criado_por || "", n.obs || ""]);
    const CAB_NOTAS = ["Data da NF", "NF", "Lote (cor/código)", "Fornecedor", "Cód. fornecedor", "Arquivos", "Guardada por", "Observação"];

    $("#rel-sem-xlsx").addEventListener("click", (e) => gerar(e.currentTarget, async () => {
      const { per, ped, r, top } = await dadosSemana();
      await baixarPlanilha(`vendas-policoating-${per.de}-a-${per.ate}`, [
        ["Resumo", [["Período", `${dBR(per.de)} a ${dBR(per.ate)}`], ...cartoesResumo(r).map(([a, b]) => [a, b])]],
        ["Pedidos", [CAB_PEDIDOS, ...ped.map(linhaPedido)]],
        ["Itens", [CAB_ITENS, ...linhasItens(ped)]],
        ["Mais vendidos", [CAB_TOP, ...linhasTop(top)]],
      ]);
    }));
    $("#rel-sem-pdf").addEventListener("click", (e) => { const j = window.open("", "_blank"); if (j) j.document.write("Gerando relatório..."); gerar(e.currentTarget, async () => {
      if (!j) throw new Error("O navegador bloqueou a janela. Permita pop-ups para este site.");
      const { per, ped, r, top } = await dadosSemana();
      abrirImpressao(j, "Vendas da semana", `${dBR(per.de)} a ${dBR(per.ate)}`, [
        { cartoes: cartoesResumo(r) },
        { titulo: "Pedidos", cab: ["Pedido", "Data", "Situação", "Cliente", "Cidade/UF", "Kg", "Valor (R$)"], linhas: ped.map((p) => { const l = linhaPedido(p); return [l[0], l[1], l[2], l[3], l[7], l[8], l[9]]; }), direita: [5, 6] },
        { titulo: "Mais vendidos", cab: CAB_TOP, linhas: linhasTop(top), direita: [0, 3, 4, 5, 6] },
      ]);
    }); });
    $("#rel-mes-xlsx").addEventListener("click", (e) => gerar(e.currentTarget, async () => {
      const { per, ped, r, top, notas: ns } = await dadosMes();
      await baixarPlanilha(`relatorio-policoating-${per.de.slice(0, 7)}`, [
        ["Resumo", [["Mês", per.nome], ...cartoesResumo(r).map(([a, b]) => [a, b]), ["Notas de entrada", String(ns.length)]]],
        ["Mais vendidos", [CAB_TOP, ...linhasTop(top)]],
        ["Notas de entrada", [CAB_NOTAS, ...linhasNotas(ns)]],
        ["Pedidos", [CAB_PEDIDOS, ...ped.map(linhaPedido)]],
        ["Itens", [CAB_ITENS, ...linhasItens(ped)]],
      ]);
    }));
    $("#rel-mes-pdf").addEventListener("click", (e) => { const j = window.open("", "_blank"); if (j) j.document.write("Gerando relatório..."); gerar(e.currentTarget, async () => {
      if (!j) throw new Error("O navegador bloqueou a janela. Permita pop-ups para este site.");
      const { per, r, top, notas: ns } = await dadosMes();
      abrirImpressao(j, "Relatório do mês", per.nome.charAt(0).toUpperCase() + per.nome.slice(1), [
        { cartoes: cartoesResumo(r).concat([["Notas de entrada", String(ns.length)]]) },
        { titulo: "Produtos mais vendidos", cab: CAB_TOP, linhas: linhasTop(top), direita: [0, 3, 4, 5, 6] },
        { titulo: "Notas de entrada do mês", cab: ["Data da NF", "NF", "Lote (cor/código)", "Fornecedor", "Cód.", "Arquivos"], linhas: linhasNotas(ns).map((l) => l.slice(0, 6)) },
      ]);
    }); });
    $("#rel-backup-baixar").addEventListener("click", (e) => gerar(e.currentTarget, async () => {
      const copia = await A.backupCompleto();
      const n = Object.values(copia.tabelas).reduce((s, t) => s + (Array.isArray(t) ? t.length : 0), 0);
      baixarArquivo(new Blob([JSON.stringify(copia, null, 1)], { type: "application/json" }), `backup-policoating-${diaISO(new Date())}.json`);
      $("#rel-backup-info").textContent = `Cópia baixada: ${n.toLocaleString("pt-BR")} registros. Guarde o arquivo em local seguro.`;
      try { localStorage.setItem("policoating_ultimo_backup", new Date().toISOString()); } catch (err) { /* sem problema */ }
    }));
    try {
      const ult = localStorage.getItem("policoating_ultimo_backup");
      $("#rel-backup-info").textContent = ult ? `Última cópia neste computador: ${dBR(ult)}${(Date.now() - new Date(ult)) / 864e5 > 7 ? " — já passou uma semana, faça outra." : "."}` : "Nenhuma cópia baixada neste computador ainda.";
    } catch (e) { /* sem localStorage */ }

    // vendedor abre direto nos pedidos
    if (location.hash === "#pedidos" || !ehAdmin) abrirAba("pedidos");
  });
})();
