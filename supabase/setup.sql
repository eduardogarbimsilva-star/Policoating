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
-- (a situação do pedido voltou na PARTE L; não apague a coluna status ao rodar esta parte de novo)

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

-- ===========================================================
-- PARTE J — Estoque (rode depois das PARTES F e G; pode rodar de novo sem problema)
--   • Saldo por produto e cor, em kg, calculado pelo histórico de movimentações
--   • Movimentações: entrada (produção/compra), saída (venda) e ajuste (inventário)
--     Nada é apagado nem editado: correções entram como ajuste (histórico confiável, pronto para a parte fiscal)
--   • Baixa de pedido: uma por produto e cor em cada pedido (não deixa dar baixa duas vezes)
--   • Saídas não deixam o saldo ficar negativo
--   • Toda a equipe vê; movimenta quem é administrador ou tem "Pode movimentar estoque"
--   • Visitantes só sabem se a cor está em "pronta entrega" (nunca a quantidade)
-- ===========================================================

-- Confere se as partes anteriores já foram rodadas (senão para aqui, com o aviso do que falta)
do $$ begin
  if to_regprocedure('public.eh_equipe()') is null then raise exception 'Rode antes a PARTE F (cargos da equipe).'; end if;
  if to_regclass('public.pedidos') is null then raise exception 'Rode antes a primeira parte do setup.sql (clientes e pedidos).'; end if;
end $$;

alter table public.admins add column if not exists pode_estoque boolean not null default false;
grant update (pode_estoque) on public.admins to authenticated;

create or replace function public.pode_mexer_estoque()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.admins
                 where lower(email) = lower(auth.jwt() ->> 'email') and (papel = 'admin' or pode_estoque));
$$;
revoke all on function public.pode_mexer_estoque() from public;
grant execute on function public.pode_mexer_estoque() to anon, authenticated;

create table if not exists public.estoque_movimentos (
  id            bigint generated always as identity primary key,
  produto_id    text not null check (produto_id ~ '^[a-z0-9-]{2,60}$'),
  cor           text not null check (length(btrim(cor)) between 1 and 80),
  tipo          text not null check (tipo in ('entrada', 'saida', 'ajuste')),
  kg            numeric(12, 2) not null check (kg <> 0 and abs(kg) <= 1000000),
  pedido_numero text check (pedido_numero ~ '^PC-\d{6}-[A-Z0-9]{2,10}$'),
  documento     text check (length(documento) <= 60),          -- ex.: número da NF de compra ou de venda
  obs           text check (length(obs) <= 300),
  feito_por     text,
  criado_em     timestamptz not null default now(),
  constraint estoque_kg_positivo check (tipo = 'ajuste' or kg > 0)
);
create index if not exists estoque_mov_item_idx on public.estoque_movimentos (produto_id, cor, criado_em desc);
create unique index if not exists estoque_baixa_unica on public.estoque_movimentos (pedido_numero, produto_id, cor)
  where tipo = 'saida' and pedido_numero is not null;

create table if not exists public.estoque_minimos (
  produto_id text not null,
  cor        text not null,
  minimo_kg  numeric(12, 2) not null default 0 check (minimo_kg >= 0 and minimo_kg <= 1000000),
  primary key (produto_id, cor)
);

create or replace view public.estoque_saldos with (security_invoker = true) as
  select produto_id, cor,
         sum(case when tipo = 'saida' then -kg else kg end) as saldo_kg,
         max(criado_em) as ultima_movimentacao
  from public.estoque_movimentos
  group by produto_id, cor;

-- Quem fez e quando: definido pelo servidor. Saída/ajuste negativo não pode deixar o saldo abaixo de zero.
create or replace function public.estoque_antes_de_gravar()
returns trigger language plpgsql as $$
declare saldo numeric;
begin
  new.feito_por := lower(auth.jwt() ->> 'email');
  new.criado_em := now();
  new.cor := btrim(new.cor);
  if new.tipo = 'saida' or new.kg < 0 then
    perform pg_advisory_xact_lock(hashtext(new.produto_id || '|' || new.cor));
    select coalesce(sum(case when tipo = 'saida' then -kg else kg end), 0) into saldo
      from public.estoque_movimentos where produto_id = new.produto_id and cor = new.cor;
    if saldo - (case when new.tipo = 'saida' then new.kg else -new.kg end) < 0 then
      raise exception 'Estoque insuficiente: saldo de % kg', saldo using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists estoque_antes_de_gravar on public.estoque_movimentos;
create trigger estoque_antes_de_gravar before insert on public.estoque_movimentos
  for each row execute function public.estoque_antes_de_gravar();

alter table public.estoque_movimentos enable row level security;
alter table public.estoque_minimos enable row level security;

drop policy if exists "equipe ve estoque" on public.estoque_movimentos;
create policy "equipe ve estoque" on public.estoque_movimentos
  for select to authenticated using (public.eh_equipe());
drop policy if exists "equipe movimenta estoque" on public.estoque_movimentos;
create policy "equipe movimenta estoque" on public.estoque_movimentos
  for insert to authenticated with check (public.pode_mexer_estoque());

drop policy if exists "equipe ve minimos" on public.estoque_minimos;
create policy "equipe ve minimos" on public.estoque_minimos
  for select to authenticated using (public.eh_equipe());
drop policy if exists "equipe define minimos" on public.estoque_minimos;
create policy "equipe define minimos" on public.estoque_minimos
  for insert to authenticated with check (public.pode_mexer_estoque());
drop policy if exists "equipe altera minimos" on public.estoque_minimos;
create policy "equipe altera minimos" on public.estoque_minimos
  for update to authenticated using (public.pode_mexer_estoque()) with check (public.pode_mexer_estoque());

grant select, insert on public.estoque_movimentos to authenticated;
grant select, insert, update on public.estoque_minimos to authenticated;
grant select on public.estoque_saldos to authenticated;

-- Para o site: só diz se a cor tem estoque (pronta entrega), sem mostrar quantidades
create or replace function public.estoque_disponivel()
returns table (produto_id text, cor text, disponivel boolean)
language sql stable security definer set search_path = public
as $$
  select produto_id, cor, sum(case when tipo = 'saida' then -kg else kg end) > 0
  from public.estoque_movimentos group by produto_id, cor;
$$;
revoke all on function public.estoque_disponivel() from public;
grant execute on function public.estoque_disponivel() to anon, authenticated;

-- ===========================================================
-- PARTE K — Produto por cor, estoque no site e Vendas
-- (rode depois da PARTE J; pode rodar de novo sem problema)
--   • O site mostra a quantidade em estoque e só deixa pedir até o saldo
--   • O banco recusa pedidos acima do estoque (quando o estoque está em uso)
--   • Produtos: um código único por produto, uma cor, descrição obrigatória
--   • Vendas: o vendedor confirma a venda de um pedido (com os valores fechados);
--     a baixa no estoque é feita junto. Só o administrador cancela (o estoque volta).
--     Vendedor vê as próprias vendas; administrador vê todas.
-- ===========================================================

-- Confere se as partes anteriores já foram rodadas (senão para aqui, com o aviso do que falta)
do $$ begin
  if to_regclass('public.estoque_movimentos') is null then raise exception 'Rode antes a PARTE J (estoque).'; end if;
  if to_regclass('public.produtos') is null then raise exception 'Rode antes a PARTE D (produtos).'; end if;
end $$;

-- Estoque para o site: saldo em kg por produto (visitantes podem ver)
create or replace function public.estoque_publico()
returns table (produto_id text, saldo_kg numeric)
language sql stable security definer set search_path = public
as $$
  select produto_id, greatest(sum(case when tipo = 'saida' then -kg else kg end), 0)
  from public.estoque_movimentos group by produto_id;
$$;
revoke all on function public.estoque_publico() from public;
grant execute on function public.estoque_publico() to anon, authenticated;

-- Produtos novos e alterados: código = id, uma cor, descrição (NOT VALID = não trava os antigos até serem convertidos)
alter table public.produtos drop constraint if exists produtos_formato;
alter table public.produtos add constraint produtos_formato check (
  id ~ '^[a-z0-9][a-z0-9-]{1,29}$'
  and id = lower(dados ->> 'codigo')
  and jsonb_typeof(dados -> 'cores') = 'array' and jsonb_array_length(dados -> 'cores') = 1
  and length(btrim(coalesce(dados ->> 'descricao', ''))) >= 10
) not valid;

-- Quilos de um item do pedido ("Sob medida" = kg; caixa = quantidade × kg da caixa)
create or replace function public.kg_do_item(it jsonb)
returns numeric language sql immutable as $$
  select case when it ->> 'embalagem' = 'Sob medida' then coalesce((it ->> 'qtd')::numeric, 0)
         else coalesce((it ->> 'qtd')::numeric, 0)
              * coalesce(replace(substring(it ->> 'embalagem' from '(\d+(?:[.,]\d+)?)\s*kg'), ',', '.')::numeric, 0) end
$$;

-- Pedido acima do estoque é recusado (só quando o estoque já está em uso)
create or replace function public.pedidos_conferir_estoque()
returns trigger language plpgsql security definer set search_path = public as $$
declare r record; saldo numeric;
begin
  if not exists (select 1 from public.estoque_movimentos) then return new; end if;
  for r in select it ->> 'id' as produto_id, max(it ->> 'nome') as nome, sum(public.kg_do_item(it)) as kg
           from jsonb_array_elements(new.itens) it group by it ->> 'id' loop
    select coalesce(sum(case when tipo = 'saida' then -kg else kg end), 0) into saldo
      from public.estoque_movimentos where produto_id = r.produto_id;
    if r.kg > saldo then
      raise exception 'Estoque insuficiente para %: disponível % kg', coalesce(r.nome, r.produto_id), greatest(saldo, 0) using errcode = 'P0001';
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists pedidos_conferir_estoque on public.pedidos;
create trigger pedidos_conferir_estoque before insert on public.pedidos
  for each row execute function public.pedidos_conferir_estoque();

-- Vendas
create table if not exists public.vendas (
  id                  bigint generated always as identity primary key,
  pedido_numero       text not null unique,
  cliente_id          uuid,
  cliente_nome        text,
  itens               jsonb not null,
  total               numeric(14, 2) not null,
  total_kg            numeric(12, 2) not null,
  vendedor            text not null,
  obs                 text,
  status              text not null default 'confirmada' check (status in ('confirmada', 'cancelada')),
  cancelada_em        timestamptz,
  cancelada_por       text,
  motivo_cancelamento text,
  criado_em           timestamptz not null default now()
);
create index if not exists vendas_data_idx on public.vendas (criado_em desc);
create index if not exists vendas_vendedor_idx on public.vendas (lower(vendedor), criado_em desc);

alter table public.vendas enable row level security;
drop policy if exists "vendedor ve as proprias vendas" on public.vendas;
create policy "vendedor ve as proprias vendas" on public.vendas
  for select to authenticated
  using (public.eh_admin() or (public.eh_equipe() and lower(vendedor) = lower(auth.jwt() ->> 'email')));
grant select on public.vendas to authenticated;   -- gravar só pelas funções abaixo

-- Confirmar venda: registra os valores fechados e dá baixa no estoque (tudo junto)
-- p_itens: [{ "produto_id", "codigo", "nome", "cor", "kg", "preco_kg" }]
create or replace function public.confirmar_venda(p_pedido text, p_itens jsonb, p_obs text default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(auth.jwt() ->> 'email');
  v_ped public.pedidos; v_nome text; v_id bigint; it jsonb;
  v_kg numeric; v_preco numeric; v_total numeric := 0; v_total_kg numeric := 0; v_itens jsonb := '[]'::jsonb;
  v_estoque boolean := exists (select 1 from public.estoque_movimentos);
begin
  if not public.eh_equipe() then raise exception 'Sem permissão para registrar vendas.' using errcode = '42501'; end if;
  select * into v_ped from public.pedidos where numero = p_pedido;
  if not found then raise exception 'Pedido % não encontrado.', p_pedido; end if;
  if exists (select 1 from public.vendas where pedido_numero = p_pedido) then
    raise exception 'Este pedido já tem uma venda registrada.' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) not between 1 and 100 then
    raise exception 'Informe os itens da venda.';
  end if;
  for it in select * from jsonb_array_elements(p_itens) loop
    v_kg := round((it ->> 'kg')::numeric, 2); v_preco := round(coalesce((it ->> 'preco_kg')::numeric, 0), 2);
    if v_kg is null or v_kg <= 0 or v_kg > 1000000 or v_preco < 0 or v_preco > 100000 then
      raise exception 'Quantidade ou preço inválido em %.', coalesce(it ->> 'nome', it ->> 'produto_id');
    end if;
    if v_estoque and not exists (select 1 from public.estoque_movimentos
        where tipo = 'saida' and pedido_numero = p_pedido and produto_id = it ->> 'produto_id' and cor = btrim(it ->> 'cor')) then
      insert into public.estoque_movimentos (produto_id, cor, tipo, kg, pedido_numero, obs)
      values (it ->> 'produto_id', it ->> 'cor', 'saida', v_kg, p_pedido, 'Venda confirmada');
    end if;
    v_itens := v_itens || jsonb_build_object('produto_id', it ->> 'produto_id', 'codigo', left(it ->> 'codigo', 30),
      'nome', left(it ->> 'nome', 150), 'cor', left(it ->> 'cor', 80), 'kg', v_kg, 'preco_kg', v_preco, 'subtotal', round(v_kg * v_preco, 2));
    v_total := v_total + round(v_kg * v_preco, 2); v_total_kg := v_total_kg + v_kg;
  end loop;
  select coalesce(case when tipo = 'pj' then coalesce(nullif(nome_fantasia, ''), razao_social) else nome end, email)
    into v_nome from public.clientes where id = v_ped.cliente_id;
  insert into public.vendas (pedido_numero, cliente_id, cliente_nome, itens, total, total_kg, vendedor, obs)
  values (p_pedido, v_ped.cliente_id, v_nome, v_itens, v_total, v_total_kg, v_email, left(nullif(btrim(p_obs), ''), 300))
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.confirmar_venda(text, jsonb, text) from public;
grant execute on function public.confirmar_venda(text, jsonb, text) to authenticated;

-- Cancelar venda (só administrador): o estoque baixado volta como entrada
create or replace function public.cancelar_venda(p_id bigint, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
declare v public.vendas; m record;
begin
  if not public.eh_admin() then raise exception 'Só o administrador cancela vendas.' using errcode = '42501'; end if;
  select * into v from public.vendas where id = p_id for update;
  if not found or v.status <> 'confirmada' then raise exception 'Venda não encontrada ou já cancelada.'; end if;
  if length(btrim(coalesce(p_motivo, ''))) < 3 then raise exception 'Informe o motivo do cancelamento.'; end if;
  for m in select produto_id, cor, kg from public.estoque_movimentos where tipo = 'saida' and pedido_numero = v.pedido_numero loop
    insert into public.estoque_movimentos (produto_id, cor, tipo, kg, pedido_numero, obs)
    values (m.produto_id, m.cor, 'entrada', m.kg, v.pedido_numero, 'Estorno: venda cancelada');
  end loop;
  update public.vendas set status = 'cancelada', cancelada_em = now(), cancelada_por = lower(auth.jwt() ->> 'email'),
    motivo_cancelamento = left(btrim(p_motivo), 300) where id = p_id;
end $$;
revoke all on function public.cancelar_venda(bigint, text) from public;
grant execute on function public.cancelar_venda(bigint, text) to authenticated;

-- ===========================================================
-- PARTE L — Loja: compra pelo site, prazos, vendas (estilo Mercado Livre), chat e pós-venda
-- (rode depois da PARTE K; pode rodar de novo sem problema)
--   • A compra é registrada pelo banco (criar_pedido): ele confere preço, estoque e endereço,
--     reserva o estoque e calcula o prazo de envio/entrega a partir de Matão-SP (simulação por região).
--   • Situações do pedido: recebido → confirmado → enviado → entregue (ou cancelado / reembolsado).
--   • Chat do pedido entre cliente e equipe; o cliente pode pedir cancelamento, reembolso/devolução
--     ou ajuda do atendimento. A equipe responde pelo painel.
--   • Vendedores também podem aplicar e remover promoções.
-- ===========================================================

-- Confere se as partes anteriores necessárias já foram rodadas (o estoque, PARTES J e K, é opcional)
do $$ begin
  if to_regprocedure('public.eh_equipe()') is null then raise exception 'Rode antes a PARTE F (cargos da equipe).'; end if;
  if to_regclass('public.produtos') is null then raise exception 'Rode antes a PARTE D (produtos).'; end if;
end $$;

-- Prazos (simulação a partir de Matão-SP). Mesma tabela do assets/js/loja.js
create or replace function public.prazo_regiao(p_uf text, p_cep text)
returns table (regiao text, dias_min int, dias_max int) language sql immutable as $$
  with x as (select upper(coalesce(p_uf, '')) as uf,
                    coalesce(nullif(left(regexp_replace(coalesce(p_cep, ''), '\D', '', 'g'), 5), ''), '0')::int as n)
  select * from (
    select case
      when uf = 'SP' and n between 13000 and 16999 then 'Região de Matão (centro do interior de SP)'
      when uf = 'SP' then 'Estado de São Paulo'
      when uf in ('MG','RJ','ES','PR') then 'Sudeste e Paraná'
      when uf in ('SC','RS','GO','DF','MS') then 'Sul e Centro-Oeste'
      when uf in ('MT','TO','BA','SE') then 'Centro-Oeste e Bahia'
      when uf in ('AL','PE','PB','RN','CE','PI','MA') then 'Nordeste'
      when uf in ('PA','AP','AM','RR','AC','RO') then 'Norte' end,
    case when uf = 'SP' and n between 13000 and 16999 then 1 when uf = 'SP' then 2 when uf in ('MG','RJ','ES','PR') then 3
      when uf in ('SC','RS','GO','DF','MS') then 4 when uf in ('MT','TO','BA','SE') then 6
      when uf in ('AL','PE','PB','RN','CE','PI','MA') then 7 when uf in ('PA','AP','AM','RR','AC','RO') then 9 end,
    case when uf = 'SP' and n between 13000 and 16999 then 2 when uf = 'SP' then 3 when uf in ('MG','RJ','ES','PR') then 5
      when uf in ('SC','RS','GO','DF','MS') then 7 when uf in ('MT','TO','BA','SE') then 9
      when uf in ('AL','PE','PB','RN','CE','PI','MA') then 11 when uf in ('PA','AP','AM','RR','AC','RO') then 15 end
    from x) r(regiao, dias_min, dias_max) where regiao is not null;
$$;

create or replace function public.somar_dias_uteis(p_data date, p_dias int)
returns date language plpgsql immutable as $$
declare d date := p_data; n int := p_dias;
begin
  while n > 0 loop d := d + 1; if extract(isodow from d) < 6 then n := n - 1; end if; end loop;
  return d;
end $$;

-- Dia do envio: hoje se for dia útil antes das 14h (horário de Brasília); senão, o próximo dia útil
create or replace function public.dia_de_envio(p_quando timestamptz default now())
returns date language sql stable as $$
  select case when extract(isodow from l) < 6 and extract(hour from l) < 14 then l::date
              else public.somar_dias_uteis(l::date, 1) end
  from (select p_quando at time zone 'America/Sao_Paulo' as l) t;
$$;

-- Colunas do pedido (situação, valores, destino, prazos, envio, chat)
alter table public.pedidos add column if not exists status text not null default 'recebido';
alter table public.pedidos drop constraint if exists pedidos_status_valido;
alter table public.pedidos add constraint pedidos_status_valido
  check (status in ('recebido', 'confirmado', 'enviado', 'entregue', 'cancelado', 'reembolsado'));
alter table public.pedidos add column if not exists total numeric(14, 2);
alter table public.pedidos add column if not exists total_kg numeric(12, 2);
alter table public.pedidos add column if not exists tem_combinar boolean not null default false;
alter table public.pedidos add column if not exists destino_uf text;
alter table public.pedidos add column if not exists destino_cep text;
alter table public.pedidos add column if not exists destino_cidade text;
alter table public.pedidos add column if not exists previsao_envio date;
alter table public.pedidos add column if not exists previsao_entrega_min date;
alter table public.pedidos add column if not exists previsao_entrega_max date;
alter table public.pedidos add column if not exists vendedor text;
alter table public.pedidos add column if not exists transportadora text;
alter table public.pedidos add column if not exists rastreio text;
alter table public.pedidos add column if not exists confirmado_em timestamptz;
alter table public.pedidos add column if not exists enviado_em timestamptz;
alter table public.pedidos add column if not exists entregue_em timestamptz;
alter table public.pedidos add column if not exists cancelado_em timestamptz;
alter table public.pedidos add column if not exists cancelado_por text;
alter table public.pedidos add column if not exists motivo_cancelamento text;
alter table public.pedidos add column if not exists reembolsado_em timestamptz;
alter table public.pedidos add column if not exists msg_ultima_em timestamptz;
alter table public.pedidos add column if not exists ultima_msg_lado text;
alter table public.pedidos add column if not exists msg_lida_cliente_em timestamptz;
alter table public.pedidos add column if not exists msg_lida_equipe_em timestamptz;
create index if not exists pedidos_status_idx on public.pedidos (status, previsao_envio);

-- A compra só entra pelo criar_pedido (o cliente não grava pedido direto)
drop policy if exists "cliente registra os proprios pedidos" on public.pedidos;
revoke insert, update on public.pedidos from authenticated;

-- Chat e solicitações
create table if not exists public.pedido_mensagens (
  id            bigint generated always as identity primary key,
  pedido_numero text not null references public.pedidos (numero) on delete cascade,
  lado          text not null check (lado in ('cliente', 'vendedor', 'atendimento', 'sistema')),
  autor         text,
  texto         text not null check (length(texto) between 1 and 1000),
  criado_em     timestamptz not null default now()
);
create index if not exists pedido_mensagens_idx on public.pedido_mensagens (pedido_numero, criado_em);

create table if not exists public.pedido_solicitacoes (
  id            bigint generated always as identity primary key,
  pedido_numero text not null references public.pedidos (numero) on delete cascade,
  tipo          text not null check (tipo in ('cancelamento', 'reembolso', 'atendimento')),
  motivo        text not null check (length(motivo) between 3 and 500),
  status        text not null default 'aberta' check (status in ('aberta', 'aceita', 'recusada')),
  resposta      text check (length(resposta) <= 500),
  criado_em     timestamptz not null default now(),
  resolvido_em  timestamptz,
  resolvido_por text
);
create index if not exists pedido_solicitacoes_idx on public.pedido_solicitacoes (pedido_numero);

alter table public.pedido_mensagens enable row level security;
alter table public.pedido_solicitacoes enable row level security;
drop policy if exists "cliente e equipe leem mensagens" on public.pedido_mensagens;
create policy "cliente e equipe leem mensagens" on public.pedido_mensagens for select to authenticated
  using (public.eh_equipe() or exists (select 1 from public.pedidos p where p.numero = pedido_numero and p.cliente_id = auth.uid()));
drop policy if exists "cliente e equipe leem solicitacoes" on public.pedido_solicitacoes;
create policy "cliente e equipe leem solicitacoes" on public.pedido_solicitacoes for select to authenticated
  using (public.eh_equipe() or exists (select 1 from public.pedidos p where p.numero = pedido_numero and p.cliente_id = auth.uid()));
grant select on public.pedido_mensagens, public.pedido_solicitacoes to authenticated;   -- gravar só pelas funções

-- Funções internas (não liberadas para o site)
create or replace function public._msg_sistema(p_pedido text, p_texto text)
returns void language sql security definer set search_path = public as $$
  insert into public.pedido_mensagens (pedido_numero, lado, autor, texto) values (p_pedido, 'sistema', 'sistema', left(p_texto, 1000));
  update public.pedidos set msg_ultima_em = now(), ultima_msg_lado = 'sistema' where numero = p_pedido;
$$;
-- Devolve ao estoque o que ainda não voltou deste pedido (pode chamar mais de uma vez)
create or replace function public._estornar(p_pedido text, p_obs text)
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if to_regclass('public.estoque_movimentos') is null then return; end if;   -- estoque (PARTE J) ainda não ativado
  for r in select produto_id, cor, sum(case when tipo = 'saida' then kg else -kg end) as falta
           from public.estoque_movimentos where pedido_numero = p_pedido and tipo in ('saida', 'entrada')
           group by produto_id, cor having sum(case when tipo = 'saida' then kg else -kg end) > 0 loop
    insert into public.estoque_movimentos (produto_id, cor, tipo, kg, pedido_numero, obs)
    values (r.produto_id, r.cor, 'entrada', r.falta, p_pedido, left(p_obs, 300));
  end loop;
end $$;
revoke all on function public._msg_sistema(text, text) from public, anon, authenticated;
revoke all on function public._estornar(text, text) from public, anon, authenticated;

-- Compra: [{ "id", "embalagem", "qtd" }] -> número do pedido
create or replace function public.criar_pedido(p_itens jsonb, p_obs text default null)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_cli public.clientes; v_prod public.produtos; it jsonb; d jsonb;
  v_emb text; v_qtd int; v_kg numeric; v_preco numeric; v_promo numeric; v_efetivo numeric;
  v_itens jsonb := '[]'; v_total numeric := 0; v_total_kg numeric := 0; v_combinar boolean := false;
  v_numero text; v_prazo record; v_envio date; v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_estoque boolean := false; r record; v_saldo numeric;
begin
  -- o estoque só é conferido e reservado se as PARTES J e K já foram rodadas e o estoque está em uso
  if to_regclass('public.estoque_movimentos') is not null then
    v_estoque := exists (select 1 from public.estoque_movimentos);
  end if;
  if v_uid is null then raise exception 'Entre na sua conta para comprar.'; end if;
  select * into v_cli from public.clientes where id = v_uid;
  if not found or coalesce(v_cli.cep, '') = '' or coalesce(v_cli.uf, '') = '' then
    raise exception 'Complete o seu cadastro (endereço de entrega) antes de comprar.';
  end if;
  select * into v_prazo from public.prazo_regiao(v_cli.uf, v_cli.cep);
  if not found then raise exception 'Não atendemos este endereço pelo site. Fale com a gente.'; end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) not between 1 and 50 then raise exception 'Carrinho inválido.'; end if;

  for it in select * from jsonb_array_elements(p_itens) loop
    select * into v_prod from public.produtos where id = it ->> 'id' and ativo;
    if not found then raise exception 'Um dos produtos não está mais disponível. Atualize o carrinho.'; end if;
    d := v_prod.dados; v_emb := it ->> 'embalagem'; v_qtd := (it ->> 'qtd')::int;
    if v_emb <> 'Sob medida' and not (d -> 'embalagens') ? v_emb then raise exception 'Embalagem inválida para %.', d ->> 'nome'; end if;
    if v_qtd is null or v_qtd < 1 or (v_emb <> 'Sob medida' and v_qtd > 2000) or v_qtd > 50000 then raise exception 'Quantidade inválida para %.', d ->> 'nome'; end if;
    v_kg := case when v_emb = 'Sob medida' then v_qtd
            else v_qtd * coalesce(replace(substring(v_emb from '(\d+(?:[.,]\d+)?)\s*kg'), ',', '.')::numeric, 0) end;
    if v_kg <= 0 then raise exception 'Quantidade inválida para %.', d ->> 'nome'; end if;
    v_preco := nullif(d ->> 'preco', '')::numeric; v_promo := nullif(d ->> 'precoPromo', '')::numeric;
    if coalesce((d ->> 'precoCombinar')::boolean, false) or coalesce(v_preco, 0) <= 0 then v_efetivo := null;
    elsif v_promo > 0 and v_promo < v_preco and (d ->> 'promoAte' is null or v_hoje <= (d ->> 'promoAte')::date) then v_efetivo := v_promo;
    else v_efetivo := v_preco; end if;
    if v_efetivo is null then v_combinar := true; else v_total := v_total + round(v_efetivo * v_kg, 2); end if;
    v_total_kg := v_total_kg + v_kg;
    v_itens := v_itens || jsonb_build_object('id', v_prod.id, 'codigo', d ->> 'codigo', 'nome', d ->> 'nome', 'cor', d -> 'cores' -> 0 ->> 'nome',
      'embalagem', v_emb, 'qtd', v_qtd, 'kg', v_kg, 'preco_kg', v_efetivo, 'subtotal', case when v_efetivo is null then null else round(v_efetivo * v_kg, 2) end,
      'foto', coalesce(d -> 'fotos' ->> 0, d -> 'cores' -> 0 ->> 'foto'));
  end loop;

  -- estoque (quando em uso): confere e reserva, com trava por produto
  if v_estoque then
    for r in select e ->> 'id' as id, max(e ->> 'cor') as cor, max(e ->> 'nome') as nome, sum((e ->> 'kg')::numeric) as kg
             from jsonb_array_elements(v_itens) e group by e ->> 'id' order by 1 loop
      perform pg_advisory_xact_lock(hashtext(r.id || '|' || r.cor));
      select coalesce(sum(case when tipo = 'saida' then -kg else kg end), 0) into v_saldo from public.estoque_movimentos where produto_id = r.id;
      if r.kg > v_saldo then raise exception 'Estoque insuficiente para %: disponível % kg.', r.nome, greatest(v_saldo, 0); end if;
    end loop;
  end if;

  loop
    v_numero := 'PC-' || to_char(now() at time zone 'America/Sao_Paulo', 'YYMMDD') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 5));
    exit when not exists (select 1 from public.pedidos where numero = v_numero);
  end loop;
  v_envio := public.dia_de_envio(now());
  insert into public.pedidos (numero, cliente_id, itens, observacoes, status, total, total_kg, tem_combinar,
    destino_uf, destino_cep, destino_cidade, previsao_envio, previsao_entrega_min, previsao_entrega_max)
  values (v_numero, v_uid, v_itens, left(nullif(btrim(p_obs), ''), 500), 'recebido', v_total, v_total_kg, v_combinar,
    v_cli.uf, v_cli.cep, v_cli.cidade, v_envio, public.somar_dias_uteis(v_envio, v_prazo.dias_min), public.somar_dias_uteis(v_envio, v_prazo.dias_max));

  if v_estoque then
    insert into public.estoque_movimentos (produto_id, cor, tipo, kg, pedido_numero, obs)
    select e ->> 'id', max(e ->> 'cor'), 'saida', sum((e ->> 'kg')::numeric), v_numero, 'Reserva da compra'
    from jsonb_array_elements(v_itens) e group by e ->> 'id';
  end if;
  perform public._msg_sistema(v_numero, 'Pedido recebido. Envio previsto: ' || to_char(v_envio, 'DD/MM') ||
    '. Entrega estimada entre ' || to_char(public.somar_dias_uteis(v_envio, v_prazo.dias_min), 'DD/MM') || ' e ' ||
    to_char(public.somar_dias_uteis(v_envio, v_prazo.dias_max), 'DD/MM') || '.');
  return v_numero;
end $$;
revoke all on function public.criar_pedido(jsonb, text) from public;
grant execute on function public.criar_pedido(jsonb, text) to authenticated;

-- Chat
create or replace function public.enviar_mensagem(p_pedido text, p_texto text)
returns void language plpgsql security definer set search_path = public as $$
declare v public.pedidos; v_dono boolean; v_equipe boolean := public.eh_equipe(); v_lado text; v_email text := lower(auth.jwt() ->> 'email');
begin
  select * into v from public.pedidos where numero = p_pedido;
  if not found then raise exception 'Pedido não encontrado.'; end if;
  v_dono := coalesce(v.cliente_id = auth.uid(), false);
  if not v_dono and not v_equipe then raise exception 'Sem acesso a este pedido.'; end if;
  p_texto := btrim(regexp_replace(coalesce(p_texto, ''), '[ \t]+', ' ', 'g'));
  if length(p_texto) = 0 or length(p_texto) > 1000 then raise exception 'Mensagem vazia ou longa demais (máx. 1000 caracteres).'; end if;
  if (select count(*) from public.pedido_mensagens where autor = v_email and criado_em > now() - interval '1 minute') >= 15 then
    raise exception 'Muitas mensagens seguidas. Aguarde um minuto.';
  end if;
  v_lado := case when v_equipe and not v_dono then (case when public.eh_admin() then 'atendimento' else 'vendedor' end) else 'cliente' end;
  insert into public.pedido_mensagens (pedido_numero, lado, autor, texto) values (p_pedido, v_lado, v_email, p_texto);
  update public.pedidos set msg_ultima_em = now(), ultima_msg_lado = v_lado,
    msg_lida_cliente_em = case when v_lado = 'cliente' then now() else msg_lida_cliente_em end,
    msg_lida_equipe_em = case when v_lado <> 'cliente' then now() else msg_lida_equipe_em end
  where numero = p_pedido;
end $$;
revoke all on function public.enviar_mensagem(text, text) from public;
grant execute on function public.enviar_mensagem(text, text) to authenticated;

create or replace function public.marcar_lido(p_pedido text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.pedidos set msg_lida_cliente_em = now() where numero = p_pedido and cliente_id = auth.uid();
  if not found and public.eh_equipe() then update public.pedidos set msg_lida_equipe_em = now() where numero = p_pedido; end if;
end $$;
revoke all on function public.marcar_lido(text) from public;
grant execute on function public.marcar_lido(text) to authenticated;

-- Cliente: cancelamento, reembolso/devolução ou atendimento. Retorna a situação do pedido.
create or replace function public.abrir_solicitacao(p_pedido text, p_tipo text, p_motivo text)
returns text language plpgsql security definer set search_path = public as $$
declare v public.pedidos; v_rotulo text;
begin
  select * into v from public.pedidos where numero = p_pedido and cliente_id = auth.uid() for update;
  if not found then raise exception 'Pedido não encontrado.'; end if;
  p_motivo := left(btrim(coalesce(p_motivo, '')), 500);
  if length(p_motivo) < 3 then raise exception 'Conte o motivo em poucas palavras.'; end if;
  if p_tipo not in ('cancelamento', 'reembolso', 'atendimento') then raise exception 'Tipo de solicitação inválido.'; end if;
  if exists (select 1 from public.pedido_solicitacoes where pedido_numero = p_pedido and tipo = p_tipo and status = 'aberta') then
    raise exception 'Já existe uma solicitação dessas em andamento.';
  end if;
  v_rotulo := case p_tipo when 'cancelamento' then 'Cancelamento' when 'reembolso' then 'Reembolso / devolução' else 'Ajuda do atendimento' end;
  if p_tipo = 'cancelamento' then
    if v.status in ('enviado', 'entregue') then raise exception 'O pedido já foi enviado: peça devolução/reembolso.'; end if;
    if v.status in ('cancelado', 'reembolsado') then raise exception 'Este pedido já está encerrado.'; end if;
    if v.status = 'recebido' then   -- ainda não confirmado: cancela na hora
      update public.pedidos set status = 'cancelado', cancelado_em = now(), cancelado_por = 'cliente', motivo_cancelamento = p_motivo where numero = p_pedido;
      perform public._estornar(p_pedido, 'Estorno: compra cancelada pelo cliente');
      insert into public.pedido_solicitacoes (pedido_numero, tipo, motivo, status, resposta, resolvido_em)
      values (p_pedido, p_tipo, p_motivo, 'aceita', 'Cancelado automaticamente (pedido ainda não confirmado).', now());
      perform public._msg_sistema(p_pedido, 'Pedido cancelado pelo cliente. Motivo: ' || p_motivo);
      return 'cancelado';
    end if;
  end if;
  if p_tipo = 'reembolso' and v.status not in ('confirmado', 'enviado', 'entregue') then
    raise exception 'Reembolso/devolução é para pedidos em preparação, a caminho ou entregues.';
  end if;
  insert into public.pedido_solicitacoes (pedido_numero, tipo, motivo) values (p_pedido, p_tipo, p_motivo);
  perform public._msg_sistema(p_pedido, 'Cliente abriu uma solicitação: ' || v_rotulo || '. Motivo: ' || p_motivo);
  return v.status;
end $$;
revoke all on function public.abrir_solicitacao(text, text, text) from public;
grant execute on function public.abrir_solicitacao(text, text, text) to authenticated;

-- Equipe: confirmar | enviar | entregar | cancelar | responder
create or replace function public.acao_pedido(p_pedido text, p_acao text, p_dados jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v public.pedidos; v_email text := lower(auth.jwt() ->> 'email'); v_itens jsonb := '[]'; it jsonb; x jsonb; v_preco numeric;
  v_total numeric := 0; v_falta boolean := false; s public.pedido_solicitacoes; v_prazo record; v_resp text; v_aceitar boolean;
begin
  if not public.eh_equipe() then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  select * into v from public.pedidos where numero = p_pedido for update;
  if not found then raise exception 'Pedido não encontrado.'; end if;
  p_dados := coalesce(p_dados, '{}'::jsonb);

  if p_acao = 'confirmar' then
    if v.status <> 'recebido' then raise exception 'Só pedidos novos podem ser confirmados.'; end if;
    for it in select * from jsonb_array_elements(v.itens) loop
      select e into x from jsonb_array_elements(coalesce(p_dados -> 'itens', '[]'::jsonb)) e where e ->> 'id' = it ->> 'id' limit 1;
      v_preco := coalesce(nullif(x ->> 'preco_kg', '')::numeric, nullif(it ->> 'preco_kg', '')::numeric);
      if v_preco is null or v_preco < 0 or v_preco > 100000 then v_falta := true;
      else
        it := it || jsonb_build_object('preco_kg', round(v_preco, 2), 'subtotal', round(v_preco * (it ->> 'kg')::numeric, 2));
        v_total := v_total + round(v_preco * (it ->> 'kg')::numeric, 2);
      end if;
      v_itens := v_itens || it;
    end loop;
    if v_falta then raise exception 'Informe o preço combinado de todos os itens.'; end if;
    update public.pedidos set itens = v_itens, total = v_total, tem_combinar = false, status = 'confirmado', confirmado_em = now(), vendedor = v_email where numero = p_pedido;
    perform public._msg_sistema(p_pedido, 'Pedido confirmado. Valor total: R$ ' || translate(to_char(v_total, 'FM999,999,990.00'), ',.', '.,') || '. Envio previsto: ' || to_char(v.previsao_envio, 'DD/MM') || '.');

  elsif p_acao = 'enviar' then
    if v.status <> 'confirmado' then raise exception 'Só pedidos em preparação podem ser enviados.'; end if;
    select * into v_prazo from public.prazo_regiao(v.destino_uf, v.destino_cep);
    update public.pedidos set status = 'enviado', enviado_em = now(),
      transportadora = left(nullif(btrim(p_dados ->> 'transportadora'), ''), 60), rastreio = left(nullif(btrim(p_dados ->> 'rastreio'), ''), 60),
      previsao_entrega_min = case when v_prazo.dias_min is null then previsao_entrega_min else public.somar_dias_uteis((now() at time zone 'America/Sao_Paulo')::date, v_prazo.dias_min) end,
      previsao_entrega_max = case when v_prazo.dias_max is null then previsao_entrega_max else public.somar_dias_uteis((now() at time zone 'America/Sao_Paulo')::date, v_prazo.dias_max) end
    where numero = p_pedido;
    select * into v from public.pedidos where numero = p_pedido;
    perform public._msg_sistema(p_pedido, 'Pedido enviado' || coalesce(' pela ' || v.transportadora, '') || coalesce(' (rastreio ' || v.rastreio || ')', '') ||
      '. Entrega estimada entre ' || to_char(v.previsao_entrega_min, 'DD/MM') || ' e ' || to_char(v.previsao_entrega_max, 'DD/MM') || '.');

  elsif p_acao = 'entregar' then
    if v.status <> 'enviado' then raise exception 'Só pedidos a caminho podem ser marcados como entregues.'; end if;
    update public.pedidos set status = 'entregue', entregue_em = now() where numero = p_pedido;
    perform public._msg_sistema(p_pedido, 'Pedido entregue. Obrigado pela compra!');

  elsif p_acao = 'cancelar' then
    if v.status not in ('recebido', 'confirmado', 'enviado') then raise exception 'Este pedido não pode ser cancelado.'; end if;
    v_resp := left(btrim(coalesce(p_dados ->> 'motivo', '')), 300);
    if length(v_resp) < 3 then raise exception 'Informe o motivo do cancelamento.'; end if;
    update public.pedidos set status = 'cancelado', cancelado_em = now(), cancelado_por = v_email, motivo_cancelamento = v_resp where numero = p_pedido;
    perform public._estornar(p_pedido, 'Estorno: venda cancelada');
    perform public._msg_sistema(p_pedido, 'Pedido cancelado pela Policoating. Motivo: ' || v_resp);

  elsif p_acao = 'responder' then
    select * into s from public.pedido_solicitacoes where id = (p_dados ->> 'solicitacao')::bigint and pedido_numero = p_pedido for update;
    if not found or s.status <> 'aberta' then raise exception 'Solicitação não encontrada ou já respondida.'; end if;
    v_aceitar := coalesce((p_dados ->> 'aceitar')::boolean, false);
    v_resp := left(btrim(coalesce(p_dados ->> 'resposta', '')), 500);
    if not v_aceitar and length(v_resp) < 3 then raise exception 'Explique ao cliente por que a solicitação foi recusada.'; end if;
    update public.pedido_solicitacoes set status = case when v_aceitar then 'aceita' else 'recusada' end, resposta = nullif(v_resp, ''),
      resolvido_em = now(), resolvido_por = v_email where id = s.id;
    if v_aceitar and s.tipo = 'cancelamento' and v.status not in ('cancelado', 'reembolsado') then
      update public.pedidos set status = 'cancelado', cancelado_em = now(), cancelado_por = v_email, motivo_cancelamento = s.motivo where numero = p_pedido;
      perform public._estornar(p_pedido, 'Estorno: cancelamento aceito');
    end if;
    if v_aceitar and s.tipo = 'reembolso' then
      update public.pedidos set status = 'reembolsado', reembolsado_em = now() where numero = p_pedido;
      if coalesce((p_dados ->> 'devolverEstoque')::boolean, false) then perform public._estornar(p_pedido, 'Estorno: devolução'); end if;
    end if;
    perform public._msg_sistema(p_pedido, (case s.tipo when 'cancelamento' then 'Cancelamento' when 'reembolso' then 'Reembolso / devolução' else 'Ajuda do atendimento' end)
      || ': ' || case when v_aceitar then 'aceita' else 'recusada' end || coalesce('. ' || nullif(v_resp, ''), '.'));
  else
    raise exception 'Ação desconhecida.';
  end if;
end $$;
revoke all on function public.acao_pedido(text, text, jsonb) from public;
grant execute on function public.acao_pedido(text, text, jsonb) to authenticated;

-- Pedido excluído pelo painel: o estoque reservado volta
create or replace function public.pedidos_ao_excluir()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public._estornar(old.numero, 'Estorno: pedido excluído');
  return old;
end $$;
drop trigger if exists pedidos_ao_excluir on public.pedidos;
create trigger pedidos_ao_excluir before delete on public.pedidos for each row execute function public.pedidos_ao_excluir();

-- Notificações
create or replace function public.resumo_equipe()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when not public.eh_equipe() then null else jsonb_build_object(
    'novas', (select count(*) from public.pedidos where status = 'recebido'),
    'enviar_hoje', (select count(*) from public.pedidos where status = 'confirmado' and previsao_envio <= (now() at time zone 'America/Sao_Paulo')::date),
    'mensagens', (select count(*) from public.pedidos where ultima_msg_lado = 'cliente' and (msg_lida_equipe_em is null or msg_lida_equipe_em < msg_ultima_em)),
    'solicitacoes', (select count(*) from public.pedido_solicitacoes where status = 'aberta')) end;
$$;
create or replace function public.resumo_cliente()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('mensagens', count(*)) from public.pedidos
  where cliente_id = auth.uid() and ultima_msg_lado is not null and ultima_msg_lado <> 'cliente'
    and (msg_lida_cliente_em is null or msg_lida_cliente_em < msg_ultima_em);
$$;
revoke all on function public.resumo_equipe() from public;
revoke all on function public.resumo_cliente() from public;
grant execute on function public.resumo_equipe(), public.resumo_cliente() to authenticated;

-- Promoções: administradores e vendedores
create or replace function public.aplicar_promocao(p_ids text[], p_percentual numeric, p_ate date default null)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.eh_equipe() then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  if p_percentual is null or p_percentual < 1 or p_percentual > 90 then raise exception 'Desconto entre 1%% e 90%%.'; end if;
  if p_ate is not null and p_ate < (now() at time zone 'America/Sao_Paulo')::date then raise exception 'A data de fim já passou.'; end if;
  update public.produtos set dados = (dados - 'promoAte') || jsonb_build_object('precoPromo', round((dados ->> 'preco')::numeric * (1 - p_percentual / 100), 2))
      || case when p_ate is null then '{}'::jsonb else jsonb_build_object('promoAte', to_char(p_ate, 'YYYY-MM-DD')) end,
    atualizado_em = now()
  where id = any (p_ids) and not coalesce((dados ->> 'precoCombinar')::boolean, false) and coalesce(nullif(dados ->> 'preco', '')::numeric, 0) > 0;
  get diagnostics n = row_count;
  return n;
end $$;
create or replace function public.remover_promocao(p_ids text[])
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.eh_equipe() then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  update public.produtos set dados = dados - 'precoPromo' - 'promoAte', atualizado_em = now()
  where id = any (p_ids) and dados ? 'precoPromo';
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.aplicar_promocao(text[], numeric, date) from public;
revoke all on function public.remover_promocao(text[]) from public;
grant execute on function public.aplicar_promocao(text[], numeric, date), public.remover_promocao(text[]) to authenticated;

-- Avisa a API do Supabase para reconhecer na hora as tabelas e funções novas
notify pgrst, 'reload schema';
