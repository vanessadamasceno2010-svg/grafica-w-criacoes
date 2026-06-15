-- Ajustes de pedidos, dashboard, documentos e configurações públicas

alter table public.pedidos
  add column if not exists valor_entrada numeric default 0,
  add column if not exists valor_restante numeric default 0,
  add column if not exists prazo_entrega date,
  add column if not exists cliente_nome text,
  add column if not exists cliente_email text,
  add column if not exists cliente_telefone text;

create table if not exists public.pedido_historico (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid,
  usuario_id uuid,
  usuario_nome text,
  acao text not null,
  campo text,
  valor_anterior text,
  valor_novo text,
  created_at timestamp with time zone default now()
);

alter table public.users
  add column if not exists funcionario_permissoes jsonb default '[]'::jsonb;

insert into public.configuracoes_site (chave, valor, tipo, updated_at)
values
  ('home_badge', 'Padrão visual premium', 'texto', now()),
  ('home_titulo', 'Produtos personalizados com impacto real.', 'texto', now()),
  ('home_subtitulo', 'Escolha os produtos, monte seu carrinho e finalize o pedido diretamente pelo WhatsApp com atendimento personalizado.', 'texto_longo', now()),
  ('home_banner_url', 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800&q=80', 'texto', now()),
  ('home_codigo_pedido_titulo', 'Acompanhe seu pedido', 'texto', now()),
  ('home_codigo_pedido_texto', 'Digite o código do pedido para consultar o andamento.', 'texto', now()),
  ('logo_site_url', '/assets/logo-wide.jpeg', 'texto', now()),
  ('logo_documento_url', '/assets/logo-wide.jpeg', 'texto', now()),
  ('assinatura_url', '', 'texto', now())
on conflict (chave) do nothing;

update public.pedidos
set valor_restante = greatest(coalesce(total, 0) - coalesce(valor_entrada, 0), 0)
where valor_restante is null or valor_restante = 0;
