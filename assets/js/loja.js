/* =========================================================
   Policoating — Loja: compra pelo site, prazos, pedidos, chat e pós-venda
   - A compra vai direto para o sistema (sem WhatsApp): o banco confere preço
     e estoque, reserva o estoque e calcula o prazo de envio e de entrega.
   - Prazo (simulação): a empresa fica em Matão-SP. Cada região tem uma
     expectativa diferente; pedidos até 14h de dia útil saem no mesmo dia.
   - Cada pedido tem chat entre o cliente e a equipe, e o cliente pode pedir
     cancelamento, reembolso/devolução ou ajuda do atendimento.
   - Sem Supabase (modo demonstração) tudo fica neste navegador.
   ========================================================= */
(function () {
  "use strict";

  const CFG = window.SITE_CONFIG || {};
  const SB = CFG.supabase || {};
  const ONLINE = !!(SB.url && SB.anonKey);
  const ler = (k, p) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? p; } catch (e) { return p; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem espaço */ } };
  const K = { pedidos: "policoating_demo_pedidos", perfis: "policoating_demo_perfis", msgs: "policoating_demo_mensagens",
    solic: "policoating_demo_solicitacoes", estoque: "policoating_demo_estoque", equipe: "policoating_demo_equipe" };

  /* ---------- Empresa e prazos por região (simulação) ---------- */
  const EMPRESA = { cidade: "Matão", uf: "SP", cep: "15990-000", horaCorte: 14 };
  // CEP (5 primeiros dígitos) -> estado
  const FAIXAS_UF = [[1000, 19999, "SP"], [20000, 28999, "RJ"], [29000, 29999, "ES"], [30000, 39999, "MG"], [40000, 48999, "BA"], [49000, 49999, "SE"],
    [50000, 56999, "PE"], [57000, 57999, "AL"], [58000, 58999, "PB"], [59000, 59999, "RN"], [60000, 63999, "CE"], [64000, 64999, "PI"], [65000, 65999, "MA"],
    [66000, 68899, "PA"], [68900, 68999, "AP"], [69000, 69299, "AM"], [69300, 69399, "RR"], [69400, 69899, "AM"], [69900, 69999, "AC"],
    [70000, 72799, "DF"], [72800, 72999, "GO"], [73000, 73699, "DF"], [73700, 76799, "GO"], [76800, 76999, "RO"], [77000, 77999, "TO"],
    [78000, 78899, "MT"], [79000, 79999, "MS"], [80000, 87999, "PR"], [88000, 89999, "SC"], [90000, 99999, "RS"]];
  const ufDoCep = (cep) => { const n = parseInt(String(cep || "").replace(/\D/g, "").slice(0, 5), 10); const f = FAIXAS_UF.find(([a, b]) => n >= a && n <= b); return f ? f[2] : ""; };
  // mesma tabela da função prazo_regiao() do banco (PARTE L)
  function regiao(uf, cep) {
    const n = parseInt(String(cep || "").replace(/\D/g, "").slice(0, 5), 10) || 0;
    uf = String(uf || ufDoCep(cep)).toUpperCase();
    if (uf === "SP" && n >= 13000 && n <= 16999) return { nome: "Região de Matão (centro do interior de SP)", min: 1, max: 2 };
    if (uf === "SP") return { nome: "Estado de São Paulo", min: 2, max: 3 };
    if (["MG", "RJ", "ES", "PR"].includes(uf)) return { nome: "Sudeste e Paraná", min: 3, max: 5 };
    if (["SC", "RS", "GO", "DF", "MS"].includes(uf)) return { nome: "Sul e Centro-Oeste", min: 4, max: 7 };
    if (["MT", "TO", "BA", "SE"].includes(uf)) return { nome: "Centro-Oeste e Bahia", min: 6, max: 9 };
    if (["AL", "PE", "PB", "RN", "CE", "PI", "MA"].includes(uf)) return { nome: "Nordeste", min: 7, max: 11 };
    if (["PA", "AP", "AM", "RR", "AC", "RO"].includes(uf)) return { nome: "Norte", min: 9, max: 15 };
    return null;
  }
  const diaUtil = (d) => d.getDay() !== 0 && d.getDay() !== 6;
  function somarDiasUteis(d, n) { const r = new Date(d); while (n > 0) { r.setDate(r.getDate() + 1); if (diaUtil(r)) n--; } return r; }
  /** Dia do envio: hoje se for dia útil antes das 14h; senão, o próximo dia útil */
  function diaDeEnvio(agora) {
    const d = new Date(agora || Date.now()); const hoje = new Date(d); hoje.setHours(0, 0, 0, 0);
    if (diaUtil(d) && d.getHours() < EMPRESA.horaCorte) return hoje;
    return somarDiasUteis(hoje, 1);
  }
  /** Prazo previsto para um destino: { regiao, envio, entregaMin, entregaMax } (datas) ou null se o CEP/UF for inválido */
  function prazo(uf, cep, agora) {
    const r = regiao(uf, cep); if (!r) return null;
    const envio = diaDeEnvio(agora);
    return { regiao: r.nome, diasMin: r.min, diasMax: r.max, envio, entregaMin: somarDiasUteis(envio, r.min), entregaMax: somarDiasUteis(envio, r.max) };
  }
  const iso = (d) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10) : null);
  const dataBR = (v) => { if (!v) return ""; const d = typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + "T12:00") : new Date(v); return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }); };
  function textoEnvio(dEnvio) {
    const d = typeof dEnvio === "string" ? new Date(dEnvio + "T12:00") : dEnvio, h = new Date(); h.setHours(12, 0, 0, 0);
    const dias = Math.round((new Date(d).setHours(12, 0, 0, 0) - h) / 864e5);
    return dias <= 0 ? "hoje" : dias === 1 ? "amanhã" : dataBR(d);
  }

  /* ---------- Status ---------- */
  const STATUS = {
    recebido: { cliente: "Pedido recebido", equipe: "Nova venda", passo: 1 },
    confirmado: { cliente: "Preparando o envio", equipe: "Em preparação", passo: 2 },
    enviado: { cliente: "A caminho", equipe: "A caminho", passo: 3 },
    entregue: { cliente: "Entregue", equipe: "Entregue", passo: 4 },
    cancelado: { cliente: "Cancelado", equipe: "Cancelada", passo: 0 },
    reembolsado: { cliente: "Reembolsado", equipe: "Reembolsada", passo: 0 }
  };
  const TIPOS_SOLIC = { cancelamento: "Cancelamento", reembolso: "Reembolso / devolução", atendimento: "Ajuda do atendimento" };

  /* ---------- Utilidades de pedido ---------- */
  const kgDaEmbalagem = (e) => { const m = String(e || "").match(/(\d+(?:[.,]\d+)?)\s*kg/i); return m ? parseFloat(m[1].replace(",", ".")) : 0; };
  const kgDoItem = (i) => (i.embalagem === "Sob medida" ? +i.qtd || 0 : (+i.qtd || 0) * kgDaEmbalagem(i.embalagem));
  const r2 = (v) => Math.round(v * 100) / 100;
  function precoEfetivo(p) {
    const preco = +p.preco || 0, promo = +p.precoPromo || 0;
    if (p.precoCombinar || !(preco > 0)) return null;
    const hoje = new Date().toISOString().slice(0, 10);
    return promo > 0 && promo < preco && (!p.promoAte || hoje <= p.promoAte) ? promo : preco;
  }
  function totais(itens) {
    let total = 0, kg = 0, combinar = false;
    itens.forEach((i) => { kg += +i.kg || 0; if (i.preco_kg == null) combinar = true; else total += +i.subtotal || 0; });
    return { total: r2(total), total_kg: r2(kg), tem_combinar: combinar };
  }
  const numeroNovo = () => { const d = new Date(); return "PC-" + String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0") + "-" + Math.random().toString(36).slice(2, 7).toUpperCase(); };
  const usuario = () => (window.Conta && window.Conta.usuario) || null;
  const sb = () => window.Conta.cliente();
  // O que falta no banco -> qual parte do setup.sql cria isso
  const PARTE_DE = [[/estoque_movimentos|estoque_saldos|estoque_minimos|pode_mexer_estoque/, "PARTE J (estoque) e depois a PARTE K"],
    [/kg_do_item|estoque_publico|pedidos_conferir_estoque|vendas|confirmar_venda/, "PARTE K"],
    [/so_digitos|cpf_valido|cnpj_valido/, "PARTE H"], [/eh_equipe|meu_papel/, "PARTE F"],
    [/criar_pedido|prazo_regiao|dia_de_envio|somar_dias_uteis|pedido_mensagens|pedido_solicitacoes|enviar_mensagem|marcar_lido|abrir_solicitacao|acao_pedido|resumo_(equipe|cliente)|_estornar|_msg_sistema|aplicar_promocao|remover_promocao|previsao_|destino_|tem_combinar|status/, "PARTE L"]];
  function erroBanco(e) {
    const m = String((e && e.message) || e || "");
    if (/schema cache|not find the function/i.test(m) && /criar_pedido|enviar_mensagem|marcar_lido|abrir_solicitacao|acao_pedido|resumo_|pedido_/i.test(m))
      return new Error("O Supabase ainda não reconheceu a PARTE L. No SQL Editor, rode: notify pgrst, 'reload schema';  e tente de novo em 1 minuto.");
    if (/does not exist|schema cache|not find the function/i.test(m)) {
      const achou = PARTE_DE.find(([re]) => re.test(m));
      return new Error(`Falta uma parte do banco: rode a ${achou ? achou[1] : "parte indicada"} do setup.sql no Supabase (em ordem: J, K e L). Detalhe técnico: ${m}`);
    }
    return new Error(m || "Não foi possível concluir. Tente novamente.");
  }

  /* ---------- Modo demonstração: "banco" no navegador ---------- */
  const Demo = {
    todos() { return ler(K.pedidos, {}); },
    achar(numero) { const t = this.todos(); for (const [email, l] of Object.entries(t)) { const p = l.find((x) => x.numero === numero); if (p) return { t, email, p }; } return null; },
    salvar(t) { gravar(K.pedidos, t); },
    papel() { const u = usuario(); if (!u) return null; const m = (ler(K.equipe, []) || []).find((x) => x.email === u.email.toLowerCase()); return m ? m.papel : null; },
    saldo(id) { return (ler(K.estoque, []) || []).filter((m) => m.produto_id === id).reduce((s, m) => s + (m.tipo === "saida" ? -m.kg : +m.kg), 0); },
    estoqueEmUso() { return (ler(K.estoque, []) || []).length > 0; },
    mov(m) { const l = ler(K.estoque, []) || []; l.push(Object.assign({ id: Date.now() + Math.random(), feito_por: (usuario() || {}).email || "sistema", criado_em: new Date().toISOString() }, m)); gravar(K.estoque, l); },
    estornar(p, obs) { (ler(K.estoque, []) || []).filter((m) => m.tipo === "saida" && m.pedido_numero === p.numero).forEach((m) => this.mov({ produto_id: m.produto_id, cor: m.cor, tipo: "entrada", kg: m.kg, pedido_numero: p.numero, obs })); },
    msg(numero, lado, texto, autor) {
      const t = ler(K.msgs, {}); (t[numero] = t[numero] || []).push({ id: Date.now() + Math.random(), pedido_numero: numero, lado, autor: autor || (lado === "sistema" ? "sistema" : (usuario() || {}).email), texto, criado_em: new Date().toISOString() });
      gravar(K.msgs, t);
      const a = this.achar(numero); if (a) { a.p.msg_ultima_em = new Date().toISOString(); a.p.ultima_msg_lado = lado; this.salvar(a.t); }
    }
  };

  /* ---------- API ---------- */
  const Loja = {
    EMPRESA, STATUS, TIPOS_SOLIC, prazo, ufDoCep, regiao, dataBR, textoEnvio, iso, kgDoItem, online: ONLINE,

    /** Compra: itens do carrinho [{ id, embalagem, qtd }] -> número do pedido */
    async criarPedido(itens, obs) {
      const u = usuario(); if (!u) throw new Error("Entre na sua conta para comprar.");
      const limpos = (itens || []).map((i) => ({ id: i.id, embalagem: i.embalagem, qtd: Math.max(1, parseInt(i.qtd, 10) || 1) }));
      if (!limpos.length) throw new Error("Seu carrinho está vazio.");
      obs = String(obs || "").replace(/\s+/g, " ").trim().slice(0, 500);
      if (ONLINE) {
        const { data, error } = await (await sb()).rpc("criar_pedido", { p_itens: limpos, p_obs: obs || null });
        if (error) throw erroBanco(error);
        return data;
      }
      // demonstração: mesmas regras do banco
      const perfil = (ler(K.perfis, {}) || {})[u.email] || {};
      const pz = prazo(perfil.uf, perfil.cep);
      if (!pz) throw new Error("Complete o endereço de entrega (CEP e estado) no seu cadastro.");
      const produtos = window.PRODUTOS || [], usoEstoque = Demo.estoqueEmUso(), porProduto = {};
      const linhas = limpos.map((i) => {
        const p = produtos.find((x) => x.id === i.id); if (!p) throw new Error("Um dos produtos não está mais disponível. Atualize o carrinho.");
        const kg = kgDoItem(i), preco = precoEfetivo(p);
        porProduto[p.id] = (porProduto[p.id] || 0) + kg;
        return { id: p.id, codigo: p.codigo || p.id.toUpperCase(), nome: p.nome, cor: p.cores[0].nome, embalagem: i.embalagem, qtd: i.qtd, kg,
          preco_kg: preco, subtotal: preco == null ? null : r2(preco * kg), foto: (p.fotos || [])[0] || p.cores[0].foto || null };
      });
      if (usoEstoque) for (const [id, kg] of Object.entries(porProduto)) {
        const s = Demo.saldo(id); if (kg > s) throw new Error(`Estoque insuficiente para ${linhas.find((l) => l.id === id).nome}: disponível ${Math.max(0, s)} kg.`);
      }
      const numero = numeroNovo(), agora = new Date().toISOString();
      const ped = Object.assign({ numero, criado_em: agora, status: "recebido", itens: linhas, observacoes: obs || null,
        destino_uf: perfil.uf, destino_cep: perfil.cep, destino_cidade: perfil.cidade,
        previsao_envio: iso(pz.envio), previsao_entrega_min: iso(pz.entregaMin), previsao_entrega_max: iso(pz.entregaMax) }, totais(linhas));
      const t = Demo.todos(); (t[u.email] = t[u.email] || []).unshift(ped); Demo.salvar(t);
      if (usoEstoque) Object.entries(porProduto).forEach(([id, kg]) => Demo.mov({ produto_id: id, cor: linhas.find((l) => l.id === id).cor, tipo: "saida", kg, pedido_numero: numero, obs: "Reserva da compra" }));
      Demo.msg(numero, "sistema", `Compra recebida. Envio previsto: ${dataBR(ped.previsao_envio)}. Entrega estimada entre ${dataBR(ped.previsao_entrega_min)} e ${dataBR(ped.previsao_entrega_max)}.`);
      return numero;
    },

    /** Um pedido (cliente dono ou equipe) */
    async pedido(numero) {
      if (ONLINE) {
        const c = await sb();
        const { data, error } = await c.from("pedidos").select("*").eq("numero", numero).maybeSingle();
        if (error) throw erroBanco(error);
        if (!data) throw new Error("Pedido não encontrado.");
        if (data.cliente_id) { const r = await c.from("clientes").select("*").eq("id", data.cliente_id).maybeSingle(); data.cliente = r.data || {}; }
        return data;
      }
      const a = Demo.achar(numero); if (!a) throw new Error("Pedido não encontrado.");
      return Object.assign({}, a.p, { cliente: Object.assign({ email: a.email }, (ler(K.perfis, {}) || {})[a.email]) });
    },

    async mensagens(numero) {
      if (ONLINE) {
        const { data, error } = await (await sb()).from("pedido_mensagens").select("*").eq("pedido_numero", numero).order("criado_em").limit(500);
        if (error) throw erroBanco(error); return data || [];
      }
      return (ler(K.msgs, {})[numero] || []).slice();
    },
    async enviarMensagem(numero, texto) {
      texto = String(texto || "").replace(/[ \t]+/g, " ").trim().slice(0, 1000);
      if (!texto) throw new Error("Escreva a mensagem.");
      if (ONLINE) { const { error } = await (await sb()).rpc("enviar_mensagem", { p_pedido: numero, p_texto: texto }); if (error) throw erroBanco(error); return; }
      const a = Demo.achar(numero); if (!a) throw new Error("Pedido não encontrado.");
      const u = usuario(), papel = Demo.papel(), dono = a.email === u.email;
      Demo.msg(numero, papel && !dono ? (papel === "admin" ? "atendimento" : "vendedor") : "cliente", texto);
    },
    /** Marca as mensagens do pedido como lidas por quem está vendo (cliente ou equipe) */
    async marcarLido(numero) {
      if (ONLINE) { await (await sb()).rpc("marcar_lido", { p_pedido: numero }); return; }
      const a = Demo.achar(numero); if (!a) return;
      const dono = a.email === (usuario() || {}).email;
      a.p[dono ? "msg_lida_cliente_em" : "msg_lida_equipe_em"] = new Date().toISOString(); Demo.salvar(a.t);
    },

    async solicitacoes(numero) {
      if (ONLINE) { const { data, error } = await (await sb()).from("pedido_solicitacoes").select("*").eq("pedido_numero", numero).order("criado_em"); if (error) throw erroBanco(error); return data || []; }
      return (ler(K.solic, {})[numero] || []).slice();
    },
    /** Cliente: cancelamento, reembolso/devolução ou atendimento. Retorna o novo status do pedido. */
    async solicitar(numero, tipo, motivo) {
      motivo = String(motivo || "").replace(/\s+/g, " ").trim().slice(0, 500);
      if (!TIPOS_SOLIC[tipo]) throw new Error("Tipo de solicitação inválido.");
      if (motivo.length < 3) throw new Error("Conte o motivo em poucas palavras.");
      if (ONLINE) { const { data, error } = await (await sb()).rpc("abrir_solicitacao", { p_pedido: numero, p_tipo: tipo, p_motivo: motivo }); if (error) throw erroBanco(error); return data; }
      const a = Demo.achar(numero); if (!a || a.email !== (usuario() || {}).email) throw new Error("Pedido não encontrado.");
      const p = a.p, t = ler(K.solic, {}), lista = t[numero] = t[numero] || [];
      if (lista.some((s) => s.tipo === tipo && s.status === "aberta")) throw new Error("Já existe uma solicitação dessas em andamento.");
      if (tipo === "cancelamento") {
        if (["cancelado", "reembolsado", "entregue", "enviado"].includes(p.status)) throw new Error(p.status === "enviado" || p.status === "entregue" ? "O pedido já foi enviado: peça devolução/reembolso." : "Este pedido já está encerrado.");
        if (p.status === "recebido") {            // ainda não confirmado: cancela na hora
          Object.assign(p, { status: "cancelado", cancelado_em: new Date().toISOString(), cancelado_por: "cliente", motivo_cancelamento: motivo }); Demo.salvar(a.t);
          Demo.estornar(p, "Estorno: compra cancelada pelo cliente");
          lista.push({ id: Date.now(), pedido_numero: numero, tipo, motivo, status: "aceita", resposta: "Cancelado automaticamente (pedido ainda não confirmado).", criado_em: new Date().toISOString(), resolvido_em: new Date().toISOString() });
          gravar(K.solic, t); Demo.msg(numero, "sistema", `Compra cancelada pelo cliente. Motivo: ${motivo}`); return "cancelado";
        }
      }
      if (tipo === "reembolso" && !["enviado", "entregue", "confirmado"].includes(p.status)) throw new Error("Reembolso/devolução é para pedidos em preparação, a caminho ou entregues.");
      lista.push({ id: Date.now(), pedido_numero: numero, tipo, motivo, status: "aberta", criado_em: new Date().toISOString() });
      gravar(K.solic, t);
      Demo.msg(numero, "sistema", `Cliente abriu uma solicitação: ${TIPOS_SOLIC[tipo]}. Motivo: ${motivo}`);
      return p.status;
    },

    /** Equipe: confirmar | enviar | entregar | cancelar | responder | excluir */
    async acao(numero, acao, dados) {
      dados = dados || {};
      if (ONLINE) {
        if (acao === "excluir") { const { error } = await (await sb()).from("pedidos").delete().eq("numero", numero); if (error) throw erroBanco(error); return; }
        const { error } = await (await sb()).rpc("acao_pedido", { p_pedido: numero, p_acao: acao, p_dados: dados }); if (error) throw erroBanco(error); return;
      }
      const papel = Demo.papel(); if (!papel) throw new Error("Sem permissão.");
      const a = Demo.achar(numero); if (!a) throw new Error("Pedido não encontrado.");
      const p = a.p, agora = new Date().toISOString(), eu = usuario().email;
      const exige = (...st) => { if (!st.includes(p.status)) throw new Error(`Não é possível: o pedido está "${STATUS[p.status].equipe}".`); };
      if (acao === "confirmar") {
        exige("recebido");
        (dados.itens || []).forEach((d) => { const it = p.itens.find((x) => x.id === d.id); if (it && d.preco_kg != null && +d.preco_kg >= 0) { it.preco_kg = r2(+d.preco_kg); it.subtotal = r2(it.preco_kg * it.kg); } });
        if (p.itens.some((i) => i.preco_kg == null)) throw new Error("Informe o preço combinado de todos os itens.");
        Object.assign(p, totais(p.itens), { status: "confirmado", confirmado_em: agora, vendedor: eu });
        Demo.salvar(a.t); Demo.msg(numero, "sistema", `Pedido confirmado. Valor total: ${p.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}. Envio previsto: ${dataBR(p.previsao_envio)}.`);
      } else if (acao === "enviar") {
        exige("confirmado");
        const pz = prazo(p.destino_uf, p.destino_cep, new Date(new Date().setHours(8, 0, 0, 0)));
        Object.assign(p, { status: "enviado", enviado_em: agora, transportadora: String(dados.transportadora || "").slice(0, 60) || null, rastreio: String(dados.rastreio || "").slice(0, 60) || null });
        if (pz) Object.assign(p, { previsao_entrega_min: iso(pz.entregaMin), previsao_entrega_max: iso(pz.entregaMax) });
        Demo.salvar(a.t); Demo.msg(numero, "sistema", `Pedido enviado${p.transportadora ? ` pela ${p.transportadora}` : ""}${p.rastreio ? ` (rastreio ${p.rastreio})` : ""}. Entrega estimada entre ${dataBR(p.previsao_entrega_min)} e ${dataBR(p.previsao_entrega_max)}.`);
      } else if (acao === "entregar") {
        exige("enviado"); Object.assign(p, { status: "entregue", entregue_em: agora }); Demo.salvar(a.t); Demo.msg(numero, "sistema", "Pedido entregue. Obrigado pela compra!");
      } else if (acao === "cancelar") {
        exige("recebido", "confirmado", "enviado");
        const motivo = String(dados.motivo || "").trim(); if (motivo.length < 3) throw new Error("Informe o motivo do cancelamento.");
        Object.assign(p, { status: "cancelado", cancelado_em: agora, cancelado_por: eu, motivo_cancelamento: motivo }); Demo.salvar(a.t);
        Demo.estornar(p, "Estorno: venda cancelada"); Demo.msg(numero, "sistema", `Pedido cancelado pela Policoating. Motivo: ${motivo}`);
      } else if (acao === "responder") {
        const t = ler(K.solic, {}), s = (t[numero] || []).find((x) => String(x.id) === String(dados.solicitacao));
        if (!s || s.status !== "aberta") throw new Error("Solicitação não encontrada ou já respondida.");
        const resposta = String(dados.resposta || "").trim().slice(0, 500);
        if (!dados.aceitar && resposta.length < 3) throw new Error("Explique ao cliente por que a solicitação foi recusada.");
        Object.assign(s, { status: dados.aceitar ? "aceita" : "recusada", resposta: resposta || null, resolvido_em: agora, resolvido_por: eu }); gravar(K.solic, t);
        if (dados.aceitar && s.tipo === "cancelamento" && !["cancelado", "reembolsado"].includes(p.status)) {
          Object.assign(p, { status: "cancelado", cancelado_em: agora, cancelado_por: eu, motivo_cancelamento: s.motivo }); Demo.salvar(a.t); Demo.estornar(p, "Estorno: cancelamento aceito");
        }
        if (dados.aceitar && s.tipo === "reembolso") { Object.assign(p, { status: "reembolsado", reembolsado_em: agora }); Demo.salvar(a.t); if (dados.devolverEstoque) Demo.estornar(p, "Estorno: devolução"); }
        Demo.msg(numero, "sistema", `${TIPOS_SOLIC[s.tipo]}: ${dados.aceitar ? "aceita" : "recusada"}${resposta ? `. ${resposta}` : "."}`);
      } else if (acao === "excluir") {
        const t = Demo.todos(); t[a.email] = t[a.email].filter((x) => x.numero !== numero); Demo.salvar(t); Demo.estornar(p, "Estorno: pedido excluído");
      } else throw new Error("Ação desconhecida.");
    },

    /** Equipe: solicitações em aberto { numero: [tipos] } */
    async solicitacoesAbertas() {
      if (ONLINE) {
        const { data, error } = await (await sb()).from("pedido_solicitacoes").select("pedido_numero, tipo").eq("status", "aberta").limit(2000);
        if (error) return {};
        const m = {}; (data || []).forEach((s) => (m[s.pedido_numero] = m[s.pedido_numero] || []).push(s.tipo)); return m;
      }
      const m = {}; Object.entries(ler(K.solic, {})).forEach(([n, l]) => l.filter((s) => s.status === "aberta").forEach((s) => (m[n] = m[n] || []).push(s.tipo))); return m;
    },

    /** Contadores para as notificações */
    async resumoEquipe() {
      if (ONLINE) { const { data, error } = await (await sb()).rpc("resumo_equipe"); if (error) return null; return data; }
      if (!Demo.papel()) return null;
      const hoje = iso(new Date()), pedidos = [].concat(...Object.values(Demo.todos())), solic = [].concat(...Object.values(ler(K.solic, {})));
      return {
        novas: pedidos.filter((p) => p.status === "recebido").length,
        enviar_hoje: pedidos.filter((p) => p.status === "confirmado" && p.previsao_envio <= hoje).length,
        mensagens: pedidos.filter((p) => p.ultima_msg_lado === "cliente" && (!p.msg_lida_equipe_em || p.msg_lida_equipe_em < p.msg_ultima_em)).length,
        solicitacoes: solic.filter((s) => s.status === "aberta").length
      };
    },
    async resumoCliente() {
      if (!usuario()) return null;
      if (ONLINE) { const { data, error } = await (await sb()).rpc("resumo_cliente"); if (error) return null; return data; }
      const lista = Demo.todos()[usuario().email] || [];
      return { mensagens: lista.filter((p) => p.ultima_msg_lado && p.ultima_msg_lado !== "cliente" && (!p.msg_lida_cliente_em || p.msg_lida_cliente_em < p.msg_ultima_em)).length };
    }
  };

  window.Loja = Loja;
})();
