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
  if (!req.user || !isStaff(req.user)) {
    return res.status(403).json({ message: 'Acesso restrito.' });
  }
  return next();
}

function toDate(value: any) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function applyDateFilter(rows: any[], from?: any, to?: any) {
  const start = toDate(from);
  const end = toDate(to);

  return rows.filter((row) => {
    const d = toDate(row.created_at);
    if (!d) return true;
    if (start && d < start) return false;
    if (end) {
      const endOfDay = new Date(end);
      endOfDay.setHours(23, 59, 59, 999);
      if (d > endOfDay) return false;
    }
    return true;
  });
}

function prazoStatus(pedido: any) {
  const prazo = toDate(pedido.prazo_entrega || pedido.data_entrega_estimada);
  if (!prazo) return 'sem_prazo';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  prazo.setHours(0, 0, 0, 0);

  const diff = Math.ceil((prazo.getTime() - today.getTime()) / 86400000);
  if (diff < 0 && !['entregue', 'cancelado'].includes(String(pedido.status))) return 'atrasado';
  if (diff <= 2) return 'atenção';
  return 'no_prazo';
}

async function getConfigMap() {
  const rows = await supabaseRest<any[]>('/configuracoes_site?select=chave,valor');
  const config: Record<string, string> = {};
  for (const item of rows || []) config[item.chave] = item.valor || '';
  return config;
}

adminRoutes.use(auth);
adminRoutes.use(requireStaff);

adminRoutes.get('/dashboard', asyncHandler(async (req, res) => {
  const [pedidos, users, produtos] = await Promise.all([
    supabaseRest<any[]>('/pedidos?select=*&limit=2000&order=created_at.desc'),
    supabaseRest<any[]>('/users?select=id,role,created_at&limit=2000'),
    supabaseRest<any[]>('/produtos?select=id,estoque,ativo&limit=2000')
  ]);

  const status = String(req.query.status || 'todos');
  let filtered = applyDateFilter(pedidos, req.query.from, req.query.to);

  if (status !== 'todos') {
    filtered = filtered.filter((p) => String(p.status) === status || String(p.status_pagamento) === status);
  }

  const now = new Date();
  const pedidosMes = pedidos.filter((p) => {
    const d = new Date(p.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const vendasMes = pedidosMes.reduce((sum, p) => sum + Number(p.total || 0), 0);
  const vendasPeriodo = filtered.reduce((sum, p) => sum + Number(p.total || 0), 0);
  const valorRecebidoPeriodo = filtered.reduce((sum, p) => sum + Number(p.valor_entrada || 0), 0);
  const valorAReceberPeriodo = filtered.reduce((sum, p) => sum + Number(p.valor_restante || Math.max(Number(p.total || 0) - Number(p.valor_entrada || 0), 0)), 0);
  const valorAReceberGeral = pedidos.reduce((sum, p) => sum + Number(p.valor_restante || Math.max(Number(p.total || 0) - Number(p.valor_entrada || 0), 0)), 0);

  res.json({
    vendasMes,
    pedidosMes: pedidosMes.length,
    ticketMedio: filtered.length ? vendasPeriodo / filtered.length : 0,
    clientesNovos: users.filter((u) => {
      const d = new Date(u.created_at);
      return u.role === 'user' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
    produtosEmEstoque: produtos.reduce((sum, p) => sum + Number(p.estoque || 0), 0),
    pedidosPendentes: pedidos.filter((p) => ['pendente', 'confirmado', 'em_producao'].includes(p.status)).length,
    filtro: {
      totalPedidos: filtered.length,
      vendasPeriodo,
      valorRecebidoPeriodo,
      valorAReceberPeriodo,
      valorAReceberGeral,
      atrasados: filtered.filter((p) => prazoStatus(p) === 'atrasado').length,
      atencao: filtered.filter((p) => prazoStatus(p) === 'atenção').length,
      noPrazo: filtered.filter((p) => prazoStatus(p) === 'no_prazo').length
    },
    pedidosRecentes: filtered.slice(0, 8).map((p) => ({ ...p, prazo_status: prazoStatus(p) }))
  });
}));

adminRoutes.get('/clientes', asyncHandler(async (_req, res) => {
  const users = await supabaseRest<any[]>('/users?select=id,nome,email,telefone,role,created_at&role=eq.user&order=created_at.desc&limit=2000');
  const pedidos = await supabaseRest<any[]>('/pedidos?select=id,usuario_id,total&limit=2000').catch(() => []);

  res.json(users.map((u) => {
    const userOrders = pedidos.filter((p) => p.usuario_id === u.id);
    return {
      ...u,
      total_gasto: userOrders.reduce((sum, p) => sum + Number(p.total || 0), 0),
      pedidos: userOrders.length
    };
  }));
}));

adminRoutes.post('/clientes', admin, asyncHandler(async (req, res) => {
  const d = z.object({
    nome: z.string().min(2),
    email: z.string().email(),
    telefone: z.string().optional().default(''),
    senha: z.string().min(6).optional().default('12345678')
  }).parse(req.body);

  const senhaHash = await bcrypt.hash(d.senha, 10);
  const rows = await supabaseRest<any[]>('/users', {
    method: 'POST',
    body: JSON.stringify({
      nome: d.nome,
      email: d.email.toLowerCase(),
      telefone: d.telefone,
      senha: senhaHash,
      role: 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  });

  res.status(201).json(rows[0]);
}));

adminRoutes.put('/clientes/:id', admin, asyncHandler(async (req, res) => {
  const d = z.object({ nome: z.string().min(2).optional(), email: z.string().email().optional(), telefone: z.string().optional() }).parse(req.body);
  const rows = await supabaseRest<any[]>(`/users?id=eq.${restEq(req.params.id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...d, updated_at: new Date().toISOString() })
  });
  res.json(rows[0] || { ok: true });
}));

adminRoutes.put('/clientes/:id/redefinir-senha', admin, asyncHandler(async (req, res) => {
  const d = z.object({ senha: z.string().min(6) }).parse(req.body);
  const senhaHash = await bcrypt.hash(d.senha, 10);
  await supabaseRest(`/users?id=eq.${restEq(req.params.id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ senha: senhaHash, updated_at: new Date().toISOString() })
  });
  res.json({ ok: true });
}));

adminRoutes.delete('/clientes/:id', admin, asyncHandler(async (req, res) => {
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
    subtotal: z.number().optional(),
    total: z.number().min(0),
    valor_entrada: z.number().min(0).optional().default(0),
    valor_restante: z.number().min(0).optional(),
    status: z.string().optional().default('pendente'),
    status_pagamento: z.string().optional().default('pendente'),
    endereco_entrega: z.string().optional().default('A combinar'),
    prazo_entrega: z.string().optional().default(''),
    data_entrega_estimada: z.string().optional().default(''),
    observacoes: z.string().optional().default('Pedido registrado manualmente no painel administrativo.')
  }).parse(req.body);

  const total = Number(d.total || 0);
  const entrada = Number(d.valor_entrada || 0);
  const restante = d.valor_restante !== undefined ? Number(d.valor_restante) : Math.max(total - entrada, 0);
  const statusPagamento = d.status_pagamento || (restante <= 0 && total > 0 ? 'confirmado' : entrada > 0 ? 'parcial' : 'pendente');
  const prazo = d.prazo_entrega || d.data_entrega_estimada || null;

  const pedidos = await supabaseRest<any[]>('/pedidos', {
    method: 'POST',
    body: JSON.stringify({
      usuario_id: d.usuario_id || null,
      numero_pedido: `MAN${Date.now()}`,
      status: d.status,
      subtotal: d.subtotal ?? total,
      frete: 0,
      desconto: 0,
      total,
      valor_entrada: entrada,
      valor_restante: restante,
      metodo_pagamento: 'manual',
      status_pagamento: statusPagamento,
      endereco_entrega: d.endereco_entrega,
      observacoes: d.observacoes + '\nDescrição: ' + d.descricao,
      data_entrega_estimada: prazo,
      prazo_entrega: prazo,
      cliente_nome: d.cliente_nome,
      cliente_email: d.cliente_email,
      cliente_telefone: d.cliente_telefone,
      origem: 'manual',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  });

  res.status(201).json({ ...pedidos[0], prazo_status: prazoStatus(pedidos[0]) });
}));


adminRoutes.put('/pedidos/:id', asyncHandler(async (req, res) => {
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

  const payload: any = {
    ...d,
    valor_entrada: entrada,
    valor_restante,
    status_pagamento,
    data_entrega_estimada: d.data_entrega_estimada || d.prazo_entrega || null,
    prazo_entrega: d.prazo_entrega || d.data_entrega_estimada || null,
    updated_at: new Date().toISOString()
  };

  const rows = await supabaseRest<any[]>(`/pedidos?id=eq.${restEq(req.params.id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });

  res.json(rows[0] ? { ...rows[0], prazo_status: prazoStatus(rows[0]) } : { ok: true });
}));

adminRoutes.get('/pedidos/:id/recibo', asyncHandler(async (req, res) => {
  let pedidoRows = await supabaseRest<any[]>(`/pedidos?select=*&id=eq.${restEq(req.params.id)}&limit=1`);

  if (!pedidoRows[0]) {
    pedidoRows = await supabaseRest<any[]>(`/pedidos?select=*&numero_pedido=eq.${restEq(req.params.id)}&limit=1`);
  }

  const pedido = pedidoRows[0];
  if (!pedido) return res.status(404).json({ message: 'Pedido não encontrado.' });

  const itens = await supabaseRest<any[]>(`/itens_pedido?select=*&pedido_id=eq.${restEq(pedido.id)}`).catch(() => []);
  const config = await getConfigMap();
  const tipoDocumento = pedido.status_pagamento === 'confirmado' ? 'recibo' : 'ordem_servico';

  res.json({
    pedido: { ...pedido, prazo_status: prazoStatus(pedido) },
    itens,
    tipo_documento: tipoDocumento,
    documento: {
      titulo: tipoDocumento === 'recibo' ? 'Recibo Digital' : 'Ordem de Serviço',
      empresa: config.nome_empresa || 'Gráfica W Criações',
      whatsapp: config.whatsapp || '88 99624-0470',
      logo_url: pedido.logo_documento_url || config.logo_documentos_url || config.logo_site_url || '',
      assinatura_url: pedido.assinatura_url || config.assinatura_recibo_url || '',
      emitido_em: new Date().toISOString()
    }
  });
}));

adminRoutes.get('/configuracoes', admin, asyncHandler(async (_req, res) => {
  res.json(await supabaseRest<any[]>('/configuracoes_site?select=*&order=chave.asc'));
}));

adminRoutes.put('/configuracoes/:chave', admin, asyncHandler(async (req, res) => {
  const d = z.object({ valor: z.string().default(''), tipo: z.string().optional().default('texto') }).parse(req.body);
  const chave = req.params.chave;
  const tipo = ['texto', 'numero', 'booleano', 'json'].includes(d.tipo) ? d.tipo : 'texto';

  const existing = await supabaseRest<any[]>(`/configuracoes_site?select=id&chave=eq.${restEq(chave)}&limit=1`);
  let rows: any[];

  if (existing[0]) {
    rows = await supabaseRest<any[]>(`/configuracoes_site?chave=eq.${restEq(chave)}`, {
      method: 'PATCH',
      body: JSON.stringify({ valor: d.valor, tipo, updated_at: new Date().toISOString() })
    });
  } else {
    rows = await supabaseRest<any[]>('/configuracoes_site', {
      method: 'POST',
      body: JSON.stringify({ chave, valor: d.valor, tipo, updated_at: new Date().toISOString() })
    });
  }

  res.json(rows[0] || { ok: true });
}));

adminRoutes.get('/usuarios', admin, asyncHandler(async (_req, res) => {
  res.json(await supabaseRest<any[]>('/users?select=id,nome,email,telefone,role,funcionario_permissoes,created_at&order=created_at.desc'));
}));

adminRoutes.put('/usuarios/:id', admin, asyncHandler(async (req, res) => {
  const d = z.object({
    nome: z.string().optional(),
    telefone: z.string().optional(),
    role: z.enum(['user', 'admin', 'funcionario', 'inactive']).optional(),
    funcionario_permissoes: z.array(z.string()).optional().default([])
  }).parse(req.body);

  const rows = await supabaseRest<any[]>(`/users?id=eq.${restEq(req.params.id)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      ...d,
      funcionario_permissoes: d.role === 'funcionario' ? d.funcionario_permissoes : [],
      updated_at: new Date().toISOString()
    })
  });

  res.json(rows[0] || { ok: true });
}));

adminRoutes.put('/usuarios/:id/redefinir-senha', admin, asyncHandler(async (req, res) => {
  const d = z.object({ senha: z.string().min(6) }).parse(req.body);
  const senhaHash = await bcrypt.hash(d.senha, 10);

  await supabaseRest(`/users?id=eq.${restEq(req.params.id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ senha: senhaHash, updated_at: new Date().toISOString() })
  });

  res.json({ ok: true });
}));

adminRoutes.delete('/usuarios/:id', admin, asyncHandler(async (req, res) => {
  await supabaseRest(`/users?id=eq.${restEq(req.params.id)}`, { method: 'DELETE' });
  res.json({ ok: true });
}));

adminRoutes.get('/cupons', admin, asyncHandler(async (_req, res) => {
  res.json(await supabaseRest<any[]>('/cupons_desconto?select=*&order=created_at.desc'));
}));

adminRoutes.get('/avaliacoes', asyncHandler(async (_req, res) => {
  res.json(await supabaseRest<any[]>('/avaliacoes?select=*&order=created_at.desc'));
}));

adminRoutes.get('/relatorios/vendas', admin, asyncHandler(async (_req, res) => {
  const rows = await supabaseRest<any[]>('/pedidos?select=created_at,total&order=created_at.desc&limit=90');
  res.json(rows.map((r) => ({ data: new Date(r.created_at).toLocaleDateString('pt-BR'), vendas: Number(r.total || 0), pedidos: 1 })));
}));
