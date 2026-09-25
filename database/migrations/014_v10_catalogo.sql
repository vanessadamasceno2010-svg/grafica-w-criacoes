begin;
alter table public.produtos add column if not exists categoria_ids jsonb not null default '[]'::jsonb;
update public.produtos set categoria_ids=jsonb_build_array(categoria_id::text)
where categoria_id is not null and (categoria_ids='[]'::jsonb or categoria_ids is null);

create or replace function public.criar_pedido_avulso(d jsonb, operador uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare ped pedidos%rowtype; subtotal numeric:=0; desconto numeric; total numeric; pago numeric; restante numeric; snap jsonb:='[]'::jsonb; item jsonb; qtd numeric; unit numeric; chave uuid:=(d->>'chave_checkout')::uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(chave::text,0)); select * into ped from pedidos where chave_checkout=chave; if found then return to_jsonb(ped); end if;
 if jsonb_typeof(d->'items')='array' and jsonb_array_length(d->'items')>0 then
  for item in select value from jsonb_array_elements(d->'items') loop qtd:=greatest(coalesce((item->>'quantidade')::numeric,1),1); unit:=greatest(round(coalesce((item->>'preco_unitario')::numeric,0),2),0); subtotal:=subtotal+qtd*unit; snap:=snap||jsonb_build_array(jsonb_build_object('nome',coalesce(nullif(item->>'descricao',''),'Item avulso'),'quantidade',qtd,'preco_unitario',unit,'valor_total',qtd*unit,'especificacoes_selecionadas','{}'::jsonb)); end loop;
 else qtd:=greatest(coalesce((d->>'quantidade')::numeric,1),1); unit:=greatest(round(coalesce((d->>'preco_unitario')::numeric,0),2),0); subtotal:=round(coalesce((d->>'valor_total')::numeric,qtd*unit),2); snap:=jsonb_build_array(jsonb_build_object('nome',coalesce(nullif(d->>'descricao',''),'Pedido avulso'),'quantidade',qtd,'preco_unitario',unit,'valor_total',subtotal,'especificacoes_selecionadas','{}'::jsonb)); end if;
 subtotal:=round(subtotal,2); desconto:=least(round(coalesce((d->>'desconto')::numeric,0),2),subtotal); total:=greatest(subtotal-desconto,0); pago:=least(round(coalesce((d->>'valor_pago')::numeric,0),2),total); restante:=total-pago;
 insert into pedidos(numero_pedido,chave_checkout,status,subtotal,frete,desconto,total,valor_entrada,valor_restante,metodo_pagamento,status_pagamento,endereco_entrega,cliente_nome,cliente_telefone,cliente_email,observacoes,origem,itens_snapshot,data_pedido,prazo_entrega,data_entrega_estimada) values('automatico',chave,'confirmado',subtotal,0,desconto,total,pago,restante,'a_combinar',case when total>0 and restante=0 then 'confirmado'::pagamento_status when pago>0 then 'parcial'::pagamento_status else 'pendente'::pagamento_status end,'A combinar',coalesce(nullif(d->>'cliente_nome',''),'Cliente não informado'),coalesce(d->>'cliente_telefone',''),'',coalesce(d->>'descricao',''),'pdv',snap,coalesce(nullif(d->>'data_pedido','')::date,current_date),nullif(d->>'data_entrega','')::date,nullif(d->>'data_entrega','')::date) returning * into ped;
 if pago>0 then insert into caixa_movimentacoes(data_movimento,descricao,valor,forma_pagamento,origem,pedido_id,usuario_id,usuario_nome,observacoes,tipo) values(coalesce(nullif(d->>'data_pedido','')::date,current_date),'Recebimento pedido '||ped.numero_pedido,pago,'outro','pedido',ped.id,operador,'PDV','Pedido avulso','entrada'); end if; return to_jsonb(ped);
end $$;
revoke all on function public.criar_pedido_avulso(jsonb,uuid) from public,anon,authenticated; grant execute on function public.criar_pedido_avulso(jsonb,uuid) to service_role;
commit;
