/* =========================================================
   Seletor de produtos (substitui a lista nativa preta do navegador)
   - Busca por código, nome, classe, marca, acabamento ou textura (sem ligar para acentos).
   - Filtro por classe, foto/cor de cada produto, teclado (↑ ↓ Enter Esc) e leitor de tela.
   Uso: Seletor.produtos(input, { lista: () => [...], aoEscolher: (p) => {} })
   ========================================================= */
(function () {
  "use strict";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const MAX = 60;
  let seq = 0;

  function miniatura(p) {
    const cor = (p.cores || [])[0];
    let url = "";
    try { if (window.Fotos && cor) url = window.Fotos.fotoProduto(p, cor, { largura: 96, altura: 96 }); } catch (e) { url = ""; }
    if (!url && Array.isArray(p.fotos) && p.fotos[0]) url = p.fotos[0];
    const hex = cor && /^#[0-9a-f]{3,8}$/i.test(cor.hex || "") ? cor.hex : "#d9dee5";
    return `<span class="sel-mini" style="--cor:${hex}">${url ? `<img src="${esc(url)}" alt="" loading="lazy" decoding="async">` : ""}</span>`;
  }
  const nomeCat = (k) => ((window.CATEGORIAS || {})[k] || {}).nome || k || "";

  function produtos(input, opcoes) {
    if (!input || input.dataset.seletor) return;
    input.dataset.seletor = "1";
    const id = "sel-" + (++seq);
    input.removeAttribute("list");
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", id);
    input.setAttribute("autocomplete", "off");
    const caixa = document.createElement("div");
    caixa.className = "sel-caixa";
    input.parentNode.insertBefore(caixa, input);
    caixa.appendChild(input);
    const painel = document.createElement("div");
    painel.className = "sel-painel"; painel.hidden = true;
    painel.innerHTML = `<div class="sel-filtros" role="group" aria-label="Filtrar por classe"></div><ul class="sel-lista" id="${id}" role="listbox" aria-label="Produtos"></ul><p class="sel-rodape" aria-live="polite"></p>`;
    caixa.appendChild(painel);
    const ul = painel.querySelector(".sel-lista"), filtros = painel.querySelector(".sel-filtros"), rodape = painel.querySelector(".sel-rodape");
    let cat = "", ativo = -1, vistos = [];

    function desenhar() {
      const todos = (opcoes.lista() || []).filter((p) => p && (p.cores || []).length);
      const cats = [...new Set(todos.map((p) => p.categoria).filter(Boolean))];
      filtros.hidden = cats.length < 2;
      filtros.innerHTML = [["", "Todas"], ...cats.map((k) => [k, nomeCat(k)])]
        .map(([k, n]) => `<button type="button" data-cat="${esc(k)}" aria-pressed="${k === cat}">${esc(n)}</button>`).join("");
      const termos = norm(input.value).split(/\s+/).filter(Boolean);
      const achados = todos.filter((p) => (!cat || p.categoria === cat) && (!termos.length || termos.every((t) =>
        norm([p.codigo, p.id, p.nome, nomeCat(p.categoria), p.marca, p.acabamento, p.textura, p.linha, (p.cores || []).map((c) => c.nome).join(" ")].join(" ")).includes(t))));
      vistos = achados.slice(0, MAX);
      ativo = vistos.length ? Math.min(Math.max(ativo, 0), vistos.length - 1) : -1;
      ul.innerHTML = vistos.length ? vistos.map((p, i) => `<li role="option" id="${id}-${i}" data-i="${i}" aria-selected="${i === ativo}" class="${i === ativo ? "ativo" : ""}">
          ${miniatura(p)}
          <span class="sel-txt"><strong>${esc(p.nome)}</strong><small>${esc([p.codigo || p.id.toUpperCase(), nomeCat(p.categoria), p.acabamento, p.textura].filter(Boolean).join(" · "))}</small></span>
          <span class="sel-add" aria-hidden="true">+</span></li>`).join("")
        : `<li class="sel-vazio" role="presentation">Nenhum produto encontrado${termos.length ? ` para “${esc(input.value)}”` : ""}.</li>`;
      rodape.textContent = achados.length > MAX ? `Mostrando ${MAX} de ${achados.length}. Continue digitando para filtrar.` : achados.length ? `${achados.length} ${achados.length === 1 ? "produto" : "produtos"}` : "";
      input.setAttribute("aria-activedescendant", ativo >= 0 ? `${id}-${ativo}` : "");
    }
    function abrir() { if (!painel.hidden) return; painel.hidden = false; input.setAttribute("aria-expanded", "true"); caixa.classList.add("aberto"); desenhar(); }
    function fechar() { painel.hidden = true; input.setAttribute("aria-expanded", "false"); caixa.classList.remove("aberto"); input.removeAttribute("aria-activedescendant"); }
    function escolher(i) {
      const p = vistos[i]; if (!p) return;
      input.value = ""; ativo = 0; fechar();
      opcoes.aoEscolher(p);
    }
    function marcar(i) {
      ativo = i;
      ul.querySelectorAll("[role=option]").forEach((li) => { const on = +li.dataset.i === i; li.classList.toggle("ativo", on); li.setAttribute("aria-selected", String(on)); if (on) li.scrollIntoView({ block: "nearest" }); });
      input.setAttribute("aria-activedescendant", i >= 0 ? `${id}-${i}` : "");
    }
    input.addEventListener("focus", abrir);
    input.addEventListener("click", abrir);
    input.addEventListener("input", () => { ativo = 0; abrir(); desenhar(); });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); abrir(); marcar(Math.min(ativo + 1, vistos.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); marcar(Math.max(ativo - 1, 0)); }
      else if (e.key === "Enter") { if (!painel.hidden && ativo >= 0) { e.preventDefault(); escolher(ativo); } }
      else if (e.key === "Escape") { if (!painel.hidden) { e.preventDefault(); fechar(); } }
    });
    painel.addEventListener("mousedown", (e) => e.preventDefault());   // não tira o foco do campo
    ul.addEventListener("click", (e) => { const li = e.target.closest("[role=option]"); if (li) escolher(+li.dataset.i); });
    filtros.addEventListener("click", (e) => { const b = e.target.closest("[data-cat]"); if (b) { cat = b.dataset.cat; ativo = 0; desenhar(); input.focus(); } });
    document.addEventListener("click", (e) => { if (!e.composedPath().includes(caixa)) fechar(); });
    input.addEventListener("blur", () => setTimeout(() => { if (!caixa.contains(document.activeElement)) fechar(); }, 120));
    return { atualizar: () => { if (!painel.hidden) desenhar(); }, fechar };
  }

  /** Sugestões de texto simples (ex.: fornecedores), com o mesmo visual */
  function sugestoes(input, lista) {
    if (!input || input.dataset.seletor) return;
    input.dataset.seletor = "1";
    const id = "sel-" + (++seq);
    input.removeAttribute("list");
    Object.entries({ role: "combobox", "aria-autocomplete": "list", "aria-expanded": "false", "aria-controls": id, autocomplete: "off" }).forEach(([k, v]) => input.setAttribute(k, v));
    const caixa = document.createElement("div"); caixa.className = "sel-caixa";
    input.parentNode.insertBefore(caixa, input); caixa.appendChild(input);
    const painel = document.createElement("div"); painel.className = "sel-painel sel-simples"; painel.hidden = true;
    painel.innerHTML = `<ul class="sel-lista" id="${id}" role="listbox"></ul>`;
    caixa.appendChild(painel);
    const ul = painel.firstChild; let vistos = [], ativo = -1;
    const desenhar = () => {
      const t = norm(input.value);
      vistos = (lista() || []).filter((x) => !t || norm(x).includes(t)).slice(0, 30);
      ativo = vistos.length ? Math.min(Math.max(ativo, 0), vistos.length - 1) : -1;
      painel.hidden = !vistos.length || document.activeElement !== input;
      input.setAttribute("aria-expanded", String(!painel.hidden));
      ul.innerHTML = vistos.map((x, i) => `<li role="option" id="${id}-${i}" data-i="${i}" aria-selected="${i === ativo}" class="${i === ativo ? "ativo" : ""}"><span class="sel-txt"><strong>${esc(x)}</strong></span></li>`).join("");
      input.setAttribute("aria-activedescendant", ativo >= 0 ? `${id}-${ativo}` : "");
    };
    const fechar = () => { painel.hidden = true; input.setAttribute("aria-expanded", "false"); };
    const escolher = (i) => { if (vistos[i] == null) return; input.value = vistos[i]; fechar(); input.dispatchEvent(new Event("change", { bubbles: true })); };
    input.addEventListener("focus", desenhar);
    input.addEventListener("input", () => { ativo = 0; desenhar(); });
    input.addEventListener("keydown", (e) => {
      if (painel.hidden) return;
      if (e.key === "ArrowDown") { e.preventDefault(); ativo = Math.min(ativo + 1, vistos.length - 1); desenhar(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); ativo = Math.max(ativo - 1, 0); desenhar(); }
      else if (e.key === "Enter" && ativo >= 0) { e.preventDefault(); escolher(ativo); }
      else if (e.key === "Escape") { e.preventDefault(); fechar(); }
    });
    painel.addEventListener("mousedown", (e) => e.preventDefault());
    ul.addEventListener("click", (e) => { const li = e.target.closest("[role=option]"); if (li) escolher(+li.dataset.i); });
    input.addEventListener("blur", () => setTimeout(fechar, 120));
  }

  window.Seletor = { produtos, miniatura, sugestoes };
})();
