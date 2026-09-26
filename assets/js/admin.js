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
      $(".cabecalho-pagina p").textContent = "Encontre qualquer pedido pelo código ou pelo nome do cliente, e veja a carteira de clientes.";
      $$(".admin-abas [data-aba]").forEach((b) => { if (!["pedidos", "clientes"].includes(b.dataset.aba)) b.remove(); });
    }
    const [podeExcluir, podeExportar] = await Promise.all([A.podeExcluirPedidos(), A.podeExportarClientes()]);
    const extras = [podeExcluir && "pode excluir pedidos", podeExportar && "pode exportar clientes"].filter(Boolean);
    $("#selo-papel").textContent = (ehAdmin ? "Administrador" : "Vendedor") + (!ehAdmin && extras.length ? ` (${extras.join(", ")})` : "");
    $("#clientes-csv").hidden = !podeExportar;

    const filtro = $("#admin-filtro"), selCat = $("[name=categoria]");
    const opcoes = Object.entries(CATS).map(([k, c]) => `<option value="${esc(k)}">${esc(c.nome)}</option>`).join("");
    filtro.insertAdjacentHTML("beforeend", opcoes);
    selCat.innerHTML = opcoes;

    let registros = [];
    async function carregar() {
      try { registros = await A.listar(); }
      catch (e) { CW.mostrarToast(e.message); registros = []; }
      $("#btn-importar").hidden = registros.length > 0;
      desenhar();
    }

    function miniatura(p) {
      const c = p.cores[0];
      return `<img src="${esc(CW.fotoProduto(p, c, { largura: 96, altura: 76 }))}" alt="" width="64" height="51" data-produto="${esc(p.id)}" data-cor="${esc(c.nome)}">`;
    }
    function desenhar() {
      const termo = slug($("#admin-busca").value || "");
      const cat = filtro.value;
      const lista = registros.filter((r) => (!cat || r.dados.categoria === cat) &&
        (!termo || slug([r.dados.nome, r.id, r.dados.linha, r.dados.cores.map((c) => c.nome).join(" ")].join(" ")).includes(termo)));
      $("#admin-contagem").textContent = registros.length
        ? `${lista.length} de ${registros.length} produtos · ${registros.filter((r) => r.ativo).length} visíveis no site`
        : "Nenhum produto cadastrado no painel. O site está usando a lista padrão (produtos.js). Clique em \"Importar produtos atuais do site\" para começar a editar.";
      $("#admin-lista").innerHTML = lista.map((r) => {
        const p = r.dados;
        return `<tr data-id="${esc(r.id)}" class="${r.ativo ? "" : "oculto"}">
          <td><div class="admin-prod">${miniatura(p)}<div><strong>${esc(p.nome)}</strong><small>${esc(r.id)}${p.destaque ? " · ★ destaque" : ""}</small></div></div></td>
          <td>${esc((CATS[p.categoria] || {}).nome || p.categoria)}</td>
          <td><div class="admin-bolinhas">${p.cores.slice(0, 8).map((c) => `<i style="background:${esc(c.hex)}" title="${esc(c.nome)}"></i>`).join("")}${p.cores.length > 8 ? `<small>+${p.cores.length - 8}</small>` : ""}</div></td>
          <td>${esc(r.ordem)}</td>
          <td><button type="button" class="admin-status ${r.ativo ? "on" : ""}" data-acao="alternar">${r.ativo ? "Visível" : "Oculto"}</button></td>
          <td class="admin-botoes">
            <button type="button" data-acao="editar">Editar</button>
            <button type="button" data-acao="duplicar">Duplicar</button>
            <button type="button" data-acao="excluir" class="perigo">Excluir</button>
          </td></tr>`;
      }).join("");
    }

    $("#admin-busca").addEventListener("input", desenhar);
    filtro.addEventListener("change", desenhar);
    $("#btn-importar").addEventListener("click", async (e) => {
      e.target.disabled = true;
      try { const n = await A.importarPadrao(); CW.mostrarToast(`${n} produtos importados. Agora você pode editar.`); await carregar(); }
      catch (err) { CW.mostrarToast(err.message); }
      finally { e.target.disabled = false; }
    });

    $("#admin-lista").addEventListener("click", async (e) => {
      const b = e.target.closest("[data-acao]"); if (!b) return;
      const id = b.closest("tr").dataset.id, r = registros.find((x) => x.id === id); if (!r) return;
      if (b.dataset.acao === "editar") abrir(r, false);
      if (b.dataset.acao === "duplicar") abrir(r, true);
      if (b.dataset.acao === "alternar") {
        b.disabled = true;
        try { await A.salvar(r.dados, !r.ativo, r.ordem); await carregar(); CW.mostrarToast(r.ativo ? "Produto oculto do site." : "Produto visível no site."); }
        catch (err) { CW.mostrarToast(err.message); b.disabled = false; }
      }
      if (b.dataset.acao === "excluir") {
        if (!confirm(`Excluir "${r.dados.nome}" do catálogo? Isso não pode ser desfeito.\n\nDica: para tirar do site só por um tempo, use "Visível/Oculto".`)) return;
        try { await A.excluir(id); await carregar(); CW.mostrarToast("Produto excluído."); }
        catch (err) { CW.mostrarToast(err.message); }
      }
    });

    /* ---------- Formulário ---------- */
    const modal = $("#admin-modal"), form = $("#admin-form"), listaCores = $("#lista-cores");
    let editando = null, idManual = false, fichaAtual = "";
    function mostrarFicha(url) {
      fichaAtual = url || "";
      const a = $("#ficha-link");
      a.hidden = !fichaAtual; if (fichaAtual) a.href = fichaAtual;
      $("#ficha-remover").hidden = !fichaAtual;
    }
    $("#ficha-remover").addEventListener("click", () => mostrarFicha(""));
    $("#ficha-arquivo").addEventListener("change", async (e) => {
      const arq = e.target.files[0]; if (!arq) return;
      const id = form.id.value.trim();
      if (!/^[a-z0-9-]{2,60}$/.test(id)) { erro("Preencha o código (id) do produto antes de enviar o PDF."); e.target.value = ""; return; }
      try { mostrarFicha(await A.enviarPdf(arq, id)); erro(""); } catch (err) { erro(err.message); }
      e.target.value = "";
    });

    function linhaCor(c = { nome: "", hex: "#1558d6" }) {
      const div = document.createElement("div");
      div.className = "admin-cor";
      div.dataset.foto = c.foto || "";
      div.innerHTML = `
        <input type="color" value="${esc(c.hex)}" aria-label="Cor">
        <input type="text" class="cor-hex" value="${esc(c.hex)}" maxlength="7" aria-label="Código hexadecimal">
        <input type="text" class="cor-nome" value="${esc(c.nome)}" placeholder="Nome (ex.: Preto RAL 9005)" maxlength="60" aria-label="Nome da cor">
        <label class="cor-foto" title="Foto real desta cor (opcional)">
          <span class="cor-previa">${c.foto ? `<img src="${esc(c.foto)}" alt="">` : "Foto"}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" hidden>
        </label>
        <button type="button" class="cor-sem-foto" ${c.foto ? "" : "hidden"}>Tirar foto</button>
        <button type="button" class="cor-remover" aria-label="Remover cor">×</button>`;
      const cor = $("input[type=color]", div), hex = $(".cor-hex", div);
      cor.addEventListener("input", () => (hex.value = cor.value));
      hex.addEventListener("input", () => { if (/^#[0-9a-f]{6}$/i.test(hex.value)) cor.value = hex.value; });
      $(".cor-remover", div).addEventListener("click", () => div.remove());
      $(".cor-sem-foto", div).addEventListener("click", (e) => { div.dataset.foto = ""; $(".cor-previa", div).textContent = "Foto"; e.target.hidden = true; });
      $("input[type=file]", div).addEventListener("change", async (e) => {
        const arq = e.target.files[0]; if (!arq) return;
        const id = form.id.value.trim();
        if (!/^[a-z0-9-]{2,60}$/.test(id)) { erro("Preencha o código (id) do produto antes de enviar fotos."); return; }
        $(".cor-previa", div).textContent = "Enviando...";
        try {
          const url = await A.enviarFoto(arq, id);
          div.dataset.foto = url;
          $(".cor-previa", div).innerHTML = `<img src="${esc(url)}" alt="">`;
          $(".cor-sem-foto", div).hidden = false;
        } catch (err) { $(".cor-previa", div).textContent = "Foto"; erro(err.message); }
        e.target.value = "";
      });
      listaCores.appendChild(div);
    }

    function abrir(r, duplicar) {
      editando = r && !duplicar ? r.id : null;
      const p = r ? JSON.parse(JSON.stringify(r.dados)) : { categoria: Object.keys(CATS)[0], embalagens: ["Caixa 25 kg", "Caixa 20 kg"], cores: [] };
      if (duplicar) { p.nome = p.nome + " (cópia)"; p.id = p.id + "-copia"; }
      $("#form-titulo").textContent = editando ? "Editar produto" : "Novo produto";
      ["nome", "id", "linha", "acabamento", "descricao", "rendimento", "cura"].forEach((k) => (form[k].value = p[k] || ""));
      form.categoria.value = p.categoria;
      form.densidade.value = p.densidade || "";
      form.preco.value = p.preco || "";
      form.embalagens.value = (p.embalagens || []).join(", ");
      form.ordem.value = r ? r.ordem + (duplicar ? 1 : 0) : (registros.reduce((m, x) => Math.max(m, x.ordem), 0) + 10);
      form.destaque.checked = !!p.destaque;
      form.ativo.checked = r ? r.ativo : true;
      form.id.readOnly = !!editando;
      mostrarFicha(p.ficha);
      idManual = !!r;
      listaCores.innerHTML = "";
      (p.cores.length ? p.cores : [undefined]).forEach((c) => linhaCor(c));
      erro("");
      modal.hidden = false;
      document.body.style.overflow = "hidden";
      form.nome.focus();
    }
    function fechar() { modal.hidden = true; document.body.style.overflow = ""; }
    function erro(msg) { $("#form-erro").textContent = msg; }

    $("#btn-novo").addEventListener("click", () => abrir(null));
    $("#btn-cor").addEventListener("click", () => { linhaCor(); $(".admin-cor:last-child .cor-nome", listaCores).focus(); });
    $$("[data-fechar]", modal).forEach((b) => b.addEventListener("click", fechar));
    modal.addEventListener("click", (e) => { if (e.target === modal) fechar(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) fechar(); });
    form.nome.addEventListener("input", () => { if (!idManual && !editando) form.id.value = slug(form.nome.value).slice(0, 60); });
    form.id.addEventListener("input", () => (idManual = true));

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const cores = $$(".admin-cor", listaCores).map((d) => {
        const c = { nome: $(".cor-nome", d).value.trim(), hex: $(".cor-hex", d).value.trim() };
        if (d.dataset.foto) c.foto = d.dataset.foto;
        return c;
      }).filter((c) => c.nome);
      const dados = {
        id: form.id.value.trim(),
        nome: form.nome.value.trim(),
        categoria: form.categoria.value,
        linha: form.linha.value.trim(),
        acabamento: form.acabamento.value.trim(),
        descricao: form.descricao.value.trim(),
        rendimento: form.rendimento.value.trim(),
        cura: form.cura.value.trim(),
        embalagens: form.embalagens.value.split(",").map((x) => x.trim()).filter(Boolean),
        cores,
        destaque: form.destaque.checked,
      };
      if (form.densidade.value) dados.densidade = Number(form.densidade.value);
      if (fichaAtual) dados.ficha = fichaAtual;
      if (form.preco.value) dados.preco = Number(form.preco.value);
      if (!dados.nome) return erro("Informe o nome do produto.");
      if (!/^[a-z0-9-]{2,60}$/.test(dados.id)) return erro("Código (id) inválido: use letras minúsculas, números e hífen.");
      if (!editando && registros.some((r) => r.id === dados.id)) return erro("Já existe um produto com este código.");
      if (!cores.length) return erro("Adicione pelo menos uma cor com nome.");
      const hexRuim = cores.find((c) => !/^#[0-9a-f]{6}$/i.test(c.hex));
      if (hexRuim) return erro(`Cor "${hexRuim.nome}": código inválido (use o formato #RRGGBB).`);
      if (!dados.embalagens.length) return erro("Informe pelo menos uma embalagem.");
      const botao = $("#btn-salvar"); botao.disabled = true;
      try {
        await A.salvar(dados, form.ativo.checked, form.ordem.value);
        fechar();
        await carregar();
        CW.mostrarToast("Produto salvo. Ele já aparece no catálogo do site.");
      } catch (err) { erro(err.message); }
      finally { botao.disabled = false; }
    });

    if (ehAdmin) carregar();

    /* ---------- Abas ---------- */
    const abas = $$(".admin-abas [data-aba]");
    const abrirAba = (nome) => {
      abas.forEach((b) => { const on = b.dataset.aba === nome; b.classList.toggle("ativo", on); b.setAttribute("aria-selected", on); });
      $$(".admin-aba").forEach((c) => (c.hidden = c.dataset.conteudo !== nome));
      if (nome === "contato") carregarConfig();
      if (nome === "pedidos") carregarPedidos();
      if (nome === "clientes") carregarClientes();
      if (nome === "galeria") carregarGaleria();
      if (nome === "equipe") carregarEquipe();
    };
    abas.forEach((b) => b.addEventListener("click", () => abrirAba(b.dataset.aba)));

    /* ---------- Pedidos (administradores e vendedores) ---------- */
    let pedidos = [], pedidosCarregados = false, espera = 0;
    const nomeCliente = (c) => (c.tipo === "pj" ? (c.nome_fantasia || c.razao_social) : c.nome) || c.email || "Cliente";
    const kgPedido = (p) => (p.itens || []).reduce((s, it) => s + CW.kgDoItem({ embalagem: it.embalagem, qtd: +it.qtd || 0 }), 0);
    const dataBR = (d) => (d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "");
    async function carregarPedidos() {
      $("#pedidos-erro").textContent = "";
      try { pedidos = await A.listarPedidos($("#pedidos-busca").value); pedidosCarregados = true; }
      catch (e) { pedidos = []; $("#pedidos-erro").textContent = e.message + " (rode as PARTES F e G do setup.sql no Supabase)"; }
      desenharPedidos();
    }
    function filtrados() {
      const termo = slug($("#pedidos-busca").value || ""), dias = +$("#pedidos-periodo").value;
      const limite = dias ? Date.now() - dias * 864e5 : 0;
      return pedidos.filter((p) => (!limite || new Date(p.criado_em).getTime() >= limite) && (!termo || slug([p.numero, nomeCliente(p.cliente), p.cliente.razao_social,
        p.cliente.responsavel, p.cliente.cidade, p.cliente.email, p.cliente.telefone, p.cliente.cnpj, p.cliente.cpf,
        (p.itens || []).map((i) => i.nome + " " + i.cor).join(" ")].join(" ")).includes(termo)));
    }
    function desenharPedidos() {
      const lista = filtrados(), termo = $("#pedidos-busca").value.trim();
      $("#pedidos-resumo").innerHTML = pedidos.length
        ? `<span><strong>${lista.length}</strong> ${lista.length === 1 ? "pedido encontrado" : "pedidos encontrados"}</span><span><strong>${lista.reduce((s, p) => s + kgPedido(p), 0).toLocaleString("pt-BR")}</strong> kg</span>` : "";
      $("#admin-pedidos").innerHTML = lista.length ? lista.map((p) => {
        const c = p.cliente || {}, tel = String(c.telefone || "").replace(/\D/g, "");
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
            <ul>${(p.itens || []).map((it) => `<li><strong>${esc(it.nome)}</strong> · ${esc(it.cor)}<small>${esc(CW.descreverQtd({ embalagem: it.embalagem, qtd: +it.qtd || 0 }))}</small></li>`).join("")}</ul>
            ${p.observacoes ? `<p class="obs">Obs.: ${esc(p.observacoes)}</p>` : ""}
          </div>
          <footer>
            <span>Total: <strong>${kgPedido(p).toLocaleString("pt-BR")} kg</strong></span>
            <span class="adm-pedido-botoes">${podeExcluir ? `<button type="button" class="btn-excluir-pedido" data-excluir-pedido="${esc(p.numero)}">Excluir pedido</button>` : ""}
            ${tel ? `<a class="btn btn-whats" target="_blank" rel="noopener" href="https://wa.me/${tel.length <= 11 ? "55" + tel : tel}?text=${encodeURIComponent(`Olá, ${nomeCliente(c)}! Aqui é da Policoating, sobre o seu pedido ${p.numero}.`)}">Chamar cliente</a>` : ""}</span>
          </footer>
        </article>`;
      }).join("") : `<p class="dica">${!pedidosCarregados ? "Carregando..." : pedidos.length ? `Nenhum pedido encontrado para "${esc(termo)}". Confira o código (ex.: PC-260926-AB12) ou tente só parte do nome.` : "Nenhum pedido ainda. Os pedidos enviados pelo site aparecem aqui."}</p>`;
    }
    $("#pedidos-busca").addEventListener("input", () => {
      desenharPedidos();
      // código completo que não está na lista: procura no histórico inteiro
      clearTimeout(espera);
      if (/^pc-\S{6,}/i.test($("#pedidos-busca").value.trim()) && !filtrados().length) espera = setTimeout(carregarPedidos, 500);
    });
    $("#pedidos-periodo").addEventListener("change", desenharPedidos);
    $("#pedidos-atualizar").addEventListener("click", carregarPedidos);
    $("#admin-pedidos").addEventListener("click", async (e) => {
      const x = e.target.closest("[data-excluir-pedido]");
      if (x) {
        const num = x.dataset.excluirPedido;
        if (!confirm(`Excluir o pedido ${num}?\n\nEle some do painel e do histórico do cliente. Isso não pode ser desfeito.`)) return;
        x.disabled = true;
        try { await A.excluirPedido(num); pedidos = pedidos.filter((p) => p.numero !== num); desenharPedidos(); CW.mostrarToast(`Pedido ${num} excluído.`); }
        catch (err) { x.disabled = false; $("#pedidos-erro").textContent = err.message; }
        return;
      }
      const b = e.target.closest("[data-copiar]"); if (!b) return;
      (navigator.clipboard ? navigator.clipboard.writeText(b.dataset.copiar) : Promise.reject()).then(() => CW.mostrarToast("Código copiado."), () => {});
    });
    $("#pedidos-csv").addEventListener("click", () => {
      const lista = filtrados();
      const cel = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
      const linhas = [["Pedido", "Data", "Cliente", "Documento", "E-mail", "Telefone", "Cidade", "UF", "Produto", "Cor", "Quantidade", "Kg", "Observações"]];
      lista.forEach((p) => (p.itens || []).forEach((it) => {
        const c = p.cliente || {};
        linhas.push([p.numero, dataBR(p.criado_em), nomeCliente(c), c.cnpj || c.cpf || "", c.email || "", c.telefone || "", c.cidade || "", c.uf || "",
          it.nome, it.cor, CW.descreverQtd({ embalagem: it.embalagem, qtd: +it.qtd || 0 }), CW.kgDoItem({ embalagem: it.embalagem, qtd: +it.qtd || 0 }), p.observacoes || ""]);
      }));
      const csv = "\ufeff" + linhas.map((l) => l.map(cel).join(";")).join("\r\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      a.download = `pedidos-policoating-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
    });
    if (!ehAdmin) abrirAba("pedidos");

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
        const email = chk.closest("[data-email]").dataset.email, oque = chk.dataset.permissao === "pode_excluir" ? "excluir pedidos" : "exportar clientes";
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
  });
})();
