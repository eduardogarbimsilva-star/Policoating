\set ON_ERROR_STOP 0
\pset tuples_only on
create or replace function public.eh_equipe() returns boolean language sql stable security definer set search_path = public
as $$ select public.dois_fatores_ok() and exists (select 1 from public.admins where lower(email) = lower(auth.jwt() ->> 'email')) $$;
grant select on public.frete_config, public.frete_estimativas to anon, authenticated;
grant update on public.frete_config to anon, authenticated;

\echo '--- T1 tarifas padrão: local 500 / raio 10 km / R$ 3 por km / mínimo 500; sem coordenadas'
select 'local=' || tarifa_local || ' raio=' || raio_local_m || ' km=' || tarifa_km || ' minimo=' || minimo_externo || ' lat=' || coalesce(origem_lat::text, 'vazio') from public.frete_config;

\echo '--- T2 visitante não vê o endereço nem altera'
set role anon;
select 'anon vê ' || count(*) || ' linha(s)' from public.frete_config;
select public.salvar_frete_config('{"tarifa_local": 1}');
reset role;

\echo '--- T3 vendedor vê, mas não altera'
set role authenticated;
select set_config('teste.jwt', '{"email":"vend@policoatingtintas.com.br","aal":"aal2"}', false);
select 'vendedor vê ' || count(*) || ' linha(s)' from public.frete_config;
select public.salvar_frete_config('{"tarifa_local": 1}');

\echo '--- T4 frete não liga sem a saída localizada'
select set_config('teste.jwt', '{"sub":"00000000-0000-0000-0000-000000000001","email":"dono@policoatingtintas.com.br","aal":"aal2"}', false);
select public.alterar_recurso('freight_estimate_enabled', true, null, 'teste');

\echo '--- T5 admin salva endereço e coordenadas; versão sobe; histórico grava'
select 'versao=' || versao || ' cidade=' || origem_cidade || ' lat=' || origem_lat from public.salvar_frete_config('{"origem_cep":"15990000","origem_logradouro":"Rua Teste","origem_numero":"1","origem_cidade":"Matão","origem_uf":"sp","origem_lat":-21.6,"origem_lng":-48.36,"origem_rotulo":"Rua Teste, Matão","motivo":"configuração inicial"}');
select 'histórico: ' || chave || ' motivo=' || motivo from public.recursos_auditoria where chave = 'frete_config' order by id desc limit 1;

\echo '--- T6 validações: CEP inválido, só latitude, coordenada fora do Brasil, tarifa negativa'
select public.salvar_frete_config('{"origem_cep":"123"}');
select public.salvar_frete_config('{"origem_lat":-21}');
select public.salvar_frete_config('{"origem_lat":40,"origem_lng":10}');
select public.salvar_frete_config('{"tarifa_km":-1}');

\echo '--- T7 com a saída localizada, o frete liga'
select 'ligado=' || ligado from public.alterar_recurso('freight_estimate_enabled', true, null, 'teste');
select 'disponível: ' || public.recurso_disponivel('freight_estimate_enabled', 'pol-0001', 'poliester');
reset role;
