// Utilidades compartilhadas pelos testes (Playwright).
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
function carregarPlaywright() {
  for (const caminho of ["playwright", "/opt/node22/lib/node_modules/playwright"]) {
    try { return require(caminho); } catch (e) { /* tenta o próximo */ }
  }
  throw new Error("Playwright não encontrado. Instale com: npm i -D playwright");
}
export const { chromium } = carregarPlaywright();

export const BASE = process.env.BASE_URL || "http://localhost:8765";

/** Contexto em "modo demonstração" (sem Supabase), sem fontes/CDNs externos e sem Analytics */
export async function contextoDemo(navegador, opcoes = {}) {
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 860 }, ...opcoes });
  await ctx.addInitScript(() => {
    if (sessionStorage.getItem("__teste_ini")) return;
    sessionStorage.setItem("__teste_ini", "1");
    localStorage.setItem("policoating_lgpd", "true");
    if (!window.__comAnimacao) localStorage.setItem("policoating_teste_sem_espera", "1");   // animação da cotação sem os 6 s (testada à parte)
    localStorage.setItem("policoating_cookies", JSON.stringify("essenciais"));   // o site grava em JSON
  });
  await ctx.route(/fonts\.g|pexels|jsdelivr|youtube|ytimg|googletagmanager|supabase\.co/, (r) => r.abort());
  await ctx.route("**/assets/js/config.js*", async (r) => {
    const resp = await r.fetch();
    r.fulfill({ response: resp, body: (await resp.text()).replace(/url: "[^"]*"/, 'url: ""') });
  });
  return ctx;
}

/** Catálogo de demonstração: 2 produtos válidos e 1 inválido (sem cores) */
export function sementeCatalogo() {
  const prod = (codigo, extra) => ({
    id: codigo.toLowerCase(), ativo: true, ordem: 10,
    dados: Object.assign({
      id: codigo.toLowerCase(), codigo, nome: "Poliéster Brilhante Teste " + codigo, categoria: "poliester", marca: "Policoating",
      descricao: "Produto de teste.", acabamento: "Brilhante", textura: "Liso", preco: 30,
      cores: [{ nome: "Preto RAL 9005", hex: "#111111" }],
      fotos: ["assets/img/marca/caixa-policoating.jpg", "assets/img/marca/caixa-policoating.jpg", "assets/img/marca/caixa-policoating.jpg"],
      embalagens: ["Caixa 5 kg", "Caixa 25 kg"]
    }, extra)
  });
  const c = { "pol-0001": prod("POL-0001"), "pol-0002": prod("POL-0002", { nome: "Epóxi Teste", categoria: "epoxi" }) };
  c["pol-0003"] = prod("POL-0003", { cores: [] });   // inválido: não pode derrubar o catálogo
  return c;
}

/** Perfil completo de pessoa física (CPF de teste válido) */
export const PERFIL_PF = {
  tipo: "pf", nome: "Maria Teste Silva", cpf: "529.982.247-25", telefone: "(16) 99630-4811", cep: "15990-000",
  logradouro: "Rua Teste", numero: "100", bairro: "Centro", cidade: "Matão", uf: "SP", aceite_privacidade_em: "2026-01-01T00:00:00Z"
};

/** Login de demonstração já feito (com ou sem perfil completo) */
export async function logarDemo(ctx, email, perfil) {
  await ctx.addInitScript(([email, perfil]) => {
    localStorage.setItem("policoating_demo_sessao", JSON.stringify({ email }));
    const p = JSON.parse(localStorage.getItem("policoating_demo_perfis") || "{}");
    if (!p[email]) p[email] = Object.assign({ email }, perfil || {});
    localStorage.setItem("policoating_demo_perfis", JSON.stringify(p));
  }, [email, perfil || null]);
}

/** Registro de resultados no formato da matriz de testes */
export function relatorio() {
  const linhas = [];
  return {
    add(id, cenario, ok, detalhe) { linhas.push({ id, cenario, status: ok ? "PASS" : "FAIL", detalhe }); },
    imprimir() {
      for (const l of linhas) console.log(`${l.status.padEnd(4)}  ${l.id.padEnd(11)} ${l.cenario}${l.detalhe ? "  — " + l.detalhe : ""}`);
      const falhas = linhas.filter((l) => l.status !== "PASS").length;
      console.log(`\n${linhas.length - falhas}/${linhas.length} PASS`);
      return falhas;
    }
  };
}
