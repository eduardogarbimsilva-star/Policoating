/* =========================================================
   Policoating — Conta do cliente (login com código por e-mail)

   Funciona de dois jeitos:
   1) Supabase configurado em config.js -> o código de verificação é
      enviado de verdade para o e-mail do cliente e os cadastros/pedidos
      ficam salvos no banco de dados (veja o README).
   2) Sem Supabase -> "modo demonstração": o código aparece na tela e os
      dados ficam salvos apenas neste navegador. Serve para testar.
   ========================================================= */
(function () {
  "use strict";

  const CFG = window.SITE_CONFIG || {};
  const SB = CFG.supabase || {};
  const USAR_SUPABASE = !!(SB.url && SB.anonKey);
  const K = {
    sessao: "policoating_demo_sessao",
    perfis: "policoating_demo_perfis",
    pedidos: "policoating_demo_pedidos",
    codigo: "policoating_demo_codigo"
  };

  function ler(chave, padrao) {
    try { const v = JSON.parse(localStorage.getItem(chave)); return v ?? padrao; } catch (e) { return padrao; }
  }
  function gravar(chave, valor) {
    try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) { /* modo privado */ }
  }
  const normalizarEmail = (e) => String(e || "").trim().toLowerCase();

  /* ---------- Cliente Supabase (carregado só quando configurado) ---------- */
  let clientePromise = null;
  function supabase() {
    if (!clientePromise) {
      clientePromise = new Promise((resolve, reject) => {
        const criar = () => resolve(window.supabase.createClient(SB.url, SB.anonKey));
        if (window.supabase && window.supabase.createClient) return criar();
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
        s.onload = criar;
        s.onerror = () => reject(new Error("Não foi possível conectar ao servidor de login. Verifique sua internet."));
        document.head.appendChild(s);
      });
    }
    return clientePromise;
  }

  function traduzirErro(erro) {
    const msg = String((erro && erro.message) || erro || "");
    if (/signups? not allowed|user not found/i.test(msg)) return new Error("Não encontramos uma conta com este e-mail. Clique em \"Criar conta\".");
    if (/expired|invalid/i.test(msg) && /token|otp/i.test(msg)) return new Error("Código inválido ou expirado. Confira ou peça um novo código.");
    if (/rate limit|security purposes|only request/i.test(msg)) return new Error("Muitas tentativas. Aguarde um minuto antes de pedir outro código.");
    if (/invalid.*email|email.*invalid/i.test(msg)) return new Error("E-mail inválido.");
    return new Error(msg || "Ocorreu um erro. Tente novamente.");
  }

  /* ---------- Estado em memória ---------- */
  let usuarioAtual = null;   // { id, email }
  let perfilAtual = null;    // dados do cadastro
  const ouvintes = [];
  function avisar() { ouvintes.forEach((fn) => { try { fn(usuarioAtual, perfilAtual); } catch (e) { console.error(e); } }); }

  const Conta = {
    modoDemo: !USAR_SUPABASE,

    /** Registra uma função chamada sempre que o login/cadastro mudar */
    aoMudar(fn) { ouvintes.push(fn); },

    get usuario() { return usuarioAtual; },
    get perfil() { return perfilAtual; },

    /** Cadastro completo = tem os dados mínimos para faturar/entregar */
    perfilCompleto(p) {
      p = p || perfilAtual;
      if (!p || !p.tipo || !p.telefone || !p.cep || !p.logradouro || !p.numero || !p.cidade || !p.uf) return false;
      return p.tipo === "pj" ? !!(p.razao_social && p.cnpj && p.responsavel) : !!(p.nome && p.cpf);
    },

    /** Nome curto para saudação/cabeçalho */
    nomeExibicao(p) {
      p = p || perfilAtual;
      if (!p) return usuarioAtual ? usuarioAtual.email.split("@")[0] : "";
      if (p.tipo === "pj") return (p.responsavel || "").split(" ")[0] || p.nome_fantasia || p.razao_social || "";
      return (p.nome || "").split(" ")[0];
    },

    /** Envia o código de verificação para o e-mail. criar=true permite criar conta nova */
    async enviarCodigo(email, criar) {
      email = normalizarEmail(email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Informe um e-mail válido.");
      if (USAR_SUPABASE) {
        const sb = await supabase();
        // Se o modelo de e-mail do Supabase enviar um link em vez do código, o link também funciona:
        // ele volta para a página "Minha conta" deste site, já com o cliente conectado.
        const voltarPara = location.origin + location.pathname.replace(/[^/]*$/, "") + "conta.html";
        const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: !!criar, emailRedirectTo: voltarPara } });
        if (error) throw traduzirErro(error);
        return {};
      }
      const perfis = ler(K.perfis, {});
      if (!criar && !perfis[email]) throw new Error("Não encontramos uma conta com este e-mail. Clique em \"Criar conta\".");
      const codigo = String(Math.floor(100000 + Math.random() * 900000));
      gravar(K.codigo, { email, codigo, expira: Date.now() + 10 * 60 * 1000, tentativas: 0 });
      return { codigoDemo: codigo };
    },

    /** Confere o código digitado e inicia a sessão */
    async verificarCodigo(email, codigo) {
      email = normalizarEmail(email);
      codigo = String(codigo || "").replace(/\D/g, "");
      if (codigo.length < 6) throw new Error("Digite o código recebido por e-mail.");
      if (USAR_SUPABASE) {
        const sb = await supabase();
        const { data, error } = await sb.auth.verifyOtp({ email, token: codigo, type: "email" });
        if (error) throw traduzirErro(error);
        usuarioAtual = { id: data.user.id, email: data.user.email };
      } else {
        const salvo = ler(K.codigo, null);
        if (!salvo || salvo.email !== email || Date.now() > salvo.expira) throw new Error("Código expirado. Peça um novo código.");
        if (salvo.tentativas >= 5) throw new Error("Muitas tentativas. Peça um novo código.");
        if (salvo.codigo !== codigo) {
          salvo.tentativas++;
          gravar(K.codigo, salvo);
          throw new Error("Código incorreto. Confira e tente novamente.");
        }
        localStorage.removeItem(K.codigo);
        const perfis = ler(K.perfis, {});
        if (!perfis[email]) { perfis[email] = { email }; gravar(K.perfis, perfis); }
        gravar(K.sessao, { email });
        usuarioAtual = { id: email, email };
      }
      await this.carregarPerfil();
      avisar();
      return usuarioAtual;
    },

    /** Restaura a sessão salva (chamado ao abrir qualquer página) */
    async iniciar() {
      try {
        if (USAR_SUPABASE) {
          const sb = await supabase();
          const { data } = await sb.auth.getSession();
          const u = data.session && data.session.user;
          usuarioAtual = u ? { id: u.id, email: u.email } : null;
        } else {
          const s = ler(K.sessao, null);
          usuarioAtual = s ? { id: s.email, email: s.email } : null;
        }
        if (usuarioAtual) await this.carregarPerfil();
      } catch (e) {
        console.warn("Conta:", e.message);
        usuarioAtual = null;
      }
      avisar();
      return usuarioAtual;
    },

    async sair() {
      if (USAR_SUPABASE) { const sb = await supabase(); await sb.auth.signOut(); }
      else localStorage.removeItem(K.sessao);
      usuarioAtual = null;
      perfilAtual = null;
      avisar();
    },

    async carregarPerfil() {
      if (!usuarioAtual) return null;
      if (USAR_SUPABASE) {
        const sb = await supabase();
        const { data, error } = await sb.from("clientes").select("*").eq("id", usuarioAtual.id).maybeSingle();
        if (error) throw traduzirErro(error);
        perfilAtual = data || { email: usuarioAtual.email };
      } else {
        perfilAtual = ler(K.perfis, {})[usuarioAtual.email] || { email: usuarioAtual.email };
      }
      return perfilAtual;
    },

    async salvarPerfil(dados) {
      if (!usuarioAtual) throw new Error("Entre na sua conta para salvar os dados.");
      const registro = Object.assign({}, dados, { email: usuarioAtual.email, atualizado_em: new Date().toISOString() });
      if (USAR_SUPABASE) {
        const sb = await supabase();
        const { data, error } = await sb.from("clientes").upsert(Object.assign(registro, { id: usuarioAtual.id })).select().single();
        if (error) throw traduzirErro(error);
        perfilAtual = data;
      } else {
        const perfis = ler(K.perfis, {});
        perfis[usuarioAtual.email] = Object.assign({}, perfis[usuarioAtual.email], registro);
        gravar(K.perfis, perfis);
        perfilAtual = perfis[usuarioAtual.email];
      }
      avisar();
      return perfilAtual;
    },

    async registrarPedido(pedido) {
      if (!usuarioAtual) return null;
      const registro = { numero: pedido.numero, itens: pedido.itens, observacoes: pedido.observacoes || null };
      if (USAR_SUPABASE) {
        const sb = await supabase();
        const { error } = await sb.from("pedidos").insert(Object.assign(registro, { cliente_id: usuarioAtual.id }));
        if (error) throw traduzirErro(error);
      } else {
        const todos = ler(K.pedidos, {});
        (todos[usuarioAtual.email] = todos[usuarioAtual.email] || []).unshift(Object.assign(registro, { criado_em: new Date().toISOString() }));
        gravar(K.pedidos, todos);
      }
      return registro;
    },

    /** Cadastra o e-mail na newsletter (tabela "newsletter" do Supabase) */
    async inscreverNewsletter(email) {
      email = normalizarEmail(email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Informe um e-mail válido.");
      if (!USAR_SUPABASE) throw new Error("sem-servidor");
      let error;
      try {
        const sb = await supabase();
        ({ error } = await sb.from("newsletter").insert({ email }));
      } catch (e) { throw new Error("sem-servidor"); }
      if (error && error.code !== "23505") throw new Error("sem-servidor"); // 23505 = já cadastrado
      return true;
    },

    async listarPedidos() {
      if (!usuarioAtual) return [];
      if (USAR_SUPABASE) {
        const sb = await supabase();
        const { data, error } = await sb.from("pedidos").select("numero, itens, observacoes, criado_em")
          .eq("cliente_id", usuarioAtual.id).order("criado_em", { ascending: false }).limit(50);
        if (error) throw traduzirErro(error);
        return data || [];
      }
      return (ler(K.pedidos, {})[usuarioAtual.email] || []).slice(0, 50);
    }
  };

  window.Conta = Conta;
  window.ContaPronta = Conta.iniciar();
})();
