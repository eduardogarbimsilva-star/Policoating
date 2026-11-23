// Celular: nada vaza da tela, cards não se sobrepõem e texto não fica cortado.
// Uso: SITE=https://policoatingtintas.com.br node testes/celular.mjs   (ou local: python3 testes/servidor.py 8765 & e sem SITE)
import { chromium, BASE } from "./comum.mjs";
const SITE = process.env.SITE || BASE;
const FOTOS = process.env.FOTOS || "";
const PAGINAS = (process.env.PAGINAS || "index.html,produtos.html,produto.html?id=pol-0001,aplicacao.html,galeria.html,sobre.html,recursos.html,cotacao.html,conta.html,trocas.html,privacidade.html,whatsapp.html").split(",");
const LARG = (process.env.LARG || "360,390,414").split(",").map(Number);
export function detector() {
  const W = document.documentElement.clientWidth, prob = [];
  const visivel = (e) => { const s = getComputedStyle(e); if (s.display === "none" || s.visibility === "hidden" || +s.opacity === 0) return false; const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
  const nome = (e) => (e.id ? "#" + e.id : e.tagName.toLowerCase()) + (typeof e.className === "string" && e.className.trim() ? "." + e.className.trim().split(/\s+/).slice(0, 2).join(".") : "");
  const dentroDeRolagem = (e) => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll|hidden)/.test(s.overflowX) && p.scrollWidth > p.clientWidth + 1) return true; if (s.position === "fixed" && (p.getBoundingClientRect().left < -5 || p.getBoundingClientRect().right > W + 5)) return true; } return false; };
  const todos = [...document.querySelectorAll("body *")].filter((e) => !e.closest("[hidden],[aria-hidden=true],.cb-tela,svg,script,style,noscript,template") && visivel(e));
  // 1) vaza da tela
  for (const e of todos) { const r = e.getBoundingClientRect(); if ((r.right > W + 1 || r.left < -1) && getComputedStyle(e).position !== "fixed" && !dentroDeRolagem(e)) prob.push(`vaza ${nome(e)} (${Math.round(r.left)}..${Math.round(r.right)} de ${W})`); }
  // 2) texto cortado (sem reticências intencionais)
  for (const e of todos) {
    const s = getComputedStyle(e); if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    if (s.textOverflow === "ellipsis" || s.webkitLineClamp !== "none" && s.webkitLineClamp) continue;
    if (/(hidden|clip)/.test(s.overflowX) && e.scrollWidth > e.clientWidth + 2) prob.push(`texto cortado na largura ${nome(e)}: "${e.textContent.trim().slice(0, 40)}"`);
    if (/(hidden|clip)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 3 && e.clientHeight > 0) prob.push(`texto cortado na altura ${nome(e)}: "${e.textContent.trim().slice(0, 40)}"`);
  }
  // 3) irmãos sobrepostos em grades/linhas
  for (const pai of todos) {
    const s = getComputedStyle(pai); if (!/(grid|flex)/.test(s.display)) continue;
    if (pai.matches(".pilula")) continue;   // cartão sobre a foto: proposital
    const f = [...pai.children].filter((c) => visivel(c) && !/(absolute|fixed)/.test(getComputedStyle(c).position) && !c.closest("[hidden]"));
    for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++) {
      const a = f[i].getBoundingClientRect(), b = f[j].getBoundingClientRect();
      const x = Math.min(a.right, b.right) - Math.max(a.left, b.left), y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (x > 3 && y > 3) prob.push(`sobrepõe ${nome(f[i])} × ${nome(f[j])} (${Math.round(x)}×${Math.round(y)}px) em ${nome(pai)}`);
    }
  }
  if (document.documentElement.scrollWidth > W + 1) prob.push(`página rola de lado (${document.documentElement.scrollWidth} > ${W})`);
  return [...new Set(prob)];
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const nav = await chromium.launch(); let total = 0;
  for (const w of LARG) {
    const ctx = await nav.newContext({ viewport: { width: w, height: 800 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await ctx.addInitScript(() => { try { localStorage.setItem("policoating_lgpd", "true"); localStorage.setItem("policoating_cookies", JSON.stringify("essenciais")); localStorage.setItem("policoating_novidades_ocultar", "*"); } catch (e) { /* */ } });
    const p = await ctx.newPage();
    for (const pg of PAGINAS) {
      try { await p.goto(`${SITE}/${pg}`, { waitUntil: "networkidle", timeout: 45000 }); } catch (e) { /* segue com o que carregou */ }
      await p.waitForTimeout(1500);
      await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); document.querySelectorAll(".revelar").forEach((e) => e.classList.add("visivel")); });
      await p.waitForTimeout(500);
      const pr = await p.evaluate(detector);
      if (pr.length) { total += pr.length; console.log(`FAIL  ${w}px ${pg}\n   - ` + pr.slice(0, 25).join("\n   - ")); }
      else console.log(`PASS  ${w}px ${pg}`);
      if (FOTOS && w === 390) await p.screenshot({ path: `${FOTOS}/${pg.replace(/[^a-z0-9]/gi, "_")}.png`, fullPage: true });
    }
    await ctx.close();
  }
  await nav.close();
  console.log(total ? `\n${total} problema(s)` : "\nNENHUM PROBLEMA");
  process.exitCode = total ? 1 : 0;
}
