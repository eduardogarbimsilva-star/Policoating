/* =========================================================
   Policoating — página "Minha conta"
   Entrar / criar conta com código por e-mail, cadastro PF/PJ,
   pedidos e favoritos.
   ========================================================= */
(function () {
  "use strict";

  const CW = window.ColorWeg;
  const Conta = window.Conta;
  const BR = window.BR;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const esc = CW.esc;
  const params = new URLSearchParams(location.search);
  const CHAVE_TIPO = "policoating_tipo_cadastro";
  const CHAVE_ACEITE = "policoating_aceite_cadastro";
  const CHAVE_VOLTAR = "policoating_voltar";
  const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

  const sess = {
    get: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* ignora */ } },
    del: (k) => { try { sessionStorage.removeItem(k); } catch (e) { /* ignora */ } }
  };

  let modo = "entrar";       // entrar | criar
  let emailAtual = "";
  let timerReenvio = null;

  /* ---------- Visões ---------- */
  function mostrar(view) {
    $("#carregando").hidden = true;
    $("#view-acesso").hidden = view !== "acesso";
    $("#view-painel").hidden = view !== "painel";
  }

  function erro(id, msg) { $(id).textContent = msg || ""; }

  function ocupado(btn, sim, texto) {
    if (sim) { btn.dataset.texto = btn.textContent; btn.textContent = texto || "Aguarde…"; btn.disabled = true; }
    else { btn.textContent = btn.dataset.texto || btn.textContent; btn.disabled = false; }
  }

  /* ---------- Entrar / Criar conta ---------- */
  function trocarAba(aba) {
    modo = aba;
    $$(".abas [data-aba]").forEach((b) => b.classList.toggle("ativo", b.dataset.aba === aba));
    $("#bloco-tipo").hidden = aba !== "criar";
    $("#bloco-aceite").hidden = aba !== "criar";
    $("#btn-enviar-codigo").textContent = aba === "criar" ? "Criar conta e enviar código" : "Enviar código de acesso";
    voltarParaEmail();
    erro("#erro-acesso");
  }

  function voltarParaEmail() {
    $("#form-email").hidden = false;
    $("#form-codigo").hidden = true;
    $(".abas", $("#view-acesso")).hidden = false;
  }

  function iniciarReenvio() {
    const btn = $("#btn-reenviar");
    let s = 60;
    clearInterval(timerReenvio);
    btn.disabled = true;
    btn.textContent = `Reenviar código (${s}s)`;
    timerReenvio = setInterval(() => {
      s--;
      if (s <= 0) { clearInterval(timerReenvio); btn.disabled = false; btn.textContent = "Reenviar código"; }
      else btn.textContent = `Reenviar código (${s}s)`;
    }, 1000);
  }

  async function enviarCodigo(email) {
    const r = await Conta.enviarCodigo(email, modo === "criar");
    emailAtual = email.trim().toLowerCase();
    $("#email-enviado").textContent = emailAtual;
    $("#form-email").hidden = true;
    $(".abas", $("#view-acesso")).hidden = true;
    $("#form-codigo").hidden = false;
    const demo = $("#codigo-demo");
    demo.hidden = !r.codigoDemo;
    if (r.codigoDemo) demo.innerHTML = `Modo demonstração — seu código é <strong>${r.codigoDemo}</strong>`;
    $("#codigo").value = "";
    $("#codigo").focus();
    iniciarReenvio();
  }

  $("#form-email").addEventListener("submit", async (e) => {
    e.preventDefault();
    erro("#erro-acesso");
    const email = $("#acesso-email").value;
    if (modo === "criar") {
      if (!$("#aceite-cadastro").checked) return erro("#erro-acesso", "Para criar a conta, aceite a Política de Privacidade.");
      sess.set(CHAVE_TIPO, $("[name=tipo-cadastro]:checked").value);
      sess.set(CHAVE_ACEITE, new Date().toISOString());
    }
    const btn = $("#btn-enviar-codigo");
    ocupado(btn, true, "Enviando código…");
    try { await enviarCodigo(email); }
    catch (err) { erro("#erro-acesso", err.message); }
    finally { ocupado(btn, false); }
  });

  $("#codigo").addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
  });

  $("#form-codigo").addEventListener("submit", async (e) => {
    e.preventDefault();
    erro("#erro-acesso");
    const btn = $("#btn-verificar");
    ocupado(btn, true, "Verificando…");
    try {
      await Conta.verificarCodigo(emailAtual, $("#codigo").value);
      clearInterval(timerReenvio);
      aposEntrar();
    } catch (err) {
      erro("#erro-acesso", err.message);
    } finally {
      ocupado(btn, false);
    }
  });

  $("#btn-reenviar").addEventListener("click", async () => {
    erro("#erro-acesso");
    try { await enviarCodigo(emailAtual); CW.mostrarToast("Novo código enviado!"); }
    catch (err) { erro("#erro-acesso", err.message); }
  });
  $("#btn-trocar-email").addEventListener("click", () => { clearInterval(timerReenvio); voltarParaEmail(); });
  $$(".abas [data-aba]").forEach((b) => b.addEventListener("click", () => trocarAba(b.dataset.aba)));

  /* ---------- Depois de entrar ---------- */
  function voltarAoCarrinhoSePreciso() {
    if (params.get("voltar") !== "carrinho" || !Conta.perfilCompleto()) return false;
    const destino = sess.get(CHAVE_VOLTAR) || "produtos.html";
    sess.del(CHAVE_VOLTAR);
    location.href = destino + "#carrinho";
    return true;
  }

  function aposEntrar() {
    if (voltarAoCarrinhoSePreciso()) return;
    abrirPainel(Conta.perfilCompleto() ? (location.hash.slice(1) || "pedidos") : "dados");
  }

  /* ---------- Painel ---------- */
  function abrirPainel(aba) {
    mostrar("painel");
    const p = Conta.perfil || {};
    $("#ola-nome").textContent = Conta.nomeExibicao() || "cliente";
    $("#ola-info").textContent = [p.tipo === "pj" ? p.razao_social : null, Conta.usuario.email].filter(Boolean).join(" · ");
    $("#alerta-cadastro").hidden = Conta.perfilCompleto();
    trocarPainel(["pedidos", "dados", "favoritos"].includes(aba) ? aba : "pedidos");
  }

  function trocarPainel(aba) {
    $$(".abas-painel [data-painel]").forEach((b) => b.classList.toggle("ativo", b.dataset.painel === aba));
    $$(".painel").forEach((el) => (el.hidden = el.id !== "painel-" + aba));
    history.replaceState(null, "", location.pathname + location.search + "#" + aba);
    if (aba === "pedidos") renderPedidos();
    if (aba === "dados") preencherDados();
    if (aba === "favoritos") renderFavoritos();
  }
  $$(".abas-painel [data-painel]").forEach((b) => b.addEventListener("click", () => trocarPainel(b.dataset.painel)));

  $("#btn-sair").addEventListener("click", async () => {
    await Conta.sair();
    location.href = "conta.html";
  });

  /* ---------- Meus pedidos ---------- */
  async function renderPedidos() {
    const box = $("#painel-pedidos");
    box.innerHTML = `<p class="carregando">Carregando pedidos…</p>`;
    let pedidos = [];
    try { pedidos = await Conta.listarPedidos(); }
    catch (err) { box.innerHTML = `<p class="erro">${esc(err.message)}</p>`; return; }
    if (!pedidos.length) {
      box.innerHTML = `<div class="vazio conta-cartao largo"><p style="font-size:2.4rem">📦</p><p>Você ainda não enviou pedidos.</p>
        <p><a class="btn btn-primario" href="produtos.html" style="margin-top:12px">Ver produtos</a></p></div>`;
      return;
    }
    box.innerHTML = pedidos.map((p, i) => {
      const data = new Date(p.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
      const itens = (p.itens || []).map((it) => `<li><span>${esc(it.nome)}<small>${esc(it.cor)} · ${esc(it.embalagem)}</small></span><strong>${it.qtd}x</strong></li>`).join("");
      return `<article class="pedido">
        <header><div><strong>Pedido ${esc(p.numero)}</strong><small>${data}</small></div><span class="status">Enviado ao vendedor</span></header>
        <ul>${itens}</ul>
        ${p.observacoes ? `<p class="obs">Obs.: ${esc(p.observacoes)}</p>` : ""}
        <button type="button" class="btn btn-contorno-azul" data-repetir="${i}">↻ Repetir pedido</button>
      </article>`;
    }).join("");
    $$("[data-repetir]", box).forEach((b) => b.addEventListener("click", () => {
      (pedidos[+b.dataset.repetir].itens || []).forEach((it) => {
        if (CW.buscarProduto(it.id)) CW.adicionarAoCarrinho(it.id, it.cor, it.embalagem, it.qtd);
      });
      CW.abrirCarrinho();
    }));
  }

  /* ---------- Meus dados ---------- */
  const form = $("#form-dados");
  const campo = (nome) => form.elements[nome];
  $("#f-uf").innerHTML = `<option value="">UF</option>` + UFS.map((u) => `<option>${u}</option>`).join("");

  function aplicarTipo(tipo) {
    $$("[name=tipo]", form).forEach((r) => (r.checked = r.value === tipo));
    $$("fieldset[data-tipo]", form).forEach((f) => (f.hidden = f.dataset.tipo !== tipo));
  }
  $$("[name=tipo]", form).forEach((r) => r.addEventListener("change", () => aplicarTipo(r.value)));

  function preencherDados() {
    const p = Conta.perfil || {};
    const tipo = p.tipo || sess.get(CHAVE_TIPO) || "pj";
    aplicarTipo(tipo);
    ["cnpj", "inscricao_estadual", "razao_social", "nome_fantasia", "responsavel", "nome", "cpf", "telefone",
     "cep", "numero", "logradouro", "complemento", "bairro", "cidade", "uf"].forEach((n) => { if (campo(n)) campo(n).value = p[n] || ""; });
    $("#f-email").value = Conta.usuario.email;
    const precisaAceite = !p.aceite_privacidade_em && !sess.get(CHAVE_ACEITE);
    $("#bloco-aceite-dados").hidden = !precisaAceite;
    erro("#erro-dados");
  }

  // Máscaras
  [["f-cnpj", "cnpj"], ["f-cpf", "cpf"], ["f-cep", "cep"], ["f-tel", "telefone"]].forEach(([id, m]) => {
    $("#" + id).addEventListener("input", (e) => (e.target.value = BR.mascaras[m](e.target.value)));
  });

  // CEP -> endereço
  let ultimoCep = "";
  $("#f-cep").addEventListener("input", async (e) => {
    const cep = BR.so(e.target.value);
    if (cep.length !== 8 || cep === ultimoCep) return;
    ultimoCep = cep;
    const dica = $("#dica-cep");
    dica.textContent = "Buscando endereço…";
    try {
      const end = await BR.buscarCep(cep);
      if (end.logradouro) campo("logradouro").value = end.logradouro;
      if (end.bairro) campo("bairro").value = end.bairro;
      campo("cidade").value = end.cidade;
      campo("uf").value = end.uf;
      dica.textContent = "Endereço encontrado ✓";
      (end.logradouro ? campo("numero") : campo("logradouro")).focus();
    } catch (err) {
      dica.textContent = err.message + " Preencha manualmente.";
    }
  });

  // CNPJ -> dados da empresa (Receita Federal via BrasilAPI)
  $("#btn-cnpj").addEventListener("click", async () => {
    const btn = $("#btn-cnpj");
    erro("#erro-dados");
    ocupado(btn, true, "…");
    try {
      const d = await BR.buscarCnpj(campo("cnpj").value);
      const set = (n, v) => { if (v && campo(n)) campo(n).value = v; };
      set("razao_social", d.razao_social);
      set("nome_fantasia", d.nome_fantasia);
      set("cep", d.cep && BR.mascaras.cep(d.cep));
      set("logradouro", d.logradouro);
      set("numero", d.numero);
      set("complemento", d.complemento);
      set("bairro", d.bairro);
      set("cidade", d.cidade);
      set("uf", d.uf);
      if (!campo("telefone").value && d.telefone) campo("telefone").value = BR.mascaras.telefone(d.telefone);
      ultimoCep = BR.so(d.cep);
      CW.mostrarToast(d.situacao && d.situacao !== "ATIVA" ? `Atenção: situação cadastral ${esc(d.situacao)}` : "Dados da empresa preenchidos ✓");
    } catch (err) {
      erro("#erro-dados", err.message);
    } finally {
      ocupado(btn, false);
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    erro("#erro-dados");
    const tipo = $("[name=tipo]:checked", form).value;
    const v = (n) => (campo(n).value || "").trim();
    const d = { tipo, telefone: v("telefone"), cep: v("cep"), numero: v("numero"), logradouro: v("logradouro"),
      complemento: v("complemento"), bairro: v("bairro"), cidade: v("cidade"), uf: v("uf") };

    const faltando = [];
    if (tipo === "pj") {
      Object.assign(d, { cnpj: v("cnpj"), inscricao_estadual: v("inscricao_estadual"), razao_social: v("razao_social"),
        nome_fantasia: v("nome_fantasia"), responsavel: v("responsavel"), nome: null, cpf: null });
      if (!BR.cnpjValido(d.cnpj)) return erro("#erro-dados", "CNPJ inválido. Confira os números.");
      if (!d.razao_social) faltando.push("razão social");
      if (!d.responsavel) faltando.push("nome do responsável");
    } else {
      Object.assign(d, { nome: v("nome"), cpf: v("cpf"), cnpj: null, inscricao_estadual: null, razao_social: null, nome_fantasia: null, responsavel: null });
      if (!d.nome || d.nome.split(" ").length < 2) faltando.push("nome completo");
      if (!BR.cpfValido(d.cpf)) return erro("#erro-dados", "CPF inválido. Confira os números.");
    }
    if (BR.so(d.telefone).length < 10) faltando.push("telefone com DDD");
    if (BR.so(d.cep).length !== 8) faltando.push("CEP");
    if (!d.logradouro) faltando.push("rua");
    if (!d.numero) faltando.push("número");
    if (!d.cidade) faltando.push("cidade");
    if (!d.uf) faltando.push("estado");
    if (faltando.length) return erro("#erro-dados", "Preencha: " + faltando.join(", ") + ".");

    const p = Conta.perfil || {};
    if (!p.aceite_privacidade_em) {
      const aceite = sess.get(CHAVE_ACEITE);
      if (aceite) d.aceite_privacidade_em = aceite;
      else if ($("#aceite-dados").checked) d.aceite_privacidade_em = new Date().toISOString();
      else return erro("#erro-dados", "Aceite a Política de Privacidade para continuar.");
    }

    const btn = $("#btn-salvar");
    ocupado(btn, true, "Salvando…");
    try {
      await Conta.salvarPerfil(d);
      sess.del(CHAVE_ACEITE);
      sess.del(CHAVE_TIPO);
      CW.mostrarToast("Dados salvos com sucesso ✓");
      if (voltarAoCarrinhoSePreciso()) return;
      abrirPainel("dados");
    } catch (err) {
      erro("#erro-dados", err.message);
    } finally {
      ocupado(btn, false);
    }
  });

  /* ---------- Favoritos ---------- */
  function renderFavoritos() {
    const favs = CW.lerFavoritos().map(CW.buscarProduto);
    const box = $("#lista-favoritos");
    if (!favs.length) {
      box.innerHTML = `<div class="vazio"><p style="font-size:2.4rem">♡</p><p>Você ainda não favoritou produtos. Toque no ♡ de um produto para salvá-lo aqui.</p></div>`;
      return;
    }
    CW.renderProdutos(box, favs);
  }
  document.addEventListener("favoritos:alterados", () => { if (!$("#painel-favoritos").hidden) renderFavoritos(); });

  /* ---------- Início ---------- */
  document.addEventListener("DOMContentLoaded", async () => {
    $("#aviso-demo").hidden = !Conta.modoDemo;
    await window.ContaPronta;
    if (Conta.usuario) return aposEntrar();
    mostrar("acesso");
    trocarAba(params.get("criar") ? "criar" : "entrar");
    if (params.get("voltar") === "carrinho") erro("#erro-acesso", "Entre ou crie sua conta para finalizar o pedido.");
  });
})();
