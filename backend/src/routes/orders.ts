import { Router } from 'express';
import { z } from 'zod';
import { auth, admin } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';
import { restEq, supabaseRest } from '../lib/supabaseRest.js';

export const orderRoutes = Router();

function canSeeAll(req: any) {
  return ['admin', 'funcionario', 'staff', 'employee'].includes(String(req.user?.role || ''));
}

function asNumber(value: any) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

async function registrarHistorico(pedidoId: string, usuario: any, acao: string, campo: string, valorAnterior: any, valorNovo: any) {
  await supabaseRest('/pedido_historico', {
    method: 'POST',
    body: JSON.stringify({
      pedido_id: pedidoId,
      usuario_id: usuario?.id || null,
      usuario_nome: usuario?.nome || usuario?.email || 'Sistema',
      acao,
      campo,
      valor_anterior: valorAnterior === undefined || valorAnterior === null ? '' : String(valorAnterior),
      valor_novo: valorNovo === undefined || valorNovo === null ? '' : String(valorNovo),
      created_at: new Date().toISOString()
    })
  }).catch(() => null);
}

orderRoutes.get('/pedidos', auth, asyncHandler(async (req, res) => {
  let path = '/pedidos?select=*&order=created_at.desc&limit=500';

  if (!canSeeAll(req)) {
    path += `&usuario_id=eq.${restEq(req.user!.id)}`;
  }

  const status = String(req.query.status || '');
  const dateFrom = String(req.query.date_from || '');
  const dateTo = String(req.query.date_to || '');
  if (status && status !== 'todos') path += `&status=eq.${restEq(status)}`;
  if (dateFrom) path += `&created_at=gte.${restEq(dateFrom + 'T00:00:00')}`;
  if (dateTo) path += `&created_at=lte.${restEq(dateTo + 'T23:59:59')}`;

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
    valor_entrada: z.number().optional().default(0),
    metodo_pagamento: z.string().optional().default('whatsapp'),
    status_pagamento: z.string().optional().default('pendente'),
    endereco_entrega: z.string().optional().default('A combinar'),
    observacoes: z.string().optional().default(''),
    cliente_nome: z.string().optional(),
    cliente_email: z.string().optional(),
    cliente_telefone: z.string().optional(),
    prazo_entrega: z.string().optional().nullable()
  }).parse(req.body);

  const numero = `WC${Date.now()}`;
  const total = asNumber(d.total || d.subtotal);
  const valorEntrada = asNumber(d.valor_entrada);
  const valorRestante = Math.max(total - valorEntrada, 0);

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
      valor_entrada: valorEntrada,
      valor_restante: valorRestante,
      metodo_pagamento: d.metodo_pagamento,
      status_pagamento: d.status_pagamento,
      endereco_entrega: d.endereco_entrega,
      observacoes: d.observacoes,
      cliente_nome: d.cliente_nome || req.user!.nome || '',
      cliente_email: d.cliente_email || req.user!.email || '',
      cliente_telefone: d.cliente_telefone || '',
      prazo_entrega: d.prazo_entrega || null,
      origem: 'site',
      data_entrega_estimada: d.prazo_entrega || new Date(Date.now() + 7 * 86400000).toISOString(),
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

  await registrarHistorico(pedido.id, req.user, 'criou pedido', 'pedido', '', numero);
  res.status(201).json(pedido);
}));

orderRoutes.put('/pedidos/:id', auth, admin, asyncHandler(async (req, res) => {
  const d = z.object({
    status: z.string().optional(),
    status_pagamento: z.string().optional(),
    observacoes: z.string().optional(),
    total: z.number().optional(),
    valor_entrada: z.number().optional(),
    prazo_entrega: z.string().optional().nullable(),
    cliente_nome: z.string().optional(),
    cliente_email: z.string().optional(),
    cliente_telefone: z.string().optional()
  }).parse(req.body);

  const oldRows = await supabaseRest<any[]>(`/pedidos?select=*&id=eq.${restEq(req.params.id)}&limit=1`);
  const oldOrder = oldRows[0];

  const total = d.total !== undefined ? asNumber(d.total) : asNumber(oldOrder?.total);
  const entrada = d.valor_entrada !== undefined ? asNumber(d.valor_entrada) : asNumber(oldOrder?.valor_entrada);
  const payload: any = {
    ...d,
    total,
    valor_entrada: entrada,
    valor_restante: Math.max(total - entrada, 0),
    updated_at: new Date().toISOString()
  };

  if (payload.valor_restante <= 0 && !payload.status_pagamento) {
    payload.status_pagamento = 'confirmado';
  }

  const rows = await supabaseRest<any[]>(`/pedidos?id=eq.${restEq(req.params.id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });

  const labels: Record<string, string> = {
    status: 'status',
    status_pagamento: 'status do pagamento',
    observacoes: 'observações',
    total: 'valor total',
    valor_entrada: 'valor pago/entrada',
    valor_restante: 'valor restante',
    prazo_entrega: 'prazo de entrega',
    cliente_nome: 'cliente',
    cliente_email: 'email do cliente',
    cliente_telefone: 'telefone do cliente'
  };

  for (const key of Object.keys(labels)) {
    if (String(oldOrder?.[key] ?? '') !== String(payload[key] ?? oldOrder?.[key] ?? '')) {
      await registrarHistorico(req.params.id, req.user, 'alterou', labels[key], oldOrder?.[key], payload[key]);
    }
  }

  res.json(rows[0] || { ok: true });
}));

orderRoutes.delete('/pedidos/:id', auth, admin, asyncHandler(async (req, res) => {
  await registrarHistorico(req.params.id, req.user, 'excluiu pedido', 'pedido', req.params.id, 'excluído');
  await supabaseRest(`/itens_pedido?pedido_id=eq.${restEq(req.params.id)}`, { method: 'DELETE' }).catch(() => null);
  await supabaseRest(`/pedido_historico?pedido_id=eq.${restEq(req.params.id)}`, { method: 'DELETE' }).catch(() => null);
  await supabaseRest(`/pedidos?id=eq.${restEq(req.params.id)}`, { method: 'DELETE' });
  res.json({ ok: true });
}));
