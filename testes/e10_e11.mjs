// E10 — bolinhas flutuantes das redes; E11 — app instalável (PWA).
// Uso: python3 testes/servidor.py 8765 &  depois  node testes/e10_e11.mjs
import { chromium, BASE, contextoDemo, sementeCatalogo, logarDemo, relatorio } from "./comum.mjs";

const R = relatorio();
const nav = await chromium.launch();
const espera = (p, ms) => p.waitForTimeout(ms);
const REC = (lista) => Object.fromEntries(lista.map((k) => [k, { chave: k, ligado: true, implementado: true, alvos: {} }]));
const CONFIG = (extra) => Object.assign({ whatsapp: "5516996304811", redes: { instagram: "https://www.instagram.com/policoating", facebook: "https://www.facebook.com/policoating", youtube: "https://www.youtube.com/@policoating" } }, extra || {});

async function site({ recursos, config, viewport, admin } = {}) {
  const ctx = await contextoDemo(nav, viewport ? { viewport } : {});
  await ctx.addInitScript(([c, rec, cfg, adm]) => {
    if (localStorage.getItem("__semente")) return; localStorage.setItem("__semente", "1");
    localStorage.setItem("policoating_demo_catalogo", JSON.stringify(c));
    if (rec) localStorage.setItem("policoating_demo_recursos", JSON.stringify(rec));
    if (cfg) localStorage.setItem("policoating_demo_config", JSON.stringify(cfg));
    if (adm) localStorage.setItem("policoating_demo_equipe", JSON.stringify([{ email: "dono@x.com", papel: "admin" }]));
  }, [sementeCatalogo(), recursos || null, config || null, !!admin]);
  if (admin) await logarDemo(ctx, "dono@x.com", null);
  const p = await ctx.newPage(); const erros = []; p.on("pageerror", (e) => erros.push(e.message));
  return { ctx, p, erros };
}

/* ---------------- E10 ---------------- */
{ // desligado: nada aparece, mesmo com links
  const { ctx, p } = await site({ config: CONFIG() });
  await p.goto(`${BASE}/index.html`); await espera(p, 700);
  R.add("V31-E10-01", "Recurso desligado: nenhuma bolinha", !(await p.$(".redes-flutuantes")));
  await ctx.close();
}
{ // ligado, computador: coluna à direita, no meio, com os links cadastrados
  const { ctx, p, erros } = await site({ recursos: REC(["floating_social_enabled"]), config: CONFIG() });
  await p.goto(`${BASE}/index.html`); await espera(p, 700);
  const info = await p.evaluate(() => {
    const n = document.querySelector(".redes-flutuantes"); if (!n) return null;
    const r = n.getBoundingClientRect();
    return { redes: [...n.querySelectorAll("[data-rede-flutuante]")].map((a) => a.dataset.redeFlutuante + (a.target === "_blank" && /^https:/.test(a.href) && a.getAttribute("aria-label") ? "" : "!")),
      direita: innerWidth - r.right < 40, meio: Math.abs((r.top + r.bottom) / 2 - innerHeight / 2) < 30 };
  });
  R.add("V31-E10-02", "Ligado: redes cadastradas na lateral direita, no meio da tela", info && info.redes.join() === "instagram,facebook,youtube" && info.direita && info.meio && !erros.length, JSON.stringify(info));
  await p.hover(".rf-instagram"); await espera(p, 250);
  const dica = await p.$eval(".rf-instagram .rf-dica", (d) => getComputedStyle(d).opacity);
  R.add("V31-E10-03", "Passar o mouse mostra o nome da rede", +dica > 0.9, "opacidade " + dica);
  await ctx.close();
}
{ // lado esquerdo e ordem escolhida no painel
  const { ctx, p } = await site({ recursos: REC(["floating_social_enabled"]), config: CONFIG({ flutuante: { posicao: "esquerda", dispositivos: "todos", redes: ["youtube", "instagram"] } }) });
  await p.goto(`${BASE}/produtos.html`); await espera(p, 700);
  const info = await p.evaluate(() => { const n = document.querySelector(".redes-flutuantes"); return { redes: [...n.querySelectorAll("[data-rede-flutuante]")].map((a) => a.dataset.redeFlutuante).join(), esq: n.getBoundingClientRect().left < 40 }; });
  R.add("V31-E10-04", "Lado esquerdo e só as redes marcadas, na ordem do painel", info.redes === "youtube,instagram" && info.esq, JSON.stringify(info));
  await ctx.close();
}
{ // celular: um botão; abre e fecha com Esc; não cobre o Assistente; sem rolagem lateral
  const { ctx, p, erros } = await site({ recursos: REC(["floating_social_enabled"]), config: CONFIG(), viewport: { width: 390, height: 844 } });
  await p.goto(`${BASE}/index.html`); await espera(p, 900);
  const fechado = await p.$eval(".rf-lista", (u) => getComputedStyle(u).visibility);
  await p.click(".rf-alternar"); await espera(p, 300);
  const aberto = await p.evaluate(() => ({ vis: getComputedStyle(document.querySelector(".rf-lista")).visibility, foco: document.activeElement.dataset.redeFlutuante, exp: document.querySelector(".rf-alternar").getAttribute("aria-expanded") }));
  await p.keyboard.press("Escape"); await espera(p, 300);
  const depois = await p.evaluate(() => ({ vis: getComputedStyle(document.querySelector(".rf-lista")).visibility, focoNoBotao: document.activeElement.classList.contains("rf-alternar") }));
  const sobrepoe = await p.evaluate(() => {
    const a = document.querySelector(".rf-alternar").getBoundingClientRect();
    const outros = [...document.querySelectorAll("button, a")].filter((el) => /assistente/i.test(el.className + el.textContent) && el.offsetParent);
    return outros.some((o) => { const b = o.getBoundingClientRect(); return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom); });
  });
  const lateral = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  R.add("V31-E10-05", "Celular: botão abre as redes, Esc fecha e devolve o foco",
    fechado === "hidden" && aberto.vis === "visible" && aberto.foco === "instagram" && aberto.exp === "true" && depois.vis === "hidden" && depois.focoNoBotao && !erros.length, JSON.stringify({ fechado, aberto, depois }));
  R.add("V31-E10-06", "Celular: não cobre o Assistente e não cria rolagem lateral", !sobrepoe && !lateral, `sobrepõe=${sobrepoe} lateral=${lateral}`);
  await ctx.close();
}
{ // "só no computador" some no celular
  const { ctx, p } = await site({ recursos: REC(["floating_social_enabled"]), config: CONFIG({ flutuante: { posicao: "direita", dispositivos: "computador", redes: ["instagram"] } }), viewport: { width: 390, height: 844 } });
  await p.goto(`${BASE}/index.html`); await espera(p, 700);
  R.add("V31-E10-07", "Configurado só para computador: não aparece no celular", await p.$eval(".redes-flutuantes", (n) => getComputedStyle(n).display === "none"));
  await ctx.close();
}
{ // métrica de clique: só com o recurso de métricas ligado (e o Analytics carregado após o aceite)
  for (const [metricas, esperado] of [[true, 1], [false, 0]]) {
    const { ctx, p } = await site({ recursos: REC(metricas ? ["floating_social_enabled", "social_click_metrics_enabled"] : ["floating_social_enabled"]), config: CONFIG() });
    await ctx.route(/instagram\.com/, (r) => r.fulfill({ body: "ok" }));
    await p.goto(`${BASE}/index.html`); await espera(p, 700);
    await p.evaluate(() => { window.__eventos = []; window.gtag = (...a) => window.__eventos.push(a); });
    await p.click(".rf-instagram"); await espera(p, 300);
    const n = await p.evaluate(() => window.__eventos.filter((e) => e[1] === "clique_rede").length);
    R.add("V31-E10-08", `Medir cliques ${metricas ? "ligado: registra" : "desligado: não registra"}`, n === esperado, `${n} evento(s)`);
    await ctx.close();
  }
}
{ // painel: salvar Contato e links guarda a ordem e não apaga marcas/classes (bug antigo)
  const cfg = CONFIG({ marcas: ["Policoating", "Marca Teste"], tipos: [{ id: "primer", nome: "Primer" }] });
  const { ctx, p, erros } = await site({ config: cfg, admin: true });
  await p.goto(`${BASE}/admin.html`); await espera(p, 1100);
  await p.click('.admin-abas [data-aba="contato"]'); await espera(p, 600);
  await p.selectOption("#flu-posicao", "esquerda");
  for (let i = 0; i < 6; i++) await p.click('#flu-redes li[data-rede="youtube"] [data-subir]');   // leva o YouTube para o topo
  await p.click('#form-config button[type="submit"]'); await espera(p, 700);
  const salvo = await p.evaluate(() => JSON.parse(localStorage.getItem("policoating_demo_config")));
  R.add("V31-E10-09", "Painel salva lado e ordem das bolinhas e mantém marcas e classes",
    salvo.flutuante && salvo.flutuante.posicao === "esquerda" && salvo.flutuante.redes[0] === "youtube" && (salvo.marcas || []).includes("Marca Teste") && (salvo.tipos || []).some((t) => t.id === "primer") && !erros.length,
    JSON.stringify({ flutuante: salvo.flutuante, marcas: salvo.marcas, tipos: salvo.tipos }));
  R.add("V31-E10-10", "Bolinhas não aparecem no painel", !(await p.$(".redes-flutuantes")));
  await ctx.close();
}

/* ---------------- E11 ---------------- */
{ // manifesto e ícones
  const ctx = await nav.newContext(); const p = await ctx.newPage();
  const m = await (await p.request.get(`${BASE}/manifest.webmanifest`)).json();
  const icones = await Promise.all(m.icons.map(async (i) => (await p.request.get(`${BASE}/${i.src}`)).status()));
  await p.goto(`${BASE}/index.html`);
  const head = await p.evaluate(() => !!document.querySelector('link[rel="manifest"]') && !!document.querySelector('meta[name="theme-color"]'));
  R.add("V31-E11-01", "Manifesto válido (standalone, ícones 192/512/maskable) e ligado em todas as páginas",
    m.display === "standalone" && m.start_url && m.icons.some((i) => i.purpose === "maskable") && icones.every((s) => s === 200) && head, `ícones ${icones.join(",")}`);
  await ctx.close();
}
{ // desligado: sem service worker
  const { ctx, p } = await site({});
  await p.goto(`${BASE}/index.html`); await espera(p, 1200);
  const reg = await p.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length);
  R.add("V31-E11-02", "Recurso desligado: nenhum service worker", reg === 0, `${reg} registrado(s)`);
  await ctx.close();
}
{ // ligado: registra, convite aparece quando o navegador permite, "Agora não" vale por 30 dias; cache só público
  const { ctx, p, erros } = await site({ recursos: REC(["pwa_install_invite_enabled"]) });
  await p.goto(`${BASE}/index.html`); await espera(p, 800);
  await p.evaluate(() => { const e = new Event("beforeinstallprompt"); e.prompt = () => { window.__pediu = true; }; e.userChoice = Promise.resolve({ outcome: "dismissed" }); window.dispatchEvent(e); });
  await espera(p, 4600);
  const convite = await p.$eval(".convite-app", (c) => c.innerText.replace(/\s+/g, " ")).catch(() => "");
  await p.click(".convite-app [data-dispensar]"); await espera(p, 300);
  const reg = await p.evaluate(async () => { const r = await navigator.serviceWorker.ready; return !!r.active; });
  await p.reload(); await espera(p, 800);
  await p.evaluate(() => { const e = new Event("beforeinstallprompt"); e.prompt = () => {}; e.userChoice = Promise.resolve({}); window.dispatchEvent(e); });
  await espera(p, 4600);
  const voltou = !!(await p.$(".convite-app"));
  R.add("V31-E11-03", "Ligado: service worker ativo e convite Instalar / Agora não", reg && /Instale o app/.test(convite) && /Instalar/.test(convite) && /Agora não/.test(convite) && !erros.length, convite.slice(0, 80));
  R.add("V31-E11-04", "Depois de 'Agora não' o convite não volta (30 dias)", !voltou);
  // navega por páginas públicas e privadas e confere o que ficou guardado
  for (const pg of ["produtos.html", "conta.html", "admin.html", "sobre.html"]) { await p.goto(`${BASE}/${pg}`); await espera(p, 500); }
  const guardado = await p.evaluate(async () => { const out = []; for (const k of await caches.keys()) for (const r of await (await caches.open(k)).keys()) out.push(new URL(r.url).pathname); return out; });
  const privado = guardado.filter((u) => /admin|conta|supabase/.test(u));
  R.add("V31-E11-05", "Cache só com páginas e arquivos públicos (nada de conta/painel)", guardado.length > 0 && !privado.length, `${guardado.length} itens; privados: ${privado.join(",") || "nenhum"}`);
  // desligar o recurso remove o service worker e o cache
  await p.evaluate(() => { localStorage.setItem("policoating_demo_recursos", "{}"); });
  await p.goto(`${BASE}/index.html`); await espera(p, 1500);
  const sobrou = await p.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length + (await caches.keys()).length);
  R.add("V31-E11-06", "Desligar o recurso remove o service worker e o cache", sobrou === 0, `${sobrou} restante(s)`);
  await ctx.close();
}

await nav.close();
process.exitCode = R.imprimir() ? 1 : 0;
