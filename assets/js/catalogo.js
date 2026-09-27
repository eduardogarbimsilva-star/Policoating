/* =========================================================
   Policoating — Catálogo e configurações gerenciáveis pelo painel
   - Os produtos cadastrados no painel da empresa (admin.html) ficam no
     Supabase (tabela "produtos") e substituem a lista de produtos.js.
   - Enquanto a tabela estiver vazia ou sem conexão, o site usa produtos.js.
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
  const PADRAO = JSON.parse(JSON.stringify(window.PRODUTOS || []));

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

  /** Confere o formato mínimo para o site conseguir exibir o produto */
  function valido(p) {
    return !!(p && typeof p.id === "string" && /^[a-z0-9-]{2,60}$/.test(p.id) && p.nome && (window.CATEGORIAS || {})[p.categoria] &&
      Array.isArray(p.cores) && p.cores.length && p.cores.every((c) => c && c.nome && /^#[0-9a-f]{6}$/i.test(c.hex) &&
        (!c.foto || /^(https:\/\/|data:image\/(jpeg|png|webp);base64,|assets\/)/.test(c.foto))) &&
      Array.isArray(p.embalagens) && p.embalagens.length && (!p.ficha || /^https:\/\//.test(p.ficha)) &&
      (p.preco == null || num(p.preco) >= 0) && (p.precoPromo == null || num(p.precoPromo) >= 0));
  }

  /** Troca o conteúdo de PRODUTOS sem trocar o array (os outros scripts guardam a referência) */
  function aplicar(lista) {
    const ok = normalizarLista(lista).filter(valido);
    if (!ok.length) return false;
    if (JSON.stringify(ok) === JSON.stringify(window.PRODUTOS)) return false;
    window.PRODUTOS.splice(0, window.PRODUTOS.length, ...ok);
    return true;
  }

  // 1) Na hora: lista guardada (online) ou a do painel de demonstração
  if (ONLINE) {
    const cache = ler(CHAVE_CACHE);
    if (cache && Array.isArray(cache.produtos)) aplicar(cache.produtos);
  } else {
    const demo = ler(CHAVE_DEMO);
    if (demo) aplicar(Object.values(demo).filter((r) => r.ativo).sort((a, b) => a.ordem - b.ordem).map((r) => r.dados));
  }

  // 2) Em seguida: busca a versão atual no servidor
  async function atualizarDoServidor() {
    if (!ONLINE) return false;
    const url = `${SB.url}/rest/v1/produtos?select=dados&ativo=eq.true&order=ordem.asc,id.asc`;
    const r = await fetch(url, { headers: { apikey: SB.anonKey } });
    if (!r.ok) throw new Error("catálogo indisponível (" + r.status + ")");
    const lista = normalizarLista((await r.json()).map((x) => x.dados)).filter(valido);
    if (!lista.length) {                    // tabela ainda vazia: volta para produtos.js
      localStorage.removeItem(CHAVE_CACHE);
      return aplicar(PADRAO);
    }
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

  /** Aceita só campos conhecidos e valores no formato certo */
  function limparConfig(d) {
    d = d || {};
    const o = {};
    const zap = String(d.whatsapp || "").replace(/\D/g, "");
    if (/^\d{12,13}$/.test(zap)) o.whatsapp = zap;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email || "")) o.email = String(d.email).trim();
    TEXTO.forEach((k) => { if (typeof d[k] === "string" && d[k].trim()) o[k] = d[k].trim().slice(0, 140); });
    o.redes = {}; REDES.forEach((k) => { const u = https((d.redes || {})[k]); if (u) o.redes[k] = u; });
    o.lojas = {}; LOJAS.forEach((k) => { const u = https((d.lojas || {})[k]); if (u) o.lojas[k] = u; });
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
    return antes !== JSON.stringify([CFG.whatsapp, CFG.email, CFG.redes, CFG.lojas, TEXTO.map((k) => CFG[k]), galeriaPainel]);
  }
  aplicarConfig(ONLINE ? (ler(CHAVE_CFG) || {}).dados : ler(CHAVE_CFG_DEMO));
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
  const CHAVE_EQUIPE_DEMO = "policoating_demo_equipe";
  function equipeDemo() {
    let eq = ler(CHAVE_EQUIPE_DEMO);
    if (!Array.isArray(eq) || !eq.length) {
      eq = [{ email: String(window.Conta.usuario.email).toLowerCase(), papel: "admin" }];
      gravar(CHAVE_EQUIPE_DEMO, eq);
    }
    return eq;
  }
  const CHAVE_ESTOQUE_DEMO = "policoating_demo_estoque", CHAVE_MIN_DEMO = "policoating_demo_estoque_min", CHAVE_VENDAS_DEMO = "policoating_demo_vendas";
  function erroVenda(e) {
    const msg = String((e && e.message) || "");
    if (/vendas|confirmar_venda|cancelar_venda/i.test(msg) && /does not exist|schema cache|not find/i.test(msg)) return new Error("Vendas ainda não ativadas: rode a PARTE K do setup.sql no Supabase.");
    if (/Estoque insuficiente/i.test(msg)) return new Error(msg);
    return new Error(msg || "Não foi possível concluir. Tente novamente.");
  }
  const estoqueDemo = () => ler(CHAVE_ESTOQUE_DEMO) || [];
  const sinal = (m) => (m.tipo === "saida" ? -m.kg : +m.kg);
  function erroEstoque(e) {
    const msg = String((e && e.message) || "");
    if (/estoque_baixa_unica|duplicate key/i.test(msg)) return new Error("A baixa deste pedido já foi feita.");
    if (/Estoque insuficiente/i.test(msg)) return new Error(msg.replace(/\.?$/, "."));
    if (/row-level security|permission denied/i.test(msg)) return new Error("Você não tem permissão para movimentar o estoque.");
    if (/estoque_|does not exist|schema cache/i.test(msg)) return new Error("Estoque ainda não ativado: rode a PARTE J do setup.sql no Supabase.");
    return erro(e);
  }

  /** Para o site: saldo em kg de cada produto { id: kg }.
      null = estoque não está em uso (nenhuma movimentação ainda, ou banco sem a PARTE K): o site não limita a compra. */
  async function estoquePublico() {
    try {
      let linhas;
      if (!ONLINE) {
        const mapa = {};
        estoqueDemo().forEach((m) => (mapa[m.produto_id] = (mapa[m.produto_id] || 0) + sinal(m)));
        linhas = Object.entries(mapa).map(([produto_id, saldo_kg]) => ({ produto_id, saldo_kg }));
      } else {
        const r = await fetch(`${SB.url}/rest/v1/rpc/estoque_publico`, { method: "POST", headers: { apikey: SB.anonKey, "Content-Type": "application/json" }, body: "{}" });
        if (!r.ok) return null;
        linhas = await r.json();
      }
      if (!linhas.length) return null;
      const mapa = {};
      linhas.forEach((x) => (mapa[x.produto_id] = Math.max(0, Math.round(+x.saldo_kg * 100) / 100)));
      return mapa;
    } catch (e) { return null; }
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

    /** Pode movimentar o estoque (entrada, saída, inventário, mínimo)? Administradores sempre; vendedores com a permissão. */
    async podeMovimentarEstoque() {
      const papel = await this.meuPapel();
      if (!papel) return false;
      if (papel === "admin") return true;
      if (!ONLINE) {
        const eu = window.Conta.usuario.email.toLowerCase(), m = equipeDemo().find((x) => x.email === eu);
        return !!(m && m.pode_estoque);
      }
      const { data, error } = await (await cliente()).rpc("pode_mexer_estoque");
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
      if (!(window.CATEGORIAS || {})[d.categoria]) erros.push("linha");
      if (!d.descricao || String(d.descricao).trim().length < 10) erros.push("descrição (mínimo 10 caracteres)");
      if (!Array.isArray(d.cores) || d.cores.length !== 1 || !d.cores[0].nome || !/^#[0-9a-f]{6}$/i.test(d.cores[0].hex)) erros.push("cor (nome e tom)");
      if (novo && !(d.cores && d.cores[0] && d.cores[0].foto)) erros.push("foto do produto");
      if (!Array.isArray(d.embalagens) || !d.embalagens.length) erros.push("embalagens");
      if (!d.precoCombinar) {
        if (!(num(d.preco) > 0)) erros.push("preço por kg (ou marque \"Valor a combinar\")");
        if (d.precoPromo != null && !(num(d.precoPromo) > 0 && num(d.precoPromo) < num(d.preco))) erros.push("preço promocional (menor que o preço normal)");
        if (d.promoAte && !/^\d{4}-\d{2}-\d{2}$/.test(d.promoAte)) erros.push("data do fim da promoção");
      }
      if (erros.length) throw new Error("Confira: " + erros.join(", ") + ".");
    },

    async salvar(dados, ativo, ordem, novo) {
      dados.codigo = String(dados.codigo || "").trim().toUpperCase();
      dados.id = dados.codigo.toLowerCase();
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
      if (error) throw (error.code === "23505" || /duplicate key/i.test(error.message) ? new Error(`Já existe um produto com o código ${dados.codigo}. Use outro código.`) : erro(error));
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

    /** Copia os produtos de produtos.js para o painel (primeiro uso) */
    async importarPadrao() {
      const registros = PADRAO.map((p, i) => ({ id: p.id, dados: p, ativo: true, ordem: (i + 1) * 10 }));
      if (!ONLINE) { const d = lerDemo(); registros.forEach((r) => { if (!d[r.id]) d[r.id] = r; }); gravar(CHAVE_DEMO, d); await recarregarCatalogo(); return registros.length; }
      const sb = await cliente();
      const { error } = await sb.from("produtos").upsert(registros, { onConflict: "id", ignoreDuplicates: true });
      if (error) throw erro(error);
      localStorage.removeItem(CHAVE_CACHE);
      await recarregarCatalogo();
      return registros.length;
    },

    /** Reduz a foto (máx. 1200 px, JPEG) e envia. Retorna o endereço público. */
    async enviarFoto(arquivo, idProduto) {
      if (!/^image\/(jpeg|png|webp)$/.test(arquivo.type)) throw new Error("Use uma foto JPG, PNG ou WEBP.");
      if (arquivo.size > 15 * 1024 * 1024) throw new Error("Foto muito grande (máx. 15 MB).");
      const blob = await reduzir(arquivo, 1200);
      if (!ONLINE) return await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(blob); });
      const sb = await cliente();
      const caminho = `${idProduto}/${Date.now()}.jpg`;
      const { error } = await sb.storage.from("produtos").upload(caminho, blob, { contentType: "image/jpeg", upsert: false });
      if (error) throw erro(error);
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
      };
    },

    async salvarConfig(bruto) {
      const d = limparConfig(bruto);
      if (!d.whatsapp) throw new Error("WhatsApp inválido: use 55 + DDD + número, só dígitos (ex.: 5516992708155).");
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
      let r = await sb.from("admins").select("email, papel, pode_excluir, pode_exportar, pode_estoque").order("email");
      if (r.error) r = await sb.from("admins").select("email, papel, pode_excluir, pode_exportar").order("email");   // sem a PARTE J ainda
      if (r.error) r = await sb.from("admins").select("email, papel, pode_excluir").order("email");   // sem a PARTE I ainda
      if (r.error) r = await sb.from("admins").select("email, papel").order("email");   // sem a PARTE G ainda
      if (r.error) r = await sb.from("admins").select("email").order("email");          // sem a PARTE F ainda
      if (r.error) throw erro(r.error);
      return (r.data || []).map((x) => ({ email: x.email, papel: x.papel || "admin", pode_excluir: !!x.pode_excluir, pode_exportar: !!x.pode_exportar, pode_estoque: !!x.pode_estoque }));
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
      if (!["pode_excluir", "pode_exportar", "pode_estoque"].includes(campo)) throw new Error("Permissão desconhecida.");
      email = String(email || "").trim().toLowerCase();
      if (!ONLINE) {
        const eq = equipeDemo(), m = eq.find((x) => x.email === email);
        if (m) { m[campo] = !!sim; gravar(CHAVE_EQUIPE_DEMO, eq); }
        return;
      }
      const sb = await cliente();
      const { error } = await sb.from("admins").update({ [campo]: !!sim }).eq("email", email);
      if (error) throw erro(new RegExp(campo).test(error.message) ? { message: `Rode a PARTE ${{ pode_excluir: "G", pode_exportar: "I", pode_estoque: "J" }[campo]} do setup.sql no Supabase para usar esta permissão.` } : error);
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
    async removerMembro(email) {
      if (String(email).toLowerCase() === String(window.Conta.usuario.email).toLowerCase()) throw new Error("Você não pode remover o seu próprio acesso.");
      if (!ONLINE) { gravar(CHAVE_EQUIPE_DEMO, equipeDemo().filter((x) => x.email !== email)); return; }
      const sb = await cliente();
      const { error } = await sb.from("admins").delete().eq("email", email);
      if (error) throw erro(error);
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
      return pedidos.map((p) => Object.assign({}, p, { cliente: porId[p.cliente_id] || {} }));
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

    /* ---------- Estoque ---------- */
    /** Saldos e mínimos: { "produto|cor": { saldo, minimo, ultima } } */
    async estoqueSaldos() {
      const chave = (p, c) => p + "|" + c, mapa = {};
      const item = (k) => (mapa[k] = mapa[k] || { saldo: 0, minimo: 0, ultima: null });
      if (!ONLINE) {
        estoqueDemo().forEach((m) => { const x = item(chave(m.produto_id, m.cor)); x.saldo += sinal(m); if (!x.ultima || m.criado_em > x.ultima) x.ultima = m.criado_em; });
        Object.entries(ler(CHAVE_MIN_DEMO) || {}).forEach(([k, v]) => (item(k).minimo = v));
        return mapa;
      }
      const sb = await cliente();
      const [rs, rm] = await Promise.all([sb.from("estoque_saldos").select("*"), sb.from("estoque_minimos").select("*")]);
      if (rs.error) throw erroEstoque(rs.error);
      (rs.data || []).forEach((s) => Object.assign(item(chave(s.produto_id, s.cor)), { saldo: +s.saldo_kg, ultima: s.ultima_movimentacao }));
      (rm.data || []).forEach((m) => (item(chave(m.produto_id, m.cor)).minimo = +m.minimo_kg));
      return mapa;
    },
    /** Histórico (mais recentes primeiro). Filtros opcionais: produto_id, cor, pedido_numero */
    async estoqueMovimentos(f = {}, limite = 300) {
      if (!ONLINE) {
        return estoqueDemo().filter((m) => (!f.produto_id || m.produto_id === f.produto_id) && (!f.cor || m.cor === f.cor) && (!f.pedido_numero || m.pedido_numero === f.pedido_numero))
          .sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em))).slice(0, limite);
      }
      let q = (await cliente()).from("estoque_movimentos").select("*").order("criado_em", { ascending: false }).limit(limite);
      ["produto_id", "cor", "pedido_numero"].forEach((k) => { if (f[k]) q = q.eq(k, f[k]); });
      const { data, error } = await q;
      if (error) throw erroEstoque(error);
      return data || [];
    },
    /** Registra uma movimentação: tipo "entrada" | "saida" | "ajuste" (kg negativo ou positivo) */
    async movimentarEstoque(m) {
      const reg = {
        produto_id: String(m.produto_id || ""), cor: String(m.cor || "").trim(), tipo: m.tipo,
        kg: Math.round((+m.kg || 0) * 100) / 100,
        pedido_numero: m.pedido_numero || null,
        documento: String(m.documento || "").replace(/\s+/g, " ").trim().slice(0, 60) || null,
        obs: String(m.obs || "").replace(/\s+/g, " ").trim().slice(0, 300) || null
      };
      if (!["entrada", "saida", "ajuste"].includes(reg.tipo)) throw new Error("Tipo de movimentação inválido.");
      if (!reg.produto_id || !reg.cor) throw new Error("Escolha o produto e a cor.");
      if (!reg.kg || (reg.tipo !== "ajuste" && reg.kg < 0)) throw new Error("Informe a quantidade em kg.");
      if (Math.abs(reg.kg) > 1000000) throw new Error("Quantidade muito alta.");
      if (!(await this.podeMovimentarEstoque())) throw new Error("Você não tem permissão para movimentar o estoque. Peça a um administrador.");
      if (!ONLINE) {
        const lista = estoqueDemo(), k = (x) => x.produto_id + "|" + x.cor;
        if (reg.tipo === "saida" && reg.pedido_numero && lista.some((x) => x.tipo === "saida" && x.pedido_numero === reg.pedido_numero && k(x) === k(reg)))
          throw new Error("A baixa deste pedido já foi feita.");
        const saldo = lista.filter((x) => k(x) === k(reg)).reduce((s, x) => s + sinal(x), 0);
        if (saldo + sinal(reg) < 0) throw new Error(`Estoque insuficiente: saldo de ${saldo.toLocaleString("pt-BR")} kg.`);
        lista.push(Object.assign(reg, { id: Date.now() + Math.random(), feito_por: window.Conta.usuario.email.toLowerCase(), criado_em: new Date().toISOString() }));
        gravar(CHAVE_ESTOQUE_DEMO, lista); return reg;
      }
      const { data, error } = await (await cliente()).from("estoque_movimentos").insert(reg).select().single();
      if (error) throw erroEstoque(error);
      return data;
    },
    async definirMinimo(produto_id, cor, kg) {
      kg = Math.max(0, Math.round((+kg || 0) * 100) / 100);
      if (!(await this.podeMovimentarEstoque())) throw new Error("Você não tem permissão para alterar o estoque.");
      if (!ONLINE) { const m = ler(CHAVE_MIN_DEMO) || {}; m[produto_id + "|" + cor] = kg; gravar(CHAVE_MIN_DEMO, m); return; }
      const { error } = await (await cliente()).from("estoque_minimos").upsert({ produto_id, cor, minimo_kg: kg });
      if (error) throw erroEstoque(error);
    },
    /* ---------- Vendas ---------- */
    /** Confirma a venda de um pedido com os valores fechados. Dá baixa no estoque junto (se o estoque estiver em uso).
        itens: [{ produto_id, codigo, nome, cor, kg, preco_kg }] */
    async confirmarVenda(pedido, itens, obs) {
      const limpos = (itens || []).map((i) => ({ produto_id: i.produto_id, codigo: i.codigo || "", nome: i.nome || "", cor: i.cor,
        kg: Math.round((+i.kg || 0) * 100) / 100, preco_kg: Math.round((+i.preco_kg || 0) * 100) / 100 }));
      if (!limpos.length) throw new Error("Informe os itens da venda.");
      const ruim = limpos.find((i) => !(i.kg > 0) || i.preco_kg < 0);
      if (ruim) throw new Error(`Confira a quantidade e o preço de ${ruim.nome || ruim.produto_id}.`);
      obs = String(obs || "").replace(/\s+/g, " ").trim().slice(0, 300);
      if (!ONLINE) {
        if (!(await this.meuPapel())) throw new Error("Sem permissão para registrar vendas.");
        const vendas = ler(CHAVE_VENDAS_DEMO) || [];
        if (vendas.some((v) => v.pedido_numero === pedido.numero)) throw new Error("Este pedido já tem uma venda registrada.");
        const estoqueEmUso = estoqueDemo().length > 0, mov = estoqueDemo();
        if (estoqueEmUso) {
          for (const i of limpos) {     // confere tudo antes de gravar (como a transação do banco)
            const saldo = mov.filter((m) => m.produto_id === i.produto_id && m.cor === i.cor).reduce((s, m) => s + sinal(m), 0);
            const jaBaixado = mov.some((m) => m.tipo === "saida" && m.pedido_numero === pedido.numero && m.produto_id === i.produto_id && m.cor === i.cor);
            if (!jaBaixado && saldo < i.kg) throw new Error(`Estoque insuficiente para ${i.nome || i.produto_id}: saldo de ${saldo.toLocaleString("pt-BR")} kg.`);
          }
          limpos.forEach((i) => {
            if (mov.some((m) => m.tipo === "saida" && m.pedido_numero === pedido.numero && m.produto_id === i.produto_id && m.cor === i.cor)) return;
            mov.push({ id: Date.now() + Math.random(), produto_id: i.produto_id, cor: i.cor, tipo: "saida", kg: i.kg, pedido_numero: pedido.numero, obs: "Venda confirmada",
              feito_por: window.Conta.usuario.email.toLowerCase(), criado_em: new Date().toISOString() });
          });
          gravar(CHAVE_ESTOQUE_DEMO, mov);
        }
        const c = pedido.cliente || {};
        const itensV = limpos.map((i) => Object.assign(i, { subtotal: Math.round(i.kg * i.preco_kg * 100) / 100 }));
        const venda = { id: vendas.reduce((m, v) => Math.max(m, v.id), 0) + 1, pedido_numero: pedido.numero, cliente_nome: (c.tipo === "pj" ? (c.nome_fantasia || c.razao_social) : c.nome) || c.email || "",
          cliente_email: c.email || "", itens: itensV, total: Math.round(itensV.reduce((s, i) => s + i.subtotal, 0) * 100) / 100, total_kg: itensV.reduce((s, i) => s + i.kg, 0),
          vendedor: window.Conta.usuario.email.toLowerCase(), obs: obs || null, status: "confirmada", criado_em: new Date().toISOString() };
        vendas.push(venda); gravar(CHAVE_VENDAS_DEMO, vendas); return venda.id;
      }
      const { data, error } = await (await cliente()).rpc("confirmar_venda", { p_pedido: pedido.numero, p_itens: limpos, p_obs: obs || null });
      if (error) throw erroVenda(error);
      return data;
    },
    /** Cancela a venda (só administrador). O estoque baixado volta. */
    async cancelarVenda(id, motivo) {
      motivo = String(motivo || "").replace(/\s+/g, " ").trim();
      if (motivo.length < 3) throw new Error("Informe o motivo do cancelamento.");
      if (!ONLINE) {
        if (!(await this.ehAdmin())) throw new Error("Só o administrador cancela vendas.");
        const vendas = ler(CHAVE_VENDAS_DEMO) || [], v = vendas.find((x) => x.id === id);
        if (!v || v.status !== "confirmada") throw new Error("Venda não encontrada ou já cancelada.");
        const mov = estoqueDemo();
        mov.filter((m) => m.tipo === "saida" && m.pedido_numero === v.pedido_numero).forEach((m) =>
          mov.push({ id: Date.now() + Math.random(), produto_id: m.produto_id, cor: m.cor, tipo: "entrada", kg: m.kg, pedido_numero: v.pedido_numero,
            obs: "Estorno: venda cancelada", feito_por: window.Conta.usuario.email.toLowerCase(), criado_em: new Date().toISOString() }));
        gravar(CHAVE_ESTOQUE_DEMO, mov);
        Object.assign(v, { status: "cancelada", cancelada_em: new Date().toISOString(), cancelada_por: window.Conta.usuario.email.toLowerCase(), motivo_cancelamento: motivo.slice(0, 300) });
        gravar(CHAVE_VENDAS_DEMO, vendas); return;
      }
      const { error } = await (await cliente()).rpc("cancelar_venda", { p_id: id, p_motivo: motivo });
      if (error) throw erroVenda(error);
    },
    /** Vendas (mais recentes primeiro). Administrador vê todas; vendedor, as próprias. */
    async listarVendas() {
      if (!ONLINE) {
        const eu = window.Conta.usuario.email.toLowerCase(), admin = await this.ehAdmin();
        return (ler(CHAVE_VENDAS_DEMO) || []).filter((v) => admin || v.vendedor === eu).sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)));
      }
      const { data, error } = await (await cliente()).from("vendas").select("*").order("criado_em", { ascending: false }).limit(5000);
      if (error) throw erroVenda(error);
      return (data || []).map((v) => Object.assign(v, { total: +v.total, total_kg: +v.total_kg }));
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

    padrao: () => JSON.parse(JSON.stringify(PADRAO)),
    valido,
  };

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

  window.Catalogo = { pronto, atualizar: atualizarDoServidor, Admin, REDES, LOJAS, estoquePublico, desmembrar, CODIGO_RE };
})();
