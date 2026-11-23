-- Imitação mínima do Supabase para testar a PARTE R
create role anon nologin; create role authenticated nologin;
create schema auth;
create or replace function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('teste.jwt', true), ''), '{}')::jsonb $$;
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;
create table public.admins (email text primary key, papel text not null default 'admin');
insert into public.admins values ('dono@policoatingtintas.com.br', 'admin'), ('vend@policoatingtintas.com.br', 'vendedor');
create or replace function public.dois_fatores_ok() returns boolean language sql stable as $$ select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2' $$;
create or replace function public.eh_admin() returns boolean language sql stable security definer set search_path = public
as $$ select public.dois_fatores_ok() and exists (select 1 from public.admins where lower(email) = lower(auth.jwt() ->> 'email') and papel = 'admin') $$;
