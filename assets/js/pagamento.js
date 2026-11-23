/* =========================================================
   Compra direta com Pix ou cartão (Mercado Pago) — etapa E09
   - Botão "Pagar com Pix ou cartão" no carrinho, só com o recurso "Compra direta" (e o frete) valendo
     para TODOS os itens e sem item "a consultar".
   - Registra o pedido (banco confere preços) → função "pagamento" soma o frete e cria a cobrança →
     resumo na tela → o cliente paga no ambiente do Mercado Pago (o site nunca vê dados de cartão).
   - Na volta (conta?pagamento=ok|pendente|falhou) mostra a situação; o "pago" só vale com o aviso do Mercado Pago.
   ========================================================= */
(function () {
  "use strict";
  const CFG = window.SITE_CONFIG || {};
  const SB = CFG.supabase || {};
  const ONLINE = !!(SB.url && SB.anonKey);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reais = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const ic = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const CADEADO = ic('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>');
  const CARTAO = ic('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h4"/>');

  /** o carrinho pode ser pago online? (lista de { item, prod }) */
  function disponivel(lista) {
    const R = window.Recursos;
    if (!R || !lista.length) return false;
    return lista.every(({ prod }) => prod && R.disponivel("direct_checkout_enabled", prod) && R.disponivel("freight_estimate_enabled", prod));
  }
  async function tokenSessao() {
    try { const sb = await window.Conta.cliente(); const { data } = await sb.auth.getSession(); return (data && data.session && data.session.access_token) || ""; } catch (e) { return ""; }
  }
  async function chamar(corpo) {
    if (!ONLINE) throw new Error("O pagamento online precisa do servidor configurado. Envie o pedido pelo WhatsApp.");
    const t = await tokenSessao();
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 45000);
    let r;
    try { r = await fetch(`${SB.url}/functions/v1/pagamento`, { method: "POST", headers: { apikey: SB.anonKey, "Content-Type": "application/json", ...(t ? { Authorization: "Bearer " + t } : {}) }, body: JSON.stringify(corpo), signal: ctl.signal }); }
    catch (e) { throw new Error(e.name === "AbortError" ? "O pagamento demorou para responder. Tente de novo." : "Sem conexão agora. Verifique a internet."); }
    finally { clearTimeout(timer); }
    let d = {}; try { d = await r.json(); } catch (e) { /* */ }
    if (r.status === 404 && !d.erro) throw new Error("O pagamento online ainda não foi publicado no servidor.");
    if (!r.ok) throw new Error(d.erro || "Não foi possível iniciar o pagamento.");
    return d;
  }

  /* ---------- janela: registrando → resumo → ir para o Mercado Pago ---------- */
  function janela() {
    const t = document.createElement("div");
    t.className = "pg-tela";
    t.innerHTML = `<div class="pg-caixa" role="dialog" aria-modal="true" aria-labelledby="pg-titulo">
      <button type="button" class="pg-fechar" aria-label="Fechar">✕</button>
      <div class="pg-topo"><span class="pg-ic">${CARTAO}</span><div><h2 id="pg-titulo">Pagar com Pix ou cartão</h2><p>Pagamento seguro pelo Mercado Pago</p></div></div>
      <div class="pg-corpo" aria-live="polite"><p class="pg-carregando"><span class="pg-giro" aria-hidden="true"></span>Registrando o pedido e calculando o frete…</p></div>
    </div>`;
    document.body.appendChild(t);
    const fechar = () => { t.classList.remove("pg-visivel"); setTimeout(() => t.remove(), 200); document.removeEventListener("keydown", tecla); };
    const tecla = (e) => { if (e.key === "Escape") fechar(); };
    t.querySelector(".pg-fechar").addEventListener("click", fechar);
    t.addEventListener("click", (e) => { if (e.target === t) fechar(); });
    document.addEventListener("keydown", tecla);
    requestAnimationFrame(() => t.classList.add("pg-visivel"));
    return { t, corpo: t.querySelector(".pg-corpo"), fechar };
  }
  /** fluxo completo; aoRedirecionar() é chamado logo antes de ir ao Mercado Pago (para esvaziar o carrinho) */
  async function iniciar({ itens, obs, aoRedirecionar, aoErroWhats }) {
    const j = janela();
    let numero = "";
    try {
      numero = await window.Loja.criarPedido(itens, obs || "");
      const d = await chamar({ acao: "criar", numero });
      j.corpo.innerHTML = `<p class="pg-num">Pedido <b>${esc(d.numero)}</b> registrado.</p>
        <dl class="pg-resumo">
          <div><dt>Produtos</dt><dd>${reais(d.produtos)}</dd></div>
          <div><dt>Frete até ${esc(d.destino)}${d.prazo_dias ? ` <small>(cerca de ${d.prazo_dias} ${d.prazo_dias === 1 ? "dia útil" : "dias úteis"})</small>` : ""}</dt><dd>${reais(d.frete)}</dd></div>
          <div class="pg-total"><dt>Total</dt><dd>${reais(d.total)}</dd></div>
        </dl>
        <a class="btn btn-primario btn-bloco pg-ir" href="${esc(d.link)}">${CADEADO}Pagar ${reais(d.total)} no Mercado Pago</a>
        <ul class="pg-notas"><li>Pix (aprovação na hora) ou cartão em até 12×, no ambiente seguro do Mercado Pago.</li>
          <li>A Policoating não vê nem guarda dados do seu cartão.</li>
          <li>O pedido é confirmado assim que o Mercado Pago aprovar o pagamento. A nota fiscal é enviada pela equipe.</li></ul>`;
      j.corpo.querySelector(".pg-ir").addEventListener("click", () => { if (aoRedirecionar) aoRedirecionar(numero); });
      j.corpo.querySelector(".pg-ir").focus();
    } catch (e) {
      j.corpo.innerHTML = `<p class="pg-erro">${esc(e.message)}</p>${numero ? `<p class="pg-num">O pedido <b>${esc(numero)}</b> já está registrado: você pode enviá-lo pelo WhatsApp e combinar o pagamento com o vendedor.</p>` : ""}
        <div class="pg-acoes">${aoErroWhats ? `<button type="button" class="btn btn-whats" data-pg-whats>Enviar pelo WhatsApp</button>` : ""}<button type="button" class="btn btn-contorno-azul" data-pg-fechar>Voltar ao carrinho</button></div>`;
      const w = j.corpo.querySelector("[data-pg-whats]"); if (w) w.addEventListener("click", () => { j.fechar(); aoErroWhats(numero); });
      j.corpo.querySelector("[data-pg-fechar]").addEventListener("click", j.fechar);
    }
  }

  /* ---------- situação do pagamento (conta e painel) ---------- */
  const NOMES = { pendente: ["Aguardando pagamento", "pg-st-pend"], aprovado: ["Pago", "pg-st-ok"], recusado: ["Pagamento recusado", "pg-st-nao"], estornado: ["Pagamento estornado", "pg-st-nao"], expirado: ["Pagamento não concluído", "pg-st-nao"] };
  function chip(p) {
    const n = p && NOMES[p.pagamento_status];
    return n ? `<span class="pg-chip ${n[1]}">${esc(n[0])}${p.pagamento_status === "aprovado" && p.pagamento_metodo ? ` · ${esc(p.pagamento_metodo)}` : ""}${p.pagamento_valor ? ` · ${reais(p.pagamento_valor)}` : ""}</span>` : "";
  }
  // volta do Mercado Pago para a conta
  (function aviso() {
    const q = new URLSearchParams(location.search), s = q.get("pagamento"), num = q.get("pedido") || "";
    if (!s || !/^(ok|pendente|falhou)$/.test(s)) return;
    const txt = { ok: ["Pagamento recebido!", "Assim que o Mercado Pago confirmar (no Pix é na hora), o pedido aparece como Pago aqui na sua conta.", "pg-av-ok"],
      pendente: ["Pagamento em análise", "O Mercado Pago ainda está processando. Você recebe a confirmação e o pedido é atualizado aqui sozinho.", "pg-av-pend"],
      falhou: ["O pagamento não foi concluído", "Nada foi cobrado. Você pode tentar de novo pelo carrinho ou enviar o pedido pelo WhatsApp.", "pg-av-nao"] }[s];
    const mostrar = () => {
      const b = document.createElement("div");
      b.className = "pg-aviso " + txt[2]; b.setAttribute("role", "status");
      b.innerHTML = `<strong>${esc(txt[0])}</strong><span>${num ? `Pedido ${esc(num)}. ` : ""}${esc(txt[1])}</span><button type="button" aria-label="Fechar aviso">✕</button>`;
      document.body.appendChild(b);
      b.querySelector("button").addEventListener("click", () => b.remove());
      try { history.replaceState(null, "", location.pathname + location.hash); } catch (e) { /* */ }
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mostrar); else mostrar();
  })();

  window.Pagamento = { disponivel, iniciar, chip };
})();
