/* =========================================================
   Estimativa de frete por CEP (etapa E05)
   - No produto: CEP (+ número) → "Calcular frete", só se o recurso "freight_estimate_enabled"
     valer para aquele produto (Comércio e Recursos). O cálculo é feito no servidor
     (função "frete" do Supabase); o endereço de saída nunca chega ao navegador.
   - Sempre mostrado como ESTIMATIVA; sem rota confiável, pede a cotação ao vendedor.
   - Painel: ler/salvar a saída e as tarifas, localizar a saída no mapa e simular.
   ========================================================= */
(function () {
  "use strict";
  const CFG = window.SITE_CONFIG || {};
  const SB = CFG.supabase || {};
  const ONLINE = !!(SB.url && SB.anonKey);
  const K_CEP = "policoating_frete_cep";
  const reais = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const so = (v) => String(v || "").replace(/\D/g, "");
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  async function tokenSessao() {
    try { const sb = await window.Conta.cliente(); const { data } = await sb.auth.getSession(); return (data && data.session && data.session.access_token) || ""; } catch (e) { return ""; }
  }
  async function chamar(corpo, comLogin) {
    if (!ONLINE) throw new Error("O cálculo de frete precisa do servidor (Supabase) configurado.");
    const headers = { apikey: SB.anonKey, "Content-Type": "application/json" };
    if (comLogin) { const t = await tokenSessao(); if (t) headers.Authorization = "Bearer " + t; }
    let r;
    try { r = await fetch(`${SB.url}/functions/v1/frete`, { method: "POST", headers, body: JSON.stringify(corpo) }); }
    catch (e) { throw new Error("Não foi possível calcular agora. Verifique a internet ou fale com o vendedor."); }
    let d = {}; try { d = await r.json(); } catch (e) { /* resposta sem JSON */ }
    if (r.status === 404 && !d.erro) throw new Error("A função de frete ainda não foi publicada no Supabase.");
    if (!r.ok) throw new Error(d.erro || "Não foi possível calcular agora.");
    return d;
  }

  /** Texto do resultado para o cliente */
  function htmlResultado(d, cep) {
    if (d.zona === "manual") {
      const msg = `Olá! Gostaria de saber o frete para o CEP ${cep.replace(/^(\d{5})(\d{3})$/, "$1-$2")}.`;
      const link = window.ColorWeg ? window.ColorWeg.linkWhatsApp(msg) : "#";
      return `<span class="frete-manual">${esc(d.mensagem)}</span> <a class="frete-whats" href="${esc(link)}" target="_blank" rel="noopener">Pedir no WhatsApp</a>`;
    }
    const onde = d.zona === "local" ? `${esc(d.cidade)}/${esc(d.uf)}` : `${esc(d.cidade)}/${esc(d.uf)} · ${Number(d.km).toLocaleString("pt-BR")} km de estrada`;
    return `<strong class="frete-valor">${reais(d.valor)}</strong> <span class="frete-onde">${onde}</span>
      <small class="frete-regra">${esc(d.regra || "")}${d.pela_cidade ? " Calculado até o centro da cidade; informe o número para mais precisão." : ""}</small>`;
  }

  /** Monta o bloco "Calcular frete" dentro do produto (ou não monta nada se o recurso não vale para ele) */
  function montar(alvo, produto, itens) {
    if (!alvo) return;
    const R = window.Recursos;
    if (!R || !R.disponivel("freight_estimate_enabled", produto)) { alvo.innerHTML = ""; return; }
    let cepSalvo = ""; try { cepSalvo = localStorage.getItem(K_CEP) || ""; } catch (e) { /* ignora */ }
    alvo.innerHTML = `<div class="frete-box">
      <div class="campo-titulo">Calcular frete</div>
      <form class="frete-form" novalidate>
        <label class="sr" for="frete-cep">CEP de entrega</label>
        <input id="frete-cep" inputmode="numeric" autocomplete="postal-code" placeholder="CEP de entrega" maxlength="9" value="${esc(cepSalvo.replace(/^(\d{5})(\d{3})$/, "$1-$2"))}">
        <label class="sr" for="frete-num">Número</label>
        <input id="frete-num" inputmode="numeric" placeholder="Nº" maxlength="6">
        <button type="submit" class="btn btn-contorno-azul">Calcular</button>
      </form>
      <p class="frete-resultado" id="frete-resultado" aria-live="polite"></p>
      <small class="frete-nota">Saindo de Matão-SP. Valor estimado; o vendedor confirma o frete no pedido.</small>
    </div>`;
    const cepEl = alvo.querySelector("#frete-cep"), res = alvo.querySelector("#frete-resultado"), bt = alvo.querySelector("button");
    cepEl.addEventListener("input", () => { cepEl.value = so(cepEl.value).slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2"); });
    alvo.querySelector("form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const cep = so(cepEl.value);
      if (cep.length !== 8) { res.innerHTML = `<span class="frete-erro">Informe o CEP com 8 números.</span>`; cepEl.focus(); return; }
      bt.disabled = true; res.innerHTML = `<span class="frete-calculando">Calculando…</span>`;
      try {
        const d = await chamar({ acao: "estimar", cep, numero: so(alvo.querySelector("#frete-num").value), itens: itens() });
        res.innerHTML = htmlResultado(d, cep);
        try { localStorage.setItem(K_CEP, cep); } catch (e2) { /* ignora */ }
      } catch (err) { res.innerHTML = `<span class="frete-erro">${esc(err.message)}</span>`; }
      finally { bt.disabled = false; }
    });
  }

  /* ---------- painel ---------- */
  const K_DEMO = "policoating_demo_frete";
  const PADRAO = { origem_cep: "", origem_logradouro: "", origem_numero: "", origem_complemento: "", origem_bairro: "", origem_cidade: "Matão", origem_uf: "SP",
    origem_lat: null, origem_lng: null, origem_rotulo: "", raio_local_m: 10000, tarifa_local: 500, tarifa_km: 3, minimo_externo: 500, versao: 1 };
  const admin = {
    async ler() {
      if (!ONLINE) { try { return Object.assign({}, PADRAO, JSON.parse(localStorage.getItem(K_DEMO)) || {}); } catch (e) { return Object.assign({}, PADRAO); } }
      const sb = await window.Conta.cliente();
      const { data, error } = await sb.from("frete_config").select("*").eq("id", 1).maybeSingle();
      if (error) throw new Error(/frete_config|schema cache|does not exist/i.test(error.message) ? "O banco ainda não tem a parte do frete. Rode a PARTE T do supabase/setup.sql." : error.message);
      return Object.assign({}, PADRAO, data || {});
    },
    async salvar(dados) {
      if (!ONLINE) { const atual = await admin.ler(); const novo = Object.assign(atual, dados, { versao: (atual.versao || 1) + 1 }); localStorage.setItem(K_DEMO, JSON.stringify(novo)); return novo; }
      const sb = await window.Conta.cliente();
      const { data, error } = await sb.rpc("salvar_frete_config", { p: dados });
      if (error) throw new Error(error.message);
      return data;
    },
    localizar: (endereco) => chamar(Object.assign({ acao: "localizar_origem" }, endereco), true),
    simular: (cep, numero) => chamar({ acao: "simular", cep: so(cep), numero: so(numero), itens: [] }, true),
    htmlResultado
  };

  window.Frete = { montar, admin, online: ONLINE };
})();
