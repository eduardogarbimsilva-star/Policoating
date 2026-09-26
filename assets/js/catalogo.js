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

  /** Confere o formato mínimo para o site conseguir exibir o produto */
  function valido(p) {
    return !!(p && typeof p.id === "string" && /^[a-z0-9-]{2,60}$/.test(p.id) && p.nome && (window.CATEGORIAS || {})[p.categoria] &&
      Array.isArray(p.cores) && p.cores.length && p.cores.every((c) => c && c.nome && /^#[0-9a-f]{6}$/i.test(c.hex) &&
        (!c.foto || /^(https:\/\/|data:image\/(jpeg|png|webp);base64,|assets\/)/.test(c.foto))) &&
      Array.isArray(p.embalagens) && p.embalagens.length && (!p.ficha || /^https:\/\//.test(p.ficha)));
  }

  /** Troca o conteúdo de PRODUTOS sem trocar o array (os outros scripts guardam a referência) */
  function aplicar(lista) {
    const ok = (lista || []).filter(valido);
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
    const lista = (await r.json()).map((x) => x.dados).filter(valido);
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

    /** Todos os produtos do painel, inclusive ocultos: [{ id, dados, ativo, ordem }] */
    async listar() {
      if (!ONLINE) return Object.values(lerDemo()).sort((a, b) => a.ordem - b.ordem);
      const sb = await cliente();
      const { data, error } = await sb.from("produtos").select("id, dados, ativo, ordem").order("ordem").order("id");
      if (error) throw erro(error);
      return data || [];
    },

    async salvar(dados, ativo, ordem) {
      if (!valido(dados)) throw new Error("Confira os campos obrigatórios: nome, linha, pelo menos uma cor e uma embalagem.");
      const registro = { id: dados.id, dados, ativo: !!ativo, ordem: Number(ordem) || 0 };
      if (!ONLINE) { const d = lerDemo(); d[dados.id] = registro; gravar(CHAVE_DEMO, d); return registro; }
      const sb = await cliente();
      const { error } = await sb.from("produtos").upsert(Object.assign(registro, { atualizado_em: new Date().toISOString() }));
      if (error) throw erro(error);
      localStorage.removeItem(CHAVE_CACHE);
      return registro;
    },

    async excluir(id) {
      if (!ONLINE) { const d = lerDemo(); delete d[id]; gravar(CHAVE_DEMO, d); return; }
      const sb = await cliente();
      const { error } = await sb.from("produtos").delete().eq("id", id);
      if (error) throw erro(error);
      localStorage.removeItem(CHAVE_CACHE);
    },

    /** Copia os produtos de produtos.js para o painel (primeiro uso) */
    async importarPadrao() {
      const registros = PADRAO.map((p, i) => ({ id: p.id, dados: p, ativo: true, ordem: (i + 1) * 10 }));
      if (!ONLINE) { const d = lerDemo(); registros.forEach((r) => { if (!d[r.id]) d[r.id] = r; }); gravar(CHAVE_DEMO, d); return registros.length; }
      const sb = await cliente();
      const { error } = await sb.from("produtos").upsert(registros, { onConflict: "id", ignoreDuplicates: true });
      if (error) throw erro(error);
      localStorage.removeItem(CHAVE_CACHE);
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
      let r = await sb.from("admins").select("email, papel").order("email");
      if (r.error) r = await sb.from("admins").select("email").order("email");   // sem a coluna papel ainda
      if (r.error) throw erro(r.error);
      return (r.data || []).map((x) => ({ email: x.email, papel: x.papel || "admin" }));
    },
    async salvarMembro(email, papel) {
      email = String(email || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-mail inválido.");
      if (!["admin", "vendedor"].includes(papel)) throw new Error("Escolha o cargo.");
      if (email === String(window.Conta.usuario.email).toLowerCase() && papel !== "admin") throw new Error("Você não pode tirar o seu próprio cargo de administrador.");
      if (!ONLINE) { const eq = equipeDemo().filter((x) => x.email !== email); eq.push({ email, papel }); gravar(CHAVE_EQUIPE_DEMO, eq); return; }
      const sb = await cliente();
      const { error } = await sb.from("admins").upsert({ email, papel });
      if (error) throw erro(error);
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

  window.Catalogo = { pronto, atualizar: atualizarDoServidor, Admin, REDES, LOJAS };
})();
