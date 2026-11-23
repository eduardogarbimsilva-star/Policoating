# Testes e ferramentas

O site é estático (GitHub Pages) e cada página `.html` é editada diretamente.

## Ferramentas (`ferramentas/`)
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
