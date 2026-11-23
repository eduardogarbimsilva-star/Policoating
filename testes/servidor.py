# Servidor local para os testes: imita o GitHub Pages (/produtos abre produtos.html).
# Uso (na raiz do repositório): python3 testes/servidor.py 8765
import http.server
import os
import sys


class Handler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        caminho = self.path.split("?", 1)[0].split("#", 1)[0]
        if caminho != "/" and "." not in os.path.basename(caminho) and os.path.exists(self.translate_path(caminho) + ".html"):
            self.path = caminho + ".html" + self.path[len(caminho):]
        return super().send_head()

    def log_message(self, *args):
        pass


porta = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
http.server.ThreadingHTTPServer(("", porta), Handler).serve_forever()
