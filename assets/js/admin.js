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
    const mostrar = (id) => ["admin-carregando", "admin-entrar", "admin-negado", "admin-painel"].forEach((x) => ($("#" + x).hidden = x !== id));

    await window.ContaPronta;
    if (!window.Conta.usuario) return mostrar("admin-entrar");
    const papel = await A.meuPapel();
    if (!papel) { $("#admin-email").textContent = window.Conta.usuario.email; return mostrar("admin-negado"); }
    mostrar("admin-painel");
    $("#admin-demo").hidden = A.online;
    const ehAdmin = papel === "admin";
    // vendedor: só a busca de pedidos
    if (!ehAdmin) {
      document.title = "Área do vendedor | Policoating";
      $(".cabecalho-pagina h1").textContent = "Área do vendedor";
      $(".cabecalho-pagina p").textContent = "Pedidos feitos pelo site, promoções e carteira de clientes.";
      $$(".admin-abas [data-aba]").forEach((b) => { if (!["produtos", "pedidos", "clientes"].includes(b.dataset.aba)) b.remove(); });
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
      if (pi.tipo === "combinar") return `<span class="adm-preco combinar">A combinar</span>`;
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
    let editando = null, fichaAtual = "", fotos = [];
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
          <button type="button" data-foto-remover class="perigo" aria-label="Remover foto">×</button></div></figure>`).join("") +
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

    const modoPreco = () => $("[name=preco-modo]:checked", form).value;
    function previaPreco() {
      const combinar = modoPreco() === "combinar";
      $("#precos-campos").hidden = combinar;
      if (combinar) return;
      const d = { preco: +form.preco.value || 0, precoPromo: +form.precoPromo.value || 0, promoAte: form.promoAte.value };
      const pi = CW.precoInfo(d);
      $("#preco-previa").innerHTML = !d.preco ? "" : pi.tipo === "promo"
        ? `No site: <s>${fmtR(pi.preco)}</s> <strong>${fmtR(pi.promo)}/kg</strong> <b class="selo-off">-${pi.desconto}%</b> · caixa 25 kg: ${fmtR(pi.promo * 25)}`
        : `No site: <strong>${fmtR(d.preco)}/kg</strong> · caixa 25 kg: ${fmtR(d.preco * 25)}${d.precoPromo ? (d.precoPromo >= d.preco ? " · <span class=\"form-erro\">a promoção precisa ser menor que o preço</span>" : " · promoção encerrada") : ""}`;
    }
    $$("[name=preco-modo]", form).forEach((r) => r.addEventListener("change", previaPreco));
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
      enviando = 0; desenharFotos();
      $$("[name=preco-modo]", form).forEach((x) => (x.checked = x.value === (r && (p.precoCombinar || !(+p.preco > 0)) ? "combinar" : "valor")));
      form.preco.value = p.preco || ""; form.precoPromo.value = p.precoPromo || ""; form.promoAte.value = p.promoAte || "";
      previaPreco();
      form.ordem.value = r ? r.ordem + (duplicar ? 1 : 0) : (registros.reduce((m, x) => Math.max(m, x.ordem), 0) + 10);
      form.destaque.checked = !!p.destaque && !duplicar;
      form.ativo.checked = r ? r.ativo : true;
      mostrarFicha(p.ficha);
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
      const cor = { nome: $("#cor-nome").value.replace(/\s+/g, " ").trim(), hex: hex.value.trim() };
      if (fotos[0]) cor.foto = fotos[0];
      const combinar = modoPreco() === "combinar";
      const dados = {
        codigo: editando ? codigoAtual() : (/^POL-\d{4,}$/.test(codigoAtual()) ? codigoAtual() : ""),
        nome: form.nome.value.replace(/\s+/g, " ").trim(),
        categoria: form.categoria.value,
        marca: selMarca.value,
        fotos: fotos.slice(),
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
    };
    abas.forEach((b) => b.addEventListener("click", () => abrirAba(b.dataset.aba)));

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
    async function carregarClientes() {
      $("#clientes-erro").textContent = "";
      try { clientes = await A.listarClientes(); clientesCarregados = true; }
      catch (e) { clientes = []; $("#clientes-erro").textContent = e.message + " (rode a PARTE F do setup.sql no Supabase)"; }
      desenharClientes();
    }
    function clientesFiltrados() {
      const termo = slug($("#clientes-busca").value || ""), f = $("#clientes-filtro").value, ordem = $("#clientes-ordem").value;
      const soDig = BRso($("#clientes-busca").value);
      const lista = clientes.filter((c) => {
        if (f === "recentes" && !(diasDesde(c.ultimo_pedido) <= 30)) return false;
        if (f === "inativos" && !(c.pedidos && diasDesde(c.ultimo_pedido) > 90)) return false;
        if (f === "sem" && c.pedidos) return false;
        if (f === "novos" && !(diasDesde(c.criado_em) <= 30)) return false;
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
        return `<article class="adm-cli" data-email="${esc(c.email || "")}">
          <div class="adm-cli-id">
            <strong>${esc(nomeCliente(c))}</strong> ${selo}
            <small>${c.tipo === "pj" ? "Empresa" : "Pessoa física"}${docCliente(c) ? " · " + esc(docCliente(c)) : ""}${c.tipo === "pj" && c.responsavel ? " · " + esc(c.responsavel) : ""}</small>
            <small>${esc(c.email || "")}${c.telefone ? " · " + esc(c.telefone) : ""}</small>
            ${c.cidade ? `<small>${esc(c.cidade)}/${esc(c.uf || "")}</small>` : ""}
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
          </div>
        </article>`;
      }).join("") : `<p class="dica">${!clientesCarregados ? "Carregando..." : clientes.length ? "Nenhum cliente encontrado com essa busca." : "Nenhum cliente cadastrado ainda."}</p>`;
    }
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
        return `<li data-email="${esc(m.email)}"><span>${icone}${esc(m.email)}${souEu ? " <em>(você)</em>" : ""}</span>
          <div class="equipe-acoes">${souEu ? `<b class="cargo cargo-${m.papel}">${CARGOS[m.papel]}</b>`
            : `${m.papel === "admin" ? "" : `<label class="check-excluir"><input type="checkbox" data-permissao="pode_excluir" ${m.pode_excluir ? "checked" : ""}> Pode excluir pedidos</label>
               <label class="check-excluir"><input type="checkbox" data-permissao="pode_exportar" ${m.pode_exportar ? "checked" : ""}> Pode exportar clientes</label>`}
               <select data-cargo aria-label="Cargo de ${esc(m.email)}">${Object.entries(CARGOS).map(([k, v]) => `<option value="${k}" ${k === m.papel ? "selected" : ""}>${v}</option>`).join("")}</select>
               <button type="button" class="perigo" data-remover-membro>Remover</button>`}</div></li>`;
      }).join("");
    }
    $("#form-equipe").addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await A.salvarMembro($("#equipe-email").value, $("#equipe-cargo").value);
        CW.mostrarToast(`${CARGOS[$("#equipe-cargo").value]} adicionado.`);
        $("#equipe-email").value = ""; $("#equipe-erro").textContent = ""; carregarEquipe();
      } catch (err) { $("#equipe-erro").textContent = err.message; }
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
      const b = e.target.closest("[data-remover-membro]"); if (!b) return;
      const email = b.closest("[data-email]").dataset.email;
      if (!confirm(`Remover o acesso de ${email}?`)) return;
      try { await A.removerMembro(email); carregarEquipe(); CW.mostrarToast("Acesso removido."); }
      catch (err) { $("#equipe-erro").textContent = err.message; }
    });

    // vendedor abre direto nos pedidos
    if (location.hash === "#pedidos" || !ehAdmin) abrirAba("pedidos");
  });
})();
