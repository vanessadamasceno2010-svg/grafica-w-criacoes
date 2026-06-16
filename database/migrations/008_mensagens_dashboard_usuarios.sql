-- Ajustes para mensagens do site, dashboard e usuários
-- Rode este SQL no Supabase antes do deploy se sua tabela de mensagens ainda não existir.

create table if not exists public.contatos_formulario (
  id uuid primary key default gen_random_uuid(),
  nome varchar not null,
  email varchar not null,
  telefone varchar,
  assunto varchar,
  mensagem text not null,
  respondido boolean default false,
  created_at timestamp default now()
);

alter table public.users
add column if not exists funcionario_permissoes jsonb default '[]'::jsonb;

create index if not exists idx_contatos_formulario_created_at on public.contatos_formulario(created_at desc);
create index if not exists idx_contatos_formulario_respondido on public.contatos_formulario(respondido);
