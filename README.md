# Color Weg Tintas — Site institucional + catálogo com pedido via WhatsApp

Site estático (HTML, CSS e JavaScript puro — sem build, sem servidor) inspirado no padrão corporativo do site da WEG.
Funciona como porta de entrada da empresa: mostra a variedade de produtos, a história, recursos úteis e permite ao
cliente montar um carrinho e **enviar o pedido direto para o WhatsApp do vendedor**.

## Páginas

| Página | Conteúdo |
|---|---|
| `index.html` | Hero, linhas de produtos, destaques, resumo da história, números, recursos, contato |
| `produtos.html` | Catálogo completo com filtro por categoria e busca |
| `sobre.html` | Quem somos, números, linha do tempo, missão/visão/valores, sustentabilidade |
| `recursos.html` | Calculadora de tinta, simulador de cores, documentos técnicos, FAQ |

Em todas as páginas: carrinho lateral, botão flutuante do WhatsApp e modal de produto (cor, embalagem, quantidade).

## Como funciona o pedido

1. O cliente abre um produto, escolhe **cor**, **embalagem** e **quantidade** e adiciona ao carrinho.
2. O carrinho fica salvo no navegador (localStorage), mesmo trocando de página.
3. Ao clicar em **"Comprar pelo WhatsApp"**, abre o WhatsApp do vendedor com a mensagem pronta, por exemplo:

```
Olá! Vim pelo site da *Color Weg Tintas* e gostaria de fazer um pedido:

*1. Acrílica Premium Fosca*
   Cor: Areia | Embalagem: 18 L | Qtd: 2

Total de itens: 2
Nome: João
Cidade: Jaraguá do Sul/SC

Aguardo o orçamento. Obrigado!
```

## Personalização

### Número do WhatsApp e dados da empresa
Edite **`assets/js/config.js`**:

```js
whatsapp: "5547999999999",   // 55 + DDD + número, só dígitos
telefone: "(47) 99999-9999",
email: "contato@colorweg.com.br",
...
```

Todos os botões de WhatsApp, telefone, e-mail, endereço e redes sociais do site usam esses valores.

### Produtos
Edite **`assets/js/produtos.js`**. Cada produto tem nome, categoria, descrição, rendimento, secagem,
embalagens e cores (nome + código hex). Use `destaque: true` para exibir na página inicial e,
opcionalmente, `preco: 199.90` para mostrar um preço "a partir de" (sem preço aparece "Sob consulta").

As latas de tinta são ilustrações geradas automaticamente na cor escolhida — não é preciso ter fotos.
Se quiser usar fotos reais depois, basta trocar a função `lataSVG` em `assets/js/main.js`.

## Rodar localmente

Basta abrir `index.html` no navegador, ou servir a pasta:

```bash
python3 -m http.server 8000
# acesse http://localhost:8000
```

## Publicar

Por ser estático, pode ser hospedado gratuitamente no **GitHub Pages** (Settings → Pages → branch),
Netlify, Vercel ou qualquer hospedagem comum.
