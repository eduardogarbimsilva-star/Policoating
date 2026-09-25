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
    abrirPainel(Conta.perfilCompleto() ? (location.hash.slice(1) || "resumo") : "dados");
  }

  /* ---------- Painel ---------- */
  const PAINEIS = ["resumo", "pedidos", "dados", "favoritos", "privacidade"];
  let pedidosCache = null;

  async function carregarPedidos(forcar) {
    if (!pedidosCache || forcar) pedidosCache = await Conta.listarPedidos();
    return pedidosCache;
  }

  function iniciais(nome) {
    const partes = String(nome || "").trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return "?";
    return (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
  }

  // Campos obrigatórios preenchidos -> % do cadastro
  function progressoCadastro(p) {
    const base = ["telefone", "cep", "logradouro", "numero", "cidade", "uf"];
    const campos = (p.tipo === "pj" ? ["razao_social", "cnpj", "responsavel"] : ["nome", "cpf"]).concat(base);
    if (!p.tipo) return 0;
    return Math.round((campos.filter((c) => p[c]).length / campos.length) * 100);
  }

  function atualizarLateral() {
    const p = Conta.perfil || {};
    const titulo = p.tipo === "pj" ? (p.nome_fantasia || p.razao_social) : p.nome;
    $("#avatar").textContent = iniciais(p.tipo === "pj" ? (p.nome_fantasia || p.razao_social || p.responsavel) : p.nome || Conta.usuario.email);
    $("#ola-nome").textContent = titulo || "Complete seu cadastro";
    $("#ola-email").textContent = Conta.usuario.email;
    const selo = $("#selo-tipo");
    selo.hidden = !p.tipo;
    selo.textContent = p.tipo === "pj" ? "🏢 Empresa" : "👤 Pessoa física";
    const pct = progressoCadastro(p);
    $("#progresso-valor").style.width = pct + "%";
    $("#progresso-texto").textContent = pct === 100 ? "✓ Cadastro completo" : `Cadastro ${pct}% completo`;
    $("#progresso").classList.toggle("completo", pct === 100);
    $("#alerta-cadastro").hidden = Conta.perfilCompleto();
    const favs = CW.lerFavoritos().length;
    $("#badge-favoritos").textContent = favs || "";
    if (pedidosCache) $("#badge-pedidos").textContent = pedidosCache.length || "";
  }

  function abrirPainel(aba) {
    mostrar("painel");
    atualizarLateral();
    carregarPedidos().then(atualizarLateral).catch(() => {});
    trocarPainel(PAINEIS.includes(aba) ? aba : "resumo");
  }

  function trocarPainel(aba) {
    $$(".conta-menu [data-painel]").forEach((b) => {
      const ativo = b.dataset.painel === aba;
      b.classList.toggle("ativo", ativo);
      b.setAttribute("aria-selected", ativo);
    });
    $$(".painel").forEach((el) => (el.hidden = el.id !== "painel-" + aba));
    history.replaceState(null, "", location.pathname + location.search + "#" + aba);
    if (aba === "resumo") renderResumo();
    if (aba === "pedidos") renderPedidos();
    if (aba === "dados") preencherDados();
    if (aba === "favoritos") renderFavoritos();
    if (aba === "privacidade") renderPrivacidade();
    if (window.innerWidth < 860) $(".conta-conteudo").scrollIntoView({ block: "start" });
  }
  $$(".conta-menu [data-painel]").forEach((b) => b.addEventListener("click", () => trocarPainel(b.dataset.painel)));
  document.addEventListener("click", (e) => {
    const ir = e.target.closest("[data-ir]");
    if (ir) trocarPainel(ir.dataset.ir);
  });

  $("#btn-sair").addEventListener("click", async () => {
    await Conta.sair();
    location.href = "conta.html";
  });

  const dataCurta = (iso) => new Date(iso).toLocaleDateString("pt-BR");
  const dataHora = (iso) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

  /* ---------- Visão geral ---------- */
  function linhaDl(rotulo, valor) { return valor ? `<dt>${esc(rotulo)}</dt><dd>${esc(valor)}</dd>` : ""; }

  function htmlEndereco(p) {
    if (!p.logradouro) return `<p class="vazio-mini">Nenhum endereço cadastrado.</p>`;
    return `<address>${esc(p.logradouro)}, ${esc(p.numero)}${p.complemento ? " – " + esc(p.complemento) : ""}<br>
      ${p.bairro ? esc(p.bairro) + " · " : ""}${esc(p.cidade)}/${esc(p.uf)}<br>CEP ${esc(p.cep)}</address>`;
  }

  function cartaoPedido(p, i, compacto) {
    const itens = p.itens || [];
    const total = itens.reduce((s, it) => s + (+it.qtd || 0), 0);
    const lista = itens.map((it) => {
      const prod = CW.buscarProduto(it.id);
      const cor = prod && (prod.cores.find((c) => c.nome === it.cor) || prod.cores[0]);
      return `<li>${cor ? `<i class="bolinha" style="background:${cor.hex}"></i>` : ""}<span>${esc(it.nome)}<small>${esc(it.cor)} · ${esc(it.embalagem)}</small></span><strong>${it.qtd}×</strong></li>`;
    }).join("");
    return `<article class="pedido">
      <header>
        <div><strong>Pedido ${esc(p.numero)}</strong><small>${dataHora(p.criado_em)} · ${total} ${total === 1 ? "item" : "itens"}</small></div>
        <span class="status">✓ Enviado ao vendedor</span>
      </header>
      <ul>${lista}</ul>
      ${p.observacoes ? `<p class="obs">📝 ${esc(p.observacoes)}</p>` : ""}
      ${compacto ? "" : `<footer>
        <button type="button" class="btn btn-primario" data-repetir="${i}">↻ Repetir pedido</button>
        <button type="button" class="btn btn-contorno-azul" data-falar="${i}">💬 Falar sobre este pedido</button>
      </footer>`}
    </article>`;
  }

  async function renderResumo() {
    const p = Conta.perfil || {};
    $("#ola-saudacao").textContent = Conta.nomeExibicao() || "cliente";
    $("#ola-info").textContent = "Membro desde " + (p.criado_em ? dataCurta(p.criado_em) : dataCurta(p.aceite_privacidade_em || Date.now()));
    $("#resumo-titulo-dados").textContent = p.tipo === "pj" ? "Dados da empresa" : "Dados pessoais";
    $("#resumo-dados").innerHTML = p.tipo === "pj"
      ? linhaDl("Razão social", p.razao_social) + linhaDl("Nome fantasia", p.nome_fantasia) + linhaDl("CNPJ", p.cnpj) +
        linhaDl("Inscrição estadual", p.inscricao_estadual) + linhaDl("Responsável", p.responsavel) + linhaDl("Telefone", p.telefone)
      : linhaDl("Nome", p.nome) + linhaDl("CPF", p.cpf) + linhaDl("Telefone", p.telefone);
    if (!$("#resumo-dados").innerHTML) $("#resumo-dados").innerHTML = `<p class="vazio-mini">Cadastro ainda não preenchido.</p>`;
    $("#resumo-endereco").innerHTML = htmlEndereco(p);
    $("#est-favoritos").textContent = CW.lerFavoritos().length;

    let pedidos = [];
    try { pedidos = await carregarPedidos(); } catch (e) { /* mostra vazio */ }
    atualizarLateral();
    $("#est-pedidos").textContent = pedidos.length;
    $("#est-ultimo").textContent = pedidos.length ? dataCurta(pedidos[0].criado_em) : "—";
    $("#resumo-ultimo").innerHTML = pedidos.length
      ? cartaoPedido(pedidos[0], 0, true)
      : `<p class="vazio-mini">Você ainda não enviou pedidos. <a href="produtos.html">Ver produtos →</a></p>`;
  }

  /* ---------- Meus pedidos ---------- */
  async function renderPedidos() {
    const box = $("#lista-pedidos");
    box.innerHTML = `<p class="carregando">Carregando pedidos…</p>`;
    let pedidos = [];
    try { pedidos = await carregarPedidos(true); }
    catch (err) { box.innerHTML = `<p class="erro">${esc(err.message)}</p>`; return; }
    atualizarLateral();
    if (!pedidos.length) {
      box.innerHTML = `<div class="vazio cartao-info"><p style="font-size:2.4rem">📦</p><p>Você ainda não enviou pedidos.</p>
        <p><a class="btn btn-primario" href="produtos.html" style="margin-top:12px">Ver produtos</a></p></div>`;
      return;
    }
    box.innerHTML = pedidos.map((p, i) => cartaoPedido(p, i, false)).join("");
    $$("[data-repetir]", box).forEach((b) => b.addEventListener("click", () => {
      (pedidos[+b.dataset.repetir].itens || []).forEach((it) => {
        if (CW.buscarProduto(it.id)) CW.adicionarAoCarrinho(it.id, it.cor, it.embalagem, it.qtd);
      });
      CW.abrirCarrinho();
    }));
    $$("[data-falar]", box).forEach((b) => b.addEventListener("click", () => {
      const num = pedidos[+b.dataset.falar].numero;
      window.open(CW.linkWhatsApp(`Olá! Gostaria de falar sobre o meu pedido nº *${num}*.`), "_blank", "noopener");
    }));
  }

  /* ---------- Privacidade ---------- */
  function renderPrivacidade() {
    const p = Conta.perfil || {};
    $("#priv-email").textContent = Conta.usuario.email;
    $("#priv-aceite").textContent = p.aceite_privacidade_em ? "Política de Privacidade aceita em " + dataHora(p.aceite_privacidade_em) + "." : "";
  }

  $("#btn-baixar").addEventListener("click", async () => {
    let pedidos = [];
    try { pedidos = await carregarPedidos(true); } catch (e) { /* segue sem pedidos */ }
    const dados = { exportado_em: new Date().toISOString(), email: Conta.usuario.email, cadastro: Conta.perfil, pedidos, favoritos: CW.lerFavoritos() };
    const url = URL.createObjectURL(new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "meus-dados-policoating.json" });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  $("#btn-excluir").addEventListener("click", () => {
    if (!confirm("Deseja solicitar a exclusão da sua conta e dos seus dados? Nossa equipe confirmará pelo WhatsApp.")) return;
    const p = Conta.perfil || {};
    const doc = p.tipo === "pj" ? "CNPJ " + (p.cnpj || "") : "CPF " + (p.cpf || "");
    window.open(CW.linkWhatsApp(`Olá! Solicito a exclusão da minha conta no site e dos meus dados (LGPD).\nE-mail: ${Conta.usuario.email}\n${doc}`), "_blank", "noopener");
  });

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

  $("#btn-cancelar").addEventListener("click", () => {
    preencherDados();
    if (Conta.perfilCompleto()) trocarPainel("resumo");
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
      abrirPainel("resumo");
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
  document.addEventListener("favoritos:alterados", () => {
    if ($("#view-painel").hidden) return;
    atualizarLateral();
    if (!$("#painel-favoritos").hidden) renderFavoritos();
  });

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
