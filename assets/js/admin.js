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
      $(".cabecalho-pagina p").textContent = "Suas vendas, a conversa com os clientes, promoções, carteira de clientes e estoque.";
      $$(".admin-abas [data-aba]").forEach((b) => { if (!["produtos", "vendas", "clientes", "estoque"].includes(b.dataset.aba)) b.remove(); });
      document.body.classList.add("so-vendedor");
    }
    const [podeExcluir, podeExportar, podeEstoque] = await Promise.all([A.podeExcluirPedidos(), A.podeExportarClientes(), A.podeMovimentarEstoque()]);
    const extras = [podeExcluir && "pode excluir pedidos", podeExportar && "pode exportar clientes", podeEstoque && "pode movimentar estoque"].filter(Boolean);
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

    let registros = [], saldosProd = {};
    const fmtR = (v) => (+v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    async function carregar() {
      try { registros = await A.listar(); }
      catch (e) { CW.mostrarToast(e.message); registros = []; }
      try {
        const sal = await A.estoqueSaldos(); saldosProd = {};
        Object.entries(sal).forEach(([k, v]) => { const id = k.split("|")[0]; saldosProd[id] = (saldosProd[id] || 0) + v.saldo; });
      } catch (e) { saldosProd = {}; }
      const antigos = registros.filter((r) => (r.dados.cores || []).length > 1);
      $("#aviso-cores").hidden = !antigos.length || !ehAdmin;
      if (antigos.length) $("#aviso-cores-texto").textContent = `${antigos.length} ${antigos.length === 1 ? "produto tem" : "produtos têm"} várias cores (${antigos.reduce((n, r) => n + r.dados.cores.length, 0)} cores no total).`;
      desenhar();
    }
    $("#btn-converter").addEventListener("click", async (e) => {
      if (!confirm("Converter os produtos com várias cores em um produto por cor?\n\nCada cor ganha um código novo (POL-0001, POL-0002...), que você pode trocar depois duplicando o produto. O estoque lançado antes da conversão precisa ser lançado de novo nos produtos novos.")) return;
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
        const p = r.dados, varias = (p.cores || []).length > 1, est = saldosProd[r.id];
        return `<tr data-id="${esc(r.id)}" class="${r.ativo ? "" : "oculto"}${selecionados.has(r.id) ? " selecionado" : ""}">
          <td class="col-sel"><input type="checkbox" data-sel ${selecionados.has(r.id) ? "checked" : ""} aria-label="Selecionar ${esc(p.nome)}"></td>
          <td><div class="admin-prod">${miniatura(p)}<div><strong>${esc(p.nome)}</strong><small>Cód. ${esc(p.codigo || r.id.toUpperCase())}${p.destaque ? " · ★ destaque" : ""}${varias ? ` · <b class="selo-cli inativo">${p.cores.length} cores (converter)</b>` : ""}${p.cores[0] && !p.cores[0].foto ? ` · <span class="sem-foto">sem foto</span>` : ""}</small></div></div></td>
          <td>${esc(((window.CATEGORIAS || {})[p.categoria] || {}).nome || p.categoria)}${p.marca ? `<small class="marca-lista">${esc(p.marca)}</small>` : ""}</td>
          <td>${textoPreco(p)}</td>
          <td>${est == null ? "—" : `<strong class="${est > 0 ? "" : "zerado"}">${(Math.round(est * 100) / 100).toLocaleString("pt-BR")} kg</strong>`}</td>
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
      const p = r ? JSON.parse(JSON.stringify(r.dados)) : { categoria: Object.keys(window.CATEGORIAS || {})[0], marca: marcas[0], embalagens: ["Caixa 25 kg", "Caixa 20 kg"], cores: [{ nome: "", hex: "#1558d6" }] };
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
      form.embalagens.value = (p.embalagens || []).join(", ");
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
        embalagens: form.embalagens.value.split(",").map((x) => x.trim()).filter(Boolean),
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
      if (nome === "vendas") carregarVendas();
      if (nome === "estoque") carregarEstoque();
      if (nome === "galeria") carregarGaleria();
      if (nome === "equipe") carregarEquipe();
    };
    abas.forEach((b) => b.addEventListener("click", () => abrirAba(b.dataset.aba)));

    /* ---------- Vendas (estilo Mercado Livre): pedidos feitos pelo site ---------- */
    const nomeCliente = (c) => (c.tipo === "pj" ? (c.nome_fantasia || c.razao_social) : c.nome) || c.email || "Cliente";
    const dataBR = (d) => (d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "");
    const LJ = window.Loja, hojeISO = () => LJ.iso(new Date());
    let vendas = [], vendasCarregadas = false, solicAbertas = {}, filtroVenda = "novas", esperaBusca = 0;
    const eu = String(window.Conta.usuario.email).toLowerCase();
    const naoLida = (p) => p.ultima_msg_lado === "cliente" && (!p.msg_lida_equipe_em || p.msg_lida_equipe_em < p.msg_ultima_em);
    const FILTROS = {
      novas: ["Novas", (p) => p.status === "recebido"],
      hoje: ["Enviar hoje", (p) => p.status === "confirmado" && p.previsao_envio <= hojeISO()],
      proximos: ["Próximos envios", (p) => p.status === "confirmado" && p.previsao_envio > hojeISO()],
      caminho: ["A caminho", (p) => p.status === "enviado"],
      entregues: ["Entregues", (p) => p.status === "entregue"],
      mensagens: ["Mensagens", (p) => naoLida(p)],
      solicitacoes: ["Solicitações", (p) => !!solicAbertas[p.numero]],
      canceladas: ["Canceladas", (p) => ["cancelado", "reembolsado"].includes(p.status)],
      todas: ["Todas", () => true]
    };
    async function carregarVendas() {
      $("#vendas-erro").textContent = "";
      try {
        [vendas, solicAbertas] = await Promise.all([A.listarPedidos($("#vendas-busca").value), LJ.solicitacoesAbertas()]);
        vendas = vendas.map((p) => Object.assign({ status: "recebido" }, p));
        vendasCarregadas = true;
      } catch (e) { vendas = []; $("#vendas-erro").textContent = e.message; }
      desenharVendas();
      document.dispatchEvent(new CustomEvent("notificacoes-atualizar"));
    }
    function vendasFiltradas(ignorarChip) {
      const termo = slug($("#vendas-busca").value || ""), desde = inicioPeriodo($("#vendas-periodo").value), meu = $("#vendas-dono").value;
      return vendas.filter((p) => (!desde || new Date(p.criado_em).getTime() >= desde) && (!meu || p.vendedor === eu || (meu === "livres" && !p.vendedor)) &&
        (ignorarChip || FILTROS[filtroVenda][1](p)) &&
        (!termo || slug([p.numero, nomeCliente(p.cliente || {}), (p.cliente || {}).razao_social, (p.cliente || {}).email, (p.cliente || {}).cnpj, (p.cliente || {}).cpf, (p.cliente || {}).telefone,
          p.destino_cidade, p.vendedor, (p.itens || []).map((i) => [i.nome, i.codigo, i.cor].join(" ")).join(" ")].join(" ")).includes(termo)));
    }
    function inicioPeriodo(v) {
      const d = new Date(); d.setHours(0, 0, 0, 0);
      if (v === "hoje") return d.getTime();
      if (v === "mes") return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      if (v === "ano") return new Date(d.getFullYear(), 0, 1).getTime();
      return +v ? Date.now() - +v * 864e5 : 0;
    }
    function linhaPrazo(p) {
      if (p.status === "recebido") return `<span class="prazo alerta">Confirme para enviar ${esc(LJ.textoEnvio(p.previsao_envio || hojeISO()))}</span>`;
      if (p.status === "confirmado") return p.previsao_envio <= hojeISO() ? `<span class="prazo urgente">Enviar hoje até ${LJ.EMPRESA.horaCorte}h</span>` : `<span class="prazo">Envio ${esc(LJ.dataBR(p.previsao_envio))}</span>`;
      if (p.status === "enviado") return `<span class="prazo">Chega entre ${esc(LJ.dataBR(p.previsao_entrega_min))} e ${esc(LJ.dataBR(p.previsao_entrega_max))}</span>`;
      if (p.status === "entregue") return `<span class="prazo ok">Entregue em ${esc(dataBR(p.entregue_em))}</span>`;
      return `<span class="prazo">${esc(p.motivo_cancelamento || "")}</span>`;
    }
    function desenharVendas() {
      const base = vendasFiltradas(true), lista = vendasFiltradas(false);
      $("#vendas-filtros").innerHTML = Object.entries(FILTROS).map(([k, [rot, f]]) => {
        const n = base.filter(f).length, alerta = ["novas", "hoje", "mensagens", "solicitacoes"].includes(k) && n;
        return `<button type="button" role="tab" data-filtro-venda="${k}" class="${k === filtroVenda ? "ativo" : ""}${alerta ? " alerta" : ""}" aria-selected="${k === filtroVenda}">${rot}${k === "todas" ? "" : ` <b>${n}</b>`}</button>`;
      }).join("");
      const validas = base.filter((p) => ["confirmado", "enviado", "entregue"].includes(p.status));
      const fat = validas.reduce((s, p) => s + (+p.total || 0), 0), kg = validas.reduce((s, p) => s + (+p.total_kg || 0), 0);
      $("#vendas-kpis").innerHTML = `
        <div><span>Faturamento</span><strong>${fmtR(fat)}</strong><small>vendas confirmadas no período</small></div>
        <div><span>Vendas</span><strong>${validas.length}</strong><small>${base.filter((p) => p.status === "recebido").length} aguardando confirmação</small></div>
        <div><span>Kg vendidos</span><strong>${(Math.round(kg * 100) / 100).toLocaleString("pt-BR")} kg</strong></div>
        <div><span>Ticket médio</span><strong>${validas.length ? fmtR(fat / validas.length) : "—"}</strong></div>`;
      const porProd = {}, porVend = {};
      validas.forEach((p) => {
        (p.itens || []).forEach((i) => { const k = i.codigo || i.id; porProd[k] = porProd[k] || { nome: i.nome, codigo: k, kg: 0, valor: 0 }; porProd[k].kg += +i.kg || 0; porProd[k].valor += +i.subtotal || 0; });
        const v = p.vendedor || "—"; porVend[v] = porVend[v] || { n: 0, valor: 0 }; porVend[v].n++; porVend[v].valor += +p.total || 0;
      });
      $("#vendas-ranking").innerHTML = Object.values(porProd).sort((a, b) => b.kg - a.kg).slice(0, 8)
        .map((r) => `<li><span>${esc(r.nome)}<small>Cód. ${esc(r.codigo)}</small></span><b>${(Math.round(r.kg * 100) / 100).toLocaleString("pt-BR")} kg<small>${fmtR(r.valor)}</small></b></li>`).join("") || `<li class="dica">Sem vendas no período.</li>`;
      $("#vendas-vendedores").innerHTML = Object.entries(porVend).sort((a, b) => b[1].valor - a[1].valor)
        .map(([e, r]) => `<li><span>${esc(e)}<small>${r.n} ${r.n === 1 ? "venda" : "vendas"}</small></span><b>${fmtR(r.valor)}</b></li>`).join("") || `<li class="dica">Sem vendas no período.</li>`;
      $("#vendas-resumo").innerHTML = vendas.length ? `<span><strong>${lista.length}</strong> ${lista.length === 1 ? "venda" : "vendas"} em "${FILTROS[filtroVenda][0]}"</span>` : "";
      $("#vendas-lista").innerHTML = lista.length ? lista.map((p) => {
        const c = p.cliente || {}, st = LJ.STATUS[p.status] || { equipe: p.status }, it = (p.itens || [])[0] || {};
        const prod = it.id && CW.acharProduto ? CW.acharProduto(it.id, it.cor) : null;
        const foto = it.foto || (prod && ((prod.fotos || [])[0] || CW.fotoProduto(prod, prod.cores[0], { largura: 160, altura: 128 })));
        const sol = solicAbertas[p.numero] || [];
        return `<article class="venda ${esc(p.status)}${naoLida(p) ? " com-msg" : ""}" data-numero="${esc(p.numero)}" tabindex="0">
          <header>
            <div><strong>Venda ${esc(p.numero)}</strong><small>${esc(dataBR(p.criado_em))} · ${esc(nomeCliente(c))}${p.destino_cidade ? ` · ${esc(p.destino_cidade)}/${esc(p.destino_uf || "")}` : ""}</small></div>
            <b class="pp-status ${esc(p.status)}">${esc(st.equipe)}</b>
          </header>
          <div class="venda-corpo">
            ${foto ? `<img src="${esc(foto)}" alt="" width="80" height="64">` : `<span class="venda-sem-foto">${window.Icone ? window.Icone("caixa") : ""}</span>`}
            <div><strong>${esc(it.nome || "")}</strong>${(p.itens || []).length > 1 ? `<small>+ ${(p.itens || []).length - 1} ${(p.itens || []).length === 2 ? "produto" : "produtos"}</small>` : ""}
              <small>${(+p.total_kg || 0).toLocaleString("pt-BR")} kg${p.vendedor ? ` · vendedor ${esc(p.vendedor)}` : ""}</small>
              <div class="venda-sinais">${linhaPrazo(p)}${naoLida(p) ? `<span class="sinal msg">Mensagem nova</span>` : ""}${sol.map((t) => `<span class="sinal sol">${esc(LJ.TIPOS_SOLIC[t])}</span>`).join("")}</div></div>
            <div class="venda-total"><span>Total</span><strong>${fmtR(p.total)}</strong>${p.tem_combinar ? `<small>+ itens a combinar</small>` : ""}</div>
          </div>
        </article>`;
      }).join("") : `<p class="dica">${!vendasCarregadas ? "Carregando..." : vendas.length ? `Nenhuma venda em "${FILTROS[filtroVenda][0]}".` : "Nenhuma venda ainda. As compras feitas no site aparecem aqui na hora."}</p>`;
    }
    function abrirVenda(numero) {
      if (!window.PedidoUI) return;
      history.replaceState(null, "", "#venda=" + encodeURIComponent(numero));
      window.PedidoUI.abrir(numero, { lado: "equipe", podeExcluir, aoMudar: () => { if (location.hash.startsWith("#venda=")) history.replaceState(null, "", "#vendas"); carregarVendas(); } });
    }
    $("#vendas-filtros").addEventListener("click", (e) => { const b = e.target.closest("[data-filtro-venda]"); if (b) { filtroVenda = b.dataset.filtroVenda; desenharVendas(); } });
    $("#vendas-lista").addEventListener("click", (e) => { const v = e.target.closest("[data-numero]"); if (v) abrirVenda(v.dataset.numero); });
    $("#vendas-lista").addEventListener("keydown", (e) => { const v = e.target.closest("[data-numero]"); if (v && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); abrirVenda(v.dataset.numero); } });
    $("#vendas-busca").addEventListener("input", () => {
      desenharVendas();
      clearTimeout(esperaBusca);   // código completo que não está na lista: procura no histórico inteiro
      if (/^pc-\S{6,}/i.test($("#vendas-busca").value.trim()) && !vendasFiltradas(true).length) esperaBusca = setTimeout(carregarVendas, 500);
    });
    ["vendas-periodo", "vendas-dono"].forEach((id) => $("#" + id).addEventListener("change", desenharVendas));
    $("#vendas-atualizar").addEventListener("click", carregarVendas);
    $("#vendas-csv").addEventListener("click", () => {
      const cel = (x) => `"${String(x == null ? "" : x).replace(/"/g, '""')}"`, n = (x) => (x == null || x === "" ? "" : String(Math.round(+x * 100) / 100).replace(".", ","));
      const linhas = [["Pedido", "Data", "Situação", "Cliente", "Documento", "E-mail", "Telefone", "Cidade", "UF", "Vendedor", "Envio previsto", "Código", "Produto", "Embalagem", "Qtd", "Kg", "Preço/kg", "Subtotal", "Total do pedido", "Observações"]];
      vendasFiltradas(false).forEach((p) => (p.itens || []).forEach((i) => {
        const c = p.cliente || {};
        linhas.push([p.numero, dataBR(p.criado_em), (LJ.STATUS[p.status] || {}).equipe || p.status, nomeCliente(c), c.cnpj || c.cpf || "", c.email || "", c.telefone || "", c.cidade || p.destino_cidade || "", c.uf || p.destino_uf || "",
          p.vendedor || "", p.previsao_envio || "", i.codigo || i.id, i.nome, i.embalagem, i.qtd, n(i.kg), n(i.preco_kg), n(i.subtotal), n(p.total), p.observacoes || ""]);
      }));
      const csv = "\ufeff" + linhas.map((l) => l.map(cel).join(";")).join("\r\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      a.download = `vendas-policoating-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
    });
    // novas vendas e mensagens chegando: atualiza a lista se a aba estiver aberta
    let ultimoResumo = "";
    document.addEventListener("notificacoes", (e) => {
      const r = JSON.stringify(e.detail.equipe || {});
      $$('.admin-abas [data-aba="vendas"] .badge-aba').forEach((b) => b.remove());
      const eq = e.detail.equipe, n = eq ? (+eq.novas || 0) + (+eq.mensagens || 0) + (+eq.solicitacoes || 0) : 0;
      const aba = $('.admin-abas [data-aba="vendas"]'); if (aba && n) aba.insertAdjacentHTML("beforeend", `<b class="badge-aba">${n}</b>`);
      const painelAberto = $("#pedido-painel") && !$("#pedido-painel").hidden;
      if (ultimoResumo && r !== ultimoResumo && !$('[data-conteudo="vendas"]').hidden && !painelAberto) carregarVendas();
      ultimoResumo = r;
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
      $("#vendas-busca").value = b.dataset.verPedidos; $("#vendas-periodo").value = "0"; filtroVenda = "todas";
      abrirAba("vendas");
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

    /* ---------- Estoque ---------- */
    const KG_CAIXA = 25;
    let saldos = {}, estoqueCarregado = false, movAlvo = null;
    const fmtKg = (n) => (Math.round(n * 100) / 100).toLocaleString("pt-BR") + " kg";
    function itensEstoque() {
      const lista = [], vistos = new Set();
      // administrador: todos os produtos do painel (inclusive ocultos); vendedor: os do site
      const fonte = registros.length ? registros.map((r) => r.dados) : (window.PRODUTOS || []);
      fonte.forEach((p) => (p.cores || []).forEach((c) => {
        const k = p.id + "|" + c.nome; vistos.add(k);
        lista.push(Object.assign({ k, produto_id: p.id, cor: c.nome, hex: c.hex, nome: p.nome, linha: p.linha || "", fora: false }, saldos[k] || { saldo: 0, minimo: 0, ultima: null }));
      }));
      Object.entries(saldos).forEach(([k, s]) => {           // itens com saldo que saíram do catálogo
        if (vistos.has(k)) return;
        const [produto_id, cor] = k.split("|");
        lista.push(Object.assign({ k, produto_id, cor, hex: "#cccccc", nome: produto_id, linha: "", fora: true }, s));
      });
      return lista;
    }
    const situacao = (i) => (!i.ultima && !i.saldo ? "nunca" : i.saldo <= 0 ? "zerado" : i.minimo && i.saldo < i.minimo ? "baixo" : "ok");
    const SELO_EST = { nunca: ["sem", "Sem movimentação"], zerado: ["zerado", "Sem estoque"], baixo: ["inativo", "Abaixo do mínimo"], ok: ["ativo", "Em estoque"] };
    async function carregarEstoque() {
      $("#estoque-erro").textContent = "";
      $("#estoque-permissao").textContent = podeEstoque ? "Clique em \"Movimentar\" para registrar entrada, saída, inventário ou o estoque mínimo." : "Você pode consultar o estoque. Para movimentar, peça a um administrador a permissão \"Pode movimentar estoque\".";
      try { saldos = await A.estoqueSaldos(); estoqueCarregado = true; }
      catch (e) { saldos = {}; $("#estoque-erro").textContent = e.message; }
      desenharEstoque();
    }
    function estoqueFiltrado() {
      const termo = slug($("#estoque-busca").value || ""), f = $("#estoque-filtro").value;
      return itensEstoque().filter((i) => {
        const s = situacao(i);
        if (f === "baixo" && s !== "baixo") return false;
        if (f === "zerado" && !(s === "zerado" || s === "nunca")) return false;
        if (f === "com" && !(i.saldo > 0)) return false;
        return !termo || slug([i.nome, i.linha, i.cor, i.produto_id].join(" ")).includes(termo);
      });
    }
    function desenharEstoque() {
      const todos = itensEstoque(), lista = estoqueFiltrado();
      const total = todos.reduce((s, i) => s + Math.max(0, i.saldo), 0);
      $("#estoque-resumo").innerHTML = `<span><strong>${fmtKg(total)}</strong> em estoque (≈ ${Math.floor(total / KG_CAIXA).toLocaleString("pt-BR")} caixas)</span>
        <span><strong>${todos.filter((i) => i.saldo > 0).length}</strong> de ${todos.length} cores com estoque</span>
        <span class="${todos.some((i) => situacao(i) === "baixo") ? "alerta" : ""}"><strong>${todos.filter((i) => situacao(i) === "baixo").length}</strong> abaixo do mínimo</span>`;
      $("#estoque-lista").innerHTML = lista.length ? lista.map((i) => {
        const [cls, txt] = SELO_EST[situacao(i)];
        return `<tr data-k="${esc(i.k)}">
          <td><div class="est-item"><i style="background:${esc(i.hex)}"></i><div><strong>${esc(i.nome)}</strong><small>${esc(i.cor)}${i.fora ? " · fora do catálogo" : ""}</small></div></div></td>
          <td><strong>${fmtKg(i.saldo)}</strong><small class="est-cx">≈ ${Math.floor(Math.max(0, i.saldo) / KG_CAIXA)} cx</small></td>
          <td>${i.minimo ? fmtKg(i.minimo) : "—"}</td>
          <td><b class="selo-cli ${cls}">${txt}</b></td>
          <td class="est-acoes">${podeEstoque ? `<button type="button" class="btn btn-primario" data-mov>Movimentar</button>` : ""}<button type="button" class="btn btn-contorno-azul" data-hist>Histórico</button></td>
        </tr>`;
      }).join("") : `<tr><td colspan="5" class="dica">${estoqueCarregado ? "Nenhum item encontrado." : "Carregando..."}</td></tr>`;
    }
    $("#estoque-busca").addEventListener("input", desenharEstoque);
    $("#estoque-filtro").addEventListener("change", desenharEstoque);
    $("#estoque-lista").addEventListener("click", (e) => {
      const tr = e.target.closest("tr[data-k]"); if (!tr) return;
      const item = itensEstoque().find((i) => i.k === tr.dataset.k); if (!item) return;
      if (e.target.closest("[data-mov]")) abrirMov(item, false);
      if (e.target.closest("[data-hist]")) abrirMov(item, true);
    });
    $("#estoque-historico").addEventListener("click", () => abrirMov(null, true));

    const modalMov = $("#modal-estoque"), formMov = $("#form-estoque");
    const tipoMov = () => $("[name=mov-tipo]:checked", formMov).value;
    function linhasHistorico(movs, comItem) {
      const NOMES = { entrada: "Entrada", saida: "Saída", ajuste: "Inventário" };
      const nomeProd = (id) => ((window.PRODUTOS || []).find((p) => p.id === id) || {}).nome || id;
      return movs.length ? `<table class="admin-tabela tabela-mov"><thead><tr><th>Data</th>${comItem ? "<th>Item</th>" : ""}<th>Tipo</th><th>Kg</th><th>Detalhes</th><th>Por</th></tr></thead><tbody>${movs.map((m) => {
        const kg = m.tipo === "saida" ? -m.kg : +m.kg;
        return `<tr><td>${esc(dataBR(m.criado_em))}</td>${comItem ? `<td>${esc(nomeProd(m.produto_id))}<small>${esc(m.cor)}</small></td>` : ""}<td><b class="mov-tipo mov-${m.tipo}">${NOMES[m.tipo]}</b></td>
          <td class="${kg < 0 ? "neg" : "pos"}">${kg > 0 ? "+" : ""}${fmtKg(kg)}</td>
          <td>${[m.pedido_numero, m.documento, m.obs].filter(Boolean).map(esc).join(" · ") || "—"}</td><td>${esc(m.feito_por || "")}</td></tr>`;
      }).join("")}</tbody></table>` : `<p class="dica">Nenhuma movimentação registrada.</p>`;
    }
    async function abrirMov(item, soHistorico) {
      movAlvo = item;
      formMov.classList.toggle("so-historico", soHistorico);
      $("footer [data-fechar-mov]", formMov).textContent = soHistorico ? "Fechar" : "Cancelar";
      $("#mov-titulo").textContent = soHistorico ? (item ? "Histórico do item" : "Histórico do estoque") : "Movimentar estoque";
      $("#mov-item").innerHTML = item ? `<i style="background:${esc(item.hex)}"></i><span><strong>${esc(item.nome)}</strong> · ${esc(item.cor)}<small>Saldo atual: ${fmtKg(item.saldo)}${item.minimo ? " · mínimo " + fmtKg(item.minimo) : ""}</small></span>` : "";
      $("#mov-item").hidden = !item;
      ["#mov-kg", "#mov-caixas", "#mov-doc", "#mov-pedido", "#mov-obs"].forEach((s) => ($(s).value = ""));
      $("[name=mov-tipo][value=entrada]", formMov).checked = true;
      $("#mov-erro").textContent = ""; $("#mov-historico").innerHTML = `<p class="dica">Carregando histórico...</p>`;
      ajustarMov();
      modalMov.hidden = false; document.body.style.overflow = "hidden";
      if (!soHistorico) $("#mov-kg").focus();
      try {
        const movs = await A.estoqueMovimentos(item ? { produto_id: item.produto_id, cor: item.cor } : {}, item ? 50 : 300);
        $("#mov-historico").innerHTML = (soHistorico ? "" : `<h3 class="mov-sub">Últimas movimentações</h3>`) + linhasHistorico(soHistorico ? movs : movs.slice(0, 8), !item);
      } catch (e) { $("#mov-historico").innerHTML = `<p class="form-erro">${esc(e.message)}</p>`; }
    }
    const fecharMov = () => { modalMov.hidden = true; document.body.style.overflow = ""; };
    $$("[data-fechar-mov]", modalMov).forEach((b) => b.addEventListener("click", fecharMov));
    modalMov.addEventListener("click", (e) => { if (e.target === modalMov) fecharMov(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modalMov.hidden) fecharMov(); });
    function ajustarMov() {
      if (!movAlvo) return;
      const t = tipoMov(), kg = +$("#mov-kg").value || 0;
      const rot = { entrada: "Quantidade que entrou (kg) *", saida: "Quantidade que saiu (kg) *", ajuste: "Quantidade contada no estoque (kg) *", minimo: "Estoque mínimo (kg) *" };
      $("#mov-rotulo-kg").firstChild.textContent = rot[t];
      $("#mov-dica-kg").textContent = t === "ajuste" ? "Informe o total que existe hoje. O sistema lança a diferença." : t === "minimo" ? "Abaixo disso, o item aparece como \"Abaixo do mínimo\"." : "";
      $("#mov-rotulo-caixas").hidden = t === "minimo";
      $("#mov-rotulo-doc").hidden = $("#mov-rotulo-obs").hidden = t === "minimo";
      $("#mov-rotulo-pedido").hidden = t !== "saida";
      $("#mov-salvar").textContent = t === "minimo" ? "Salvar mínimo" : "Registrar";
      let r = "";
      if (kg > 0 || (t === "ajuste" && $("#mov-kg").value !== "")) {
        if (t === "entrada") r = `Saldo passa de ${fmtKg(movAlvo.saldo)} para ${fmtKg(movAlvo.saldo + kg)}.`;
        if (t === "saida") r = kg > movAlvo.saldo ? `Saldo insuficiente: há ${fmtKg(movAlvo.saldo)}.` : `Saldo passa de ${fmtKg(movAlvo.saldo)} para ${fmtKg(movAlvo.saldo - kg)}.`;
        if (t === "ajuste") { const d = kg - movAlvo.saldo; r = d ? `Diferença de ${d > 0 ? "+" : ""}${fmtKg(d)} (sistema tinha ${fmtKg(movAlvo.saldo)}).` : "Contagem igual ao sistema: nada a lançar."; }
      }
      if (t === "minimo") r = movAlvo.minimo ? `Mínimo atual: ${fmtKg(movAlvo.minimo)}.` : "Sem mínimo definido.";
      $("#mov-resumo").textContent = r;
    }
    $$("[name=mov-tipo]", formMov).forEach((r) => r.addEventListener("change", ajustarMov));
    $("#mov-kg").addEventListener("input", () => { $("#mov-caixas").value = ""; ajustarMov(); });
    $("#mov-caixas").addEventListener("input", (e) => { const c = parseInt(e.target.value, 10); $("#mov-kg").value = c > 0 ? c * KG_CAIXA : ""; ajustarMov(); });
    formMov.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!movAlvo || formMov.classList.contains("so-historico")) return;
      const t = tipoMov(), kg = Math.round((+$("#mov-kg").value || 0) * 100) / 100, pedido = $("#mov-pedido").value.trim().toUpperCase();
      $("#mov-erro").textContent = "";
      if ($("#mov-kg").value === "" || kg < 0 || (t !== "ajuste" && t !== "minimo" && !kg)) return ($("#mov-erro").textContent = "Informe a quantidade em kg.");
      if (pedido && !/^PC-\d{6}-[A-Z0-9]{2,10}$/.test(pedido)) return ($("#mov-erro").textContent = "Código do pedido inválido (ex.: PC-260926-AB12).");
      const b = $("#mov-salvar"); b.disabled = true;
      try {
        if (t === "minimo") { await A.definirMinimo(movAlvo.produto_id, movAlvo.cor, kg); CW.mostrarToast("Estoque mínimo salvo."); }
        else if (t === "ajuste") {
          const d = Math.round((kg - movAlvo.saldo) * 100) / 100;
          if (!d) { CW.mostrarToast("Contagem igual ao sistema: nada lançado."); fecharMov(); return; }
          await A.movimentarEstoque({ produto_id: movAlvo.produto_id, cor: movAlvo.cor, tipo: "ajuste", kg: d, documento: $("#mov-doc").value, obs: $("#mov-obs").value || `Inventário: contado ${fmtKg(kg)}` });
          CW.mostrarToast("Inventário registrado.");
        } else {
          await A.movimentarEstoque({ produto_id: movAlvo.produto_id, cor: movAlvo.cor, tipo: t, kg, pedido_numero: pedido || null, documento: $("#mov-doc").value, obs: $("#mov-obs").value });
          CW.mostrarToast(t === "entrada" ? "Entrada registrada." : "Saída registrada.");
        }
        fecharMov(); carregarEstoque();
      } catch (err) { $("#mov-erro").textContent = err.message; }
      finally { b.disabled = false; }
    });
    $("#estoque-csv").addEventListener("click", () => {
      const cel = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
      const n = (v) => String(Math.round(v * 100) / 100).replace(".", ",");
      const linhas = [["Produto", "Código", "Cor", "Saldo (kg)", "Caixas de 25 kg", "Mínimo (kg)", "Situação", "Última movimentação"]];
      estoqueFiltrado().forEach((i) => linhas.push([i.nome, i.produto_id, i.cor, n(i.saldo), Math.floor(Math.max(0, i.saldo) / KG_CAIXA), n(i.minimo), SELO_EST[situacao(i)][1], i.ultima ? dataBR(i.ultima) : ""]));
      const csv = "\ufeff" + linhas.map((l) => l.map(cel).join(";")).join("\r\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      a.download = `estoque-policoating-${new Date().toISOString().slice(0, 10)}.csv`;
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
               <label class="check-excluir"><input type="checkbox" data-permissao="pode_exportar" ${m.pode_exportar ? "checked" : ""}> Pode exportar clientes</label>
               <label class="check-excluir"><input type="checkbox" data-permissao="pode_estoque" ${m.pode_estoque ? "checked" : ""}> Pode movimentar estoque</label>`}
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
        const email = chk.closest("[data-email]").dataset.email, oque = { pode_excluir: "excluir pedidos", pode_exportar: "exportar clientes", pode_estoque: "movimentar o estoque" }[chk.dataset.permissao];
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

    // atalhos: admin.html#vendas (menu) e admin.html#venda=PC-... ; vendedor abre direto nas vendas
    const h = location.hash;
    if (h.startsWith("#venda=")) { abrirAba("vendas"); abrirVenda(decodeURIComponent(h.slice(7))); }
    else if (h === "#vendas" || !ehAdmin) abrirAba("vendas");
  });
})();
