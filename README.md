# Policoating — Site institucional + catálogo de tinta em pó com pedido via WhatsApp

Site estático (HTML, CSS e JavaScript puro — sem build, sem servidor) inspirado no padrão corporativo do site da WEG,
com a identidade visual da **Policoating** (tinta eletrostática em pó).
Funciona como porta de entrada da empresa: mostra a variedade de produtos, a história, recursos úteis e permite ao
cliente montar um carrinho e **enviar o pedido direto para o WhatsApp do vendedor**.

## Páginas

| Página | Conteúdo |
|---|---|
| `index.html` | Slides, selos, carrossel dos tipos de tinta, destaques, ambientes (casa, loja, galpão…), vídeo animado do processo, galeria, contato |
| `produtos.html` | Catálogo completo com filtro por categoria e busca |
| `sobre.html` | Quem somos, processo de pintura a pó, história, missão/visão/valores, sustentabilidade |
| `galeria.html` | Galeria de cores, acabamentos e peças pintadas, com filtros e ampliação |
| `conta.html` | Área do cliente: entrar/criar conta com código por e-mail, cadastro PF/PJ, pedidos, favoritos |
| `privacidade.html` | Política de Privacidade (LGPD) |
| `404.html` | Página de "não encontrado" (usada automaticamente pelo GitHub Pages) |
| `recursos.html` | Guia "Qual pó usar?", calculadora de consumo (kg e caixas), simulador de cores, documentos, FAQ |

Em todas as páginas: carrinho lateral, botão flutuante do WhatsApp e modal de produto (cor RAL, caixa, quantidade).
O layout é responsivo (celular, tablet e computador).

## Área do cliente (login com código por e-mail)

- **Criar conta:** o cliente escolhe **Empresa (CNPJ)** ou **Pessoa física (CPF)**, informa o e-mail, aceita a
  Política de Privacidade e recebe um **código de verificação** no e-mail.
- **Entrar:** sem senha — a cada acesso um novo código é enviado ao e-mail.
- **Cadastro:** CNPJ com botão **Buscar** (preenche razão social e endereço pela Receita, via BrasilAPI),
  CPF/CNPJ validados, **CEP que preenche o endereço automaticamente** (ViaCEP), telefone e endereço de entrega.
- **Minha conta:** histórico de pedidos com **Repetir pedido**, edição dos dados e **Favoritos**.
- Com `exigirLogin: true` (em `config.js`), o cliente precisa entrar para enviar o pedido — e a mensagem do
  WhatsApp já vai com **número do pedido, dados de faturamento e endereço de entrega**.

### Modo demonstração x modo real

Enquanto o Supabase não estiver configurado, o site roda em **modo demonstração**: o código aparece na tela
e os dados ficam só no navegador de quem testa. **Não publique para clientes reais nesse modo.**

### Ativar o envio real do código por e-mail (Supabase — plano gratuito)

1. Crie uma conta em <https://supabase.com> e um novo projeto (região *South America (São Paulo)*).
2. Em **SQL Editor → New query**, cole o conteúdo de [`supabase/setup.sql`](supabase/setup.sql) e clique em **Run**.
   Isso cria as tabelas `clientes` e `pedidos` com segurança por usuário (cada cliente só vê os próprios dados).
3. Em **Authentication → Sign In / Providers → Email**, deixe **Email** habilitado.
4. Em **Authentication → Emails → Templates**, edite os modelos **Confirm signup** e **Magic Link** para enviar o
   **código** (e não um link). Exemplo de corpo:
   ```html
   <h2>Seu código de acesso Policoating</h2>
   <p>Use o código abaixo para entrar na sua conta:</p>
   <p style="font-size:28px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
   <p>O código expira em alguns minutos. Se não foi você, ignore este e-mail.</p>
   ```
5. Em **Authentication → URL Configuration**, coloque o endereço do site em **Site URL**
   (ex.: `https://eduardogarbimsilva-star.github.io/Policoating/`).
6. Em **Project Settings → API**, copie a **Project URL** e a chave pública **anon / publishable** e cole em
   `assets/js/config.js`:
   ```js
   supabase: {
     url: "https://SEU-PROJETO.supabase.co",
     anonKey: "SUA-CHAVE-PUBLICA"
   },
   ```
   > A chave *anon/publishable* é pública por natureza; a segurança vem das regras (RLS) do passo 2.
   > **Nunca** coloque a chave `service_role`/secret no site.
7. **Importante para produção:** o e-mail padrão do Supabase tem limite de poucos envios por hora. Em
   **Authentication → Emails → SMTP Settings**, configure um provedor de e-mail (ex.: Resend, Brevo, Amazon SES)
   com um remetente do seu domínio, como `nao-responda@policoating.com.br`.

Os cadastros e pedidos podem ser consultados pela equipe em **Table Editor → clientes / pedidos** no painel do Supabase.

## Como funciona o pedido

1. O cliente abre um produto, escolhe **cor**, **embalagem** e **quantidade** e adiciona ao carrinho.
2. O carrinho fica salvo no navegador (localStorage), mesmo trocando de página.
3. Ao clicar em **"Comprar pelo WhatsApp"**, abre o WhatsApp do vendedor com a mensagem pronta, por exemplo:

```
Olá! Vim pelo site da *Policoating* e gostaria de fazer um pedido.
*Pedido nº PC-260925-G9W6*

*1. Poliéster TGIC-Free Brilhante*
   Cor: Azul Genciana RAL 5010 | Embalagem: Caixa 25 kg | Qtd: 2

Total de itens: 2

*Dados do cliente*
Empresa: METALÚRGICA EXEMPLO LTDA (METAL EXEMPLO)
CNPJ: 11.222.333/0001-81
Responsável: Maria Souza
Telefone: (16) 3333-4444
E-mail: compras@metalexemplo.com.br

*Endereço de entrega*
Rua General Osório, 250 - Galpão 2
Centro - Ribeirão Preto/SP - CEP 14010-000

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

## Fotos e vídeos

O site já vem com imagens geradas automaticamente, então funciona sem nenhuma foto:
- **Foto de cada cor de produto:** placa metálica pintada, pendurada no gancho, com o pó da cor na frente.
  O brilho, a textura, o efeito martelado ou metálico seguem o acabamento do produto.
- **Galeria:** cores, acabamentos e peças pintadas (portão, painel elétrico, cadeira, estante, esquadria, roda).
- **Slides** da página inicial e **vídeo animado** do processo de pintura a pó (pré-tratamento → aplicação → estufa → peça pronta).

Para usar **fotos e vídeos reais** da empresa, coloque os arquivos em `assets/img/` e `assets/video/` e liste-os em
[`assets/js/midia.js`](assets/js/midia.js) (slides, galeria e vídeos do YouTube ou `.mp4`).
### Fotos reais de casas e fachadas (seção "Cores que transformam ambientes")

A página inicial e a galeria mostram fotos reais de casas, fachadas e estruturas em cada cor, com a tinta indicada.
As fotos vêm do banco gratuito **Pexels** (uso comercial liberado) e ficam listadas em
[`assets/js/fotos-reais.js`](assets/js/fotos-reais.js). Para trocar por fotos das suas obras, suba o arquivo em
`assets/img/galeria/` e use `src` no lugar de `pexels`:

```js
{ src: "assets/img/galeria/obra-portao-preto.jpg", cor: "preto", titulo: "Portão residencial", texto: "Obra de cliente", produto: "poliester-fosco", corProduto: "Preto RAL 9005" }
```

Se alguma foto não carregar, ela some sozinha da tela (sem imagem quebrada).

### Fotos reais dos produtos (uma por cor)

O guia [`FOTOS.md`](FOTOS.md) lista **o nome exato do arquivo de cada cor** e um **prompt pronto** para gerar a foto
fotorrealista em uma IA de imagens (Gemini, ChatGPT…), além dos prompts das fotos de casas, fachadas e slides.

1. Suba os arquivos em `assets/img/produtos/` (GitHub → *Add file → Upload files*).
2. Em `assets/js/midia.js`, mude `fotosProdutos: false` para `fotosProdutos: true`.

Pode subir aos poucos: a cor que ainda não tiver foto continua com a imagem gerada automaticamente.

Outra opção: para a foto real de uma cor específica, adicione `foto` na cor dentro de `assets/js/produtos.js`:

```js
{ nome: "Preto RAL 9005", hex: "#0E0E10", foto: "assets/img/produtos/poliester-preto.jpg" }
```

Dica: use fotos em `.jpg` com cerca de 1200 px de largura (proporção 5:4 para produtos e galeria) para o site continuar leve.

## Assistente de compras (botão no canto da tela)

Substitui o antigo botão do WhatsApp. O cliente conversa em linguagem natural e o assistente:
- **pesquisa produtos** por uso, cor, código RAL e acabamento (ex.: *"portão preto fosco"*, *"painel elétrico RAL 7035"*,
  *"churrasqueira"*) e mostra cartões com foto, **Ver detalhes** e **+ Carrinho** já na cor certa;
- mostra os **pedidos recentes** com **Comprar novamente** (coloca os mesmos itens no carrinho), os **vistos recentemente**,
  os **favoritos** e o **carrinho**;
- responde sobre **preço, entrega e fichas técnicas** e ajuda a escolher o tipo de tinta;
- **fala com o vendedor** no WhatsApp já levando o resumo do que o cliente procurou.

Funciona sozinho, sem custo (interpretação local no navegador).

### Opcional: ligar a IA Claude no assistente

Com a IA, o assistente entende perguntas livres e mais complexas; se ela falhar, ele volta ao modo local automaticamente.
A chave da Anthropic **nunca** fica no site: ela fica guardada no Supabase, dentro da função
[`supabase/functions/assistente/index.ts`](supabase/functions/assistente/index.ts).

1. Crie uma chave em **console.anthropic.com** (API Keys) e defina um **limite de gasto mensal** (Billing → Limits).
   Cada conversa custa alguns centavos.
2. No Supabase: **Edge Functions → Deploy a new function → Via Editor**, nome `assistente`, cole o conteúdo de
   `index.ts` e publique. Em *Details*, **desligue "Verify JWT"**.
3. **Edge Functions → Secrets**: adicione `ANTHROPIC_API_KEY` com a chave.
4. Em `assets/js/config.js`, preencha
   `assistente: { endpoint: "https://SEU-PROJETO.supabase.co/functions/v1/assistente" }`.

A função só aceita chamadas do endereço do site (lista `ORIGENS_PERMITIDAS`) e limita 30 mensagens a cada 10 minutos por visitante.

## Tipos de tinta e guia de escolha

As informações do carrossel **"Conheça os tipos de tinta"** (ideal para, uso, cura, notas de resistência e
acabamentos) ficam em `CATEGORIAS`, no início de [`assets/js/produtos.js`](assets/js/produtos.js).
O guia **"Qual pó usar?"** (em Recursos) usa essas mesmas linhas para indicar produtos; as regras estão em
`assets/js/secoes.js` (função `recomendar`).

## Google e compartilhamento

- Cada página tem título, descrição e **imagem de compartilhamento** (`assets/img/compartilhar.png`), exibida
  quando o link é enviado no WhatsApp ou em redes sociais.
- `sitemap.xml` e `robots.txt` ajudam o Google a encontrar as páginas. Se o endereço do site mudar
  (domínio próprio), atualize-o nesses dois arquivos e nas tags `og:` das páginas.
- Dados estruturados da empresa (schema.org) na página inicial.

## Rodar localmente

Basta abrir `index.html` no navegador, ou servir a pasta:

```bash
python3 -m http.server 8000
# acesse http://localhost:8000
```

## Publicar

Por ser estático, pode ser hospedado gratuitamente no **GitHub Pages** (Settings → Pages → branch),
Netlify, Vercel ou qualquer hospedagem comum.
