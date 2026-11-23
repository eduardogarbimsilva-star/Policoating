#!/usr/bin/env python3
"""Gera o sitemap.xml com as páginas do site e a página de cada produto ativo (busca o catálogo público no Supabase).
Uso: python3 ferramentas/sitemap.py   (rode quando cadastrar ou tirar produtos)"""
import json, re, urllib.request, datetime, pathlib
RAIZ = pathlib.Path(__file__).resolve().parent.parent
cfg = (RAIZ / "assets/js/config.js").read_text()
url = re.search(r'url:\s*"(https://[^"]+)"', cfg).group(1)
chave = re.search(r'(sb_publishable_[A-Za-z0-9_-]+)', cfg).group(1)
req = urllib.request.Request(f"{url}/rest/v1/produtos?select=id,ativo&ativo=eq.true&order=id", headers={"apikey": chave})
produtos = json.load(urllib.request.urlopen(req, timeout=20))
hoje = datetime.date.today().isoformat()
SITE = "https://policoatingtintas.com.br"
paginas = [("", "1.0"), ("produtos", "0.9"), ("aplicacao", "0.8"), ("galeria", "0.8"), ("recursos", "0.8"), ("sobre", "0.7"), ("trocas", "0.4"), ("privacidade", "0.3")]
linhas = [f"  <url><loc>{SITE}/{p}</loc><lastmod>{hoje}</lastmod><priority>{pr}</priority></url>" for p, pr in paginas]
linhas += [f"  <url><loc>{SITE}/produto?id={p['id']}</loc><lastmod>{hoje}</lastmod><priority>0.8</priority></url>" for p in produtos if re.fullmatch(r"[a-z0-9-]{2,60}", p["id"])]
(RAIZ / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(linhas) + "\n</urlset>\n")
print(f"sitemap.xml: {len(paginas)} páginas + {len(produtos)} produtos")
