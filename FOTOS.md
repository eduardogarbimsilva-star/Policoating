# Fotos reais do site — guia de produção

O site já funciona com imagens geradas automaticamente. Este guia serve para trocá-las por **fotos reais**
(tiradas na empresa) ou por **imagens fotorrealistas criadas em uma IA de imagens** (Gemini, ChatGPT, Midjourney…).

## Como usar
1. Gere ou fotografe as imagens abaixo. Formato **JPG**, horizontal **5:4** (ex.: 1200 × 960 px), fundo neutro.
2. Salve cada arquivo **com o nome exato** da tabela.
3. No GitHub, entre em `assets/img/produtos/` → **Add file → Upload files** → arraste os arquivos → **Commit changes**.
   (Ou envie as imagens no chat do Claude que ele coloca no lugar.)
4. Em `assets/js/midia.js`, troque `fotosProdutos: false` por `fotosProdutos: true`.

Pode subir aos poucos: toda cor que ainda não tiver foto continua usando a imagem gerada automaticamente.

## Dicas para a IA de imagens
- Gere **uma imagem por vez**, colando o prompt da linha.
- Mantenha sempre o mesmo estilo (fundo, luz, ângulo) para o catálogo ficar uniforme.
- Se a cor sair diferente, peça: *"ajuste a cor da placa para o código hexadecimal {HEX}, sem mudar o resto"*.
- Revise se não aparecem textos, marcas de outras empresas ou deformações.

**Prompt-base** (já incluído em cada linha):
> Fotografia de produto profissional em estúdio, fotorrealista. Uma placa de aço perfurada, pendurada por um gancho em um trilho metálico,
> pintada com tinta eletrostática em pó com acabamento {ACABAMENTO} na cor {COR} (hexadecimal {HEX}). Ao lado, na frente, um pequeno monte
> do pó da mesma cor sobre a superfície. Fundo cinza-claro neutro, iluminação suave de estúdio com reflexo realista conforme o acabamento,
> sombra suave, profundidade de campo leve. Sem texto, sem logotipo, sem pessoas. Proporção 5:4.


## Poliéster

### Poliéster TGIC-Free Brilhante — acabamento Brilhante (> 85 GU)

| Arquivo | Cor | Prompt |
|---|---|---|
| `poliester-brilhante--branco-trafego-ral-9016.jpg` | Branco Tráfego RAL 9016 `#F1F0EA` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento brilhante (> 85 gu), cor Branco Tráfego RAL 9016 (hexadecimal #F1F0EA). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |
| `poliester-brilhante--preto-intenso-ral-9005.jpg` | Preto Intenso RAL 9005 `#0E0E10` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento brilhante (> 85 gu), cor Preto Intenso RAL 9005 (hexadecimal #0E0E10). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |
| `poliester-brilhante--azul-genciana-ral-5010.jpg` | Azul Genciana RAL 5010 `#0E4C92` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento brilhante (> 85 gu), cor Azul Genciana RAL 5010 (hexadecimal #0E4C92). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |
| `poliester-brilhante--vermelho-fogo-ral-3000.jpg` | Vermelho Fogo RAL 3000 `#A72920` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento brilhante (> 85 gu), cor Vermelho Fogo RAL 3000 (hexadecimal #A72920). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |
| `poliester-brilhante--amarelo-sinal-ral-1003.jpg` | Amarelo Sinal RAL 1003 `#F2A900` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento brilhante (> 85 gu), cor Amarelo Sinal RAL 1003 (hexadecimal #F2A900). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |
| `poliester-brilhante--verde-musgo-ral-6005.jpg` | Verde Musgo RAL 6005 `#114232` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento brilhante (> 85 gu), cor Verde Musgo RAL 6005 (hexadecimal #114232). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |

### Poliéster Fosco Arquitetônico — acabamento Fosco (< 10 GU)

| Arquivo | Cor | Prompt |
|---|---|---|
| `poliester-fosco--preto-ral-9005.jpg` | Preto RAL 9005 `#0E0E10` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento fosco (< 10 gu), cor Preto RAL 9005 (hexadecimal #0E0E10). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |
| `poliester-fosco--grafite-ral-7024.jpg` | Grafite RAL 7024 `#474A50` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento fosco (< 10 gu), cor Grafite RAL 7024 (hexadecimal #474A50). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |
| `poliester-fosco--cinza-antracite-ral-7016.jpg` | Cinza Antracite RAL 7016 `#383E42` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento fosco (< 10 gu), cor Cinza Antracite RAL 7016 (hexadecimal #383E42). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |
| `poliester-fosco--bronze-ral-8019.jpg` | Bronze RAL 8019 `#3F3A3A` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento fosco (< 10 gu), cor Bronze RAL 8019 (hexadecimal #3F3A3A). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |
| `poliester-fosco--branco-ral-9010.jpg` | Branco RAL 9010 `#F4F2EA` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento fosco (< 10 gu), cor Branco RAL 9010 (hexadecimal #F4F2EA). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |

## Epóxi

### Epóxi Anticorrosivo — acabamento Semibrilho

| Arquivo | Cor | Prompt |
|---|---|---|
| `epoxi-anticorrosivo--cinza-claro-ral-7035.jpg` | Cinza Claro RAL 7035 `#CBD0CC` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento semibrilho, cor Cinza Claro RAL 7035 (hexadecimal #CBD0CC). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |
| `epoxi-anticorrosivo--cinza-munsell-n6-5.jpg` | Cinza Munsell N6.5 `#9C9E9F` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento semibrilho, cor Cinza Munsell N6.5 (hexadecimal #9C9E9F). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |
| `epoxi-anticorrosivo--laranja-seguranca-ral-2004.jpg` | Laranja Segurança RAL 2004 `#E75B12` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento semibrilho, cor Laranja Segurança RAL 2004 (hexadecimal #E75B12). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |
| `epoxi-anticorrosivo--azul-seguranca-ral-5005.jpg` | Azul Segurança RAL 5005 `#1E5AA8` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento semibrilho, cor Azul Segurança RAL 5005 (hexadecimal #1E5AA8). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |
| `epoxi-anticorrosivo--preto-ral-9005.jpg` | Preto RAL 9005 `#0E0E10` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento semibrilho, cor Preto RAL 9005 (hexadecimal #0E0E10). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |

### Epóxi para Painéis Elétricos — acabamento Texturizado fino

| Arquivo | Cor | Prompt |
|---|---|---|
| `epoxi-painel-eletrico--cinza-ral-7032.jpg` | Cinza RAL 7032 `#B5B0A1` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento texturizado fino, cor Cinza RAL 7032 (hexadecimal #B5B0A1). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |
| `epoxi-painel-eletrico--cinza-claro-ral-7035.jpg` | Cinza Claro RAL 7035 `#CBD0CC` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento texturizado fino, cor Cinza Claro RAL 7035 (hexadecimal #CBD0CC). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |
| `epoxi-painel-eletrico--bege-ral-1015.jpg` | Bege RAL 1015 `#E6D2B5` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento texturizado fino, cor Bege RAL 1015 (hexadecimal #E6D2B5). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |

## Híbrida

### Híbrida Epóxi-Poliéster Brilhante — acabamento Brilhante

| Arquivo | Cor | Prompt |
|---|---|---|
| `hibrida-brilhante--branco-ral-9003.jpg` | Branco RAL 9003 `#F4F4F4` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento brilhante, cor Branco RAL 9003 (hexadecimal #F4F4F4). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |
| `hibrida-brilhante--preto-ral-9005.jpg` | Preto RAL 9005 `#0E0E10` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento brilhante, cor Preto RAL 9005 (hexadecimal #0E0E10). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |
| `hibrida-brilhante--cinza-prata-ral-7001.jpg` | Cinza Prata RAL 7001 `#8A9597` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento brilhante, cor Cinza Prata RAL 7001 (hexadecimal #8A9597). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |
| `hibrida-brilhante--azul-ceu-ral-5015.jpg` | Azul Céu RAL 5015 `#2271B3` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento brilhante, cor Azul Céu RAL 5015 (hexadecimal #2271B3). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |
| `hibrida-brilhante--verde-ral-6018.jpg` | Verde RAL 6018 `#57A639` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento brilhante, cor Verde RAL 6018 (hexadecimal #57A639). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |

### Híbrida Acetinada — acabamento Acetinado (40–60 GU)

| Arquivo | Cor | Prompt |
|---|---|---|
| `hibrida-acetinada--branco-ral-9016.jpg` | Branco RAL 9016 `#F1F0EA` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento acetinado (40–60 gu), cor Branco RAL 9016 (hexadecimal #F1F0EA). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |
| `hibrida-acetinada--grafite-ral-7024.jpg` | Grafite RAL 7024 `#474A50` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento acetinado (40–60 gu), cor Grafite RAL 7024 (hexadecimal #474A50). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |
| `hibrida-acetinada--areia-ral-1019.jpg` | Areia RAL 1019 `#A08F7A` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento acetinado (40–60 gu), cor Areia RAL 1019 (hexadecimal #A08F7A). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |

## Texturizadas

### Texturizada Rugosa — acabamento Texturizado rugoso

| Arquivo | Cor | Prompt |
|---|---|---|
| `texturizada-rugosa--preto-ral-9005.jpg` | Preto RAL 9005 `#1A1A1C` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento texturizado rugoso, cor Preto RAL 9005 (hexadecimal #1A1A1C). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |
| `texturizada-rugosa--grafite-ral-7024.jpg` | Grafite RAL 7024 `#474A50` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento texturizado rugoso, cor Grafite RAL 7024 (hexadecimal #474A50). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |
| `texturizada-rugosa--marrom-ral-8017.jpg` | Marrom RAL 8017 `#45322E` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento texturizado rugoso, cor Marrom RAL 8017 (hexadecimal #45322E). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |
| `texturizada-rugosa--branco-ral-9016.jpg` | Branco RAL 9016 `#F1F0EA` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento texturizado rugoso, cor Branco RAL 9016 (hexadecimal #F1F0EA). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |

### Martelada (Hammertone) — acabamento Martelado

| Arquivo | Cor | Prompt |
|---|---|---|
| `texturizada-martelada--cinza-martelado.jpg` | Cinza Martelado `#7E8387` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento martelado, cor Cinza Martelado (hexadecimal #7E8387). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |
| `texturizada-martelada--azul-martelado.jpg` | Azul Martelado `#3B5B8A` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento martelado, cor Azul Martelado (hexadecimal #3B5B8A). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |
| `texturizada-martelada--verde-martelado.jpg` | Verde Martelado `#3D5E4A` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento martelado, cor Verde Martelado (hexadecimal #3D5E4A). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |

## Metálicas

### Metálica Efeito Alumínio — acabamento Metálico

| Arquivo | Cor | Prompt |
|---|---|---|
| `metalica-prata--prata-ral-9006.jpg` | Prata RAL 9006 `#A5A5A5` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento metálico, cor Prata RAL 9006 (hexadecimal #A5A5A5). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |
| `metalica-prata--grafite-metalico-ral-9007.jpg` | Grafite Metálico RAL 9007 `#8F8F8C` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento metálico, cor Grafite Metálico RAL 9007 (hexadecimal #8F8F8C). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |
| `metalica-prata--champagne.jpg` | Champagne `#C9B28A` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento metálico, cor Champagne (hexadecimal #C9B28A). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |

### Metálica Cobre & Bronze — acabamento Metálico acetinado

| Arquivo | Cor | Prompt |
|---|---|---|
| `metalica-cobre--cobre.jpg` | Cobre `#B06A3B` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento metálico acetinado, cor Cobre (hexadecimal #B06A3B). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |
| `metalica-cobre--bronze.jpg` | Bronze `#8C6A3E` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento metálico acetinado, cor Bronze (hexadecimal #8C6A3E). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |
| `metalica-cobre--ouro-velho.jpg` | Ouro Velho `#B08D43` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento metálico acetinado, cor Ouro Velho (hexadecimal #B08D43). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |

## Especiais

### Primer Epóxi Rico em Zinco — acabamento Fosco

| Arquivo | Cor | Prompt |
|---|---|---|
| `primer-zinco--cinza-zinco.jpg` | Cinza Zinco `#8D9296` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento fosco, cor Cinza Zinco (hexadecimal #8D9296). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |

### Verniz em Pó Transparente — acabamento Brilhante transparente

| Arquivo | Cor | Prompt |
|---|---|---|
| `verniz-po--incolor.jpg` | Incolor `#E9EEF3` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento brilhante transparente, cor Incolor (hexadecimal #E9EEF3). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |

### Pó Alta Temperatura 400 °C — acabamento Fosco

| Arquivo | Cor | Prompt |
|---|---|---|
| `alta-temperatura--preto-fosco.jpg` | Preto Fosco `#1C1C1E` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento fosco, cor Preto Fosco (hexadecimal #1C1C1E). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |
| `alta-temperatura--aluminio.jpg` | Alumínio `#B9BCBE` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento fosco, cor Alumínio (hexadecimal #B9BCBE). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |

### Cor Especial Sob Medida — acabamento Conforme projeto

| Arquivo | Cor | Prompt |
|---|---|---|
| `cor-especial--cor-a-definir.jpg` | Cor a definir `#1558D6` | Fotografia de produto profissional em estúdio, fotorrealista. Placa de aço perfurada pendurada por gancho em trilho metálico, pintada com tinta eletrostática em pó, acabamento conforme projeto, cor Cor a definir (hexadecimal #1558D6). Na frente, um pequeno monte do pó da mesma cor. Fundo cinza-claro neutro, luz suave de estúdio, reflexo realista, sombra suave. Sem texto, sem logotipo, sem pessoas. Proporção 5:4. |

## Fotos institucionais (slides e galeria)

Salve em `assets/img/slides/` e `assets/img/galeria/` e liste-as em `assets/js/midia.js` (`slides` e `galeria`).

| Arquivo | Uso | Prompt |
|---|---|---|
| `slides/linha-de-pintura.jpg` | Slide 1 | Fotografia industrial fotorrealista de uma linha de pintura eletrostática a pó: peças metálicas perfuradas coloridas (azul, branco, grafite e vermelho) penduradas em um trilho aéreo dentro de um galpão limpo e moderno, iluminação dramática, tons azulados, profundidade de campo. Sem texto, sem logotipo. 16:9. |
| `slides/cartela-ral.jpg` | Slide 2 | Fotografia de estúdio fotorrealista de uma cartela de cores RAL em placas metálicas pintadas a pó, dispostas em grade sobre fundo escuro, luz lateral suave realçando brilho e textura. Sem texto legível, sem logotipo. 16:9. |
| `slides/aplicacao.jpg` | Slide 3 | Fotografia industrial fotorrealista de um aplicador com EPI usando pistola de pintura eletrostática em cabine de pintura, nuvem fina de pó azul atingindo uma peça metálica, iluminação de cabine. Rosto não visível, sem texto, sem logotipo. 16:9. |
| `slides/caixas.jpg` | Slide 4 | Fotografia fotorrealista de caixas de papelão pardas empilhadas em um depósito organizado, com faixas azul-marinho impressas, prontas para expedição, luz natural suave. Sem texto legível. 16:9. |
| `galeria/residencia-portao-preto.jpg` | Galeria | Fotografia de arquitetura fotorrealista de uma residência brasileira moderna com portão e grades de aço pintados com tinta em pó preta fosca, fachada clara, dia ensolarado. Sem pessoas, sem texto. 5:4. |
| `galeria/sobrado-sacada-grafite.jpg` | Galeria | Fotografia de arquitetura fotorrealista de um sobrado moderno com guarda-corpo e esquadrias de alumínio pintados em grafite fosco (RAL 7016). Sem pessoas, sem texto. 5:4. |
| `galeria/loja-fachada-azul.jpg` | Galeria | Fotografia fotorrealista de fachada comercial com esquadrias e vitrines de alumínio pintadas em azul brilhante (RAL 5010), rua limpa. Sem pessoas, sem texto legível. 5:4. |
| `galeria/galpao-estrutura-amarela.jpg` | Galeria | Fotografia fotorrealista do interior de um galpão industrial com estrutura metálica pintada em amarelo (RAL 1003) e portas de enrolar cinza. Sem pessoas, sem texto. 5:4. |
| `galeria/painel-eletrico-cinza.jpg` | Galeria | Fotografia fotorrealista de painéis elétricos industriais pintados com tinta em pó cinza claro texturizado (RAL 7035) em uma sala técnica limpa. Sem texto legível. 5:4. |
| `galeria/moveis-aco-escritorio.jpg` | Galeria | Fotografia fotorrealista de escritório moderno com mesas, cadeiras e estantes de aço pintadas a pó, acabamento acetinado, iluminação natural. Sem pessoas, sem texto. 5:4. |
| `galeria/roda-prata.jpg` | Galeria | Fotografia fotorrealista em estúdio de uma roda automotiva de liga leve pintada com tinta em pó prata metálica, fundo escuro, reflexos realistas. Sem logotipo. 5:4. |

Exemplo de `midia.js` com as fotos institucionais:

```js
slides: ["assets/img/slides/linha-de-pintura.jpg", "assets/img/slides/cartela-ral.jpg", "assets/img/slides/aplicacao.jpg", "assets/img/slides/caixas.jpg"],
galeria: [
  { src: "assets/img/galeria/residencia-portao-preto.jpg", titulo: "Residência", descricao: "Portão e grades · RAL 9005 fosco", categoria: "ambientes" },
  { src: "assets/img/galeria/painel-eletrico-cinza.jpg", titulo: "Painel elétrico", descricao: "Epóxi texturizado · RAL 7035", categoria: "aplicacoes" }
],
```

> Total de fotos de produto: **45** (uma por cor). Comece pelas cores mais vendidas.
