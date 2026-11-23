/* =========================================================
   Ajuda "antes e depois" do painel: o botão ? ao lado das configurações importantes abre duas
   fotos reais do site — com a opção DESLIGADA e LIGADA — para entender o efeito antes de mexer.
   Fotos geradas por ferramentas/ajuda_imagens.mjs (refazer quando o visual do site mudar).
   ========================================================= */
(function () {
  "use strict";
  const IMG = "assets/img/ajuda/";
  const AJUDA = {
    floating_social_enabled: { titulo: "Bolinhas flutuantes das redes", desl: "Sem bolinhas: as redes ficam só no rodapé.", lig: "Um botão flutuante abre Instagram, Facebook e WhatsApp em qualquer página." },
    new_home_banners_enabled: { titulo: "Novidades na página inicial", desl: "A página inicial segue direto para as outras seções.", lig: "Aparece a seção \"Novidades no site\", só com os recursos que estão ligados." },
    freight_estimate_enabled: { titulo: "Frete pelo CEP no produto", desl: "Sem cálculo de frete na página do produto.", lig: "Bloco \"Calcular frete\": o cliente digita o CEP e vê valor e prazo estimados." },
    product_docs_enabled: { titulo: "Documentos técnicos", desl: "A página do produto não mostra documentos.", lig: "Ficha técnica e FDS para baixar (ou pedir pelo WhatsApp quando não houver PDF)." },
    packaging_variants_enabled: { titulo: "Preço próprio da caixa de 5 kg", desl: "A caixa de 5 kg usa o mesmo preço por kg da de 25 kg.", lig: "A caixa de 5 kg usa o preço por kg cadastrado para ela no produto." },
    b2b_quote_enabled: { titulo: "Cotação online", desl: "No produto, só o pedido pelo carrinho e pelo WhatsApp.", lig: "Botão \"Solicitar cotação\" no produto e a página de cotação com número." },
    b2b_whatsapp_shortcut_enabled: { titulo: "Atalho da cotação pelo WhatsApp", desl: "Depois de cotar, o cliente vê só o número da cotação.", lig: "Botão extra \"Enviar pelo WhatsApp\" com a cotação já escrita." },
    "cot-volumetria": { titulo: "Volumetria (medidas e cubagem)", desl: "Oculta: o cliente informa só o peso.", lig: "Opcional ou obrigatória: volumes e medidas, com cubagem e peso cubado calculados." },
    "cot-veiculos": { titulo: "Veículos da entrega", desl: "Sem escolha de veículo.", lig: "Lista de veículos com peso (e volume) máximo; o site sugere o que leva a carga." },
    "cot-intervalo": { titulo: "Intervalo entre cotações", desl: "0 minutos: o cliente pode cotar seguidamente.", lig: "Depois de cotar, o botão espera o intervalo com contagem regressiva." }
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const botao = (k) => `<button type="button" class="aj-botao" data-ajuda-abrir="${esc(k)}" aria-label="Ver antes e depois: ${esc(AJUDA[k].titulo)}" title="Ver como fica ligado e desligado">?</button>`;

  function abrir(k) {
    const a = AJUDA[k]; if (!a) return;
    const anterior = document.activeElement;
    const t = document.createElement("div");
    t.className = "aj-tela";
    t.innerHTML = `<div class="aj-caixa" role="dialog" aria-modal="true" aria-labelledby="aj-titulo">
      <div class="aj-topo"><div><span class="aj-rotulo">Antes e depois</span><h3 id="aj-titulo">${esc(a.titulo)}</h3></div>
        <button type="button" class="aj-fechar" aria-label="Fechar">✕</button></div>
      <div class="aj-pares">
        <figure class="aj-lado aj-desl"><figcaption><span class="aj-chip">Desligado</span>${esc(a.desl)}</figcaption>
          <div class="aj-foto"><img src="${IMG}${esc(k)}-desligado.jpg" alt="Site com a opção desligada: ${esc(a.desl)}" loading="lazy"></div></figure>
        <span class="aj-seta" aria-hidden="true">→</span>
        <figure class="aj-lado aj-lig"><figcaption><span class="aj-chip">Ligado</span>${esc(a.lig)}</figcaption>
          <div class="aj-foto"><img src="${IMG}${esc(k)}-ligado.jpg" alt="Site com a opção ligada: ${esc(a.lig)}" loading="lazy"></div></figure>
      </div>
      <p class="aj-nota">Fotos reais do site, em modo de demonstração (os dados são de exemplo).</p>
    </div>`;
    document.body.appendChild(t);
    const fechar = () => { document.removeEventListener("keydown", tecla); t.classList.remove("aj-visivel"); setTimeout(() => { t.remove(); if (anterior && anterior.focus) anterior.focus(); }, 200); };
    const tecla = (e) => { if (e.key === "Escape") fechar(); };
    t.querySelector(".aj-fechar").addEventListener("click", fechar);
    t.addEventListener("click", (e) => { if (e.target === t) fechar(); });
    document.addEventListener("keydown", tecla);
    requestAnimationFrame(() => { t.classList.add("aj-visivel"); t.querySelector(".aj-fechar").focus(); });
  }

  /* coloca o ? nos cartões de Comércio e Recursos e nas legendas marcadas com data-ajuda */
  function colocar() {
    document.querySelectorAll(".rec-card[data-chave]").forEach((c) => {
      const k = c.dataset.chave, h = c.querySelector("h4");
      if (AJUDA[k] && h && !h.querySelector(".aj-botao")) h.insertAdjacentHTML("beforeend", botao(k));
    });
    document.querySelectorAll("[data-ajuda]").forEach((el) => {
      const k = el.dataset.ajuda;
      if (AJUDA[k] && !el.querySelector(".aj-botao")) el.insertAdjacentHTML("beforeend", botao(k));
    });
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ajuda-abrir]"); if (!b) return;
    e.preventDefault(); e.stopPropagation(); abrir(b.dataset.ajudaAbrir);
  }, true);
  let pend = 0;
  new MutationObserver(() => { if (!pend) pend = requestAnimationFrame(() => { pend = 0; colocar(); }); }).observe(document.body, { childList: true, subtree: true });
  colocar();
  window.AjudaConfig = { abrir, AJUDA };
})();
