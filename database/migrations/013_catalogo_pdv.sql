-- V9: executar depois de 012_catalogo_pedidos.sql.
begin;
alter table public.pedidos add column if not exists numero_pedido_anterior text;
create unique index if not exists pedidos_numero_anterior_idx on public.pedidos(numero_pedido_anterior) where numero_pedido_anterior is not null;
alter table public.pedidos add column if not exists data_pedido date;
create sequence if not exists public.pedido_numero_seq start 1001;
create or replace function public.numero_pedido_curto() returns text language plpgsql security definer set search_path=public as $$
declare n bigint; codigo text;
begin
 loop
  n:=nextval('public.pedido_numero_seq');
  codigo:='WC'||lpad(n::text,greatest(6,length(n::text)),'0');
  exit when not exists(select 1 from pedidos where numero_pedido=codigo or numero_pedido_anterior=codigo);
 end loop;
 return codigo;
end $$;
create or replace function public.definir_numero_pedido() returns trigger language plpgsql security definer set search_path=public as $$
begin new.numero_pedido:=numero_pedido_curto(); return new; end $$;
drop trigger if exists definir_numero_pedido on public.pedidos;
create trigger definir_numero_pedido before insert on public.pedidos for each row execute function public.definir_numero_pedido();
-- Os números antigos permanecem aceitos no acompanhamento.
update public.pedidos set numero_pedido_anterior=numero_pedido,numero_pedido=public.numero_pedido_curto()
where numero_pedido_anterior is null and length(numero_pedido)>12 and numero_pedido ~ '^(WC|PDV)[a-zA-Z0-9]+$';
revoke all on function public.numero_pedido_curto() from public,anon,authenticated;
revoke all on function public.definir_numero_pedido() from public,anon,authenticated;

create or replace function public.catalogo_vendas() returns table(produto_id uuid,vendidos bigint)
language sql stable security definer set search_path=public as $$
 select i.produto_id, sum(i.quantidade)::bigint from itens_pedido i join pedidos p on p.id=i.pedido_id
 where p.status in ('confirmado','em_producao','pronto','enviado','entregue') group by i.produto_id
$$;
revoke all on function public.catalogo_vendas() from public,anon,authenticated;
grant execute on function public.catalogo_vendas() to service_role;

-- Galerias ignoram opções de quantidade: um único conjunto de fotos por característica visual.
create or replace function public.opcoes_visuais(v jsonb) returns jsonb language sql immutable as $$
 select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) from jsonb_each(
 case when coalesce(v->'opcoes','{}'::jsonb)<>'{}'::jsonb then v->'opcoes'
 else jsonb_build_object('Acabamento',coalesce(v->>'acabamento',''),'Tamanho',coalesce(v->>'tamanho',''),'Modelo',coalesce(v->>'modelo','')) end)
 where key !~* 'quant|lote|conjunto|unidades|tiragem' and value<>'""'::jsonb and value<>'null'::jsonb
$$;
create or replace function public.sincronizar_fotos_variacoes() returns trigger language plpgsql set search_path=public as $$
declare v jsonb; fonte jsonb; resultado jsonb:='[]';
begin
 for v in select value from jsonb_array_elements(coalesce(new.variacoes,'[]')) loop
  select value into fonte from jsonb_array_elements(coalesce(new.variacoes,'[]')) where opcoes_visuais(value)=opcoes_visuais(v) and coalesce((value->>'ativo')::boolean,true) and jsonb_array_length(coalesce(value->'imagens','[]'))>0 limit 1;
  if fonte is not null then v:=v||jsonb_build_object('imagens',fonte->'imagens'); end if;
  resultado:=resultado||jsonb_build_array(v);
 end loop;
 new.variacoes:=resultado;return new;
end $$;
drop trigger if exists sincronizar_fotos_variacoes on public.produtos;
create trigger sincronizar_fotos_variacoes before insert or update of variacoes on public.produtos for each row execute function public.sincronizar_fotos_variacoes();
update public.produtos set variacoes=variacoes where jsonb_array_length(variacoes)>0;

-- Pedido avulso: a descrição fica no snapshot, sem exigir um produto cadastrado.
create or replace function public.criar_pedido_avulso(d jsonb, operador uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare ped pedidos%rowtype; subtotal numeric; desconto numeric; total numeric; pago numeric; restante numeric; quantidade integer; unitario numeric; snap jsonb; chave uuid:=(d->>'chave_checkout')::uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(chave::text,0));
 select * into ped from pedidos where chave_checkout=chave;
 if found then return to_jsonb(ped); end if;
 quantidade:=coalesce((d->>'quantidade')::integer,1);
 unitario:=round(coalesce((d->>'preco_unitario')::numeric,0),2);
 subtotal:=round(coalesce((d->>'valor_total')::numeric,quantidade*unitario),2);
 desconto:=least(round(coalesce((d->>'desconto')::numeric,0),2),subtotal);
 total:=greatest(subtotal-desconto,0);pago:=least(round(coalesce((d->>'valor_pago')::numeric,0),2),total);restante:=total-pago;
 if quantidade<1 or unitario<0 or subtotal<0 or desconto<0 or pago<0 then raise exception 'Valores inválidos'; end if;
 snap:=jsonb_build_array(jsonb_build_object('nome',coalesce(nullif(d->>'descricao',''),'Pedido avulso'),'quantidade',quantidade,'preco_unitario',unitario,'valor_total',subtotal,'especificacoes_selecionadas','{}'::jsonb));
 insert into pedidos(numero_pedido,chave_checkout,status,subtotal,frete,desconto,total,valor_entrada,valor_restante,metodo_pagamento,status_pagamento,endereco_entrega,cliente_nome,cliente_telefone,cliente_email,observacoes,origem,itens_snapshot,data_pedido,prazo_entrega,data_entrega_estimada)
 values('automatico',chave,'confirmado',subtotal,0,desconto,total,pago,restante,'a_combinar',case when total>0 and restante=0 then 'confirmado'::pagamento_status when pago>0 then 'parcial'::pagamento_status else 'pendente'::pagamento_status end,'A combinar',coalesce(nullif(d->>'cliente_nome',''),'Cliente não informado'),coalesce(d->>'cliente_telefone',''),'',coalesce(d->>'descricao',''),'pdv',snap,coalesce(nullif(d->>'data_pedido','')::date,current_date),nullif(d->>'data_entrega','')::date,nullif(d->>'data_entrega','')::date) returning * into ped;
 if pago>0 then
  insert into caixa_movimentacoes(data_movimento,descricao,valor,forma_pagamento,origem,pedido_id,usuario_id,usuario_nome,observacoes,tipo)
  values(coalesce(nullif(d->>'data_pedido','')::date,current_date),'Recebimento pedido '||ped.numero_pedido,pago,'outro','pedido',ped.id,operador,'PDV','Pedido avulso','entrada');
 end if;
 return to_jsonb(ped);
end $$;
revoke all on function public.criar_pedido_avulso(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.criar_pedido_avulso(jsonb,uuid) to service_role;
commit;
