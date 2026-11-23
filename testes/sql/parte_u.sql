-- Testes da PARTE U (cotações com código). Rode depois de imitacao_supabase.sql e das PARTES R a U.
\set ON_ERROR_STOP 0
\pset tuples_only on
grant select on public.cotacoes, public.cotacoes_eventos to anon, authenticated;
grant insert, update, delete on public.cotacoes to anon, authenticated;

-- duas cotações (como a função "frete" grava, com a chave de servidor)
insert into public.cotacoes (protocolo, cliente_id, nome, documento, telefone, cep, cidade, uf, descricao, itens)
values ('COT-AAAA-BBBB-CC', '00000000-0000-0000-0000-0000000000c1', 'Cliente Um', '52998224725', '16999990000', '14801000', 'Araraquara', 'SP',
        'Pintura de 200 portões de aço, cor branca.', '[{"id":"pol-0001","qtd":4}]'),
       ('COT-DDDD-EEEE-FF', '00000000-0000-0000-0000-0000000000c2', 'Cliente Dois', '11222333000181', '1633330000', '15990000', 'Matão', 'SP',
        'Repintura de estrutura metálica de galpão.', '[{"id":"pol-0002","qtd":1}]');

\echo '--- U1 vale exatamente 168 horas'
select 'horas=' || extract(epoch from expira_em - emitida_em) / 3600 from public.cotacoes where protocolo = 'COT-AAAA-BBBB-CC';

\echo '--- U2 código fora do formato é recusado'
insert into public.cotacoes (protocolo, nome, documento, telefone, cep, cidade, uf, descricao, itens)
values ('cot-1', 'X Y Z', '52998224725', '16999990000', '14801000', 'A', 'SP', 'descrição com mais de vinte letras', '[{}]');

\echo '--- U3 visitante não lista cotações; consulta só pelo código, sem CPF/telefone'
set role anon;
select 'anon lista ' || count(*) from public.cotacoes;
select 'consulta: ' || protocolo || ' ' || status || ' ' || cidade from public.consultar_cotacao(' cot-aaaa-bbbb-cc ');
select 'código errado: ' || count(*) from public.consultar_cotacao('COT-AAAA-BBBB-CX');
reset role;

\echo '--- U4 cliente logado vê só as suas'
set role authenticated;
select set_config('teste.jwt', '{"sub":"00000000-0000-0000-0000-0000000000c1","email":"um@cliente.com","aal":"aal1"}', false);
select 'cliente um vê ' || count(*) || ': ' || string_agg(protocolo, ',') from public.cotacoes;

\echo '--- U5 cliente não responde cotação nem grava direto'
select public.atualizar_cotacao((select id from public.cotacoes limit 1), 'aprovada', 'eu mesmo', 1);
update public.cotacoes set status = 'aprovada';
select 'status continua: ' || status from public.cotacoes where protocolo = 'COT-AAAA-BBBB-CC';

\echo '--- U6 vendedor (2 etapas) vê todas e responde; vira evento'
select set_config('teste.jwt', '{"email":"vend@policoatingtintas.com.br","aal":"aal2"}', false);
select 'equipe vê ' || count(*) from public.cotacoes;
select 'respondida: ' || status || ' ' || valor_proposta from public.atualizar_cotacao((select id from public.cotacoes where protocolo = 'COT-AAAA-BBBB-CC'), 'proposta_enviada', 'Proposta: 100 kg a R$ 25/kg + frete.', 3000);
select 'eventos: ' || count(*) || ' ' || max(de) || '→' || max(para) from public.cotacoes_eventos;
select public.atualizar_cotacao((select id from public.cotacoes where protocolo = 'COT-AAAA-BBBB-CC'), 'inventado');

\echo '--- U7 vendedor sem 2 etapas não vê'
select set_config('teste.jwt', '{"email":"vend@policoatingtintas.com.br","aal":"aal1"}', false);
select 'sem 2 etapas vê ' || count(*) from public.cotacoes;
reset role;

\echo '--- U8 vencida some para todos e a limpeza apaga (com os eventos)'
update public.cotacoes set emitida_em = now() - interval '169 hours', expira_em = now() - interval '1 hour' where protocolo = 'COT-AAAA-BBBB-CC';
set role anon;
select 'consulta vencida: ' || count(*) from public.consultar_cotacao('COT-AAAA-BBBB-CC');
reset role;
select 'apagadas=' || public.limpar_cotacoes_expiradas();
select 'restam ' || count(*) || ' cotação(ões) e ' || (select count(*) from public.cotacoes_eventos) || ' evento(s)' from public.cotacoes;
select 'registro da limpeza: ' || apagadas from public.cotacoes_limpezas;

\echo '--- U9 visitante não roda a limpeza'
set role anon;
select public.limpar_cotacoes_expiradas();
reset role;

\echo '--- U10 cotação no site pode ser ligada (etapa pronta)'
select chave || ' implementado=' || implementado from public.recursos where chave in ('b2b_quote_enabled', 'b2b_whatsapp_shortcut_enabled', 'manual_quote_approval') order by chave;
