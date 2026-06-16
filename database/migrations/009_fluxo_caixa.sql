-- 009_fluxo_caixa.sql
-- Cria o fluxo de caixa apenas para entradas diárias.

create table if not exists public.caixa_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  data_movimento date not null default current_date,
  descricao text not null,
  valor numeric(12,2) not null check (valor >= 0),
  forma_pagamento varchar(40) not null default 'pix',
  origem varchar(40) not null default 'manual',
  pedido_id uuid null references public.pedidos(id) on delete set null,
  usuario_id uuid null references public.users(id) on delete set null,
  usuario_nome text,
  observacoes text,
  created_at timestamp without time zone default now(),
  updated_at timestamp without time zone default now()
);

create index if not exists idx_caixa_movimentacoes_data on public.caixa_movimentacoes(data_movimento desc);
create index if not exists idx_caixa_movimentacoes_forma on public.caixa_movimentacoes(forma_pagamento);
create index if not exists idx_caixa_movimentacoes_origem on public.caixa_movimentacoes(origem);
create index if not exists idx_caixa_movimentacoes_usuario on public.caixa_movimentacoes(usuario_id);

alter table public.caixa_movimentacoes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'caixa_movimentacoes'
      and policyname = 'caixa_movimentacoes_service_role_all'
  ) then
    create policy caixa_movimentacoes_service_role_all
    on public.caixa_movimentacoes
    for all
    using (true)
    with check (true);
  end if;
end $$;
