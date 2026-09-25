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
