import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { auth, admin } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { restEq, supabaseRest } from '../lib/supabaseRest.js';

export const adminRoutes = Router();

const PERMISSION_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  produtos: 'Produtos',
  pedidos: 'Pedidos',
  clientes: 'Clientes',
  avaliacoes: 'Avaliações',
  relatorios: 'Relatórios'
};

const DEFAULT_FUNCIONARIO_PERMISSOES = ['dashboard', 'pedidos'];

function roleOf(user: any) {
  return String(user?.role || '').toLowerCase();
}

function isAdminUser(user: any) {
  return roleOf(user) === 'admin';
}

function isStaffUser(user: any) {
  const role = roleOf(user);
  return ['admin', 'funcionario', 'staff', 'employee'].includes(role);
}

async function getFuncionarioPermissoes(userId: string): Promise<string[]> {
  const chave = `funcionario_permissoes_${userId}`;

  try {
    const rows = await supabaseRest<any[]>(
      `/configuracoes_site?select=valor&chave=eq.${restEq(chave)}&limit=1`
    );

    const raw = rows?.[0]?.valor;

    if (!raw) {
      return DEFAULT_FUNCIONARIO_PERMISSOES;
    }

    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return parsed.map(String);
    }
  } catch (error) {
    console.error('Falha ao carregar permissões do funcionário:', error);
  }

  return DEFAULT_FUNCIONARIO_PERMISSOES;
}

async function requirePainel(req: any, _res: any, next: any) {
  if (!req.user || !isStaffUser(req.user)) {
    throw new HttpError(403, 'Acesso restrito ao painel.');
  }

  return next();
}

function requirePermissao(permissao: string) {
  return async (req: any, _res: any, next: any) => {
    if (!req.user) {
      throw new HttpError(401, 'Usuário não autenticado.');
    }

    if (isAdminUser(req.user)) {
      return next();
    }

    const permissoes = await getFuncionarioPermissoes(req.user.id);

    if (!permissoes.includes(permissao)) {
      throw new HttpError(403, 'Funcionário sem permissão para acessar esta função.');
    }

    return next();
  };
}

async function salvarConfig(chave: string, valor: string, tipo = 'texto') {
  const existing = await supabaseRest<any[]>(
    `/configuracoes_site?select=id&chave=eq.${restEq(chave)}&limit=1`
  );

  if (existing[0]) {
    const rows = await supabaseRest<any[]>(
      `/configuracoes_site?chave=eq.${restEq(chave)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          valor,
          tipo,
          updated_at: new Date().toISOString()
        })
      }
    );

    return rows[0] || { ok: true };
  }

  const rows = await supabaseRest<any[]>('/configuracoes_site', {
    method: 'POST',
    body: JSON.stringify({
      chave,
      valor,
      tipo,
      updated_at: new Date().toISOString()
    })
  });

  return rows[0] || { ok: true };
}

adminRoutes.use(auth);
adminRoutes.use(requirePainel);

adminRoutes.get('/me/permissoes', asyncHandler(async (req, res) => {
  if (isAdminUser(req.user)) {
    return res.json({
      role: req.user!.role,
      permissoes: Object.keys(PERMISSION_LABELS),
      labels: PERMISSION_LABELS
    });
  }

  const permissoes = await getFuncionarioPermissoes(req.user!.id);

  res.json({
    role: req.user!.role,
    permissoes,
    labels: PERMISSION_LABELS
  });
}));

adminRoutes.get('/dashboard', requirePermissao('dashboard'), asyncHandler(async (_req, res) => {
  const [pedidos, users, produtos] = await Promise.all([
    supabaseRest<any[]>('/pedidos?select=id,total,status,created_at&limit=1000'),
    supabaseRest<any[]>('/users?select=id,role,created_at&limit=1000'),
    supabaseRest<any[]>('/produtos?select=id,estoque,ativo&limit=1000')
  ]);

  const now = new Date();
  const pedidosMes = pedidos.filter((p) => {
    const d = new Date(p.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const vendasMes = pedidosMes.reduce((sum, p) => sum + Number(p.total || 0), 0);

  res.json({
    vendasMes,
    pedidosMes: pedidosMes.length,
    ticketMedio: pedidosMes.length ? vendasMes / pedidosMes.length : 0,
    clientesNovos: users.filter((u) => {
      const d = new Date(u.created_at);
      return u.role === 'user' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
    produtosEmEstoque: produtos.reduce((sum, p) => sum + Number(p.estoque || 0), 0),
    pedidosPendentes: pedidos.filter((p) => ['pendente', 'confirmado', 'em_producao'].includes(p.status)).length
  });
}));

adminRoutes.get('/clientes', requirePermissao('clientes'), asyncHandler(async (_req, res) => {
  const users = await supabaseRest<any[]>(
    '/users?select=id,nome,email,telefone,role,created_at&role=eq.user&order=created_at.desc&limit=1000'
  );

  const pedidos = await supabaseRest<any[]>(
    '/pedidos?select=id,usuario_id,total&limit=1000'
  ).catch(() => []);

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
  const d = z.object({
    nome: z.string().min(2).optional(),
    email: z.string().email().optional(),
    telefone: z.string().optional()
  }).parse(req.body);

  const rows = await supabaseRest<any[]>(`/users?id=eq.${restEq(req.params.id)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      ...d,
      updated_at: new Date().toISOString()
    })
  });

  res.json(rows[0] || { ok: true });
}));

adminRoutes.put('/clientes/:id/redefinir-senha', admin, asyncHandler(async (req, res) => {
  const d = z.object({ senha: z.string().min(6) }).parse(req.body);
  const senhaHash = await bcrypt.hash(d.senha, 10);

  await supabaseRest(`/users?id=eq.${restEq(req.params.id)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      senha: senhaHash,
      updated_at: new Date().toISOString()
    })
  });

  res.json({ ok: true });
}));

adminRoutes.delete('/clientes/:id', admin, asyncHandler(async (req, res) => {
  await supabaseRest(`/users?id=eq.${restEq(req.params.id)}`, { method: 'DELETE' });
  res.json({ ok: true });
}));


adminRoutes.post('/pedidos/manual', requirePermissao('pedidos'), asyncHandler(async (req, res) => {
  const d = z.object({
    usuario_id: z.string().uuid().nullable().optional(),
    cliente_nome: z.string().min(2),
    cliente_email: z.string().optional().default(''),
    cliente_telefone: z.string().optional().default(''),
    descricao: z.string().min(3),
    total: z.number().min(0),
    status: z.string().optional().default('pendente'),
    status_pagamento: z.string().optional().default('pendente'),
    endereco_entrega: z.string().optional().default('A combinar'),
    observacoes: z.string().optional().default('Pedido registrado manualmente no painel administrativo.')
  }).parse(req.body);

  const pedidos = await supabaseRest<any[]>('/pedidos', {
    method: 'POST',
    body: JSON.stringify({
      usuario_id: d.usuario_id || null,
      numero_pedido: `MAN${Date.now()}`,
      status: d.status,
      subtotal: d.total,
      frete: 0,
      desconto: 0,
      total: d.total,
      metodo_pagamento: 'manual',
      status_pagamento: d.status_pagamento,
      endereco_entrega: d.endereco_entrega,
      observacoes: d.observacoes,
      data_entrega_estimada: new Date(Date.now() + 7 * 86400000).toISOString(),
      cliente_nome: d.cliente_nome,
      cliente_email: d.cliente_email || '',
      cliente_telefone: d.cliente_telefone,
      origem: 'manual',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  });

  const pedido = pedidos[0];

  const produtos = await supabaseRest<any[]>('/produtos?select=id&limit=1').catch(() => []);

  if (produtos[0]?.id) {
    await supabaseRest('/itens_pedido', {
      method: 'POST',
      body: JSON.stringify({
        pedido_id: pedido.id,
        produto_id: produtos[0].id,
        quantidade: 1,
        preco_unitario: d.total,
        especificacoes: { descricao: d.descricao },
        created_at: new Date().toISOString()
      })
    }).catch(() => null);
  }

  res.status(201).json(pedido);
}));

adminRoutes.get('/pedidos/:id/recibo', requirePermissao('pedidos'), asyncHandler(async (req, res) => {
  let pedidoRows = await supabaseRest<any[]>(
    `/pedidos?select=*&id=eq.${restEq(req.params.id)}&limit=1`
  );

  if (!pedidoRows[0]) {
    pedidoRows = await supabaseRest<any[]>(
      `/pedidos?select=*&numero_pedido=eq.${restEq(req.params.id)}&limit=1`
    );
  }

  const pedido = pedidoRows[0];

  if (!pedido) {
    return res.status(404).json({ message: 'Pedido não encontrado.' });
  }

  const itens = await supabaseRest<any[]>(
    `/itens_pedido?select=*&pedido_id=eq.${restEq(pedido.id)}`
  ).catch(() => []);

  res.json({
    pedido,
    itens,
    recibo: {
      empresa: 'Gráfica W Criações',
      whatsapp: '88 99624-0470',
      emitido_em: new Date().toISOString()
    }
  });
}));

adminRoutes.get('/configuracoes', admin, asyncHandler(async (_req, res) => {
  const rows = await supabaseRest<any[]>('/configuracoes_site?select=*&order=chave.asc');
  res.json(rows);
}));

adminRoutes.put('/configuracoes/:chave', admin, asyncHandler(async (req, res) => {
  const d = z.object({
    valor: z.string().default(''),
    tipo: z.string().optional().default('texto')
  }).parse(req.body);

  const tipo = ['texto', 'numero', 'booleano', 'json'].includes(d.tipo) ? d.tipo : 'texto';
  const row = await salvarConfig(req.params.chave, d.valor, tipo);
  res.json(row);
}));

adminRoutes.get('/usuarios', admin, asyncHandler(async (_req, res) => {
  const users = await supabaseRest<any[]>(
    '/users?select=id,nome,email,telefone,role,created_at&order=created_at.desc&limit=1000'
  );

  const enriched = await Promise.all(users.map(async (u) => {
    const permissoes = ['funcionario', 'staff', 'employee'].includes(String(u.role || '').toLowerCase())
      ? await getFuncionarioPermissoes(u.id)
      : [];

    return { ...u, permissoes };
  }));

  res.json(enriched);
}));

adminRoutes.put('/usuarios/:id', admin, asyncHandler(async (req, res) => {
  const d = z.object({
    nome: z.string().optional(),
    telefone: z.string().optional(),
    role: z.enum(['user', 'admin', 'funcionario', 'inactive']).optional(),
    permissoes: z.array(z.string()).optional()
  }).parse(req.body);

  const payload: any = {
    updated_at: new Date().toISOString()
  };

  if (d.nome !== undefined) payload.nome = d.nome;
  if (d.telefone !== undefined) payload.telefone = d.telefone;
  if (d.role !== undefined) payload.role = d.role;

  const rows = await supabaseRest<any[]>(`/users?id=eq.${restEq(req.params.id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });

  if (d.permissoes) {
    await salvarConfig(
      `funcionario_permissoes_${req.params.id}`,
      JSON.stringify(d.permissoes),
      'json'
    );
  }

  res.json(rows[0] || { ok: true });
}));

adminRoutes.get('/usuarios/:id/permissoes', admin, asyncHandler(async (req, res) => {
  res.json({
    permissoes: await getFuncionarioPermissoes(req.params.id),
    labels: PERMISSION_LABELS
  });
}));

adminRoutes.put('/usuarios/:id/permissoes', admin, asyncHandler(async (req, res) => {
  const d = z.object({
    permissoes: z.array(z.string()).default([])
  }).parse(req.body);

  const validas = d.permissoes.filter((p) => Object.keys(PERMISSION_LABELS).includes(p));

  await salvarConfig(
    `funcionario_permissoes_${req.params.id}`,
    JSON.stringify(validas),
    'json'
  );

  res.json({ ok: true, permissoes: validas });
}));

adminRoutes.put('/usuarios/:id/redefinir-senha', admin, asyncHandler(async (req, res) => {
  const d = z.object({ senha: z.string().min(6) }).parse(req.body);
  const senhaHash = await bcrypt.hash(d.senha, 10);

  await supabaseRest(`/users?id=eq.${restEq(req.params.id)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      senha: senhaHash,
      updated_at: new Date().toISOString()
    })
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

adminRoutes.get('/avaliacoes', requirePermissao('avaliacoes'), asyncHandler(async (_req, res) => {
  res.json(await supabaseRest<any[]>('/avaliacoes?select=*&order=created_at.desc'));
}));

adminRoutes.get('/relatorios/vendas', requirePermissao('relatorios'), asyncHandler(async (_req, res) => {
  const rows = await supabaseRest<any[]>('/pedidos?select=created_at,total&order=created_at.desc&limit=90');
  res.json(rows.map((r) => ({
    data: new Date(r.created_at).toLocaleDateString('pt-BR'),
    vendas: Number(r.total || 0),
    pedidos: 1
  })));
}));
