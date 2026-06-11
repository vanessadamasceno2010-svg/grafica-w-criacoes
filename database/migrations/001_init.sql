create extension if not exists "pgcrypto";

do $$ begin
  create type user_role as enum ('user','admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create type pedido_status as enum ('pendente','confirmado','em_producao','pronto','enviado','entregue','cancelado');
exception when duplicate_object then null; end $$;
do $$ begin
  create type pagamento_status as enum ('pendente','confirmado','recusado');
exception when duplicate_object then null; end $$;
do $$ begin
  create type cupom_tipo as enum ('percentual','fixo');
exception when duplicate_object then null; end $$;
do $$ begin
  create type config_tipo as enum ('texto','numero','booleano','json');
exception when duplicate_object then null; end $$;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email varchar(180) unique not null,
  nome varchar(160) not null,
  telefone varchar(40),
  senha text not null,
  role user_role not null default 'user',
  endereco text,
  cidade varchar(120),
  estado varchar(60),
  cep varchar(20),
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  nome varchar(160) not null,
  descricao text,
  slug varchar(180) unique not null,
  imagem_url text,
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamp not null default now()
);

create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid references categorias(id) on delete set null,
  nome varchar(180) not null,
  descricao text not null,
  descricao_longa text,
  preco numeric(10,2) not null check (preco >= 0),
  preco_original numeric(10,2),
  estoque int not null default 0 check (estoque >= 0),
  imagem_principal text not null,
  imagens_adicionais jsonb not null default '[]'::jsonb,
  especificacoes jsonb not null default '{}'::jsonb,
  slug varchar(180) unique not null,
  sku varchar(120) unique not null,
  peso numeric(10,2) default 0,
  dimensoes jsonb not null default '{}'::jsonb,
  tempo_producao int not null default 3,
  destaque boolean not null default false,
  ativo boolean not null default true,
  visualizacoes int not null default 0,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists carrinho (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references users(id) on delete cascade,
  produto_id uuid not null references produtos(id) on delete cascade,
  quantidade int not null check (quantidade > 0),
  especificacoes_selecionadas jsonb not null default '{}'::jsonb,
  preco_unitario numeric(10,2) not null,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references users(id),
  numero_pedido varchar(40) unique not null,
  status pedido_status not null default 'pendente',
  subtotal numeric(10,2) not null,
  frete numeric(10,2) not null default 0,
  desconto numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  metodo_pagamento varchar(80),
  status_pagamento pagamento_status not null default 'pendente',
  endereco_entrega text not null,
  observacoes text,
  cliente_nome varchar(160),
  cliente_email varchar(180),
  cliente_telefone varchar(40),
  origem varchar(40) not null default 'site',
  recibo_emitido boolean not null default false,
  data_entrega_estimada date,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists itens_pedido (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  produto_id uuid not null references produtos(id),
  quantidade int not null,
  preco_unitario numeric(10,2) not null,
  especificacoes jsonb not null default '{}'::jsonb,
  created_at timestamp not null default now()
);

create table if not exists avaliacoes (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produtos(id) on delete cascade,
  usuario_id uuid not null references users(id) on delete cascade,
  nota int not null check (nota between 1 and 5),
  comentario text,
  verificado boolean not null default false,
  created_at timestamp not null default now()
);

create table if not exists configuracoes_site (
  id uuid primary key default gen_random_uuid(),
  chave varchar(120) unique not null,
  valor text not null,
  tipo config_tipo not null default 'texto',
  updated_at timestamp not null default now()
);

create table if not exists cupons_desconto (
  id uuid primary key default gen_random_uuid(),
  codigo varchar(60) unique not null,
  descricao text,
  tipo cupom_tipo not null,
  valor numeric(10,2) not null,
  uso_maximo int not null default 1,
  uso_atual int not null default 0,
  data_inicio timestamp not null,
  data_fim timestamp not null,
  ativo boolean not null default true,
  created_at timestamp not null default now()
);

create table if not exists contatos_formulario (
  id uuid primary key default gen_random_uuid(),
  nome varchar(160) not null,
  email varchar(180) not null,
  telefone varchar(40),
  assunto varchar(180) not null,
  mensagem text not null,
  respondido boolean not null default false,
  resposta text,
  created_at timestamp not null default now()
);

create index if not exists idx_produtos_categoria on produtos(categoria_id);
create index if not exists idx_produtos_slug on produtos(slug);
create index if not exists idx_pedidos_usuario on pedidos(usuario_id);
create index if not exists idx_carrinho_usuario on carrinho(usuario_id);
