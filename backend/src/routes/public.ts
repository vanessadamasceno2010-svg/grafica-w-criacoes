import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/http.js';
import { restEq, supabaseRest } from '../lib/supabaseRest.js';

export const publicRoutes = Router();

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

publicRoutes.get('/configuracoes', asyncHandler(async (_req, res) => {
  const rows = await supabaseRest<any[]>('/configuracoes_site?select=chave,valor,tipo&order=chave.asc');
  const config: Record<string, string> = {};

  for (const item of rows || []) {
    config[item.chave] = item.valor || '';
  }

  res.json(config);
}));

publicRoutes.get('/pedidos/acompanhar', asyncHandler(async (req, res) => {
  const numero = String(req.query.numero || '').trim();
  const email = String(req.query.email || '').trim().toLowerCase();

  if (!numero) {
    return res.status(400).json({ message: 'Informe o código do pedido.' });
  }

  let path = `/pedidos?select=id,numero_pedido,status,status_pagamento,total,valor_entrada,valor_restante,cliente_nome,cliente_email,cliente_telefone,prazo_entrega,data_entrega_estimada,created_at&numero_pedido=eq.${restEq(numero)}&limit=1`;

  const rows = await supabaseRest<any[]>(path);
  const pedido = rows[0];

  if (!pedido) {
    return res.status(404).json({ message: 'Pedido não encontrado.' });
  }

  if (email && String(pedido.cliente_email || '').toLowerCase() !== email) {
    return res.status(404).json({ message: 'Pedido não encontrado para este email.' });
  }

  res.json({ ...pedido, prazo_status: prazoStatus(pedido) });
}));

publicRoutes.post('/contatos', asyncHandler(async (req, res) => {
  const d = z.object({
    nome: z.string().min(2),
    email: z.string().email(),
    telefone: z.string().optional(),
    assunto: z.string().min(2),
    mensagem: z.string().min(3)
  }).parse(req.body);

  const rows = await supabaseRest<any[]>('/contatos_formulario', {
    method: 'POST',
    body: JSON.stringify({
      nome: d.nome,
      email: d.email,
      telefone: d.telefone || '',
      assunto: d.assunto,
      mensagem: d.mensagem,
      respondido: false,
      created_at: new Date().toISOString()
    })
  });

  res.status(201).json(rows[0]);
}));

publicRoutes.post('/avaliacoes', asyncHandler(async (req, res) => {
  const d = z.object({
    produto_id: z.string().uuid(),
    usuario_id: z.string().uuid(),
    nota: z.number().int().min(1).max(5),
    comentario: z.string()
  }).parse(req.body);

  const rows = await supabaseRest<any[]>('/avaliacoes', {
    method: 'POST',
    body: JSON.stringify({
      produto_id: d.produto_id,
      usuario_id: d.usuario_id,
      nota: d.nota,
      comentario: d.comentario,
      verificado: false,
      created_at: new Date().toISOString()
    })
  });

  res.status(201).json(rows[0]);
}));

publicRoutes.get('/avaliacoes/:produto_id', asyncHandler(async (req, res) => {
  const rows = await supabaseRest<any[]>(`/avaliacoes?select=*&produto_id=eq.${restEq(req.params.produto_id)}&order=created_at.desc`);
  res.json(rows);
}));
