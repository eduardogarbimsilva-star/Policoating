-- E14 — simulação de reversão: desfaz a PARTE AA (instruções "Desfazer" do setup.sql), confere e reaplica.
-- Uso (banco de teste com o setup.sql completo): psql -f testes/sql/reversao.sql ; depois rode a PARTE AA de novo.
\pset tuples_only on
\echo '--- antes: visitante não consulta direto; tabela de consultas existe'
select 'anon executa consultar_cotacao: ' || has_function_privilege('anon', 'public.consultar_cotacao(text)', 'execute');
select 'tabela cotacoes_consultas: ' || (to_regclass('public.cotacoes_consultas') is not null);
\echo '--- desfaz a PARTE AA'
grant execute on function public.consultar_cotacao(text) to anon, authenticated;
drop function public.saude_sistema();
drop table public.cotacoes_consultas;
\echo '--- depois: volta ao estado da PARTE Z'
select 'anon executa consultar_cotacao: ' || has_function_privilege('anon', 'public.consultar_cotacao(text)', 'execute');
select 'tabela cotacoes_consultas: ' || (to_regclass('public.cotacoes_consultas') is not null);
select 'saude_sistema existe: ' || (to_regprocedure('public.saude_sistema()') is not null);
\echo '--- desfaz e refaz os recursos das PARTES W, X e Y (só o "implementado")'
update public.recursos set implementado = false where chave in ('merchant_center_feed_enabled', 'packaging_variants_enabled', 'product_docs_enabled', 'new_home_banners_enabled');
select 'prontos depois de desfazer: ' || count(*) from public.recursos where implementado and chave in ('merchant_center_feed_enabled', 'packaging_variants_enabled', 'product_docs_enabled', 'new_home_banners_enabled');
