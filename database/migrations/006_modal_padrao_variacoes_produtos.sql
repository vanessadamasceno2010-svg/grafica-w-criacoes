-- Adiciona variações de preço aos produtos.
-- Rode este SQL uma vez no Supabase antes de usar variações no painel.

alter table public.produtos
add column if not exists variacoes jsonb not null default '[]'::jsonb;

update public.produtos
set variacoes = '[]'::jsonb
where variacoes is null;
