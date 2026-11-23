/* =========================================================
   Cotação com código (etapas E06, E07 e E08)
   - Só aparece com o recurso "Cotação no site" (b2b_quote_enabled) ligado no painel.
   - O cliente monta a lista (produto, embalagem, cor, quantidade), informa os dados e o endereço
     e recebe um código COT-XXXX-XXXX-XX válido por 7 dias. A gravação é feita no servidor
     (função "frete", ação "cotar"), que confere os dados e calcula o frete.
   - Consulta pelo código (qualquer aparelho), histórico do cliente (conta + este aparelho)
     e, no painel, a lista da equipe com resposta, proposta e valor.
   - Sem Supabase (modo demonstração): tudo fica neste navegador.
   ========================================================= */
(function () {
  "use strict";
  const CFG = window.SITE_CONFIG || {};
  const SB = CFG.supabase || {};
  const ONLINE = !!(SB.url && SB.anonKey);
  const K_LISTA = "policoating_cotacao_itens", K_MINHAS = "policoating_cotacoes", K_DEMO = "policoating_demo_cotacoes";
  const HORAS = 168;
  const ler = (k, p) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? p : v; } catch (e) { return p; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem espaço/modo privado */ } };
  const so = (v) => String(v || "").replace(/\D/g, "");
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reais = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const dataHora = (iso) => (iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");
  const normalizarCodigo = (v) => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^COT/, "").slice(0, 10)
    .replace(/^(.{4})(.{0,4})(.{0,2}).*$/, (m, a, b, c) => ["COT", a, b, c].filter(Boolean).join("-"));
  const codigoValido = (v) => /^COT-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{2}$/.test(v);

  const STATUS = {
    recebida: { nome: "Recebida", dica: "A equipe ainda vai analisar." },
    em_analise: { nome: "Em análise", dica: "Um vendedor está preparando a proposta." },
    aguardando_dados: { nome: "Aguardando seus dados", dica: "O vendedor precisa de mais alguma informação. Fale com ele pelo WhatsApp." },
    proposta_enviada: { nome: "Proposta enviada", dica: "Confira a proposta abaixo." },
    aprovada: { nome: "Aprovada", dica: "Proposta aceita. O vendedor segue com o pedido." },
    recusada: { nome: "Encerrada", dica: "Esta cotação foi encerrada." }
  };

  /* ---------- lista de itens da cotação (neste navegador) ---------- */
  const chave = (i) => [i.id, i.embalagem || "", i.cor || ""].join("|");
  const lista = {
    ler: () => ler(K_LISTA, []).filter((i) => i && i.id && i.qtd > 0),
    gravar: (itens) => { gravar(K_LISTA, itens.slice(0, 30)); document.dispatchEvent(new CustomEvent("cotacao-lista")); },
    adicionar(item) {
      const itens = lista.ler(), q = Math.max(1, Math.min(100000, Math.round(Number(item.qtd) || 1)));
      const ex = itens.find((i) => chave(i) === chave(item));
      if (ex) ex.qtd = Math.min(100000, ex.qtd + q); else itens.push({ id: item.id, embalagem: item.embalagem || "", cor: item.cor || "", qtd: q });
      lista.gravar(itens);
      return itens;
    },
    limpar: () => lista.gravar([])
  };

  /* ---------- códigos guardados neste aparelho ---------- */
  function lembrar(c) {
    const agora = Date.now();
    const v = ler(K_MINHAS, []).filter((x) => x && x.protocolo !== c.protocolo && new Date(x.expira_em).getTime() > agora);
    v.unshift({ protocolo: c.protocolo, emitida_em: c.emitida_em, expira_em: c.expira_em });
    gravar(K_MINHAS, v.slice(0, 50));
  }
  const lembradas = () => ler(K_MINHAS, []).filter((x) => x && codigoValido(x.protocolo) && new Date(x.expira_em).getTime() > Date.now());
  function esquecer(protocolo) { gravar(K_MINHAS, ler(K_MINHAS, []).filter((x) => x.protocolo !== protocolo)); }

  /* ---------- servidor ---------- */
  async function token() {
    try { const sb = await window.Conta.cliente(); const { data } = await sb.auth.getSession(); return (data && data.session && data.session.access_token) || ""; } catch (e) { return ""; }
  }
  async function chamarFuncao(corpo) {
    const headers = { apikey: SB.anonKey, "Content-Type": "application/json" };
    const t = await token(); if (t) headers.Authorization = "Bearer " + t;
    let r;
    try { r = await fetch(`${SB.url}/functions/v1/frete`, { method: "POST", headers, body: JSON.stringify(corpo) }); }
    catch (e) { throw new Error("Não foi possível enviar agora. Verifique a internet ou fale com o vendedor pelo WhatsApp."); }
    let d = {}; try { d = await r.json(); } catch (e) { /* sem JSON */ }
    if (r.status === 404 && !d.erro) throw new Error("A função de cotação ainda não foi publicada no Supabase.");
    if (!r.ok) throw new Error(d.erro || "Não foi possível registrar a cotação agora.");
    return d;
  }
  const traduzir = (e) => new Error(/cotacoes|consultar_cotacao|atualizar_cotacao|schema cache|does not exist/i.test((e && e.message) || "")
    ? "O banco ainda não tem a parte de cotações. Rode a PARTE U do supabase/setup.sql." : (e && e.message) || "Erro ao falar com o servidor.");

  /* ---------- demonstração (sem servidor) ---------- */
  const ALFA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  function protocoloDemo() {
    const b = new Uint8Array(10); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(b) : b.forEach((x, i) => (b[i] = Math.random() * 256));
    const s = Array.from(b, (x) => ALFA[x % 32]).join("");
    return `COT-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
  }
  const demoTodas = () => ler(K_DEMO, []).filter((c) => new Date(c.expira_em).getTime() > Date.now());
  function pesoKg(itens) {
    return Math.round(itens.reduce((t, i) => { const m = /(\d+(?:[.,]\d+)?)\s*kg/i.exec(i.embalagem || ""); return t + (m ? i.qtd * Number(m[1].replace(",", ".")) : i.qtd); }, 0) * 100) / 100;
  }

  /* ---------- API ---------- */
  async function enviar(dados) {
    if (ONLINE) {
      const r = await chamarFuncao(Object.assign({ acao: "cotar" }, dados));
      lembrar(r);
      return r;
    }
    const emitida = new Date(), expira = new Date(emitida.getTime() + HORAS * 3600 * 1000);
    const itens = dados.itens.map((i) => { const p = (window.PRODUTOS || []).find((x) => x.id === i.id) || {}; return Object.assign({}, i, { nome: p.nome || i.id, codigo: p.codigo || i.id.toUpperCase() }); });
    const peso = Number(String(dados.peso_kg || "").replace(",", ".")) > 0 ? Number(String(dados.peso_kg).replace(",", ".")) : pesoKg(itens);
    const u = window.Conta && window.Conta.usuario;
    const c = Object.assign({}, dados, { id: "demo-" + Date.now(), protocolo: protocoloDemo(), cliente_id: u ? u.id || u.email : null, status: "recebida", itens, peso_kg: peso,
      frete: { zona: "manual", motivo: "demonstracao" }, documento: so(dados.documento), telefone: so(dados.telefone), cep: so(dados.cep),
      cidade: dados.cidade || "", uf: dados.uf || "", emitida_em: emitida.toISOString(), expira_em: expira.toISOString(), eventos: [] });
    delete c.acao;
    const todas = demoTodas(); todas.unshift(c); gravar(K_DEMO, todas.slice(0, 200));
    lembrar(c);
    return c;
  }
  async function consultar(protocolo) {
    protocolo = normalizarCodigo(protocolo);
    if (!codigoValido(protocolo)) throw new Error("Código incompleto. Ele tem o formato COT-XXXX-XXXX-XX.");
    if (!ONLINE) return demoTodas().find((c) => c.protocolo === protocolo) || null;
    const r = await fetch(`${SB.url}/rest/v1/rpc/consultar_cotacao`, { method: "POST", headers: { apikey: SB.anonKey, "Content-Type": "application/json" }, body: JSON.stringify({ p_protocolo: protocolo }) })
      .catch(() => { throw new Error("Sem conexão com o servidor."); });
    if (!r.ok) { let d = {}; try { d = await r.json(); } catch (e) { /* */ } throw traduzir({ message: d.message || "consultar_cotacao " + r.status }); }
    return (await r.json())[0] || null;
  }
  /** Histórico do cliente: as da conta (se logado) + as que foram feitas neste aparelho */
  async function minhas() {
    const porCodigo = new Map();
    const u = window.Conta && window.Conta.usuario;
    if (ONLINE && u) {
      try {
        const sb = await window.Conta.cliente();
        const campos = "protocolo,status,emitida_em,expira_em,cidade,uf,itens,peso_kg,frete,resposta,valor_proposta,descricao,nome,cep,logradouro,numero,bairro,atualizado_em";
        const buscar = (c) => sb.from("cotacoes").select(c).eq("cliente_id", u.id).order("emitida_em", { ascending: false }).limit(50);
        let { data, error } = await buscar(campos + ",entrega");
        if (error && /entrega/.test(error.message || "")) ({ data, error } = await buscar(campos));   // banco sem a PARTE V
        if (error) throw error;
        (data || []).forEach((c) => porCodigo.set(c.protocolo, Object.assign(c, { daConta: true })));
      } catch (e) { if (!/JWT|session/i.test(e.message || "")) throw traduzir(e); }
    }
    if (!ONLINE && u) demoTodas().filter((c) => c.cliente_id === (u.id || u.email)).forEach((c) => porCodigo.set(c.protocolo, Object.assign({}, c, { daConta: true })));
    const locais = lembradas().filter((x) => !porCodigo.has(x.protocolo)).slice(0, 20);
    const achadas = await Promise.all(locais.map((x) => consultar(x.protocolo).catch(() => undefined)));
    achadas.forEach((c, i) => { if (c) porCodigo.set(c.protocolo, Object.assign(c, { doAparelho: true })); else if (c === null) esquecer(locais[i].protocolo); });
    return [...porCodigo.values()].sort((a, b) => String(b.emitida_em).localeCompare(String(a.emitida_em)));
  }

  /* ---------- equipe (painel) ---------- */
  const equipe = {
    async listar() {
      if (!ONLINE) return demoTodas();
      const sb = await window.Conta.cliente();
      const { data, error } = await sb.from("cotacoes").select("*").order("emitida_em", { ascending: false }).limit(500);
      if (error) throw traduzir(error);
      return data || [];
    },
    async eventos(id) {
      if (!ONLINE) return ((demoTodas().find((c) => c.id === id) || {}).eventos || []);
      const sb = await window.Conta.cliente();
      const { data, error } = await sb.from("cotacoes_eventos").select("em,ator_email,de,para,nota").eq("cotacao_id", id).order("em", { ascending: false });
      if (error) throw traduzir(error);
      return data || [];
    },
    async atualizar(id, status, resposta, valor) {
      if (!STATUS[status]) throw new Error("Escolha um status.");
      if (!ONLINE) {
        const todas = demoTodas(), c = todas.find((x) => x.id === id);
        if (!c) throw new Error("Cotação não encontrada ou vencida.");
        const u = (window.Conta && window.Conta.usuario && window.Conta.usuario.email) || "demo";
        c.eventos = [{ em: new Date().toISOString(), ator_email: u, de: c.status, para: status, nota: resposta || null }].concat(c.eventos || []);
        Object.assign(c, { status, resposta: resposta || c.resposta || null, valor_proposta: valor == null ? c.valor_proposta : valor, atualizado_em: new Date().toISOString(), atualizado_por: u });
        gravar(K_DEMO, todas); return c;
      }
      const sb = await window.Conta.cliente();
      const { data, error } = await sb.rpc("atualizar_cotacao", { p_id: id, p_status: status, p_resposta: resposta || null, p_valor: valor == null ? null : valor });
      if (error) throw traduzir(error);
      return data;
    }
  };

  /* ---------- comprovante da cotação (resultado, acompanhamento, histórico) ---------- */
  const ROT = {
    tipo_local: { industrial: "Indústria / galpão", comercial: "Comércio / loja", obra: "Obra", residencial: "Residência", rural: "Zona rural" },
    horario: { comercial: "Horário comercial (8h–18h)", manha: "Só de manhã", tarde: "Só à tarde", combinar: "Combinar com o vendedor" },
    descarga: { empilhadeira: "Tem empilhadeira ou doca", manual: "Descarga manual (caixas)", nao_sei: "Não informado" },
    prazo_desejado: { urgente: "Urgente (até 3 dias)", semana: "Em até 1 semana", quinzena: "Em até 15 dias", mes: "Em até 30 dias", sem_pressa: "Sem pressa" }
  };
  const kgItem = (i) => { const m = /(\d+(?:[.,]\d+)?)\s*kg/i.exec(i.embalagem || ""); return m ? i.qtd * Number(m[1].replace(",", ".")) : Number(i.qtd) || 0; };
  const ehSob = (i) => !/\d\s*kg/i.test(i.embalagem || "");
  /** Volumes = caixas; itens sob medida entram como "a definir" */
  function volumes(itens) {
    const cx = (itens || []).filter((i) => !ehSob(i)).reduce((t, i) => t + (Number(i.qtd) || 0), 0);
    const sob = (itens || []).some(ehSob);
    return { caixas: cx, sob, texto: cx ? `${cx} ${cx === 1 ? "caixa" : "caixas"}${sob ? " + sob medida" : ""}` : sob ? "a definir (sob medida)" : "—" };
  }
  const kg = (n) => `${Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`;
  const km = (n) => `${Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
  function restante(iso) {
    const h = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 3600000));
    return h >= 48 ? `faltam ${Math.floor(h / 24)} dias` : h >= 1 ? `faltam ${h} h` : "vence em menos de 1 h";
  }
  function htmlFrete(f) {
    if (!f) return "";
    if (f.zona === "manual" || f.valor == null) return `<span class="cot-frete-manual">Frete: o vendedor informa na proposta</span>`;
    return `<span class="cot-frete">Frete estimado <strong>${reais(f.valor)}</strong>${f.km ? ` · ${km(f.km)}` : ""}</span>`;
  }
  const prazoTxt = (f) => (f && f.prazo_dias ? `até ${f.prazo_dias} ${f.prazo_dias === 1 ? "dia útil" : "dias úteis"}` : "o vendedor informa");
  const ETAPAS = ["recebida", "em_analise", "proposta_enviada", "aprovada"];
  function htmlLinhaTempo(status) {
    if (status === "recusada") return `<p class="cot-encerrada">${esc(STATUS.recusada.dica)}</p>`;
    const at = status === "aguardando_dados" ? 1 : ETAPAS.indexOf(status);
    return `<ol class="cot-tempo">${ETAPAS.map((e, i) => `<li class="${i < at ? "feito" : i === at ? "atual" : ""}">${esc(i === 1 && status === "aguardando_dados" ? STATUS.aguardando_dados.nome : STATUS[e].nome)}</li>`).join("")}</ol>`;
  }
  const linha = (k, v) => (v ? `<div><dt>${k}</dt><dd>${v}</dd></div>` : "");
  function linkAcompanhar(c) { return location.origin + location.pathname.replace(/[^/]*$/, "") + "cotacao#codigo=" + encodeURIComponent(c.protocolo); }
  function htmlComprovante(c, opcoes) {
    opcoes = opcoes || {};
    const st = STATUS[c.status] || STATUS.recebida, f = c.frete || {}, e = c.entrega || {}, itens = c.itens || [];
    const vol = volumes(itens), peso = c.peso_kg != null ? Number(c.peso_kg) : itens.reduce((t, i) => t + kgItem(i), 0);
    const temFrete = f.zona && f.zona !== "manual" && f.valor != null;
    const destaques = [
      ["Frete estimado", temFrete ? reais(f.valor) : "a informar", temFrete ? (f.zona === "local" ? "entrega local" : f.minimo_aplicado ? "valor mínimo" : "por km rodado") : "pelo vendedor"],
      ["Prazo estimado", f.prazo_dias ? `${f.prazo_dias} ${f.prazo_dias === 1 ? "dia útil" : "dias úteis"}` : "a informar", f.prazo_dias ? "após a confirmação" : "pelo vendedor"],
      ["Peso total", peso ? kg(peso) : "—", "pelas embalagens"],
      ["Volumes", vol.caixas ? String(vol.caixas) : "—", vol.sob ? "+ sob medida" : vol.caixas === 1 ? "caixa" : "caixas"]
    ];
    const end = [c.logradouro ? `${esc(c.logradouro)}${c.numero ? ", " + esc(c.numero) : ""}` : "", c.bairro ? esc(c.bairro) : "", c.cep ? "CEP " + esc(String(c.cep).replace(/^(\d{5})(\d{3})$/, "$1-$2")) : ""].filter(Boolean).join(" · ");
    const calc = !temFrete ? `<p class="cot-dica">${f.zona === "manual" && f.mensagem ? esc(f.mensagem) : "O frete será informado pelo vendedor na proposta."}</p>`
      : `<dl class="cot-dl">
          ${linha("Regra", esc(f.regra || ""))}
          ${f.km != null ? linha("Distância por estrada", `${km(f.km)} (só ida)`) : ""}
          ${f.km != null && f.tarifa_km != null ? linha("Cálculo", `${km(f.km)} × ${reais(f.tarifa_km)} = ${reais(Math.round(f.km * f.tarifa_km * 100) / 100)}`) : ""}
          ${f.minimo_aplicado ? linha("Mínimo aplicado", f.minimo != null ? reais(f.minimo) : reais(f.valor)) : ""}
          ${linha("Frete estimado", `<b>${reais(f.valor)}</b>`)}
        </dl>${f.pela_cidade ? `<p class="cot-dica">Calculado até o centro da cidade.</p>` : ""}`;
    const tabela = itens.length ? `<div class="cot-tabela"><table>
        <thead><tr><th>Código</th><th>Produto</th><th>Cor</th><th>Embalagem</th><th class="n">Qtd.</th><th class="n">Peso</th></tr></thead>
        <tbody>${itens.map((i) => `<tr><td data-rot="Código">${esc(i.codigo || String(i.id || "").toUpperCase())}</td><td data-rot="Produto" class="cot-td-prod">${esc(i.nome || i.id)}</td><td data-rot="Cor">${esc(i.cor || "—")}</td><td data-rot="Embalagem">${esc(ehSob(i) ? "Sob medida" : i.embalagem)}</td><td data-rot="Qtd." class="n">${esc(i.qtd)}${ehSob(i) ? " kg" : ""}</td><td data-rot="Peso" class="n">${kg(kgItem(i))}</td></tr>`).join("")}</tbody>
        <tfoot><tr><td colspan="4">Total</td><td data-rot="Volumes" class="n">${esc(vol.texto)}</td><td data-rot="Peso total" class="n">${peso ? kg(peso) : "—"}</td></tr></tfoot>
      </table></div>` : "";
    const corpo = `
      <div class="cot-comp-grade">
        <section class="cot-comp-bloco"><h4>Rota</h4>
          <div class="cot-comp-rota"><div><span>Origem</span><b>${esc(f.origem || "Matão/SP")}</b></div><i aria-hidden="true"></i><div><span>Destino</span><b>${esc(c.cidade || "—")}${c.uf ? "/" + esc(c.uf) : ""}</b></div></div>
          <dl class="cot-dl">${linha("Endereço", end)}${linha("Distância", f.km != null ? `${km(f.km)} por estrada` : f.zona === "local" ? "entrega local" : "")}${linha("Recebedor", c.primeiro_nome ? esc(c.primeiro_nome) : c.nome ? esc(c.nome) : "")}</dl>
        </section>
        <section class="cot-comp-bloco"><h4>Entrega</h4>
          <dl class="cot-dl">${linha("Tipo de local", esc(ROT.tipo_local[e.tipo_local] || ""))}${linha("Recebimento", esc(ROT.horario[e.horario] || ""))}${linha("Descarga", esc(ROT.descarga[e.descarga] || ""))}${e.agendamento != null ? linha("Agendamento", e.agendamento ? "Precisa agendar" : "Não precisa") : ""}${linha("Referência", esc(e.referencia || ""))}${linha("Veículo", e.veiculo ? esc(e.veiculo + (e.veiculo_peso_max ? ` (até ${e.veiculo_peso_max} kg)` : "")) : "")}${linha("Precisa para", esc(ROT.prazo_desejado[e.prazo_desejado] || ""))}</dl>
          ${!Object.keys(e).length ? `<p class="cot-dica">Sem detalhes de entrega.</p>` : ""}
        </section>
        <section class="cot-comp-bloco cot-comp-largo"><h4>Carga</h4>${tabela}</section>
        <section class="cot-comp-bloco"><h4>Frete</h4>${calc}</section>
        <section class="cot-comp-bloco"><h4>Descrição do serviço</h4>${c.descricao ? `<p class="cot-desc">${esc(c.descricao)}</p>` : `<p class="cot-dica">—</p>`}</section>
      </div>`;
    return `<article class="cot-comp${opcoes.resumido ? " cot-comp-resumido" : ""}" data-protocolo="${esc(c.protocolo)}">
      <header class="cot-comp-topo">
        <div class="cot-comp-num"><span>Número da cotação</span><strong>${esc(c.protocolo)}</strong>
          <button type="button" class="cot-copiar" data-copiar="${esc(c.protocolo)}" aria-label="Copiar o número ${esc(c.protocolo)}">Copiar</button></div>
        <div class="cot-comp-val"><span>Válida até</span><strong>${dataHora(c.expira_em)}</strong><small>${restante(c.expira_em)}</small></div>
        <span class="cot-status cot-st-${esc(c.status)}">${esc(st.nome)}</span>
      </header>
      ${htmlLinhaTempo(c.status)}
      <div class="cot-comp-kpis">${destaques.map(([k, v, s]) => `<div><span>${k}</span><strong>${esc(v)}</strong><small>${esc(s)}</small></div>`).join("")}</div>
      ${c.valor_proposta != null || c.resposta ? `<div class="cot-proposta"><span class="cot-rotulo">Proposta do vendedor</span>${c.valor_proposta != null ? `<strong>${reais(c.valor_proposta)}</strong>` : ""}${c.resposta ? `<p>${esc(c.resposta)}</p>` : ""}</div>` : c.status === "recusada" ? "" : `<p class="cot-dica cot-dica-st">${esc(st.dica)}</p>`}
      ${opcoes.resumido ? `<details class="cot-detalhes"><summary>Ver cotação completa</summary>${corpo}</details>` : corpo}
      <footer class="cot-comp-rodape">
        <small>Emitida em ${dataHora(c.emitida_em)}${c.atualizado_em && c.atualizado_em !== c.emitida_em ? ` · atualizada em ${dataHora(c.atualizado_em)}` : ""} · Frete e prazo são estimativas; o vendedor confirma na proposta.</small>
        <div class="cot-acoes">
          <button type="button" class="btn btn-contorno-azul" data-imprimir>Imprimir / salvar PDF</button>
          <button type="button" class="btn btn-contorno-azul" data-copiar-link="${esc(linkAcompanhar(c))}">Copiar link de acompanhamento</button>
          ${opcoes.whats !== false ? `<a class="btn btn-whats" target="_blank" rel="noopener" href="${esc(linkWhats(c))}">Falar com o vendedor</a>` : ""}
        </div>
      </footer>
    </article>`;
  }
  const htmlCartao = (c, opcoes) => htmlComprovante(c, Object.assign({ resumido: !(opcoes && opcoes.aberto) }, opcoes));
  function linkWhats(c) {
    const msg = `Olá! Fiz a cotação *${c.protocolo}* pelo site${c.cidade ? ` (entrega em ${c.cidade}/${c.uf})` : ""}. Pode me ajudar?`;
    return window.ColorWeg ? window.ColorWeg.linkWhatsApp(msg) : "#";
  }
  /** botões Copiar, Copiar link e Imprimir dentro de um contêiner */
  function ligarCopiar(box) {
    const copiar = (b, v, txt) => (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(
      () => { const t = b.textContent; b.textContent = "Copiado!"; setTimeout(() => (b.textContent = t), 1800); },
      () => prompt(txt, v));
    box.querySelectorAll("[data-copiar]").forEach((b) => b.addEventListener("click", () => copiar(b, b.dataset.copiar, "Copie o número:")));
    box.querySelectorAll("[data-copiar-link]").forEach((b) => b.addEventListener("click", () => copiar(b, b.dataset.copiarLink, "Copie o link:")));
    box.querySelectorAll("[data-imprimir]").forEach((b) => b.addEventListener("click", () => {
      const art = b.closest(".cot-comp"); if (!art) return;
      art.querySelectorAll("details").forEach((d) => (d.open = true));
      art.classList.add("cot-imprimir"); document.body.classList.add("imprimindo-cotacao");
      const fim = () => { art.classList.remove("cot-imprimir"); document.body.classList.remove("imprimindo-cotacao"); window.removeEventListener("afterprint", fim); };
      window.addEventListener("afterprint", fim);
      window.print();
      setTimeout(fim, 1500);
    }));
  }

  /* ---------- link "Cotação" no menu (só com o recurso ligado) ---------- */
  function menu() {
    const R = window.Recursos, on = !!(R && R.ligado("b2b_quote_enabled"));
    document.querySelectorAll(".menu").forEach((ul) => {
      let li = ul.querySelector("[data-menu-cotacao]");
      if (on && !li) {
        li = document.createElement("li"); li.setAttribute("data-menu-cotacao", "");
        li.innerHTML = `<a href="cotacao">Cotação</a>`;
        const ref = ul.querySelector(':scope > li > a[href="sobre"]');
        ul.insertBefore(li, ref ? ref.parentElement : null);
        if (/\/cotacao(\.html)?$/.test(location.pathname)) li.querySelector("a").setAttribute("aria-current", "page");
      } else if (!on && li) li.remove();
    });
  }
  document.addEventListener("recursos-atualizados", menu);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", menu); else menu();

  window.Cotacao = { lista, enviar, consultar, minhas, lembradas, equipe, STATUS, ROT, volumes, prazoTxt, htmlComprovante, htmlCartao, htmlFrete, ligarCopiar, linkWhats, normalizarCodigo, codigoValido, pesoKg, dataHora, reais, online: ONLINE, HORAS };
})();
