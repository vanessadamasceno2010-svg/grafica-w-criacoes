-- Execute no SQL Editor do Supabase antes de publicar o backend.
create table if not exists public.produtos_digitais (
 id uuid primary key default gen_random_uuid(), nome text not null,
 descricao text not null default '', imagem_url text not null default '',
 preco_centavos integer not null check(preco_centavos > 0),
 download_url text not null, ativo boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.pedidos_digitais (
 id uuid primary key, token_hash text not null unique,
 produto_id uuid not null references public.produtos_digitais(id),
 nome text not null, valor_centavos integer not null check(valor_centavos > 0),
 download_url text not null, status text not null default 'criando' check(status in ('criando','pendente','pago','erro')),
 referencia text unique, pagamento_id text unique, checkout_url text,
 created_at timestamptz not null default now(), pago_em timestamptz
);
-- Cache compartilhado entre instâncias serverless. Não contém dados públicos.
create table if not exists public.livepix_tokens (
 id text primary key, access_token text, expires_at timestamptz, locked_until timestamptz
);
alter table public.produtos_digitais enable row level security;
alter table public.pedidos_digitais enable row level security;
alter table public.livepix_tokens enable row level security;
revoke all on public.produtos_digitais, public.pedidos_digitais, public.livepix_tokens from anon, authenticated;
grant all on public.produtos_digitais, public.pedidos_digitais, public.livepix_tokens to service_role;
create or replace function public.livepix_token_claim(cache_id text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare t livepix_tokens;
begin
 insert into livepix_tokens(id) values(cache_id) on conflict do nothing;
 select * into t from livepix_tokens where id=cache_id for update;
 if t.expires_at > now()+interval '60 seconds' then
  return jsonb_build_object('token',t.access_token);
 end if;
 if t.locked_until > now() then return jsonb_build_object('busy',true); end if;
 update livepix_tokens set locked_until=now()+interval '30 seconds' where id=cache_id;
 return jsonb_build_object('claim',true);
end $$;
revoke all on function public.livepix_token_claim(text) from public, anon, authenticated;
grant execute on function public.livepix_token_claim(text) to service_role;
