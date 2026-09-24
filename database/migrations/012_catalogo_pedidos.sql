-- Execute após as migrações anteriores. Pedidos públicos atômicos e idempotentes.
alter table public.pedidos add column if not exists tipo_entrega text;
alter table public.pedidos add column if not exists chave_checkout uuid unique;
alter table public.pedidos add column if not exists itens_snapshot jsonb not null default '[]';

create or replace function public.criar_pedido_catalogo(d jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
 p produtos%rowtype; v jsonb; item jsonb; op jsonb; snap jsonb := '[]';
 ped pedidos%rowtype; qtd integer; preco_item numeric; soma numeric := 0;
 chave uuid := (d->>'chave_checkout')::uuid; variacao text;
begin
 perform pg_advisory_xact_lock(hashtextextended(chave::text, 0));
 select * into ped from pedidos where chave_checkout = chave;
 if found then return to_jsonb(ped); end if;
 if jsonb_array_length(d->'items') not between 1 and 100 then raise exception 'Pedido vazio ou muito grande'; end if;
 for item in select value from jsonb_array_elements(d->'items') loop
  select * into p from produtos where id = (item->>'produto_id')::uuid and ativo = true for share;
  if not found then raise exception 'Produto indisponível'; end if;
  qtd := (item->>'quantidade')::integer;
  if qtd < 1 or qtd > 10000 then raise exception 'Quantidade inválida'; end if;
  v := null; op := '{}'::jsonb;
  variacao := item->>'variacao_id';
  if jsonb_array_length(coalesce(p.variacoes, '[]')) > 0 then
   select value into v from jsonb_array_elements(p.variacoes) where value->>'id' = variacao and coalesce((value->>'ativo')::boolean,true);
   if v is null then raise exception 'Selecione uma variação válida'; end if;
   preco_item := (v->>'preco')::numeric;
   op := coalesce(v->'opcoes', '{}'::jsonb);
   if op = '{}'::jsonb then
    op := jsonb_strip_nulls(jsonb_build_object('Acabamento',nullif(v->>'acabamento',''),'Tamanho',nullif(v->>'tamanho',''),'Quantidade',nullif(v->>'quantidade',''),'Modelo',nullif(v->>'modelo','')));
   end if;
   op := op || jsonb_build_object('Variação',v->>'nome','Prazo estimado',coalesce(v->>'prazo_entrega_dias',p.tempo_producao::text) || ' dias úteis');
  else
   preco_item := p.preco;
   -- Opções sem preço próprio: aceitar apenas valores cadastrados.
   for variacao in select jsonb_object_keys(coalesce(p.especificacoes,'{}')) loop
    if jsonb_typeof(p.especificacoes->variacao) = 'array' and jsonb_array_length(p.especificacoes->variacao)>0 then
     if not (p.especificacoes->variacao @> jsonb_build_array(item->'especificacoes'->>variacao)) then raise exception 'Característica inválida: %',variacao; end if;
     op := op || jsonb_build_object(variacao,item->'especificacoes'->>variacao);
    end if;
   end loop;
  end if;
  if preco_item is null or preco_item <= 0 then raise exception 'Preço indisponível'; end if;
  preco_item := round(preco_item,2);
  soma := soma + preco_item*qtd;
  snap := snap || jsonb_build_array(jsonb_build_object('produto_id',p.id,'nome',p.nome,'slug',p.slug,'variacao_id',v->>'id','imagem_principal',coalesce(v->'imagens'->>0,p.imagem_principal),'quantidade',qtd,'preco_unitario',preco_item,'especificacoes_selecionadas',op));
 end loop;
 insert into pedidos(numero_pedido,chave_checkout,status,subtotal,frete,desconto,total,metodo_pagamento,status_pagamento,endereco_entrega,observacoes,cliente_nome,cliente_email,cliente_telefone,origem,itens_snapshot,valor_entrada,valor_restante,tipo_entrega)
 values('WC' || upper(replace(gen_random_uuid()::text,'-','')),chave,'pendente',soma,0,0,soma,'whatsapp','pendente',d->>'endereco_entrega',d->>'observacoes',d->>'cliente_nome',d->>'cliente_email',d->>'cliente_telefone','site',snap,0,soma,d->>'tipo_entrega') returning * into ped;
 for item in select value from jsonb_array_elements(snap) loop
  insert into itens_pedido(pedido_id,produto_id,quantidade,preco_unitario,especificacoes) values(ped.id,(item->>'produto_id')::uuid,(item->>'quantidade')::integer,(item->>'preco_unitario')::numeric,item->'especificacoes_selecionadas');
 end loop;
 return to_jsonb(ped);
end $$;
revoke all on function public.criar_pedido_catalogo(jsonb) from public, anon, authenticated;
grant execute on function public.criar_pedido_catalogo(jsonb) to service_role;

-- Imagens públicas de produtos. Escrita somente pelo backend autenticado.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('catalogo','catalogo',true,1500000,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
