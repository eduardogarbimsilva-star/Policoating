/* =========================================================
   Central de avisos do cliente (sino no topo do site)
   - Pedidos (com login): mudança de situação, código de rastreio e mensagem nova da equipe.
   - Cotações (da conta e deste aparelho): mudança de situação, proposta do vendedor e "vence em menos de 24 h".
   - Confere ao abrir a página e a cada 3 minutos com a aba visível. A primeira conferência só
     memoriza o estado (não enche de avisos antigos). Avisos do navegador só com permissão do cliente.
   - Tudo fica neste navegador (localStorage); nada novo é gravado no servidor.
   ========================================================= */
(function () {
  "use strict";
  const K_ESTADO = "policoating_avisos_estado", K_LISTA = "policoating_avisos";
  const ler = (k, p) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? p : v; } catch (e) { return p; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem espaço */ } };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reais = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const ST_PEDIDO = { recebido: "Recebido", confirmado: "Confirmado", enviado: "Enviado", entregue: "Entregue", cancelado: "Cancelado", reembolsado: "Reembolsado" };
  const SINO = `<svg class="icone-svg" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>`;
  let botao, painel, conferindo = false;

  const lista = () => ler(K_LISTA, []);
  const naoLidos = () => lista().filter((a) => !a.lido).length;

  function adicionar(novos) {
    if (!novos.length) return;
    const atual = lista();
    novos.forEach((a) => { if (!atual.some((x) => x.id === a.id)) atual.unshift(Object.assign({ em: new Date().toISOString(), lido: false }, a)); });
    gravar(K_LISTA, atual.slice(0, 40));
    desenhar();
    const n = novos.length, CW = window.ColorWeg;
    if (CW && CW.mostrarToast) CW.mostrarToast(n === 1 ? `<strong>${esc(novos[0].titulo)}</strong> ${esc(novos[0].texto)}` : `Você tem <strong>${n} avisos novos</strong>. Veja no sino.`, true);
    try {
      if (window.Notification && Notification.permission === "granted" && document.hidden)
        novos.slice(0, 3).forEach((a) => new Notification("Policoating: " + a.titulo, { body: a.texto, icon: "assets/img/app/icone-192.png", tag: a.id }));
    } catch (e) { /* navegador sem suporte */ }
  }

  /* ---------- comparação com o estado anterior ---------- */
  function compararCotacoes(cots, ant, novos, primeira) {
    const C = window.Cotacao, est = {};
    cots.forEach((c) => {
      const a = ant[c.protocolo], venceH = (new Date(c.expira_em).getTime() - Date.now()) / 3600000;
      est[c.protocolo] = { s: c.status, v: c.valor_proposta == null ? null : Number(c.valor_proposta), r: !!c.resposta, aviso24: !!(a && a.aviso24) };
      if (primeira || !a) return;
      const link = "cotacao#codigo=" + encodeURIComponent(c.protocolo), nome = (C && C.STATUS[c.status] || {}).nome || c.status;
      if (a.s !== c.status) novos.push({ id: `cot-${c.protocolo}-${c.status}`, tipo: "cotacao", titulo: `Cotação ${c.protocolo}`, texto: c.status === "proposta_enviada" && c.valor_proposta != null ? `Proposta enviada: ${reais(c.valor_proposta)}.` : `Situação: ${nome}.`, link });
      else if ((est[c.protocolo].v !== a.v && est[c.protocolo].v != null) || (est[c.protocolo].r && !a.r)) novos.push({ id: `cot-${c.protocolo}-resp-${Date.now()}`, tipo: "cotacao", titulo: `Cotação ${c.protocolo}`, texto: c.valor_proposta != null ? `O vendedor respondeu: ${reais(c.valor_proposta)}.` : "O vendedor respondeu.", link });
      if (venceH > 0 && venceH < 24 && !est[c.protocolo].aviso24 && !["aprovada", "recusada"].includes(c.status)) {
        est[c.protocolo].aviso24 = true;
        novos.push({ id: `cot-${c.protocolo}-vence`, tipo: "cotacao", titulo: `Cotação ${c.protocolo}`, texto: "Vence em menos de 24 horas.", link });
      }
    });
    return est;
  }
  function compararPedidos(peds, ant, novos, primeira) {
    const est = {};
    peds.forEach((p) => {
      const k = String(p.numero || p.id), a = ant[k];
      const msgEquipe = p.ultima_msg_lado === "equipe" && p.msg_ultima_em && (!p.msg_lida_cliente_em || p.msg_ultima_em > p.msg_lida_cliente_em) ? p.msg_ultima_em : "";
      est[k] = { s: p.status || "recebido", r: p.rastreio || "", m: msgEquipe };
      if (primeira || !a) return;
      const link = "conta#pedidos";
      if (a.s !== est[k].s) novos.push({ id: `ped-${k}-${est[k].s}`, tipo: "pedido", titulo: `Pedido nº ${k}`, texto: `Situação: ${ST_PEDIDO[est[k].s] || est[k].s}${est[k].s === "enviado" && p.transportadora ? ` (${p.transportadora})` : ""}.`, link });
      if (est[k].r && est[k].r !== a.r) novos.push({ id: `ped-${k}-rastreio`, tipo: "pedido", titulo: `Pedido nº ${k}`, texto: `Código de rastreio: ${est[k].r}.`, link });
      if (msgEquipe && msgEquipe !== a.m) novos.push({ id: `ped-${k}-msg-${msgEquipe}`, tipo: "pedido", titulo: `Pedido nº ${k}`, texto: "Mensagem nova da equipe no chat do pedido.", link });
    });
    return est;
  }

  async function conferir() {
    if (conferindo || document.hidden) return;
    conferindo = true;
    try {
      const Conta = window.Conta, C = window.Cotacao;
      const logado = !!(Conta && Conta.usuario);
      const estado = ler(K_ESTADO, null), primeira = !estado || (estado.usuario || "") !== (logado ? Conta.usuario.email : "");
      const ant = primeira ? { cot: {}, ped: {} } : estado;
      const novos = [];
      let cots = [], peds = [];
      if (C && (logado || C.lembradas().length)) { try { cots = await C.minhas(); } catch (e) { cots = null; } }
      if (logado && Conta.listarPedidos) { try { peds = await Conta.listarPedidos(); } catch (e) { peds = null; } }
      const novoEstado = {
        usuario: logado ? Conta.usuario.email : "",
        cot: cots ? compararCotacoes(cots, ant.cot || {}, novos, primeira) : (ant.cot || {}),
        ped: peds ? compararPedidos(peds, ant.ped || {}, novos, primeira) : (ant.ped || {})
      };
      gravar(K_ESTADO, novoEstado);
      adicionar(novos);
      mostrarBotao(logado || (C && C.lembradas().length > 0) || lista().length > 0);
    } finally { conferindo = false; }
  }

  /* ---------- sino e painel ---------- */
  const quando = (iso) => { const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000); return m < 1 ? "agora" : m < 60 ? `há ${m} min` : m < 1440 ? `há ${Math.round(m / 60)} h` : new Date(iso).toLocaleDateString("pt-BR"); };
  function desenhar() {
    if (!botao) return;
    const n = naoLidos(), cont = botao.querySelector(".avisos-cont");
    cont.textContent = n > 9 ? "9+" : String(n); cont.hidden = !n;
    botao.setAttribute("aria-label", n ? `Avisos: ${n} não lido${n === 1 ? "" : "s"}` : "Avisos");
    if (painel.hidden) return;
    const v = lista(), pode = "Notification" in window && Notification.permission === "default";
    painel.innerHTML = `<div class="avisos-topo"><strong>Avisos</strong>${v.some((a) => !a.lido) ? `<button type="button" data-ler-todos>Marcar como lidos</button>` : ""}</div>
      ${v.length ? `<ul class="avisos-lista">${v.map((a) => `<li class="${a.lido ? "" : "nao-lido"}"><a href="${esc(a.link || "#")}" data-aviso="${esc(a.id)}">
          <span class="aviso-ic aviso-${esc(a.tipo)}" aria-hidden="true"></span>
          <span class="aviso-txt"><b>${esc(a.titulo)}</b><span>${esc(a.texto)}</span><small>${quando(a.em)}</small></span></a></li>`).join("")}</ul>`
        : `<p class="avisos-vazio">Nenhum aviso por enquanto. Quando a situação de um pedido ou de uma cotação mudar, aparece aqui.</p>`}
      ${pode ? `<button type="button" class="avisos-permitir" data-permitir>Receber avisos do navegador</button>` : ""}`;
  }
  function abrir(sim) {
    painel.hidden = !sim; botao.setAttribute("aria-expanded", String(sim));
    if (sim) { desenhar(); const f = painel.querySelector("a, button"); if (f) f.focus(); }
  }
  function mostrarBotao(sim) { if (botao) botao.hidden = !sim; }
  function montar() {
    const acoes = document.querySelector(".acoes-topo");
    if (!acoes || document.querySelector(".btn-avisos")) return;
    const caixa = document.createElement("div");
    caixa.className = "avisos-caixa";
    caixa.innerHTML = `<button type="button" class="btn-avisos" aria-haspopup="true" aria-expanded="false" aria-label="Avisos" hidden>${SINO}<span class="avisos-cont" hidden></span></button><div class="avisos-painel" role="dialog" aria-label="Avisos" hidden></div>`;
    const conta = acoes.querySelector(".link-conta");
    acoes.insertBefore(caixa, conta || acoes.firstChild);
    botao = caixa.querySelector(".btn-avisos"); painel = caixa.querySelector(".avisos-painel");
    botao.addEventListener("click", () => abrir(painel.hidden));
    document.addEventListener("click", (e) => { if (!painel.hidden && !e.composedPath().includes(caixa)) abrir(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !painel.hidden) { abrir(false); botao.focus(); } });
    painel.addEventListener("click", (e) => {
      const a = e.target.closest("[data-aviso]");
      if (a) { gravar(K_LISTA, lista().map((x) => (x.id === a.dataset.aviso ? Object.assign(x, { lido: true }) : x))); desenhar(); return; }
      if (e.target.closest("[data-ler-todos]")) { gravar(K_LISTA, lista().map((x) => Object.assign(x, { lido: true }))); desenhar(); return; }
      if (e.target.closest("[data-permitir]")) { try { Notification.requestPermission().then(desenhar); } catch (err) { /* sem suporte */ } }
    });
    desenhar();
    mostrarBotao(lista().length > 0);
  }

  function iniciar() {
    montar();
    const comecar = () => setTimeout(conferir, 1200);
    Promise.resolve(window.ContaPronta).then(comecar, comecar);
    setInterval(conferir, 3 * 60 * 1000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) conferir(); });
    if (window.Conta && window.Conta.aoMudar) window.Conta.aoMudar(() => setTimeout(conferir, 500));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
  window.Avisos = { conferir, lista, naoLidos };
})();
