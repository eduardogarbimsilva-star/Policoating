/* =========================================================
   Policoating — Catálogo de produtos gerenciável
   - Os produtos cadastrados no painel da empresa (admin.html) ficam no
     Supabase (tabela "produtos") e substituem a lista de produtos.js.
   - Enquanto a tabela estiver vazia ou sem conexão, o site usa produtos.js.
   - A última lista recebida fica guardada no navegador, então a página
     abre na hora e se atualiza sozinha se algo mudou.
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
      Array.isArray(p.embalagens) && p.embalagens.length);
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

  const pronto = atualizarDoServidor()
    .then((mudou) => { if (mudou) document.dispatchEvent(new CustomEvent("catalogo-atualizado")); })
    .catch((e) => console.warn("Catálogo:", e.message));

  /* ---------- Painel da empresa ---------- */
  const lerDemo = () => ler(CHAVE_DEMO) || {};
  async function cliente() {
    if (!window.Conta || !window.Conta.cliente) throw new Error("Login indisponível.");
    return window.Conta.cliente();
  }
  const erro = (e) => new Error((e && e.message) || "Não foi possível concluir. Tente novamente.");

  const Admin = {
    online: ONLINE,

    /** true se o e-mail logado está na lista de administradores */
    async ehAdmin() {
      if (!window.Conta || !window.Conta.usuario) return false;
      if (!ONLINE) return true;             // demonstração: qualquer conta logada testa o painel
      const sb = await cliente();
      const { data, error } = await sb.rpc("eh_admin");
      if (error) return false;
      return data === true;
    },

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

  window.Catalogo = { pronto, atualizar: atualizarDoServidor, Admin };
})();
