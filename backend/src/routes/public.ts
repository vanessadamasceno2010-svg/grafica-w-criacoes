import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/http.js';
import { restEq, supabaseRest } from '../lib/supabaseRest.js';
import { sendMail } from '../services/mail.js';

export const publicRoutes = Router();

publicRoutes.get('/configuracoes', asyncHandler(async (_req, res) => {
  const rows = await supabaseRest<any[]>('/configuracoes_site?select=chave,valor,tipo');
  res.json(Object.fromEntries((rows || []).map((r: any) => [r.chave, r.valor])));
}));

publicRoutes.get('/acompanhar/:numero', asyncHandler(async (req, res) => {
  const numero = restEq(req.params.numero);
  const email = String(req.query.email || '').trim().toLowerCase();

  let path = `/pedidos?select=*&numero_pedido=eq.${numero}&limit=1`;
  if (email) path += `&cliente_email=eq.${restEq(email)}`;

  const rows = await supabaseRest<any[]>(path);
  const pedido = rows[0];

  if (!pedido) return res.status(404).json({ message: 'Pedido não encontrado.' });

  res.json({
    id: pedido.id,
    numero_pedido: pedido.numero_pedido,
    cliente_nome: pedido.cliente_nome,
    status: pedido.status,
    status_pagamento: pedido.status_pagamento,
    total: pedido.total,
    valor_entrada: pedido.valor_entrada || 0,
    valor_restante: pedido.valor_restante || 0,
    prazo_entrega: pedido.prazo_entrega || pedido.data_entrega_estimada || null,
    created_at: pedido.created_at,
    updated_at: pedido.updated_at
  });
}));

publicRoutes.post('/contatos', asyncHandler(async (req, res) => {
  const d = z.object({
    nome: z.string(),
    email: z.string().email(),
    telefone: z.string().optional(),
    assunto: z.string(),
    mensagem: z.string()
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

  await sendMail(d.email, 'Mensagem recebida', '<p>Recebemos sua mensagem e responderemos em breve.</p>').catch(() => null);
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
