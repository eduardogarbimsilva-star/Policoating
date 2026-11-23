/* Service worker do app Policoating (etapa E11).
   Guarda só o que é público e igual para todos:
   - arquivos de assets/ (CSS, JS, imagens, vídeos já versionados com ?v=): do cache, atualizando por trás;
   - páginas públicas: sempre da internet; o cache só é usado sem conexão.
   Nunca guarda: painel (admin), conta, Supabase (login, pedidos, cotações, dados pessoais), outros sites,
   nem nada que não seja GET. Para desligar, o site chama unregister() quando o recurso é desligado no painel. */
const VERSAO = "policoating-v1";
const PAGINAS_PUBLICAS = ["./", "index.html", "produtos", "produtos.html", "aplicacao", "aplicacao.html", "galeria", "galeria.html",
  "sobre", "sobre.html", "recursos", "recursos.html", "privacidade", "privacidade.html", "404.html"];
const NUNCA = /(^|\/)(admin|conta|whatsapp)(\.html|\.js)?$/;   // páginas e scripts do painel e da conta

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(["./", "produtos.html", "404.html"]).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("message", (e) => {
  if (e.data === "limpar") e.waitUntil(caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;                 // Supabase, Google, WhatsApp...: direto da rede
  const caminho = url.pathname.replace(/^\/+/, "");
  if (NUNCA.test(url.pathname)) return;                            // conta e painel: nunca em cache

  if (caminho.startsWith("assets/") && !/\.(mp4|webm)$/.test(caminho)) {
    // arquivos públicos versionados: responde do cache e atualiza por trás
    e.respondWith(caches.open(VERSAO).then(async (c) => {
      const guardado = await c.match(req);
      const rede = fetch(req).then((r) => { if (r.ok && r.type === "basic") c.put(req, r.clone()); return r; }).catch(() => guardado);
      return guardado || rede;
    }));
    return;
  }
  if (req.mode === "navigate" && (PAGINAS_PUBLICAS.includes(caminho) || caminho === "")) {
    // páginas públicas: internet primeiro; sem conexão, a última versão guardada
    e.respondWith(fetch(req).then((r) => {
      if (r.ok && r.type === "basic") { const copia = r.clone(); caches.open(VERSAO).then((c) => c.put(req, copia)); }
      return r;
    }).catch(async () => (await caches.match(req)) || (await caches.match("./")) || Response.error()));
  }
});
