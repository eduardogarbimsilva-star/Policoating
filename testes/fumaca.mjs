// Teste geral: todas as páginas abrem sem erro de JavaScript, com um <h1> e sem rolagem lateral,
// no computador e no celular. Uso: python3 testes/servidor.py 8765 &  depois  node testes/fumaca.mjs
import { chromium, BASE, contextoDemo, sementeCatalogo, relatorio } from "./comum.mjs";

const R = relatorio();
const nav = await chromium.launch();
const PAGINAS = ["index", "produtos", "aplicacao", "galeria", "sobre", "recursos", "conta", "privacidade", "cotacao", "admin", "404"];
for (const vp of [{ width: 1366, height: 860, nome: "computador" }, { width: 390, height: 844, nome: "celular" }]) {
  const ctx = await contextoDemo(nav, { viewport: { width: vp.width, height: vp.height } });
  await ctx.addInitScript((c) => localStorage.setItem("policoating_demo_catalogo", JSON.stringify(c)), sementeCatalogo());
  for (const pg of PAGINAS) {
    const p = await ctx.newPage(); const erros = [];
    p.on("pageerror", (e) => erros.push(e.message.slice(0, 90)));
    await p.goto(`${BASE}/${pg}.html`, { waitUntil: "load" }); await p.waitForTimeout(400);
    const info = await p.evaluate(() => ({ h1: document.querySelectorAll("h1").length, lateral: document.documentElement.scrollWidth > innerWidth }));
    R.add("FUMACA", `${vp.nome} · ${pg}`, !erros.length && info.h1 === 1 && !info.lateral,
      [erros.length ? "erros: " + erros.join(" | ") : "", info.h1 !== 1 ? `h1=${info.h1}` : "", info.lateral ? "rolagem lateral" : ""].filter(Boolean).join("; "));
    await p.close();
  }
  await ctx.close();
}
await nav.close();
process.exitCode = R.imprimir() ? 1 : 0;
