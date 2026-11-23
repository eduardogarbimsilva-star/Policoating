/* =========================================================
   Comércio e Recursos — liga/desliga dos recursos novos (etapa E03)
   - Lista pública (tabela "recursos" no Supabase, PARTE R do setup.sql); só leitura no site.
   - Recursos.disponivel(chave, produto): o recurso vale para este produto?
     Mestre desligado = não. Depois vale o mais específico: produto > classe > padrão
     ("todos" = sim; "escolhidos" = só os marcados). Igual à função recurso_disponivel do banco.
   - O painel altera só pela função alterar_recurso (administrador com 2 etapas; grava auditoria).
   - Sem Supabase (modo demonstração): guarda no navegador.
   ========================================================= */
(function () {
  "use strict";
  const CFG = window.SITE_CONFIG || {};
  const SB = CFG.supabase || {};
  const ONLINE = !!(SB.url && SB.anonKey);
  const K_CACHE = "policoating_recursos", K_DEMO = "policoating_demo_recursos", K_DEMO_AUD = "policoating_demo_recursos_auditoria";
  const ler = (k, p) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? p : v; } catch (e) { return p; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem espaço/modo privado */ } };

  /* Recursos previstos no plano V3.1 — textos do painel. "etapa" = quando o recurso fica pronto. */
  const DEF = [
    { chave: "direct_checkout_enabled", grupo: "Vendas", titulo: "Compra direta (Pix ou cartão)", etapa: "E09", porProduto: true,
      descricao: "O cliente paga no site os produtos liberados, sem passar pelo vendedor.",
      impacto: "Aparece o botão de pagar nos produtos liberados. O pedido pelo WhatsApp continua.", aviso: "Só depois de testar pagamento, frete e nota fiscal." },
    { chave: "tiered_discounts_enabled", grupo: "Vendas", titulo: "Desconto progressivo", etapa: "E04", porProduto: true,
      descricao: "Preço por kg menor conforme a quantidade, definido em cada produto.",
      impacto: "Os produtos com tabela de desconto mostram as faixas de preço.", aviso: "Nenhum desconto é calculado sem tabela cadastrada." },
    { chave: "b2b_whatsapp_shortcut_enabled", grupo: "Vendas", titulo: "Atalho da cotação pelo WhatsApp", etapa: "E06", porProduto: true,
      descricao: "Botão extra para enviar a cotação ao vendedor pelo WhatsApp.",
      impacto: "Soma um botão; o botão de pedido atual não muda.", aviso: "" },
    { chave: "b2b_quote_enabled", grupo: "Cotações", titulo: "Cotação no site", etapa: "E06", porProduto: true,
      descricao: "Aba de Cotação e botão no produto: o cliente informa dados, CEP e itens e recebe um protocolo válido por 7 dias.",
      impacto: "Aparece a aba Cotação e o botão nos produtos liberados.", aviso: "Os dados da cotação são apagados 7 dias depois da emissão." },
    { chave: "manual_quote_approval", grupo: "Cotações", titulo: "Aprovação manual das cotações", etapa: "E08", porProduto: false,
      descricao: "Toda cotação passa por um vendedor antes de virar proposta.",
      impacto: "Ligado: nenhuma proposta sai sem revisão da equipe.", aviso: "Recomendado manter ligado." },
    { chave: "quote_chat_enabled", grupo: "Cotações", titulo: "Chat da cotação aprovada", etapa: "AC", porProduto: false,
      descricao: "Depois que a cotação é aprovada, o cliente abre um chat com a equipe de frete e envio. Um assistente virtual recebe e responde o básico até alguém da equipe responder.",
      impacto: "Aparece \"Abrir chat\" na cotação aprovada e a lista de conversas em Painel → Cotações.", aviso: "Precisa da função \"chat\" publicada e da PARTE AC. Sem a chave da IA, o assistente responde só com os dados da cotação." },
    { chave: "freight_estimate_enabled", grupo: "Frete", titulo: "Estimativa de frete por CEP", etapa: "E05", porProduto: true,
      descricao: "Calcula o frete saindo de Matão: R$ 500 em Matão ou até 10 km; fora disso, R$ 3 por km rodado (só ida), mínimo de R$ 500.",
      impacto: "Aparece o campo de CEP e o botão Calcular frete nos produtos liberados.", aviso: "Sempre mostrado como estimativa; sem rota confiável, pede cotação manual." },
    { chave: "floating_social_enabled", grupo: "Redes sociais", titulo: "Bolinhas flutuantes das redes", etapa: "E10", porProduto: false,
      descricao: "Ícones flutuantes com os links de redes já cadastrados em Contato e links.",
      impacto: "Aparecem no canto da tela, sem cobrir botões.", aviso: "" },
    { chave: "social_click_metrics_enabled", grupo: "Redes sociais", titulo: "Medir cliques nas redes", etapa: "E10", porProduto: false,
      descricao: "Conta os cliques nas redes no Google Analytics.",
      impacto: "Só para quem aceitou as estatísticas no aviso de privacidade.", aviso: "" },
    { chave: "packaging_variants_enabled", grupo: "Catálogo", titulo: "Variações de embalagem e peso", etapa: "E04", porProduto: true,
      descricao: "A caixa de 5 kg pode ter preço por kg próprio (cadastrado no produto); sem ele, continua proporcional.",
      impacto: "Site, carrinho, pedido no WhatsApp, página do produto e feed do Google usam o preço da caixa de 5 kg.", aviso: "Nenhum preço é inventado: sem o campo preenchido, nada muda." },
    { chave: "product_docs_enabled", grupo: "Catálogo", titulo: "Documentos técnicos (ficha e FDS)", etapa: "E04", porProduto: true,
      descricao: "Ficha técnica e FDS oficiais para baixar na página do produto.",
      impacto: "Aparece a área de documentos nos produtos liberados.", aviso: "Só documentos oficiais da Policoating." },
    { chave: "pwa_install_invite_enabled", grupo: "App (PWA)", titulo: "Convite para instalar o app", etapa: "E11", porProduto: false,
      descricao: "Oferece instalar o site como aplicativo no celular e no computador.",
      impacto: "O convite aparece uma vez e pode ser dispensado.", aviso: "Nada pessoal fica guardado no aparelho." },
    { chave: "merchant_center_feed_enabled", grupo: "SEO comercial", titulo: "Feed do Google Merchant Center", etapa: "E02", porProduto: true,
      descricao: "Publica o feed de produtos (função catalogo-google) para o Google Merchant Center / Shopping.",
      impacto: "Só entram produtos ativos com preço publicado, foto e descrição; uma linha por embalagem (5 e 25 kg).",
      aviso: "O Google só aprova a loja com compra direta no site (etapa E09). Até lá, deixe desligado." },
    { chave: "new_home_banners_enabled", grupo: "Comunicação", titulo: "Novos banners da página inicial", etapa: "E12", porProduto: false,
      descricao: "Banners que anunciam os recursos novos.",
      impacto: "Os banners só anunciam o que estiver ligado.", aviso: "" }
  ];
  const DEF_MAP = Object.fromEntries(DEF.map((d) => [d.chave, d]));

  const padrao = () => Object.fromEntries(DEF.map((d) => [d.chave, {
    chave: d.chave, ligado: d.chave === "manual_quote_approval", alvos: {}, implementado: false,
    requisito: `Disponível a partir da etapa ${d.etapa}.`, atualizado_em: null, atualizado_por: null
  }]));
  let estado = padrao();

  function aplicar(lista) {
    const novo = padrao();
    (lista || []).forEach((r) => { if (r && r.chave && novo[r.chave]) novo[r.chave] = Object.assign(novo[r.chave], r, { alvos: r.alvos || {} }); });
    const mudou = JSON.stringify(novo) !== JSON.stringify(estado);
    estado = novo;
    if (mudou) document.dispatchEvent(new CustomEvent("recursos-atualizados"));
    return mudou;
  }

  /* ---------- Leitura ---------- */
  async function buscarServidor() {
    const r = await fetch(`${SB.url}/rest/v1/recursos?select=chave,ligado,alvos,implementado,requisito,atualizado_em,atualizado_por`, { headers: { apikey: SB.anonKey } });
    if (!r.ok) throw new Error(r.status === 404 ? "TABELA_AUSENTE" : "recursos indisponíveis (" + r.status + ")");
    const lista = await r.json();
    gravar(K_CACHE, { em: Date.now(), lista });
    return lista;
  }
  async function recarregar() {
    if (!ONLINE) { aplicar(Object.values(ler(K_DEMO, {}))); return estado; }
    aplicar(await buscarServidor());
    return estado;
  }
  if (ONLINE) { const c = ler(K_CACHE, null); if (c && Array.isArray(c.lista)) aplicar(c.lista); }
  else aplicar(Object.values(ler(K_DEMO, {})));
  const pronto = (ONLINE ? recarregar() : Promise.resolve(estado)).catch((e) => console.warn("Recursos:", e.message));

  /** Ligado no geral (mestre ligado e recurso pronto) */
  const ligado = (chave) => { const r = estado[chave]; return !!(r && r.ligado && r.implementado); };
  /** Vale para este produto? (produto > classe > padrão) */
  function disponivel(chave, produto, alvosSimulados) {
    const r = estado[chave];
    if (!alvosSimulados && !ligado(chave)) return false;
    const a = alvosSimulados || (r && r.alvos) || {};
    if (produto) {
      const p = (a.produtos || {})[produto.id];
      if (typeof p === "boolean") return p;
      const c = (a.categorias || {})[produto.categoria];
      if (typeof c === "boolean") return c;
    }
    return (a.padrao || "todos") === "todos";
  }

  /* ---------- Alteração (painel) ---------- */
  function traduzir(e) {
    const msg = String((e && e.message) || e || "");
    if (/REQUISITO:/.test(msg)) return new Error("Ainda não dá para ligar: " + msg.replace(/^.*REQUISITO:\s*/, ""));
    if (/alterar_recurso|recursos|PGRST20[02]|does not exist|schema cache/i.test(msg) && !/administrador/i.test(msg))
      return new Error("O banco ainda não tem a parte de recursos. Rode a PARTE R do supabase/setup.sql no SQL Editor do Supabase.");
    return new Error(msg || "Não foi possível alterar o recurso.");
  }
  async function alterar(chave, ligar, alvos, motivo) {
    if (!DEF_MAP[chave]) throw new Error("Recurso desconhecido.");
    motivo = String(motivo || "").replace(/\s+/g, " ").trim().slice(0, 300);
    if (ONLINE) {
      const sb = await window.Conta.cliente();
      const { error } = await sb.rpc("alterar_recurso", { p_chave: chave, p_ligado: ligar, p_alvos: alvos || null, p_motivo: motivo || null });
      if (error) throw traduzir(error);
      await recarregar();
      return estado[chave];
    }
    // demonstração: as mesmas regras da função do banco
    const demo = ler(K_DEMO, {}), atual = Object.assign({}, estado[chave], demo[chave] || {});
    if (ligar && !atual.ligado && !atual.implementado) throw traduzir({ message: "REQUISITO: " + atual.requisito });
    const novo = Object.assign({}, atual, { ligado: ligar == null ? atual.ligado : !!ligar, alvos: alvos || atual.alvos || {},
      atualizado_em: new Date().toISOString(), atualizado_por: (window.Conta && window.Conta.usuario && window.Conta.usuario.email) || "demo" });
    demo[chave] = novo; gravar(K_DEMO, demo);
    const aud = ler(K_DEMO_AUD, []);
    aud.unshift({ em: novo.atualizado_em, ator_email: novo.atualizado_por, chave, antigo: { ligado: atual.ligado, alvos: atual.alvos || {} }, novo: { ligado: novo.ligado, alvos: novo.alvos }, motivo: motivo || null });
    gravar(K_DEMO_AUD, aud.slice(0, 200));
    await recarregar();
    return estado[chave];
  }
  async function auditoria(limite) {
    limite = limite || 30;
    if (!ONLINE) return ler(K_DEMO_AUD, []).slice(0, limite);
    const sb = await window.Conta.cliente();
    const { data, error } = await sb.from("recursos_auditoria").select("em,ator_email,chave,antigo,novo,motivo").order("em", { ascending: false }).limit(limite);
    if (error) throw traduzir(error);
    return data || [];
  }

  window.Recursos = { DEF, definicao: (k) => DEF_MAP[k], todos: () => estado, ligado, disponivel, recarregar, alterar, auditoria, pronto, online: ONLINE };
})();
