/* Página "Cotação": nova cotação, consulta pelo código e histórico do cliente (E06/E07) */
(function () {
  "use strict";
  const C = window.Cotacao, R = window.Recursos, CW = window.ColorWeg || {};
  if (!C || !document.getElementById("cot-app")) return;
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const so = (v) => String(v || "").replace(/\D/g, "");
  const EMB = ["Caixa 25 kg", "Caixa 5 kg", "Sob medida"];
  const nomeEmb = (e) => (e === "Sob medida" ? "Sob medida (kg)" : e);
  const prods = () => (window.PRODUTOS || []).filter((p) => p.ativo !== false && R.disponivel("b2b_quote_enabled", p));
  const acharProd = (id) => (window.PRODUTOS || []).find((p) => p.id === id);
  let pesoEditado = false, endCep = null;

  /* ---------- abas ---------- */
  function abrir(aba) {
    $$("[data-cot-aba]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.cotAba === aba)));
    $$("[data-cot-painel]").forEach((p) => (p.hidden = p.dataset.cotPainel !== aba));
    if (aba === "minhas") desenharMinhas();
  }
  $$("[data-cot-aba]").forEach((b) => b.addEventListener("click", () => { abrir(b.dataset.cotAba); history.replaceState(null, "", "#" + b.dataset.cotAba); }));

  /* ---------- itens ---------- */
  function desenharItens() {
    const itens = C.lista.ler(), box = $("#cot-itens");
    box.innerHTML = itens.length ? `<ul class="cot-lista">${itens.map((i, n) => {
      const p = acharProd(i.id) || { nome: i.id, cores: [] };
      const cores = (p.cores || []).map((c) => c.nome);
      const ok = R.disponivel("b2b_quote_enabled", p);
      return `<li class="cot-item${ok ? "" : " cot-item-fora"}" data-n="${n}">
        <div class="cot-item-nome"><strong>${esc(p.nome)}</strong><small>${esc(p.codigo || i.id.toUpperCase())}${ok ? "" : " · sem cotação pelo site: fale com o vendedor"}</small></div>
        <label>Embalagem<select data-campo="embalagem">${EMB.map((e) => `<option value="${e}"${e === (i.embalagem || "Caixa 25 kg") ? " selected" : ""}>${nomeEmb(e)}</option>`).join("")}</select></label>
        ${cores.length ? `<label>Cor<select data-campo="cor">${cores.map((c) => `<option${c === i.cor ? " selected" : ""}>${esc(c)}</option>`).join("")}</select></label>` : ""}
        <label>${i.embalagem === "Sob medida" ? "Quilos" : "Caixas"}<input type="number" min="1" max="100000" step="1" value="${esc(i.qtd)}" data-campo="qtd" inputmode="numeric"></label>
        <button type="button" class="cot-tirar" data-tirar aria-label="Tirar ${esc(p.nome)}">✕</button>
      </li>`;
    }).join("")}</ul>` : `<p class="cot-vazio">Nenhum produto ainda. Busque abaixo pelo código ou nome, ou use o botão <b>Solicitar cotação</b> na página do produto.</p>`;
    $$(".cot-item", box).forEach((li) => {
      const n = +li.dataset.n;
      $$("[data-campo]", li).forEach((el) => el.addEventListener("change", () => {
        const v = C.lista.ler(); if (!v[n]) return;
        v[n][el.dataset.campo] = el.dataset.campo === "qtd" ? Math.max(1, Math.min(100000, Math.round(+el.value || 1))) : el.value;
        C.lista.gravar(v);
      }));
      $("[data-tirar]", li).addEventListener("click", () => { const v = C.lista.ler(); v.splice(n, 1); C.lista.gravar(v); });
    });
    const carrinho = CW.itensCarrinho ? CW.itensCarrinho() : [];
    $("#cot-do-carrinho").hidden = !carrinho.length;
    resumo();
  }
  document.addEventListener("cotacao-lista", desenharItens);
  function preencherBusca() {
    $("#cot-produtos").innerHTML = prods().map((p) => `<option value="${esc((p.codigo || p.id.toUpperCase()) + " — " + p.nome)}">`).join("");
  }
  function adicionarDaBusca() {
    const t = $("#cot-busca").value.trim().toLowerCase(); if (!t) return;
    const cod = t.split(" — ")[0];
    const p = prods().find((x) => (x.codigo || x.id).toLowerCase() === cod || x.id === cod) || prods().find((x) => x.nome.toLowerCase().includes(t));
    if (!p) { $("#cot-erro").textContent = "Produto não encontrado (ou sem cotação pelo site)."; return; }
    $("#cot-erro").textContent = "";
    C.lista.adicionar({ id: p.id, embalagem: "Caixa 25 kg", cor: ((p.cores || [])[0] || {}).nome || "", qtd: 1 });
    $("#cot-busca").value = "";
    const ult = $$("#cot-itens [data-campo=qtd]").pop(); if (ult) ult.focus();
  }
  $("#cot-add").addEventListener("click", adicionarDaBusca);
  $("#cot-busca").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); adicionarDaBusca(); } });
  $("#cot-busca").addEventListener("change", () => { if ($("#cot-busca").value.includes(" — ")) adicionarDaBusca(); });
  $("#cot-do-carrinho").addEventListener("click", () => {
    (CW.itensCarrinho ? CW.itensCarrinho() : []).forEach((i) => C.lista.adicionar({ id: i.id, embalagem: i.embalagem, cor: i.cor, qtd: i.qtd }));
    if (CW.mostrarToast) CW.mostrarToast("Itens do carrinho trazidos para a cotação.");
  });

  /* ---------- resumo ---------- */
  function resumo() {
    const itens = C.lista.ler(), kg = C.pesoKg(itens);
    if (!pesoEditado) $("#cot-peso").value = kg ? String(kg).replace(".", ",") : "";
    $("#cot-r-itens").textContent = itens.length ? `${itens.length} ${itens.length === 1 ? "produto" : "produtos"}` : "nenhum";
    const p = Number(String($("#cot-peso").value).replace(",", "."));
    $("#cot-r-peso").textContent = p > 0 ? `${p.toLocaleString("pt-BR")} kg` : "—";
    $("#cot-r-entrega").textContent = endCep ? `${endCep.cidade}/${endCep.uf}` : "—";
  }
  $("#cot-peso").addEventListener("input", () => { pesoEditado = !!$("#cot-peso").value.trim(); resumo(); });

  /* ---------- dados e endereço ---------- */
  const B = window.BR;
  $("#cot-doc").addEventListener("input", (e) => { const d = so(e.target.value); e.target.value = d.length > 11 ? B.mascaras.cnpj(d) : B.mascaras.cpf(d); });
  $("#cot-tel").addEventListener("input", (e) => (e.target.value = B.mascaras.telefone(e.target.value)));
  let ultimoCep = "";
  $("#cot-cep").addEventListener("input", async (e) => {
    e.target.value = B.mascaras.cep(e.target.value);
    const cep = so(e.target.value), dica = $("#cot-cep-dica");
    if (cep.length !== 8) { endCep = null; $("#cot-cidade").value = ""; dica.textContent = ""; resumo(); return; }
    if (cep === ultimoCep) return; ultimoCep = cep;
    dica.textContent = "Buscando…";
    try {
      const end = await B.buscarCep(cep);
      if (so($("#cot-cep").value) !== cep) return;   // o CEP mudou enquanto buscava
      endCep = end;
      $("#cot-cidade").value = `${end.cidade}/${end.uf}`;
      if (end.logradouro) $("#cot-rua").value = end.logradouro; else if (!$("#cot-rua").dataset.manual) $("#cot-rua").value = "";
      if (end.bairro) $("#cot-bairro").value = end.bairro;
      dica.textContent = end.logradouro ? "Endereço encontrado." : "CEP geral da cidade: preencha a rua e o bairro.";
      (end.logradouro ? $("#cot-numero") : $("#cot-rua")).focus();
    } catch (err) { endCep = null; ultimoCep = ""; dica.textContent = err.message || "CEP não encontrado."; }
    resumo();
  });
  $("#cot-rua").addEventListener("input", (e) => (e.target.dataset.manual = "1"));
  $("#cot-desc").addEventListener("input", (e) => {
    const n = e.target.value.trim().length;
    $("#cot-contador").textContent = `${e.target.value.length} / 2000${n < 20 ? " · mínimo de 20 letras" : ""}`;
  });
  function preencherDaConta() {
    const p = window.Conta && window.Conta.perfil, u = window.Conta && window.Conta.usuario;
    if (u && !$("#cot-email").value) $("#cot-email").value = u.email || "";
    if (!p) return;
    const set = (id, v) => { if (v && !$(id).value) $(id).value = v; };
    set("#cot-nome", p.tipo === "pj" ? p.razao_social : p.nome);
    set("#cot-doc", p.tipo === "pj" ? B.mascaras.cnpj(p.cnpj || "") : B.mascaras.cpf(p.cpf || ""));
    set("#cot-tel", B.mascaras.telefone(p.telefone || ""));
    if (p.cep && !$("#cot-cep").value) {
      $("#cot-cep").value = B.mascaras.cep(p.cep); ultimoCep = so(p.cep);
      endCep = { cidade: p.cidade, uf: p.uf }; $("#cot-cidade").value = `${p.cidade}/${p.uf}`;
      set("#cot-rua", p.logradouro); set("#cot-numero", p.numero); set("#cot-compl", p.complemento); set("#cot-bairro", p.bairro);
    }
    resumo();
  }

  /* ---------- enviar ---------- */
  $("#cot-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const erro = (msg, foco) => { $("#cot-erro").textContent = msg; if (foco) $(foco).focus(); };
    const itens = C.lista.ler();
    const d = {
      nome: $("#cot-nome").value.trim(), documento: so($("#cot-doc").value), telefone: so($("#cot-tel").value), email: $("#cot-email").value.trim(),
      cep: so($("#cot-cep").value), logradouro: $("#cot-rua").value.trim(), numero: $("#cot-numero").value.trim(), complemento: $("#cot-compl").value.trim(),
      bairro: $("#cot-bairro").value.trim(), cidade: endCep ? endCep.cidade : "", uf: endCep ? endCep.uf : "",
      descricao: $("#cot-desc").value.trim(), peso_kg: $("#cot-peso").value.trim(),
      itens: itens.map((i) => ({ id: i.id, embalagem: i.embalagem || "Caixa 25 kg", cor: i.cor || "", qtd: i.qtd }))
    };
    if (!itens.length) return erro("Adicione pelo menos um produto.", "#cot-busca");
    if (itens.some((i) => !R.disponivel("b2b_quote_enabled", acharProd(i.id) || { id: i.id }))) return erro("Tire da lista os produtos sem cotação pelo site (marcados em cinza).");
    if (d.nome.length < 3) return erro("Informe o nome completo ou a razão social.", "#cot-nome");
    if (!(d.documento.length === 11 ? B.cpfValido(d.documento) : d.documento.length === 14 && B.cnpjValido(d.documento))) return erro("CPF ou CNPJ inválido. Confira os números.", "#cot-doc");
    if (!/^\d{10,11}$/.test(d.telefone)) return erro("Informe o telefone com DDD.", "#cot-tel");
    if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) return erro("E-mail inválido (ou deixe em branco).", "#cot-email");
    if (d.cep.length !== 8 || !endCep) return erro("Informe um CEP válido.", "#cot-cep");
    if (!d.logradouro) return erro("Informe a rua.", "#cot-rua");
    if (!d.numero) return erro("Informe o número (ou S/N).", "#cot-numero");
    if (d.descricao.length < 20) return erro("Descreva o serviço com mais detalhes (mínimo de 20 letras).", "#cot-desc");
    erro("");
    const bt = $("#cot-enviar"); bt.disabled = true; bt.textContent = "Gerando código…";
    try {
      const r = await C.enviar(d);
      C.lista.limpar();
      mostrarSucesso(Object.assign({}, d, r, { status: r.status || "recebida", itens: r.itens || d.itens }));
    } catch (err) { erro(err.message); }
    finally { bt.disabled = false; bt.textContent = "Gerar código da cotação"; }
  });
  function mostrarSucesso(c) {
    $("#cot-form").hidden = true;
    const whats = R.ligado("b2b_whatsapp_shortcut_enabled");
    const box = $("#cot-sucesso");
    box.innerHTML = `<div class="cot-ok">
        <div class="cot-ok-icone" aria-hidden="true">✓</div>
        <h2>Cotação registrada</h2>
        <p>Guarde este código. Ele vale até <b>${C.dataHora(c.expira_em)}</b> e é com ele que você e a equipe falam desta cotação.</p>
        <div class="cot-ok-codigo"><strong>${esc(c.protocolo)}</strong><button type="button" class="btn btn-contorno-azul" data-copiar="${esc(c.protocolo)}">Copiar</button></div>
        <p class="cot-ok-frete">${C.htmlFrete(c.frete)}</p>
        <div class="cot-ok-acoes">
          ${whats ? `<a class="btn btn-whats" target="_blank" rel="noopener" href="${esc(C.linkWhats(c))}">Enviar o código pelo WhatsApp</a>` : ""}
          <button type="button" class="btn btn-contorno-azul" data-ir="minhas">Ver minhas cotações</button>
          <button type="button" class="btn btn-contorno-azul" data-nova>Fazer outra cotação</button>
        </div>
      </div>`;
    C.ligarCopiar(box);
    $("[data-ir]", box).addEventListener("click", () => abrir("minhas"));
    $("[data-nova]", box).addEventListener("click", () => { box.innerHTML = ""; $("#cot-form").hidden = false; $("#cot-desc").value = ""; pesoEditado = false; desenharItens(); });
    box.focus();
    contarMinhas();
  }

  /* ---------- consultar ---------- */
  async function consultarEm(input, res) {
    input.value = C.normalizarCodigo(input.value);
    if (!C.codigoValido(input.value)) { res.innerHTML = `<p class="erro">Código incompleto. Ele tem o formato COT-XXXX-XXXX-XX.</p>`; return; }
    res.innerHTML = `<p class="carregando">Consultando…</p>`;
    try {
      const c = await C.consultar(input.value);
      res.innerHTML = c ? C.htmlCartao(c, { aberto: true }) : `<p class="erro">Não encontramos uma cotação válida com este código. Confira as letras ou, se já passaram 7 dias, faça uma nova.</p>`;
      C.ligarCopiar(res);
    } catch (err) { res.innerHTML = `<p class="erro">${esc(err.message)}</p>`; }
  }
  [["#cot-consulta", "#cot-codigo", "#cot-consulta-res"], ["#cot-off-consulta", "#cot-off-codigo", "#cot-off-res"]].forEach(([f, i, r]) => {
    $(i).addEventListener("input", (e) => (e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "")));
    $(f).addEventListener("submit", (e) => { e.preventDefault(); consultarEm($(i), $(r)); });
  });

  /* ---------- minhas ---------- */
  async function desenharMinhas() {
    const box = $("#cot-minhas"), u = window.Conta && window.Conta.usuario;
    $("#cot-minhas-dica").innerHTML = u ? "As cotações da sua conta e as feitas neste aparelho, dos últimos 7 dias." : `As cotações feitas neste aparelho nos últimos 7 dias. <a href="conta">Entre na sua conta</a> para ver também as feitas em outros aparelhos.`;
    box.innerHTML = `<p class="carregando">Carregando…</p>`;
    try {
      const v = await C.minhas();
      box.innerHTML = v.length ? v.map((c) => C.htmlCartao(c)).join("") : `<div class="cot-vazio cartao-info"><p>Nenhuma cotação nos últimos 7 dias.</p><p><button type="button" class="btn btn-primario" data-ir-nova>Fazer uma cotação</button></p></div>`;
      C.ligarCopiar(box);
      const b = $("[data-ir-nova]", box); if (b) b.addEventListener("click", () => abrir("nova"));
      $("#cot-badge").textContent = v.length || "";
    } catch (err) { box.innerHTML = `<p class="erro">${esc(err.message)}</p>`; }
  }
  function contarMinhas() { $("#cot-badge").textContent = C.lembradas().length || ""; }

  /* ---------- início ---------- */
  function iniciar() {
    $("#cot-carregando").hidden = true;
    const on = R.ligado("b2b_quote_enabled");
    $("#cot-off").hidden = on; $("#cot-app").hidden = !on;
    const w = $("[data-whats-cotacao]"); if (w && CW.linkWhatsApp) w.href = CW.linkWhatsApp("Olá! Gostaria de fazer uma cotação.");
    if (!on) return;
    preencherBusca(); desenharItens(); preencherDaConta(); contarMinhas();
    let cepFrete = ""; try { cepFrete = localStorage.getItem("policoating_frete_cep") || ""; } catch (e) { /* */ }
    if (!$("#cot-cep").value && /^\d{8}$/.test(cepFrete)) { $("#cot-cep").value = cepFrete; $("#cot-cep").dispatchEvent(new Event("input")); }
    const h = location.hash.slice(1), m = /^codigo=(.+)$/.exec(h);
    if (m) { abrir("consultar"); $("#cot-codigo").value = decodeURIComponent(m[1]); consultarEm($("#cot-codigo"), $("#cot-consulta-res")); }
    else abrir(["nova", "consultar", "minhas"].includes(h) ? h : "nova");
  }
  let iniciado = false;
  const talvez = () => { if (!iniciado) { iniciado = true; iniciar(); } else { $("#cot-off").hidden = R.ligado("b2b_quote_enabled"); $("#cot-app").hidden = !R.ligado("b2b_quote_enabled"); preencherBusca(); desenharItens(); } };
  Promise.resolve(R.pronto).then(talvez, talvez);
  document.addEventListener("recursos-atualizados", () => iniciado && talvez());
  document.addEventListener("catalogo-atualizado", () => { if (iniciado) { preencherBusca(); desenharItens(); } });
  if (window.Conta && window.Conta.aoMudar) window.Conta.aoMudar(() => { if (iniciado) preencherDaConta(); });
})();
