import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { auth, admin } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { sendMail } from '../services/mail.js';

export const orderRoutes = Router();
const money = (n: number) => Math.round(n * 100) / 100;

orderRoutes.post('/carrinho', auth, asyncHandler(async (req, res) => {
  const d = z.object({ produto_id: z.string().uuid(), quantidade: z.number().int().min(1), especificacoes_selecionadas: z.any().default({}) }).parse(req.body);
  const { rows: pRows } = await query('select preco from produtos where id=$1 and ativo=true', [d.produto_id]);
  if (!pRows[0]) throw new HttpError(404, 'Produto indisponível.');
  const { rows } = await query('insert into carrinho(usuario_id,produto_id,quantidade,especificacoes_selecionadas,preco_unitario) values($1,$2,$3,$4,$5) returning *', [req.user!.id, d.produto_id, d.quantidade, JSON.stringify(d.especificacoes_selecionadas), pRows[0].preco]);
  res.status(201).json(rows[0]);
}));

orderRoutes.get('/carrinho', auth, asyncHandler(async (req, res) => {
  const { rows } = await query('select c.*, p.nome, p.slug, p.imagem_principal from carrinho c join produtos p on p.id=c.produto_id where c.usuario_id=$1 order by c.created_at desc', [req.user!.id]);
  res.json(rows);
}));

orderRoutes.put('/carrinho/:id', auth, asyncHandler(async (req, res) => {
  const { quantidade } = z.object({ quantidade: z.number().int().min(1) }).parse(req.body);
  const { rows } = await query('update carrinho set quantidade=$1, updated_at=now() where id=$2 and usuario_id=$3 returning *', [quantidade, req.params.id, req.user!.id]);
  res.json(rows[0]);
}));

orderRoutes.delete('/carrinho/:id', auth, asyncHandler(async (req, res) => {
  await query('delete from carrinho where id=$1 and usuario_id=$2', [req.params.id, req.user!.id]);
  res.json({ ok: true });
}));

orderRoutes.post('/cupons/validar', asyncHandler(async (req, res) => {
  const { codigo, subtotal } = z.object({ codigo: z.string(), subtotal: z.number() }).parse(req.body);
  const { rows } = await query('select * from cupons_desconto where upper(codigo)=upper($1) and ativo=true and now() between data_inicio and data_fim and uso_atual < uso_maximo limit 1', [codigo]);
  if (!rows[0]) throw new HttpError(404, 'Cupom inválido ou expirado.');
  const c = rows[0];
  const desconto = c.tipo === 'percentual' ? money(subtotal * Number(c.valor) / 100) : Math.min(Number(c.valor), subtotal);
  res.json({ cupom: c, desconto });
}));

orderRoutes.post('/pedidos', auth, asyncHandler(async (req, res) => {
  const body = z.object({ endereco_entrega: z.string().min(5), observacoes: z.string().optional(), metodo_pagamento: z.string().default('whatsapp'), frete: z.number().default(0), desconto: z.number().default(0) }).parse(req.body);
  const { rows: cart } = await query('select c.*, p.nome, p.estoque from carrinho c join produtos p on p.id=c.produto_id where c.usuario_id=$1', [req.user!.id]);
  if (!cart.length) throw new HttpError(400, 'Carrinho vazio.');
  const subtotal = money(cart.reduce((s: number, i: any) => s + Number(i.preco_unitario) * i.quantidade, 0));
  const total = money(subtotal + body.frete - body.desconto);
  const numero = `GP${Date.now()}`;
  const { rows: pedidoRows } = await query('insert into pedidos(usuario_id,numero_pedido,status,subtotal,frete,desconto,total,metodo_pagamento,status_pagamento,endereco_entrega,observacoes,data_entrega_estimada) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,current_date + interval \'7 days\') returning *', [req.user!.id, numero, 'pendente', subtotal, body.frete, body.desconto, total, body.metodo_pagamento, 'pendente', body.endereco_entrega, body.observacoes || '']);
  const pedido = pedidoRows[0];
  for (const item of cart) await query('insert into itens_pedido(pedido_id,produto_id,quantidade,preco_unitario,especificacoes) values($1,$2,$3,$4,$5)', [pedido.id, item.produto_id, item.quantidade, item.preco_unitario, item.especificacoes_selecionadas]);
  await query('delete from carrinho where usuario_id=$1', [req.user!.id]);
  await sendMail(req.user!.email, `Pedido ${numero} recebido`, `<p>Recebemos seu pedido no valor de R$ ${total.toFixed(2)}.</p>`);
  res.status(201).json(pedido);
}));

orderRoutes.get('/pedidos', auth, asyncHandler(async (req, res) => {
  const isAdmin = req.user!.role === 'admin';
  const { rows } = await query(isAdmin ? 'select p.*, coalesce(p.cliente_nome,u.nome) cliente_nome, coalesce(p.cliente_email,u.email) cliente_email from pedidos p left join users u on u.id=p.usuario_id order by p.created_at desc' : 'select * from pedidos where usuario_id=$1 order by created_at desc', isAdmin ? [] : [req.user!.id]);
  res.json(rows);
}));

orderRoutes.get('/pedidos/:id', auth, asyncHandler(async (req, res) => {
  const { rows } = await query('select * from pedidos where id::text=$1 or numero_pedido=$1 limit 1', [req.params.id]);
  const pedido = rows[0];
  if (!pedido) throw new HttpError(404, 'Pedido não encontrado.');
  if (req.user!.role !== 'admin' && pedido.usuario_id !== req.user!.id) throw new HttpError(403, 'Sem permissão.');
  const { rows: itens } = await query('select i.*, p.nome, p.imagem_principal from itens_pedido i join produtos p on p.id=i.produto_id where i.pedido_id=$1', [pedido.id]);
  res.json({ ...pedido, itens });
}));

orderRoutes.put('/pedidos/:id', auth, admin, asyncHandler(async (req, res) => {
  const d = z.object({ status: z.string().optional(), status_pagamento: z.string().optional(), observacoes: z.string().optional() }).parse(req.body);
  const keys = Object.keys(d); const values = Object.values(d); values.push(req.params.id);
  const sets = keys.map((k,i)=>`${k}=$${i+1}`).join(', ');
  const { rows } = await query(`update pedidos set ${sets}, updated_at=now() where id=$${values.length} returning *`, values);
  res.json(rows[0]);
}));

orderRoutes.delete('/pedidos/:id', auth, admin, asyncHandler(async (req, res) => { await query('delete from pedidos where id=$1', [req.params.id]); res.json({ ok: true }); }));
