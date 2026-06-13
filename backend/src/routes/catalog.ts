import { Router } from 'express';
import { z } from 'zod';
import { auth, admin } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { restEq, slugify, supabaseRest } from '../lib/supabaseRest.js';

export const catalogRoutes = Router();

function normalizeProduct(product: any, categories: any[] = []) {
  const category = categories.find((c) => c.id === product.categoria_id);

  return {
    ...product,
    categoria_nome: product.categoria_nome || category?.nome || 'Sem categoria',
    categoria_slug: product.categoria_slug || category?.slug || '',
    imagens_adicionais: Array.isArray(product.imagens_adicionais)
      ? product.imagens_adicionais
      : [],
    especificacoes:
      product.especificacoes && typeof product.especificacoes === 'object'
        ? product.especificacoes
        : {},
    dimensoes:
      product.dimensoes && typeof product.dimensoes === 'object'
        ? product.dimensoes
        : {},
    preco: Number(product.preco || 0),
    preco_original: product.preco_original ? Number(product.preco_original) : null,
    estoque: Number(product.estoque || 0),
    tempo_producao: Number(product.tempo_producao || 3),
    destaque: Boolean(product.destaque),
    ativo: product.ativo !== false,
    avaliacao_media: Number(product.avaliacao_media || 5),
    avaliacoes_total: Number(product.avaliacoes_total || 0)
  };
}

catalogRoutes.get('/categorias', asyncHandler(async (_req, res) => {
  const rows = await supabaseRest<any[]>(
    '/categorias?select=*&ativo=eq.true&order=ordem.asc,nome.asc'
  );

  res.json(rows);
}));

catalogRoutes.post('/categorias', auth, admin, asyncHandler(async (req, res) => {
  const data = z.object({
    nome: z.string().min(2),
    descricao: z.string().optional().default(''),
    slug: z.string().optional(),
    imagem_url: z.string().optional().default(''),
    ordem: z.number().optional().default(0),
    ativo: z.boolean().optional().default(true)
  }).parse(req.body);

  const rows = await supabaseRest<any[]>('/categorias', {
    method: 'POST',
    body: JSON.stringify({
      nome: data.nome,
      descricao: data.descricao || '',
      slug: data.slug || slugify(data.nome),
      imagem_url: data.imagem_url || '',
      ordem: data.ordem || 0,
      ativo: data.ativo,
      created_at: new Date().toISOString()
    })
  });

  res.status(201).json(rows[0]);
}));

catalogRoutes.put('/categorias/:id', auth, admin, asyncHandler(async (req, res) => {
  const data = z.object({
    nome: z.string().optional(),
    descricao: z.string().optional(),
    slug: z.string().optional(),
    imagem_url: z.string().optional(),
    ordem: z.number().optional(),
    ativo: z.boolean().optional()
  }).parse(req.body);

  const payload = {
    ...data,
    updated_at: new Date().toISOString()
  };

  const rows = await supabaseRest<any[]>(
    `/categorias?id=eq.${restEq(req.params.id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }
  );

  res.json(rows[0] || { ok: true });
}));

catalogRoutes.delete('/categorias/:id', auth, admin, asyncHandler(async (req, res) => {
  await supabaseRest(
    `/categorias?id=eq.${restEq(req.params.id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        ativo: false,
        updated_at: new Date().toISOString()
      })
    }
  );

  res.json({ ok: true });
}));

catalogRoutes.get('/produtos', asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 12), 1), 100);
  const offset = (page - 1) * limit;
  const busca = String(req.query.busca || '').trim();
  const categoria = String(req.query.categoria || '').trim();

  const categories = await supabaseRest<any[]>(
    '/categorias?select=id,nome,slug&ativo=eq.true'
  );

  let path =
    `/produtos?select=*&ativo=eq.true&order=destaque.desc,created_at.desc&limit=${limit}&offset=${offset}`;

  if (busca) {
    const term = encodeURIComponent(`*${busca}*`);
    path += `&or=(nome.ilike.${term},descricao.ilike.${term},sku.ilike.${term})`;
  }

  if (categoria) {
    const cat = categories.find((c) => c.slug === categoria || c.id === categoria);
    if (cat?.id) {
      path += `&categoria_id=eq.${restEq(cat.id)}`;
    }
  }

  const products = await supabaseRest<any[]>(path);
  const data = products.map((p) => normalizeProduct(p, categories));

  res.json({ data, page, limit });
}));

catalogRoutes.get('/produtos/:idOrSlug', asyncHandler(async (req, res) => {
  const idOrSlug = req.params.idOrSlug;
  const categories = await supabaseRest<any[]>('/categorias?select=id,nome,slug');

  const products = await supabaseRest<any[]>(
    `/produtos?select=*&or=(id.eq.${restEq(idOrSlug)},slug.eq.${restEq(idOrSlug)})&limit=1`
  );

  const product = products[0];

  if (!product) {
    throw new HttpError(404, 'Produto não encontrado.');
  }

  await supabaseRest(
    `/produtos?id=eq.${restEq(product.id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        visualizacoes: Number(product.visualizacoes || 0) + 1,
        updated_at: new Date().toISOString()
      })
    }
  ).catch(() => null);

  res.json(normalizeProduct(product, categories));
}));

const productSchema = z.object({
  categoria_id: z.string().uuid(),
  nome: z.string().min(2),
  descricao: z.string().optional().default(''),
  descricao_longa: z.string().optional().default(''),
  preco: z.number(),
  preco_original: z.number().optional().nullable(),
  estoque: z.number().int().optional().default(0),
  imagem_principal: z.string().optional().default(''),
  imagens_adicionais: z.any().optional().default([]),
  especificacoes: z.any().optional().default({}),
  slug: z.string().optional(),
  sku: z.string().optional(),
  peso: z.number().optional().default(0),
  dimensoes: z.any().optional().default({}),
  tempo_producao: z.number().int().optional().default(3),
  destaque: z.boolean().optional().default(false),
  ativo: z.boolean().optional().default(true)
});

catalogRoutes.post('/produtos', auth, admin, asyncHandler(async (req, res) => {
  const p = productSchema.parse(req.body);

  const rows = await supabaseRest<any[]>('/produtos', {
    method: 'POST',
    body: JSON.stringify({
      categoria_id: p.categoria_id,
      nome: p.nome,
      descricao: p.descricao || '',
      descricao_longa: p.descricao_longa || '',
      preco: p.preco,
      preco_original: p.preco_original || null,
      estoque: p.estoque || 0,
      imagem_principal: p.imagem_principal || '',
      imagens_adicionais: p.imagens_adicionais || [],
      especificacoes: p.especificacoes || {},
      slug: p.slug || slugify(p.nome),
      sku: p.sku || `SKU-${Date.now()}`,
      peso: p.peso || 0,
      dimensoes: p.dimensoes || {},
      tempo_producao: p.tempo_producao || 3,
      destaque: p.destaque || false,
      ativo: p.ativo !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  });

  res.status(201).json(rows[0]);
}));

catalogRoutes.put('/produtos/:id', auth, admin, asyncHandler(async (req, res) => {
  const p = productSchema.partial().parse(req.body);

  const payload = {
    ...p,
    updated_at: new Date().toISOString()
  };

  if (payload.nome && !payload.slug) {
    payload.slug = slugify(payload.nome);
  }

  const rows = await supabaseRest<any[]>(
    `/produtos?id=eq.${restEq(req.params.id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }
  );

  res.json(rows[0] || { ok: true });
}));

catalogRoutes.delete('/produtos/:id', auth, admin, asyncHandler(async (req, res) => {
  await supabaseRest(
    `/produtos?id=eq.${restEq(req.params.id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        ativo: false,
        updated_at: new Date().toISOString()
      })
    }
  );

  res.json({ ok: true });
}));
