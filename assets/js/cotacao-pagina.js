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
      : `<div class="cot-vazio"><strong>Nenhum produto na cotação.</strong><span>${modo("produtos") === "opcional" ? "Opcional: sem produtos, cotamos só o frete (informe o peso em Detalhes). Para incluir, busque acima." : "Busque acima, ou use o botão <b>Solicitar cotação</b> na página do produto."}</span></div>`;
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
  // redesenha depois do evento atual (evita redesenhar no meio de um "blur" do campo de quantidade)
  let redesenho = 0;
  document.addEventListener("cotacao-lista", () => { clearTimeout(redesenho); redesenho = setTimeout(desenharItens, 0); });
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
    const freteHtml = !f ? `<span class="cot-cep-calc">${C.lista.ler().length || !exige("produtos") ? "Calculando o frete…" : "Adicione produtos para calcular o frete."}</span>`
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
    if (!endCep || (!itens.length && exige("produtos"))) { freteAtual = null; desenharCep(); resumo(); return; }
    // sem produtos (lista opcional) o frete sai só pelo CEP
    const pode = window.Frete && window.Frete.online && (itens.length ? itens.every((i) => R.disponivel("freight_estimate_enabled", acharProd(i.id) || { id: i.id })) : R.ligado("freight_estimate_enabled"));
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
    const semProdOk = modo("produtos") !== "obrigatorio";
    $("#cot-r-frete").textContent = !endCep ? "informe o CEP" : !itens.length && !semProdOk ? "adicione produtos" : !f ? "calculando…" : temValor ? reais(f.valor) : "pelo vendedor";
    $("#cot-r-frete-obs").textContent = temValor ? (f.regra || "") : f && f.erro ? f.erro : endCep && f ? (f.mensagem ? "Não deu para calcular automaticamente: o vendedor informa o frete na proposta." : "O vendedor informa o frete na proposta.") : "";
    if (endCep && !f && (itens.length || semProdOk)) $("#cot-r-frete-obs").textContent = "Calculando a rota por estrada saindo de Matão-SP. Para outros estados pode levar até 30 segundos.";
    atualizarVeiculos();
    progresso();
  }
  const valorRadio = (n) => ($(`input[name=${n}]:checked`) || {}).value || "";
  /* ---------- configuração do formulário (painel → Cotações → Configurar formulário) ---------- */
  const cfgForm = () => (window.CotacaoConfig ? window.CotacaoConfig.normalizar((window.SITE_CONFIG || {}).cotacao) : { campos: {}, veiculos: { ativo: false, lista: [] }, pesoMaximo: { ativo: false, kg: 0 } });
  const modo = (k) => cfgForm().campos[k] || "opcional";
  const exige = (k) => modo(k) === "obrigatorio", mostra = (k) => modo(k) !== "oculto";
  const pesoAtual = () => { const n = Number(String($("#cot-peso").value).replace(",", ".")); return n > 0 ? n : C.lista.ler().reduce((t, i) => t + kgItem(i), 0); };
  function aplicarForm() {
    const cfg = cfgForm();
    $$("[data-campo-cot]").forEach((el) => {
      const k = el.dataset.campoCot; if (k === "veiculo") return;
      const m = cfg.campos[k] || "opcional";
      el.hidden = m === "oculto";
      const opc = el.querySelector(".cot-opc"); if (opc) opc.hidden = m !== "opcional";
      const vazio = el.querySelector("option[data-vazio]"); if (vazio) vazio.textContent = m === "obrigatorio" ? "Selecione…" : "Não informar";
    });
    const prod = cfg.campos.produtos;
    $("#cot-e-produtos").hidden = prod === "oculto";
    const liP = $('#cot-progresso [data-etapa="produtos"]'); if (liP) liP.hidden = prod === "oculto";
    $("#cot-prod-opc").hidden = prod !== "opcional";
    $$("#cot-progresso li:not([hidden]) a span").forEach((sp, i) => (sp.textContent = String(i + 1)));
    contagem();
    $$(".cot-etapa:not([hidden]) .cot-etapa-topo .cot-num").forEach((sp, i) => (sp.textContent = String(i + 1)));
    desenharItens();
    $('[data-campo-cot="veiculo"]').hidden = !cfg.veiculos.ativo;
    $("#cot-vol").hidden = cfg.volumetria.modo === "oculto";
    $("#cot-vol-opc").hidden = cfg.volumetria.modo !== "opcional";
    $("#cot-r-cub-linha").hidden = cfg.volumetria.modo === "oculto";
    if (cfg.volumetria.modo !== "oculto" && !$("#cot-vol-linhas").children.length) desenharVolumes();
    $("#cot-r-veiculo-linha").hidden = !cfg.veiculos.ativo;
    atualizarVeiculos(); progresso();
  }
  let veiculoEscolhido = "";
  /* volumetria: linhas de volumes (quantidade × comprimento × largura × altura, em cm) */
  let volumes = [{ qtd: 1, c: "", l: "", a: "" }];
  const m3Total = () => Math.round(volumes.reduce((t, v) => t + (+v.qtd > 0 && +v.c > 0 && +v.l > 0 && +v.a > 0 ? v.qtd * v.c * v.l * v.a / 1e6 : 0), 0) * 1000) / 1000;
  const volumesValidos = () => volumes.filter((v) => +v.qtd >= 1 && +v.c > 0 && +v.l > 0 && +v.a > 0).map((v) => ({ qtd: Math.round(+v.qtd), c: +v.c, l: +v.l, a: +v.a }));
  const fmtM3 = (n) => `${Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 3 })} m³`;
  function desenharVolumes() {
    const box = $("#cot-vol-linhas"); if (!box) return;
    box.innerHTML = volumes.map((v, i) => `<div class="cot-vol-linha" data-i="${i}">
      <label>Qtd.<input type="number" min="1" max="9999" step="1" inputmode="numeric" data-v="qtd" value="${esc(v.qtd)}"></label>
      <label>Compr. (cm)<input type="number" min="1" max="2000" step="1" inputmode="decimal" data-v="c" value="${esc(v.c)}"></label>
      <label>Larg. (cm)<input type="number" min="1" max="2000" step="1" inputmode="decimal" data-v="l" value="${esc(v.l)}"></label>
      <label>Alt. (cm)<input type="number" min="1" max="2000" step="1" inputmode="decimal" data-v="a" value="${esc(v.a)}"></label>
      <button type="button" class="cot-tirar" data-tirar-vol aria-label="Tirar volume"${volumes.length === 1 ? " hidden" : ""}>✕</button></div>`).join("");
    totalVolumes();
  }
  function totalVolumes() {
    const cfg = cfgForm(), m3 = m3Total(), qtd = volumesValidos().reduce((t, v) => t + v.qtd, 0);
    const cub = Math.round(m3 * cfg.volumetria.fator * 100) / 100;
    $("#cot-vol-total").innerHTML = m3 ? `<b>${qtd} ${qtd === 1 ? "volume" : "volumes"}</b> · cubagem <b>${fmtM3(m3)}</b> · peso cubado <b>${fmtKg(cub)}</b> <small>(fator ${cfg.volumetria.fator} kg/m³)</small>` : "";
    $("#cot-r-cub").textContent = m3 ? fmtM3(m3) : "—";
  }
  $("#cot-vol-linhas").addEventListener("input", (e) => {
    const inp = e.target.closest("[data-v]"); if (!inp) return;
    volumes[+inp.closest(".cot-vol-linha").dataset.i][inp.dataset.v] = inp.value;
    totalVolumes(); atualizarVeiculos(); progresso();
  });
  $("#cot-vol-linhas").addEventListener("click", (e) => { const b = e.target.closest("[data-tirar-vol]"); if (!b) return; volumes.splice(+b.closest(".cot-vol-linha").dataset.i, 1); desenharVolumes(); atualizarVeiculos(); });
  $("#cot-vol-add").addEventListener("click", () => { volumes.push({ qtd: 1, c: "", l: "", a: "" }); desenharVolumes(); const ult = $$("#cot-vol-linhas [data-v=c]").pop(); if (ult) ult.focus(); });
  function atualizarVeiculos() {
    const cfg = cfgForm(), sel = $("#cot-veiculo"), dica = $("#cot-veiculo-dica"); if (!sel) return;
    const peso = pesoAtual(), pm = cfg.pesoMaximo;
    let msg = pm.ativo && peso > pm.kg ? `Acima do peso máximo por cotação (${fmtKg(pm.kg)}). Fale com o vendedor ou divida o pedido.` : "";
    if (!cfg.veiculos.ativo) { dica.textContent = msg; $("#cot-r-veiculo").textContent = "—"; return; }
    const m3 = cfg.volumetria.modo !== "oculto" ? m3Total() : 0;
    const leva = (v) => v.pesoMax >= peso && (!v.volumeMax || m3 <= v.volumeMax);
    const cabe = cfg.veiculos.lista.filter(leva);
    if (!cabe.find((v) => v.nome === veiculoEscolhido)) veiculoEscolhido = cabe.length ? cabe[0].nome : "";
    sel.innerHTML = `<option value="">${cabe.length ? "Selecione…" : "Nenhum veículo comporta este peso"}</option>` +
      cfg.veiculos.lista.map((v) => `<option value="${esc(v.nome)}"${!leva(v) ? " disabled" : ""}${v.nome === veiculoEscolhido ? " selected" : ""}>${esc(v.nome)} — até ${fmtKg(v.pesoMax)}${v.volumeMax ? ` e ${fmtM3(v.volumeMax)}` : ""}</option>`).join("");
    const carga = `${fmtKg(peso)}${m3 ? ` e ${fmtM3(m3)}` : ""}`;
    if (!msg) msg = !cabe.length ? `Nenhum veículo cadastrado leva ${carga}. Fale com o vendedor.` : peso || m3 ? `Sugerido pela carga (${carga}): ${cabe[0].nome}.` : "";
    dica.textContent = msg;
    $("#cot-r-veiculo").textContent = veiculoEscolhido || "—";
  }
  $("#cot-veiculo").addEventListener("change", (e) => { veiculoEscolhido = e.target.value; atualizarVeiculos(); });
  document.addEventListener("cotacao-config", () => { aplicarForm(); agendarFrete(); });
  const docValido = (d) => (d.length === 11 ? B.cpfValido(d) : d.length === 14 && B.cnpjValido(d));
  function etapasOk() {
    const d = so($("#cot-doc").value), tel = so($("#cot-tel").value), email = $("#cot-email").value.trim();
    const preenche = (k, ok) => !mostra(k) || (exige(k) ? ok : true);
    const sel = (k, id) => preenche(k, !!$(id).value);
    return {
      produtos: !exige("produtos") || C.lista.ler().length > 0,
      entrega: !!endCep && preenche("logradouro", !!$("#cot-rua").value.trim()) && preenche("numero", !!$("#cot-numero").value.trim()) &&
        preenche("bairro", !!$("#cot-bairro").value.trim()) && preenche("complemento", !!$("#cot-compl").value.trim()) && preenche("referencia", !!$("#cot-ref").value.trim()) &&
        preenche("tipo_local", !!valorRadio("tipo_local")) && sel("horario", "#cot-horario") && sel("descarga", "#cot-descarga") && sel("agendamento", "#cot-agenda"),
      dados: preenche("nome", $("#cot-nome").value.trim().length >= 3) && preenche("documento", docValido(d)) && preenche("telefone", /^\d{10,11}$/.test(tel)) && preenche("email", !!email),
      detalhes: preenche("descricao", $("#cot-desc").value.trim().length >= 20) && sel("prazo_desejado", "#cot-prazo") && preenche("peso", pesoAtual() > 0) &&
        (!cfgForm().veiculos.ativo || !!veiculoEscolhido) && !(cfgForm().pesoMaximo.ativo && pesoAtual() > cfgForm().pesoMaximo.kg) &&
        (cfgForm().volumetria.modo !== "obrigatorio" || volumesValidos().length > 0)
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

  /* ---------- intervalo entre cotações (contagem regressiva) ---------- */
  const K_ULTIMA = "policoating_cotacao_ultima";
  let timerEspera = 0;
  const lerUltima = () => { try { return +localStorage.getItem(K_ULTIMA) || 0; } catch (e) { return 0; } };
  function marcarUltima(seg) { try { localStorage.setItem(K_ULTIMA, String(seg != null ? Date.now() - (cfgForm().intervaloMin * 60 - seg) * 1000 : Date.now())); } catch (e) { /* */ } contagem(); }
  function contagem() {
    clearInterval(timerEspera);
    const bt = $("#cot-enviar");
    const tick = () => {
      const fim = lerUltima() + cfgForm().intervaloMin * 60000, falta = Math.ceil((fim - Date.now()) / 1000);
      if (cfgForm().intervaloMin > 0 && falta > 0) {
        bt.disabled = true; bt.classList.add("cot-esperando");
        bt.textContent = `Nova cotação em ${Math.floor(falta / 60)}:${String(falta % 60).padStart(2, "0")}`;
      } else { clearInterval(timerEspera); bt.disabled = false; bt.classList.remove("cot-esperando"); bt.textContent = "Cotar frete e produtos"; }
    };
    tick(); timerEspera = setInterval(tick, 1000);
  }

  /* ---------- enviar ---------- */
  $("#cot-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const erro = (msg, foco) => { $("#cot-erro").textContent = msg; if (foco) { $(foco).focus(); $(foco).scrollIntoView({ block: "center", behavior: "smooth" }); } };
    const cfg = cfgForm(), val = (k, v) => (mostra(k) ? v : "");
    const itens = modo("produtos") === "oculto" ? [] : C.lista.ler();
    const peso = pesoAtual();
    const entrega = {};
    [["horario", "#cot-horario"], ["descarga", "#cot-descarga"], ["prazo_desejado", "#cot-prazo"]].forEach(([k, id]) => { if (mostra(k) && $(id).value) entrega[k] = $(id).value; });
    if (mostra("agendamento") && $("#cot-agenda").value) entrega.agendamento = $("#cot-agenda").value === "sim";
    if (mostra("tipo_local") && valorRadio("tipo_local")) entrega.tipo_local = valorRadio("tipo_local");
    if (mostra("referencia") && $("#cot-ref").value.trim()) entrega.referencia = $("#cot-ref").value.trim();
    if (cfg.volumetria.modo !== "oculto" && volumesValidos().length) {
      entrega.volumes = volumesValidos(); entrega.cubagem_m3 = m3Total(); entrega.peso_cubado_kg = Math.round(m3Total() * cfg.volumetria.fator * 100) / 100; entrega.fator_cubagem = cfg.volumetria.fator;
    }
    if (cfg.veiculos.ativo && veiculoEscolhido) { entrega.veiculo = veiculoEscolhido; const vv = cfg.veiculos.lista.find((x) => x.nome === veiculoEscolhido); if (vv) { entrega.veiculo_peso_max = vv.pesoMax; if (vv.volumeMax) entrega.veiculo_volume_max = vv.volumeMax; } }
    const d = {
      nome: val("nome", $("#cot-nome").value.trim()), documento: val("documento", so($("#cot-doc").value)), telefone: val("telefone", so($("#cot-tel").value)), email: val("email", $("#cot-email").value.trim()),
      cep: so($("#cot-cep").value), logradouro: val("logradouro", $("#cot-rua").value.trim()), numero: val("numero", $("#cot-numero").value.trim()), complemento: val("complemento", $("#cot-compl").value.trim()),
      bairro: val("bairro", $("#cot-bairro").value.trim()), cidade: endCep ? endCep.cidade : "", uf: endCep ? endCep.uf : "",
      descricao: val("descricao", $("#cot-desc").value.trim()), peso_kg: mostra("peso") ? $("#cot-peso").value.trim() : (peso ? String(peso) : ""),
      entrega, itens: itens.map((i) => ({ id: i.id, embalagem: i.embalagem || "Caixa 25 kg", cor: i.cor || "", qtd: i.qtd }))
    };
    const falta = (k, vazio) => exige(k) && vazio;
    if (falta("produtos", !itens.length)) return erro("Adicione pelo menos um produto.", "#cot-busca");
    if (itens.some((i) => !R.disponivel("b2b_quote_enabled", acharProd(i.id) || { id: i.id }))) return erro("Tire da lista os produtos sem cotação pelo site (marcados em cinza).", "#cot-itens");
    if (d.cep.length !== 8 || !endCep) return erro("Informe um CEP de entrega válido.", "#cot-cep");
    if (falta("logradouro", !d.logradouro)) return erro("Informe a rua.", "#cot-rua");
    if (falta("numero", !d.numero)) return erro("Informe o número (ou S/N).", "#cot-numero");
    if (falta("complemento", !d.complemento)) return erro("Informe o complemento.", "#cot-compl");
    if (falta("bairro", !d.bairro)) return erro("Informe o bairro.", "#cot-bairro");
    if (falta("referencia", !entrega.referencia)) return erro("Informe um ponto de referência.", "#cot-ref");
    if (falta("tipo_local", !entrega.tipo_local)) return erro("Escolha o tipo de local.", '.cot-chips input');
    if (falta("horario", !entrega.horario)) return erro("Escolha o horário de recebimento.", "#cot-horario");
    if (falta("descarga", !entrega.descarga)) return erro("Informe como é a descarga.", "#cot-descarga");
    if (falta("agendamento", entrega.agendamento == null)) return erro("Informe se precisa agendar a entrega.", "#cot-agenda");
    if ((exige("documento") || d.documento) && !docValido(d.documento)) return erro("CPF ou CNPJ inválido. Confira os números.", "#cot-doc");
    if ((exige("telefone") || d.telefone) && !/^\d{10,11}$/.test(d.telefone)) return erro("Informe o telefone com DDD.", "#cot-tel");
    if ((exige("nome") || d.nome) && d.nome.length < 3) return erro("Informe o nome completo ou a razão social.", "#cot-nome");
    if (falta("email", !d.email)) return erro("Informe o e-mail.", "#cot-email");
    if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) return erro("E-mail inválido (ou deixe em branco).", "#cot-email");
    if ((exige("descricao") || d.descricao) && d.descricao.length < 20) return erro(exige("descricao") ? "Descreva o serviço com mais detalhes (mínimo de 20 letras)." : "Descrição: mínimo de 20 letras, ou deixe em branco.", "#cot-desc");
    if (falta("prazo_desejado", !entrega.prazo_desejado)) return erro("Diga para quando precisa.", "#cot-prazo");
    if ((exige("peso") || (!itens.length && mostra("peso"))) && !(peso > 0)) return erro(itens.length ? "Informe o peso total." : "Sem produtos na lista: informe o peso total da carga.", "#cot-peso");
    if (cfg.pesoMaximo.ativo && peso > cfg.pesoMaximo.kg) return erro(`O peso (${fmtKg(peso)}) passa do máximo por cotação (${fmtKg(cfg.pesoMaximo.kg)}). Fale com o vendedor.`, "#cot-peso");
    if (cfg.volumetria.modo === "obrigatorio" && !volumesValidos().length) return erro("Informe as medidas dos volumes (quantidade, comprimento, largura e altura).", "#cot-vol-linhas input");
    if (cfg.veiculos.ativo && !veiculoEscolhido) return erro("Nenhum veículo cadastrado comporta esse peso. Fale com o vendedor.", "#cot-veiculo");
    erro("");
    const bt = $("#cot-enviar"); bt.disabled = true; bt.textContent = "Cotando…";
    const fimAnim = window.CotacaoAnimacao ? window.CotacaoAnimacao.mostrar() : async () => {};
    try {
      let r;
      try { r = await C.enviar(d); } catch (errEnvio) { await fimAnim(false); const m = /Aguarde (\d+) segundos/.exec(errEnvio.message || ""); if (m) marcarUltima(+m[1]); throw errEnvio; }
      marcarUltima();
      await fimAnim(true);
      C.lista.limpar();
      const fr = r.frete && r.frete.zona !== "manual" ? r.frete : freteAtual && freteAtual.valor != null && !C.online ? freteAtual : r.frete;
      mostrarSucesso(Object.assign({}, d, r, { status: r.status || "recebida", itens: r.itens || d.itens, frete: fr, entrega: r.entrega || d.entrega }));
    } catch (err) { erro(err.message); }
    finally { bt.disabled = false; bt.textContent = "Cotar frete e produtos"; contagem(); }
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
    $("#cot-minhas-dica").innerHTML = u ? `As cotações da sua conta e as feitas neste aparelho, dos últimos 7 dias (até ${C.limiteLista()}; as mais antigas saem da lista).` : `As cotações feitas neste aparelho nos últimos 7 dias. <a href="conta">Entre na sua conta</a> para ver também as feitas em outros aparelhos.`;
    box.innerHTML = `<p class="carregando">Carregando…</p>`;
    try {
      const v = await C.minhas();
      box.innerHTML = v.length ? v.map((c) => C.htmlCartao(c, { excluir: true })).join("") : `<div class="cot-vazio"><strong>Nenhuma cotação nos últimos 7 dias.</strong><span><button type="button" class="btn btn-primario" data-ir-nova>Fazer uma cotação</button></span></div>`;
      C.ligarCopiar(box);
      const b = $("[data-ir-nova]", box); if (b) b.addEventListener("click", () => abrir("nova"));
      $$("[data-excluir]", box).forEach((x) => x.addEventListener("click", async () => {
        if (!confirm(`Excluir a cotação ${x.dataset.excluir} da sua lista? O número continua valendo com o vendedor até vencer.`)) return;
        x.disabled = true; x.textContent = "Excluindo…";
        try { await C.excluir(x.dataset.excluir); } catch (e) { x.disabled = false; x.textContent = "Excluir da minha lista"; alert("Não deu para excluir agora: " + (e.message || "tente de novo.")); return; }
        desenharMinhas();
      }));
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
    aplicarForm(); preencherDaConta(); contarMinhas(); contar();
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
