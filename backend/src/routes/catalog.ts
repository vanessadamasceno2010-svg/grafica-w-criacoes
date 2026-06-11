import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { auth, admin } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';

export const catalogRoutes = Router();

catalogRoutes.get('/categorias', asyncHandler(async (_req, res) => {
  const { rows } = await query('select * from categorias where ativo=true order by ordem asc, nome asc');
  res.json(rows);
}));

catalogRoutes.post('/categorias', auth, admin, asyncHandler(async (req, res) => {
  const data = z.object({ nome: z.string(), descricao: z.string().optional(), slug: z.string(), imagem_url: z.string().optional(), ordem: z.number().default(0), ativo: z.boolean().default(true) }).parse(req.body);
  const { rows } = await query('insert into categorias(nome,descricao,slug,imagem_url,ordem,ativo) values($1,$2,$3,$4,$5,$6) returning *', [data.nome, data.descricao || '', data.slug, data.imagem_url || '', data.ordem, data.ativo]);
  res.status(201).json(rows[0]);
}));

catalogRoutes.get('/produtos', asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 12), 1), 50);
  const offset = (page - 1) * limit;
  const busca = String(req.query.busca || '');
  const categoria = String(req.query.categoria || '');
  const params: unknown[] = [];
  const where = ['p.ativo=true'];
  if (busca) { params.push(`%${busca}%`); where.push(`(p.nome ilike $${params.length} or p.sku ilike $${params.length})`); }
  if (categoria) { params.push(categoria); where.push(`c.slug=$${params.length}`); }
  params.push(limit, offset);
  const sql = `select p.*, c.nome as categoria_nome, c.slug as categoria_slug, coalesce(avg(a.nota),0)::numeric(3,2) as avaliacao_media, count(a.id)::int as avaliacoes_total from produtos p left join categorias c on c.id=p.categoria_id left join avaliacoes a on a.produto_id=p.id where ${where.join(' and ')} group by p.id,c.nome,c.slug order by p.destaque desc,p.created_at desc limit $${params.length-1} offset $${params.length}`;
  const { rows } = await query(sql, params);
  res.json({ data: rows, page, limit });
}));

catalogRoutes.get('/produtos/:idOrSlug', asyncHandler(async (req, res) => {
  const idOrSlug = req.params.idOrSlug;
  const { rows } = await query('select p.*, c.nome categoria_nome, c.slug categoria_slug from produtos p left join categorias c on c.id=p.categoria_id where p.id::text=$1 or p.slug=$1 limit 1', [idOrSlug]);
  if (!rows[0]) throw new HttpError(404, 'Produto não encontrado.');
  await query('update produtos set visualizacoes=visualizacoes+1 where id=$1', [rows[0].id]);
  res.json(rows[0]);
}));

const productSchema = z.object({ categoria_id: z.string().uuid(), nome: z.string(), descricao: z.string(), descricao_longa: z.string().optional(), preco: z.number(), preco_original: z.number().optional(), estoque: z.number().int(), imagem_principal: z.string(), imagens_adicionais: z.any().default([]), especificacoes: z.any().default({}), slug: z.string(), sku: z.string(), peso: z.number().optional(), dimensoes: z.any().default({}), tempo_producao: z.number().int().default(3), destaque: z.boolean().default(false), ativo: z.boolean().default(true) });

catalogRoutes.post('/produtos', auth, admin, asyncHandler(async (req, res) => {
  const p = productSchema.parse(req.body);
  const { rows } = await query('insert into produtos(categoria_id,nome,descricao,descricao_longa,preco,preco_original,estoque,imagem_principal,imagens_adicionais,especificacoes,slug,sku,peso,dimensoes,tempo_producao,destaque,ativo) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) returning *', [p.categoria_id,p.nome,p.descricao,p.descricao_longa||'',p.preco,p.preco_original||null,p.estoque,p.imagem_principal,JSON.stringify(p.imagens_adicionais),JSON.stringify(p.especificacoes),p.slug,p.sku,p.peso||0,JSON.stringify(p.dimensoes),p.tempo_producao,p.destaque,p.ativo]);
  res.status(201).json(rows[0]);
}));

catalogRoutes.put('/produtos/:id', auth, admin, asyncHandler(async (req, res) => {
  const p = productSchema.partial().parse(req.body);
  const keys = Object.keys(p);
  if (!keys.length) return res.json({ ok: true });
  const sets = keys.map((k, i) => `${k}=$${i+1}`).join(', ');
  const values = keys.map(k => ['imagens_adicionais','especificacoes','dimensoes'].includes(k) ? JSON.stringify((p as any)[k]) : (p as any)[k]);
  values.push(req.params.id);
  const { rows } = await query(`update produtos set ${sets}, updated_at=now() where id=$${values.length} returning *`, values);
  res.json(rows[0]);
}));

catalogRoutes.delete('/produtos/:id', auth, admin, asyncHandler(async (req, res) => {
  await query('delete from produtos where id=$1', [req.params.id]);
  res.json({ ok: true });
}));
