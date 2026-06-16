create table if not exists public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  numero_orcamento varchar not null unique,
  usuario_id uuid null references public.users(id) on delete set null,
  cliente_nome varchar not null,
  cliente_email varchar null,
  cliente_telefone varchar null,
  descricao text not null,
  valor_total numeric not null default 0,
  validade date null,
  status varchar not null default 'rascunho',
  observacoes text null,
  virou_pedido boolean not null default false,
  pedido_id uuid null references public.pedidos(id) on delete set null,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create index if not exists idx_orcamentos_usuario_id on public.orcamentos(usuario_id);
create index if not exists idx_orcamentos_numero on public.orcamentos(numero_orcamento);
create index if not exists idx_orcamentos_status on public.orcamentos(status);
create index if not exists idx_orcamentos_created_at on public.orcamentos(created_at desc);

alter table public.orcamentos enable row level security;

drop policy if exists "orcamentos_select_all" on public.orcamentos;
drop policy if exists "orcamentos_insert_all" on public.orcamentos;
drop policy if exists "orcamentos_update_all" on public.orcamentos;
drop policy if exists "orcamentos_delete_all" on public.orcamentos;

create policy "orcamentos_select_all" on public.orcamentos for select using (true);
create policy "orcamentos_insert_all" on public.orcamentos for insert with check (true);
create policy "orcamentos_update_all" on public.orcamentos for update using (true) with check (true);
create policy "orcamentos_delete_all" on public.orcamentos for delete using (true);
