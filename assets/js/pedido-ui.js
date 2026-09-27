/* =========================================================
   Policoating — Detalhe do pedido (cliente e equipe)
   Situação, previsão de envio/entrega, itens e valores, chat e pós-venda.
   Uso: PedidoUI.abrir("PC-...", { lado: "cliente" | "equipe", podeExcluir, aoMudar })
   ========================================================= */
(function () {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const R = (v) => (+v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const kgTxt = (v) => (Math.round((+v || 0) * 100) / 100).toLocaleString("pt-BR") + " kg";
  const hora = (v) => (v ? new Date(v).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "");
  const L = () => window.Loja;
  const icone = (n) => (window.Icone ? window.Icone(n) : "");

  let atual = null, timer = 0, opc = {}, ultimaQtd = -1;

  function estrutura() {
    if ($("#pedido-painel")) return;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="pedido-fundo" id="pedido-fundo" hidden></div>
      <aside class="pedido-painel" id="pedido-painel" role="dialog" aria-modal="true" aria-labelledby="pp-titulo" hidden>
        <header class="pp-topo"><div><h2 id="pp-titulo">Pedido</h2><small id="pp-sub"></small></div>
          <button type="button" class="fechar" id="pp-fechar" aria-label="Fechar">×</button></header>
        <div class="pp-corpo" id="pp-corpo"></div>
      </aside>`);
    $("#pp-fechar").addEventListener("click", fechar);
    $("#pedido-fundo").addEventListener("click", fechar);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#pedido-painel").hidden) fechar(); });
  }
  function fechar() {
    clearInterval(timer); atual = null;
    $("#pedido-painel").hidden = $("#pedido-fundo").hidden = true;
    document.body.style.overflow = "";
    if (location.hash.startsWith("#compra=") || location.hash.startsWith("#venda=")) history.replaceState(null, "", location.pathname + location.search);
    if (opc.aoMudar) opc.aoMudar();
  }

  async function abrir(numero, opcoes) {
    opc = opcoes || {}; estrutura();
    $("#pedido-painel").hidden = $("#pedido-fundo").hidden = false;
    document.body.style.overflow = "hidden";
    $("#pp-corpo").innerHTML = `<p class="dica">Carregando...</p>`;
    atual = numero; ultimaQtd = -1;
    await desenhar();
    clearInterval(timer);
    timer = setInterval(() => { if (atual === numero && !document.hidden) atualizarChat(); }, 8000);
  }

  function linhaTempo(p) {
    const S = L().STATUS, passo = (S[p.status] || {}).passo || 0;
    if (!passo) return `<div class="pp-encerrado ${p.status}"><strong>${esc(S[p.status][opc.lado === "equipe" ? "equipe" : "cliente"])}</strong>
      ${p.motivo_cancelamento ? `<span>Motivo: ${esc(p.motivo_cancelamento)}</span>` : ""}<small>${hora(p.cancelado_em || p.reembolsado_em)}</small></div>`;
    const etapas = [["Compra recebida", p.criado_em], ["Preparando o envio", p.confirmado_em], ["A caminho", p.enviado_em], ["Entregue", p.entregue_em]];
    return `<ol class="pp-tempo">${etapas.map(([t, d], i) => `<li class="${i + 1 < passo ? "feito" : i + 1 === passo ? "atual" : ""}"><span>${t}</span><small>${d ? hora(d) : ""}</small></li>`).join("")}</ol>`;
  }
  function previsao(p) {
    if (["cancelado", "reembolsado"].includes(p.status)) return "";
    const L_ = L(), ent = p.previsao_entrega_min ? `entre <strong>${L_.dataBR(p.previsao_entrega_min)}</strong> e <strong>${L_.dataBR(p.previsao_entrega_max)}</strong>` : "";
    if (p.status === "entregue") return `<div class="pp-previsao ok">${icone("check")}<span>Entregue em <strong>${hora(p.entregue_em)}</strong></span></div>`;
    if (p.status === "enviado") return `<div class="pp-previsao">${icone("local")}<span>A caminho${p.transportadora ? ` pela <strong>${esc(p.transportadora)}</strong>` : ""}${p.rastreio ? ` · rastreio <strong>${esc(p.rastreio)}</strong>` : ""}. Chega ${ent}.</span></div>`;
    return `<div class="pp-previsao">${icone("relogio")}<span>Envio previsto: <strong>${esc(L_.textoEnvio(p.previsao_envio))}</strong>${p.previsao_envio ? ` (${L_.dataBR(p.previsao_envio)})` : ""}. Chega ${ent} em ${esc(p.destino_cidade || "")}/${esc(p.destino_uf || "")}.<small>Prazo estimado a partir de Matão-SP (simulação).</small></span></div>`;
  }
  function itensHtml(p, editarPrecos) {
    return `<ul class="pp-itens">${(p.itens || []).map((i) => {
      const foto = i.foto || (() => { const pr = window.ColorWeg && window.ColorWeg.acharProduto(i.id, i.cor); return pr ? (pr.fotos || [])[0] || window.ColorWeg.fotoProduto(pr, pr.cores[0], { largura: 160, altura: 128 }) : ""; })();
      const preco = i.preco_kg == null
        ? (editarPrecos ? `<label class="pp-preco-input">R$/kg <input type="number" min="0" step="0.01" data-preco-item="${esc(i.id)}" placeholder="combinado"></label>` : `<em>Valor a combinar</em>`)
        : `<span>${R(i.preco_kg)}/kg</span><strong>${R(i.subtotal)}</strong>`;
      return `<li>${foto ? `<img src="${esc(foto)}" alt="" width="64" height="52">` : `<span class="pp-sem-foto"></span>`}
        <div><strong>${esc(i.nome)}</strong><small>Cód. ${esc(i.codigo || i.id)} · ${esc(i.embalagem === "Sob medida" ? `${i.qtd} kg (sob medida)` : `${i.qtd} × ${i.embalagem}`)} · ${kgTxt(i.kg || L().kgDoItem(i))}</small></div>
        <div class="pp-item-valor">${preco}</div></li>`;
    }).join("")}</ul>
    <div class="pp-total"><span>Total${p.tem_combinar ? " (sem os itens a combinar)" : ""}</span><strong>${R(p.total)}</strong><small>${kgTxt(p.total_kg)} · frete e pagamento combinados com o vendedor pelo chat</small></div>`;
  }
  function clienteHtml(p) {
    const c = p.cliente || {}, tel = String(c.telefone || "").replace(/\D/g, "");
    const nome = (c.tipo === "pj" ? (c.nome_fantasia || c.razao_social) : c.nome) || c.email || "Cliente";
    return `<div class="pp-cliente"><strong>${esc(nome)}</strong>
      <small>${c.tipo === "pj" ? `CNPJ ${esc(c.cnpj || "")}${c.responsavel ? " · " + esc(c.responsavel) : ""}` : `CPF ${esc(c.cpf || "")}`}</small>
      <small>${esc(c.email || "")}${c.telefone ? " · " + esc(c.telefone) : ""}</small>
      <small>${esc([c.logradouro, c.numero, c.complemento].filter(Boolean).join(", "))}${c.bairro ? " · " + esc(c.bairro) : ""} — ${esc(c.cidade || p.destino_cidade || "")}/${esc(c.uf || p.destino_uf || "")} · CEP ${esc(c.cep || p.destino_cep || "")}</small>
      ${tel ? `<a class="btn btn-whats" target="_blank" rel="noopener" href="https://wa.me/${tel.length <= 11 ? "55" + tel : tel}?text=${encodeURIComponent(`Olá, ${nome}! Aqui é da Policoating, sobre o seu pedido ${p.numero}.`)}">WhatsApp</a>` : ""}</div>`;
  }
  function solicitacoesHtml(p, lista) {
    if (!lista.length) return "";
    return `<div class="pp-solic"><h3>Solicitações</h3>${lista.map((s) => `
      <div class="pp-solic-item ${s.status}"><div><strong>${esc(L().TIPOS_SOLIC[s.tipo])}</strong> <b class="selo-cli ${s.status === "aberta" ? "inativo" : s.status === "aceita" ? "ativo" : "zerado"}">${s.status === "aberta" ? "Em análise" : s.status === "aceita" ? "Aceita" : "Recusada"}</b>
        <small>${hora(s.criado_em)} · Motivo: ${esc(s.motivo)}</small>${s.resposta ? `<small>Resposta: ${esc(s.resposta)}</small>` : ""}</div>
        ${opc.lado === "equipe" && s.status === "aberta" ? `<div class="pp-responder" data-solic="${esc(s.id)}" data-tipo="${esc(s.tipo)}">
          <input type="text" maxlength="500" placeholder="${s.tipo === "atendimento" ? "Resposta (opcional)" : "Resposta ao cliente (obrigatória para recusar)"}" data-resposta>
          ${s.tipo === "reembolso" ? `<label class="check-excluir"><input type="checkbox" data-devolver> Devolver ao estoque</label>` : ""}
          <button type="button" class="btn btn-primario" data-responder="1">${s.tipo === "atendimento" ? "Marcar como resolvido" : "Aceitar"}</button>
          ${s.tipo === "atendimento" ? "" : `<button type="button" class="btn btn-contorno-azul" data-responder="0">Recusar</button>`}</div>` : ""}
      </div>`).join("")}</div>`;
  }
  function acoesHtml(p, solic) {
    const aberta = (t) => solic.some((s) => s.tipo === t && s.status === "aberta");
    if (opc.lado === "cliente") {
      const b = [];
      if (["recebido", "confirmado"].includes(p.status) && !aberta("cancelamento")) b.push(["cancelamento", p.status === "recebido" ? "Cancelar compra" : "Pedir cancelamento"]);
      if (["confirmado", "enviado", "entregue"].includes(p.status) && !aberta("reembolso")) b.push(["reembolso", "Pedir reembolso / devolução"]);
      if (!aberta("atendimento")) b.push(["atendimento", "Falar com o atendimento"]);
      return b.length ? `<div class="pp-acoes">${b.map(([t, r]) => `<button type="button" class="btn ${t === "atendimento" ? "btn-contorno-azul" : "btn-contorno-perigo"}" data-solicitar="${t}">${r}</button>`).join("")}</div>
        <form class="pp-form" id="pp-form-solic" hidden><label id="pp-form-titulo"></label><textarea rows="2" maxlength="500" id="pp-motivo" placeholder="Conte o motivo"></textarea>
          <div><button type="submit" class="btn btn-primario">Enviar</button><button type="button" class="btn-link" id="pp-form-cancelar">Voltar</button></div></form>` : "";
    }
    const b = [];
    if (p.status === "recebido") b.push(`<button type="button" class="btn btn-primario" data-acao="confirmar">Confirmar venda</button>`);
    if (p.status === "confirmado") b.push(`<button type="button" class="btn btn-primario" data-acao="enviar">Marcar como enviado</button>`);
    if (p.status === "enviado") b.push(`<button type="button" class="btn btn-primario" data-acao="entregar">Marcar como entregue</button>`);
    if (["recebido", "confirmado", "enviado"].includes(p.status)) b.push(`<button type="button" class="btn btn-contorno-perigo" data-acao="cancelar">Cancelar venda</button>`);
    if (opc.podeExcluir) b.push(`<button type="button" class="btn-excluir-pedido" data-acao="excluir">Excluir pedido</button>`);
    return `<div class="pp-acoes">${b.join("")}</div>
      <form class="pp-form" id="pp-form-envio" hidden><label>Transportadora<input id="pp-transp" maxlength="60" placeholder="Ex.: Braspress, Correios, retirada"></label>
        <label>Código de rastreio<input id="pp-rastreio" maxlength="60" placeholder="Opcional"></label>
        <div><button type="submit" class="btn btn-primario">Confirmar envio</button><button type="button" class="btn-link" data-voltar>Voltar</button></div></form>`;
  }

  async function desenhar() {
    const numero = atual;
    let p, solic = [];
    try { [p, solic] = await Promise.all([L().pedido(numero), L().solicitacoes(numero).catch(() => [])]); }
    catch (e) { $("#pp-corpo").innerHTML = `<p class="form-erro">${esc(e.message)}</p>`; return; }
    if (atual !== numero) return;
    const S = L().STATUS[p.status] || { cliente: p.status, equipe: p.status };
    $("#pp-titulo").textContent = `${opc.lado === "equipe" ? "Venda" : "Compra"} ${p.numero}`;
    $("#pp-sub").innerHTML = `${hora(p.criado_em)} · <b class="pp-status ${p.status}">${esc(opc.lado === "equipe" ? S.equipe : S.cliente)}</b>${p.vendedor && opc.lado === "equipe" ? ` · vendedor ${esc(p.vendedor)}` : ""}`;
    const confirmarPrecos = opc.lado === "equipe" && p.status === "recebido";
    $("#pp-corpo").innerHTML = `
      ${linhaTempo(p)}
      ${previsao(p)}
      <section class="pp-secao"><h3>Itens</h3>${itensHtml(p, confirmarPrecos)}${p.observacoes ? `<p class="pp-obs">Obs.: ${esc(p.observacoes)}</p>` : ""}</section>
      ${opc.lado === "equipe" ? `<section class="pp-secao"><h3>Cliente e entrega</h3>${clienteHtml(p)}</section>` : ""}
      ${solicitacoesHtml(p, solic)}
      ${acoesHtml(p, solic)}
      <p class="form-erro" id="pp-erro" role="alert"></p>
      <section class="pp-secao pp-chat"><h3>${opc.lado === "equipe" ? "Conversa com o cliente" : "Conversa com o vendedor"}</h3>
        <div class="pp-msgs" id="pp-msgs" aria-live="polite"></div>
        <form class="pp-enviar" id="pp-enviar"><textarea id="pp-texto" rows="2" maxlength="1000" placeholder="${opc.lado === "equipe" ? "Responder ao cliente..." : "Tire dúvidas sobre o produto, entrega ou pagamento..."}" aria-label="Mensagem"></textarea>
          <button type="submit" class="btn btn-primario">Enviar</button></form>
      </section>`;
    ligar(p);
    await atualizarChat(true);
  }

  async function atualizarChat(forcar) {
    const numero = atual; if (!numero) return;
    let msgs;
    try { msgs = await L().mensagens(numero); } catch (e) { return; }
    if (atual !== numero || (!forcar && msgs.length === ultimaQtd)) return;
    const caixa = $("#pp-msgs"); if (!caixa) return;
    const noFim = caixa.scrollHeight - caixa.scrollTop - caixa.clientHeight < 60;
    const eu = opc.lado === "equipe" ? ["vendedor", "atendimento"] : ["cliente"];
    const quem = { cliente: opc.lado === "equipe" ? "Cliente" : "Você", vendedor: "Vendedor Policoating", atendimento: "Atendimento Policoating", sistema: "" };
    caixa.innerHTML = msgs.length ? msgs.map((m) => m.lado === "sistema"
      ? `<div class="pp-msg sistema"><span>${esc(m.texto)}</span><small>${hora(m.criado_em)}</small></div>`
      : `<div class="pp-msg ${eu.includes(m.lado) ? "minha" : "outra"} ${m.lado}"><b>${esc(quem[m.lado])}${opc.lado === "equipe" && m.lado !== "cliente" && m.autor ? ` · ${esc(m.autor)}` : ""}</b><span>${esc(m.texto)}</span><small>${hora(m.criado_em)}</small></div>`).join("")
      : `<p class="dica">Nenhuma mensagem ainda. ${opc.lado === "equipe" ? "Escreva para o cliente." : "Fale com o vendedor por aqui."}</p>`;
    if (forcar || noFim || msgs.length > ultimaQtd) caixa.scrollTop = caixa.scrollHeight;
    if (msgs.length !== ultimaQtd && ultimaQtd >= 0 && !forcar) desenharSeMudouStatus();
    ultimaQtd = msgs.length;
    L().marcarLido(numero).catch(() => {});
    document.dispatchEvent(new CustomEvent("notificacoes-atualizar"));
  }
  let checando = false;
  async function desenharSeMudouStatus() { if (checando) return; checando = true; try { await desenhar(); } finally { checando = false; } }

  function erro(m) { const e = $("#pp-erro"); if (e) e.textContent = m || ""; }
  async function executar(fn, ok) {
    erro("");
    try { await fn(); if (ok && window.ColorWeg) window.ColorWeg.mostrarToast(ok); await desenhar(); if (opc.aoMudar) opc.aoMudar(); }
    catch (e) { erro(e.message); }
  }

  function ligar(p) {
    const corpo = $("#pp-corpo");
    $("#pp-enviar").addEventListener("submit", async (e) => {
      e.preventDefault();
      const t = $("#pp-texto"), b = $("button", e.target); if (!t.value.trim()) return;
      b.disabled = true;
      try { await L().enviarMensagem(p.numero, t.value); t.value = ""; await atualizarChat(true); } catch (err) { erro(err.message); }
      finally { b.disabled = false; t.focus(); }
    });
    $("#pp-texto").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#pp-enviar").requestSubmit(); } });

    // cliente: solicitações
    let tipoSolic = null;
    corpo.addEventListener("click", (e) => {
      const s = e.target.closest("[data-solicitar]");
      if (s) {
        tipoSolic = s.dataset.solicitar;
        const f = $("#pp-form-solic"); f.hidden = false;
        $("#pp-form-titulo").textContent = { cancelamento: p.status === "recebido" ? "Por que você quer cancelar? A compra será cancelada na hora." : "Por que você quer cancelar? O vendedor vai analisar, pois o pedido já está em preparação.",
          reembolso: "Conte o que aconteceu (produto com defeito, cor diferente, atraso...). O vendedor vai analisar.", atendimento: "Como o atendimento pode ajudar?" }[tipoSolic];
        $("#pp-motivo").focus();
      }
    });
    const fs = $("#pp-form-solic");
    if (fs) {
      $("#pp-form-cancelar").addEventListener("click", () => (fs.hidden = true));
      fs.addEventListener("submit", (e) => {
        e.preventDefault();
        executar(() => L().solicitar(p.numero, tipoSolic, $("#pp-motivo").value),
          tipoSolic === "cancelamento" && p.status === "recebido" ? "Compra cancelada." : "Solicitação enviada. Acompanhe a resposta por aqui.");
      });
    }

    // equipe: ações
    corpo.addEventListener("click", async (e) => {
      const a = e.target.closest("[data-acao]");
      if (a) {
        const acao = a.dataset.acao;
        if (acao === "confirmar") {
          const itens = $$("[data-preco-item]", corpo).map((i) => ({ id: i.dataset.precoItem, preco_kg: i.value === "" ? null : +i.value }));
          if (itens.some((i) => i.preco_kg == null)) return erro("Informe o preço combinado (R$/kg) dos itens a combinar.");
          return executar(() => L().acao(p.numero, "confirmar", { itens }), "Venda confirmada. O cliente foi avisado no chat.");
        }
        if (acao === "enviar") { $("#pp-form-envio").hidden = false; $("#pp-transp").focus(); return; }
        if (acao === "entregar") { if (confirm("Confirmar que o pedido foi entregue?")) executar(() => L().acao(p.numero, "entregar"), "Pedido marcado como entregue."); return; }
        if (acao === "cancelar") {
          const motivo = prompt("Motivo do cancelamento (o cliente verá no chat). O estoque reservado volta."); if (motivo == null) return;
          return executar(() => L().acao(p.numero, "cancelar", { motivo }), "Venda cancelada.");
        }
        if (acao === "excluir") {
          if (!confirm(`Excluir o pedido ${p.numero}? Ele some do painel e da conta do cliente. Isso não pode ser desfeito.`)) return;
          try { await L().acao(p.numero, "excluir"); if (window.ColorWeg) window.ColorWeg.mostrarToast("Pedido excluído."); fechar(); } catch (err) { erro(err.message); }
          return;
        }
      }
      const r = e.target.closest("[data-responder]");
      if (r) {
        const box = r.closest("[data-solic]"), aceitar = r.dataset.responder === "1";
        const resposta = $("[data-resposta]", box).value, dev = $("[data-devolver]", box);
        if (aceitar && box.dataset.tipo === "cancelamento" && !confirm("Aceitar o cancelamento? O pedido será cancelado e o estoque volta.")) return;
        executar(() => L().acao(p.numero, "responder", { solicitacao: box.dataset.solic, aceitar, resposta, devolverEstoque: !!(dev && dev.checked) }), "Resposta enviada ao cliente.");
      }
    });
    const fe = $("#pp-form-envio");
    if (fe) {
      $("[data-voltar]", fe).addEventListener("click", () => (fe.hidden = true));
      fe.addEventListener("submit", (e) => { e.preventDefault(); executar(() => L().acao(p.numero, "enviar", { transportadora: $("#pp-transp").value, rastreio: $("#pp-rastreio").value }), "Pedido marcado como enviado."); });
    }
  }

  window.PedidoUI = { abrir, fechar };
})();
