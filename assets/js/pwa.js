/* =========================================================
   App instalável (PWA) — etapa E11
   - Só com o recurso "pwa_install_invite_enabled" ligado em Comércio e Recursos:
     registra o service worker e oferece "Instalar o app" quando o navegador permitir.
   - Desligado: remove o service worker e o cache (volta a ser só o site).
   - Convite: uma vez, alguns segundos depois de abrir; "Agora não" esconde por 30 dias.
     Android/Chrome/Edge: botão Instalar (o próprio navegador confirma).
     iPhone/iPad (Safari): explica Compartilhar → Adicionar à Tela de Início.
   - Nada pessoal fica guardado no aparelho (veja sw.js).
   ========================================================= */
(function () {
  "use strict";
  if (!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol)) return;
  const PAINEL = /(^|\/)admin(\.html)?$/.test(location.pathname);
  const K_DISPENSA = "policoating_app_dispensado_em";
  const instalado = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const ehIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const lerDispensa = () => { try { return +localStorage.getItem(K_DISPENSA) || 0; } catch (e) { return 0; } };
  const dispensado = () => Date.now() - lerDispensa() < 30 * 864e5;

  let pedido = null, timer = null, registrado = false;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); pedido = e; agendar(); });
  window.addEventListener("appinstalled", () => { fecharConvite(); pedido = null; });

  const ligado = () => !!(window.Recursos && window.Recursos.ligado("pwa_install_invite_enabled"));

  async function aplicar() {
    if (ligado()) {
      if (!registrado) { registrado = true; navigator.serviceWorker.register("sw.js", { scope: "./" }).catch((e) => console.warn("App:", e.message)); }
      agendar();
    } else {
      fecharConvite();
      // recurso desligado: tira o service worker e o cache deste site
      const regs = await navigator.serviceWorker.getRegistrations().catch(() => []);
      await Promise.all(regs.map((r) => { if (r.active) r.active.postMessage("limpar"); return r.unregister().catch(() => false); }));
      registrado = false;
      // o service worker que já controla esta página ainda pode guardar o que ela está baixando agora:
      // a própria página apaga o cache e repete depois que tudo carregar
      const limparCache = () => { try { if (window.caches) caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))).catch(() => {}); } catch (e) { /* sem suporte */ } };
      if (regs.length) {
        limparCache();
        const depois = () => { limparCache(); setTimeout(limparCache, 1500); };
        if (document.readyState === "complete") setTimeout(depois, 300); else window.addEventListener("load", depois, { once: true });
      }
    }
  }

  function agendar() {
    if (PAINEL || !ligado() || instalado() || dispensado() || document.querySelector(".convite-app")) return;
    if (!pedido && !ehIOS) return;            // navegador ainda não permite instalar
    clearTimeout(timer);
    timer = setTimeout(mostrarConvite, 4000);
  }

  function mostrarConvite() {
    if (instalado() || dispensado() || document.querySelector(".convite-app") || (!pedido && !ehIOS)) return;
    const caixa = document.createElement("div");
    caixa.className = "convite-app";
    caixa.setAttribute("role", "dialog");
    caixa.setAttribute("aria-labelledby", "convite-app-titulo");
    caixa.innerHTML = `<img src="assets/img/app/icone-192.png" alt="" width="48" height="48">
      <div class="convite-app-texto"><strong id="convite-app-titulo">Instale o app da Policoating</strong>
      <span>${pedido ? "Abra o catálogo direto da tela inicial, mais rápido e sem a barra do navegador." : "No iPhone: toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>."}</span></div>
      <div class="convite-app-botoes">${pedido ? '<button type="button" class="btn btn-primario" data-instalar>Instalar</button>' : ""}
      <button type="button" class="btn btn-contorno-azul" data-dispensar>${pedido ? "Agora não" : "Entendi"}</button></div>`;
    document.body.appendChild(caixa);
    requestAnimationFrame(() => caixa.classList.add("visivel"));
    caixa.addEventListener("keydown", (e) => { if (e.key === "Escape") dispensar(); });
    caixa.querySelector("[data-dispensar]").addEventListener("click", dispensar);
    const inst = caixa.querySelector("[data-instalar]");
    if (inst) inst.addEventListener("click", async () => {
      const p = pedido; pedido = null;
      fecharConvite();
      if (!p) return;
      p.prompt();
      const r = await p.userChoice.catch(() => ({}));
      if (r.outcome !== "accepted") marcarDispensa();
    });
  }
  function marcarDispensa() { try { localStorage.setItem(K_DISPENSA, String(Date.now())); } catch (e) { /* ignora */ } }
  function dispensar() { marcarDispensa(); fecharConvite(); }
  function fecharConvite() { clearTimeout(timer); const c = document.querySelector(".convite-app"); if (c) c.remove(); }

  const iniciar = () => { aplicar(); document.addEventListener("recursos-atualizados", aplicar); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
  window.AppPolicoating = { mostrarConvite: () => { try { localStorage.removeItem(K_DISPENSA); } catch (e) { /* ignora */ } mostrarConvite(); } };
})();
