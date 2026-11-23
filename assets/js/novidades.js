/* =========================================================
   Novidades da página inicial (etapa E12) — recurso "Novos banners da página inicial"
   - Cada cartão só aparece se o recurso que ele anuncia estiver LIGADO (nunca promete o que não existe).
   - "Pix e cartão" só com a compra direta (E09) ligada.
   ========================================================= */
(function () {
  "use strict";
  const caixa = document.getElementById("novidades");
  if (!caixa) return;
  const ic = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const CARTOES = [
    { chave: "b2b_quote_enabled", titulo: "Cotação online com número", texto: "Monte a lista, informe o CEP e receba o número da cotação para acompanhar a resposta.", link: "cotacao", acao: "Fazer cotação",
      icone: ic('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>') },
    { chave: "freight_estimate_enabled", titulo: "Frete na hora pelo CEP", texto: "Veja o frete estimado saindo de Matão-SP direto na página do produto.", link: "produtos", acao: "Ver produtos",
      icone: ic('<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>') },
    { chave: "direct_checkout_enabled", titulo: "Compra com Pix e cartão", texto: "Pague no site e acompanhe o pedido. O atendimento pelo WhatsApp continua.", link: "produtos", acao: "Comprar agora",
      icone: ic('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h4"/>') },
    { chave: "product_docs_enabled", titulo: "Ficha técnica e FDS", texto: "Baixe os documentos técnicos na página de cada produto.", link: "produtos", acao: "Ver produtos",
      icone: ic('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 17v-6M9.5 14.5 12 17l2.5-2.5"/>') },
    { chave: "pwa_install_invite_enabled", titulo: "Policoating no celular", texto: "Instale o app pelo navegador e acesse o catálogo com um toque.", link: "#", acao: "Como instalar", app: true,
      icone: ic('<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>') }
  ];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function desenhar() {
    const R = window.Recursos;
    const ativos = R && R.ligado("new_home_banners_enabled") ? CARTOES.filter((c) => R.ligado(c.chave)) : [];
    caixa.hidden = !ativos.length;
    if (!ativos.length) { caixa.querySelector(".novidades-grade").innerHTML = ""; return; }
    caixa.querySelector(".novidades-grade").innerHTML = ativos.map((c) => `<article class="novidade revelar visivel">
        <span class="novidade-ic">${c.icone}</span>
        <h3>${esc(c.titulo)}</h3><p>${esc(c.texto)}</p>
        <a class="novidade-link" href="${esc(c.link)}"${c.app ? " data-instalar-app" : ""}>${esc(c.acao)} <span aria-hidden="true">→</span></a>
      </article>`).join("");
    const app = caixa.querySelector("[data-instalar-app]");
    if (app) app.addEventListener("click", (e) => { e.preventDefault(); if (window.AppPolicoating) window.AppPolicoating.mostrarConvite(); else alert("No Chrome: menu ⋮ → Instalar app. No iPhone (Safari): Compartilhar → Adicionar à Tela de Início."); });
  }
  document.addEventListener("recursos-atualizados", desenhar);
  if (window.Recursos) Promise.resolve(window.Recursos.pronto).then(desenhar, desenhar); else desenhar();
})();
