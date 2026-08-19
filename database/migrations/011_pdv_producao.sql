-- 011_pdv_producao.sql
-- Evolui o fluxo de caixa e adiciona o acompanhamento da produção do PDV.

alter table public.caixa_movimentacoes
  add column if not exists tipo varchar(20) not null default 'entrada',
  add column if not exists categoria varchar(80) not null default 'venda';

update public.caixa_movimentacoes
set tipo = 'entrada'
where tipo is null or tipo not in ('entrada', 'saida');

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'caixa_movimentacoes_tipo_check'
  ) then
    alter table public.caixa_movimentacoes
      add constraint caixa_movimentacoes_tipo_check
      check (tipo in ('entrada', 'saida'));
  end if;
end $$;

create index if not exists idx_caixa_movimentacoes_tipo
  on public.caixa_movimentacoes(tipo);

alter table public.pedidos
  add column if not exists tipo_entrega varchar(20) not null default 'retirada',
  add column if not exists etapa_producao varchar(40) not null default 'aguardando',
  add column if not exists prioridade varchar(20) not null default 'normal',
  add column if not exists impressoes integer not null default 0,
  add column if not exists ultima_impressao_em timestamp without time zone;

update public.pedidos
set etapa_producao = case
  when status = 'em_producao' then 'producao'
  when status = 'pronto' then 'pronto'
  when status in ('enviado', 'entregue') then 'finalizado'
  else 'aguardando'
end
where etapa_producao is null
   or etapa_producao = ''
   or etapa_producao = 'aguardando';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pedidos_etapa_producao_check'
  ) then
    alter table public.pedidos
      add constraint pedidos_etapa_producao_check
      check (etapa_producao in ('aguardando', 'arte', 'aprovacao', 'producao', 'acabamento', 'pronto', 'finalizado'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pedidos_prioridade_check'
  ) then
    alter table public.pedidos
      add constraint pedidos_prioridade_check
      check (prioridade in ('normal', 'urgente'));
  end if;
end $$;

create index if not exists idx_pedidos_etapa_producao
  on public.pedidos(etapa_producao, prazo_entrega);
