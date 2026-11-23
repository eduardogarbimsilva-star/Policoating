# Atualiza o ?v=hash de assets/css e assets/js em todas as páginas .html da raiz
import glob, hashlib, re
mudou = 0
for f in glob.glob('*.html'):
    s = open(f, encoding='utf-8').read()
    n = re.sub(r'((?:src|href)="(assets/(?:css|js)/[^"?]+))\?v=[0-9a-f]+"',
               lambda m: f'{m.group(1)}?v={hashlib.md5(open(m.group(2), "rb").read()).hexdigest()[:8]}"', s)
    if n != s:
        open(f, 'w', encoding='utf-8').write(n); mudou += 1
print("páginas atualizadas:", mudou)
