# Policoating — Site institucional + catálogo de tinta em pó com pedido via WhatsApp

Site estático (HTML, CSS e JavaScript puro — sem build, sem servidor) inspirado no padrão corporativo do site da WEG,
com a identidade visual da **Policoating** (tinta eletrostática em pó).
Funciona como porta de entrada da empresa: mostra a variedade de produtos, a história, recursos úteis e permite ao
cliente montar o carrinho e **enviar o pedido para o WhatsApp do vendedor**; o pedido fica registrado em Meus pedidos
e na aba Vendas do painel.

## Páginas

| Página | Conteúdo |
|---|---|
| `index.html` | Slides com as imagens da marca, selos, carrossel dos tipos de tinta, destaques, peças reais por cor, como funciona (foto real), galeria, contato |
| `produtos.html` | Catálogo completo com filtro por categoria e busca |
| `aplicacao.html` | Pintura a pó: máquinas e equipamentos de cada etapa (preparação, aplicação, cura, qualidade), vantagens, onde usar, onde não usar, exemplos |
| `sobre.html` | Quem somos, processo de pintura a pó, história, missão/visão/valores, sustentabilidade |
| `galeria.html` | Fotos da marca e de peças reais pintadas a pó, com filtro por cor e ampliação |
| `conta.html` | Área do cliente: entrar/criar conta com código por e-mail, cadastro PF/PJ, pedidos, favoritos |
| `privacidade.html` | Política de Privacidade (LGPD) |
| `404.html` | Página de "não encontrado" (usada automaticamente pelo GitHub Pages) |
| `recursos.html` | Guia "Qual pó usar?", calculadora de consumo (kg e caixas), simulador de cores, documentos, FAQ |

Em todas as páginas: carrinho lateral, assistente de compras e modal de produto (cor RAL, caixa, quantidade).
O layout é responsivo (celular, tablet e computador).

## Área do cliente (login com código por e-mail)

- **Criar conta:** o cliente escolhe **Empresa (CNPJ)** ou **Pessoa física (CPF)**, informa o e-mail, aceita a
  Política de Privacidade e recebe um **código de verificação** no e-mail.
- **Entrar:** sem senha — a cada acesso um novo código é enviado ao e-mail.
- **Cadastro:** CNPJ com botão **Buscar** (preenche razão social e endereço pela Receita, via BrasilAPI),
  CPF/CNPJ validados, **CEP que preenche o endereço automaticamente** (ViaCEP), telefone e endereço de entrega.
- **Minha conta:** **Meus pedidos** (situação, previsão de entrega, chat com o vendedor, cancelamento,
  reembolso e atendimento) com **Repetir pedido**, edição dos dados e **Favoritos**.
- Para comprar, o cliente entra na conta e completa o cadastro (faturamento e endereço de entrega).

### Modo demonstração x modo real

Enquanto o Supabase não estiver configurado, o site roda em **modo demonstração**: o código aparece na tela
e os dados ficam só no navegador de quem testa. **Não publique para clientes reais nesse modo.**

### Ativar o envio real do código por e-mail (Supabase — plano gratuito)

1. Crie uma conta em <https://supabase.com> e um novo projeto (região *South America (São Paulo)*).
2. Em **SQL Editor → New query**, cole o conteúdo de [`supabase/setup.sql`](supabase/setup.sql) e clique em **Run**.
   Isso cria as tabelas `clientes` e `pedidos` com segurança por usuário (cada cliente só vê os próprios dados).
3. Em **Authentication → Sign In / Providers → Email**, deixe **Email** habilitado.
4. Em **Authentication → Emails → Templates**, troque os dois modelos pelos e-mails prontos da pasta
   [`supabase/emails`](supabase/emails) (visual da marca, com código em destaque, aviso de segurança e contato):
   - **Confirm signup** (quem está criando a conta): assunto `Confirme seu cadastro na Policoating`, corpo com
     todo o conteúdo de [`confirmar-cadastro.html`](supabase/emails/confirmar-cadastro.html).
   - **Magic Link** (quem já tem conta e está entrando): assunto `Seu código de acesso Policoating`, corpo com
     todo o conteúdo de [`codigo-acesso.html`](supabase/emails/codigo-acesso.html).

   Abra o arquivo no GitHub, clique em **Raw**, copie tudo (Ctrl+A, Ctrl+C) e cole no campo **Message body**
   do Supabase. Os modelos usam `{{ .Token }}` (o código), `{{ .Email }}` e `{{ .SiteURL }}`.

   **Tamanho do código:** o Supabase manda 8 dígitos nos projetos novos (dá para mudar de 6 a 10 em
   **Authentication → Sign In / Providers → Email → Email OTP Length**). O site usa `tamanhoCodigo` do
   [`assets/js/config.js`](assets/js/config.js) (hoje `8`); se mudar no Supabase, mude lá também.
   Colar o código inteiro sempre funciona, de qualquer tamanho.
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

### Validações do cadastro (PARTE H do `setup.sql`)

O site confere os dados antes de salvar, e o banco confere de novo (assim ninguém burla pelo navegador):
- **Sem repetição:** um e-mail, um CPF e um CNPJ por conta. "Criar conta" com um e-mail que já tem cadastro
  vira "Entrar" automaticamente.
- **CPF e CNPJ** com dígitos verificadores; **nome** e **responsável** com nome e sobrenome, só letras;
  **telefone** com DDD real (celular começa com 9); **CEP** com 8 números; **estado** da lista;
  **inscrição estadual** só números ou ISENTO; tamanho máximo em todos os campos.
- **E-mail digitado errado** (gmial.com, hotmail.con...): o site sugere o correto.
- O e-mail do cadastro é sempre o do login, e as datas dos pedidos são do servidor.
- **Pedidos:** até 2.000 caixas ou 50.000 kg sob medida por item; observação até 500 caracteres; preço, estoque
  e prazo conferidos pelo banco na compra (PARTE L).

Cadastros antigos não são bloqueados; as regras valem para novos cadastros e alterações. Se ao rodar a
PARTE H aparecer erro de "duplicate key", já existem cadastros repetidos: use a consulta do fim da PARTE H
para encontrá-los, resolva e rode de novo.

### Newsletter

O bloco "Receba nossa Newsletter" da página inicial grava o e-mail na tabela `newsletter` do Supabase
(PARTE C do [`supabase/setup.sql`](supabase/setup.sql): cole só essa parte no SQL Editor e clique em **Run**).
Para ver a lista: **Table Editor → newsletter**. Enquanto a tabela não existir, o botão abre o e-mail do cliente
já preenchido para `contato@...`.

## Quantidade: caixas ou sob medida

Na janela do produto, a **Caixa 25 kg** vem selecionada. O cliente também pode escolher **Sob medida (kg)** e digitar o
total em quilos; o vendedor confirma a combinação de embalagens. O atalho **Calcular pela área** transforma m² em kg
(rendimento do produto + 15% de perda) e preenche a quantidade. O carrinho e o pedido mostram o total em kg.

## Como funciona o pedido

1. O cliente abre um produto (fotos, código, marca, preço, estoque e **prazo de entrega pelo CEP**), escolhe
   embalagem e quantidade e adiciona ao carrinho. Só dá para pedir até o estoque disponível.
2. No carrinho aparecem o valor estimado e a previsão de entrega. **Enviar pedido pelo WhatsApp** exige conta com
   cadastro completo: o pedido é **registrado** (Meus pedidos do cliente e aba Vendas da equipe) e o **WhatsApp do
   vendedor abre sozinho** com o número do pedido, itens, códigos, quantidades, valores, previsão de entrega, dados
   do cliente e endereço. O banco confere preço e calcula o prazo; se o estoque estiver em uso (PARTES J e K),
   também confere e reserva o estoque. Sem a PARTE L no banco, o pedido é registrado do jeito antigo.
3. **Prazo (simulação a partir de Matão-SP):** pedido até 14h em dia útil sai no mesmo dia; depois, no próximo dia
   útil. Entrega em dias úteis após o envio: região de Matão (CEP 13000–16999) 1–2; resto de SP 2–3; MG, RJ, ES e PR
   3–5; SC, RS, GO, DF e MS 4–7; MT, TO, BA e SE 6–9; demais do Nordeste 7–11; Norte 9–15. Os valores ficam em
   [`assets/js/loja.js`](assets/js/loja.js) e na função `prazo_regiao` do banco (PARTE L) — mude nos dois.
4. Em **Minha conta → Meus pedidos** o cliente acompanha a situação (recebido → preparando o envio → a caminho →
   entregue), vê itens, valores e previsão, **conversa com o vendedor** pelo chat do pedido e pode **cancelar a
   compra** (na hora, se ainda não foi confirmada; depois, o vendedor analisa), **pedir reembolso/devolução** ou
   **falar com o atendimento** (ou abrir o WhatsApp do vendedor). Frete e pagamento são combinados com o vendedor.
5. A equipe recebe a venda na aba **Vendas** do painel (com aviso no menu), confirma (informando o preço dos itens
   "a combinar"), marca como enviado (transportadora e rastreio) e como entregue, responde o chat e as
   solicitações. Cancelamentos devolvem o estoque; no reembolso dá para escolher devolver ao estoque.

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

### Redes sociais

Os ícones do rodapé (Instagram, Facebook, LinkedIn, YouTube) só aparecem quando o endereço é preenchido em
`redes` no [`assets/js/config.js`](assets/js/config.js), por exemplo `instagram: "https://www.instagram.com/policoating"`.

### Painel da empresa: cadastrar, editar, ocultar e excluir produtos

Página [`admin.html`](admin.html), com link em **Minha conta → Painel da empresa**. Só aparece para e-mails
da equipe; clientes comuns não veem nem acessam.

**Cargos da equipe:**
- **Administrador:** tudo (produtos, pedidos, contato e links, galeria e equipe).
- **Vendedor:** só a **Área do vendedor**, com as abas Pedidos e Clientes (busca, chamar o cliente e planilha de pedidos).
- **Excluir pedidos:** administradores sempre podem. Vendedores só quando um administrador marca
  **Pode excluir pedidos** na aba Equipe (e pode desmarcar a qualquer momento). O pedido excluído some do painel e
  de Minha conta do cliente. Precisa da **PARTE G** do `setup.sql`.
- **Exportar clientes:** administradores sempre podem. Vendedores só com **Pode exportar clientes** marcado na aba
  Equipe. Precisa da **PARTE I** do `setup.sql`.

O primeiro administrador é liberado pelo SQL (PARTE D); os demais são adicionados no site, na aba **Equipe**,
escolhendo o cargo. O pagamento ainda não é feito pelo site: frete e pagamento são combinados no chat do pedido.

**Ativar (uma vez), no Supabase → SQL Editor:**
1. Cole a **PARTE D** do [`supabase/setup.sql`](supabase/setup.sql) e clique em **Run**.
   Ela cria a tabela `produtos`, a lista `admins` e a pasta de fotos `produtos`.
2. Na última linha da PARTE D, troque o e-mail de exemplo pelo e-mail da empresa, tire os `--` do começo e rode
   só essa linha. Repita a linha com outros e-mails para liberar mais pessoas.
3. Entre no site com esse e-mail (código por e-mail), abra o painel e clique em
   **Importar produtos atuais do site**. A partir daí, tudo é editado pelo painel.

**Abas do painel:**
- **Produtos:** veja abaixo.
- **Vendas (estilo Mercado Livre):** todo pedido enviado pelo site aparece na hora, com aviso no menu (número em vermelho)
  para vendedores e administradores. Filtros: **Novas**, **Enviar hoje**, **Próximos envios**, **A caminho**,
  **Entregues**, **Mensagens** (cliente escreveu), **Solicitações** (cancelamento, reembolso, atendimento),
  **Canceladas** e **Todas**; busca por código, cliente, produto ou cidade; período; "minhas vendas". Mostra
  faturamento, número de vendas, kg, ticket médio, mais vendidos e ranking por vendedor, e exporta planilha.
  Cada venda abre com itens e valores, cliente e endereço, WhatsApp do cliente, chat e as ações (confirmar,
  enviar, entregar, cancelar, responder solicitações; excluir para quem tem permissão). Precisa da **PARTE L**.
- **Clientes:** todos os clientes cadastrados (só a equipe vê; nunca aparecem na parte pública do site).
  Busca por nome, empresa, CPF/CNPJ, e-mail, telefone ou cidade; filtros "compraram nos últimos 30 dias",
  "não compram há mais de 90 dias", "sem pedidos" e "cadastrados nos últimos 30 dias"; ordem por último pedido,
  kg comprados, número de pedidos ou nome. Cada cliente mostra pedidos, total em kg, último pedido e desde quando é
  cliente, com os botões **Ver pedidos** e **WhatsApp**. A planilha de clientes só aparece para quem pode exportar.
- **Estoque:** saldo em kg (e em caixas de 25 kg) de cada produto e cor, com busca e filtros "abaixo do mínimo",
  "sem estoque" e "com estoque". Em **Movimentar**: **Entrada** (produção ou compra, com número da NF),
  **Saída**, **Inventário** (informe a contagem real e o sistema lança a diferença) e **Mínimo** (alerta de
  reposição). Cada item tem **Histórico** com data, tipo, kg, pedido, documento e quem fez; nada é apagado nem
  editado, correções entram como inventário. Saídas não deixam o saldo ficar negativo.
  - **Reserva no pedido:** o pedido enviado pelo site já desconta (reserva) o estoque; se a venda for cancelada ou o pedido
    excluído, o estoque volta.
  - **No site:** o cliente vê a quantidade em estoque de cada produto (kg e caixas) e só consegue pedir até o saldo
    (contando o que já está no carrinho). Produto com saldo zero aparece como **Esgotado**, sem carrinho, com o botão
    **Avise-me / pedir orçamento** (WhatsApp). Na hora de enviar o pedido o site confere o estoque de novo, e o
    banco recusa pedido acima do saldo. Enquanto o estoque não tiver nenhuma movimentação, o site não limita nada.
  - Toda a equipe consulta; movimenta quem é administrador ou tem **Pode movimentar estoque** (aba Equipe).
    Precisa da **PARTE J** do `setup.sql`.
- **Contato e links:** WhatsApp dos pedidos, telefone, e-mail, horário, endereço, slogan, redes sociais
  (Instagram, Facebook, WhatsApp Business, YouTube, TikTok, LinkedIn) e lojas (Mercado Livre, Shopee, AliExpress,
  Amazon, Magalu). Cada link só aparece no site depois de preenchido.
- **Galeria:** enviar, ordenar, legendar e remover as fotos da galeria.
- **Equipe:** adicionar pessoas como Administrador ou Vendedor, mudar o cargo ou remover o acesso.

Para as abas Contato, Galeria e Equipe, rode também as **PARTES E, F, G, H, I, J, K e L** do `setup.sql`, nessa ordem.

**Produtos no painel (cada cor é um produto):**
- **Novo produto:** o **código é gerado pelo sistema** (POL-0001, POL-0002...). Informe **no mínimo 3 fotos**
  (até 10; a primeira é a capa e as setas mudam a ordem; fotos do celular são convertidas), **tipo** e **marca**
  (com **+ Novo** / **+ Nova** para cadastrar outros), nome, **cor**, **descrição**, acabamento, rendimento, cura,
  densidade, embalagens, destaque e ordem.
- **Preço:** preço por kg (o site mostra também o valor da caixa de 25 kg) e, se quiser, preço promocional com data
  de fim (preço riscado e % de desconto), ou **Valor a combinar com o vendedor**.
- **Seleção múltipla:** marque vários produtos (ou todos) e aplique de uma vez: promoção em %, remover promoção,
  mostrar/ocultar, trocar marca ou tipo, reajustar preço em % ou excluir.
- **Vendedores** veem a aba Produtos só para **aplicar e remover promoções** nos produtos selecionados.
- **Editar**, **Duplicar** (para criar outra cor do mesmo produto) e **Excluir**. O site mostra só os produtos
  cadastrados aqui: o que for excluído some do site e não volta.

As mudanças valem para todos os visitantes em segundos. Sem Supabase configurado, o painel funciona em modo
demonstração e grava só no navegador.

### Produtos
Os produtos são cadastrados só pelo painel. [`assets/js/produtos.js`](assets/js/produtos.js) guarda apenas os
**tipos de tinta** (linhas) usados no catálogo, no guia "Qual pó usar?" e no carrossel; tipos novos criados no
painel entram automaticamente.

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

Enquanto uma cor não tiver foto própria, o site usa uma **foto real de uma peça de aço** (assets/img/marca/peca-armario.jpg)
e a pinta digitalmente na cor e no acabamento (brilhante, acetinado ou fosco), mantendo sombras e reflexos.
Acabamentos metálicos e texturizados usam a imagem ilustrativa. A melhor opção continua sendo enviar a foto real de
cada cor pelo Painel da empresa.

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

Além de buscar produtos, o assistente calcula a quantidade ("quanto preciso para 80 m²?"), compara linhas
("diferença entre epóxi e poliéster"), coloca itens no carrinho ("quero 3 caixas de poliéster preto fosco"),
lista cores, informa contato, lojas e redes (com os dados do painel), sugere próximas perguntas, aceita mensagem
por voz e tem botão de nova conversa.

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

### Vídeos

- `assets/video/fundo-topo.webm`: vídeo sem som que roda no fundo do primeiro slide.
- `assets/video/institucional-policoating.webm`: vídeo institucional (abertura com o logo, capítulos, números e
  encerramento), no bloco "Isto é Policoating" da página inicial.
- `assets/video/processo-policoating.webm`: vídeo do processo (aplicação, cura, qualidade, acabamentos), na página Pintura a pó. Toca sozinho, sem som, quando aparece na tela.

Os dois foram montados a partir das imagens de `assets/img/marca/`. Para usar um vídeo próprio, substitua o arquivo
mantendo o mesmo nome (formato `.webm`), ou liste um `.mp4`/YouTube em `videos` no `midia.js`.
Slides, faixa de imagens e vídeos têm botão de pausar. Quem desliga as animações do sistema continua vendo
slides e vídeos, mas sem os efeitos de zoom e de profundidade.

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

## Próximos passos (pendências importantes)

1. **Envio de e-mails em grande volume.** O e-mail padrão do Supabase manda poucos códigos por hora; com muitos
   acessos, clientes ficariam sem receber o código. Antes de divulgar o site, configurar um provedor de e-mail
   profissional (Resend, Brevo ou Amazon SES) em **Authentication → Emails → SMTP Settings**, com remetente do
   domínio da empresa (ex.: `nao-responda@policoating.com.br`) e registros SPF/DKIM no domínio, e aumentar o
   limite em **Authentication → Rate Limits**.
2. **Parte fiscal (NF-e).** O estoque já guarda o número do documento em cada movimentação e liga a saída ao
   pedido. O próximo passo é emitir a NF-e por um serviço autorizado (ex.: Focus NFe, eNotas, PlugNotas ou o ERP
   da empresa), com certificado digital A1 da empresa e os dados fiscais dos produtos (NCM, CFOP, CST/CSOSN) e do
   cliente (já validados no cadastro). A emissão precisa rodar no servidor (função do Supabase), nunca no navegador.
3. **Pagamento e frete pelo site.** Hoje são combinados no chat do pedido. Depois: pagamento online (Pix, cartão,
   boleto por um intermediador como Mercado Pago, Pagar.me ou Asaas) e cálculo de frete real por transportadora,
   substituindo a simulação de prazo por região.
4. **Chat em tempo real e avisos por e-mail/WhatsApp.** O chat atualiza a cada poucos segundos com a janela aberta;
   para avisar o cliente e o vendedor fora do site (nova mensagem, pedido enviado), ligar notificações por e-mail
   (depende do item 1) e, se quiser, Supabase Realtime.

## Rodar localmente

Basta abrir `index.html` no navegador, ou servir a pasta:

```bash
python3 -m http.server 8000
# acesse http://localhost:8000
```

## Publicar

Por ser estático, pode ser hospedado gratuitamente no **GitHub Pages** (Settings → Pages → branch),
Netlify, Vercel ou qualquer hospedagem comum.
