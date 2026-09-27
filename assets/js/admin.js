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
      $$(".admin-abas [data-aba]").forEach((b) => { if (!["pedidos", "vendas", "clientes", "estoque"].includes(b.dataset.aba)) b.remove(); });
    }
    const [podeExcluir, podeExportar, podeEstoque] = await Promise.all([A.podeExcluirPedidos(), A.podeExportarClientes(), A.podeMovimentarEstoque()]);
    const extras = [podeExcluir && "pode excluir pedidos", podeExportar && "pode exportar clientes", podeEstoque && "pode movimentar estoque"].filter(Boolean);
    $("#selo-papel").textContent = (ehAdmin ? "Administrador" : "Vendedor") + (!ehAdmin && extras.length ? ` (${extras.join(", ")})` : "");
    $("#clientes-csv").hidden = !podeExportar;

    const filtro = $("#admin-filtro"), selCat = $("[name=categoria]");
    const opcoes = Object.entries(CATS).map(([k, c]) => `<option value="${esc(k)}">${esc(c.nome)}</option>`).join("");
    filtro.insertAdjacentHTML("beforeend", opcoes);
    selCat.innerHTML = opcoes;

    let registros = [], saldosProd = {};
    const fmtR = (v) => (+v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    async function carregar() {
      try { registros = await A.listar(); }
      catch (e) { CW.mostrarToast(e.message); registros = []; }
      try {
        const sal = await A.estoqueSaldos(); saldosProd = {};
        Object.entries(sal).forEach(([k, v]) => { const id = k.split("|")[0]; saldosProd[id] = (saldosProd[id] || 0) + v.saldo; });
      } catch (e) { saldosProd = {}; }
      $("#btn-importar").hidden = registros.length > 0;
      const antigos = registros.filter((r) => (r.dados.cores || []).length > 1);
      $("#aviso-cores").hidden = !antigos.length;
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
        : "Nenhum produto cadastrado no painel. O site está usando a lista padrão (produtos.js). Clique em \"Importar produtos atuais do site\" para começar a editar.";
      $("#admin-lista").innerHTML = lista.map((r) => {
        const p = r.dados, varias = (p.cores || []).length > 1, est = saldosProd[r.id];
        return `<tr data-id="${esc(r.id)}" class="${r.ativo ? "" : "oculto"}">
          <td><div class="admin-prod">${miniatura(p)}<div><strong>${esc(p.nome)}</strong><small>Cód. ${esc(p.codigo || r.id.toUpperCase())}${p.destaque ? " · ★ destaque" : ""}${varias ? ` · <b class="selo-cli inativo">${p.cores.length} cores (converter)</b>` : ""}${p.cores[0] && !p.cores[0].foto ? ` · <span class="sem-foto">sem foto</span>` : ""}</small></div></div></td>
          <td>${esc((CATS[p.categoria] || {}).nome || p.categoria)}</td>
          <td>${textoPreco(p)}</td>
          <td>${est == null ? "—" : `<strong class="${est > 0 ? "" : "zerado"}">${(Math.round(est * 100) / 100).toLocaleString("pt-BR")} kg</strong>`}</td>
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
    let editando = null, fichaAtual = "", fotoAtual = "";
    const codigoAtual = () => form.codigo.value.trim().toUpperCase();
    const codigoOk = () => window.Catalogo.CODIGO_RE.test(codigoAtual());
    function mostrarFicha(url) {
      fichaAtual = url || "";
      const a = $("#ficha-link");
      a.hidden = !fichaAtual; if (fichaAtual) a.href = fichaAtual;
      $("#ficha-remover").hidden = !fichaAtual;
    }
    function mostrarFoto(url) {
      fotoAtual = url || "";
      $("#foto-previa").innerHTML = fotoAtual ? `<img src="${esc(fotoAtual)}" alt="Foto do produto">` : `Clique para enviar a foto<small>JPG, PNG ou WEBP</small>`;
      $("#foto-caixa").classList.toggle("com-foto", !!fotoAtual);
      $("#foto-remover").hidden = !fotoAtual;
    }
    $("#ficha-remover").addEventListener("click", () => mostrarFicha(""));
    $("#foto-remover").addEventListener("click", () => mostrarFoto(""));
    $("#ficha-arquivo").addEventListener("change", async (e) => {
      const arq = e.target.files[0]; if (!arq) return;
      if (!codigoOk()) { erro("Preencha o código do produto antes de enviar o PDF."); e.target.value = ""; return; }
      try { mostrarFicha(await A.enviarPdf(arq, codigoAtual().toLowerCase())); erro(""); } catch (err) { erro(err.message); }
      e.target.value = "";
    });
    $("#foto-arquivo").addEventListener("change", async (e) => {
      const arq = e.target.files[0]; if (!arq) return;
      if (!codigoOk()) { erro("Preencha o código do produto antes de enviar a foto."); e.target.value = ""; return; }
      $("#foto-previa").textContent = "Enviando...";
      try { mostrarFoto(await A.enviarFoto(arq, codigoAtual().toLowerCase())); erro(""); }
      catch (err) { mostrarFoto(fotoAtual); erro(err.message); }
      e.target.value = "";
    });
    const tom = $("#cor-tom"), hex = $("#cor-hex");
    tom.addEventListener("input", () => (hex.value = tom.value));
    hex.addEventListener("input", () => { if (/^#[0-9a-f]{6}$/i.test(hex.value)) tom.value = hex.value; });
    form.codigo.addEventListener("input", () => { const p = form.codigo.selectionStart; form.codigo.value = form.codigo.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""); form.codigo.setSelectionRange(p, p); });

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

    function abrir(r, duplicar) {
      editando = r && !duplicar ? r.id : null;
      const p = r ? JSON.parse(JSON.stringify(r.dados)) : { categoria: Object.keys(CATS)[0], embalagens: ["Caixa 25 kg", "Caixa 20 kg"], cores: [{ nome: "", hex: "#1558d6" }] };
      $("#form-titulo").textContent = editando ? "Editar produto" : duplicar ? "Novo produto (cópia)" : "Novo produto";
      form.codigo.value = duplicar ? "" : (p.codigo || (r ? r.id.toUpperCase() : ""));
      form.codigo.readOnly = !!editando;
      ["nome", "linha", "acabamento", "descricao", "rendimento", "cura"].forEach((k) => (form[k].value = p[k] || ""));
      if (duplicar) form.nome.value = "";
      form.categoria.value = p.categoria;
      form.densidade.value = p.densidade || "";
      form.embalagens.value = (p.embalagens || []).join(", ");
      const c = (p.cores || [])[0] || { nome: "", hex: "#1558d6" };
      $("#cor-nome").value = duplicar ? "" : c.nome; hex.value = tom.value = c.hex || "#1558d6";
      mostrarFoto(duplicar ? "" : c.foto);
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
      (editando ? form.nome : form.codigo).focus();
    }
    function fechar() { modal.hidden = true; document.body.style.overflow = ""; }
    function erro(msg) { $("#form-erro").textContent = msg; }

    $("#btn-novo").addEventListener("click", () => abrir(null));
    $$("[data-fechar]", modal).forEach((b) => b.addEventListener("click", fechar));
    modal.addEventListener("click", (e) => { if (e.target === modal) fechar(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) fechar(); });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const cor = { nome: $("#cor-nome").value.replace(/\s+/g, " ").trim(), hex: hex.value.trim() };
      if (fotoAtual) cor.foto = fotoAtual;
      const combinar = modoPreco() === "combinar";
      const dados = {
        codigo: codigoAtual(),
        nome: form.nome.value.replace(/\s+/g, " ").trim(),
        categoria: form.categoria.value,
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
      if (!editando && registros.some((r) => r.id === dados.codigo.toLowerCase())) return erro(`Já existe um produto com o código ${dados.codigo}. Use outro código.`);
      const botao = $("#btn-salvar"); botao.disabled = true;
      try {
        await A.salvar(dados, form.ativo.checked, form.ordem.value, !editando);
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
      if (nome === "vendas") carregarVendas();
      if (nome === "estoque") carregarEstoque();
      if (nome === "galeria") carregarGaleria();
      if (nome === "equipe") carregarEquipe();
    };
    abas.forEach((b) => b.addEventListener("click", () => abrirAba(b.dataset.aba)));

    /* ---------- Pedidos (administradores e vendedores) ---------- */
    let pedidos = [], pedidosCarregados = false, espera = 0;
    const nomeCliente = (c) => (c.tipo === "pj" ? (c.nome_fantasia || c.razao_social) : c.nome) || c.email || "Cliente";
    const kgPedido = (p) => (p.itens || []).reduce((s, it) => s + CW.kgDoItem({ embalagem: it.embalagem, qtd: +it.qtd || 0 }), 0);
    const dataBR = (d) => (d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "");
    let baixados = new Set();   // "PC-...|produto|cor" que já tiveram baixa no estoque
    async function carregarBaixas() {
      try { baixados = new Set((await A.estoqueMovimentos({}, 5000)).filter((m) => m.tipo === "saida" && m.pedido_numero).map((m) => m.pedido_numero + "|" + m.produto_id + "|" + m.cor)); }
      catch (e) { baixados = new Set(); }
    }
    const situacaoBaixa = (p) => {
      const itens = (p.itens || []).filter((it) => it.id);
      if (!itens.length) return "sem-itens";
      const feitos = itens.filter((it) => baixados.has(p.numero + "|" + it.id + "|" + it.cor)).length;
      return feitos === itens.length ? "feita" : feitos ? "parcial" : "pendente";
    };
    let vendasPorPedido = {};
    async function carregarVendasDosPedidos() {
      try { vendasPorPedido = {}; (await A.listarVendas()).forEach((v) => (vendasPorPedido[v.pedido_numero] = v)); }
      catch (e) { vendasPorPedido = {}; }
    }
    async function carregarPedidos() {
      $("#pedidos-erro").textContent = "";
      await Promise.all([carregarBaixas(), carregarVendasDosPedidos()]);
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
            <span class="adm-pedido-botoes">${(() => {
              const v = vendasPorPedido[p.numero];
              if (v) return v.status === "cancelada" ? `<b class="selo-cli zerado">Venda cancelada</b>` : `<b class="selo-cli ativo">Vendido · ${fmtR(v.total)}</b>`;
              if (situacaoBaixa(p) === "feita") return `<b class="selo-cli ativo">Vendido</b>`;
              if (situacaoBaixa(p) === "sem-itens") return "";
              return `<button type="button" class="btn btn-primario" data-vender="${esc(p.numero)}">Confirmar venda</button>`;
            })()}
            ${podeExcluir ? `<button type="button" class="btn-excluir-pedido" data-excluir-pedido="${esc(p.numero)}">Excluir pedido</button>` : ""}
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
      const vd = e.target.closest("[data-vender]");
      if (vd) { const ped = pedidos.find((p) => p.numero === vd.dataset.vender); if (ped) abrirVenda(ped); return; }
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

    /* ---------- Confirmar venda (a partir do pedido) ---------- */
    const modalVenda = $("#modal-venda"), formVenda = $("#form-venda");
    let pedidoVenda = null;
    const produtoDoItem = (it) => (CW.acharProduto ? CW.acharProduto(it.id, it.cor) : CW.buscarProduto(it.id));
    function abrirVenda(ped) {
      pedidoVenda = ped;
      // um item por produto (soma as embalagens)
      const soma = {};
      (ped.itens || []).forEach((it) => {
        if (!it.id) return;
        const k = it.id + "|" + it.cor, prod = produtoDoItem(it);
        const kg = CW.kgDoItem({ embalagem: it.embalagem, qtd: +it.qtd || 0 });
        const preco = it.preco_kg != null ? +it.preco_kg : prod ? CW.precoInfo(prod).efetivo : 0;
        if (!soma[k]) soma[k] = { produto_id: it.id, codigo: it.codigo || (prod && prod.codigo) || it.id.toUpperCase(), nome: it.nome, cor: it.cor, kg: 0, preco_kg: preco || "", combinar: !preco };
        soma[k].kg += kg;
      });
      const itens = Object.values(soma);
      $("#venda-titulo").textContent = `Confirmar venda · ${ped.numero}`;
      $("#venda-cliente").innerHTML = `Cliente: <strong>${esc(nomeCliente(ped.cliente || {}))}</strong>${ped.cliente && ped.cliente.cidade ? ` · ${esc(ped.cliente.cidade)}/${esc(ped.cliente.uf || "")}` : ""}`;
      $("#venda-itens").innerHTML = itens.map((i, k) => `<tr data-k="${k}" data-produto="${esc(i.produto_id)}" data-cor="${esc(i.cor)}" data-codigo="${esc(i.codigo)}" data-nome="${esc(i.nome)}">
        <td><strong>${esc(i.nome)}</strong><small>Cód. ${esc(i.codigo)}${i.combinar ? ` · <b class="selo-cli inativo">a combinar</b>` : ""}</small></td>
        <td><input type="number" class="v-kg" min="0.01" step="0.01" value="${i.kg}" aria-label="Kg vendidos"></td>
        <td><input type="number" class="v-preco" min="0" step="0.01" value="${i.preco_kg}" placeholder="Combinado" aria-label="Preço por kg"></td>
        <td class="v-sub">—</td></tr>`).join("");
      $("#venda-obs").value = ""; $("#venda-erro").textContent = "";
      totalVenda();
      modalVenda.hidden = false; document.body.style.overflow = "hidden";
      const vazio = $(".v-preco:placeholder-shown", modalVenda); (vazio || $(".v-kg", modalVenda)).focus();
    }
    function totalVenda() {
      let t = 0;
      $$("#venda-itens tr").forEach((tr) => {
        const kg = +$(".v-kg", tr).value || 0, pr = +$(".v-preco", tr).value || 0, sub = Math.round(kg * pr * 100) / 100;
        $(".v-sub", tr).textContent = $(".v-preco", tr).value === "" ? "—" : fmtR(sub); t += sub;
      });
      $("#venda-total").textContent = fmtR(t);
    }
    $("#venda-itens").addEventListener("input", totalVenda);
    const fecharVenda = () => { modalVenda.hidden = true; document.body.style.overflow = ""; };
    $$("[data-fechar-venda]", modalVenda).forEach((b) => b.addEventListener("click", fecharVenda));
    modalVenda.addEventListener("click", (e) => { if (e.target === modalVenda) fecharVenda(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modalVenda.hidden) fecharVenda(); });
    formVenda.addEventListener("submit", async (e) => {
      e.preventDefault();
      const itens = $$("#venda-itens tr").map((tr) => ({ produto_id: tr.dataset.produto, cor: tr.dataset.cor, codigo: tr.dataset.codigo, nome: tr.dataset.nome,
        kg: +$(".v-kg", tr).value, preco_kg: $(".v-preco", tr).value === "" ? null : +$(".v-preco", tr).value }));
      const semPreco = itens.find((i) => i.preco_kg == null);
      if (semPreco) return ($("#venda-erro").textContent = `Informe o preço combinado de ${semPreco.nome}.`);
      const semKg = itens.find((i) => !(i.kg > 0));
      if (semKg) return ($("#venda-erro").textContent = `Informe os kg vendidos de ${semKg.nome}.`);
      const b = $("#venda-salvar"); b.disabled = true;
      try {
        await A.confirmarVenda(pedidoVenda, itens, $("#venda-obs").value);
        fecharVenda();
        CW.mostrarToast(`Venda do pedido ${pedidoVenda.numero} confirmada.`);
        await carregarPedidos();
      } catch (err) { $("#venda-erro").textContent = err.message; }
      finally { b.disabled = false; }
    });

    /* ---------- Vendas ---------- */
    let vendas = [], vendasCarregadas = false;
    function inicioPeriodo(v) {
      const d = new Date(); d.setHours(0, 0, 0, 0);
      if (v === "hoje") return d.getTime();
      if (v === "mes") return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      if (v === "ano") return new Date(d.getFullYear(), 0, 1).getTime();
      return +v ? Date.now() - +v * 864e5 : 0;
    }
    async function carregarVendas() {
      $("#vendas-erro").textContent = "";
      try { vendas = await A.listarVendas(); vendasCarregadas = true; }
      catch (e) { vendas = []; $("#vendas-erro").textContent = e.message; }
      const vend = [...new Set(vendas.map((v) => v.vendedor))].sort();
      const sel = $("#vendas-vendedor"), atual = sel.value;
      sel.hidden = !ehAdmin;
      sel.innerHTML = `<option value="">Todos os vendedores</option>` + vend.map((v) => `<option ${v === atual ? "selected" : ""}>${esc(v)}</option>`).join("");
      $("#vendas-dica").textContent = ehAdmin ? "Uma venda é registrada quando alguém da equipe clica em \"Confirmar venda\" no pedido. A baixa no estoque é feita junto."
        : "Aqui aparecem as vendas que você confirmou. Para registrar uma venda, clique em \"Confirmar venda\" no pedido.";
      $("#vendas-titulo-vendedores").hidden = $("#vendas-vendedores").hidden = !ehAdmin;
      desenharVendas();
    }
    function vendasFiltradas() {
      const termo = slug($("#vendas-busca").value || ""), desde = inicioPeriodo($("#vendas-periodo").value);
      const st = $("#vendas-status").value, vend = $("#vendas-vendedor").value;
      return vendas.filter((v) => (!desde || new Date(v.criado_em).getTime() >= desde) && (!st || v.status === st) && (!vend || v.vendedor === vend) &&
        (!termo || slug([v.pedido_numero, v.cliente_nome, v.vendedor, v.obs, (v.itens || []).map((i) => [i.nome, i.codigo, i.cor].join(" ")).join(" ")].join(" ")).includes(termo)));
    }
    function desenharVendas() {
      const lista = vendasFiltradas(), ok = lista.filter((v) => v.status === "confirmada");
      const fat = ok.reduce((s, v) => s + +v.total, 0), kg = ok.reduce((s, v) => s + +v.total_kg, 0);
      $("#vendas-kpis").innerHTML = `
        <div><span>Faturamento</span><strong>${fmtR(fat)}</strong></div>
        <div><span>Vendas</span><strong>${ok.length}</strong></div>
        <div><span>Kg vendidos</span><strong>${(Math.round(kg * 100) / 100).toLocaleString("pt-BR")} kg</strong></div>
        <div><span>Ticket médio</span><strong>${ok.length ? fmtR(fat / ok.length) : "—"}</strong></div>`;
      $("#vendas-resumo").innerHTML = vendas.length ? `<span><strong>${lista.length}</strong> ${lista.length === 1 ? "venda" : "vendas"} na lista</span>` : "";
      // ranking de produtos e de vendedores (só vendas confirmadas)
      const porProd = {}, porVend = {};
      ok.forEach((v) => {
        (v.itens || []).forEach((i) => { const k = i.codigo || i.produto_id; porProd[k] = porProd[k] || { nome: i.nome, codigo: k, kg: 0, valor: 0 }; porProd[k].kg += +i.kg; porProd[k].valor += +i.subtotal; });
        porVend[v.vendedor] = porVend[v.vendedor] || { n: 0, valor: 0 }; porVend[v.vendedor].n++; porVend[v.vendedor].valor += +v.total;
      });
      $("#vendas-ranking").innerHTML = Object.values(porProd).sort((a, b) => b.kg - a.kg).slice(0, 8)
        .map((r) => `<li><span>${esc(r.nome)}<small>Cód. ${esc(r.codigo)}</small></span><b>${(Math.round(r.kg * 100) / 100).toLocaleString("pt-BR")} kg<small>${fmtR(r.valor)}</small></b></li>`).join("") || `<li class="dica">Sem vendas no período.</li>`;
      $("#vendas-vendedores").innerHTML = Object.entries(porVend).sort((a, b) => b[1].valor - a[1].valor)
        .map(([e, r]) => `<li><span>${esc(e)}<small>${r.n} ${r.n === 1 ? "venda" : "vendas"}</small></span><b>${fmtR(r.valor)}</b></li>`).join("") || `<li class="dica">Sem vendas no período.</li>`;
      $("#vendas-lista").innerHTML = lista.length ? lista.map((v) => {
        const primeiro = (v.itens || [])[0] || {}, prod = CW.acharProduto ? CW.acharProduto(primeiro.produto_id, primeiro.cor) : null;
        const foto = prod ? `<img src="${esc(CW.fotoProduto(prod, prod.cores[0], { largura: 160, altura: 128 }))}" alt="" width="80" height="64" data-produto="${esc(prod.id)}" data-cor="${esc(prod.cores[0].nome)}">` : `<span class="venda-sem-foto">${window.Icone ? window.Icone("caixa") : ""}</span>`;
        return `<article class="venda ${v.status}" data-venda="${v.id}">
          <header>
            <div><strong>Venda #${v.id}</strong><small>${esc(dataBR(v.criado_em))} · pedido ${esc(v.pedido_numero)}</small></div>
            <b class="selo-cli ${v.status === "confirmada" ? "ativo" : "zerado"}">${v.status === "confirmada" ? "Confirmada" : "Cancelada"}</b>
          </header>
          <div class="venda-corpo">
            ${foto}
            <ul>${(v.itens || []).map((i) => `<li><span>${esc(i.nome)}<small>Cód. ${esc(i.codigo || i.produto_id)} · ${(+i.kg).toLocaleString("pt-BR")} kg × ${fmtR(i.preco_kg)}</small></span><b>${fmtR(i.subtotal)}</b></li>`).join("")}</ul>
            <div class="venda-total"><span>Total</span><strong>${fmtR(v.total)}</strong><small>${(+v.total_kg).toLocaleString("pt-BR")} kg</small></div>
          </div>
          <footer>
            <span>Cliente: <strong>${esc(v.cliente_nome || "—")}</strong> · Vendedor: ${esc(v.vendedor)}${v.obs ? ` · ${esc(v.obs)}` : ""}
              ${v.status === "cancelada" ? `<br><small class="motivo">Cancelada por ${esc(v.cancelada_por || "")} em ${esc(dataBR(v.cancelada_em))}: ${esc(v.motivo_cancelamento || "")}</small>` : ""}</span>
            <span class="adm-pedido-botoes">
              <button type="button" class="btn btn-contorno-azul" data-ver-pedido="${esc(v.pedido_numero)}">Ver pedido</button>
              ${ehAdmin && v.status === "confirmada" ? `<button type="button" class="btn-excluir-pedido" data-cancelar-venda="${v.id}">Cancelar venda</button>` : ""}
            </span>
          </footer>
        </article>`;
      }).join("") : `<p class="dica">${!vendasCarregadas ? "Carregando..." : vendas.length ? "Nenhuma venda com esses filtros." : "Nenhuma venda registrada ainda. Confirme a venda no pedido quando o cliente fechar a compra."}</p>`;
    }
    ["vendas-busca", "vendas-periodo", "vendas-status", "vendas-vendedor"].forEach((id) => $("#" + id).addEventListener(id === "vendas-busca" ? "input" : "change", desenharVendas));
    $("#vendas-atualizar").addEventListener("click", carregarVendas);
    $("#vendas-lista").addEventListener("click", async (e) => {
      const ver = e.target.closest("[data-ver-pedido]");
      if (ver) { $("#pedidos-busca").value = ver.dataset.verPedido; $("#pedidos-periodo").value = "0"; abrirAba("pedidos"); return; }
      const c = e.target.closest("[data-cancelar-venda]");
      if (c) {
        const motivo = prompt("Motivo do cancelamento (obrigatório). O estoque baixado nesta venda volta para o saldo.");
        if (motivo == null) return;
        c.disabled = true;
        try { await A.cancelarVenda(+c.dataset.cancelarVenda, motivo); CW.mostrarToast("Venda cancelada. O estoque foi devolvido."); await carregarVendas(); }
        catch (err) { c.disabled = false; $("#vendas-erro").textContent = err.message; }
      }
    });
    $("#vendas-csv").addEventListener("click", () => {
      const cel = (x) => `"${String(x == null ? "" : x).replace(/"/g, '""')}"`, n = (x) => String(Math.round(+x * 100) / 100).replace(".", ",");
      const linhas = [["Venda", "Data", "Situação", "Pedido", "Cliente", "Vendedor", "Código", "Produto", "Kg", "Preço/kg", "Subtotal", "Total da venda", "Observação"]];
      vendasFiltradas().forEach((v) => (v.itens || []).forEach((i) => linhas.push([v.id, dataBR(v.criado_em), v.status, v.pedido_numero, v.cliente_nome || "", v.vendedor,
        i.codigo || i.produto_id, i.nome, n(i.kg), n(i.preco_kg), n(i.subtotal), n(v.total), v.obs || ""])));
      const csv = "\ufeff" + linhas.map((l) => l.map(cel).join(";")).join("\r\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      a.download = `vendas-policoating-${new Date().toISOString().slice(0, 10)}.csv`;
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
  });
})();
