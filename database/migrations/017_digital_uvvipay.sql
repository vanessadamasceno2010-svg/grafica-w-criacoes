-- Requer 015 e 016. Execute antes de publicar o backend.
alter table public.pedidos_digitais
 add column if not exists gateway text not null default 'livepix',
 add column if not exists gateway_ambiente text not null default 'production',
 add column if not exists gateway_payload jsonb,
 add column if not exists gateway_status text,
 add column if not exists pix_codigo text,
 add column if not exists pix_expira_em timestamptz,
 add column if not exists cliente_documento_hash text;
create index if not exists pedidos_digitais_cliente_documento_hash_idx on public.pedidos_digitais(cliente_documento_hash);
alter table public.pedidos_digitais drop constraint if exists pedidos_digitais_status_check;
alter table public.pedidos_digitais add constraint pedidos_digitais_status_check
 check(status in ('criando','pendente','pago','erro','expirado','cancelado','recusado','estornado','contestado'));
-- Somente o backend pode chamar: a consulta autenticada ao provedor ocorre antes deste RPC.
create or replace function public.aplicar_pagamento_uvvipay(p_pedido uuid, p_pagamento text, p_status text, p_codigo text default null, p_expira timestamptz default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare o pedidos_digitais; novo text;
begin
 select * into o from pedidos_digitais where id=p_pedido for update;
 if not found or o.gateway<>'uvvipay' then raise exception 'Pedido UvviPay não encontrado'; end if;
 if o.pagamento_id is not null and o.pagamento_id<>p_pagamento then raise exception 'Pagamento divergente'; end if;
 novo := case p_status when 'paid' then 'pago' when 'refunded' then 'estornado'
 when 'chargedback' then 'contestado' when 'cancelled' then 'cancelado'
 when 'expired' then 'expirado' when 'refused' then 'recusado' else 'pendente' end;
 -- Notificações/consultas concorrentes não podem desfazer estornos nem rebaixar pago para pendente.
 if o.status in ('estornado','contestado') or (o.status='pago' and novo not in ('estornado','contestado'))
 or (o.status in ('expirado','cancelado','recusado') and novo='pendente') then novo:=o.status; end if;
 update pedidos_digitais set status=novo, pagamento_id=p_pagamento,
 referencia=coalesce(referencia,p_pagamento),
 gateway_status=case when novo=o.status and o.status<>'pendente' then gateway_status else p_status end,
 pix_codigo=coalesce(p_codigo,pix_codigo),pix_expira_em=coalesce(p_expira,pix_expira_em),
 pago_em=case when novo='pago' then coalesce(pago_em,now()) else pago_em end
 where id=p_pedido returning * into o;
 return to_jsonb(o);
end $$;
revoke all on function public.aplicar_pagamento_uvvipay(uuid,text,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.aplicar_pagamento_uvvipay(uuid,text,text,text,timestamptz) to service_role;
