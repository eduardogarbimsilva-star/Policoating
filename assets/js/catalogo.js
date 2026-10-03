/* =========================================================
   Policoating — Catálogo e configurações gerenciáveis pelo painel
   - Os produtos são cadastrados no painel da empresa (admin.html) e ficam no
     Supabase (tabela "produtos"). O site mostra só o que está lá: o que for
     excluído no painel some do site (não existe lista padrão de volta).
   - A última lista recebida fica guardada no navegador, então a página
     abre na hora e se atualiza sozinha se algo mudou.
   - Também aplica as configurações do painel: WhatsApp, telefone, e-mail,
     endereço, horário, redes sociais, lojas (marketplaces) e galeria.
   - Sem Supabase (modo demonstração) o painel grava neste navegador.
   ========================================================= */
(function () {
  "use strict";

  const CFG = window.SITE_CONFIG || {};
  const SB = CFG.supabase || {};
  const ONLINE = !!(SB.url && SB.anonKey);
  const CHAVE_CACHE = "policoating_catalogo";
  const CHAVE_DEMO = "policoating_demo_catalogo";

  const ler = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem espaço/modo privado */ } };

  /** Código do produto: letras, números e hífen (2 a 30). O id é o código em minúsculas. */
  const CODIGO_RE = /^[A-Za-z0-9][A-Za-z0-9-]{1,29}$/;
  const num = (v) => (v === "" || v == null || isNaN(+v) ? null : +v);
  /** Cada produto é uma cor. Produto antigo com várias cores vira um produto por cor. */
  function desmembrar(p) {
    if (!p || !Array.isArray(p.cores) || p.cores.length <= 1) return [Object.assign({ codigo: p && p.id ? String(p.id).toUpperCase() : "" }, p)];
    const slugCor = (t) => String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return p.cores.map((c, i) => {
      const id = (p.id + "-" + slugCor(c.nome)).slice(0, 60).replace(/-$/, "");
      return Object.assign({}, p, { id, codigo: id.toUpperCase().slice(0, 30), familia: p.familia || p.id, nome: `${p.nome} ${c.nome}`, cores: [c], destaque: !!p.destaque && i === 0 });
    });
  }
  const normalizarLista = (lista) => [].concat(...(lista || []).map(desmembrar));
  const fotoOk = (u) => typeof u === "string" && /^(https:\/\/|data:image\/(jpeg|png|webp);base64,|assets\/)/.test(u);

  /** Confere o formato mínimo para o site conseguir exibir o produto */
  function valido(p) {
    return !!(p && typeof p.id === "string" && /^[a-z0-9-]{2,60}$/.test(p.id) && p.nome && typeof p.categoria === "string" && p.categoria &&
      Array.isArray(p.cores) && p.cores.length && p.cores.every((c) => c && c.nome && /^#[0-9a-f]{6}$/i.test(c.hex) &&
        (!c.foto || /^(https:\/\/|data:image\/(jpeg|png|webp);base64,|assets\/)/.test(c.foto))) &&
      Array.isArray(p.embalagens) && p.embalagens.length && (!p.ficha || /^https:\/\//.test(p.ficha)) &&
      (p.preco == null || num(p.preco) >= 0) && (p.precoPromo == null || num(p.precoPromo) >= 0) &&
      (p.fotos == null || (Array.isArray(p.fotos) && p.fotos.every(fotoOk))) &&
      (!p.video || (typeof p.video === "string" && /^https:\/\//.test(p.video))));
  }

  /** Embalagens: caixas de 5 kg e de 25 kg (o cliente também pode pedir "Sob medida", em kg) */
  const EMBALAGENS = ["Caixa 5 kg", "Caixa 25 kg"];

  /** Troca o conteúdo de PRODUTOS sem trocar o array (os outros scripts guardam a referência) */
  function aplicar(lista) {
    const ok = normalizarLista(lista).map((p) => Object.assign({}, p, { embalagens: EMBALAGENS.slice() })).filter(valido);
    if (JSON.stringify(ok) === JSON.stringify(window.PRODUTOS)) return false;
    window.PRODUTOS.splice(0, window.PRODUTOS.length, ...ok);
    return true;
  }


  // 2) Em seguida: busca a versão atual no servidor
  async function atualizarDoServidor() {
    if (!ONLINE) return false;
    const url = `${SB.url}/rest/v1/produtos?select=dados&ativo=eq.true&order=ordem.asc,id.asc`;
    const r = await fetch(url, { headers: { apikey: SB.anonKey } });
    if (!r.ok) throw new Error("catálogo indisponível (" + r.status + ")");
    const lista = normalizarLista((await r.json()).map((x) => x.dados)).filter(valido);
    gravar(CHAVE_CACHE, { em: Date.now(), produtos: lista });
    return aplicar(lista);
  }

  /* ---------- Configurações do site (contatos, redes, lojas, galeria) ---------- */
  const CHAVE_CFG = "policoating_config";
  const CHAVE_CFG_DEMO = "policoating_demo_config";
  const TEXTO = ["telefone", "endereco", "horario", "slogan"];
  const REDES = ["instagram", "facebook", "whatsappBusiness", "linkedin", "youtube", "tiktok"];
  const LOJAS = ["mercadolivre", "shopee", "aliexpress", "amazon", "magalu"];
  const https = (u) => typeof u === "string" && /^https:\/\/[^\s"'<>]+$/.test(u.trim()) ? u.trim() : "";

  const slugTipo = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
  const CATS_PADRAO = Object.keys(window.CATEGORIAS || {});
  /** Tipos novos (cadastrados no painel) entram na lista de tipos do site */
  function aplicarTipos(tipos) {
    const C = window.CATEGORIAS = window.CATEGORIAS || {};
    Object.keys(C).forEach((k) => { if (C[k].extra) delete C[k]; });
    (tipos || []).forEach((t) => {
      if (C[t.id]) return;
      C[t.id] = { nome: t.nome, extra: true, descricao: "", icone: "caixa", cor: "#1558d6", ideal: "", uso: "", cura: "", notas: { sol: 3, quimica: 3, corrosao: 3 }, acabamentos: [] };
    });
  }

  /** Aceita só campos conhecidos e valores no formato certo */
  function limparConfig(d) {
    d = d || {};
    const o = {};
    const zap = String(d.whatsapp || "").replace(/\D/g, "");
    if (/^\d{12,13}$/.test(zap)) o.whatsapp = zap;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email || "")) o.email = String(d.email).trim();
    TEXTO.forEach((k) => { if (typeof d[k] === "string" && d[k].trim()) o[k] = d[k].trim().slice(0, 140); });
    // telefone digitado só com números vira (16) 99630-4811
    if (o.telefone && /^[1-9]\d{9,10}$/.test(o.telefone.replace(/\D/g, "")) && !/\D/.test(o.telefone.replace(/[\s-]/g, ""))) {
      const t = o.telefone.replace(/\D/g, "");
      o.telefone = `(${t.slice(0, 2)}) ${t.slice(2, t.length - 4)}-${t.slice(-4)}`;
    }
    o.redes = {}; REDES.forEach((k) => { const u = https((d.redes || {})[k]); if (u) o.redes[k] = u; });
    o.lojas = {}; LOJAS.forEach((k) => { const u = https((d.lojas || {})[k]); if (u) o.lojas[k] = u; });
    if (Array.isArray(d.marcas)) o.marcas = [...new Set(d.marcas.map((m) => String(m || "").replace(/\s+/g, " ").trim().slice(0, 40)).filter(Boolean))].slice(0, 100);
    if (Array.isArray(d.tipos)) {
      const vistos = new Set();
      o.tipos = d.tipos.map((t) => ({ id: slugTipo(t && (t.id || t.nome)), nome: String((t && t.nome) || "").replace(/\s+/g, " ").trim().slice(0, 40) }))
        .filter((t) => t.id && t.nome && !vistos.has(t.id) && vistos.add(t.id)).slice(0, 50);
    }
    if (Array.isArray(d.galeria)) {
      o.galeria = d.galeria.filter((g) => g && typeof g.src === "string" && /^(https:\/\/|assets\/|data:image\/(jpeg|png|webp);base64,)/.test(g.src))
        .slice(0, 60).map((g) => ({ src: g.src, titulo: String(g.titulo || "").slice(0, 80), descricao: String(g.descricao || "").slice(0, 140), categoria: "ambientes" }));
    }
    return o;
  }

  let galeriaPainel = null;
  function aplicarConfig(bruto) {
    const d = limparConfig(bruto);
    const antes = JSON.stringify([CFG.whatsapp, CFG.email, CFG.redes, CFG.lojas, TEXTO.map((k) => CFG[k]), galeriaPainel]);
    ["whatsapp", "email"].concat(TEXTO).forEach((k) => { if (d[k]) CFG[k] = d[k]; });
    CFG.redes = Object.assign({}, CFG.redes, d.redes);
    CFG.lojas = Object.assign({}, CFG.lojas, d.lojas);
    if (d.galeria && d.galeria.length) galeriaPainel = d.galeria;
    const antesListas = JSON.stringify([CFG.marcas, CFG.tipos]);
    CFG.marcas = d.marcas || CFG.marcas || [];
    CFG.tipos = d.tipos || CFG.tipos || [];
    aplicarTipos(CFG.tipos);
    return antes !== JSON.stringify([CFG.whatsapp, CFG.email, CFG.redes, CFG.lojas, TEXTO.map((k) => CFG[k]), galeriaPainel]) || antesListas !== JSON.stringify([CFG.marcas, CFG.tipos]);
  }
  aplicarConfig(ONLINE ? (ler(CHAVE_CFG) || {}).dados : ler(CHAVE_CFG_DEMO));

  // 1) Na hora (depois dos tipos cadastrados no painel): lista guardada (online) ou a do painel de demonstração
  if (ONLINE) {
    const cache = ler(CHAVE_CACHE);
    if (cache && Array.isArray(cache.produtos)) aplicar(cache.produtos);
  } else {
    const demo = ler(CHAVE_DEMO);
    if (demo) aplicar(Object.values(demo).filter((r) => r.ativo).sort((a, b) => a.ordem - b.ordem).map((r) => r.dados));
  }

  // a galeria do painel substitui a de midia.js (midia.js carrega depois deste arquivo)
  document.addEventListener("DOMContentLoaded", () => { if (galeriaPainel && window.MIDIA) window.MIDIA.galeria = galeriaPainel; });

  async function configDoServidor() {
    if (!ONLINE) return false;
    const r = await fetch(`${SB.url}/rest/v1/configuracoes?select=dados&id=eq.1`, { headers: { apikey: SB.anonKey } });
    if (!r.ok) throw new Error("configurações indisponíveis (" + r.status + ")");
    const linha = (await r.json())[0];
    if (!linha) return false;
    gravar(CHAVE_CFG, { em: Date.now(), dados: linha.dados });
    return aplicarConfig(linha.dados);
  }
  configDoServidor()
    .then((mudou) => { if (mudou) document.dispatchEvent(new CustomEvent("config-atualizada")); })
    .catch((e) => console.warn("Configurações:", e.message));

  /** Depois de mexer no catálogo pelo painel: atualiza a lista usada pelo site nesta página */
  async function recarregarCatalogo() {
    try {
      if (ONLINE) await atualizarDoServidor();
      else { const demo = ler(CHAVE_DEMO) || {}; aplicar(Object.values(demo).filter((r) => r.ativo).sort((a, b) => a.ordem - b.ordem).map((r) => r.dados)); }
      document.dispatchEvent(new CustomEvent("catalogo-atualizado"));
    } catch (e) { /* segue com a lista atual */ }
  }

  const pronto = atualizarDoServidor()
    .then((mudou) => { if (mudou) document.dispatchEvent(new CustomEvent("catalogo-atualizado")); })
    .catch((e) => console.warn("Catálogo:", e.message));

  /* ---------- Painel da empresa ---------- */
  const lerDemo = () => ler(CHAVE_DEMO) || {};
  /** Chama a função equipe-email do Supabase (ações da equipe com e-mail da empresa) */
  async function funcaoEquipe(corpo) {
    const sb = await cliente();
    const { data, error } = await sb.functions.invoke("equipe-email", { body: corpo });
    if (error) {
      let msg = "";
      try { msg = (await error.context.json()).erro; } catch (e) { /* sem corpo */ }
      if (!msg && /Failed to send|fetch/i.test(String(error.message))) msg = "A função equipe-email ainda não foi publicada no Supabase (veja o README).";
      throw new Error(msg || error.message || "Não foi possível concluir. Tente de novo.");
    }
    return data || {};
  }

  const CHAVE_EQUIPE_DEMO = "policoating_demo_equipe";
  function equipeDemo() {
    let eq = ler(CHAVE_EQUIPE_DEMO);
    if (!Array.isArray(eq) || !eq.length) {
      eq = [{ email: String(window.Conta.usuario.email).toLowerCase(), papel: "admin" }];
      gravar(CHAVE_EQUIPE_DEMO, eq);
    }
    return eq;
  }
  async function cliente() {
    if (!window.Conta || !window.Conta.cliente) throw new Error("Login indisponível.");
    return window.Conta.cliente();
  }
  const erro = (e) => new Error((e && e.message) || "Não foi possível concluir. Tente novamente.");

  const Admin = {
    online: ONLINE,

    /** Cargo de quem está logado: "admin", "vendedor" ou null (sem acesso) */
    async meuPapel() {
      if (!window.Conta || !window.Conta.usuario) return null;
      if (!ONLINE) {                        // demonstração: a primeira conta logada é administradora
        const eq = equipeDemo(), eu = window.Conta.usuario.email.toLowerCase(), m = eq.find((x) => x.email === eu);
        return m ? m.papel : null;
      }
      const sb = await cliente();
      const { data, error } = await sb.rpc("meu_papel");
      if (error) {                          // banco ainda sem a PARTE G: usa a regra antiga (só administradores)
        const r = await sb.rpc("eh_admin");
        return r.data === true ? "admin" : null;
      }
      return data === "admin" || data === "vendedor" ? data : null;
    },
    async ehAdmin() { return (await this.meuPapel()) === "admin"; },
    /** Cargo e e-mail atuais direto do servidor (para perceber quando o acesso da pessoa mudou) */
    async acessoAtual() {
      if (!window.Conta || !window.Conta.usuario) return null;
      const papel = await this.meuPapel();
      if (!ONLINE) return { papel: papel || "", email: window.Conta.usuario.email };
      const sb = await cliente();
      const { data, error } = await sb.auth.getUser();
      if (error || !data || !data.user) return null;
      return { papel: papel || "", email: String(data.user.email || "") };
    },

    /* ---------- Verificação em 2 etapas (app autenticador: Google Authenticator, Microsoft Authenticator...) ---------- */
    /** Situação: { ativa: tem app cadastrado, nivel: "aal1" | "aal2", fator: id do app } */
    async estado2fa() {
      if (!ONLINE) return { ativa: true, nivel: "aal2", fator: "demo", demo: true };
      const sb = await cliente();
      const [{ data: f, error: e1 }, { data: n, error: e2 }] = await Promise.all([sb.auth.mfa.listFactors(), sb.auth.mfa.getAuthenticatorAssuranceLevel()]);
      if (e1 || e2) throw erro(e1 || e2);
      const ok = (f && f.totp || []).find((x) => x.status === "verified");
      return { ativa: !!ok, nivel: n && n.currentLevel, fator: ok ? ok.id : null };
    },
    /** Começa o cadastro do app: devolve o QR Code (imagem) e a chave para digitar à mão */
    async iniciar2fa() {
      const sb = await cliente();
      // limpa tentativas anteriores não concluídas (senão o Supabase recusa um novo cadastro)
      const { data: f } = await sb.auth.mfa.listFactors();
      for (const x of (f && f.all || []).filter((x) => x.status !== "verified")) await sb.auth.mfa.unenroll({ factorId: x.id }).catch(() => {});
      const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: "Policoating " + new Date().toISOString().slice(0, 16) });
      if (error) throw /disabled|not enabled/i.test(error.message || "") ? new Error("A verificação em 2 etapas está desligada no Supabase (Authentication → Multi-Factor → TOTP).") : erro(error);
      return { fator: data.id, qr: data.totp.qr_code, chave: data.totp.secret };
    },
    /** Confere o código de 6 dígitos do app (serve para o cadastro e para cada entrada no painel) */
    async verificar2fa(fator, codigo) {
      codigo = String(codigo || "").replace(/\D/g, "");
      if (codigo.length !== 6) throw new Error("Digite os 6 números que aparecem no aplicativo.");
      if (!ONLINE) return true;
      const sb = await cliente();
      const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: fator, code: codigo });
      if (error) throw /invalid|expired|code/i.test(error.message || "") ? new Error("Código incorreto ou vencido. Confira o horário do celular e use o código atual do aplicativo.") : erro(error);
      return true;
    },

    /** Pode excluir pedidos? Administradores sempre; os demais só com a permissão dada por um administrador. */
    /** Pode exportar a planilha de clientes? Administradores sempre; vendedores só com a permissão. */
    async podeExportarClientes() {
      const papel = await this.meuPapel();
      if (!papel) return false;
      if (papel === "admin") return true;
      if (!ONLINE) {
        const eu = window.Conta.usuario.email.toLowerCase(), m = equipeDemo().find((x) => x.email === eu);
        return !!(m && m.pode_exportar);
      }
      const { data, error } = await (await cliente()).rpc("pode_exportar_clientes");
      return !error && data === true;
    },

    async podeExcluirPedidos() {
      const papel = await this.meuPapel();
      if (!papel) return false;
      if (papel === "admin") return true;
      if (!ONLINE) {
        const eu = window.Conta.usuario.email.toLowerCase(), m = equipeDemo().find((x) => x.email === eu);
        return !!(m && m.pode_excluir);
      }
      const { data, error } = await (await cliente()).rpc("pode_excluir_pedidos");
      return !error && data === true;
    },

    /** Todos os produtos do painel, inclusive ocultos: [{ id, dados, ativo, ordem }] */
    async listar() {
      if (!ONLINE) return Object.values(lerDemo()).sort((a, b) => a.ordem - b.ordem);
      const sb = await cliente();
      const { data, error } = await sb.from("produtos").select("id, dados, ativo, ordem").order("ordem").order("id");
      if (error) throw erro(error);
      return data || [];
    },

    /** Regras do cadastro: código único, uma cor, descrição, foto (produto novo) e preço ou "a combinar" */
    validarProduto(d, novo) {
      const erros = [];
      if (!CODIGO_RE.test(d.codigo || "")) erros.push("código (2 a 30 letras, números ou hífen, ex.: POL-0101)");
      if (!d.nome || String(d.nome).trim().length < 3) erros.push("nome");
      if (!(window.CATEGORIAS || {})[d.categoria]) erros.push("tipo");
      if (!d.marca || String(d.marca).trim().length < 2) erros.push("marca");
      if (!d.descricao || String(d.descricao).trim().length < 10) erros.push("descrição (mínimo 10 caracteres)");
      if (!Array.isArray(d.cores) || d.cores.length !== 1 || !d.cores[0].nome || !/^#[0-9a-f]{6}$/i.test(d.cores[0].hex)) erros.push("cor (nome e tom)");
      const nFotos = Array.isArray(d.fotos) ? d.fotos.filter(fotoOk).length : 0;
      if (nFotos < 3) erros.push(`fotos (no mínimo 3; ${nFotos === 0 ? "nenhuma enviada" : nFotos + " enviada" + (nFotos > 1 ? "s" : "")})`);
      if (nFotos > 10) erros.push("fotos (no máximo 10)");
      if (!d.precoCombinar) {
        if (!(num(d.preco) > 0)) erros.push("preço por kg (ou marque \"Valor sob consulta\")");
        if (d.precoPromo != null && !(num(d.precoPromo) > 0 && num(d.precoPromo) < num(d.preco))) erros.push("preço promocional (menor que o preço normal)");
        if (d.promoAte && !/^\d{4}-\d{2}-\d{2}$/.test(d.promoAte)) erros.push("data do fim da promoção");
      }
      if (erros.length) throw new Error("Confira: " + erros.join(", ") + ".");
    },

    async salvar(dados, ativo, ordem, novo, tentativa = 0) {
      dados.embalagens = EMBALAGENS.slice();
      if (novo && !dados.codigo) dados.codigo = await this.proximoCodigo();
      dados.codigo = String(dados.codigo || "").trim().toUpperCase();
      dados.id = dados.codigo.toLowerCase();
      if (Array.isArray(dados.fotos) && dados.fotos.length && dados.cores && dados.cores[0]) dados.cores[0].foto = dados.fotos[0];   // capa
      this.validarProduto(dados, novo);
      if (!valido(dados)) throw new Error("Confira os campos obrigatórios: nome, linha, cor e embalagem.");
      const registro = { id: dados.id, dados, ativo: !!ativo, ordem: Number(ordem) || 0 };
      if (!ONLINE) {
        const d = lerDemo();
        if (novo && d[dados.id]) throw new Error(`Já existe um produto com o código ${dados.codigo}. Use outro código.`);
        d[dados.id] = registro; gravar(CHAVE_DEMO, d); await recarregarCatalogo(); return registro;
      }
      const sb = await cliente();
      const { error } = novo
        ? await sb.from("produtos").insert(Object.assign(registro, { atualizado_em: new Date().toISOString() }))
        : await sb.from("produtos").upsert(Object.assign(registro, { atualizado_em: new Date().toISOString() }));
      if (error && novo && tentativa < 3 && (error.code === "23505" || /duplicate key/i.test(error.message))) {
        // outra pessoa salvou um produto ao mesmo tempo: pega o próximo código livre
        dados.codigo = await this.proximoCodigo(tentativa + 1);
        return this.salvar(dados, ativo, ordem, novo, tentativa + 1);
      }
      if (error) throw (error.code === "23505" || /duplicate key/i.test(error.message) ? new Error(`Já existe um produto com o código ${dados.codigo}.`) : erro(error));
      localStorage.removeItem(CHAVE_CACHE);
      await recarregarCatalogo();
      return registro;
    },

    async excluir(id) {
      if (!ONLINE) { const d = lerDemo(); delete d[id]; gravar(CHAVE_DEMO, d); await recarregarCatalogo(); return; }
      const sb = await cliente();
      const { error } = await sb.from("produtos").delete().eq("id", id);
      if (error) throw erro(error);
      localStorage.removeItem(CHAVE_CACHE);
      await recarregarCatalogo();
    },

    /** Promoção em vários produtos: desconto em % sobre o preço por kg, com data de fim opcional.
        Administradores e vendedores podem aplicar. Produtos "a combinar" ficam de fora. */
    async aplicarPromocao(ids, percentual, ate) {
      percentual = Math.round(+percentual * 100) / 100;
      if (!(percentual >= 1 && percentual <= 90)) throw new Error("Desconto entre 1% e 90%.");
      if (ate && !/^\d{4}-\d{2}-\d{2}$/.test(ate)) throw new Error("Data de fim inválida.");
      if (ate && ate < new Date().toISOString().slice(0, 10)) throw new Error("A data de fim já passou.");
      if (!ids.length) throw new Error("Selecione os produtos.");
      if (!ONLINE) {
        if (!(await this.meuPapel())) throw new Error("Sem permissão.");
        const d = lerDemo(); let n = 0;
        ids.forEach((id) => { const r = d[id]; if (!r || r.dados.precoCombinar || !(+r.dados.preco > 0)) return;
          r.dados.precoPromo = Math.round(r.dados.preco * (1 - percentual / 100) * 100) / 100; if (ate) r.dados.promoAte = ate; else delete r.dados.promoAte; n++; });
        gravar(CHAVE_DEMO, d); await recarregarCatalogo(); return n;
      }
      const { data, error } = await (await cliente()).rpc("aplicar_promocao", { p_ids: ids, p_percentual: percentual, p_ate: ate || null });
      if (error) throw erro(/does not exist|schema cache/i.test(error.message) ? { message: "Rode a PARTE L do setup.sql no Supabase para usar promoções." } : error);
      localStorage.removeItem(CHAVE_CACHE); await recarregarCatalogo(); return data;
    },
    async removerPromocao(ids) {
      if (!ids.length) throw new Error("Selecione os produtos.");
      if (!ONLINE) {
        const d = lerDemo(); let n = 0;
        ids.forEach((id) => { const r = d[id]; if (r && r.dados.precoPromo != null) { delete r.dados.precoPromo; delete r.dados.promoAte; n++; } });
        gravar(CHAVE_DEMO, d); await recarregarCatalogo(); return n;
      }
      const { data, error } = await (await cliente()).rpc("remover_promocao", { p_ids: ids });
      if (error) throw erro(error);
      localStorage.removeItem(CHAVE_CACHE); await recarregarCatalogo(); return data;
    },
    /** Alteração em vários produtos (administrador): muda cada um com a função e salva. Retorna { ok, falhas } */
    async alterarEmMassa(ids, mudar) {
      const regs = await this.listar(), falhas = [];
      let ok = 0;
      for (const id of ids) {
        const r = regs.find((x) => x.id === id); if (!r) continue;
        const copia = JSON.parse(JSON.stringify(r));
        mudar(copia);
        try { await this.salvar(copia.dados, copia.ativo, copia.ordem, false); ok++; }
        catch (e) { falhas.push(`${r.dados.codigo || id}: ${e.message}`); }
      }
      return { ok, falhas };
    },
    async excluirVarios(ids) {
      if (!ONLINE) { const d = lerDemo(); ids.forEach((id) => delete d[id]); gravar(CHAVE_DEMO, d); await recarregarCatalogo(); return ids.length; }
      const { error } = await (await cliente()).from("produtos").delete().in("id", ids);
      if (error) throw erro(error);
      localStorage.removeItem(CHAVE_CACHE); await recarregarCatalogo(); return ids.length;
    },

    /** Produtos salvos no formato antigo (várias cores): converte para um produto por cor, com código novo */
    async converterCores() {
      const regs = await this.listar(), antigos = regs.filter((r) => (r.dados.cores || []).length > 1);
      if (!antigos.length) return 0;
      const usados = new Set(regs.map((r) => r.id));
      let n = 0;
      const proximo = () => { let c; do { c = "POL-" + String(++n).padStart(4, "0"); } while (usados.has(c.toLowerCase())); usados.add(c.toLowerCase()); return c; };
      const novos = [];
      antigos.forEach((r) => r.dados.cores.forEach((c, i) => {
        const codigo = proximo();
        novos.push({ id: codigo.toLowerCase(), ativo: r.ativo, ordem: (Number(r.ordem) || 0) + i / 100,
          dados: Object.assign({}, r.dados, { id: codigo.toLowerCase(), codigo, familia: r.dados.familia || r.id, nome: `${r.dados.nome} ${c.nome}`, cores: [c], destaque: !!r.dados.destaque && i === 0,
            precoCombinar: r.dados.preco ? false : true }) });
      }));
      if (!ONLINE) {
        const d = lerDemo(); antigos.forEach((r) => delete d[r.id]); novos.forEach((r) => (d[r.id] = r)); gravar(CHAVE_DEMO, d); await recarregarCatalogo(); return novos.length;
      }
      const sb = await cliente();
      const ins = await sb.from("produtos").insert(novos.map((r) => Object.assign(r, { atualizado_em: new Date().toISOString() })));
      if (ins.error) throw erro(ins.error);
      const del = await sb.from("produtos").delete().in("id", antigos.map((r) => r.id));
      if (del.error) throw erro(del.error);
      localStorage.removeItem(CHAVE_CACHE);
      await recarregarCatalogo();
      return novos.length;
    },

    /** Reduz a foto (máx. 1200 px, JPEG) e envia. Retorna o endereço público. */
    async enviarFoto(arquivo, idProduto) {
      const nome = String(arquivo.name || "").toLowerCase();
      const ehFoto = /^image\//.test(arquivo.type) || /\.(jpe?g|png|webp|heic|heif)$/.test(nome);
      if (!ehFoto) throw new Error(`"${arquivo.name}" não é uma foto. Use JPG, PNG ou WEBP.`);
      if (arquivo.size > 20 * 1024 * 1024) throw new Error(`"${arquivo.name}" é muito grande (máx. 20 MB).`);
      let blob;
      try { blob = await reduzir(arquivo, 1400); }   // sempre vira JPEG (inclusive fotos HEIC do iPhone, quando o navegador abre)
      catch (e) {
        throw new Error(/heic|heif/.test(nome + arquivo.type)
          ? `"${arquivo.name}" está no formato HEIC do iPhone, que este navegador não abre. No iPhone, vá em Ajustes > Câmera > Formatos > "Mais Compatível", ou envie a foto por outro navegador (Safari).`
          : `Não foi possível abrir "${arquivo.name}". Tente salvar a foto como JPG.`);
      }
      if (!ONLINE) return await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(blob); });
      const sb = await cliente();
      const caminho = `${String(idProduto || "novo").toLowerCase()}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
      const { error } = await sb.storage.from("produtos").upload(caminho, blob, { contentType: "image/jpeg", upsert: false });
      if (error) {
        const m = String(error.message || "");
        if (/bucket not found/i.test(m)) throw new Error("A pasta de fotos não existe no Supabase: rode a PARTE D do setup.sql.");
        if (/row-level security|unauthorized|403/i.test(m)) throw new Error("Sem permissão para enviar fotos: só administradores enviam fotos (confira a PARTE L do setup.sql).");
        if (/exceeded|too large|413/i.test(m)) throw new Error("Foto grande demais para o armazenamento.");
        throw erro(error);
      }
      return sb.storage.from("produtos").getPublicUrl(caminho).data.publicUrl;
    },

    /** Configurações atuais do site (valores efetivos, para preencher o formulário) */
    async lerConfig() {
      let salvo = {};
      if (ONLINE) {
        const sb = await cliente();
        const { data } = await sb.from("configuracoes").select("dados").eq("id", 1).maybeSingle();
        salvo = (data && data.dados) || {};
      } else salvo = ler(CHAVE_CFG_DEMO) || {};
      const atual = limparConfig(salvo);
      return {
        whatsapp: atual.whatsapp || CFG.whatsapp, email: atual.email || CFG.email,
        telefone: atual.telefone || CFG.telefone, endereco: atual.endereco || CFG.endereco,
        horario: atual.horario || CFG.horario, slogan: atual.slogan || CFG.slogan,
        redes: Object.assign({}, CFG.redes, atual.redes), lojas: Object.assign({}, CFG.lojas, atual.lojas),
        galeria: atual.galeria || ((window.MIDIA || {}).galeria || []).map((g) => ({ src: g.src, titulo: g.titulo || "", descricao: g.descricao || "" })),
        marcas: atual.marcas && atual.marcas.length ? atual.marcas : ["Policoating"],
        tipos: atual.tipos || [],
      };
    },
    /** Marcas e tipos de produto: cadastro rápido pelo formulário de produto (administrador) */
    async adicionarMarca(nome) {
      nome = String(nome || "").replace(/\s+/g, " ").trim().slice(0, 40);
      if (nome.length < 2) throw new Error("Informe o nome da marca.");
      const cfg = await this.lerConfig();
      if (cfg.marcas.some((m) => m.toLowerCase() === nome.toLowerCase())) return cfg.marcas.find((m) => m.toLowerCase() === nome.toLowerCase());
      cfg.marcas.push(nome); await this.salvarConfig(cfg); return nome;
    },
    async adicionarTipo(nome) {
      nome = String(nome || "").replace(/\s+/g, " ").trim().slice(0, 40);
      const id = slugTipo(nome);
      if (!id) throw new Error("Informe o nome do tipo.");
      if ((window.CATEGORIAS || {})[id]) return id;
      const cfg = await this.lerConfig();
      cfg.tipos.push({ id, nome }); await this.salvarConfig(cfg); return id;
    },
    /** Próximo código livre (POL-0001, POL-0002...) — gerado pelo sistema */
    async proximoCodigo(extra = 0) {
      const regs = await this.listar();
      const max = regs.reduce((m, r) => { const k = /^pol-(\d+)$/.exec(r.id); return k ? Math.max(m, +k[1]) : m; }, 0);
      return "POL-" + String(max + 1 + extra).padStart(4, "0");
    },

    async salvarConfig(bruto) {
      const d = limparConfig(bruto);
      if (!d.whatsapp) throw new Error("WhatsApp inválido: use 55 + DDD + número, só dígitos (ex.: 5516996304811).");
      if (!ONLINE) { gravar(CHAVE_CFG_DEMO, d); aplicarConfig(d); return d; }
      const sb = await cliente();
      const { error } = await sb.from("configuracoes").upsert({ id: 1, dados: d, atualizado_em: new Date().toISOString() });
      if (error) throw erro(error);
      localStorage.removeItem(CHAVE_CFG);
      aplicarConfig(d);
      return d;
    },

    /** Equipe: e-mails com acesso e o cargo de cada um */
    async listarEquipe() {
      if (!ONLINE) return equipeDemo();
      const sb = await cliente();
      let r = await sb.from("admins").select("email, papel, pode_excluir, pode_exportar").order("email");
      if (r.error) r = await sb.from("admins").select("email, papel, pode_excluir").order("email");   // sem a PARTE I ainda
      if (r.error) r = await sb.from("admins").select("email, papel").order("email");   // sem a PARTE G ainda
      if (r.error) r = await sb.from("admins").select("email").order("email");          // sem a PARTE F ainda
      if (r.error) throw erro(r.error);
      return (r.data || []).map((x) => ({ email: x.email, papel: x.papel || "admin", pode_excluir: !!x.pode_excluir, pode_exportar: !!x.pode_exportar }));
    },
    async salvarMembro(email, papel) {
      email = String(email || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-mail inválido.");
      if (!["admin", "vendedor"].includes(papel)) throw new Error("Escolha o cargo.");
      if (email === String(window.Conta.usuario.email).toLowerCase() && papel !== "admin") throw new Error("Você não pode tirar o seu próprio cargo de administrador.");
      if (!ONLINE) {
        const eq = equipeDemo(), m = eq.find((x) => x.email === email);
        if (m) m.papel = papel; else eq.push({ email, papel, pode_excluir: false });
        gravar(CHAVE_EQUIPE_DEMO, eq); return;
      }
      const sb = await cliente();
      const { error } = await sb.from("admins").upsert({ email, papel });
      if (error) throw erro(error);
    },
    /** Dá ou tira de um membro a permissão de excluir pedidos (só administradores) */
    async permitirExcluir(email, sim) { return this.permitir(email, "pode_excluir", sim); },
    /** Liga ou desliga uma permissão extra de um membro: "pode_excluir" (pedidos) ou "pode_exportar" (clientes) */
    async permitir(email, campo, sim) {
      if (!["pode_excluir", "pode_exportar"].includes(campo)) throw new Error("Permissão desconhecida.");
      email = String(email || "").trim().toLowerCase();
      if (!ONLINE) {
        const eq = equipeDemo(), m = eq.find((x) => x.email === email);
        if (m) { m[campo] = !!sim; gravar(CHAVE_EQUIPE_DEMO, eq); }
        return;
      }
      const sb = await cliente();
      const { error } = await sb.from("admins").update({ [campo]: !!sim }).eq("email", email);
      if (error) throw erro(new RegExp(campo).test(error.message) ? { message: `Rode a PARTE ${{ pode_excluir: "G", pode_exportar: "I" }[campo]} do setup.sql no Supabase para usar esta permissão.` } : error);
    },

    /** Clientes cadastrados, com o resumo das compras: pedidos, kg e data do último pedido */
    async listarClientes() {
      const kgDe = (itens) => (itens || []).reduce((s, it) => s + (window.ColorWeg ? window.ColorWeg.kgDoItem({ embalagem: it.embalagem, qtd: +it.qtd || 0 }) : 0), 0);
      const resumir = (c, pedidos) => Object.assign({}, c, {
        pedidos: pedidos.length,
        kg: pedidos.reduce((s, p) => s + kgDe(p.itens), 0),
        ultimo_pedido: pedidos.map((p) => p.criado_em).sort().pop() || null
      });
      if (!ONLINE) {
        const perfis = ler("policoating_demo_perfis") || {}, todos = ler("policoating_demo_pedidos") || {};
        return Object.entries(perfis).filter(([, c]) => c && c.tipo)
          .map(([email, c]) => resumir(Object.assign({ email }, c), todos[email] || []));
      }
      const sb = await cliente();
      const [rc, rp] = await Promise.all([
        sb.from("clientes").select("*").order("criado_em", { ascending: false }).limit(5000),
        sb.from("pedidos").select("cliente_id, criado_em, itens").limit(20000)
      ]);
      if (rc.error) throw erro(rc.error);
      const porCliente = {};
      (rp.data || []).forEach((p) => (porCliente[p.cliente_id] = porCliente[p.cliente_id] || []).push(p));
      return (rc.data || []).map((c) => resumir(c, porCliente[c.id] || []));
    },
    /** Exclui a conta e o cadastro do cliente (só administradores). Os pedidos ficam no histórico, a não ser que apagarPedidos. */
    async excluirCliente(c, apagarPedidos) {
      if (!ONLINE) {
        const email = String(c.email || "").toLowerCase(), perfis = ler("policoating_demo_perfis") || {}, todos = ler("policoating_demo_pedidos") || {};
        if (equipeDemo().some((m) => m.email === email)) throw new Error("Essa pessoa é da equipe. Tire da equipe antes de excluir.");
        delete perfis[email]; gravar("policoating_demo_perfis", perfis);
        if (apagarPedidos) { delete todos[email]; gravar("policoating_demo_pedidos", todos); }
        return;
      }
      const sb = await cliente();
      const { error } = await sb.rpc("excluir_cliente", { p_id: c.id, p_apagar_pedidos: !!apagarPedidos });
      if (error) {
        const m = String(error.message || "");
        if (/function.*excluir_cliente|schema cache/i.test(m)) throw new Error("Para excluir clientes, rode a PARTE P do setup.sql no Supabase.");
        throw new Error(m || "Não foi possível excluir.");
      }
    },
    /* ---------- Bloqueio e suspensão de clientes (PARTE M do setup.sql) ---------- */
    /** Bloqueios em vigor (sem os encerrados e as suspensões vencidas) */
    async listarBloqueios() {
      const vigente = (b) => !b.encerrado_em && (!b.ate || new Date(b.ate) > new Date());
      if (!ONLINE) return (ler("policoating_demo_bloqueios") || []).filter(vigente);
      const sb = await cliente();
      const { data, error } = await sb.from("bloqueios").select("*").is("encerrado_em", null).order("criado_em", { ascending: false }).limit(2000);
      if (error) {
        if (/bloqueios|schema cache|does not exist/i.test(error.message || "")) throw new Error("Para bloquear clientes, rode a PARTE M do setup.sql no Supabase.");
        throw erro(error);
      }
      return (data || []).filter(vigente);
    },
    /** Suspende (dias) ou bloqueia sem prazo (dias vazio) a conta, o e-mail e o CPF/CNPJ do cliente */
    async bloquearCliente(c, dias, motivo) {
      motivo = String(motivo || "").replace(/\s+/g, " ").trim().slice(0, 300);
      if (motivo.length < 5) throw new Error("Escreva o motivo (para a equipe saber por que o cliente foi bloqueado).");
      const ate = +dias > 0 ? new Date(Date.now() + +dias * 864e5).toISOString() : null;
      const documento = String((c.tipo === "pj" ? c.cnpj : c.cpf) || "").replace(/\D/g, "") || null;
      const reg = { cliente_id: c.id || null, email: String(c.email || "").toLowerCase() || null, documento, motivo, ate };
      if (!ONLINE) {
        const t = ler("policoating_demo_bloqueios") || [];
        t.unshift(Object.assign({ id: Date.now(), criado_em: new Date().toISOString(), criado_por: String(window.Conta.usuario.email), encerrado_em: null }, reg));
        gravar("policoating_demo_bloqueios", t); return;
      }
      const sb = await cliente();
      const { error } = await sb.from("bloqueios").insert(reg);
      if (error) throw /row-level security|permission/i.test(error.message || "") ? new Error("Só administradores podem bloquear clientes.") : erro(error);
    },
    /** Encerra os bloqueios em vigor de um cliente */
    async desbloquearCliente(ids) {
      ids = [].concat(ids).filter((x) => x != null);
      if (!ids.length) return;
      const quem = String(window.Conta.usuario.email).toLowerCase(), agora = new Date().toISOString();
      if (!ONLINE) {
        const t = ler("policoating_demo_bloqueios") || [];
        t.forEach((b) => { if (ids.includes(b.id)) { b.encerrado_em = agora; b.encerrado_por = quem; } });
        gravar("policoating_demo_bloqueios", t); return;
      }
      const sb = await cliente();
      const { error } = await sb.from("bloqueios").update({ encerrado_em: agora, encerrado_por: quem }).in("id", ids);
      if (error) throw erro(error);
    },

    /** Domínio dos e-mails da empresa (config.js: dominioEquipe) */
    dominioEquipe() { return String(CFG.dominioEquipe || "policoatingtintas.com.br").toLowerCase(); },

    /** Troca o login de um membro da equipe para o e-mail da empresa (só administradores).
        Online: função equipe-email do Supabase, que também avisa a pessoa por e-mail. */
    async definirEmailEmpresa(atual, novo) {
      atual = String(atual || "").trim().toLowerCase();
      novo = String(novo || "").trim().toLowerCase();
      const dominio = this.dominioEquipe();
      if (!/^[^\s@*]+@[^\s@]+\.[^\s@]+$/.test(novo)) throw new Error("E-mail inválido.");
      if (!novo.endsWith("@" + dominio)) throw new Error(`O e-mail da empresa precisa terminar em @${dominio}.`);
      if (novo === atual) throw new Error("Esse já é o e-mail de acesso dessa pessoa.");
      if (!ONLINE) {
        const eq = equipeDemo();
        if (eq.some((x) => x.email === novo)) throw new Error("Esse e-mail da empresa já está na equipe.");
        const m = eq.find((x) => x.email === atual); if (!m) throw new Error("Essa pessoa não está na equipe.");
        m.email = novo; gravar(CHAVE_EQUIPE_DEMO, eq);
        const perfis = ler("policoating_demo_perfis") || {}, pedidos = ler("policoating_demo_pedidos") || {};
        if (perfis[atual]) { perfis[novo] = Object.assign(perfis[atual], { email: novo }); delete perfis[atual]; gravar("policoating_demo_perfis", perfis); }
        if (pedidos[atual]) { pedidos[novo] = pedidos[atual]; delete pedidos[atual]; gravar("policoating_demo_pedidos", pedidos); }
        const sessao = ler("policoating_demo_sessao");
        if (sessao && String(sessao.email).toLowerCase() === atual) gravar("policoating_demo_sessao", Object.assign(sessao, { email: novo }));
        return { ok: true, novo, aviso: "demonstração" };
      }
      return funcaoEquipe({ acao: "trocar", atual, novo });
    },

    /** Adiciona à equipe com e-mail da empresa: cria o apelido nome@dominio -> e-mail pessoal
        (ImprovMX, pela função equipe-email) e manda boas-vindas para o e-mail pessoal. */
    async adicionarMembroEmpresa(apelido, pessoal, papel) {
      const dominio = this.dominioEquipe();
      apelido = String(apelido || "").trim().toLowerCase().replace(/@.*$/, "");
      pessoal = String(pessoal || "").trim().toLowerCase();
      if (!/^[a-z0-9][a-z0-9._-]{0,40}$/.test(apelido)) throw new Error("Nome do e-mail inválido. Use letras, números, ponto, hífen ou sublinhado (ex.: joao.silva).");
      if (!/^[^\s@*]+@[^\s@]+\.[^\s@]+$/.test(pessoal)) throw new Error("Digite o e-mail pessoal da pessoa (onde chegam os códigos).");
      if (pessoal.endsWith("@" + dominio)) throw new Error(`O e-mail pessoal precisa ser a caixa de verdade da pessoa (Gmail, Outlook...), não um @${dominio}.`);
      if (!["admin", "vendedor"].includes(papel)) throw new Error("Escolha o cargo.");
      const email = `${apelido}@${dominio}`;
      if (!ONLINE) {
        const eq = equipeDemo();
        if (eq.some((x) => x.email === email)) throw new Error(`${email} já está na equipe.`);
        eq.push({ email, papel, pode_excluir: false, pessoal }); gravar(CHAVE_EQUIPE_DEMO, eq);
        return { ok: true, email, aviso: "demonstração" };
      }
      return funcaoEquipe({ acao: "adicionar", apelido, pessoal, papel });
    },

    async removerMembro(email) {
      if (String(email).toLowerCase() === String(window.Conta.usuario.email).toLowerCase()) throw new Error("Você não pode remover o seu próprio acesso.");
      if (!ONLINE) { gravar(CHAVE_EQUIPE_DEMO, equipeDemo().filter((x) => x.email !== email)); return {}; }
      // e-mail da empresa: a função também apaga o apelido do ImprovMX
      if (String(email).toLowerCase().endsWith("@" + this.dominioEquipe())) {
        try { return await funcaoEquipe({ acao: "remover", email }); }
        catch (e) { if (!/não foi publicada/.test(e.message)) throw e; }   // sem a função: remove só da equipe
      }
      const sb = await cliente();
      const { error } = await sb.from("admins").delete().eq("email", email);
      if (error) throw erro(error);
      return {};
    },

    /** Pedidos feitos pelo site, com os dados do cliente (mais recentes primeiro).
        Com "termo" em formato de código (PC-...), busca também direto no banco, em todo o histórico. */
    async listarPedidos(termo) {
      if (!ONLINE) {
        const todos = ler("policoating_demo_pedidos") || {}, perfis = ler("policoating_demo_perfis") || {};
        return Object.entries(todos).flatMap(([email, lista]) => lista.map((p) => Object.assign({}, p, { cliente: perfis[email] || { email } })))
          .sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)));
      }
      const sb = await cliente();
      const { data, error } = await sb.from("pedidos").select("*").order("criado_em", { ascending: false }).limit(1000);
      if (error) throw erro(error);
      let pedidos = data || [];
      const codigo = String(termo || "").trim().toUpperCase();
      if (/^PC-/.test(codigo) && !pedidos.some((p) => p.numero.includes(codigo))) {
        const r = await sb.from("pedidos").select("*").ilike("numero", `%${codigo.replace(/[%_]/g, "")}%`).limit(50);
        pedidos = (r.data || []).concat(pedidos);
      }
      const ids = [...new Set(pedidos.map((p) => p.cliente_id))];
      let clientes = [];
      if (ids.length) { const r = await sb.from("clientes").select("*").in("id", ids); clientes = r.data || []; }
      const porId = Object.fromEntries(clientes.map((c) => [c.id, c]));
      return pedidos.map((p) => Object.assign({}, p, { cliente: porId[p.cliente_id] || p.cliente_dados || {} }));
    },

    /** Pedidos de um período (de/até em "AAAA-MM-DD", horário de Brasília), com os dados do cliente — para os relatórios */
    async pedidosPeriodo(de, ate) {
      const ini = new Date(de + "T00:00:00-03:00").toISOString(), fim = new Date(ate + "T23:59:59.999-03:00").toISOString();
      if (!ONLINE) return (await this.listarPedidos()).filter((p) => p.criado_em >= ini && p.criado_em <= fim);
      const sb = await cliente(), pedidos = [];
      for (let de0 = 0; de0 < 20000; de0 += 1000) {
        const { data, error } = await sb.from("pedidos").select("*").gte("criado_em", ini).lte("criado_em", fim).order("criado_em", { ascending: true }).range(de0, de0 + 999);
        if (error) throw erro(error);
        pedidos.push(...(data || []));
        if (!data || data.length < 1000) break;
      }
      const ids = [...new Set(pedidos.map((p) => p.cliente_id).filter(Boolean))], clientes = [];
      for (let i = 0; i < ids.length; i += 200) {
        const { data } = await sb.from("clientes").select("*").in("id", ids.slice(i, i + 200));
        clientes.push(...(data || []));
      }
      const porId = Object.fromEntries(clientes.map((c) => [c.id, c]));
      return pedidos.map((p) => Object.assign({}, p, { cliente: porId[p.cliente_id] || p.cliente_dados || {} }));
    },

    /** Cópia de segurança: todas as tabelas que o administrador pode ler, num objeto só (vira um arquivo .json) */
    async backupCompleto() {
      const copia = { gerado_em: new Date().toISOString(), site: location.hostname, tabelas: {} };
      if (!ONLINE) {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (/^policoating_demo_/.test(k)) copia.tabelas[k] = ler(k);
        }
        return copia;
      }
      const sb = await cliente();
      const tabelas = ["produtos", "pedidos", "clientes", "configuracoes", "admins", "notas_entrada", "bloqueios", "newsletter",
        "pedido_mensagens", "pedido_solicitacoes", "vendas", "estoque_movimentos", "estoque_minimos"];
      for (const t of tabelas) {
        const linhas = [];
        for (let de0 = 0; de0 < 100000; de0 += 1000) {
          const { data, error } = await sb.from(t).select("*").range(de0, de0 + 999);
          if (error) { copia.tabelas[t] = { erro: /does not exist|schema cache/i.test(error.message || "") ? "tabela não existe" : error.message }; break; }
          linhas.push(...(data || []));
          if (!data || data.length < 1000) { copia.tabelas[t] = linhas; break; }
        }
      }
      return copia;
    },

    /** Quantos pedidos chegaram depois de uma data (alerta de pedido novo no painel) */
    async contarPedidosDesde(desde) {
      if (!ONLINE) {
        const todos = ler("policoating_demo_pedidos") || {};
        return Object.values(todos).flat().filter((p) => !desde || String(p.criado_em) > desde).length;
      }
      const sb = await cliente();
      let q = sb.from("pedidos").select("id", { count: "exact", head: true });
      if (desde) q = q.gt("criado_em", desde);
      const { count, error } = await q;
      if (error) throw erro(error);
      return count || 0;
    },

    /** Data do pedido mais recente (hora do servidor), para marcar os pedidos como vistos */
    async ultimoPedidoEm() {
      if (!ONLINE) {
        const todos = Object.values(ler("policoating_demo_pedidos") || {}).flat();
        return todos.reduce((m, p) => (String(p.criado_em) > m ? String(p.criado_em) : m), "");
      }
      const sb = await cliente();
      const { data, error } = await sb.from("pedidos").select("criado_em").order("criado_em", { ascending: false }).limit(1);
      if (error) throw erro(error);
      return (data && data[0] && data[0].criado_em) || "";
    },

    /** Exclui um pedido (quem tem a permissão). Some também de "Minha conta" do cliente. */
    async excluirPedido(numero) {
      if (!(await this.podeExcluirPedidos())) throw new Error("Você não tem permissão para excluir pedidos. Peça a um administrador.");
      if (!ONLINE) {
        const todos = ler("policoating_demo_pedidos") || {};
        Object.keys(todos).forEach((k) => { todos[k] = todos[k].filter((p) => p.numero !== numero); });
        gravar("policoating_demo_pedidos", todos); return;
      }
      const sb = await cliente();
      const { data, error } = await sb.from("pedidos").delete().eq("numero", numero).select("numero");
      if (error) throw erro(error);
      if (!data || !data.length) throw new Error("O pedido não foi excluído (sem permissão no banco — rode a PARTE G do setup.sql).");
    },

    /** Envia um PDF (ficha técnica) e retorna o endereço público */
    async enviarPdf(arquivo, pasta) {
      if (arquivo.type !== "application/pdf") throw new Error("Envie a ficha técnica em PDF.");
      if (arquivo.size > 10 * 1024 * 1024) throw new Error("PDF muito grande (máx. 10 MB).");
      if (!ONLINE) throw new Error("No modo demonstração não dá para enviar PDF. Ative o Supabase.");
      const sb = await cliente();
      const caminho = `${pasta}/ficha-${Date.now()}.pdf`;
      const { error } = await sb.storage.from("produtos").upload(caminho, arquivo, { contentType: "application/pdf", upsert: false });
      if (error) throw erro(error);
      return sb.storage.from("produtos").getPublicUrl(caminho).data.publicUrl;
    },

    /* ---------- Notas de entrada (arquivos das NFs de compra) ---------- */
    async listarNotas() {
      if (!ONLINE) return ler("policoating_demo_notas") || [];
      const sb = await cliente();
      const { data, error } = await sb.from("notas_entrada").select("*").order("criado_em", { ascending: false }).limit(3000);
      if (error) {
        if (/notas_entrada|schema cache|does not exist/i.test(error.message || "")) throw new Error("Para guardar notas de entrada, rode a PARTE N do setup.sql no Supabase.");
        throw erro(error);
      }
      return data || [];
    },
    /** Guarda a nota: envia os arquivos (pasta privada) e grava lote, NF e fornecedor */
    async salvarNota(campos, arquivos) {
      const limpo = (v, max) => String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, max);
      const reg = {
        lote: limpo(campos.lote, 80), nf: limpo(campos.nf, 40), fornecedor: limpo(campos.fornecedor, 120),
        fornecedor_codigo: limpo(campos.fornecedor_codigo, 40) || null, obs: limpo(campos.obs, 500) || null,
        data_nf: /^\d{4}-\d{2}-\d{2}$/.test(campos.data_nf || "") ? campos.data_nf : null,
      };
      if (!reg.lote) throw new Error("Informe o lote (cor ou código).");
      if (!reg.nf) throw new Error("Informe o número da NF.");
      if (reg.fornecedor.length < 2) throw new Error("Informe o fornecedor.");
      const lista = Array.from(arquivos || []);
      if (!lista.length) throw new Error("Escolha pelo menos um arquivo da nota (PDF, planilha, XML ou foto).");
      if (lista.length > 5) throw new Error("No máximo 5 arquivos por nota.");
      const info = lista.map((f) => {
        const t = tipoNota(f);
        if (!t) throw new Error(`"${f.name}" não é aceito. Use PDF, XLSX, XLS, CSV, XML, JPG ou PNG.`);
        if (f.size > 15 * 1024 * 1024) throw new Error(`"${f.name}" passa de 15 MB.`);
        if (!f.size) throw new Error(`"${f.name}" está vazio.`);
        return { arq: f, tipo: t.mime, nome: nomeSeguro(f.name, t.ext) };
      });
      if (!ONLINE) {
        const lidos = [];
        for (const x of info) {
          if (x.arq.size > 2 * 1024 * 1024) throw new Error("No modo demonstração, só arquivos de até 2 MB.");
          lidos.push({ caminho: "demo/" + x.nome, nome: x.nome, tipo: x.tipo, tamanho: x.arq.size, dados: await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(x.arq); }) });
        }
        const t = ler("policoating_demo_notas") || [];
        const nota = Object.assign({ id: Date.now(), criado_em: new Date().toISOString(), criado_por: String(window.Conta.usuario.email).toLowerCase(), arquivos: lidos }, reg);
        t.unshift(nota); gravar("policoating_demo_notas", t); return nota;
      }
      const sb = await cliente(), agora = new Date();
      const pasta = `${agora.getFullYear()}/${String(agora.getMonth() + 1).padStart(2, "0")}`;
      const enviados = [];
      try {
        for (const x of info) {
          const caminho = `${pasta}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${x.nome}`;
          const { error } = await sb.storage.from("notas").upload(caminho, x.arq, { contentType: x.tipo, upsert: false });
          if (error) {
            const m = String(error.message || "");
            if (/bucket not found|row-level security|unauthorized|403/i.test(m)) throw new Error("A pasta das notas não está pronta: rode a PARTE N do setup.sql no Supabase.");
            if (/exceeded|too large|413/i.test(m)) throw new Error(`"${x.nome}" é grande demais para o armazenamento.`);
            throw erro(error);
          }
          enviados.push({ caminho, nome: x.nome, tipo: x.tipo, tamanho: x.arq.size });
        }
        const { data, error } = await sb.from("notas_entrada").insert(Object.assign({ arquivos: enviados }, reg)).select().single();
        if (error) throw /notas_entrada|schema cache/i.test(error.message || "") ? new Error("Rode a PARTE N do setup.sql no Supabase.") : erro(error);
        return data;
      } catch (e) {
        if (enviados.length) await sb.storage.from("notas").remove(enviados.map((x) => x.caminho)).catch(() => {});
        throw e;
      }
    },
    /** Link temporário (5 min) para abrir ou baixar um arquivo da nota (a pasta é privada) */
    async linkArquivoNota(arq, baixar) {
      if (!ONLINE) return arq.dados || "";
      const sb = await cliente();
      const { data, error } = await sb.storage.from("notas").createSignedUrl(arq.caminho, 300, baixar ? { download: arq.nome } : undefined);
      if (error) throw erro(error);
      return data.signedUrl;
    },
    /** Exclui a nota e os arquivos dela (só administradores) */
    async excluirNota(nota) {
      if (!ONLINE) { gravar("policoating_demo_notas", (ler("policoating_demo_notas") || []).filter((n) => n.id !== nota.id)); return; }
      const sb = await cliente();
      const { data, error } = await sb.from("notas_entrada").delete().eq("id", nota.id).select("id");
      if (error) throw erro(error);
      if (!data || !data.length) throw new Error("Só administradores podem excluir notas.");
      const caminhos = (nota.arquivos || []).map((a) => a.caminho).filter(Boolean);
      if (caminhos.length) await sb.storage.from("notas").remove(caminhos).catch(() => {});
    },

    /** Envia o vídeo do produto (MP4/WEBM/MOV até 50 MB) e retorna o endereço público */
    async enviarVideo(arquivo, pasta) {
      const nome = String(arquivo.name || "").toLowerCase(), ext = (nome.match(/\.(mp4|webm|mov|m4v)$/) || [])[1];
      const tipos = { mp4: "video/mp4", m4v: "video/mp4", webm: "video/webm", mov: "video/quicktime" };
      const tipo = /^video\/(mp4|webm|quicktime)$/.test(arquivo.type) ? arquivo.type : tipos[ext];
      if (!tipo) throw new Error(`"${arquivo.name}" não é um vídeo aceito. Use MP4 (ou WEBM/MOV).`);
      if (arquivo.size > 50 * 1024 * 1024) throw new Error("Vídeo grande demais (máx. 50 MB). Envie pelo YouTube e cole o link.");
      if (!ONLINE) throw new Error("No modo demonstração não dá para enviar vídeo. Cole um link do YouTube.");
      const sb = await cliente();
      const caminho = `${String(pasta || "novo").toLowerCase()}/video-${Date.now()}.${tipo === "video/webm" ? "webm" : tipo === "video/quicktime" ? "mov" : "mp4"}`;
      const { error } = await sb.storage.from("produtos").upload(caminho, arquivo, { contentType: tipo, upsert: false });
      if (error) {
        const m = String(error.message || "");
        if (/mime|not supported|invalid/i.test(m)) throw new Error("O armazenamento ainda não aceita vídeos: rode a PARTE N do setup.sql no Supabase.");
        if (/exceeded|too large|413/i.test(m)) throw new Error("Vídeo grande demais para o armazenamento (máx. 50 MB). Use um link do YouTube.");
        throw erro(error);
      }
      return sb.storage.from("produtos").getPublicUrl(caminho).data.publicUrl;
    },

    valido,
  };

  /** Tipos aceitos nas notas de entrada (pela extensão, que é mais confiável que o tipo informado pelo navegador) */
  const TIPOS_NOTA = {
    pdf: "application/pdf", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", xls: "application/vnd.ms-excel",
    csv: "text/csv", xml: "text/xml", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
  };
  function tipoNota(f) {
    const ext = (String(f.name || "").toLowerCase().match(/\.([a-z0-9]+)$/) || [])[1];
    return ext && TIPOS_NOTA[ext] ? { ext: ext === "jpeg" ? "jpg" : ext, mime: TIPOS_NOTA[ext] } : null;
  }
  function nomeSeguro(nome, ext) {
    const base = String(nome || "arquivo").replace(/\.[^.]*$/, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^[-.]+|[-.]+$/g, "").slice(0, 60) || "arquivo";
    return `${base}.${ext}`;
  }

  function reduzir(arquivo, max) {
    return new Promise((ok, falha) => {
      const img = new Image(), url = URL.createObjectURL(arquivo);
      img.onload = () => {
        const esc = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * esc); c.height = Math.round(img.height * esc);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob((b) => (b ? ok(b) : falha(new Error("Não foi possível ler a foto."))), "image/jpeg", 0.86);
      };
      img.onerror = () => { URL.revokeObjectURL(url); falha(new Error("Não foi possível ler a foto.")); };
      img.src = url;
    });
  }

  window.Catalogo = { pronto, atualizar: atualizarDoServidor, Admin, REDES, LOJAS, desmembrar, CODIGO_RE, EMBALAGENS };
})();
