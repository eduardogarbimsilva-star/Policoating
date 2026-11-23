// =========================================================
// Policoating — Feed de produtos para o Google Merchant Center (Supabase Edge Function) — etapa E02
//
// • GET  .../functions/v1/catalogo-google              → feed XML (RSS 2.0 com atributos g:) para o Merchant Center
// • GET  .../functions/v1/catalogo-google?diagnostico=1 → lista do que entra e do que fica de fora (e por quê)
//
// Regras (nunca inventa dado):
//   • Só entra produto ATIVO, com PREÇO publicado (sem "consulte"), com FOTO e com o recurso
//     "Feed do Google Merchant Center" valendo para ele (Comércio e Recursos). Recurso desligado = feed vazio (404).
//   • Uma linha por embalagem (Caixa 5 kg e Caixa 25 kg), agrupadas pelo código do produto (item_group_id).
//   • Preço = preço por kg × kg da caixa, igual ao que a página do produto mostra (produto?id=...&emb=...).
//   • Marca + MPN (código POL-XXXX) no lugar do GTIN (fabricação própria).
//
// Configuração: Edge Functions → Deploy a new function → nome "catalogo-google" → cole este arquivo →
//   Deploy → nos detalhes, DESLIGUE "Verify JWT" (o Google busca o feed sem login).
// =========================================================

const SITE = "https://policoatingtintas.com.br";
const CAIXAS = [25, 5];
const CLASSES: Record<string, string> = { poliester: "Poliéster", epoxi: "Epóxi", hibrida: "Híbrida", texturizada: "Texturizadas", metalica: "Metálicas", especiais: "Especiais" };

const env = (k: string) => ((globalThis as any).Deno?.env.get(k) || "").trim();
function chaveServidor() {
  const antiga = env("SUPABASE_SERVICE_ROLE_KEY");
  if (antiga) return antiga;
  try { const k = Object.values(JSON.parse(env("SUPABASE_SECRET_KEYS") || "{}"))[0]; return typeof k === "string" ? k : ""; } catch { return ""; }
}

export const xml = (s: unknown) => String(s ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c] as string));
const absoluta = (u: string) => (/^https:\/\//.test(u) ? u : `${SITE}/${String(u || "").replace(/^\.?\//, "")}`);
const dinheiro = (v: number) => `${(Math.round(v * 100) / 100).toFixed(2)} BRL`;

type Produto = { id: string; ativo: boolean; dados: any };
type Linha = Record<string, string | string[]>;

/** Preço efetivo por kg (promoção válida vale), ou null se o preço não é público */
export function precoKg(d: any, hoje = new Date().toISOString().slice(0, 10)) {
  const preco = Number(d?.preco) || 0, promo = Number(d?.precoPromo) || 0;
  if (d?.precoCombinar || !(preco > 0)) return null;
  const emPromo = promo > 0 && promo < preco && (!d.promoAte || hoje <= d.promoAte);
  return { preco, promo: emPromo ? promo : 0, ate: emPromo ? d.promoAte || "" : "" };
}

/** Motivo para o produto ficar fora do feed ("" = entra) */
export function motivoFora(p: Produto) {
  const d = p.dados || {};
  if (!p.ativo) return "inativo";
  if (!precoKg(d)) return "sem preço publicado";
  if (!(Array.isArray(d.fotos) && d.fotos.some((u: unknown) => typeof u === "string" && u))) return "sem foto";
  if (!Array.isArray(d.cores) || !d.cores.length) return "sem cor cadastrada";
  if (String(d.descricao || "").trim().length < 20) return "descrição curta (mínimo 20 letras)";
  return "";
}

/** Linhas do feed para um produto (uma por embalagem) */
export function linhas(p: Produto, preco5Proprio = false): Linha[] {
  const d = p.dados || {}, pk0 = precoKg(d)!;
  const codigo = String(d.codigo || p.id).toUpperCase(), marca = d.marca || "Policoating", cor = d.cores[0]?.nome || "";
  const fotos = (d.fotos as string[]).filter((u) => typeof u === "string" && u).map(absoluta);
  return CAIXAS.map((kg) => {
    // caixa de 5 kg com preço por kg próprio (recurso "Variações de embalagem"); a promoção aplica o mesmo desconto
    const pk = kg === 5 && preco5Proprio && Number(d.precoKg5) > 0
      ? { preco: Number(d.precoKg5), promo: pk0.promo ? Math.round(Number(d.precoKg5) * (pk0.promo / pk0.preco) * 100) / 100 : 0, ate: pk0.ate } : pk0;
    const l: Linha = {
      "g:id": `${codigo}-${kg}KG`, "g:item_group_id": codigo,
      "g:title": `${d.nome} — Caixa ${kg} kg`.slice(0, 150),
      "g:description": String(d.descricao || d.nome).slice(0, 5000),
      "g:link": `${SITE}/produto?id=${encodeURIComponent(p.id)}&emb=${kg}`,
      "g:image_link": fotos[0], "g:additional_image_link": fotos.slice(1, 11),
      "g:availability": "in_stock", "g:condition": "new",
      "g:price": dinheiro(pk.preco * kg),
      "g:brand": marca, "g:mpn": codigo, "g:color": cor,
      "g:product_type": ["Tinta em pó", CLASSES[d.categoria] || d.categoria || ""].filter(Boolean).join(" > "),
      "g:size": `${kg} kg`,
      "g:unit_pricing_measure": `${kg}kg`, "g:unit_pricing_base_measure": "1kg",
      "g:product_weight": `${kg} kg`, "g:shipping_weight": `${kg} kg`
    };
    if (pk.promo) {
      l["g:sale_price"] = dinheiro(pk.promo * kg);
      if (pk.ate) l["g:sale_price_effective_date"] = `${new Date().toISOString().slice(0, 10)}T00:00-03:00/${pk.ate}T23:59-03:00`;
    }
    return l;
  });
}

export function montarXml(itens: Linha[]) {
  const item = (l: Linha) => "  <item>\n" + Object.entries(l).flatMap(([k, v]) => (Array.isArray(v) ? v : [v]).filter((x) => x !== "" && x != null).map((x) => `    <${k}>${xml(x)}</${k}>`)).join("\n") + "\n  </item>";
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>Policoating — tintas em pó</title>
  <link>${SITE}/</link>
  <description>Catálogo de tintas em pó Policoating</description>
${itens.map(item).join("\n")}
</channel>
</rss>
`;
}

export async function atender(req: Request): Promise<Response> {
  const url = env("SUPABASE_URL"), chave = chaveServidor();
  const texto = (t: string, status: number) => new Response(t, { status, headers: { "content-type": "text/plain; charset=utf-8", "access-control-allow-origin": "*" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, apikey, content-type" } });
  if (req.method !== "GET") return texto("Use GET.", 405);
  if (!url || !chave) return texto("Função sem chave de servidor.", 500);
  const h = { apikey: chave, Authorization: `Bearer ${chave}` };
  const get = async (c: string) => { const r = await fetch(`${url}/rest/v1/${c}`, { headers: h }); return r.ok ? r.json() : null; };
  const rpc = async (n: string, c: unknown) => { const r = await fetch(`${url}/rest/v1/rpc/${n}`, { method: "POST", headers: { ...h, "Content-Type": "application/json" }, body: JSON.stringify(c) }); return r.ok ? r.json() : null; };

  const rec = (await get("recursos?select=ligado,implementado&chave=eq.merchant_center_feed_enabled"))?.[0];
  const ligado = !!(rec && rec.ligado && rec.implementado);
  const produtos: Produto[] = (await get("produtos?select=id,ativo,dados&order=id")) || [];
  const dentro: Produto[] = [], var5 = new Set<string>(), fora: { id: string; codigo: string; nome: string; motivo: string }[] = [];
  for (const p of produtos) {
    let motivo = motivoFora(p);
    if (!motivo && ligado && !(await rpc("recurso_disponivel", { p_chave: "merchant_center_feed_enabled", p_produto: p.id, p_categoria: p.dados?.categoria || null })))
      motivo = "feed desligado para este produto (Comércio e Recursos)";
    if (motivo) fora.push({ id: p.id, codigo: String(p.dados?.codigo || p.id).toUpperCase(), nome: p.dados?.nome || p.id, motivo });
    else {
      dentro.push(p);
      if (Number(p.dados?.precoKg5) > 0 && (await rpc("recurso_disponivel", { p_chave: "packaging_variants_enabled", p_produto: p.id, p_categoria: p.dados?.categoria || null }))) var5.add(p.id);
    }
  }
  if (new URL(req.url).searchParams.has("diagnostico"))
    return Response.json({ ligado, produtos: produtos.length, no_feed: dentro.length, linhas: dentro.length * CAIXAS.length, fora }, { headers: { "access-control-allow-origin": "*", "cache-control": "no-store" } });
  if (!ligado) return texto("Feed desligado. Ligue em Comércio e Recursos → Feed do Google Merchant Center.", 404);
  return new Response(montarXml(dentro.flatMap((p) => linhas(p, var5.has(p.id)))), { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=900", "access-control-allow-origin": "*" } });
}

if ((globalThis as any).Deno?.serve) (globalThis as any).Deno.serve(atender);
