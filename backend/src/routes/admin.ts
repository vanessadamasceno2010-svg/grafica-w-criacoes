import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { auth, admin } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';

export const adminRoutes = Router();
adminRoutes.use(auth, admin);

adminRoutes.get('/dashboard', asyncHandler(async (_req, res) => {
  const [vendas, pedidos, clientes, estoque, pendentes] = await Promise.all([
    query("select coalesce(sum(total),0) total from pedidos where date_trunc('month',created_at)=date_trunc('month',now())"),
    query("select count(*) total from pedidos where date_trunc('month',created_at)=date_trunc('month',now())"),
    query("select count(*) total from users where role='user' and date_trunc('month',created_at)=date_trunc('month',now())"),
    query('select coalesce(sum(estoque),0) total from produtos'),
    query("select count(*) total from pedidos where status in ('pendente','confirmado','em_producao')")
  ]);
  const { rows: chart } = await query("select to_char(created_at,'DD/MM') dia, sum(total)::numeric(10,2) total from pedidos where created_at >= now()-interval '30 days' group by 1 order by min(created_at)");
  res.json({ vendasMes: vendas.rows[0].total, pedidosMes: pedidos.rows[0].total, ticketMedio: Number(pedidos.rows[0].total) ? Number(vendas.rows[0].total)/Number(pedidos.rows[0].total) : 0, clientesNovos: clientes.rows[0].total, produtosEmEstoque: estoque.rows[0].total, pedidosPendentes: pendentes.rows[0].total, vendasPorPeriodo: chart });
}));

adminRoutes.get('/clientes', asyncHandler(async (_req, res) => {
  const { rows } = await query('select u.id,u.nome,u.email,u.telefone,u.created_at,coalesce(sum(p.total),0) total_gasto,count(p.id) pedidos from users u left join pedidos p on p.usuario_id=u.id where u.role=$1 group by u.id order by u.created_at desc', ['user']);
  res.json(rows);
}));

adminRoutes.get('/cupons', asyncHandler(async (_req,res)=>{ const {rows}=await query('select * from cupons_desconto order by created_at desc'); res.json(rows); }));
adminRoutes.post('/cupons', asyncHandler(async (req,res)=>{ const d=z.object({codigo:z.string(),descricao:z.string(),tipo:z.enum(['percentual','fixo']),valor:z.number(),uso_maximo:z.number().int(),data_inicio:z.string(),data_fim:z.string(),ativo:z.boolean().default(true)}).parse(req.body); const {rows}=await query('insert into cupons_desconto(codigo,descricao,tipo,valor,uso_maximo,data_inicio,data_fim,ativo) values($1,$2,$3,$4,$5,$6,$7,$8) returning *',[d.codigo,d.descricao,d.tipo,d.valor,d.uso_maximo,d.data_inicio,d.data_fim,d.ativo]); res.status(201).json(rows[0]); }));

adminRoutes.get('/avaliacoes', asyncHandler(async (_req,res)=>{ const {rows}=await query('select a.*,p.nome produto_nome,u.nome cliente_nome from avaliacoes a join produtos p on p.id=a.produto_id join users u on u.id=a.usuario_id order by a.created_at desc'); res.json(rows); }));
adminRoutes.put('/avaliacoes/:id', asyncHandler(async (req,res)=>{ const {verificado,comentario}=z.object({verificado:z.boolean().optional(),comentario:z.string().optional()}).parse(req.body); const {rows}=await query('update avaliacoes set verificado=coalesce($1,verificado), comentario=coalesce($2,comentario) where id=$3 returning *',[verificado,comentario,req.params.id]); res.json(rows[0]); }));
adminRoutes.delete('/avaliacoes/:id', asyncHandler(async (req,res)=>{ await query('delete from avaliacoes where id=$1',[req.params.id]); res.json({ok:true}); }));

adminRoutes.get('/configuracoes', asyncHandler(async (_req,res)=>{ const {rows}=await query('select * from configuracoes_site order by chave'); res.json(rows); }));
adminRoutes.put('/configuracoes/:chave', asyncHandler(async (req,res)=>{ const d=z.object({valor:z.string(),tipo:z.enum(['texto','numero','booleano','json']).default('texto')}).parse(req.body); const {rows}=await query('insert into configuracoes_site(chave,valor,tipo) values($1,$2,$3) on conflict(chave) do update set valor=excluded.valor,tipo=excluded.tipo,updated_at=now() returning *',[req.params.chave,d.valor,d.tipo]); res.json(rows[0]); }));

adminRoutes.get('/contatos', asyncHandler(async (_req,res)=>{ const {rows}=await query('select * from contatos_formulario order by created_at desc'); res.json(rows); }));
adminRoutes.put('/contatos/:id', asyncHandler(async (req,res)=>{ const d=z.object({respondido:z.boolean(),resposta:z.string().optional()}).parse(req.body); const {rows}=await query('update contatos_formulario set respondido=$1,resposta=$2 where id=$3 returning *',[d.respondido,d.resposta||'',req.params.id]); res.json(rows[0]); }));

adminRoutes.get('/usuarios', asyncHandler(async (_req,res)=>{ const {rows}=await query('select id,nome,email,role,created_at from users order by created_at desc'); res.json(rows); }));
adminRoutes.put('/usuarios/:id', asyncHandler(async (req,res)=>{ const d=z.object({role:z.enum(['user','admin'])}).parse(req.body); const {rows}=await query('update users set role=$1,updated_at=now() where id=$2 returning id,nome,email,role,created_at',[d.role,req.params.id]); res.json(rows[0]); }));


adminRoutes.post('/pedidos/manual', asyncHandler(async (req,res)=>{
  const d=z.object({
    cliente_nome:z.string().min(2),
    cliente_email:z.string().email().optional().or(z.literal('')),
    cliente_telefone:z.string().optional().default(''),
    descricao:z.string().min(3),
    total:z.number().min(0),
    status:z.enum(['pendente','confirmado','em_producao','pronto','enviado','entregue','cancelado']).default('pendente'),
    status_pagamento:z.enum(['pendente','confirmado','recusado']).default('pendente'),
    endereco_entrega:z.string().optional().default('A combinar'),
    observacoes:z.string().optional().default('Pedido registrado manualmente no painel administrativo.')
  }).parse(req.body);
  const numero=`MAN${Date.now()}`;
  const {rows}=await query("insert into pedidos(usuario_id,numero_pedido,status,subtotal,frete,desconto,total,metodo_pagamento,status_pagamento,endereco_entrega,observacoes,data_entrega_estimada,cliente_nome,cliente_email,cliente_telefone,origem) values(null,$1,$2,$3,0,0,$3,$4,$5,$6,$7,current_date + interval '7 days',$8,$9,$10,$11) returning *",[numero,d.status,d.total,'manual',d.status_pagamento,d.endereco_entrega,d.observacoes,d.cliente_nome,d.cliente_email||'',d.cliente_telefone,'manual']);
  await query('insert into itens_pedido(pedido_id,produto_id,quantidade,preco_unitario,especificacoes) values($1,(select id from produtos limit 1),1,$2,$3)',[rows[0].id,d.total,JSON.stringify({descricao:d.descricao})]);
  res.status(201).json(rows[0]);
}));

adminRoutes.get('/pedidos/:id/recibo', asyncHandler(async (req,res)=>{
  const {rows}=await query('select * from pedidos where id::text=$1 or numero_pedido=$1 limit 1',[req.params.id]);
  const pedido=rows[0];
  if(!pedido) return res.status(404).json({message:'Pedido não encontrado.'});
  const {rows:itens}=await query('select i.*,p.nome from itens_pedido i left join produtos p on p.id=i.produto_id where i.pedido_id=$1',[pedido.id]);
  res.json({pedido,itens,recibo:{empresa:'Gráfica W Criações',whatsapp:'88 99624-0470',emitido_em:new Date().toISOString()}});
}));

adminRoutes.get('/relatorios/vendas', asyncHandler(async (_req,res)=>{ const {rows}=await query("select date(created_at) data, count(*) pedidos, sum(total)::numeric(10,2) vendas from pedidos group by 1 order by 1 desc limit 90"); res.json(rows); }));
