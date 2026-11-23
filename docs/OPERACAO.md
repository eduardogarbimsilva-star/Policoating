# Policoating — Manual de operação (V3.1)

Site estático no GitHub Pages (branch `claude/paint-company-website-3qbk8u` = produção) + Supabase
(banco, login e funções). Este documento é o relatório final das etapas E00–E14 (menos a E09,
compra direta, que fica por último).

## 1. O que existe e onde liga

Tudo o que é novo começa **desligado** e é ligado em **Painel → Comércio e Recursos** (só administrador
com as 2 etapas; cada mudança fica no histórico, com quem, quando e o motivo).

| Recurso | Etapa | O que faz |
|---|---|---|
| Bolinhas flutuantes das redes | E10 | Atalhos das redes sociais na lateral |
| Medir cliques nas redes | E10 | Conta os cliques (respeita o aviso de cookies) |
| Convite para instalar o app | E11 | App instalável pelo navegador (PWA) |
| Estimativa de frete por CEP | E05 | Frete na hora, saindo de Matão-SP (rota de caminhão) |
| Cotação no site | E06–E08 | Página Cotação, número COT-XXXX-XXXX-XX válido por 7 dias |
| Atalho da cotação pelo WhatsApp | E06 | Botão para mandar o número ao vendedor |
| Aprovação manual das cotações | E08 | (ligado) toda proposta passa pela equipe |
| Variações de embalagem e peso | E04 | Preço por kg próprio da caixa de 5 kg |
| Documentos técnicos | E04 | Ficha técnica e FDS em PDF na página do produto |
| Feed do Google Merchant Center | E02 | Feed de produtos para o Google Shopping — **só ligar com a E09 pronta** |
| Novos banners da página inicial | E12 | "Novidades no site" — só anuncia o que estiver ligado |
| Compra direta (Pix/cartão) | E09 | **Pendente** (Mercado Pago, última etapa) |

Outras configurações:
- **Painel → Cotações → Configurar formulário**: cada campo da cotação obrigatório/opcional/oculto,
  produto opcional, veículos com peso máximo (e volume máximo opcional, ex.: Montana até 750 kg; acima,
  caminhão — botão "Usar modelo Montana / Caminhão"), peso máximo por cotação, volumetria
  (oculta/opcional/obrigatória, fator de cubagem padrão 300 kg/m³), intervalo entre cotações do mesmo
  cliente (padrão 2 min, com contagem regressiva) e quantas cotações ficam na lista do cliente (padrão 10;
  as mais antigas saem, e o cliente pode excluir as dele — a equipe continua vendo).
- **Painel → Comércio e Recursos → Frete**: endereço de saída (fica só no servidor), tarifas e prazo estimado.

## 2. Banco (Supabase → SQL Editor)

Rodar **na ordem**, cada parte uma vez (todas podem ser rodadas de novo sem quebrar):
R → S → T → U → V → W → X → Y → Z → AA → AB. Cada parte tem, no começo, o que faz e como **desfazer**.

- A PARTE AA exige a função `frete` nova publicada **antes** (a consulta pelo número passa por ela).
- A PARTE AB (cliente excluir/aparar a própria lista) vem depois da AA e da função `frete` atualizada.
- A limpeza das cotações vencidas usa a extensão **pg_cron** (Database → Extensions).

Testado num Postgres local: o `setup.sql` inteiro roda duas vezes seguidas sem erro; todas as 21 tabelas
têm RLS; toda função com privilégio tem `search_path` fixo; o visitante só grava na newsletter.

## 3. Funções (Supabase → Edge Functions; "Verify JWT" desligado nas duas)

| Função | Arquivo | Para quê | Secrets |
|---|---|---|---|
| `frete` | `supabase/functions/frete/index.ts` | frete, cotação, consulta pelo número | `ORS_API_KEY` |
| `catalogo-google` | `supabase/functions/catalogo-google/index.ts` | feed do Merchant Center + diagnóstico | — |

Limites por IP: 30 fretes/10 min, 6 cotações/hora, 60 consultas e 15 números errados/10 min.
Nenhum registro guarda IP aberto, nome ou CPF (só hash do IP e contagens).

## 4. Publicar, conferir e desfazer

- **Publicar**: todo push na branch de produção vai ao ar em ~1 minuto (GitHub Pages).
- **Conferir depois de publicar**: `node testes/producao.mjs` (só leitura: versão no ar, páginas sem
  erro, funções respondendo, recursos ligados, produto com dados do Google).
- **Desfazer código**: `git revert <commit>` e push (volta em ~1 minuto). Para desligar algo na hora,
  basta o recurso em Comércio e Recursos — o código continua lá, sem efeito.
- **Desfazer banco**: as linhas "Desfazer" de cada parte. Ensaiado com a PARTE AA (desfeita e
  reaplicada, `testes/sql/reversao.sql`).

## 5. Backup

- Supabase → **Database → Backups** (os planos pagos guardam cópias diárias).
- Cópia manual (qualquer plano): Settings → Database → *Connection string* e, num computador com
  PostgreSQL: `pg_dump "<connection string>" -Fc -f policoating-AAAA-MM-DD.dump`.
- Restaurar num projeto novo/teste: `pg_restore -d "<connection string>" policoating-AAAA-MM-DD.dump`.
- Ensaio feito localmente: cópia e restauração conferiram tabelas, funções, políticas, recursos e dados.
- Recomendação: cópia manual mensal e antes de cada parte nova do SQL.

## 6. Monitoramento

- **Painel → Cotações → Saúde do sistema**: cotações válidas e a vencer, cotações e fretes em 24 h,
  fretes sem cálculo automático, consultas e números errados, situação da limpeza de 168 h — com alertas
  (limpeza parada, cotações vencidas não apagadas, muitas tentativas de número, serviço de rotas falhando).
- **Supabase → Edge Functions → Logs** e **Database → Cron Jobs** (execuções da limpeza).
- **Lighthouse** (Chrome → Inspecionar → Lighthouse) depois de mudanças grandes de layout.

## 7. Testes automáticos (`testes/`)

`fumaca`, `e01`, `e02`, `e03`, `e05`, `e06_e08`, `e10_e11`, `e12`, `cotacao_config`, `e13_e14`
(navegador, modo demonstração) · `frete`, `catalogo_google` (funções, sem internet) ·
`testes/sql/*.sql` (banco) · `producao` (site no ar, só leitura). Ver `testes/README.md`.

## 8. Pendências e responsáveis

| Pendência | Responsável |
|---|---|
| E09 — compra direta com Mercado Pago (Pix/cartão), webhook assinado, pedido "pago" no painel | Claude, com a conta Mercado Pago da empresa (dono) |
| Preço de todos os produtos (hoje 2 de 22) — necessário para o Google Shopping | Dono |
| PDFs da ficha técnica e da FDS de cada produto | Dono |
| Cadastro no Google Merchant Center (site verificado, frete, devolução) e ligar o feed depois da E09 | Dono (com ajuda) |
| Revisar a página de Trocas e devoluções com contador/advogado | Dono |
| Confirmar se a foto do banner com "PoliCoating" na máquina é real (senão, legenda "ilustrativa") | Dono |
| GitHub Pages não permite cabeçalhos de segurança (CSP/HSTS próprios); avaliar Cloudflare na frente do site | Dono (opcional) |
| `email_ja_cadastrado` diz se um e-mail tem conta (usado no login); risco baixo, aceito | — |
