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
    if (!(await A.ehAdmin())) { $("#admin-email").textContent = window.Conta.usuario.email; return mostrar("admin-negado"); }
    mostrar("admin-painel");
    $("#admin-demo").hidden = A.online;

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
      const p = r ? JSON.parse(JSON.stringify(r.dados)) : { categoria: Object.keys(CATS)[0], embalagens: ["Caixa 20 kg", "Caixa 25 kg"], cores: [] };
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

    carregar();

    /* ---------- Abas ---------- */
    const abas = $$(".admin-abas [data-aba]");
    const abrirAba = (nome) => {
      abas.forEach((b) => { const on = b.dataset.aba === nome; b.classList.toggle("ativo", on); b.setAttribute("aria-selected", on); });
      $$(".admin-aba").forEach((c) => (c.hidden = c.dataset.conteudo !== nome));
      if (nome === "contato") carregarConfig();
      if (nome === "galeria") carregarGaleria();
      if (nome === "equipe") carregarEquipe();
    };
    abas.forEach((b) => b.addEventListener("click", () => abrirAba(b.dataset.aba)));

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

    /* ---------- Equipe ---------- */
    async function carregarEquipe() {
      let lista = [];
      try { lista = await A.listarAdmins(); } catch (e) { $("#equipe-erro").textContent = e.message; }
      const eu = String(window.Conta.usuario.email).toLowerCase();
      const icone = window.Icone ? window.Icone("usuario") : "";
      $("#admin-equipe").innerHTML = lista.map((a) => `<li><span>${icone}${esc(a.email)}${a.email.toLowerCase() === eu ? " <em>(você)</em>" : ""}</span>
        ${a.email.toLowerCase() === eu ? "" : `<button type="button" class="perigo" data-remover-admin="${esc(a.email)}">Remover acesso</button>`}</li>`).join("");
    }
    $("#form-equipe").addEventListener("submit", async (e) => {
      e.preventDefault();
      try { await A.adicionarAdmin($("#equipe-email").value); $("#equipe-email").value = ""; $("#equipe-erro").textContent = ""; CW.mostrarToast("Acesso liberado."); carregarEquipe(); }
      catch (err) { $("#equipe-erro").textContent = err.message; }
    });
    $("#admin-equipe").addEventListener("click", async (e) => {
      const b = e.target.closest("[data-remover-admin]"); if (!b) return;
      if (!confirm(`Remover o acesso de ${b.dataset.removerAdmin} ao painel?`)) return;
      try { await A.removerAdmin(b.dataset.removerAdmin); carregarEquipe(); CW.mostrarToast("Acesso removido."); }
      catch (err) { $("#equipe-erro").textContent = err.message; }
    });
  });
})();
