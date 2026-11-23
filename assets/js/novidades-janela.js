/* =========================================================
   Janela "Novidades no site" — aparece ao entrar, fica ~10 s (barra de tempo), fecha no X ou no Esc.
   Volta a aparecer a cada visita até a pessoa marcar "Não mostrar novamente" (vale por versão:
   quando sair uma atualização nova, ela aparece de novo).
   - Itens com "recurso" só aparecem se o recurso estiver ligado (nunca promete o que não existe).
   - Itens "equipe" só aparecem para quem é da equipe (dono/vendedor).
   ========================================================= */
(function () {
  "use strict";
  const VERSAO = "2026-11-23c";
  const DATA = "23/11/2026";
  const CHAVE = "policoating_novidades_ocultar";
  const DURACAO = 10000;
  const ic = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const I = {
    doc: ic('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>'),
    caminhao: ic('<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>'),
    lixo: ic('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
    celular: ic('<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>'),
    chat: ic('<path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/>'),
    caixa: ic('<path d="m12 3 9 5-9 5-9-5z"/><path d="M3 8v8l9 5 9-5V8"/>'),
    ajuda: ic('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01"/>'),
    relogio: ic('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    estrela: ic('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>')
  };
  const ITENS = [
    { icone: I.doc, recurso: "b2b_quote_enabled", titulo: "Orçamento pelo site com número", texto: "Peça o orçamento, receba um número (COT-…) e acompanhe a resposta do vendedor nesta página." },
    { icone: I.lixo, recurso: "b2b_quote_enabled", titulo: "Organize suas cotações", texto: "Em \"Minhas cotações\" ficam as 10 mais recentes, e você pode excluir as que não quer mais ver." },
    { icone: I.chat, recurso: "quote_chat_enabled", titulo: "Converse sobre o frete e o envio", texto: "Depois que a cotação é aceita, abra o chat: o assistente recebe você e a equipe responde em seguida." },
    { icone: I.caminhao, recurso: "freight_estimate_enabled", titulo: "Simule o frete pelo CEP", texto: "Na página de cada produto, veja o valor e o prazo estimados saindo de Matão-SP." },
    { icone: I.celular, titulo: "Site mais ajustado no celular", texto: "Cabeçalho, cartões e textos revisados para não cortar nem sobrepor em telas pequenas." },
    { icone: I.caixa, equipe: true, titulo: "Volumetria e veículos", texto: "Cotação com medidas dos volumes, cubagem e regra Montana até 750 kg / caminhão (Painel → Cotações → Configurações)." },
    { icone: I.relogio, equipe: true, titulo: "Intervalo entre cotações", texto: "2 minutos entre uma cotação e outra do mesmo cliente, com contagem regressiva (ajustável)." },
    { icone: I.ajuda, equipe: true, titulo: "Ajuda com antes e depois", texto: "Nas configurações importantes, o botão ? mostra como o site fica com e sem a opção ligada." },
    { icone: I.caixa, equipe: true, titulo: "Compra direta com Pix e cartão (pronta, desligada)", texto: "Pagamento pelo Mercado Pago com valor calculado no servidor. Falta a conta de vendedor da empresa (veja docs/OPERACAO.md)." },
    { icone: I.chat, equipe: true, titulo: "Chat das cotações aceitas", texto: "Atenda o cliente pelo painel; a IA recebe ele enquanto ninguém da equipe está no chat (recurso começa desligado)." }
  ];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ler = () => { try { return localStorage.getItem(CHAVE); } catch (e) { return null; } };
  if (ler() === VERSAO || ler() === "*") return;   // "*" = testes automáticos

  async function ehEquipe() {
    try { if (window.Catalogo && window.Catalogo.Admin && window.Conta && window.Conta.usuario) return !!(await window.Catalogo.Admin.meuPapel()); } catch (e) { /* */ }
    return false;
  }
  async function abrir() {
    if (document.querySelector(".nv-tela")) return;
    const R = window.Recursos;
    try { if (R && R.pronto) await R.pronto; } catch (e) { /* */ }
    const equipe = await ehEquipe();
    const itens = ITENS.filter((x) => !x.breve && (!x.recurso || (R && R.ligado(x.recurso))) && (!x.equipe || equipe));
    if (!itens.length) return;
    const anterior = document.activeElement;
    const tela = document.createElement("div");
    tela.className = "nv-tela";
    const item = (x) => `<li${x.equipe ? ' class="nv-equipe"' : ""}><span class="nv-ic">${x.icone}</span><div><strong>${esc(x.titulo)}</strong><span>${esc(x.texto)}</span></div></li>`;
    const pub = itens.filter((x) => !x.equipe), eq = itens.filter((x) => x.equipe);
    tela.innerHTML = `<div class="nv-caixa" role="dialog" aria-modal="true" aria-labelledby="nv-titulo">
      <div class="nv-topo">
        <img class="nv-foto" src="assets/img/novidades/fachada-frontal.jpg" alt="" width="1100" height="825" decoding="async">
        <button type="button" class="nv-fechar" aria-label="Fechar novidades">✕</button>
        <div class="nv-topo-txt">
          <span class="nv-selo">${I.estrela} Novidades no site</span>
          <h2 id="nv-titulo">O que mudou na Policoating online</h2>
          <p>Atualização de ${DATA} · Tinta eletrostática em pó, de Matão-SP para todo o Brasil</p>
        </div>
      </div>
      <div class="nv-corpo">
        ${pub.length ? `<ul class="nv-lista">${pub.map(item).join("")}</ul>` : ""}
        ${eq.length ? `<h3 class="nv-sub"><span>Para a equipe</span></h3><ul class="nv-lista">${eq.map(item).join("")}</ul>` : ""}
      </div>
      <div class="nv-tempo" aria-hidden="true"><i></i></div>
      <div class="nv-rodape">
        <label class="nv-nao"><input type="checkbox"> Não mostrar novamente</label>
        <button type="button" class="btn btn-primario nv-ok">Entendi</button>
      </div>
    </div>`;
    document.body.appendChild(tela);
    const barra = tela.querySelector(".nv-tempo i"), caixa = tela.querySelector(".nv-caixa");
    let restante = DURACAO, ultimo = performance.now(), pausado = false, raf = 0;
    function passo(t) {
      if (!pausado) restante -= t - ultimo;
      ultimo = t;
      barra.style.transform = `scaleX(${Math.max(restante, 0) / DURACAO})`;
      if (restante <= 0) return fechar();
      raf = requestAnimationFrame(passo);
    }
    function fechar() {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", tecla);
      if (tela.querySelector(".nv-nao input").checked) { try { localStorage.setItem(CHAVE, VERSAO); } catch (e) { /* */ } }
      tela.classList.remove("nv-visivel");
      setTimeout(() => { tela.remove(); if (anterior && anterior.focus) try { anterior.focus(); } catch (e) { /* */ } }, 260);
    }
    const tecla = (e) => { if (e.key === "Escape") fechar(); };
    // passa o mouse ou mexe na janela → o tempo pausa (dá para ler com calma)
    caixa.addEventListener("pointerenter", () => (pausado = true));
    caixa.addEventListener("pointerleave", () => (pausado = false));
    caixa.addEventListener("focusin", () => (pausado = true));
    tela.querySelector(".nv-nao input").addEventListener("change", () => (pausado = true));
    tela.querySelector(".nv-fechar").addEventListener("click", fechar);
    tela.querySelector(".nv-ok").addEventListener("click", fechar);
    tela.addEventListener("click", (e) => { if (e.target === tela) fechar(); });
    document.addEventListener("keydown", tecla);
    requestAnimationFrame(() => { tela.classList.add("nv-visivel"); ultimo = performance.now(); raf = requestAnimationFrame(passo); });
  }
  window.NovidadesSite = { abrir, VERSAO };
  const iniciar = () => setTimeout(abrir, 1400);
  if (document.readyState === "complete") iniciar(); else window.addEventListener("load", iniciar);
})();
