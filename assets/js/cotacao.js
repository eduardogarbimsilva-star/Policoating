/* =========================================================
   Cotação com código (etapas E06, E07 e E08)
   - Só aparece com o recurso "Cotação no site" (b2b_quote_enabled) ligado no painel.
   - O cliente monta a lista (produto, embalagem, cor, quantidade), informa os dados e o endereço
     e recebe um código COT-XXXX-XXXX-XX válido por 7 dias. A gravação é feita no servidor
     (função "frete", ação "cotar"), que confere os dados e calcula o frete.
   - Consulta pelo código (qualquer aparelho), histórico do cliente (conta + este aparelho)
     e, no painel, a lista da equipe com resposta, proposta e valor.
   - Sem Supabase (modo demonstração): tudo fica neste navegador.
   ========================================================= */
(function () {
  "use strict";
  const CFG = window.SITE_CONFIG || {};
  const SB = CFG.supabase || {};
  const ONLINE = !!(SB.url && SB.anonKey);
  const K_LISTA = "policoating_cotacao_itens", K_MINHAS = "policoating_cotacoes", K_DEMO = "policoating_demo_cotacoes";
  const HORAS = 168;
  const ler = (k, p) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? p : v; } catch (e) { return p; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem espaço/modo privado */ } };
  const so = (v) => String(v || "").replace(/\D/g, "");
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reais = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const dataHora = (iso) => (iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");
  const normalizarCodigo = (v) => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^COT/, "").slice(0, 10)
    .replace(/^(.{4})(.{0,4})(.{0,2}).*$/, (m, a, b, c) => ["COT", a, b, c].filter(Boolean).join("-"));
  const codigoValido = (v) => /^COT-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{2}$/.test(v);

  const STATUS = {
    recebida: { nome: "Recebida", dica: "A equipe ainda vai analisar." },
    em_analise: { nome: "Em análise", dica: "Um vendedor está preparando a proposta." },
    aguardando_dados: { nome: "Aguardando seus dados", dica: "O vendedor precisa de mais alguma informação. Fale com ele pelo WhatsApp." },
    proposta_enviada: { nome: "Proposta enviada", dica: "Confira a proposta abaixo." },
    aprovada: { nome: "Aprovada", dica: "Proposta aceita. O vendedor segue com o pedido." },
    recusada: { nome: "Encerrada", dica: "Esta cotação foi encerrada." }
  };

  /* ---------- lista de itens da cotação (neste navegador) ---------- */
  const chave = (i) => [i.id, i.embalagem || "", i.cor || ""].join("|");
  const lista = {
    ler: () => ler(K_LISTA, []).filter((i) => i && i.id && i.qtd > 0),
    gravar: (itens) => { gravar(K_LISTA, itens.slice(0, 30)); document.dispatchEvent(new CustomEvent("cotacao-lista")); },
    adicionar(item) {
      const itens = lista.ler(), q = Math.max(1, Math.min(100000, Math.round(Number(item.qtd) || 1)));
      const ex = itens.find((i) => chave(i) === chave(item));
      if (ex) ex.qtd = Math.min(100000, ex.qtd + q); else itens.push({ id: item.id, embalagem: item.embalagem || "", cor: item.cor || "", qtd: q });
      lista.gravar(itens);
      return itens;
    },
    limpar: () => lista.gravar([])
  };

  /* ---------- códigos guardados neste aparelho ---------- */
  function lembrar(c) {
    const agora = Date.now();
    const v = ler(K_MINHAS, []).filter((x) => x && x.protocolo !== c.protocolo && new Date(x.expira_em).getTime() > agora);
    v.unshift({ protocolo: c.protocolo, emitida_em: c.emitida_em, expira_em: c.expira_em });
    gravar(K_MINHAS, v.slice(0, 50));
  }
  const lembradas = () => ler(K_MINHAS, []).filter((x) => x && codigoValido(x.protocolo) && new Date(x.expira_em).getTime() > Date.now());
  function esquecer(protocolo) { gravar(K_MINHAS, ler(K_MINHAS, []).filter((x) => x.protocolo !== protocolo)); }

  /* ---------- servidor ---------- */
  async function token() {
    try { const sb = await window.Conta.cliente(); const { data } = await sb.auth.getSession(); return (data && data.session && data.session.access_token) || ""; } catch (e) { return ""; }
  }
  async function chamarFuncao(corpo) {
    const headers = { apikey: SB.anonKey, "Content-Type": "application/json" };
    const t = await token(); if (t) headers.Authorization = "Bearer " + t;
    let r;
    try { r = await fetch(`${SB.url}/functions/v1/frete`, { method: "POST", headers, body: JSON.stringify(corpo) }); }
    catch (e) { throw new Error("Não foi possível enviar agora. Verifique a internet ou fale com o vendedor pelo WhatsApp."); }
    let d = {}; try { d = await r.json(); } catch (e) { /* sem JSON */ }
    if (r.status === 404 && !d.erro) throw new Error("A função de cotação ainda não foi publicada no Supabase.");
    if (!r.ok) throw new Error(d.erro || "Não foi possível registrar a cotação agora.");
    return d;
  }
  const traduzir = (e) => new Error(/cotacoes|consultar_cotacao|atualizar_cotacao|schema cache|does not exist/i.test((e && e.message) || "")
    ? "O banco ainda não tem a parte de cotações. Rode a PARTE U do supabase/setup.sql." : (e && e.message) || "Erro ao falar com o servidor.");

  /* ---------- demonstração (sem servidor) ---------- */
  const ALFA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  function protocoloDemo() {
    const b = new Uint8Array(10); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(b) : b.forEach((x, i) => (b[i] = Math.random() * 256));
    const s = Array.from(b, (x) => ALFA[x % 32]).join("");
    return `COT-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
  }
  const demoTodas = () => ler(K_DEMO, []).filter((c) => new Date(c.expira_em).getTime() > Date.now());
  function pesoKg(itens) {
    return Math.round(itens.reduce((t, i) => { const m = /(\d+(?:[.,]\d+)?)\s*kg/i.exec(i.embalagem || ""); return t + (m ? i.qtd * Number(m[1].replace(",", ".")) : i.qtd); }, 0) * 100) / 100;
  }

  /* ---------- API ---------- */
  async function enviar(dados) {
    if (ONLINE) {
      const r = await chamarFuncao(Object.assign({ acao: "cotar" }, dados));
      lembrar(r);
      return r;
    }
    const emitida = new Date(), expira = new Date(emitida.getTime() + HORAS * 3600 * 1000);
    const itens = dados.itens.map((i) => { const p = (window.PRODUTOS || []).find((x) => x.id === i.id) || {}; return Object.assign({}, i, { nome: p.nome || i.id, codigo: p.codigo || i.id.toUpperCase() }); });
    const peso = Number(String(dados.peso_kg || "").replace(",", ".")) > 0 ? Number(String(dados.peso_kg).replace(",", ".")) : pesoKg(itens);
    const u = window.Conta && window.Conta.usuario;
    const c = Object.assign({}, dados, { id: "demo-" + Date.now(), protocolo: protocoloDemo(), cliente_id: u ? u.id || u.email : null, status: "recebida", itens, peso_kg: peso,
      frete: { zona: "manual", motivo: "demonstracao" }, documento: so(dados.documento), telefone: so(dados.telefone), cep: so(dados.cep),
      cidade: dados.cidade || "", uf: dados.uf || "", emitida_em: emitida.toISOString(), expira_em: expira.toISOString(), eventos: [] });
    delete c.acao;
    const todas = demoTodas(); todas.unshift(c); gravar(K_DEMO, todas.slice(0, 200));
    lembrar(c);
    return c;
  }
  async function consultar(protocolo) {
    protocolo = normalizarCodigo(protocolo);
    if (!codigoValido(protocolo)) throw new Error("Código incompleto. Ele tem o formato COT-XXXX-XXXX-XX.");
    if (!ONLINE) return demoTodas().find((c) => c.protocolo === protocolo) || null;
    const r = await fetch(`${SB.url}/rest/v1/rpc/consultar_cotacao`, { method: "POST", headers: { apikey: SB.anonKey, "Content-Type": "application/json" }, body: JSON.stringify({ p_protocolo: protocolo }) })
      .catch(() => { throw new Error("Sem conexão com o servidor."); });
    if (!r.ok) { let d = {}; try { d = await r.json(); } catch (e) { /* */ } throw traduzir({ message: d.message || "consultar_cotacao " + r.status }); }
    return (await r.json())[0] || null;
  }
  /** Histórico do cliente: as da conta (se logado) + as que foram feitas neste aparelho */
  async function minhas() {
    const porCodigo = new Map();
    const u = window.Conta && window.Conta.usuario;
    if (ONLINE && u) {
      try {
        const sb = await window.Conta.cliente();
        const { data, error } = await sb.from("cotacoes").select("protocolo,status,emitida_em,expira_em,cidade,uf,itens,peso_kg,frete,resposta,valor_proposta,descricao")
          .eq("cliente_id", u.id).order("emitida_em", { ascending: false }).limit(50);
        if (error) throw error;
        (data || []).forEach((c) => porCodigo.set(c.protocolo, Object.assign(c, { daConta: true })));
      } catch (e) { if (!/JWT|session/i.test(e.message || "")) throw traduzir(e); }
    }
    if (!ONLINE && u) demoTodas().filter((c) => c.cliente_id === (u.id || u.email)).forEach((c) => porCodigo.set(c.protocolo, Object.assign({}, c, { daConta: true })));
    const locais = lembradas().filter((x) => !porCodigo.has(x.protocolo)).slice(0, 20);
    const achadas = await Promise.all(locais.map((x) => consultar(x.protocolo).catch(() => undefined)));
    achadas.forEach((c, i) => { if (c) porCodigo.set(c.protocolo, Object.assign(c, { doAparelho: true })); else if (c === null) esquecer(locais[i].protocolo); });
    return [...porCodigo.values()].sort((a, b) => String(b.emitida_em).localeCompare(String(a.emitida_em)));
  }

  /* ---------- equipe (painel) ---------- */
  const equipe = {
    async listar() {
      if (!ONLINE) return demoTodas();
      const sb = await window.Conta.cliente();
      const { data, error } = await sb.from("cotacoes").select("*").order("emitida_em", { ascending: false }).limit(500);
      if (error) throw traduzir(error);
      return data || [];
    },
    async eventos(id) {
      if (!ONLINE) return ((demoTodas().find((c) => c.id === id) || {}).eventos || []);
      const sb = await window.Conta.cliente();
      const { data, error } = await sb.from("cotacoes_eventos").select("em,ator_email,de,para,nota").eq("cotacao_id", id).order("em", { ascending: false });
      if (error) throw traduzir(error);
      return data || [];
    },
    async atualizar(id, status, resposta, valor) {
      if (!STATUS[status]) throw new Error("Escolha um status.");
      if (!ONLINE) {
        const todas = demoTodas(), c = todas.find((x) => x.id === id);
        if (!c) throw new Error("Cotação não encontrada ou vencida.");
        const u = (window.Conta && window.Conta.usuario && window.Conta.usuario.email) || "demo";
        c.eventos = [{ em: new Date().toISOString(), ator_email: u, de: c.status, para: status, nota: resposta || null }].concat(c.eventos || []);
        Object.assign(c, { status, resposta: resposta || c.resposta || null, valor_proposta: valor == null ? c.valor_proposta : valor, atualizado_em: new Date().toISOString(), atualizado_por: u });
        gravar(K_DEMO, todas); return c;
      }
      const sb = await window.Conta.cliente();
      const { data, error } = await sb.rpc("atualizar_cotacao", { p_id: id, p_status: status, p_resposta: resposta || null, p_valor: valor == null ? null : valor });
      if (error) throw traduzir(error);
      return data;
    }
  };

  /* ---------- desenho do cartão (cliente) ---------- */
  function restante(iso) {
    const h = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 3600000));
    return h >= 48 ? `${Math.floor(h / 24)} dias` : h >= 1 ? `${h} h` : "menos de 1 h";
  }
  function htmlFrete(f) {
    if (!f) return "";
    if (f.zona === "manual" || f.valor == null) return `<span class="cot-frete-manual">Frete: o vendedor informa na proposta</span>`;
    return `<span class="cot-frete">Frete estimado <strong>${reais(f.valor)}</strong>${f.km ? ` · ${Number(f.km).toLocaleString("pt-BR")} km` : ""}</span>`;
  }
  const ETAPAS = ["recebida", "em_analise", "proposta_enviada", "aprovada"];
  function htmlLinhaTempo(status) {
    if (status === "recusada") return `<p class="cot-encerrada">${esc(STATUS.recusada.dica)}</p>`;
    const at = status === "aguardando_dados" ? 1 : ETAPAS.indexOf(status);
    return `<ol class="cot-tempo">${ETAPAS.map((e, i) => `<li class="${i < at ? "feito" : i === at ? "atual" : ""}">${esc(STATUS[e].nome)}</li>`).join("")}</ol>`;
  }
  function htmlCartao(c, opcoes) {
    opcoes = opcoes || {};
    const st = STATUS[c.status] || STATUS.recebida;
    const itens = (c.itens || []).map((i) => `<li><span>${esc(i.nome || i.id)}${i.cor ? ` · ${esc(i.cor)}` : ""}</span><b>${esc(i.qtd)} × ${esc(i.embalagem || "kg")}</b></li>`).join("");
    return `<article class="cot-cartao" data-protocolo="${esc(c.protocolo)}">
      <header class="cot-cartao-topo">
        <div><span class="cot-rotulo">Código</span><strong class="cot-codigo">${esc(c.protocolo)}</strong>
          <button type="button" class="cot-copiar" data-copiar="${esc(c.protocolo)}" aria-label="Copiar código ${esc(c.protocolo)}">Copiar</button></div>
        <span class="cot-status cot-st-${esc(c.status)}">${esc(st.nome)}</span>
      </header>
      ${htmlLinhaTempo(c.status)}
      <p class="cot-meta">Emitida em ${dataHora(c.emitida_em)} · ${c.cidade ? `${esc(c.cidade)}/${esc(c.uf)} · ` : ""}válida por mais ${restante(c.expira_em)} (até ${dataHora(c.expira_em)})</p>
      ${c.valor_proposta != null || c.resposta ? `<div class="cot-proposta"><span class="cot-rotulo">Resposta da equipe</span>${c.valor_proposta != null ? `<strong>${reais(c.valor_proposta)}</strong>` : ""}${c.resposta ? `<p>${esc(c.resposta)}</p>` : ""}</div>` : `<p class="cot-dica">${esc(st.dica)}</p>`}
      <details class="cot-detalhes"${opcoes.aberto ? " open" : ""}><summary>Itens e detalhes</summary>
        <ul class="cot-itens">${itens}</ul>
        <p class="cot-linha">${c.peso_kg ? `Peso total: <b>${Number(c.peso_kg).toLocaleString("pt-BR")} kg</b> · ` : ""}${htmlFrete(c.frete)}</p>
        ${c.descricao ? `<p class="cot-desc">${esc(c.descricao)}</p>` : ""}
      </details>
      <div class="cot-acoes">${opcoes.whats !== false ? `<a class="btn btn-whats" target="_blank" rel="noopener" href="${esc(linkWhats(c))}">Falar sobre esta cotação</a>` : ""}</div>
    </article>`;
  }
  function linkWhats(c) {
    const msg = `Olá! Fiz a cotação *${c.protocolo}* pelo site${c.cidade ? ` (entrega em ${c.cidade}/${c.uf})` : ""}. Pode me ajudar?`;
    return window.ColorWeg ? window.ColorWeg.linkWhatsApp(msg) : "#";
  }
  /** botões "Copiar" dentro de um contêiner */
  function ligarCopiar(box) {
    box.querySelectorAll("[data-copiar]").forEach((b) => b.addEventListener("click", () => {
      const v = b.dataset.copiar;
      (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(
        () => { b.textContent = "Copiado!"; setTimeout(() => (b.textContent = "Copiar"), 1800); },
        () => prompt("Copie o código:", v));
    }));
  }

  /* ---------- link "Cotação" no menu (só com o recurso ligado) ---------- */
  function menu() {
    const R = window.Recursos, on = !!(R && R.ligado("b2b_quote_enabled"));
    document.querySelectorAll(".menu").forEach((ul) => {
      let li = ul.querySelector("[data-menu-cotacao]");
      if (on && !li) {
        li = document.createElement("li"); li.setAttribute("data-menu-cotacao", "");
        li.innerHTML = `<a href="cotacao">Cotação</a>`;
        const ref = ul.querySelector(':scope > li > a[href="sobre"]');
        ul.insertBefore(li, ref ? ref.parentElement : null);
        if (/\/cotacao(\.html)?$/.test(location.pathname)) li.querySelector("a").setAttribute("aria-current", "page");
      } else if (!on && li) li.remove();
    });
  }
  document.addEventListener("recursos-atualizados", menu);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", menu); else menu();

  window.Cotacao = { lista, enviar, consultar, minhas, lembradas, equipe, STATUS, htmlCartao, htmlFrete, ligarCopiar, linkWhats, normalizarCodigo, codigoValido, pesoKg, dataHora, reais, online: ONLINE, HORAS };
})();
