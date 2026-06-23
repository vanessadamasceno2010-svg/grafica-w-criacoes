-- 010_contas_pagar.sql
-- Cria contas a pagar com parcelas e vencimentos.
-- Execute uma única vez no Supabase SQL Editor antes de testar a V6.

create table if not exists public.contas_pagar (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null,
  descricao text not null,
  fornecedor text not null default '',
  categoria text not null default '',
  valor_total numeric(12,2) not null check (valor_total > 0),
  valor_parcela numeric(12,2) not null check (valor_parcela > 0),
  parcela_numero integer not null check (parcela_numero > 0),
  quantidade_parcelas integer not null check (quantidade_parcelas > 0),
  vencimento date not null,
  status varchar(20) not null default 'pendente' check (status in ('pendente', 'pago', 'cancelado')),
  data_pagamento date null,
  observacoes text not null default '',
  usuario_id uuid null references public.users(id) on delete set null,
  usuario_nome text,
  created_at timestamp without time zone not null default now(),
  updated_at timestamp without time zone not null default now(),
  unique (grupo_id, parcela_numero)
);

create index if not exists idx_contas_pagar_vencimento on public.contas_pagar(vencimento);
create index if not exists idx_contas_pagar_status on public.contas_pagar(status);
create index if not exists idx_contas_pagar_grupo on public.contas_pagar(grupo_id);

alter table public.contas_pagar enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'contas_pagar'
      and policyname = 'contas_pagar_service_role_all'
  ) then
    create policy contas_pagar_service_role_all
    on public.contas_pagar
    for all
    to service_role
    using (true)
    with check (true);
  end if;
end $$;
