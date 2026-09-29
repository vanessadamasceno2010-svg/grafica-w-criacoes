-- Requer a migração 015. Execute antes de publicar esta atualização.
alter table public.produtos_digitais add column if not exists imagens jsonb not null default '[]'::jsonb;
update public.produtos_digitais set imagens=jsonb_build_array(imagem_url)
where imagens='[]'::jsonb and imagem_url<>'';
create table if not exists public.configuracoes_digitais (
 id integer primary key check(id=1), dados jsonb not null default '{}'::jsonb
);
insert into public.configuracoes_digitais(id) values(1) on conflict do nothing;
alter table public.configuracoes_digitais enable row level security;
revoke all on public.configuracoes_digitais from anon, authenticated;
grant all on public.configuracoes_digitais to service_role;
