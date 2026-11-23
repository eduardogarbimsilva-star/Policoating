"""Cabeçalho e rodapé iguais em todas as páginas.

O cabeçalho (<header class="cabecalho"...>) e o rodapé (<footer class="rodape">) estão copiados em cada .html.
Edite-os no index.html e rode:

    python3 ferramentas/layout.py            # só confere (lista as páginas diferentes)
    python3 ferramentas/layout.py --aplicar  # copia do index.html para as outras páginas

O link do menu da própria página continua marcado (class="ativo"). Depois rode ferramentas/versoes.py.
"""
import glob
import re
import sys

BLOCOS = {
    "cabeçalho": re.compile(r'<header class="cabecalho".*?</header>', re.S),
    "rodapé": re.compile(r'<footer class="rodape".*?</footer>', re.S),
}
ATIVO = re.compile(r' class="ativo"')


def normal(trecho):
    return ATIVO.sub("", trecho)


def marcar_ativo(trecho, pagina):
    alvo = "./" if pagina == "index" else pagina
    return re.sub(rf'<a href="{re.escape(alvo)}"(?=(?: aria-haspopup="true")?>)', f'<a href="{alvo}" class="ativo"', trecho, count=1)


def main():
    aplicar = "--aplicar" in sys.argv
    modelo = open("index.html", encoding="utf-8").read()
    base = {nome: normal(rx.search(modelo).group(0)) for nome, rx in BLOCOS.items()}
    diferentes = 0
    for arq in sorted(glob.glob("*.html")):
        if arq in ("index.html", "whatsapp.html"):
            continue
        pagina = arq[:-5]
        html = open(arq, encoding="utf-8").read()
        novo = html
        for nome, rx in BLOCOS.items():
            m = rx.search(html)
            if not m:
                continue
            if normal(m.group(0)) != base[nome]:
                diferentes += 1
                print(f"{arq}: {nome} diferente do index.html")
                if aplicar:
                    novo = novo.replace(m.group(0), marcar_ativo(base[nome], pagina) if nome == "cabeçalho" else base[nome], 1)
        if aplicar and novo != html:
            open(arq, "w", encoding="utf-8").write(novo)
    print(("Aplicado." if aplicar else "Tudo igual.") if not diferentes or aplicar else f"{diferentes} bloco(s) diferente(s). Use --aplicar para copiar do index.html.")
    return 0 if (not diferentes or aplicar) else 1


if __name__ == "__main__":
    sys.exit(main())
