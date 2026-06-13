import { Router } from 'express';
import { z } from 'zod';
import { auth, staff } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';
import { restEq, supabaseRest } from '../lib/supabaseRest.js';

export const orderRoutes = Router();

function canSeeAll(req: any) {
  return ['admin', 'funcionario', 'staff', 'employee'].includes(String(req.user?.role || ''));
}

function prazoStatus(pedido: any) {
  const raw = pedido.prazo_entrega || pedido.data_entrega_estimada;
  if (!raw) return 'sem_prazo';

  const prazo = new Date(raw);
  if (Number.isNaN(prazo.getTime())) return 'sem_prazo';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  prazo.setHours(0, 0, 0, 0);

  const diff = Math.ceil((prazo.getTime() - today.getTime()) / 86400000);
  if (diff < 0 && !['entregue', 'cancelado'].includes(String(pedido.status))) return 'atrasado';
  if (diff <= 2) return 'atenção';
  return 'no_prazo';
}

orderRoutes.get('/pedidos', auth, asyncHandler(async (req, res) => {
  let path = '/pedidos?select=*&order=created_at.desc&limit=500';

  if (!canSeeAll(req)) {
    path += `&usuario_id=eq.${restEq(req.user!.id)}`;
  }

  const rows = await supabaseRest<any[]>(path);
  res.json(rows.map((p) => ({ ...p, prazo_status: prazoStatus(p) })));
}));

orderRoutes.post('/pedidos', auth, asyncHandler(async (req, res) => {
  const d = z.object({
    items: z.array(z.any()).optional().default([]),
    subtotal: z.number().optional().default(0),
    frete: z.number().optional().default(0),
    desconto: z.number().optional().default(0),
    total: z.number().optional().default(0),
    valor_entrada: z.number().optional().default(0),
    valor_restante: z.number().optional(),
    metodo_pagamento: z.string().optional().default('whatsapp'),
    status_pagamento: z.string().optional().default('pendente'),
    endereco_entrega: z.string().optional().default('A combinar'),
    observacoes: z.string().optional().default(''),
    cliente_nome: z.string().optional(),
    cliente_email: z.string().optional(),
    cliente_telefone: z.string().optional(),
    prazo_entrega: z.string().optional().default('')
  }).parse(req.body);

  const numero = `WC${Date.now()}`;
  const total = d.total || d.subtotal;
  const entrada = Number(d.valor_entrada || 0);
  const restante = d.valor_restante !== undefined ? Number(d.valor_restante) : Math.max(total - entrada, 0);
  const statusPagamento = d.status_pagamento || (restante <= 0 && total > 0 ? 'confirmado' : entrada > 0 ? 'parcial' : 'pendente');
  const prazo = d.prazo_entrega || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const pedidos = await supabaseRest<any[]>('/pedidos', {
    method: 'POST',
    body: JSON.stringify({
      usuario_id: req.user!.id,
      numero_pedido: numero,
      status: 'pendente',
      subtotal: d.subtotal,
      frete: d.frete,
      desconto: d.desconto,
      total,
      valor_entrada: entrada,
      valor_restante: restante,
      metodo_pagamento: d.metodo_pagamento,
      status_pagamento: statusPagamento,
      endereco_entrega: d.endereco_entrega,
      observacoes: d.observacoes,
      cliente_nome: d.cliente_nome || req.user!.nome || '',
      cliente_email: d.cliente_email || req.user!.email || '',
      cliente_telefone: d.cliente_telefone || '',
      origem: 'site',
      data_entrega_estimada: prazo,
      prazo_entrega: prazo,
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

  res.status(201).json({ ...pedido, prazo_status: prazoStatus(pedido) });
}));

orderRoutes.put('/pedidos/:id', auth, staff, asyncHandler(async (req, res) => {
  const d = z.object({
    status: z.string().optional(),
    status_pagamento: z.string().optional(),
    observacoes: z.string().optional(),
    valor_entrada: z.number().optional(),
    prazo_entrega: z.string().optional(),
    data_entrega_estimada: z.string().optional(),
    assinatura_url: z.string().optional(),
    logo_documento_url: z.string().optional()
  }).parse(req.body);

  const atualRows = await supabaseRest<any[]>(`/pedidos?select=id,total&id=eq.${restEq(req.params.id)}&limit=1`);
  const pedidoAtual = atualRows[0] || {};
  const total = Number(pedidoAtual.total || 0);
  const entrada = Number(d.valor_entrada || 0);
  const valor_restante = Math.max(total - entrada, 0);
  const status_pagamento = d.status_pagamento || (total > 0 && valor_restante <= 0 ? 'confirmado' : entrada > 0 ? 'parcial' : 'pendente');

  const rows = await supabaseRest<any[]>(`/pedidos?id=eq.${restEq(req.params.id)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      ...d,
      valor_entrada: entrada,
      valor_restante,
      status_pagamento,
      data_entrega_estimada: d.data_entrega_estimada || d.prazo_entrega || null,
      prazo_entrega: d.prazo_entrega || d.data_entrega_estimada || null,
      updated_at: new Date().toISOString()
    })
  });

  res.json(rows[0] ? { ...rows[0], prazo_status: prazoStatus(rows[0]) } : { ok: true });
}));
