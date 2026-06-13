-- Ajustes operacionais: funcionário, permissões, pagamentos, prazos e documentos

-- Permite novas funções de usuário sem recriar enum/tabela.
do $$
begin
  begin
    alter type user_role add value if not exists 'funcionario';
  exception when others then null;
  end;

  begin
    alter type user_role add value if not exists 'inactive';
  exception when others then null;
  end;
end $$;

-- Permite status de pagamento parcial.
do $$
begin
  begin
    alter type pagamento_status add value if not exists 'parcial';
  exception when others then null;
  end;
end $$;

-- Permissões do funcionário.
alter table if exists users
  add column if not exists funcionario_permissoes jsonb not null default '[]'::jsonb;

-- Dados extras de pagamento e documentos do pedido.
alter table if exists pedidos
  add column if not exists valor_entrada numeric(10,2) not null default 0,
  add column if not exists valor_restante numeric(10,2) not null default 0,
  add column if not exists prazo_entrega date,
  add column if not exists assinatura_url text,
  add column if not exists logo_documento_url text;

-- Configurações novas do site/documentos.
insert into configuracoes_site (chave, valor, tipo, updated_at)
values
  ('logo_site_url', '', 'texto', now()),
  ('logo_documentos_url', '', 'texto', now()),
  ('assinatura_recibo_url', '', 'texto', now())
on conflict (chave) do nothing;
