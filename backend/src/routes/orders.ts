import { Router } from 'express';
import { z } from 'zod';
import { auth, admin } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';
import { restEq, supabaseRest } from '../lib/supabaseRest.js';

export const orderRoutes = Router();

function canSeeAll(req: any) {
  return req.user?.role === 'admin';
}

orderRoutes.get('/pedidos', auth, asyncHandler(async (req, res) => {
  let path = '/pedidos?select=*&order=created_at.desc&limit=100';

  if (!canSeeAll(req)) {
    path += `&usuario_id=eq.${restEq(req.user!.id)}`;
  }

  const rows = await supabaseRest<any[]>(path);
  res.json(rows);
}));

orderRoutes.post('/pedidos', auth, asyncHandler(async (req, res) => {
  const d = z.object({
    items: z.array(z.any()).optional().default([]),
    subtotal: z.number().optional().default(0),
    frete: z.number().optional().default(0),
    desconto: z.number().optional().default(0),
    total: z.number().optional().default(0),
    metodo_pagamento: z.string().optional().default('whatsapp'),
    status_pagamento: z.string().optional().default('pendente'),
    endereco_entrega: z.string().optional().default('A combinar'),
    observacoes: z.string().optional().default(''),
    cliente_nome: z.string().optional(),
    cliente_email: z.string().optional(),
    cliente_telefone: z.string().optional()
  }).parse(req.body);

  const numero = `WC${Date.now()}`;

  const pedidos = await supabaseRest<any[]>('/pedidos', {
    method: 'POST',
    body: JSON.stringify({
      usuario_id: req.user!.id,
      numero_pedido: numero,
      status: 'pendente',
      subtotal: d.subtotal,
      frete: d.frete,
      desconto: d.desconto,
      total: d.total || d.subtotal,
      metodo_pagamento: d.metodo_pagamento,
      status_pagamento: d.status_pagamento,
      endereco_entrega: d.endereco_entrega,
      observacoes: d.observacoes,
      cliente_nome: d.cliente_nome || req.user!.nome || '',
      cliente_email: d.cliente_email || req.user!.email || '',
      cliente_telefone: d.cliente_telefone || '',
      origem: 'site',
      data_entrega_estimada: new Date(Date.now() + 7 * 86400000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  });

  const pedido = pedidos[0];

  for (const item of d.items || []) {
    await supabaseRest('/itens_pedido', {
      method: 'POST',
      body: JSON.stringify({
        pedido_id: pedido.id,
        produto_id: item.produto_id || item.id || null,
        quantidade: Number(item.quantidade || 1),
        preco_unitario: Number(item.preco_unitario || item.preco || 0),
        especificacoes: item.especificacoes_selecionadas || item.especificacoes || {},
        created_at: new Date().toISOString()
      })
    }).catch(() => null);
  }

  res.status(201).json(pedido);
}));

orderRoutes.put('/pedidos/:id', auth, admin, asyncHandler(async (req, res) => {
  const d = z.object({
    status: z.string().optional(),
    status_pagamento: z.string().optional(),
    observacoes: z.string().optional()
  }).parse(req.body);

  const rows = await supabaseRest<any[]>(
    `/pedidos?id=eq.${restEq(req.params.id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        ...d,
        updated_at: new Date().toISOString()
      })
    }
  );

  res.json(rows[0] || { ok: true });
}));
