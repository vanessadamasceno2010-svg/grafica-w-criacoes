import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { auth, admin } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';
import { restEq, supabaseRest } from '../lib/supabaseRest.js';

export const adminRoutes = Router();

function isStaff(user: any) {
  return ['admin', 'funcionario', 'staff', 'employee'].includes(String(user?.role || '').toLowerCase());
}

function requireStaff(req: any, res: any, next: any) {
  if (!req.user || !isStaff(req.user)) return res.status(403).json({ message: 'Acesso restrito.' });
  return next();
}

function onlyAdmin(req: any, res: any, next: any) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Acesso restrito ao administrador.' });
  return next();
}

function asNumber(value: any) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function dateOnly(value: any) {
  if (!value) return '';
  return String(value).slice(0, 10);
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

adminRoutes.use(auth);
adminRoutes.use(requireStaff);

adminRoutes.get('/dashboard', asyncHandler(async (req, res) => {
  const status = String(req.query.status || 'todos');
  const dateFrom = String(req.query.date_from || '');
  const dateTo = String(req.query.date_to || '');

  let path = '/pedidos?select=id,total,valor_entrada,valor_restante,status,status_pagamento,prazo_entrega,created_at&limit=2000&order=created_at.desc';
  if (status && status !== 'todos') path += `&status=eq.${restEq(status)}`;
  if (dateFrom) path += `&created_at=gte.${restEq(dateFrom + 'T00:00:00')}`;
  if (dateTo) path += `&created_at=lte.${restEq(dateTo + 'T23:59:59')}`;

  const [pedidos, users, produtos] = await Promise.all([
    supabaseRest<any[]>(path),
    supabaseRest<any[]>('/users?select=id,role,created_at&limit=2000'),
    supabaseRest<any[]>('/produtos?select=id,estoque,ativo&limit=2000')
  ]);

  const totalVendido = pedidos.reduce((sum, p) => sum + asNumber(p.total), 0);
  const totalRecebido = pedidos.reduce((sum, p) => sum + asNumber(p.valor_entrada || (p.status_pagamento === 'confirmado' ? p.total : 0)), 0);
  const totalAReceber = pedidos.reduce((sum, p) => sum + asNumber(p.valor_restante || Math.max(asNumber(p.total) - asNumber(p.valor_entrada), 0)), 0);

  res.json({
    vendasMes: totalVendido,
    pedidosMes: pedidos.length,
    ticketMedio: pedidos.length ? totalVendido / pedidos.length : 0,
    valoresRecebidos: totalRecebido,
    valoresAReceber: totalAReceber,
    clientesNovos: users.filter((u) => u.role === 'user').length,
    produtosEmEstoque: produtos.reduce((sum, p) => sum + asNumber(p.estoque), 0),
    pedidosPendentes: pedidos.filter((p) => ['pendente', 'confirmado', 'em_producao'].includes(p.status)).length,
    pedidosAtrasados: pedidos.filter((p) => p.prazo_entrega && dateOnly(p.prazo_entrega) < dateOnly(new Date().toISOString()) && !['entregue', 'cancelado'].includes(p.status)).length,
    pedidosRecentes: pedidos.slice(0, 8)
  });
}));

adminRoutes.get('/clientes', asyncHandler(async (_req, res) => {
  const users = await supabaseRest<any[]>('/users?select=id,nome,email,telefone,role,created_at&role=eq.user&order=created_at.desc&limit=1000');
  const pedidos = await supabaseRest<any[]>('/pedidos?select=id,usuario_id,total&limit=2000').catch(() => []);

  res.json(users.map((u) => {
    const userOrders = pedidos.filter((p) => p.usuario_id === u.id);
    return { ...u, total_gasto: userOrders.reduce((sum, p) => sum + asNumber(p.total), 0), pedidos: userOrders.length };
  }));
}));

adminRoutes.post('/clientes', onlyAdmin, asyncHandler(async (req, res) => {
  const d = z.object({ nome: z.string().min(2), email: z.string().email(), telefone: z.string().optional().default(''), senha: z.string().min(6).optional().default('12345678') }).parse(req.body);
  const senhaHash = await bcrypt.hash(d.senha, 10);
  const rows = await supabaseRest<any[]>('/users', { method: 'POST', body: JSON.stringify({ nome: d.nome, email: d.email.toLowerCase(), telefone: d.telefone, senha: senhaHash, role: 'user', funcionario_permissoes: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() }) });
  res.status(201).json(rows[0]);
}));

adminRoutes.put('/clientes/:id', onlyAdmin, asyncHandler(async (req, res) => {
  const d = z.object({ nome: z.string().min(2).optional(), email: z.string().email().optional(), telefone: z.string().optional() }).parse(req.body);
  const rows = await supabaseRest<any[]>(`/users?id=eq.${restEq(req.params.id)}`, { method: 'PATCH', body: JSON.stringify({ ...d, updated_at: new Date().toISOString() }) });
  res.json(rows[0] || { ok: true });
}));

adminRoutes.put('/clientes/:id/redefinir-senha', onlyAdmin, asyncHandler(async (req, res) => {
  const d = z.object({ senha: z.string().min(6) }).parse(req.body);
  const senhaHash = await bcrypt.hash(d.senha, 10);
  await supabaseRest(`/users?id=eq.${restEq(req.params.id)}`, { method: 'PATCH', body: JSON.stringify({ senha: senhaHash, updated_at: new Date().toISOString() }) });
  res.json({ ok: true });
}));

adminRoutes.delete('/clientes/:id', onlyAdmin, asyncHandler(async (req, res) => {
  await supabaseRest(`/users?id=eq.${restEq(req.params.id)}`, { method: 'DELETE' });
  res.json({ ok: true });
}));

adminRoutes.get('/configuracoes', onlyAdmin, asyncHandler(async (_req, res) => {
  res.json(await supabaseRest<any[]>('/configuracoes_site?select=*&order=chave.asc'));
}));

adminRoutes.put('/configuracoes/:chave', onlyAdmin, asyncHandler(async (req, res) => {
  const d = z.object({ valor: z.string().optional().default(''), tipo: z.string().optional().default('texto') }).parse(req.body);
  const chave = req.params.chave;
  const existing = await supabaseRest<any[]>(`/configuracoes_site?select=id&chave=eq.${restEq(chave)}&limit=1`);
  let rows: any[];

  if (existing[0]) {
    rows = await supabaseRest<any[]>(`/configuracoes_site?chave=eq.${restEq(chave)}`, { method: 'PATCH', body: JSON.stringify({ valor: d.valor, tipo: d.tipo, updated_at: new Date().toISOString() }) });
  } else {
    rows = await supabaseRest<any[]>('/configuracoes_site', { method: 'POST', body: JSON.stringify({ chave, valor: d.valor, tipo: d.tipo, updated_at: new Date().toISOString() }) });
  }
  res.json(rows[0] || { ok: true });
}));

adminRoutes.get('/usuarios', onlyAdmin, asyncHandler(async (_req, res) => {
  res.json(await supabaseRest<any[]>('/users?select=id,nome,email,telefone,role,funcionario_permissoes,created_at&order=created_at.desc'));
}));

adminRoutes.put('/usuarios/:id', onlyAdmin, asyncHandler(async (req, res) => {
  const d = z.object({
    nome: z.string().optional(),
    telefone: z.string().optional(),
    role: z.enum(['user', 'admin', 'funcionario', 'inactive']).optional(),
    funcionario_permissoes: z.array(z.string()).optional().default([])
  }).parse(req.body);

  const rows = await supabaseRest<any[]>(`/users?id=eq.${restEq(req.params.id)}`, { method: 'PATCH', body: JSON.stringify({ ...d, updated_at: new Date().toISOString() }) });
  res.json(rows[0] || { ok: true });
}));

adminRoutes.put('/usuarios/:id/redefinir-senha', onlyAdmin, asyncHandler(async (req, res) => {
  const d = z.object({ senha: z.string().min(6) }).parse(req.body);
  const senhaHash = await bcrypt.hash(d.senha, 10);
  await supabaseRest(`/users?id=eq.${restEq(req.params.id)}`, { method: 'PATCH', body: JSON.stringify({ senha: senhaHash, updated_at: new Date().toISOString() }) });
  res.json({ ok: true });
}));

adminRoutes.delete('/usuarios/:id', onlyAdmin, asyncHandler(async (req, res) => {
  await supabaseRest(`/users?id=eq.${restEq(req.params.id)}`, { method: 'DELETE' });
  res.json({ ok: true });
}));

adminRoutes.post('/pedidos/manual', asyncHandler(async (req, res) => {
  const d = z.object({
    usuario_id: z.string().uuid().optional().nullable(),
    cliente_nome: z.string().min(2),
    cliente_email: z.string().optional().default(''),
    cliente_telefone: z.string().optional().default(''),
    descricao: z.string().min(3),
    total: z.number().min(0),
    valor_entrada: z.number().optional().default(0),
    status: z.string().optional().default('pendente'),
    status_pagamento: z.string().optional().default('pendente'),
    prazo_entrega: z.string().optional().nullable(),
    endereco_entrega: z.string().optional().default('A combinar'),
    observacoes: z.string().optional().default('Pedido registrado manualmente no painel administrativo.')
  }).parse(req.body);

  const restante = Math.max(asNumber(d.total) - asNumber(d.valor_entrada), 0);
  const numero = `MAN${Date.now()}`;

  const pedidos = await supabaseRest<any[]>('/pedidos', {
    method: 'POST',
    body: JSON.stringify({
      usuario_id: d.usuario_id || null,
      numero_pedido: numero,
      status: d.status,
      subtotal: d.total,
      frete: 0,
      desconto: 0,
      total: d.total,
      valor_entrada: d.valor_entrada,
      valor_restante: restante,
      metodo_pagamento: 'manual',
      status_pagamento: d.status_pagamento,
      endereco_entrega: d.endereco_entrega,
      observacoes: d.observacoes,
      prazo_entrega: d.prazo_entrega || null,
      data_entrega_estimada: d.prazo_entrega || null,
      cliente_nome: d.cliente_nome,
      cliente_email: d.cliente_email,
      cliente_telefone: d.cliente_telefone,
      origem: 'manual',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  });

  const pedido = pedidos[0];
  await registrarHistorico(pedido.id, req.user, 'criou pedido', 'pedido', '', numero);
  res.status(201).json(pedido);
}));

adminRoutes.get('/pedidos/:id/historico', asyncHandler(async (req, res) => {
  const rows = await supabaseRest<any[]>(`/pedido_historico?select=*&pedido_id=eq.${restEq(req.params.id)}&order=created_at.desc`);
  res.json(rows);
}));

adminRoutes.get('/pedidos/:id/documento', asyncHandler(async (req, res) => {
  let pedidoRows = await supabaseRest<any[]>(`/pedidos?select=*&id=eq.${restEq(req.params.id)}&limit=1`);
  if (!pedidoRows[0]) pedidoRows = await supabaseRest<any[]>(`/pedidos?select=*&numero_pedido=eq.${restEq(req.params.id)}&limit=1`);
  const pedido = pedidoRows[0];
  if (!pedido) return res.status(404).json({ message: 'Pedido não encontrado.' });

  const itens = await supabaseRest<any[]>(`/itens_pedido?select=*&pedido_id=eq.${restEq(pedido.id)}`).catch(() => []);
  const configs = await supabaseRest<any[]>('/configuracoes_site?select=chave,valor').catch(() => []);
  const cfg = Object.fromEntries((configs || []).map((c: any) => [c.chave, c.valor]));
  const pago = pedido.status_pagamento === 'confirmado' || asNumber(pedido.valor_restante) <= 0;

  res.json({
    tipo: pago ? 'recibo' : 'ordem_servico',
    pedido,
    itens,
    empresa: {
      nome: cfg.nome_empresa || 'Gráfica W Criações',
      whatsapp: cfg.whatsapp || '88 99624-0470',
      email: cfg.email || '',
      endereco: cfg.endereco || '',
      logo: cfg.logo_documento_url || cfg.logo_site_url || '/assets/logo-wide.jpeg',
      assinatura: cfg.assinatura_url || ''
    },
    emitido_em: new Date().toISOString()
  });
}));

adminRoutes.get('/pedidos/:id/recibo', asyncHandler(async (req, res) => {
  const data: any = await new Promise((resolve, reject) => {
    const fakeRes = { json: resolve, status: () => ({ json: reject }) } as any;
    const fakeReq = { ...req, params: req.params } as any;
    // fallback simples: reutilização não é necessária no runtime normal, mantido por compatibilidade
    resolve(null);
  });
  if (data) return res.json(data);

  let pedidoRows = await supabaseRest<any[]>(`/pedidos?select=*&id=eq.${restEq(req.params.id)}&limit=1`);
  const pedido = pedidoRows[0];
  if (!pedido) return res.status(404).json({ message: 'Pedido não encontrado.' });
  if (!(pedido.status_pagamento === 'confirmado' || asNumber(pedido.valor_restante) <= 0)) {
    return res.status(400).json({ message: 'Recibo disponível somente após confirmação do pagamento. Gere uma Ordem de Serviço.' });
  }
  res.json({ pedido, itens: [], recibo: { empresa: 'Gráfica W Criações', emitido_em: new Date().toISOString() } });
}));

adminRoutes.get('/cupons', onlyAdmin, asyncHandler(async (_req, res) => {
  res.json(await supabaseRest<any[]>('/cupons_desconto?select=*&order=created_at.desc'));
}));

adminRoutes.get('/avaliacoes', asyncHandler(async (_req, res) => {
  res.json(await supabaseRest<any[]>('/avaliacoes?select=*&order=created_at.desc'));
}));

adminRoutes.get('/relatorios/vendas', onlyAdmin, asyncHandler(async (_req, res) => {
  const rows = await supabaseRest<any[]>('/pedidos?select=created_at,total&order=created_at.desc&limit=90');
  res.json(rows.map((r) => ({ data: new Date(r.created_at).toLocaleDateString('pt-BR'), vendas: asNumber(r.total), pedidos: 1 })));
}));
