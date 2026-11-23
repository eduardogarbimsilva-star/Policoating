// E02 — função "catalogo-google" (feed do Google Merchant Center) testada no Node, sem internet.
// Uso: node testes/catalogo_google.mjs
import { relatorio } from "./comum.mjs";
globalThis.Deno = { env: { get: (k) => ({ SUPABASE_URL: "https://banco.teste", SUPABASE_SERVICE_ROLE_KEY: "chave" })[k] } };
const F = await import("../supabase/functions/catalogo-google/index.ts");
const R = relatorio();
const prod = (id, extra = {}, ativo = true) => ({ id, ativo, dados: Object.assign({ id, codigo: id.toUpperCase(), nome: "Poliéster Branco RAL 9003", categoria: "poliester", marca: "Policoating", descricao: "Tinta em pó poliéster para uso externo, alta resistência ao sol.", preco: 30, cores: [{ nome: "Branco RAL 9003", hex: "#fff" }], fotos: ["https://cdn.teste/a.jpg", "assets/img/b.jpg"] }, extra) });
const CAT = [prod("pol-0001"), prod("pol-0002", { preco: 0, precoCombinar: true }), prod("pol-0003", { fotos: [] }), prod("pol-0004", {}, false), prod("pol-0005", { precoPromo: 25, promoAte: "2099-12-31" }), prod("pol-0006", { descricao: "curta" }), prod("pol-0007", { precoKg5: 34 })];
function imitar({ ligado = true, disponivel = () => true, variacoes = true } = {}) {
  globalThis.fetch = async (u, init = {}) => {
    u = String(u); const json = (o) => new Response(JSON.stringify(o), { headers: { "content-type": "application/json" } });
    if (u.includes("/rest/v1/recursos")) return json([{ ligado, implementado: true }]);
    if (u.includes("/rest/v1/produtos")) return json(CAT);
    if (u.includes("/rpc/recurso_disponivel")) { const b = JSON.parse(init.body); return json(b.p_chave === "packaging_variants_enabled" ? variacoes : disponivel(b.p_produto)); }
    throw new Error("não imitado " + u);
  };
}
const pedir = async (q = "") => { const r = await F.atender(new Request("https://banco.teste/functions/v1/catalogo-google" + q)); return { status: r.status, tipo: r.headers.get("content-type"), txt: await r.text() }; };

imitar({ ligado: false });
let x = await pedir();
R.add("V31-E02-01", "Recurso desligado: feed não sai (404)", x.status === 404);
x = await pedir("?diagnostico=1"); let d = JSON.parse(x.txt);
R.add("V31-E02-02", "Diagnóstico funciona mesmo desligado e explica quem fica de fora", d.ligado === false && d.no_feed === 3 && d.fora.length === 4 &&
  d.fora.find((f) => f.id === "pol-0002").motivo === "sem preço publicado" && d.fora.find((f) => f.id === "pol-0003").motivo === "sem foto" && d.fora.find((f) => f.id === "pol-0004").motivo === "inativo" && /descrição curta/.test(d.fora.find((f) => f.id === "pol-0006").motivo), x.txt);
imitar();
x = await pedir();
const itens = x.txt.split("<item>").slice(1);
R.add("V31-E02-03", "Ligado: XML do Merchant com 2 linhas por produto (5 e 25 kg) só dos produtos completos", x.status === 200 && /application\/xml/.test(x.tipo) && itens.length === 6 && /xmlns:g="http:\/\/base.google.com\/ns\/1.0"/.test(x.txt));
const i25 = itens.find((t) => t.includes("<g:id>POL-0001-25KG</g:id>"));
R.add("V31-E02-04", "Linha 25 kg: preço 25 × R$ 30 = 750.00 BRL, link da página com a embalagem, marca, MPN, agrupamento",
  i25 && i25.includes("<g:price>750.00 BRL</g:price>") && i25.includes("<g:link>https://policoatingtintas.com.br/produto?id=pol-0001&amp;emb=25</g:link>") && i25.includes("<g:brand>Policoating</g:brand>") && i25.includes("<g:mpn>POL-0001</g:mpn>") && i25.includes("<g:item_group_id>POL-0001</g:item_group_id>") && i25.includes("<g:product_type>Tinta em pó &gt; Poliéster</g:product_type>"), i25);
R.add("V31-E02-05", "Imagem relativa vira endereço completo; unidade de preço por kg", i25.includes("<g:additional_image_link>https://policoatingtintas.com.br/assets/img/b.jpg</g:additional_image_link>") && i25.includes("<g:unit_pricing_base_measure>1kg</g:unit_pricing_base_measure>"));
const p5 = itens.find((t) => t.includes("<g:id>POL-0005-5KG</g:id>"));
R.add("V31-E02-06", "Promoção válida: preço cheio + sale_price (5 × R$ 25 = 125.00)", p5 && p5.includes("<g:price>150.00 BRL</g:price>") && p5.includes("<g:sale_price>125.00 BRL</g:sale_price>"), p5);
imitar({ disponivel: (id) => id !== "pol-0005" });
x = await pedir();
R.add("V31-E02-07", "Exceção no painel (produto desligado do feed) tira o produto", !x.txt.includes("POL-0005") && x.txt.includes("POL-0001-5KG"));
R.add("V31-E02-08", "Texto com & < > é escapado", F.xml('Tinta "A&B" <x>') === "Tinta &quot;A&amp;B&quot; &lt;x&gt;");
R.add("V31-E02-09", "Promoção vencida não entra como sale_price", F.precoKg({ preco: 30, precoPromo: 20, promoAte: "2020-01-01" }).promo === 0);
imitar();
x = await pedir();
R.add("V31-E04-01", "Caixa 5 kg com preço por kg próprio (R$ 34): 170.00; a de 25 kg segue R$ 30/kg = 750.00", x.txt.includes("<g:id>POL-0007-5KG</g:id>") && /POL-0007-5KG[\s\S]*?<g:price>170.00 BRL/.test(x.txt) && /POL-0007-25KG[\s\S]*?<g:price>750.00 BRL/.test(x.txt));
imitar({ variacoes: false });
x = await pedir();
R.add("V31-E04-02", "Recurso de variações desligado: 5 kg volta a ser proporcional (150.00)", /POL-0007-5KG[\s\S]*?<g:price>150.00 BRL/.test(x.txt));
process.exitCode = R.imprimir() ? 1 : 0;
