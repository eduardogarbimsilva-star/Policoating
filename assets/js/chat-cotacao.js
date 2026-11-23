/* =========================================================
   Chat da cotação aprovada — estilo aplicativo de mensagens
   - Cliente: botão "Abrir chat" na cotação APROVADA (recurso "Chat da cotação" ligado).
     Um assistente virtual recebe o cliente e responde o básico até alguém da equipe responder.
   - Equipe (painel → Cotações): lista de conversas com não lidas e "Abrir chat" em cada cotação aprovada.
     Ao responder, o assistente pausa; ao fechar o chat (ou "Sair do chat"), o assistente volta.
   - Servidor: função "chat" do Supabase (PARTE AC). Sem Supabase (modo demonstração): simulação local.
   ========================================================= */
(function () {
  "use strict";
  const CFG = window.SITE_CONFIG || {};
  const SB = CFG.supabase || {};
  const ONLINE = !!(SB.url && SB.anonKey);
  const PAINEL = /(^|\/)admin(\.html)?$/.test(location.pathname);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ligado = () => !!(window.Recursos && window.Recursos.ligado("quote_chat_enabled"));
  const ic = (d, extra) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"${extra || ""}>${d}</svg>`;
  const I = {
    enviar: ic('<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>'),
    voltar: ic('<path d="M15 18l-6-6 6-6"/>'),
    robo: ic('<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4M9 13h.01M15 13h.01M9 17h6"/>'),
    pessoa: ic('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    caminhao: ic('<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>'),
    sair: ic('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'),
    chat: ic('<path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.6A8 8 0 1 1 21 12z"/>')
  };

  /* ---------- servidor (ou simulação local) ---------- */
  async function tokenSessao() {
    try { const sb = await window.Conta.cliente(); const { data } = await sb.auth.getSession(); return (data && data.session && data.session.access_token) || ""; } catch (e) { return ""; }
  }
  async function chamar(corpo, opcoes) {
    if (!ONLINE) return demo(corpo);
    const headers = { apikey: SB.anonKey, "Content-Type": "application/json" };
    if (String(corpo.acao).startsWith("equipe_")) { const t = await tokenSessao(); if (t) headers.Authorization = "Bearer " + t; }
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 30000);
    let r;
    try { r = await fetch(`${SB.url}/functions/v1/chat`, { method: "POST", headers, body: JSON.stringify(corpo), signal: ctl.signal, keepalive: !!(opcoes && opcoes.keepalive) }); }
    catch (e) { throw new Error("Sem conexão com o chat agora. Tente de novo em instantes."); }
    finally { clearTimeout(t); }
    let d = {}; try { d = await r.json(); } catch (e) { /* sem JSON */ }
    if (r.status === 404 && !d.erro) throw new Error("O chat ainda não foi publicado no servidor.");
    if (!r.ok) throw new Error(d.erro || "Não foi possível falar com o chat agora.");
    return d;
  }

  /* simulação (modo demonstração e testes): mesmas regras da função, guardadas neste navegador */
  const K_DEMO = "policoating_demo_chat", AUSENTE_MS = 120000;
  const lerDemo = () => { try { return JSON.parse(localStorage.getItem(K_DEMO)) || {}; } catch (e) { return {}; } };
  const gravarDemo = (v) => { try { localStorage.setItem(K_DEMO, JSON.stringify(v)); } catch (e) { /* */ } };
  const cotDemo = (p) => { try { return (JSON.parse(localStorage.getItem("policoating_demo_cotacoes")) || []).find((c) => c.protocolo === p); } catch (e) { return null; } };
  const iaAtiva = (e) => !e.agente_respondeu || !e.agente_visto || Date.now() - e.agente_visto >= AUSENTE_MS;
  const reais = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  function basica(t, c) {
    const q = String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(), f = c.frete || {};
    if (/obrigad|valeu/.test(q)) return "Por nada! Se precisar de mais alguma coisa, é só escrever aqui.";
    if (/prazo|chega|demora|dias|entrega/.test(q)) return f.prazo_dias ? `O prazo estimado de entrega é de ${f.prazo_dias} dias úteis após a expedição, saindo de Matão-SP. A equipe de frete e envio confirma esse ponto aqui no chat.` : `O prazo de entrega é confirmado pela equipe de frete e envio, conforme a rota até ${c.cidade}/${c.uf}.`;
    if (/frete|envio|transporte/.test(q)) return f.valor != null && f.zona !== "manual" ? `O frete estimado para ${c.cidade}/${c.uf} é de ${reais(f.valor)}, saindo de Matão-SP. O valor final é confirmado pela equipe.` : `O frete até ${c.cidade}/${c.uf} é calculado pela equipe de frete e envio e informado aqui no chat.`;
    return "Recebi sua mensagem e a equipe de frete e envio já foi avisada. Enquanto isso, posso informar o frete estimado, o prazo, os itens e a validade da sua cotação.";
  }
  function demo(corpo) {
    const todos = lerDemo(), equipe = String(corpo.acao).startsWith("equipe_");
    if (!ligado()) throw new Error("O chat ainda não está disponível.");
    if (corpo.acao === "equipe_lista") {
      return { conversas: Object.keys(todos).map((p) => { const x = todos[p], c = cotDemo(p) || {}, ult = x.msgs[x.msgs.length - 1];
        return { protocolo: p, nome: c.nome || "Cliente", cidade: c.cidade || "", uf: c.uf || "", nao_lidas: x.msgs.filter((m) => m.autor === "cliente" && m.id > (x.estado.equipe_lida_ate || 0)).length,
          ultima: ult ? { autor: ult.autor, texto: ult.texto.slice(0, 120), em: ult.criada_em } : null, ia_ativa: iaAtiva(x.estado), agente: !iaAtiva(x.estado) ? x.estado.agente_nome : null }; }) };
    }
    const p = String(corpo.protocolo || "").toUpperCase(), c = cotDemo(p);
    if (!c) throw new Error("Cotação não encontrada ou vencida.");
    if (!equipe && c.status !== "aprovada") throw new Error("O chat abre quando a cotação for aprovada.");
    const x = todos[p] || (todos[p] = { seq: 0, msgs: [], estado: { agente_nome: null, agente_respondeu: false, agente_visto: 0, equipe_lida_ate: 0 } });
    const add = (autor, texto, nome) => { x.msgs.push({ id: ++x.seq, autor, autor_nome: nome || null, texto, criada_em: new Date().toISOString() }); };
    const eu = window.Conta && window.Conta.usuario ? String(window.Conta.usuario.email || "Equipe").split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) : "Equipe";
    // equipe sumiu (2 min sem abrir): assistente volta
    if (x.estado.agente_respondeu && iaAtiva(x.estado) && x.estado.agente_nome) { add("sistema", `${x.estado.agente_nome} saiu da conversa. O assistente volta a responder.`); x.estado.agente_respondeu = false; x.estado.agente_nome = null; }
    if (corpo.acao === "abrir" && !x.msgs.length) add("ia", `Olá, ${String(c.nome || "").split(" ")[0]}! Sou o assistente virtual da Policoating. Sua cotação ${p} foi aprovada e eu já avisei a equipe de frete e envio. Enquanto ela não chega, posso informar o frete estimado, o prazo e os itens da cotação. Como posso ajudar?`, "Assistente virtual");
    if (corpo.acao === "enviar") { const t = String(corpo.texto || "").trim().slice(0, 1000); if (!t) throw new Error("Escreva a mensagem."); add("cliente", t, String(c.nome || "").split(" ")[0]); if (iaAtiva(x.estado)) add("ia", basica(t, c), "Assistente virtual"); }
    if (corpo.acao === "equipe_enviar") {
      const t = String(corpo.texto || "").trim().slice(0, 1000); if (!t) throw new Error("Escreva a mensagem.");
      if (!x.estado.agente_respondeu) add("sistema", `${eu}, da equipe de frete e envio, entrou na conversa.`);
      Object.assign(x.estado, { agente_nome: eu, agente_respondeu: true, agente_visto: Date.now() }); add("equipe", t, eu);
    }
    if (corpo.acao === "equipe_ler" && x.estado.agente_respondeu && x.estado.agente_nome === eu) x.estado.agente_visto = Date.now();
    if (corpo.acao === "equipe_sair" && x.estado.agente_respondeu && x.estado.agente_nome === eu) { add("sistema", `${eu} saiu da conversa. O assistente volta a responder.`); Object.assign(x.estado, { agente_nome: null, agente_respondeu: false }); }
    if (equipe && x.msgs.length) x.estado.equipe_lida_ate = x.msgs[x.msgs.length - 1].id;
    gravarDemo(todos);
    const depois = Number(corpo.depois) || 0;
    return { ok: true, mensagens: x.msgs.filter((m) => m.id > depois), estado: { protocolo: p, status: c.status, ia_ativa: iaAtiva(x.estado), agente: !iaAtiva(x.estado) ? x.estado.agente_nome : null, eu_no_chat: equipe && !iaAtiva(x.estado) && x.estado.agente_nome === eu } };
  }

  /* ---------- janela do chat ---------- */
  const hora = (iso) => { try { return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; } };
  const dia = (iso) => { try { const d = new Date(iso), h = new Date(); const ontem = new Date(h - 864e5);
    return d.toDateString() === h.toDateString() ? "Hoje" : d.toDateString() === ontem.toDateString() ? "Ontem" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" }); } catch (e) { return ""; } };
  const linkificar = (t) => esc(t).replace(/\n/g, "<br>");
  let aberto = null;

  function abrir(protocolo, modoEquipe, nomeCliente) {
    if (aberto) aberto.fechar();
    const equipe = !!modoEquipe;
    const anterior = document.activeElement;
    const tela = document.createElement("div");
    tela.className = "ch-tela" + (equipe ? " ch-modo-equipe" : "");
    tela.innerHTML = `<section class="ch-janela" role="dialog" aria-modal="true" aria-labelledby="ch-titulo">
      <header class="ch-topo">
        <button type="button" class="ch-voltar" aria-label="Fechar o chat">${I.voltar}</button>
        <span class="ch-avatar" aria-hidden="true">${equipe ? I.pessoa : I.caminhao}</span>
        <div class="ch-quem"><strong id="ch-titulo">${equipe ? esc(nomeCliente || "Cliente") : "Frete e envio · Policoating"}</strong><span class="ch-sub" aria-live="polite">${esc(protocolo)}</span></div>
        ${equipe ? `<button type="button" class="ch-sair" hidden>${I.sair}<span>Sair do chat</span></button>` : ""}
      </header>
      <div class="ch-msgs" role="log" aria-live="polite" aria-label="Mensagens"><div class="ch-carregando">Abrindo a conversa…</div></div>
      <p class="ch-erro" role="alert" hidden></p>
      <form class="ch-rodape" autocomplete="off">
        <textarea rows="1" maxlength="1000" placeholder="${equipe ? "Responder ao cliente…" : "Escreva sua mensagem…"}" aria-label="Mensagem"></textarea>
        <button type="submit" class="ch-enviar" aria-label="Enviar">${I.enviar}</button>
      </form>
      ${equipe ? `<p class="ch-nota">Ao responder, o assistente virtual pausa. Ao fechar o chat ou clicar em "Sair do chat", ele volta a atender.</p>` : `<p class="ch-nota">Assistente virtual (automático) até a equipe responder. Não envie senhas nem dados de cartão.</p>`}
    </section>`;
    document.body.appendChild(tela);
    document.body.classList.add("ch-aberta");
    const $ = (s) => tela.querySelector(s);
    const lista = $(".ch-msgs"), campo = $("textarea"), sub = $(".ch-sub"), erroEl = $(".ch-erro");
    let ultimo = 0, timer = 0, ocupado = false, euNoChat = false, fechado = false, ultimoDia = "";

    function mostrarErro(m) { erroEl.textContent = m || ""; erroEl.hidden = !m; }
    function estado(e) {
      if (!e) return;
      euNoChat = !!e.eu_no_chat;
      if (equipe) {
        sub.textContent = `${protocolo} · ${e.ia_ativa ? "assistente virtual atendendo" : e.eu_no_chat ? "você está atendendo" : (e.agente || "equipe") + " atendendo"}`;
        $(".ch-sair").hidden = !euNoChat;
      } else sub.innerHTML = e.ia_ativa ? `<i class="ch-ponto"></i>Assistente virtual · equipe avisada` : `<i class="ch-ponto ch-on"></i>${esc(e.agente || "Equipe")} (equipe) está na conversa`;
    }
    function bolha(m) {
      const meu = equipe ? m.autor === "equipe" : m.autor === "cliente";
      const d = dia(m.criada_em);
      let h = "";
      if (d !== ultimoDia) { ultimoDia = d; h += `<div class="ch-dia"><span>${esc(d)}</span></div>`; }
      if (m.autor === "sistema") return h + `<div class="ch-sistema"><span>${esc(m.texto)}</span></div>`;
      const rot = m.autor === "ia" ? `<span class="ch-rot ch-rot-ia">${I.robo}Assistente virtual</span>`
        : m.autor === "equipe" ? `<span class="ch-rot ch-rot-eq">${esc(m.autor_nome || "Equipe")} <em>equipe</em></span>`
        : equipe ? `<span class="ch-rot">${esc(m.autor_nome || "Cliente")}</span>` : "";
      return h + `<div class="ch-msg ${meu ? "ch-meu" : "ch-outro"} ch-a-${esc(m.autor)}" data-id="${m.id}">${meu ? "" : rot}<p>${linkificar(m.texto)}</p><time>${hora(m.criada_em)}${meu ? ' <b class="ch-ok" aria-label="enviada">✓✓</b>' : ""}</time></div>`;
    }
    function acrescentar(ms) {
      const novas = (ms || []).filter((m) => m.id > ultimo);
      if (!novas.length) return;
      const carreg = lista.querySelector(".ch-carregando"); if (carreg) carreg.remove();
      const digitando = lista.querySelector(".ch-digitando"); if (digitando) digitando.remove();
      const noFim = lista.scrollHeight - lista.scrollTop - lista.clientHeight < 80;
      lista.insertAdjacentHTML("beforeend", novas.map(bolha).join(""));
      ultimo = novas[novas.length - 1].id;
      if (noFim || novas.some((m) => (equipe ? m.autor === "equipe" : m.autor === "cliente"))) lista.scrollTop = lista.scrollHeight;
    }
    async function ler(acao) {
      if (ocupado || fechado) return;
      ocupado = true;
      try { const d = await chamar({ acao: acao || (equipe ? "equipe_ler" : "ler"), protocolo, depois: ultimo }); acrescentar(d.mensagens); estado(d.estado); mostrarErro(""); }
      catch (e) { mostrarErro(e.message); const c = lista.querySelector(".ch-carregando"); if (c) c.textContent = e.message; }
      finally { ocupado = false; }
    }
    function ciclo() { clearTimeout(timer); if (fechado) return; timer = setTimeout(async () => { await ler(); ciclo(); }, document.hidden ? 15000 : 3500); }
    async function enviar(e) {
      e.preventDefault();
      const texto = campo.value.trim(); if (!texto || ocupado) return;
      ocupado = true; $(".ch-enviar").disabled = true;
      // mostra na hora (como nos aplicativos) e, se o assistente vai responder, o "digitando…"
      const tmp = { id: ultimo + 0.5, autor: equipe ? "equipe" : "cliente", autor_nome: "", texto, criada_em: new Date().toISOString() };
      lista.insertAdjacentHTML("beforeend", bolha(tmp).replace('class="ch-msg', 'class="ch-msg ch-enviando'));
      if (!equipe && !/está na conversa/.test(sub.textContent)) lista.insertAdjacentHTML("beforeend", `<div class="ch-digitando" aria-label="Assistente digitando"><span></span><span></span><span></span></div>`);
      lista.scrollTop = lista.scrollHeight;
      campo.value = ""; ajustar();
      try {
        const d = await chamar({ acao: equipe ? "equipe_enviar" : "enviar", protocolo, texto, depois: ultimo });
        lista.querySelectorAll(".ch-enviando").forEach((x) => x.remove());
        acrescentar(d.mensagens); estado(d.estado); mostrarErro("");
      } catch (err) {
        lista.querySelectorAll(".ch-enviando, .ch-digitando").forEach((x) => x.remove());
        campo.value = texto; ajustar(); mostrarErro(err.message);
      } finally { ocupado = false; $(".ch-enviar").disabled = false; campo.focus(); }
    }
    function ajustar() { campo.style.height = "auto"; campo.style.height = Math.min(campo.scrollHeight, 140) + "px"; }
    function sair(keepalive) { if (equipe && euNoChat) { euNoChat = false; chamar({ acao: "equipe_sair", protocolo }, { keepalive }).catch(() => {}); } }
    function fechar() {
      if (fechado) return; fechado = true;
      clearTimeout(timer); sair(true);
      document.removeEventListener("keydown", tecla); window.removeEventListener("pagehide", aoSairPagina);
      tela.classList.remove("ch-visivel");
      setTimeout(() => { tela.remove(); if (!document.querySelector(".ch-tela")) document.body.classList.remove("ch-aberta"); if (anterior && anterior.focus) anterior.focus(); }, 220);
      aberto = null;
      document.dispatchEvent(new CustomEvent("chat-fechado"));
    }
    const tecla = (e) => { if (e.key === "Escape") fechar(); };
    const aoSairPagina = () => sair(true);
    campo.addEventListener("input", ajustar);
    campo.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); $(".ch-rodape").requestSubmit(); } });
    $(".ch-rodape").addEventListener("submit", enviar);
    $(".ch-voltar").addEventListener("click", fechar);
    tela.addEventListener("click", (e) => { if (e.target === tela) fechar(); });
    if (equipe) $(".ch-sair").addEventListener("click", async () => { sair(false); $(".ch-sair").hidden = true; setTimeout(() => ler(), 400); });
    document.addEventListener("keydown", tecla);
    window.addEventListener("pagehide", aoSairPagina);
    requestAnimationFrame(() => tela.classList.add("ch-visivel"));
    ler(equipe ? "equipe_ler" : "abrir").then(() => { lista.scrollTop = lista.scrollHeight; ciclo(); campo.focus(); });
    aberto = { fechar, protocolo };
    return aberto;
  }

  /* ---------- cliente: botão "Abrir chat" ---------- */
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-chat-abrir]"); if (!b) return;
    e.preventDefault(); abrir(b.dataset.chatAbrir, b.dataset.chatEquipe === "1", b.dataset.chatNome || "");
  });
  /** convite para o chat dentro do comprovante (cotação aprovada + recurso ligado) */
  function htmlConvite(c) {
    if (!c || c.status !== "aprovada" || !ligado()) return "";
    return `<div class="ch-convite"><span class="ch-convite-ic" aria-hidden="true">${I.chat}</span>
      <div><strong>Fale com a equipe de frete e envio</strong><span>Tire dúvidas sobre a entrega pelo chat: o assistente virtual responde na hora e a equipe entra na conversa em seguida.</span></div>
      <button type="button" class="btn btn-primario" data-chat-abrir="${esc(c.protocolo)}">${I.chat}Abrir chat</button></div>`;
  }

  /* ---------- equipe (painel): conversas e botão em cada cotação aprovada ---------- */
  let timerLista = 0;
  async function desenharLista() {
    const filtros = document.querySelector(".adm-cot-filtros");
    if (!filtros || !ligado()) return;
    let caixa = document.getElementById("ch-conversas");
    if (!caixa) { filtros.insertAdjacentHTML("beforebegin", `<section class="ch-conversas" id="ch-conversas" aria-labelledby="ch-conv-tit"><h3 id="ch-conv-tit">${I.chat}Conversas com clientes <span class="ch-badge" hidden></span></h3><div class="ch-conv-lista"><p class="dica">Carregando…</p></div></section>`); caixa = document.getElementById("ch-conversas"); }
    try {
      const d = await chamar({ acao: "equipe_lista" });
      const l = d.conversas || [], total = l.reduce((t, c) => t + (c.nao_lidas || 0), 0);
      const badge = caixa.querySelector(".ch-badge"); badge.hidden = !total; badge.textContent = total;
      const aba = document.querySelector('[data-aba="cotacoes"]');
      if (aba) { let b = aba.querySelector(".ch-badge"); if (!b) { aba.insertAdjacentHTML("beforeend", ' <span class="ch-badge" hidden></span>'); b = aba.querySelector(".ch-badge"); } b.hidden = !total; b.textContent = total; b.setAttribute("aria-label", `${total} mensagens não lidas`); }
      caixa.querySelector(".ch-conv-lista").innerHTML = l.length ? l.map((c) => `<button type="button" class="ch-conv${c.nao_lidas ? " ch-conv-nova" : ""}" data-chat-abrir="${esc(c.protocolo)}" data-chat-equipe="1" data-chat-nome="${esc(c.nome)}">
          <span class="ch-avatar" aria-hidden="true">${esc(String(c.nome || "?").charAt(0).toUpperCase())}</span>
          <span class="ch-conv-txt"><b>${esc(c.nome)}</b> <small>${esc(c.protocolo)} · ${esc(c.cidade)}/${esc(c.uf)}</small>
            <em>${c.ultima ? esc((c.ultima.autor === "cliente" ? "" : c.ultima.autor === "ia" ? "Assistente: " : c.ultima.autor === "equipe" ? "Equipe: " : "") + c.ultima.texto) : "Sem mensagens"}</em></span>
          <span class="ch-conv-lado"><small>${c.ultima ? hora(c.ultima.em) : ""}</small>${c.nao_lidas ? `<span class="ch-badge">${c.nao_lidas}</span>` : ""}<i class="ch-chip ${c.ia_ativa ? "" : "ch-chip-on"}">${c.ia_ativa ? "assistente" : esc(c.agente || "equipe")}</i></span>
        </button>`).join("") : `<p class="dica">Nenhuma conversa ainda. O chat aparece para o cliente quando a cotação fica "Aprovada".</p>`;
    } catch (e) { caixa.querySelector(".ch-conv-lista").innerHTML = `<p class="form-erro">${esc(e.message)}</p>`; }
  }
  function botoesNasCotacoes() {
    if (!ligado()) return;
    document.querySelectorAll(".adm-cot").forEach((card) => {
      if (card.querySelector(".ch-abrir-adm") || !card.querySelector(".cot-st-aprovada")) return;
      const p = (card.querySelector(".adm-cot-cod") || {}).textContent, nome = (card.querySelector(".adm-cot-quem b") || {}).textContent || "";
      const corpo = card.querySelector(".adm-cot-corpo"); if (!p || !corpo) return;
      corpo.insertAdjacentHTML("afterbegin", `<div class="ch-abrir-adm"><button type="button" class="btn btn-primario" data-chat-abrir="${esc(p.trim())}" data-chat-equipe="1" data-chat-nome="${esc(nome)}">${I.chat}Abrir chat com o cliente</button><small>Ao responder, o assistente virtual pausa; ao fechar, ele volta.</small></div>`);
    });
  }
  if (PAINEL) {
    let pend = 0;
    const tudo = () => { botoesNasCotacoes(); if (!document.getElementById("ch-conversas")) desenharLista(); };
    new MutationObserver(() => { if (!pend) pend = requestAnimationFrame(() => { pend = 0; tudo(); }); }).observe(document.body, { childList: true, subtree: true });
    document.addEventListener("recursos-atualizados", tudo);
    document.addEventListener("chat-fechado", desenharLista);
    timerLista = setInterval(() => { if (!document.hidden && document.getElementById("ch-conversas") && !aberto) desenharLista(); }, 20000);
  }
  window.ChatCotacao = { abrir, htmlConvite, atualizarLista: desenharLista };
})();
