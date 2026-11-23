/* =========================================================
   Bolinhas flutuantes das redes sociais (etapa E10)
   - Só aparecem com o recurso "floating_social_enabled" ligado em Comércio e Recursos.
   - Usam os links já cadastrados em Contato e links (nada de cadastro duplicado).
   - Ajustes (Contato e links): lado da tela, em quais aparelhos e quais redes/ordem.
   - Computador: coluna fixa no meio da lateral. Celular: um botão que abre as redes.
   - Teclado: Tab percorre, Esc fecha; respeita "reduzir movimento".
   - Cliques medidos no Google Analytics só com o recurso "social_click_metrics_enabled" e o aceite de cookies.
   ========================================================= */
(function () {
  "use strict";
  const CFG = window.SITE_CONFIG || {};
  if (/(^|\/)admin(\.html)?$/.test(location.pathname)) return;   // não aparece no painel da equipe

  const NOMES = { instagram: "Instagram", facebook: "Facebook", whatsappBusiness: "WhatsApp", linkedin: "LinkedIn", youtube: "YouTube", tiktok: "TikTok" };
  const SVG = {
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H8v3h2.5V21z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M4.98 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4M3.2 9h3.6v11.5H3.2zM9.2 9h3.4v1.6h.1c.5-.9 1.7-1.9 3.4-1.9 3.6 0 4.3 2.4 4.3 5.5v6.3h-3.6v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H9.2z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8M10 15V9l5.2 3z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M16.5 3c.3 2.2 1.6 3.6 3.8 3.8v3.1c-1.4.1-2.6-.3-3.8-1v6.4c0 3.6-3 6.1-6.4 5.6-2.3-.3-4.2-2.2-4.5-4.5-.5-3.6 2.4-6.6 6-6.2v3.2c-1.5-.4-3 .7-2.9 2.3.1 1.2 1.1 2.1 2.3 2.1 1.3 0 2.3-1.1 2.3-2.4V3z"/></svg>',
    compartilhar: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>',
    fechar: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>'
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function redesVisiveis() {
    const links = CFG.redes || {}, f = CFG.flutuante || {};
    const ordem = Array.isArray(f.redes) && f.redes.length ? f.redes : Object.keys(NOMES);
    return ordem.filter((k) => NOMES[k] && /^https:\/\//.test(links[k] || ""));
  }
  const iconeRede = (k) => k === "whatsappBusiness" && window.ColorWeg ? window.ColorWeg.iconeWhats() : SVG[k];

  let raiz = null;
  function fechar(focar) {
    if (!raiz || !raiz.classList.contains("aberta")) return;
    raiz.classList.remove("aberta");
    const b = raiz.querySelector(".rf-alternar"); b.setAttribute("aria-expanded", "false"); b.setAttribute("aria-label", "Abrir redes sociais");
    b.innerHTML = SVG.compartilhar;
    if (focar) b.focus();
  }
  function desenhar() {
    const R = window.Recursos;
    const ligado = !!(R && R.ligado("floating_social_enabled"));
    const lista = ligado ? redesVisiveis() : [];
    const f = CFG.flutuante || {};
    if (!lista.length) { if (raiz) { raiz.remove(); raiz = null; } return; }
    const html = `<button type="button" class="rf-alternar" aria-expanded="false" aria-controls="rf-lista" aria-label="Abrir redes sociais">${SVG.compartilhar}</button>
      <ul class="rf-lista" id="rf-lista">${lista.map((k) => `<li><a class="rf-rede rf-${k}" href="${esc(CFG.redes[k])}" target="_blank" rel="noopener" data-rede-flutuante="${k}" aria-label="${NOMES[k]} da Policoating (abre em nova aba)"><span class="rf-icone">${iconeRede(k)}</span><span class="rf-dica" aria-hidden="true">${NOMES[k]}</span></a></li>`).join("")}</ul>`;
    if (!raiz) {
      raiz = document.createElement("nav");
      raiz.className = "redes-flutuantes";
      raiz.setAttribute("aria-label", "Redes sociais da Policoating");
      document.body.appendChild(raiz);
      raiz.addEventListener("click", (e) => {
        if (e.target.closest(".rf-alternar")) {
          const abrir = !raiz.classList.contains("aberta");
          if (!abrir) return fechar(true);
          raiz.classList.add("aberta");
          const balao = document.querySelector(".assist-convite"); if (balao) balao.remove();   // não deixa o convite do Assistente por cima
          const b = raiz.querySelector(".rf-alternar"); b.setAttribute("aria-expanded", "true"); b.setAttribute("aria-label", "Fechar redes sociais"); b.innerHTML = SVG.fechar;
          const pri = raiz.querySelector(".rf-rede");
          if (pri) setTimeout(() => pri.focus(), 60);   // a lista aparece com animação: foca depois de visível
          return;
        }
        const a = e.target.closest("[data-rede-flutuante]");
        if (a && R && R.ligado("social_click_metrics_enabled") && typeof window.gtag === "function")
          window.gtag("event", "clique_rede", { rede: a.dataset.redeFlutuante, local: "bolinhas_flutuantes" });
      });
      raiz.addEventListener("keydown", (e) => { if (e.key === "Escape") fechar(true); });
      // clique fora fecha (composedPath: o ícone do botão é trocado no meio do clique)
      document.addEventListener("click", (e) => { if (raiz && !e.composedPath().includes(raiz)) fechar(false); });
    }
    raiz.className = `redes-flutuantes rf-${f.posicao === "esquerda" ? "esquerda" : "direita"} rf-em-${["computador", "celular"].includes(f.dispositivos) ? f.dispositivos : "todos"}`;
    raiz.innerHTML = html;
  }

  const iniciar = () => { desenhar(); ["recursos-atualizados", "config-atualizada"].forEach((ev) => document.addEventListener(ev, desenhar)); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
  window.RedesFlutuantes = { desenhar };
})();
