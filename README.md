# Policoating — Site institucional + catálogo de tinta em pó com pedido via WhatsApp

Site estático (HTML, CSS e JavaScript puro — sem build, sem servidor) inspirado no padrão corporativo do site da WEG,
com a identidade visual da **Policoating** (tinta eletrostática em pó).
Funciona como porta de entrada da empresa: mostra a variedade de produtos, a história, recursos úteis e permite ao
cliente montar um carrinho e **enviar o pedido direto para o WhatsApp do vendedor**.

## Páginas

| Página | Conteúdo |
|---|---|
| `index.html` | Hero com slogan e selos, faixa de valores, linhas de produtos, destaques, quem somos, recursos, contato |
| `produtos.html` | Catálogo completo com filtro por categoria e busca |
| `sobre.html` | Quem somos, processo de pintura a pó, história, missão/visão/valores, sustentabilidade |
| `recursos.html` | Calculadora de consumo de pó (kg e caixas), simulador de cores/acabamentos em peças, documentos, FAQ |

Em todas as páginas: carrinho lateral, botão flutuante do WhatsApp e modal de produto (cor RAL, caixa, quantidade).
O layout é responsivo (celular, tablet e computador).

## Como funciona o pedido

1. O cliente abre um produto, escolhe **cor**, **embalagem** e **quantidade** e adiciona ao carrinho.
2. O carrinho fica salvo no navegador (localStorage), mesmo trocando de página.
3. Ao clicar em **"Comprar pelo WhatsApp"**, abre o WhatsApp do vendedor com a mensagem pronta, por exemplo:

```
Olá! Vim pelo site da *Policoating* e gostaria de fazer um pedido:

*1. Poliéster TGIC-Free Brilhante*
   Cor: Azul Genciana RAL 5010 | Embalagem: Caixa 25 kg | Qtd: 2

Total de itens: 2
Nome: João
Cidade: Ribeirão Preto/SP

Aguardo o orçamento. Obrigado!
```

## Personalização

### Número do WhatsApp e dados da empresa
Edite **`assets/js/config.js`**:

```js
whatsapp: "5516992708155",   // 55 + DDD + número, só dígitos
telefone: "(16) 99270-8155",
email: "contato@policoating.com.br",
...
```

Todos os botões de WhatsApp, telefone, e-mail, endereço e redes sociais do site usam esses valores.

### Produtos
Edite **`assets/js/produtos.js`**. Cada produto tem nome, categoria, acabamento, descrição, rendimento,
cura, densidade (usada na calculadora), embalagens (caixas) e cores (nome/RAL + código hex). Use `destaque: true` para exibir na página inicial e,
opcionalmente, `preco: 199.90` para mostrar um preço "a partir de" (sem preço aparece "Sob consulta").

As embalagens são ilustrações da caixa de papelão Policoating, geradas automaticamente com a etiqueta
na cor escolhida — não é preciso ter fotos. Para usar fotos reais depois, troque a função `caixaSVG`
em `assets/js/main.js`. O logotipo foi redesenhado em SVG; para usar o arquivo oficial, coloque-o em
`assets/img/` e substitua o `<span class="logo-marca">` do cabeçalho.

### Textos provisórios
A história da empresa (`sobre.html`), a missão/visão e alguns dados técnicos dos produtos são textos
de exemplo — revise-os com as informações reais da Policoating.

## Rodar localmente

Basta abrir `index.html` no navegador, ou servir a pasta:

```bash
python3 -m http.server 8000
# acesse http://localhost:8000
```

## Publicar

Por ser estático, pode ser hospedado gratuitamente no **GitHub Pages** (Settings → Pages → branch),
Netlify, Vercel ou qualquer hospedagem comum.
