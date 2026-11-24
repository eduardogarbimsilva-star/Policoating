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
    { chave: "b2b_quote_enabled", titulo: "Peça um orçamento pelo site", foto: "potes-cores", selo: "Orçamento", texto: "Receba na hora um número de cotação e acompanhe a resposta do vendedor, com preço e frete, sem precisar ligar.",
      passos: ["Escolha os produtos ou informe só o peso", "Digite o CEP de entrega e seus dados", "Guarde o número: vale por 7 dias"], link: "cotacao", acao: "Fazer orçamento",
      icone: ic('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>') },
    { chave: "freight_estimate_enabled", titulo: "Simule o frete antes de pedir", foto: "frota-640", selo: "Frete", texto: "Na página de cada produto, digite o seu CEP e veja quanto custa e quantos dias leva a entrega saindo de Matão-SP.",
      passos: ["Abra um produto do catálogo", "Digite o CEP no campo \"Calcular frete\"", "Veja valor e prazo estimados (o valor final vem no orçamento)"], link: "produtos", acao: "Abrir o catálogo",
      icone: ic('<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>') },
    { chave: "direct_checkout_enabled", titulo: "Compra com Pix e cartão", foto: "caixa-policoating", selo: "Pagamento", texto: "Pague no site e acompanhe o pedido. O atendimento pelo WhatsApp continua.",
      passos: ["Escolha os produtos e a embalagem", "Pague com Pix ou cartão", "Acompanhe o pedido pela sua conta"], link: "produtos", acao: "Comprar agora",
      icone: ic('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h4"/>') },
    { chave: "product_docs_enabled", titulo: "Ficha técnica e FDS", foto: "inspecao-qualidade", selo: "Documentos", texto: "Os documentos técnicos de cada tinta: aplicação, cura, rendimento e segurança no manuseio.",
      passos: ["Abra o produto no catálogo", "Vá até \"Documentos técnicos\"", "Baixe o PDF ou peça pelo WhatsApp"], link: "produtos", acao: "Ver produtos",
      icone: ic('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 17v-6M9.5 14.5 12 17l2.5-2.5"/>') },
    { chave: "pwa_install_invite_enabled", titulo: "Policoating no celular", foto: "linha-fabrica", selo: "App", texto: "Instale o site como aplicativo e tenha o catálogo e as suas cotações a um toque, sem baixar nada da loja.",
      passos: ["Abra o site no Chrome ou no Safari", "Toque em \"Instalar app\" ou \"Adicionar à Tela de Início\"", "Abra pelo ícone da Policoating"], link: "#", acao: "Como instalar", app: true,
      icone: ic('<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>') }
  ];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function desenhar() {
    const R = window.Recursos;
    const ativos = R && R.ligado("new_home_banners_enabled") ? CARTOES.filter((c) => R.ligado(c.chave)) : [];
    caixa.hidden = !ativos.length;
    if (!ativos.length) { caixa.querySelector(".novidades-grade").innerHTML = ""; return; }
    caixa.querySelector(".novidades-grade").innerHTML = ativos.map((c) => `<article class="novidade revelar visivel">
        <div class="novidade-foto"><picture><source type="image/webp" srcset="assets/img/novidades/${esc(c.foto)}.webp"><img src="assets/img/novidades/${esc(c.foto)}.jpg" alt="" width="640" height="360" loading="lazy" decoding="async"></picture><span class="novidade-selo">${esc(c.selo)}</span></div>
        <span class="novidade-ic">${c.icone}</span>
        <h3>${esc(c.titulo)}</h3><p>${esc(c.texto)}</p>
        ${c.passos ? `<ol class="novidade-passos">${c.passos.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>` : ""}
        <a class="novidade-link" href="${esc(c.link)}"${c.app ? " data-instalar-app" : ""}>${esc(c.acao)} <span aria-hidden="true">→</span></a>
      </article>`).join("");
    const app = caixa.querySelector("[data-instalar-app]");
    if (app) app.addEventListener("click", (e) => { e.preventDefault(); if (window.AppPolicoating) window.AppPolicoating.mostrarConvite(); else alert("No Chrome: menu ⋮ → Instalar app. No iPhone (Safari): Compartilhar → Adicionar à Tela de Início."); });
  }
  document.addEventListener("recursos-atualizados", desenhar);
  if (window.Recursos) Promise.resolve(window.Recursos.pronto).then(desenhar, desenhar); else desenhar();
})();
