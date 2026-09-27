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
      (p.fotos == null || (Array.isArray(p.fotos) && p.fotos.every(fotoOk))));
  }

  /** Embalagem única: caixa de 25 kg (o cliente também pode pedir "Sob medida", em kg) */
  const EMBALAGENS = ["Caixa 25 kg"];

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
        if (!(num(d.preco) > 0)) erros.push("preço por kg (ou marque \"Valor a combinar\")");
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

  window.Catalogo = { pronto, atualizar: atualizarDoServidor, Admin, REDES, LOJAS, desmembrar, CODIGO_RE, EMBALAGENS };
})();
