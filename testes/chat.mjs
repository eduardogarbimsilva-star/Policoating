// Função "chat" (supabase/functions/chat/index.ts) testada no Node, sem internet: banco imitado em memória.
// Uso: node testes/chat.mjs
import { relatorio } from "./comum.mjs";

const ENV = { SUPABASE_URL: "https://banco.teste", SUPABASE_SERVICE_ROLE_KEY: "chave-servidor" };
globalThis.Deno = { env: { get: (k) => ENV[k] } };
const F = await import("../supabase/functions/chat/index.ts");
const R = relatorio();

/* ---------- regras puras ---------- */
R.add("CHAT-01", "Número aceita minúsculas e sem traços", F.normalizarProtocolo("cot ab12cd34ef") === "COT-AB12-CD34-EF" && F.normalizarProtocolo("COT-12") === "");
R.add("CHAT-02", "Texto: tira controles e limita a 1000 caracteres", F.limparTexto("oi\u0007  tudo\n\n\n\nbem") === "oi tudo\n\nbem" && F.limparTexto("x".repeat(3000)).length === 1000);
const agora = Date.now();
R.add("CHAT-03", "Assistente ativo sem ninguém da equipe; pausado quando a equipe respondeu e está no chat; volta após 2 min",
  F.iaAtiva(null) && F.iaAtiva({ agente_id: "u1", agente_respondeu: false, agente_visto: new Date().toISOString() }) &&
  !F.iaAtiva({ agente_id: "u1", agente_respondeu: true, agente_visto: new Date(agora - 30000).toISOString() }, agora) &&
  F.iaAtiva({ agente_id: "u1", agente_respondeu: true, agente_visto: new Date(agora - 130000).toISOString() }, agora));
const COT = { id: "c1", protocolo: "COT-AB12-CD34-EF", nome: "Maria Silva", status: "aprovada", cidade: "Araraquara", uf: "SP", itens: [{ id: "pol-0001", nome: "Poliéster Preto", embalagem: "Caixa 25 kg", qtd: 4 }],
  peso_kg: 100, frete: { zona: "externo", valor: 612.5, km: 33, prazo_dias: 2 }, valor_proposta: 4321, resposta: null, expira_em: new Date(agora + 5 * 864e5).toISOString(), entrega: { veiculo: "Montana" } };
R.add("CHAT-04", "Boas-vindas com o primeiro nome e o número", /Olá, Maria!/.test(F.boasVindas(COT)) && F.boasVindas(COT).includes("COT-AB12-CD34-EF"));
const rb = (t, c = COT, s = false) => F.respostaBasica(t, c, s);
R.add("CHAT-05", "Resposta básica: prazo e frete com os dados da cotação (sem chamar a equipe)", /2 dias úteis/.test(rb("qual o prazo de entrega?").texto) && /R\$\s?612,50/.test(rb("quanto fica o frete").texto) && !rb("quanto fica o frete").chamar);
R.add("CHAT-06", "Resposta básica: sem dado → não inventa (equipe confirma)", /equipe/.test(rb("e o prazo?", { ...COT, frete: { zona: "manual" } }).texto) && !/\d+ dias/.test(rb("e o prazo?", { ...COT, frete: { zona: "manual" } }).texto));
R.add("CHAT-26", "Conversa natural: \"tudo e você?\" e \"ok\" têm respostas próprias (não repete a frase padrão)",
  /Tudo ótimo/.test(rb("tudo e voce?").texto) && /Combinado/.test(rb("ok").texto) && !rb("ok").chamar && rb("ok").texto !== rb("tudo bem?").texto);
R.add("CHAT-27", "Não entendeu, alteração, pagamento ou \"falar com a equipe\": chama a equipe",
  rb("Pode me enviar então").chamar && /chamei a equipe/.test(rb("Pode me enviar então").texto) && rb("preciso mudar o endereço").chamar && rb("quero pagar no pix").chamar && rb("quero falar com um atendente").chamar);
R.add("CHAT-28", "Com o chamado já aberto, não promete de novo: avisa que a equipe já foi chamada", /já foi chamada/.test(rb("asdfgh", COT, true).texto));
R.add("CHAT-29", "IA: marcador [[EQUIPE]] vira chamado e some do texto", (() => { const r = F.lerMarcador("Vou chamar a equipe para isso. [[EQUIPE]]"); return r.chamar && r.texto === "Vou chamar a equipe para isso."; })() && !F.lerMarcador("Seu frete é R$ 10.").chamar);
R.add("CHAT-30", "Opções rápidas: frete, prazo, itens, validade, pagamento, alterar e falar com a equipe", F.OPCOES.length === 7 && F.OPCOES.some((o) => o.id === "equipe"));
const res = JSON.parse(F.resumoCotacao({ ...COT, documento: "11222333000181", telefone: "16999990000" }));
R.add("CHAT-07", "Dados enviados ao assistente não levam documento, telefone nem sobrenome", !JSON.stringify(res).includes("11222333000181") && !JSON.stringify(res).includes("1699999") && res.cliente_primeiro_nome === "Maria");

/* ---------- banco imitado (PostgREST mínimo) ---------- */
function bancoFalso({ recurso = true, status = "aprovada", equipe = ["dono@x.com"] } = {}) {
  const T = { cotacoes: [{ ...COT, status }], cotacoes_chat: [], cotacoes_chat_estado: [], recursos: [{ chave: "quote_chat_enabled", ligado: recurso, implementado: true }], cotacoes_consultas: [] };
  let seq = 0;
  const usuarios = { "h.dono.s": { id: "u-dono", email: "dono@x.com", user_metadata: { nome: "Eduardo" } }, "h.cli.s": { id: "u-cli", email: "cliente@x.com" } };
  const filtrar = (linhas, q) => linhas.filter((l) => [...q.entries()].every(([k, v]) => {
    if (["select", "order", "limit"].includes(k)) return true;
    const [op, ...resto] = v.split("."); const val = resto.join(".");
    const x = l[k];
    if (op === "eq") return String(x) === val;
    if (op === "gt") return typeof x === "number" ? x > Number(val) : String(x) > val;
    if (op === "gte") return String(x) >= val;
    return true;
  }));
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(String(url)); const m = (init.method || "GET").toUpperCase();
    const json = (o, s = 200, h = {}) => new Response(o === null ? null : JSON.stringify(o), { status: s, headers: { "content-type": "application/json", ...h } });
    if (u.pathname === "/auth/v1/user") { const t = (init.headers.Authorization || "").replace("Bearer ", ""); return usuarios[t] ? json(usuarios[t]) : json({}, 401); }
    if (u.pathname === "/rest/v1/rpc/eh_equipe") { const t = (init.headers.Authorization || "").replace("Bearer ", ""); return json(!!usuarios[t] && equipe.includes(usuarios[t].email)); }
    const tab = u.pathname.replace("/rest/v1/", ""); const q = u.searchParams;
    if (!T[tab]) return json({ message: "tabela" }, 404);
    if (m === "GET" || m === "HEAD") {
      let l = filtrar(T[tab], q);
      const ord = q.get("order"); if (ord) { const [c, d] = ord.split("."); l = [...l].sort((a, b) => (a[c] > b[c] ? 1 : -1) * (d === "desc" ? -1 : 1)); }
      if (q.get("limit")) l = l.slice(0, +q.get("limit"));
      if (tab === "cotacoes_chat_estado" && /cotacoes\(/.test(q.get("select") || "")) l = l.map((e) => ({ ...e, cotacoes: T.cotacoes.find((c) => c.id === e.cotacao_id) }));
      return m === "HEAD" ? new Response(null, { status: 200, headers: { "content-range": `0-0/${l.length}` } }) : json(l);
    }
    if (m === "POST") {
      const linha = JSON.parse(init.body);
      if (tab === "cotacoes_chat_estado") {
        if (!T[tab].some((e) => e.cotacao_id === linha.cotacao_id)) T[tab].push({ agente_id: null, agente_nome: null, agente_visto: null, agente_respondeu: false, equipe_lida_ate: 0, cliente_lida_ate: 0, ia_respostas: 0, atualizado_em: new Date().toISOString(), ...linha });
        return json(null, 201);
      }
      const nova = { id: ++seq, criada_em: new Date().toISOString(), em: new Date().toISOString(), autor_nome: null, ...linha };
      T[tab].push(nova); return json([nova], 201);
    }
    if (m === "PATCH") { const d = JSON.parse(init.body); filtrar(T[tab], q).forEach((l) => Object.assign(l, d)); return json(null, 204); }
    return json({}, 405);
  };
  return T;
}
const pedir = (corpo, token) => F.atender(new Request("https://f.teste/chat", { method: "POST", headers: { "content-type": "application/json", origin: "https://policoatingtintas.com.br", ...(token ? { authorization: "Bearer " + token } : {}) }, body: JSON.stringify(corpo) }));
const P = "cot-ab12-cd34-ef";

{
  bancoFalso({ recurso: false });
  const r = await pedir({ acao: "abrir", protocolo: P });
  R.add("CHAT-08", "Recurso desligado: o chat não abre", r.status === 403);
}
{
  bancoFalso({ status: "proposta_enviada" });
  const r = await pedir({ acao: "abrir", protocolo: P });
  R.add("CHAT-09", "Cotação ainda não aprovada: o chat não abre", r.status === 403 && /aprovada/.test((await r.json()).erro));
}
{
  const T = bancoFalso();
  F.definirClienteIA(null);
  let r = await pedir({ acao: "abrir", protocolo: P }); let d = await r.json();
  R.add("CHAT-10", "Abrir: o assistente dá as boas-vindas (uma vez só)", r.status === 200 && d.mensagens.length === 1 && d.mensagens[0].autor === "ia" && d.estado.ia_ativa);
  await pedir({ acao: "abrir", protocolo: P });
  R.add("CHAT-11", "Abrir de novo não repete as boas-vindas", T.cotacoes_chat.filter((m) => m.autor === "ia").length === 1);
  r = await pedir({ acao: "enviar", protocolo: P, texto: "Qual o prazo de entrega?", depois: 1 }); d = await r.json();
  R.add("CHAT-12", "Sem chave da IA: responde o básico com os dados da cotação", d.mensagens.length === 2 && d.mensagens[0].autor === "cliente" && d.mensagens[1].autor === "ia" && /2 dias úteis/.test(d.mensagens[1].texto), JSON.stringify(d.mensagens.map((m) => m.texto)));

  // IA "de verdade" (imitada): recebe o histórico como user/assistant e os dados da cotação no system
  let pedidoIA = null;
  F.definirClienteIA({ messages: { create: async (p) => { pedidoIA = p; return { stop_reason: "end_turn", content: [{ type: "text", text: "Seu frete estimado é de R$ 612,50; a equipe confirma." }] }; } } });
  r = await pedir({ acao: "enviar", protocolo: P, texto: "e o frete?" }); d = await r.json();
  R.add("CHAT-13", "Com IA: resposta do Claude, histórico alternado começando no cliente e dados da cotação no system",
    d.mensagens.at(-1).texto.startsWith("Seu frete") && pedidoIA.messages[0].role === "user" && pedidoIA.messages.at(-1).role === "user" && pedidoIA.messages.every((x, i, a) => !i || a[i - 1].role !== x.role) && pedidoIA.system.includes("COT-AB12-CD34-EF") && !pedidoIA.system.includes("16999"));

  r = await pedir({ acao: "equipe_lista" }, "h.cli.s");
  R.add("CHAT-14", "Quem não é da equipe não atende", r.status === 403);
  r = await pedir({ acao: "equipe_lista" }, "h.dono.s"); d = await r.json();
  R.add("CHAT-15", "Equipe: lista a conversa com mensagens não lidas", d.conversas.length === 1 && d.conversas[0].nao_lidas === 2 && d.conversas[0].ia_ativa, JSON.stringify(d.conversas));
  r = await pedir({ acao: "equipe_ler", protocolo: P }, "h.dono.s"); d = await r.json();
  R.add("CHAT-16", "Equipe só lendo: o assistente continua ativo", d.estado.ia_ativa && !d.estado.eu_no_chat);
  r = await pedir({ acao: "equipe_enviar", protocolo: P, texto: "Olá Maria, aqui é o Eduardo. Sai amanhã de manhã." }, "h.dono.s"); d = await r.json();
  const ult = T.cotacoes_chat.slice(-2);
  R.add("CHAT-17", "Equipe respondeu: aviso de entrada + mensagem; assistente pausado", ult[0].autor === "sistema" && /Eduardo.*entrou/.test(ult[0].texto) && ult[1].autor === "equipe" && !d.estado.ia_ativa && d.estado.agente === "Eduardo");
  const antes = T.cotacoes_chat.length;
  F.definirClienteIA({ messages: { create: async () => { throw new Error("não devia chamar"); } } });
  r = await pedir({ acao: "enviar", protocolo: P, texto: "Ótimo, obrigada!" }); d = await r.json();
  R.add("CHAT-18", "Com a equipe no chat, o assistente não responde", T.cotacoes_chat.length === antes + 1 && T.cotacoes_chat.at(-1).autor === "cliente" && d.estado.agente === "Eduardo");
  await pedir({ acao: "equipe_sair", protocolo: P }, "h.dono.s");
  R.add("CHAT-19", "Equipe saiu: aviso e assistente volta", /saiu.*assistente volta/.test(T.cotacoes_chat.at(-1).texto) && T.cotacoes_chat_estado[0].agente_respondeu === false);
  F.definirClienteIA(null);
  r = await pedir({ acao: "enviar", protocolo: P, texto: "e a validade?" }); d = await r.json();
  R.add("CHAT-20", "Depois que a equipe sai, o assistente responde de novo", T.cotacoes_chat.at(-1).autor === "ia" && /vale até/.test(T.cotacoes_chat.at(-1).texto));
  // equipe responde e "some" (fecha a aba): depois de 2 min o assistente volta sozinho, com aviso
  await pedir({ acao: "equipe_enviar", protocolo: P, texto: "Voltei, já confiro." }, "h.dono.s");
  T.cotacoes_chat_estado[0].agente_visto = new Date(Date.now() - 3 * 60 * 1000).toISOString();
  r = await pedir({ acao: "enviar", protocolo: P, texto: "e o frete?" }); d = await r.json();
  const ult3 = T.cotacoes_chat.slice(-3).map((m) => m.autor).join(",");
  R.add("CHAT-21", "Equipe 2 min sem abrir o chat: aviso de saída e o assistente responde", ult3 === "sistema,cliente,ia" && d.estado.ia_ativa, ult3);
  // não entendeu: chama a equipe (aviso uma vez só) e a conversa sobe na lista da equipe como "pediu atendimento"
  r = await pedir({ acao: "enviar", protocolo: P, texto: "Pode me enviar então" }); d = await r.json();
  const sis = T.cotacoes_chat.filter((m) => m.autor === "sistema" && /Atendimento solicitado/.test(m.texto)).length;
  await pedir({ acao: "enviar", protocolo: P, texto: "xpto" });
  const sis2 = T.cotacoes_chat.filter((m) => m.autor === "sistema" && /Atendimento solicitado/.test(m.texto)).length;
  r = await pedir({ acao: "equipe_lista" }, "h.dono.s"); let dl = await r.json();
  R.add("CHAT-31", "Pedido de atendimento: aviso na conversa uma vez, opções na tela e destaque na lista da equipe",
    sis === 1 && sis2 === 1 && d.estado.suporte && d.estado.opcoes.length === 7 && dl.conversas[0].suporte === true, JSON.stringify({ sis, sis2, suporte: d.estado.suporte }));
  await pedir({ acao: "equipe_enviar", protocolo: P, texto: "Olá! Já te ajudo." }, "h.dono.s");
  r = await pedir({ acao: "resumo", protocolos: [P, "COT-ZZZZ-ZZZZ-ZZ", "lixo"] }); let dr = await r.json();
  R.add("CHAT-32", "Resumo para o sino do cliente: mensagem da equipe ainda não vista, com o texto", dr.conversas.length === 1 && dr.conversas[0].nao_lidas === 1 && /Já te ajudo/.test(dr.conversas[0].ultima.texto), JSON.stringify(dr));
  r = await pedir({ acao: "equipe_lista" }, "h.dono.s"); dl = await r.json();
  R.add("CHAT-33", "A equipe respondeu: o chamado é atendido (sai o destaque)", dl.conversas[0].suporte === false);
  r = await pedir({ acao: "ler", protocolo: P, depois: 0 }); d = await r.json();
  R.add("CHAT-34", "Com a equipe na conversa, as opções do assistente somem", d.estado.opcoes.length === 0 && !d.estado.ia_ativa);
  r = await pedir({ acao: "enviar", protocolo: P, texto: "   " });
  R.add("CHAT-22", "Mensagem vazia é recusada", r.status === 400);
  for (let i = 0; i < 25; i++) await pedir({ acao: "enviar", protocolo: P, texto: "teste " + i });
  r = await pedir({ acao: "enviar", protocolo: P, texto: "mais uma" });
  R.add("CHAT-23", "Limite de mensagens seguidas (protege a conta da IA)", r.status === 429);
  r = await pedir({ acao: "ler", protocolo: "COT-ZZZZ-ZZZZ-ZZ" });
  R.add("CHAT-24", "Número inexistente: 404", r.status === 404);
  for (let i = 0; i < 15; i++) await pedir({ acao: "ler", protocolo: "COT-ZZZZ-ZZZZ-Z" + (i % 10) });
  r = await pedir({ acao: "ler", protocolo: P });
  R.add("CHAT-25", "Muitos números errados do mesmo IP: bloqueia por alguns minutos (até o certo)", r.status === 429);
}
process.exitCode = R.imprimir() ? 1 : 0;
