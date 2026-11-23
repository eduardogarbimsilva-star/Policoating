/* Página "Cotação": nova cotação (produtos → entrega → dados → detalhes), acompanhamento pelo número e histórico (E06/E07) */
(function () {
  "use strict";
  const C = window.Cotacao, R = window.Recursos, CW = window.ColorWeg || {}, B = window.BR;
  if (!C || !document.getElementById("cot-app")) return;
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const so = (v) => String(v || "").replace(/\D/g, "");
  const reais = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtKg = (n) => `${Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`;
  const EMB = [["Caixa 25 kg", "Caixa 25 kg"], ["Caixa 5 kg", "Caixa 5 kg"], ["Sob medida", "Sob medida (kg)"]];
  const nomeCat = (k) => ((window.CATEGORIAS || {})[k] || {}).nome || k || "";
  const prods = () => (window.PRODUTOS || []).filter((p) => p.ativo !== false && R.disponivel("b2b_quote_enabled", p));
  const acharProd = (id) => (window.PRODUTOS || []).find((p) => p.id === id);
  let pesoEditado = false, endCep = null, freteAtual = null, chaveFrete = "";

  /* ---------- abas ---------- */
  function abrir(aba) {
    $$("[data-cot-aba]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.cotAba === aba)));
    $$("[data-cot-painel]").forEach((p) => (p.hidden = p.dataset.cotPainel !== aba));
    if (aba === "minhas") desenharMinhas();
  }
  $$("[data-cot-aba]").forEach((b) => b.addEventListener("click", () => { abrir(b.dataset.cotAba); history.replaceState(null, "", "#" + b.dataset.cotAba); }));

  /* ---------- 1. produtos ---------- */
  const kgItem = (i) => (i.embalagem === "Sob medida" ? i.qtd : i.qtd * (parseFloat(String(i.embalagem).replace(/[^\d,.]/g, "").replace(",", ".")) || 0));
  function desenharItens() {
    const itens = C.lista.ler(), box = $("#cot-itens");
    box.innerHTML = itens.length ? `<ul class="cot-lista">${itens.map((i, n) => {
      const p = acharProd(i.id) || { id: i.id, nome: i.id.toUpperCase(), cores: [] };
      const cores = p.cores || [], ok = R.disponivel("b2b_quote_enabled", p), sob = i.embalagem === "Sob medida";
      const cor = cores.find((c) => c.nome === i.cor) || cores[0] || {};
      return `<li class="cot-item${ok ? "" : " cot-item-fora"}" data-n="${n}">
        ${window.Seletor ? window.Seletor.miniatura(p) : ""}
        <div class="cot-item-info"><strong>${esc(p.nome)}</strong>
          <small>${esc([p.codigo || i.id.toUpperCase(), nomeCat(p.categoria), p.acabamento, p.textura].filter(Boolean).join(" · "))}</small>
          ${ok ? "" : `<em class="cot-item-aviso">Sem cotação pelo site: tire da lista ou fale com o vendedor</em>`}</div>
        <div class="cot-item-campos">
          <label class="cot-item-cor">Cor${cores.length > 1 ? `<span class="cot-cor-sel"><i style="background:${esc(cor.hex || "#ccc")}"></i><select data-campo="cor">${cores.map((c) => `<option${c.nome === cor.nome ? " selected" : ""}>${esc(c.nome)}</option>`).join("")}</select></span>`
            : `<span class="cot-cor-fixa"><i style="background:${esc(cor.hex || "#ccc")}"></i>${esc(cor.nome || "—")}</span>`}</label>
          <div class="cot-item-emb"><span>Embalagem</span><div class="cot-seg" role="group" aria-label="Embalagem">${EMB.map(([v, t]) => `<button type="button" data-emb="${v}" aria-pressed="${(i.embalagem || "Caixa 25 kg") === v}">${t}</button>`).join("")}</div></div>
          <div class="cot-item-qtd"><span>${sob ? "Quilos" : "Caixas"}</span><div class="cot-qtd"><button type="button" data-mais="-1" aria-label="Diminuir">−</button><input type="number" min="1" max="100000" step="1" value="${esc(i.qtd)}" data-campo="qtd" inputmode="numeric" aria-label="${sob ? "Quilos" : "Caixas"} de ${esc(p.nome)}"><button type="button" data-mais="1" aria-label="Aumentar">+</button></div></div>
          <div class="cot-item-kg"><span>Peso</span><b>${fmtKg(kgItem(i))}</b></div>
        </div>
        <button type="button" class="cot-tirar" data-tirar aria-label="Tirar ${esc(p.nome)}" title="Tirar da cotação">✕</button>
      </li>`;
    }).join("")}</ul>`
      : `<div class="cot-vazio"><strong>Nenhum produto na cotação.</strong><span>Busque acima, ou use o botão <b>Solicitar cotação</b> na página do produto.</span></div>`;
    $$(".cot-item", box).forEach((li) => {
      const n = +li.dataset.n, mudar = (fn) => { const v = C.lista.ler(); if (!v[n]) return; fn(v[n]); C.lista.gravar(v); };
      $$("[data-campo]", li).forEach((el) => el.addEventListener("change", () => mudar((it) => { it[el.dataset.campo] = el.dataset.campo === "qtd" ? Math.max(1, Math.min(100000, Math.round(+el.value || 1))) : el.value; })));
      $$("[data-emb]", li).forEach((b) => b.addEventListener("click", () => mudar((it) => {
        const kgAntes = kgItem(it); it.embalagem = b.dataset.emb;
        const porCx = it.embalagem === "Sob medida" ? 1 : parseFloat(it.embalagem.replace(/[^\d,.]/g, "")) || 25;
        it.qtd = Math.max(1, it.embalagem === "Sob medida" ? Math.round(kgAntes) : Math.ceil(kgAntes / porCx));
      })));
      $$("[data-mais]", li).forEach((b) => b.addEventListener("click", () => mudar((it) => { it.qtd = Math.max(1, Math.min(100000, (+it.qtd || 1) + (+b.dataset.mais) * (it.embalagem === "Sob medida" ? 5 : 1))); })));
      $("[data-tirar]", li).addEventListener("click", () => { const v = C.lista.ler(); v.splice(n, 1); C.lista.gravar(v); });
    });
    const vol = C.volumes(itens), kg = itens.reduce((t, i) => t + kgItem(i), 0);
    $("#cot-totais").hidden = !itens.length;
    $("#cot-totais").innerHTML = `<span><b>${itens.length}</b> ${itens.length === 1 ? "produto" : "produtos"}</span><span><b>${esc(vol.texto)}</b></span><span>Peso total <b>${fmtKg(kg)}</b></span>`;
    $("#cot-do-carrinho").hidden = !(CW.itensCarrinho && CW.itensCarrinho().length);
    resumo(); agendarFrete();
  }
  document.addEventListener("cotacao-lista", desenharItens);
  if (window.Seletor) window.Seletor.produtos($("#cot-busca"), {
    lista: prods,
    aoEscolher: (p) => {
      C.lista.adicionar({ id: p.id, embalagem: "Caixa 25 kg", cor: ((p.cores || [])[0] || {}).nome || "", qtd: 1 });
      if (CW.mostrarToast) CW.mostrarToast(`<strong>${esc(p.nome)}</strong> adicionado à cotação`, true);
    }
  });
  $("#cot-do-carrinho").addEventListener("click", () => {
    (CW.itensCarrinho ? CW.itensCarrinho() : []).forEach((i) => C.lista.adicionar({ id: i.id, embalagem: i.embalagem, cor: i.cor, qtd: i.qtd }));
    if (CW.mostrarToast) CW.mostrarToast("Itens do carrinho trazidos para a cotação.");
  });

  /* ---------- 2. entrega: CEP com informações e frete ao vivo ---------- */
  async function consultarCep(cep) {
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const d = r.ok ? await r.json() : null;
      if (d && d.erro) throw new Error("CEP não encontrado. Confira os números.");
      if (d && d.localidade) return { logradouro: d.logradouro || "", bairro: d.bairro || "", cidade: d.localidade, uf: d.uf, estado: d.estado || "", regiao: d.regiao || "", ddd: d.ddd || "", ibge: d.ibge || "", complemento: d.complemento || "" };
    } catch (e) { if (/não encontrado/.test(e.message)) throw e; }
    return B.buscarCep(cep);   // reserva (mesmo serviço, mensagem amigável)
  }
  function desenharCep(estado) {
    const box = $("#cot-cep-info");
    if (!endCep) { box.hidden = !estado; box.innerHTML = estado || ""; return; }
    const e = endCep, f = freteAtual;
    const freteHtml = !f ? `<span class="cot-cep-calc">${C.lista.ler().length ? "Calculando o frete…" : "Adicione produtos para calcular o frete."}</span>`
      : f.erro ? `<span class="cot-cep-calc">${esc(f.erro)}</span>`
      : f.zona === "manual" || f.valor == null ? `<span class="cot-cep-calc">Frete informado pelo vendedor na proposta.</span>`
      : `<span class="cot-cep-frete"><b>${reais(f.valor)}</b> ${f.zona === "local" ? "entrega local" : `${Number(f.km).toLocaleString("pt-BR")} km por estrada`}${f.prazo_dias ? ` · até ${f.prazo_dias} dias úteis` : ""}</span>`;
    box.hidden = false;
    box.innerHTML = `<div class="cot-cep-topo"><span class="cot-cep-ok" aria-hidden="true">✓</span><div><strong>${esc(e.cidade)}/${esc(e.uf)}</strong><small>${esc([e.estado, e.regiao ? "Região " + e.regiao : ""].filter(Boolean).join(" · "))}</small></div>${freteHtml}</div>
      <dl class="cot-cep-dl">
        <div><dt>Rua</dt><dd>${esc(e.logradouro || "CEP geral: informe abaixo")}</dd></div>
        <div><dt>Bairro</dt><dd>${esc(e.bairro || "—")}</dd></div>
        ${e.complemento ? `<div><dt>Faixa</dt><dd>${esc(e.complemento)}</dd></div>` : ""}
        ${e.ddd ? `<div><dt>DDD</dt><dd>${esc(e.ddd)}</dd></div>` : ""}
        ${e.ibge ? `<div><dt>Código IBGE</dt><dd>${esc(e.ibge)}</dd></div>` : ""}
      </dl>`;
  }
  let ultimoCep = "";
  $("#cot-cep").addEventListener("input", async (ev) => {
    ev.target.value = B.mascaras.cep(ev.target.value);
    const cep = so(ev.target.value);
    if (cep.length !== 8) { endCep = null; freteAtual = null; ultimoCep = ""; desenharCep(""); resumo(); return; }
    if (cep === ultimoCep) return; ultimoCep = cep;
    desenharCep(`<p class="cot-cep-calc">Buscando o CEP…</p>`);
    try {
      const end = await consultarCep(cep);
      if (so($("#cot-cep").value) !== cep) return;
      endCep = end; freteAtual = null; chaveFrete = "";
      if (end.logradouro) { $("#cot-rua").value = end.logradouro; delete $("#cot-rua").dataset.manual; } else if (!$("#cot-rua").dataset.manual) $("#cot-rua").value = "";
      if (end.bairro) $("#cot-bairro").value = end.bairro;
      desenharCep(); resumo(); agendarFrete(true);
      (end.logradouro ? $("#cot-numero") : $("#cot-rua")).focus();
    } catch (err) { endCep = null; ultimoCep = ""; desenharCep(`<p class="erro">${esc(err.message || "CEP não encontrado.")}</p>`); resumo(); }
  });
  $("#cot-rua").addEventListener("input", (e) => (e.target.dataset.manual = "1"));
  $("#cot-numero").addEventListener("change", () => agendarFrete());

  // frete ao vivo (mesmo cálculo do servidor; só quando o recurso de frete vale para todos os itens)
  let tFrete;
  function agendarFrete(ja) { clearTimeout(tFrete); tFrete = setTimeout(calcularFrete, ja ? 50 : 700); }
  async function calcularFrete() {
    const itens = C.lista.ler(), cep = so($("#cot-cep").value);
    if (!endCep || !itens.length) { freteAtual = null; desenharCep(); resumo(); return; }
    const pode = window.Frete && window.Frete.online && itens.every((i) => R.disponivel("freight_estimate_enabled", acharProd(i.id) || { id: i.id }));
    if (!pode) { freteAtual = { zona: "manual" }; desenharCep(); resumo(); return; }
    const lista = itens.map((i) => ({ id: i.id, embalagem: i.embalagem, cor: i.cor, qtd: i.qtd }));
    const chave = JSON.stringify([cep, so($("#cot-numero").value), lista]);
    if (chave === chaveFrete && freteAtual) return;
    chaveFrete = chave; freteAtual = null; desenharCep(); resumo();
    try { const d = await window.Frete.estimar(cep, $("#cot-numero").value, lista); if (chave === chaveFrete) freteAtual = d; }
    catch (e) { if (chave === chaveFrete) freteAtual = { erro: e.message }; }
    desenharCep(); resumo();
  }

  /* ---------- 3. dados ---------- */
  $("#cot-doc").addEventListener("input", async (e) => {
    const d = so(e.target.value); e.target.value = d.length > 11 ? B.mascaras.cnpj(d) : B.mascaras.cpf(d);
    const pj = d.length > 11;
    $("#cot-nome-rot").textContent = pj ? "Razão social" : "Nome completo";
    $("#cot-doc-tipo").textContent = d.length === 11 ? (B.cpfValido(d) ? "Pessoa física ✓" : "CPF inválido") : d.length === 14 ? (B.cnpjValido(d) ? "Empresa ✓" : "CNPJ inválido") : "";
    if (d.length === 14 && B.cnpjValido(d) && !$("#cot-nome").value && B.buscarCnpj) {
      try { const c = await B.buscarCnpj(d); if (c && c.razao_social && !$("#cot-nome").value) $("#cot-nome").value = c.razao_social; if (c && c.telefone && !$("#cot-tel").value) $("#cot-tel").value = B.mascaras.telefone(c.telefone); } catch (err) { /* preenche à mão */ }
    }
  });
  $("#cot-tel").addEventListener("input", (e) => (e.target.value = B.mascaras.telefone(e.target.value)));

  /* ---------- 4. detalhes ---------- */
  const contar = () => { const t = $("#cot-desc").value, n = t.trim().length; $("#cot-contador").textContent = `${t.length} / 2000${n < 20 ? " · mínimo de 20 letras" : " ✓"}`; };
  $("#cot-desc").addEventListener("input", contar);
  $$("[data-sug]").forEach((b) => b.addEventListener("click", () => {
    const ta = $("#cot-desc"); ta.value = (ta.value.trim() ? ta.value.trim() + "\n" : "") + b.dataset.sug; ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); contar(); progresso();
  }));
  $("#cot-peso").addEventListener("input", () => { pesoEditado = !!$("#cot-peso").value.trim(); resumo(); });

  /* ---------- resumo e progresso ---------- */
  function resumo() {
    const itens = C.lista.ler(), kg = itens.reduce((t, i) => t + kgItem(i), 0), vol = C.volumes(itens), f = freteAtual;
    if (!pesoEditado) $("#cot-peso").value = kg ? String(Math.round(kg * 100) / 100).replace(".", ",") : "";
    const p = Number(String($("#cot-peso").value).replace(",", "."));
    $("#cot-r-itens").textContent = itens.length ? `${itens.length} ${itens.length === 1 ? "produto" : "produtos"}` : "nenhum";
    $("#cot-r-volumes").textContent = vol.texto;
    $("#cot-r-peso").textContent = p > 0 ? fmtKg(p) : "—";
    const dest = endCep ? `${endCep.cidade}/${endCep.uf}` : "—";
    $("#cot-r-destino").textContent = dest; $("#cot-rota-destino").textContent = endCep ? dest : "informe o CEP";
    $("#cot-rota-bairro").textContent = endCep ? endCep.bairro || "" : "";
    const temValor = f && !f.erro && f.zona !== "manual" && f.valor != null;
    $("#cot-r-km").textContent = temValor ? (f.zona === "local" ? "entrega local" : `${Number(f.km).toLocaleString("pt-BR")} km`) : "—";
    $("#cot-rota-km").textContent = temValor && f.km ? `${Number(f.km).toLocaleString("pt-BR")} km` : "";
    $("#cot-r-prazo").textContent = temValor ? C.prazoTxt(f) : "—";
    $("#cot-r-frete").textContent = !endCep ? "informe o CEP" : !itens.length ? "adicione produtos" : !f ? "calculando…" : temValor ? reais(f.valor) : "pelo vendedor";
    $("#cot-r-frete-obs").textContent = temValor ? (f.regra || "") : f && f.erro ? f.erro : endCep && itens.length && f ? "O vendedor informa o frete na proposta." : "";
    progresso();
  }
  function etapasOk() {
    const d = so($("#cot-doc").value);
    return {
      produtos: C.lista.ler().length > 0,
      entrega: !!endCep && !!$("#cot-rua").value.trim() && !!$("#cot-numero").value.trim(),
      dados: $("#cot-nome").value.trim().length >= 3 && (d.length === 11 ? B.cpfValido(d) : d.length === 14 && B.cnpjValido(d)) && /^\d{10,11}$/.test(so($("#cot-tel").value)),
      detalhes: $("#cot-desc").value.trim().length >= 20
    };
  }
  function progresso() { const ok = etapasOk(); $$("#cot-progresso [data-etapa]").forEach((li) => li.classList.toggle("feito", !!ok[li.dataset.etapa])); }
  $("#cot-form").addEventListener("input", progresso);
  $("#cot-form").addEventListener("change", progresso);

  function preencherDaConta() {
    const p = window.Conta && window.Conta.perfil, u = window.Conta && window.Conta.usuario;
    if (u && !$("#cot-email").value) $("#cot-email").value = u.email || "";
    if (!p) return;
    const set = (id, v) => { if (v && !$(id).value) $(id).value = v; };
    set("#cot-nome", p.tipo === "pj" ? p.razao_social : p.nome);
    set("#cot-doc", p.tipo === "pj" ? B.mascaras.cnpj(p.cnpj || "") : B.mascaras.cpf(p.cpf || ""));
    $("#cot-doc").dispatchEvent(new Event("input"));
    set("#cot-tel", B.mascaras.telefone(p.telefone || ""));
    if (p.cep && !$("#cot-cep").value) {
      set("#cot-numero", p.numero); set("#cot-compl", p.complemento);
      $("#cot-cep").value = B.mascaras.cep(p.cep); $("#cot-cep").dispatchEvent(new Event("input"));
      if (p.logradouro) { $("#cot-rua").value = p.logradouro; $("#cot-rua").dataset.manual = "1"; }
      set("#cot-bairro", p.bairro);
    }
    resumo();
  }

  /* ---------- enviar ---------- */
  const valorRadio = (n) => ($(`input[name=${n}]:checked`) || {}).value || "";
  $("#cot-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const erro = (msg, foco) => { $("#cot-erro").textContent = msg; if (foco) { $(foco).focus(); $(foco).scrollIntoView({ block: "center", behavior: "smooth" }); } };
    const itens = C.lista.ler();
    const d = {
      nome: $("#cot-nome").value.trim(), documento: so($("#cot-doc").value), telefone: so($("#cot-tel").value), email: $("#cot-email").value.trim(),
      cep: so($("#cot-cep").value), logradouro: $("#cot-rua").value.trim(), numero: $("#cot-numero").value.trim(), complemento: $("#cot-compl").value.trim(),
      bairro: $("#cot-bairro").value.trim(), cidade: endCep ? endCep.cidade : "", uf: endCep ? endCep.uf : "",
      descricao: $("#cot-desc").value.trim(), peso_kg: $("#cot-peso").value.trim(),
      entrega: Object.assign({ horario: $("#cot-horario").value, descarga: $("#cot-descarga").value, agendamento: $("#cot-agenda").value === "sim", prazo_desejado: $("#cot-prazo").value },
        valorRadio("tipo_local") ? { tipo_local: valorRadio("tipo_local") } : {}, $("#cot-ref").value.trim() ? { referencia: $("#cot-ref").value.trim() } : {}),
      itens: itens.map((i) => ({ id: i.id, embalagem: i.embalagem || "Caixa 25 kg", cor: i.cor || "", qtd: i.qtd }))
    };
    if (!itens.length) return erro("Adicione pelo menos um produto.", "#cot-busca");
    if (itens.some((i) => !R.disponivel("b2b_quote_enabled", acharProd(i.id) || { id: i.id }))) return erro("Tire da lista os produtos sem cotação pelo site (marcados em cinza).", "#cot-itens");
    if (d.cep.length !== 8 || !endCep) return erro("Informe um CEP de entrega válido.", "#cot-cep");
    if (!d.logradouro) return erro("Informe a rua.", "#cot-rua");
    if (!d.numero) return erro("Informe o número (ou S/N).", "#cot-numero");
    if (!(d.documento.length === 11 ? B.cpfValido(d.documento) : d.documento.length === 14 && B.cnpjValido(d.documento))) return erro("CPF ou CNPJ inválido. Confira os números.", "#cot-doc");
    if (!/^\d{10,11}$/.test(d.telefone)) return erro("Informe o telefone com DDD.", "#cot-tel");
    if (d.nome.length < 3) return erro("Informe o nome completo ou a razão social.", "#cot-nome");
    if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) return erro("E-mail inválido (ou deixe em branco).", "#cot-email");
    if (d.descricao.length < 20) return erro("Descreva o serviço com mais detalhes (mínimo de 20 letras).", "#cot-desc");
    erro("");
    const bt = $("#cot-enviar"); bt.disabled = true; bt.textContent = "Cotando…";
    try {
      const r = await C.enviar(d);
      C.lista.limpar();
      const fr = r.frete && r.frete.zona !== "manual" ? r.frete : freteAtual && freteAtual.valor != null && !C.online ? freteAtual : r.frete;
      mostrarSucesso(Object.assign({}, d, r, { status: r.status || "recebida", itens: r.itens || d.itens, frete: fr, entrega: r.entrega || d.entrega }));
    } catch (err) { erro(err.message); }
    finally { bt.disabled = false; bt.textContent = "Cotar frete e produtos"; }
  });
  function mostrarSucesso(c) {
    $("#cot-form").hidden = true; $("#cot-progresso").hidden = true;
    const whats = R.ligado("b2b_whatsapp_shortcut_enabled");
    const box = $("#cot-sucesso");
    box.innerHTML = `<div class="cot-ok-faixa"><span class="cot-ok-icone" aria-hidden="true">✓</span>
        <div><h2>Cotação realizada</h2><p>Guarde o número <b>${esc(c.protocolo)}</b>: com ele você acompanha a resposta do vendedor nesta página, em qualquer aparelho.</p></div>
        <div class="cot-ok-botoes">${whats ? `<a class="btn btn-whats" target="_blank" rel="noopener" href="${esc(C.linkWhats(c))}">Enviar pelo WhatsApp</a>` : ""}<button type="button" class="btn btn-contorno-azul" data-nova>Nova cotação</button></div></div>
      ${C.htmlComprovante(c, { whats: !whats })}`;
    C.ligarCopiar(box);
    $("[data-nova]", box).addEventListener("click", () => {
      box.innerHTML = ""; $("#cot-form").hidden = false; $("#cot-progresso").hidden = false;
      $("#cot-desc").value = ""; contar(); pesoEditado = false; freteAtual = null; chaveFrete = ""; desenharItens(); scrollTo({ top: 0, behavior: "smooth" });
    });
    box.focus(); box.scrollIntoView({ block: "start", behavior: "smooth" });
    contarMinhas();
  }

  /* ---------- acompanhar ---------- */
  async function consultarEm(input, res) {
    input.value = C.normalizarCodigo(input.value);
    if (!C.codigoValido(input.value)) { res.innerHTML = `<p class="erro">Número incompleto. Ele tem o formato COT-XXXX-XXXX-XX.</p>`; return; }
    res.innerHTML = `<p class="carregando">Buscando a cotação…</p>`;
    try {
      const c = await C.consultar(input.value);
      res.innerHTML = c ? C.htmlComprovante(c) : `<p class="erro">Não encontramos uma cotação válida com este número. Confira as letras ou, se já passaram 7 dias, faça uma nova.</p>`;
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
      box.innerHTML = v.length ? v.map((c) => C.htmlCartao(c)).join("") : `<div class="cot-vazio"><strong>Nenhuma cotação nos últimos 7 dias.</strong><span><button type="button" class="btn btn-primario" data-ir-nova>Fazer uma cotação</button></span></div>`;
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
    desenharItens(); preencherDaConta(); contarMinhas(); contar();
    let cepFrete = ""; try { cepFrete = localStorage.getItem("policoating_frete_cep") || ""; } catch (e) { /* */ }
    if (!$("#cot-cep").value && /^\d{8}$/.test(cepFrete)) { $("#cot-cep").value = cepFrete; $("#cot-cep").dispatchEvent(new Event("input")); }
    const h = location.hash.slice(1), m = /^codigo=(.+)$/.exec(h);
    if (m) { abrir("consultar"); $("#cot-codigo").value = decodeURIComponent(m[1]); consultarEm($("#cot-codigo"), $("#cot-consulta-res")); }
    else abrir(["nova", "consultar", "minhas"].includes(h) ? h : "nova");
  }
  let iniciado = false;
  const talvez = () => { if (!iniciado) { iniciado = true; iniciar(); } else { const on = R.ligado("b2b_quote_enabled"); $("#cot-off").hidden = on; $("#cot-app").hidden = !on; desenharItens(); } };
  Promise.resolve(R.pronto).then(talvez, talvez);
  document.addEventListener("recursos-atualizados", () => iniciado && talvez());
  document.addEventListener("catalogo-atualizado", () => { if (iniciado) desenharItens(); });
  if (window.Conta && window.Conta.aoMudar) window.Conta.aoMudar(() => { if (iniciado) preencherDaConta(); });
})();
