// E05 — função "frete" (supabase/functions/frete/index.ts) testada no Node, sem internet:
// ViaCEP, OpenRouteService e o banco são imitados. Uso: node testes/frete.mjs
import { relatorio } from "./comum.mjs";

const ENV = { SUPABASE_URL: "https://banco.teste", SUPABASE_SERVICE_ROLE_KEY: "chave-servidor", ORS_API_KEY: "chave-ors" };
globalThis.Deno = { env: { get: (k) => ENV[k] } };   // sem Deno.serve: só importa
const F = await import("../supabase/functions/frete/index.ts");
const R = relatorio();
const CFG = { origem_lat: -21.6033, origem_lng: -48.3658, origem_cidade: "Matão", origem_uf: "SP", raio_local_m: 10000, tarifa_local: 500, tarifa_km: 3, minimo_externo: 500, versao: 7 };

/* ---------- regras puras ---------- */
const fora = { cidade: "Araraquara", uf: "SP" };
const casos = [
  ["V31-E05-01", "Linha reta 0 m (fora da cidade) → local R$ 500", F.calcularValor(CFG, fora, 0, null), (r) => r.zona === "local" && r.valor === 500],
  ["V31-E05-02", "9.999 m → local", F.calcularValor(CFG, fora, 9999, null), (r) => r.zona === "local"],
  ["V31-E05-03", "10.000 m (no limite) → local", F.calcularValor(CFG, fora, 10000, null), (r) => r.zona === "local"],
  ["V31-E05-04", "10.001 m com rota de 12 km → externo, mínimo R$ 500", F.calcularValor(CFG, fora, 10001, 12000), (r) => r.zona === "externo" && r.valor === 500 && r.minimoAplicado],
  ["V31-E05-05", "Cidade de Matão a 25 km → local (cidade vale mesmo fora do raio)", F.calcularValor(CFG, { cidade: "MATAO", uf: "sp" }, 25000, 30000), (r) => r.zona === "local" && r.motivo === "cidade"],
  ["V31-E05-06", "Rota 100 km → R$ 300 vira o mínimo R$ 500", F.calcularValor(CFG, fora, 80000, 100000), (r) => r.valor === 500 && r.km === 100 && r.minimoAplicado],
  ["V31-E05-07", "Rota 250 km → 250 × R$ 3 = R$ 750", F.calcularValor(CFG, fora, 200000, 250000), (r) => r.valor === 750 && !r.minimoAplicado],
  ["V31-E05-08", "Metros → km arredonda para cima (200.001 m = 200,1 km = R$ 600,30)", F.calcularValor(CFG, fora, 150000, 200001), (r) => r.km === 200.1 && r.valor === 600.3],
  ["V31-E05-09", "Fora do raio sem rota → cotação manual, sem valor", F.calcularValor(CFG, fora, 50000, null), (r) => r.zona === "manual" && r.valor === null],
  ["V31-E05-10", "Tarifa alterada no painel (R$ 4/km) é usada", F.calcularValor({ ...CFG, tarifa_km: 4 }, fora, 200000, 250000), (r) => r.valor === 1000],
];
for (const [id, nome, r, ok] of casos) R.add(id, nome, ok(r), JSON.stringify(r));
R.add("V31-E05-11", "Peso total: 3 × Caixa 25 kg + 2 × Caixa 5 kg + 7 kg sob medida = 92 kg",
  F.pesoTotalKg([{ embalagem: "Caixa 25 kg", qtd: 3 }, { embalagem: "Caixa 5 kg", qtd: 2 }, { embalagem: "Sob medida (kg)", qtd: 7 }]) === 92);
const d = F.distanciaRetaM({ lat: -21.6033, lng: -48.3658 }, { lat: -21.7845, lng: -48.1780 });
R.add("V31-E05-12", "Linha reta Matão → Araraquara ≈ 28 km", d > 26000 && d < 30000, Math.round(d) + " m");

/* ---------- função completa com serviços imitados ---------- */
function imitar({ recursoLigado = true, disponivel = true, cep = { logradouro: "Avenida Brasil", localidade: "Araraquara", uf: "SP" }, geo = { lat: -21.7845, lng: -48.178 }, rotaM = 33000, admin = false, jaFeitos = 0, cfg = CFG, cotacaoLigada = true, freteLigado = recursoLigado, cotacoesHora = 0, usuario = null, colisoes = 0 } = {}) {
  const log = { inseridos: [], orsGeo: 0, orsRota: 0, cotacoes: [] };
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });
    if (u.includes("viacep.com.br")) return json(cep || { erro: true });
    if (u.includes("/geocode/search/structured")) { log.orsGeo++; const q = new URL(u).searchParams; return json({ features: geo ? [{ geometry: { coordinates: [geo.lng, geo.lat] }, properties: { locality: q.get("locality"), confidence: 0.9, label: "Destino" } }] : [] }); }
    if (u.includes("/v2/directions/driving-hgv")) { log.orsRota++; return rotaM == null ? json({ error: "sem rota" }, 404) : json({ routes: [{ summary: { distance: rotaM } }] }); }
    if (u.includes("/rpc/eh_admin")) return json(admin);
    if (u.includes("/rpc/recurso_disponivel")) return json(disponivel);
    if (u.includes("/auth/v1/user")) return usuario ? json(usuario) : json({ msg: "invalid" }, 401);
    if (u.includes("/rest/v1/recursos")) return json([{ ligado: u.includes("b2b_quote_enabled") ? cotacaoLigada : freteLigado, implementado: true }]);
    if (u.includes("/rest/v1/cotacoes") && init.method === "HEAD") return new Response(null, { headers: { "content-range": `0-0/${cotacoesHora}` } });
    if (u.includes("/rest/v1/cotacoes")) {
      const linha = JSON.parse(init.body); log.cotacoes.push(linha);
      if (colisoes-- > 0) return json({ code: "23505" }, 409);
      return json([{ ...linha, status: "recebida", emitida_em: "2026-11-23T10:00:00Z", expira_em: "2026-11-30T10:00:00Z" }], 201);
    }
    if (u.includes("/rest/v1/produtos")) return json([{ id: "pol-0001", ativo: true, categoria: "poliester", nome: "Pó Poliéster Branco", codigo: "POL-0001" }]);
    if (u.includes("/rest/v1/frete_config")) return json([cfg]);
    if (u.includes("/rest/v1/frete_estimativas") && init.method === "HEAD") return new Response(null, { headers: { "content-range": `0-0/${jaFeitos}` } });
    if (u.includes("/rest/v1/frete_estimativas")) { log.inseridos.push(JSON.parse(init.body)); return new Response(null, { status: 201 }); }
    throw new Error("URL não imitada: " + u);
  };
  return log;
}
const pedido = (corpo, token) => new Request("https://banco.teste/functions/v1/frete", { method: "POST", headers: { "content-type": "application/json", origin: "https://policoatingtintas.com.br", "x-forwarded-for": "200.1.2.3", ...(token ? { authorization: "Bearer " + token } : {}) }, body: JSON.stringify(corpo) });
const itens = [{ id: "POL-0001", embalagem: "Caixa 25 kg", qtd: 4 }];
const chamar = async (corpo, opcoes, token) => { const log = imitar(opcoes); const r = await F.atender(pedido(corpo, token)); return { status: r.status, d: await r.json(), log, cors: r.headers.get("access-control-allow-origin") }; };

let x = await chamar({ cep: "14801-000", numero: "500", itens });
R.add("V31-E05-13", "Araraquara (33 km de estrada): externo, 33 × R$ 3 = R$ 99 → mínimo R$ 500, peso 100 kg",
  x.status === 200 && x.d.zona === "externo" && x.d.valor === 500 && x.d.minimo_aplicado && x.d.km === 33 && x.d.peso_kg === 100 && x.d.estimativa === true && x.log.inseridos[0].valor === 500, JSON.stringify(x.d));
R.add("V31-E05-14", "Registro da estimativa não guarda IP aberto, nome nem CPF", !JSON.stringify(x.log.inseridos[0]).includes("200.1.2.3") && x.log.inseridos[0].ip_hash.length === 24 && x.cors === "https://policoatingtintas.com.br");

x = await chamar({ cep: "15990000", itens }, { cep: { logradouro: "", localidade: "Matão", uf: "SP" } });
R.add("V31-E05-15", "CEP de Matão: local R$ 500 sem precisar do mapa", x.d.zona === "local" && x.d.valor === 500 && x.log.orsGeo === 0 && x.log.orsRota === 0, JSON.stringify(x.d));

x = await chamar({ cep: "01001000", numero: "1", itens }, { cep: { logradouro: "Praça da Sé", localidade: "São Paulo", uf: "SP" }, geo: { lat: -23.55, lng: -46.633 }, rotaM: 312400 });
R.add("V31-E05-16", "São Paulo (312,4 km): 312,4 × R$ 3 = R$ 937,20", x.d.zona === "externo" && x.d.valor === 937.2 && x.d.km === 312.4, JSON.stringify(x.d));

x = await chamar({ cep: "01001000", itens }, { cep: { logradouro: "Praça da Sé", localidade: "São Paulo", uf: "SP" }, geo: { lat: -23.55, lng: -46.633 }, rotaM: null });
R.add("V31-E05-17", "Sem rota de caminhão: cotação manual, sem valor inventado", x.d.zona === "manual" && x.d.valor === undefined && /cotação do frete/.test(x.d.mensagem) && x.log.inseridos[0].zona === "manual", JSON.stringify(x.d));

x = await chamar({ cep: "12345678", itens }, { cep: null });
R.add("V31-E05-18", "CEP inexistente: cotação manual", x.d.zona === "manual" && x.d.motivo === "cep_nao_encontrado");
x = await chamar({ cep: "123", itens });
R.add("V31-E05-19", "CEP incompleto: erro claro", x.status === 400 && /CEP inválido/.test(x.d.erro));
x = await chamar({ cep: "14801000", itens }, { recursoLigado: false });
R.add("V31-E05-20", "Recurso desligado no painel: o site não calcula", x.status === 403);
x = await chamar({ cep: "14801000", itens }, { disponivel: false });
R.add("V31-E05-21", "Produto fora de onde o frete vale: não calcula", x.status === 403 && /produto/.test(x.d.erro));
x = await chamar({ cep: "14801000", itens }, { jaFeitos: 30 });
R.add("V31-E05-22", "Mais de 30 cálculos em 10 min do mesmo IP: bloqueia", x.status === 429);
x = await chamar({ cep: "14801000", itens }, { cfg: { ...CFG, origem_lat: null, origem_lng: null } });
R.add("V31-E05-23", "Saída não localizada no mapa: não calcula", x.status === 503);
x = await chamar({ acao: "simular", cep: "14801000" }, { recursoLigado: false, admin: false }, "token-qualquer");
R.add("V31-E05-24", "Simular no painel exige administrador", x.status === 403);
x = await chamar({ acao: "simular", cep: "14801000", numero: "10" }, { recursoLigado: false, admin: true }, "token-admin");
R.add("V31-E05-25", "Administrador simula mesmo com o recurso desligado (marcado como simulação)", x.status === 200 && x.d.zona === "externo" && x.log.inseridos[0].simulacao === true);
x = await chamar({ acao: "localizar_origem", logradouro: "Rua Teste", numero: "1", cidade: "Matão", uf: "SP", cep: "15990000" }, { admin: true, geo: { lat: -21.6, lng: -48.36 } }, "token-admin");
R.add("V31-E05-26", "Painel localiza o endereço de saída no mapa", x.status === 200 && x.d.lat === -21.6 && x.d.lng === -48.36);
x = await chamar({ acao: "localizar_origem", logradouro: "Rua Teste", cidade: "Matão", uf: "SP" }, { admin: false }, "token");
R.add("V31-E05-27", "Localizar a saída exige administrador", x.status === 403);

/* ---------- cotação com código (E06/E07) ---------- */
const COT = { acao: "cotar", nome: "Metalúrgica Teste Ltda", documento: "11.222.333/0001-81", telefone: "(16) 99999-0000", email: "compras@teste.com.br",
  cep: "14801-000", logradouro: "Avenida Brasil", numero: "500", bairro: "Centro", descricao: "Pintura de 200 portões de aço, cor branca, acabamento liso.", itens: [{ id: "POL-0001", embalagem: "Caixa 25 kg", cor: "Branco", qtd: 4 }] };
x = await chamar(COT);
R.add("V31-E06-01", "Cotação gera código COT-XXXX-XXXX-XX, válida por 7 dias, com frete automático e peso",
  x.status === 200 && /^COT-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{2}$/.test(x.d.protocolo) && x.d.expira_em === "2026-11-30T10:00:00Z" && x.d.frete.zona === "externo" && x.d.frete.valor === 500 && x.d.peso_kg === 100, JSON.stringify(x.d));
const g = x.log.cotacoes[0];
R.add("V31-E06-02", "Grava CPF/CNPJ e telefone só com números, nome do produto vindo do catálogo, IP só em hash",
  g.documento === "11222333000181" && g.telefone === "16999990000" && g.itens[0].nome === "Pó Poliéster Branco" && g.itens[0].cor === "Branco" && g.ip_hash.length === 24 && !JSON.stringify(g).includes("200.1.2.3") && g.cliente_id === null);
x = await chamar(COT, { usuario: { id: "u-123", email: "Cliente@Teste.com" } }, "aaa.bbb.ccc");
R.add("V31-E06-03", "Cliente logado: a cotação fica ligada à conta dele (histórico em Minha conta)", x.status === 200 && x.log.cotacoes[0].cliente_id === "u-123" && x.log.cotacoes[0].email === "cliente@teste.com");
x = await chamar({ ...COT, documento: "111.111.111-11" });
R.add("V31-E06-04", "CPF inválido é recusado", x.status === 400 && /CPF ou CNPJ/.test(x.d.erro));
x = await chamar({ ...COT, descricao: "tinta" });
R.add("V31-E06-05", "Descrição curta demais é recusada (pede detalhes)", x.status === 400 && /detalhe/.test(x.d.erro));
x = await chamar(COT, { cotacaoLigada: false });
R.add("V31-E06-06", "Cotação desligada no painel: não grava", x.status === 403 && x.log.cotacoes.length === 0);
x = await chamar(COT, { freteLigado: false });
R.add("V31-E06-07", "Frete desligado: cotação é gravada com frete a calcular pelo vendedor", x.status === 200 && x.d.frete.zona === "manual" && x.log.orsRota === 0);
x = await chamar(COT, { cotacoesHora: 6 });
R.add("V31-E06-08", "Mais de 6 cotações por hora do mesmo IP: bloqueia", x.status === 429 && x.log.cotacoes.length === 0);
x = await chamar(COT, { colisoes: 1 });
R.add("V31-E06-09", "Código repetido (raríssimo): gera outro e grava", x.status === 200 && x.log.cotacoes.length === 2 && x.log.cotacoes[0].protocolo !== x.log.cotacoes[1].protocolo);
x = await chamar({ ...COT, peso_kg: "250,5" });
R.add("V31-E06-10", "Peso total informado pelo cliente prevalece sobre o calculado", x.d.peso_kg === 250.5);
const prot = new Set(Array.from({ length: 2000 }, () => F.gerarProtocolo()));
R.add("V31-E06-11", "2.000 códigos sorteados, nenhum repetido", prot.size === 2000);

process.exitCode = R.imprimir() ? 1 : 0;
