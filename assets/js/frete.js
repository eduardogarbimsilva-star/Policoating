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

  const CAMINHAO = `<svg class="icone-svg" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>`;
  const km = (n) => Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 1 });

  /** Resultado detalhado (cliente e simulação do painel): valor, destino, distância e a conta feita */
  function htmlResultado(d, cep, opcoes) {
    opcoes = opcoes || {};
    if (d.zona === "manual") {
      const msg = `Olá! Gostaria de saber o frete para o CEP ${cep.replace(/^(\d{5})(\d{3})$/, "$1-$2")}.`;
      const link = window.ColorWeg ? window.ColorWeg.linkWhatsApp(msg) : "#";
      return `<div class="frete-card frete-card-manual"><p class="frete-manual">${esc(d.mensagem)}</p>
        ${d.cidade ? `<p class="frete-obs">Destino: ${esc(d.cidade)}/${esc(d.uf)}</p>` : ""}
        <a class="btn btn-whats frete-whats" href="${esc(link)}" target="_blank" rel="noopener">Pedir o frete no WhatsApp</a></div>`;
    }
    const local = d.zona === "local";
    const linhas = [[local ? "Entrega" : "Destino", `${esc(d.cidade)}/${esc(d.uf)}`]];
    if (!local && d.km != null) {
      linhas.push(["Distância (rota de caminhão, só ida)", `${km(d.km)} km`]);
      if (d.tarifa_km != null) linhas.push(["Cálculo", `${km(d.km)} km × ${reais(d.tarifa_km)} = ${reais(Math.round(d.km * d.tarifa_km * 100) / 100)}`]);
      if (d.minimo_aplicado) linhas.push(["Valor mínimo fora da região", `${d.minimo != null ? reais(d.minimo) : reais(d.valor)} <em class="frete-tag">aplicado</em>`, "frete-aplicado"]);
    }
    if (d.prazo_dias) linhas.push(["Prazo estimado", `até ${d.prazo_dias} ${d.prazo_dias === 1 ? "dia útil" : "dias úteis"}`]);
    if (d.peso_kg) linhas.push(["Peso considerado", `${Number(d.peso_kg).toLocaleString("pt-BR")} kg`]);
    return `<div class="frete-card">
      <div class="frete-card-topo">
        <div><span class="frete-rot">Frete estimado</span><strong class="frete-valor">${reais(d.valor)}</strong></div>
        <span class="frete-chip${local ? " frete-chip-local" : ""}">${local ? "Entrega local" : "Fora da região"}</span>
      </div>
      <ul class="frete-detalhes">${linhas.map(([k, v, cls]) => `<li${cls ? ` class="${cls}"` : ""}><span>${k}</span><b>${v}</b></li>`).join("")}</ul>
      <p class="frete-obs">${esc(d.regra || "")}${d.pela_cidade ? " Calculado até o centro da cidade; informe o número para mais precisão." : ""}</p>
      ${opcoes.cta || ""}
    </div>`;
  }

  /** Monta o bloco "Calcular frete" dentro do produto (ou não monta nada se o recurso não vale para ele) */
  function montar(alvo, produto, itens) {
    if (!alvo) return;
    const R = window.Recursos;
    if (!R || !R.disponivel("freight_estimate_enabled", produto)) { alvo.innerHTML = ""; return; }
    let cepSalvo = ""; try { cepSalvo = localStorage.getItem(K_CEP) || ""; } catch (e) { /* ignora */ }
    alvo.innerHTML = `<div class="frete-box">
      <div class="frete-cab"><span class="frete-ico">${CAMINHAO}</span>
        <div><strong>Calcular frete</strong><small>Saindo de Matão-SP, por caminhão</small></div></div>
      <form class="frete-form" novalidate>
        <label class="sr" for="frete-cep">CEP de entrega</label>
        <input id="frete-cep" inputmode="numeric" autocomplete="postal-code" placeholder="CEP de entrega" maxlength="9" value="${esc(cepSalvo.replace(/^(\d{5})(\d{3})$/, "$1-$2"))}">
        <label class="sr" for="frete-num">Número</label>
        <input id="frete-num" inputmode="numeric" placeholder="Nº" maxlength="6">
        <button type="submit" class="btn btn-primario">Calcular</button>
      </form>
      <a class="frete-nao-sei" href="https://buscacepinter.correios.com.br/app/endereco/index.php" target="_blank" rel="noopener">Não sei meu CEP</a>
      <div class="frete-resultado" id="frete-resultado" aria-live="polite"></div>
      <small class="frete-nota">Valor estimado. O vendedor confirma o frete no pedido.</small>
    </div>`;
    const cepEl = alvo.querySelector("#frete-cep"), res = alvo.querySelector("#frete-resultado"), bt = alvo.querySelector("button");
    cepEl.addEventListener("input", () => { cepEl.value = so(cepEl.value).slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2"); });
    alvo.querySelector("form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const cep = so(cepEl.value);
      if (cep.length !== 8) { res.innerHTML = `<p class="frete-erro">Informe o CEP com 8 números.</p>`; cepEl.focus(); return; }
      bt.disabled = true; res.innerHTML = `<p class="frete-calculando"><span class="frete-giro" aria-hidden="true"></span>Calculando a rota…</p>`;
      try {
        const lista = itens();
        const d = await chamar({ acao: "estimar", cep, numero: so(alvo.querySelector("#frete-num").value), itens: lista });
        const podeCotar = window.Cotacao && R.disponivel("b2b_quote_enabled", produto);
        res.innerHTML = htmlResultado(d, cep, { cta: podeCotar ? `<button type="button" class="btn btn-contorno-azul frete-cotar" data-frete-cotar>Solicitar cotação com este frete</button>` : "" });
        const c = res.querySelector("[data-frete-cotar]");
        if (c) c.addEventListener("click", () => { lista.forEach((i) => window.Cotacao.lista.adicionar(Object.assign({ cor: i.cor || "" }, i))); try { localStorage.setItem(K_CEP, cep); } catch (e2) { /* */ } location.href = "cotacao"; });
        try { localStorage.setItem(K_CEP, cep); } catch (e2) { /* ignora */ }
      } catch (err) { res.innerHTML = `<p class="frete-erro">${esc(err.message)}</p>`; }
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

  /** Estimativa direta (página de cotação) */
  const estimar = (cep, numero, itens) => chamar({ acao: "estimar", cep: so(cep), numero: so(numero), itens });
  window.Frete = { montar, estimar, htmlResultado, admin, online: ONLINE };
})();
