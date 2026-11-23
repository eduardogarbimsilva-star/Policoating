// Cabeçalho e barra superior: em qualquer largura (deslogado e logado como dono, com o sino) nada se sobrepõe nem quebra linha.
// Uso: python3 testes/servidor.py 8765 &  depois  node testes/cabecalho.mjs
import { chromium, BASE, contextoDemo, logarDemo } from "./comum.mjs";
const nav = await chromium.launch();
const ruins = [];
for (const modo of ["anon", "admin"]) {
  const ctx = await contextoDemo(nav, {});
  if (modo === "admin") {
    await ctx.addInitScript(() => localStorage.setItem("policoating_demo_equipe", JSON.stringify([{ email: "eduardo.henrique.longo@x.com", papel: "admin" }])));
    await logarDemo(ctx, "eduardo.henrique.longo@x.com", null);
  }
  const p = await ctx.newPage();
  for (const pg of ["index.html", "produtos.html", "cotacao.html"]) {
    await p.setViewportSize({ width: 1400, height: 800 });
    await p.goto(`${BASE}/${pg}`); await p.waitForTimeout(1200);
    await p.evaluate(() => { const b = document.querySelector(".btn-avisos"); if (b) b.hidden = false; });
    for (const w of [700, 870, 960, 1024, 1100, 1180, 1280, 1366, 1440, 1536, 1600, 1680, 1886, 1920, 2560]) {
      await p.setViewportSize({ width: w, height: 800 }); await p.waitForTimeout(150);
      const r = await p.evaluate(() => {
        const box = document.querySelector(".cabecalho .container"), q = (s) => document.querySelector(s);
        const R = (e) => e && e.offsetParent !== null ? e.getBoundingClientRect() : null;
        const logo = R(q(".cabecalho .logo")), navr = R(q(".cabecalho nav")), ac = R(q(".acoes-topo")), sm = q(".logo small");
        const smR = sm && sm.offsetParent !== null ? sm.getBoundingClientRect() : null;
        return { cls: [...q(".cabecalho").classList].filter((c) => c.startsWith("cab-")).join(","), over: box.scrollWidth > box.clientWidth + 1,
          doc: document.documentElement.scrollWidth > innerWidth, sobre: !!(logo && navr && logo.right > navr.left + 1) || !!(navr && ac && navr.right > ac.left + 1),
          smLinhas: smR ? Math.round(smR.height / 9) : 0, barra: Math.round(document.querySelector(".barra-topo").getBoundingClientRect().height), barraOver: document.querySelector(".barra-topo .container").scrollWidth > document.querySelector(".barra-topo .container").clientWidth + 1 };
      });
      const ok = !r.over && !r.doc && !r.sobre && r.smLinhas <= 1 && r.barra <= 46 && !r.barraOver;
      if (!ok) ruins.push(`${modo} ${pg} ${w}: ${JSON.stringify(r)}`);
    }
  }
  await ctx.close();
}
console.log(ruins.length ? "FAIL\n" + ruins.join("\n") : "PASS  CAB-01  Cabeçalho sem sobreposição em 15 larguras × 3 páginas × 2 estados");
process.exitCode = ruins.length ? 1 : 0;
await nav.close();
