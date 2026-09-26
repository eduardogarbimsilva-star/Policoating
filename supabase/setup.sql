-- =========================================================
-- Policoating — estrutura do banco (Supabase)
-- Cole este script em: Supabase > SQL Editor > New query > Run
-- Cada cliente só consegue ler e alterar os PRÓPRIOS dados (RLS).
-- =========================================================

-- Cadastro do cliente (pessoa física ou empresa)
create table if not exists public.clientes (
  id                    uuid primary key references auth.users(id) on delete cascade,
  email                 text not null,
  tipo                  text not null check (tipo in ('pf', 'pj')),
  -- Pessoa física
  nome                  text,
  cpf                   text,
  -- Empresa
  razao_social          text,
  nome_fantasia         text,
  cnpj                  text,
  inscricao_estadual    text,
  responsavel           text,
  -- Contato e entrega
  telefone              text,
  cep                   text,
  logradouro            text,
  numero                text,
  complemento           text,
  bairro                text,
  cidade                text,
  uf                    text,
  aceite_privacidade_em timestamptz,
  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz not null default now()
);

alter table public.clientes enable row level security;

drop policy if exists "cliente le o proprio cadastro" on public.clientes;
create policy "cliente le o proprio cadastro" on public.clientes
  for select to authenticated using (auth.uid() = id);

drop policy if exists "cliente cria o proprio cadastro" on public.clientes;
create policy "cliente cria o proprio cadastro" on public.clientes
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "cliente atualiza o proprio cadastro" on public.clientes;
create policy "cliente atualiza o proprio cadastro" on public.clientes
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Pedidos enviados pelo WhatsApp (histórico do cliente)
create table if not exists public.pedidos (
  id          bigint generated always as identity primary key,
  numero      text not null unique,
  cliente_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  itens       jsonb not null,
  observacoes text,
  criado_em   timestamptz not null default now()
);

create index if not exists pedidos_cliente_idx on public.pedidos (cliente_id, criado_em desc);

alter table public.pedidos enable row level security;

drop policy if exists "cliente le os proprios pedidos" on public.pedidos;
create policy "cliente le os proprios pedidos" on public.pedidos
  for select to authenticated using (auth.uid() = cliente_id);

drop policy if exists "cliente registra os proprios pedidos" on public.pedidos;
create policy "cliente registra os proprios pedidos" on public.pedidos
  for insert to authenticated with check (auth.uid() = cliente_id);

-- Permissões para usuários logados (o site usa a chave pública "anon")
grant select, insert, update on public.clientes to authenticated;
grant select, insert on public.pedidos to authenticated;

-- ===========================================================
-- PARTE C — Newsletter (rode depois das partes A e B)
-- Qualquer visitante pode se cadastrar; ninguém consegue ler a lista pelo site.
-- Para ver os e-mails: Supabase → Table Editor → newsletter.
-- ===========================================================
create table if not exists public.newsletter (
  email     text primary key check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  criado_em timestamptz not null default now()
);

alter table public.newsletter enable row level security;

drop policy if exists "visitante se cadastra na newsletter" on public.newsletter;
create policy "visitante se cadastra na newsletter" on public.newsletter
  for insert to anon, authenticated with check (true);

grant insert on public.newsletter to anon, authenticated;

-- ===========================================================
-- PARTE D — Painel da empresa (cadastro de produtos)
-- 1) Rode este bloco inteiro.
-- 2) Troque o e-mail no final pelo e-mail da empresa e rode só aquela linha.
--    Para liberar mais pessoas, rode a mesma linha com outros e-mails.
-- ===========================================================

-- Quem pode editar o catálogo (a lista não é lida pelo site)
create table if not exists public.admins (
  email text primary key
);
alter table public.admins enable row level security;

create or replace function public.eh_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where lower(email) = lower(auth.jwt() ->> 'email'));
$$;
revoke all on function public.eh_admin() from public;
grant execute on function public.eh_admin() to anon, authenticated;

-- Produtos do catálogo (cada produto é guardado inteiro em "dados")
create table if not exists public.produtos (
  id            text primary key check (id ~ '^[a-z0-9-]{2,60}$'),
  dados         jsonb not null,
  ativo         boolean not null default true,
  ordem         integer not null default 0,
  atualizado_em timestamptz not null default now()
);
alter table public.produtos enable row level security;

drop policy if exists "todos veem produtos ativos" on public.produtos;
create policy "todos veem produtos ativos" on public.produtos
  for select to anon, authenticated using (ativo or public.eh_admin());

drop policy if exists "admin cadastra produtos" on public.produtos;
create policy "admin cadastra produtos" on public.produtos
  for insert to authenticated with check (public.eh_admin());

drop policy if exists "admin edita produtos" on public.produtos;
create policy "admin edita produtos" on public.produtos
  for update to authenticated using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "admin exclui produtos" on public.produtos;
create policy "admin exclui produtos" on public.produtos
  for delete to authenticated using (public.eh_admin());

grant select on public.produtos to anon, authenticated;
grant insert, update, delete on public.produtos to authenticated;

-- Fotos dos produtos (pasta pública "produtos"; só administradores enviam)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('produtos', 'produtos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "admin envia fotos de produtos" on storage.objects;
create policy "admin envia fotos de produtos" on storage.objects
  for insert to authenticated with check (bucket_id = 'produtos' and public.eh_admin());

drop policy if exists "admin troca fotos de produtos" on storage.objects;
create policy "admin troca fotos de produtos" on storage.objects
  for update to authenticated using (bucket_id = 'produtos' and public.eh_admin());

drop policy if exists "admin apaga fotos de produtos" on storage.objects;
create policy "admin apaga fotos de produtos" on storage.objects
  for delete to authenticated using (bucket_id = 'produtos' and public.eh_admin());

-- >>> TROQUE PELO E-MAIL DA EMPRESA E RODE ESTA LINHA <<<
-- insert into public.admins (email) values ('email-da-empresa@exemplo.com') on conflict do nothing;

-- ===========================================================
-- PARTE E — Painel: contatos, links, galeria e equipe
-- (rode depois da PARTE D)
-- ===========================================================

-- Configurações do site (uma linha só): WhatsApp, telefone, e-mail, redes, lojas, galeria
create table if not exists public.configuracoes (
  id            integer primary key default 1 check (id = 1),
  dados         jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);
alter table public.configuracoes enable row level security;

drop policy if exists "todos leem configuracoes" on public.configuracoes;
create policy "todos leem configuracoes" on public.configuracoes
  for select to anon, authenticated using (true);

drop policy if exists "admin cria configuracoes" on public.configuracoes;
create policy "admin cria configuracoes" on public.configuracoes
  for insert to authenticated with check (public.eh_admin());

drop policy if exists "admin edita configuracoes" on public.configuracoes;
create policy "admin edita configuracoes" on public.configuracoes
  for update to authenticated using (public.eh_admin()) with check (public.eh_admin());

grant select on public.configuracoes to anon, authenticated;
grant insert, update on public.configuracoes to authenticated;

-- Equipe: administradores podem ver, adicionar e remover outros administradores
drop policy if exists "admin ve equipe" on public.admins;
create policy "admin ve equipe" on public.admins
  for select to authenticated using (public.eh_admin());

drop policy if exists "admin adiciona equipe" on public.admins;
create policy "admin adiciona equipe" on public.admins
  for insert to authenticated with check (public.eh_admin());

drop policy if exists "admin remove equipe" on public.admins;
create policy "admin remove equipe" on public.admins
  for delete to authenticated using (public.eh_admin() and lower(email) <> lower(auth.jwt() ->> 'email'));

grant select, insert, delete on public.admins to authenticated;

-- A pasta de arquivos passa a aceitar PDF (fichas técnicas), até 10 MB
update storage.buckets
   set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
       file_size_limit = 10485760
 where id = 'produtos';

-- ===========================================================
-- PARTE F — Equipe com cargos (Administrador / Vendedor) e busca de pedidos
-- (rode depois das PARTES D e E; pode rodar de novo sem problema)
--   Administrador: tudo no painel.
--   Vendedor: só vê e busca os pedidos feitos pelo site.
-- ===========================================================

-- Cargo de cada pessoa da equipe (quem já estava cadastrado vira Administrador)
alter table public.admins add column if not exists papel text not null default 'admin';
alter table public.admins drop constraint if exists admins_papel_valido;
alter table public.admins add constraint admins_papel_valido check (papel in ('admin', 'vendedor'));

-- Administrador = cargo "admin"
create or replace function public.eh_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.admins where lower(email) = lower(auth.jwt() ->> 'email') and papel = 'admin');
$$;

-- Equipe = administradores e vendedores
create or replace function public.eh_equipe()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.admins where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

-- Cargo de quem está logado (o site usa para mostrar o painel certo)
create or replace function public.meu_papel()
returns text language sql stable security definer set search_path = public
as $$
  select papel from public.admins where lower(email) = lower(auth.jwt() ->> 'email') limit 1;
$$;

revoke all on function public.eh_equipe() from public;
revoke all on function public.meu_papel() from public;
grant execute on function public.eh_admin(), public.eh_equipe(), public.meu_papel() to anon, authenticated;

-- Administradores mudam o cargo dos outros (não o próprio, para ninguém se trancar fora)
drop policy if exists "admin muda cargo" on public.admins;
create policy "admin muda cargo" on public.admins
  for update to authenticated
  using (public.eh_admin() and lower(email) <> lower(auth.jwt() ->> 'email'))
  with check (public.eh_admin());
grant update (email, papel) on public.admins to authenticated;

-- Pedidos e clientes: toda a equipe pode ver e buscar (ninguém altera pedidos pelo site)
drop policy if exists "admin ve pedidos" on public.pedidos;
drop policy if exists "equipe ve pedidos" on public.pedidos;
create policy "equipe ve pedidos" on public.pedidos
  for select to authenticated using (public.eh_equipe());

drop policy if exists "admin ve clientes" on public.clientes;
drop policy if exists "equipe ve clientes" on public.clientes;
create policy "equipe ve clientes" on public.clientes
  for select to authenticated using (public.eh_equipe());

-- Sem status de pedido (nada é pago ou enviado pelo site): remove o que a versão anterior criou
drop policy if exists "admin atualiza pedidos" on public.pedidos;
alter table public.pedidos drop column if exists status;

-- ===========================================================
-- PARTE G — Permissão para excluir pedidos
-- (rode depois da PARTE F; pode rodar de novo sem problema)
--   Administradores sempre podem excluir.
--   Vendedores só quando um administrador marcar "Pode excluir pedidos" na aba Equipe.
-- ===========================================================

alter table public.admins add column if not exists pode_excluir boolean not null default false;

create or replace function public.pode_excluir_pedidos()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.admins
                 where lower(email) = lower(auth.jwt() ->> 'email') and (papel = 'admin' or pode_excluir));
$$;

revoke all on function public.pode_excluir_pedidos() from public;
grant execute on function public.pode_excluir_pedidos() to anon, authenticated;

-- só administradores dão ou tiram a permissão (política "admin muda cargo" da PARTE F)
grant update (pode_excluir) on public.admins to authenticated;

drop policy if exists "equipe exclui pedidos" on public.pedidos;
create policy "equipe exclui pedidos" on public.pedidos
  for delete to authenticated using (public.pode_excluir_pedidos());
grant delete on public.pedidos to authenticated;

-- ===========================================================
-- PARTE H — Validações e dados únicos (rode depois das outras; pode rodar de novo)
--   • Um CPF, um CNPJ e um e-mail por conta (nada de cadastro repetido)
--   • O banco confere CPF/CNPJ, nome, telefone, CEP e estado, mesmo que alguém tente burlar o site
--   • O e-mail do cadastro é sempre o e-mail do login (ninguém usa o e-mail de outra pessoa)
--   • Pedidos com tamanho limitado e data/hora definidas pelo servidor
-- Cadastros antigos que já estão no banco não são bloqueados; as regras valem para os novos e para cada alteração.
-- Se aparecer erro de "duplicate key" ao rodar, já existem cadastros repetidos: veja-os com a consulta
-- do fim desta parte, resolva (apague ou corrija um deles) e rode de novo.
-- ===========================================================

create or replace function public.so_digitos(t text)
returns text language sql immutable as $$ select regexp_replace(coalesce(t, ''), '\D', '', 'g') $$;

create or replace function public.cpf_valido(t text)
returns boolean language plpgsql immutable as $$
declare c text := public.so_digitos(t); s int; d int; i int; k int;
begin
  if length(c) <> 11 or c ~ '^(\d)\1{10}$' then return false; end if;
  for k in 9..10 loop
    s := 0;
    for i in 1..k loop s := s + substr(c, i, 1)::int * (k + 2 - i); end loop;
    d := (s * 10) % 11 % 10;
    if d <> substr(c, k + 1, 1)::int then return false; end if;
  end loop;
  return true;
end $$;

create or replace function public.cnpj_valido(t text)
returns boolean language plpgsql immutable as $$
declare c text := public.so_digitos(t); s int; r int; i int; k int; p int;
begin
  if length(c) <> 14 or c ~ '^(\d)\1{13}$' then return false; end if;
  for k in 12..13 loop
    s := 0; p := k - 7;
    for i in 1..k loop
      s := s + substr(c, i, 1)::int * p; p := p - 1; if p < 2 then p := 9; end if;
    end loop;
    r := s % 11;
    if (case when r < 2 then 0 else 11 - r end) <> substr(c, k + 1, 1)::int then return false; end if;
  end loop;
  return true;
end $$;

-- Um cadastro por e-mail, por CPF e por CNPJ
create unique index if not exists clientes_email_unico on public.clientes (lower(email));
create unique index if not exists clientes_cpf_unico  on public.clientes (public.so_digitos(cpf))  where coalesce(cpf, '')  <> '';
create unique index if not exists clientes_cnpj_unico on public.clientes (public.so_digitos(cnpj)) where coalesce(cnpj, '') <> '';

-- Regras do cadastro (NOT VALID = não trava os cadastros antigos)
alter table public.clientes drop constraint if exists clientes_documento_valido;
alter table public.clientes add constraint clientes_documento_valido check (
  (tipo = 'pf' and public.cpf_valido(cpf) and length(btrim(nome)) between 5 and 100 and nome !~ '[0-9<>{}@]')
  or
  (tipo = 'pj' and public.cnpj_valido(cnpj) and length(btrim(razao_social)) between 2 and 150
               and length(btrim(responsavel)) between 5 and 100 and responsavel !~ '[0-9<>{}@]')
) not valid;

alter table public.clientes drop constraint if exists clientes_contato_valido;
alter table public.clientes add constraint clientes_contato_valido check (
  length(public.so_digitos(telefone)) between 10 and 11
  and length(public.so_digitos(cep)) = 8
  and uf in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')
  and length(btrim(logradouro)) between 2 and 150
  and length(btrim(numero)) between 1 and 20
  and length(btrim(cidade)) between 2 and 80
  and coalesce(length(complemento), 0) <= 80
  and coalesce(length(bairro), 0) <= 80
  and coalesce(length(nome_fantasia), 0) <= 150
  and (coalesce(inscricao_estadual, '') = '' or inscricao_estadual = 'ISENTO' or inscricao_estadual ~ '^\d{2,14}$')
) not valid;

-- O e-mail do cadastro é sempre o do login; datas definidas pelo servidor
create or replace function public.clientes_antes_de_gravar()
returns trigger language plpgsql as $$
begin
  new.email := lower(coalesce(auth.jwt() ->> 'email', new.email));
  new.atualizado_em := now();
  if tg_op = 'INSERT' then new.criado_em := now(); else new.criado_em := old.criado_em; end if;
  -- quem já aceitou a política não "des-aceita" por engano
  if tg_op = 'UPDATE' and old.aceite_privacidade_em is not null then new.aceite_privacidade_em := old.aceite_privacidade_em; end if;
  return new;
end $$;
drop trigger if exists clientes_antes_de_gravar on public.clientes;
create trigger clientes_antes_de_gravar before insert or update on public.clientes
  for each row execute function public.clientes_antes_de_gravar();

-- Pedidos: código no formato do site, de 1 a 100 itens, observação até 1000 caracteres
alter table public.pedidos drop constraint if exists pedidos_validos;
alter table public.pedidos add constraint pedidos_validos check (
  numero ~ '^PC-\d{6}-[A-Z0-9]{2,10}$'
  and jsonb_typeof(itens) = 'array'
  and jsonb_array_length(itens) between 1 and 100
  and octet_length(itens::text) <= 40000
  and coalesce(length(observacoes), 0) <= 1000
) not valid;

create or replace function public.pedidos_antes_de_gravar()
returns trigger language plpgsql as $$
begin
  new.criado_em := now();
  return new;
end $$;
drop trigger if exists pedidos_antes_de_gravar on public.pedidos;
create trigger pedidos_antes_de_gravar before insert on public.pedidos
  for each row execute function public.pedidos_antes_de_gravar();

-- "Criar conta" com um e-mail que já tem cadastro: o site avisa e entra em vez de criar outra
create or replace function public.email_ja_cadastrado(e text)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.clientes where lower(email) = lower(btrim(e))) $$;
revoke all on function public.email_ja_cadastrado(text) from public;
grant execute on function public.email_ja_cadastrado(text) to anon, authenticated;

-- Consulta para achar cadastros repetidos (se o índice acima der erro):
-- select 'CPF' as tipo, public.so_digitos(cpf) as doc, array_agg(email) from public.clientes where coalesce(cpf,'')<>'' group by 2 having count(*) > 1
-- union all
-- select 'CNPJ', public.so_digitos(cnpj), array_agg(email) from public.clientes where coalesce(cnpj,'')<>'' group by 2 having count(*) > 1;

-- ===========================================================
-- PARTE I — Permissão para exportar a planilha de clientes
-- (rode depois das PARTES F e G; pode rodar de novo sem problema)
--   Administradores sempre podem exportar.
--   Vendedores só quando um administrador marcar "Pode exportar clientes" na aba Equipe.
-- (A aba Clientes usa a permissão de leitura da PARTE F: toda a equipe vê os cadastros.)
-- ===========================================================

alter table public.admins add column if not exists pode_exportar boolean not null default false;

create or replace function public.pode_exportar_clientes()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.admins
                 where lower(email) = lower(auth.jwt() ->> 'email') and (papel = 'admin' or pode_exportar));
$$;

revoke all on function public.pode_exportar_clientes() from public;
grant execute on function public.pode_exportar_clientes() to anon, authenticated;

grant update (pode_exportar) on public.admins to authenticated;
