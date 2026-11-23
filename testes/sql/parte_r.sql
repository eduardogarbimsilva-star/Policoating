\set ON_ERROR_STOP 0
\pset tuples_only on
grant select on public.recursos to anon, authenticated;
grant select on public.recursos_auditoria to authenticated;
grant insert, update, delete on public.recursos to anon, authenticated;  -- como no Supabase: as permissões vêm de grants amplos + RLS

\echo '--- R1 recursos criados, todos desligados (exceto aprovação manual)'
select count(*) || ' recursos; ligados: ' || string_agg(chave, ',') filter (where ligado) from public.recursos;

\echo '--- R2 visitante (anon) lê, mas não altera direto'
set role anon;
select 'anon lê ' || count(*) from public.recursos;
update public.recursos set ligado = true where chave = 'floating_social_enabled';
select 'depois do update anon: ligado=' || ligado from public.recursos where chave = 'floating_social_enabled';
select public.alterar_recurso('floating_social_enabled', true, null, 'x');
reset role;

\echo '--- R3 vendedor e admin sem 2 etapas são recusados'
set role authenticated;
select set_config('teste.jwt', '{"sub":"00000000-0000-0000-0000-000000000002","email":"vend@policoatingtintas.com.br","aal":"aal2"}', false);
select public.alterar_recurso('floating_social_enabled', true, null, 'x');
select set_config('teste.jwt', '{"sub":"00000000-0000-0000-0000-000000000001","email":"dono@policoatingtintas.com.br","aal":"aal1"}', false);
select public.alterar_recurso('floating_social_enabled', true, null, 'x');

\echo '--- R4 admin com 2 etapas: recurso ainda não implementado é bloqueado pelo requisito'
select set_config('teste.jwt', '{"sub":"00000000-0000-0000-0000-000000000001","email":"dono@policoatingtintas.com.br","aal":"aal2"}', false);
select public.alterar_recurso('direct_checkout_enabled', true, null, 'teste');
reset role;

\echo '--- R5 recurso implementado: admin liga, com exceções e motivo; auditoria registrada'
update public.recursos set implementado = true where chave = 'b2b_quote_enabled';
set role authenticated;
select set_config('teste.jwt', '{"sub":"00000000-0000-0000-0000-000000000001","email":"dono@policoatingtintas.com.br","aal":"aal2"}', false);
select 'ligado=' || ligado || ' por ' || atualizado_por from public.alterar_recurso('b2b_quote_enabled', true, '{"padrao":"escolhidos","categorias":{"texturizada":true},"produtos":{"pol-0019":true,"pol-0005":false}}', 'Teste da cotação');
select 'auditoria: ' || chave || ' ' || (antigo->>'ligado') || '->' || (novo->>'ligado') || ' motivo=' || motivo || ' por ' || ator_email from public.recursos_auditoria order by id desc limit 1;

\echo '--- R6 exceções em formato inválido são recusadas'
select public.alterar_recurso('b2b_quote_enabled', true, '{"padrao":"alguns"}', null);
select public.alterar_recurso('b2b_quote_enabled', true, '{"produtos":{"POL 1":true}}', null);
select public.alterar_recurso('b2b_quote_enabled', true, '{"produtos":{"pol-0001":"sim"}}', null);
reset role;

\echo '--- R7 regra de disponibilidade (padrão escolhidos; classe texturizada ligada; pol-0019 ligado; pol-0005 desligado)'
select 'pol-0019 poliester: ' || public.recurso_disponivel('b2b_quote_enabled', 'pol-0019', 'poliester');   -- produto marcado: true
select 'pol-0002 poliester: ' || public.recurso_disponivel('b2b_quote_enabled', 'pol-0002', 'poliester');   -- não escolhido: false
select 'pol-0007 texturizada: ' || public.recurso_disponivel('b2b_quote_enabled', 'pol-0007', 'texturizada'); -- classe ligada: true
select 'pol-0005 texturizada: ' || public.recurso_disponivel('b2b_quote_enabled', 'pol-0005', 'texturizada'); -- produto desligado vence a classe: false
select 'recurso desconhecido: ' || public.recurso_disponivel('nao_existe', 'x', 'y');
select 'mestre desligado (redes): ' || public.recurso_disponivel('floating_social_enabled', null, null);

\echo '--- R8 auditoria: vendedor não lê'
set role authenticated;
select set_config('teste.jwt', '{"email":"vend@policoatingtintas.com.br","aal":"aal2"}', false);
select 'vendedor vê ' || count(*) || ' linhas de auditoria' from public.recursos_auditoria;
select set_config('teste.jwt', '{"email":"dono@policoatingtintas.com.br","aal":"aal2"}', false);
select 'admin vê ' || count(*) || ' linhas de auditoria' from public.recursos_auditoria;
reset role;

\echo '--- R9 rodar a PARTE R de novo não apaga nada'
