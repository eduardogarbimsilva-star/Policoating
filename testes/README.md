# Testes e ferramentas

O site é estático (GitHub Pages) e cada página `.html` é editada diretamente.

## Ferramentas (`ferramentas/`)
- `python3 ferramentas/sitemap.py` — refaz o sitemap.xml com a página de cada produto ativo (rode ao cadastrar ou tirar produtos).
- `python3 ferramentas/layout.py` — confere se o cabeçalho e o rodapé estão iguais em todas as páginas.
  Edite no `index.html` e rode com `--aplicar` para copiar para as outras.
- `python3 ferramentas/versoes.py` — atualiza o `?v=` dos CSS/JS em todas as páginas.
  Rode sempre que mudar um arquivo de `assets/css` ou `assets/js`, para o navegador baixar a versão nova.

## Testes (`testes/`)
Precisam do Playwright (`npm i -D playwright`) e rodam em modo demonstração, sem tocar no banco real.

```
python3 testes/servidor.py 8765 &     # servidor local igual ao GitHub Pages
node testes/fumaca.mjs                 # todas as páginas: sem erro, com h1, sem rolagem lateral (computador e celular)
node testes/e01.mjs                    # E01: CPF, CEP, estado, login/saída, catálogo, textos, pedido pelo WhatsApp
```

Cada linha mostra `PASS` ou `FAIL` com o código do cenário da matriz V3.1 (ex.: `V31-E01-03`).

```
node testes/e03.mjs                    # E03: Comércio e Recursos (aba do painel, requisito, exceções, histórico)
node testes/e10_e11.mjs                # E10: bolinhas das redes · E11: app instalável (manifesto, service worker, convite, cache)
node testes/e05.mjs                    # E05: "Calcular frete" no produto e configuração do frete no painel
node testes/frete.mjs                  # E05/E06: função "frete" do Supabase (frete e cotação com código) — não precisa do servidor local
node testes/e06_e08.mjs                # E06–E08: página de cotação, botão no produto, consulta pelo código, Minhas cotações e painel da equipe
node testes/e02.mjs                    # E02: página própria do produto, dados para o Google, trocas e devoluções
node testes/catalogo_google.mjs        # E02: feed do Google Merchant Center (função catalogo-google) — não precisa do servidor local
node testes/e12.mjs                    # E12: banners de novidades (só o que está ligado), foco ao fechar janelas, contraste, menos movimento, CLS
node testes/cotacao_config.mjs         # cotação configurável no painel (campos, produto opcional, veículos, peso máximo, volumetria, intervalo, lista e exclusão), animação ao cotar e avisos
node testes/e13_e14.mjs                # E13/E14: sitemap/robots sem páginas privadas, recursos desligados por padrão, desfazer no SQL, saúde do sistema
node testes/producao.mjs               # site NO AR, só leitura: versão publicada, páginas sem erro, funções e recursos (rode depois de publicar)
```

## Testes do banco (`testes/sql/`)
Rodam num Postgres local (16+), nunca no Supabase de verdade:
```
createdb teste_policoating
psql -d teste_policoating -f testes/sql/imitacao_supabase.sql   # login/2 etapas imitados
psql -d teste_policoating -f <só a PARTE R do supabase/setup.sql>
psql -d teste_policoating -f testes/sql/parte_r.sql             # os ERROR esperados são as recusas testadas
# (o mesmo para parte_t.sql e parte_u.sql, depois das PARTES T e U; a parte U precisa de auth.users)
```


Manual de operação (o que liga onde, ordem do SQL, publicar/desfazer, backup, monitoramento): `docs/OPERACAO.md`.
