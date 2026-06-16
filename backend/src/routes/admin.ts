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


function normalizePhone(value: string) {
  return String(value || '').replace(/\D/g, '');
}

function safeClienteEmail(nome: string, telefone: string) {
  const phone = normalizePhone(telefone);
  const base = phone || String(nome || 'cliente').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'cliente';
  return `cliente-${base}-${Date.now()}@grafica.local`;
}

async function findOrCreateClienteSimples(data: {
  usuario_id?: string | null;
  nome: string;
  email?: string;
  telefone?: string;
}) {
  if (data.usuario_id) {
    const rows = await supabaseRest<any[]>(`/users?select=id,nome,email,telefone&id=eq.${restEq(data.usuario_id)}&limit=1`).catch(() => []);
    if (rows[0]) return rows[0];
    return { id: data.usuario_id, nome: data.nome, email: data.email || '', telefone: data.telefone || '' };
  }

  const email = String(data.email || '').trim().toLowerCase();
  const telefone = String(data.telefone || '').trim();
  const telefoneLimpo = normalizePhone(telefone);

  if (email) {
    const byEmail = await supabaseRest<any[]>(`/users?select=id,nome,email,telefone&email=eq.${restEq(email)}&limit=1`).catch(() => []);
    if (byEmail[0]) return byEmail[0];
  }

  if (telefone) {
    const byPhone = await supabaseRest<any[]>(`/users?select=id,nome,email,telefone&telefone=eq.${restEq(telefone)}&limit=1`).catch(() => []);
    if (byPhone[0]) return byPhone[0];
  }

  if (telefoneLimpo && telefoneLimpo !== telefone) {
    const byPhoneClean = await supabaseRest<any[]>(`/users?select=id,nome,email,telefone&telefone=ilike.${restEq('%' + telefoneLimpo.slice(-8) + '%')}&limit=1`).catch(() => []);
    if (byPhoneClean[0]) return byPhoneClean[0];
  }

  if (String(data.nome || '').trim()) {
    const byName = await supabaseRest<any[]>(`/users?select=id,nome,email,telefone&nome=ilike.${restEq(String(data.nome).trim())}&role=eq.user&limit=1`).catch(() => []);
    if (byName[0]) return byName[0];
  }

  const senhaHash = await bcrypt.hash(`cliente-${Date.now()}-${Math.random()}`, 10);
  const novoEmail = email || safeClienteEmail(data.nome, telefone);

  const created = await supabaseRest<any[]>('/users', {
    method: 'POST',
    body: JSON.stringify({
      nome: data.nome,
      email: novoEmail,
      telefone,
      senha: senhaHash,
      role: 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  });

  return created[0];
}

adminRoutes.use(auth);
adminRoutes.use(requireStaff);

adminRoutes.get('/dashboard', asyncHandler(async (req, res) => {
  const status = String(req.query.status || 'todos');
  const dateFrom = String(req.query.date_from || '');
  const dateTo = String(req.query.date_to || '');

  let path = '/pedidos?select=id,numero_pedido,cliente_nome,cliente_email,total,valor_entrada,valor_restante,status,status_pagamento,prazo_entrega,created_at&limit=2000&order=created_at.desc';
  if (status && status !== 'todos') path += `&status=eq.${restEq(status)}`;
  if (dateFrom) path += `&created_at=gte.${restEq(dateFrom + 'T00:00:00')}`;
  if (dateTo) path += `&created_at=lte.${restEq(dateTo + 'T23:59:59')}`;

  const [pedidos, users, produtos, mensagens] = await Promise.all([
    supabaseRest<any[]>(path),
    supabaseRest<any[]>('/users?select=id,role,created_at&limit=2000'),
    supabaseRest<any[]>('/produtos?select=id,estoque,ativo&limit=2000'),
    supabaseRest<any[]>('/contatos_formulario?select=id,respondido,created_at&limit=2000').catch(() => [])
  ]);

  const totalVendido = pedidos.reduce((sum, p) => sum + asNumber(p.total), 0);
  const totalRecebido = pedidos.reduce((sum, p) => sum + asNumber(p.valor_entrada || (p.status_pagamento === 'confirmado' ? p.total : 0)), 0);
  const totalAReceber = pedidos.reduce((sum, p) => sum + asNumber(p.valor_restante || Math.max(asNumber(p.total) - asNumber(p.valor_entrada), 0)), 0);

  const hoje = dateOnly(new Date().toISOString());
  const vendasPorDiaMap = new Map<string, { data: string; vendas: number; pedidos: number }>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dateOnly(d.toISOString());
    vendasPorDiaMap.set(key, { data: key, vendas: 0, pedidos: 0 });
  }

  for (const pedido of pedidos) {
    const key = dateOnly(pedido.created_at);
    if (!vendasPorDiaMap.has(key)) continue;
    const item = vendasPorDiaMap.get(key)!;
    item.vendas += asNumber(pedido.total);
    item.pedidos += 1;
  }

  const statusResumo = ['pendente', 'confirmado', 'em_producao', 'pronto', 'entregue', 'cancelado'].map((key) => ({
    status: key,
    total: pedidos.filter((p) => p.status === key).length
  }));

  res.json({
    vendasMes: totalVendido,
    pedidosMes: pedidos.length,
    ticketMedio: pedidos.length ? totalVendido / pedidos.length : 0,
    valoresRecebidos: totalRecebido,
    valoresAReceber: totalAReceber,
    clientesNovos: users.filter((u) => u.role === 'user').length,
    produtosEmEstoque: produtos.reduce((sum, p) => sum + asNumber(p.estoque), 0),
    pedidosPendentes: pedidos.filter((p) => ['pendente', 'confirmado', 'em_producao'].includes(p.status)).length,
    pedidosAtrasados: pedidos.filter((p) => p.prazo_entrega && dateOnly(p.prazo_entrega) < hoje && !['entregue', 'cancelado'].includes(p.status)).length,
    mensagensNovas: mensagens.filter((m) => !m.respondido).length,
    pedidosRecentes: pedidos.slice(0, 8),
    vendasPorDia: Array.from(vendasPorDiaMap.values()),
    statusResumo
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

adminRoutes.get('/clientes/:id/pedidos', asyncHandler(async (req, res) => {
  const clienteRows = await supabaseRest<any[]>(`/users?select=id,nome,email,telefone&id=eq.${restEq(req.params.id)}&limit=1`).catch(() => []);
  const cliente = clienteRows[0];

  if (!cliente) return res.status(404).json({ message: 'Cliente não encontrado.' });

  let query = `/pedidos?select=*&usuario_id=eq.${restEq(cliente.id)}&order=created_at.desc&limit=500`;
  let pedidos = await supabaseRest<any[]>(query).catch(() => []);

  if (pedidos.length === 0 && cliente.email) {
    pedidos = await supabaseRest<any[]>(`/pedidos?select=*&cliente_email=eq.${restEq(cliente.email)}&order=created_at.desc&limit=500`).catch(() => []);
  }

  if (pedidos.length === 0 && cliente.telefone) {
    pedidos = await supabaseRest<any[]>(`/pedidos?select=*&cliente_telefone=eq.${restEq(cliente.telefone)}&order=created_at.desc&limit=500`).catch(() => []);
  }

  let orcamentos = await supabaseRest<any[]>(`/orcamentos?select=*&usuario_id=eq.${restEq(cliente.id)}&order=created_at.desc&limit=500`).catch(() => []);

  if (orcamentos.length === 0 && cliente.email) {
    orcamentos = await supabaseRest<any[]>(`/orcamentos?select=*&cliente_email=eq.${restEq(cliente.email)}&order=created_at.desc&limit=500`).catch(() => []);
  }

  if (orcamentos.length === 0 && cliente.telefone) {
    orcamentos = await supabaseRest<any[]>(`/orcamentos?select=*&cliente_telefone=eq.${restEq(cliente.telefone)}&order=created_at.desc&limit=500`).catch(() => []);
  }

  res.json({ cliente, pedidos, orcamentos });
}));

adminRoutes.get('/configuracoes', asyncHandler(async (_req, res) => {
  res.json(await supabaseRest<any[]>('/configuracoes_site?select=*&order=chave.asc'));
}));

adminRoutes.put('/configuracoes/:chave', asyncHandler(async (req, res) => {
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
    observacoes: z.string().optional().default('')
  }).parse(req.body);

  const cliente = await findOrCreateClienteSimples({
    usuario_id: d.usuario_id,
    nome: d.cliente_nome,
    email: d.cliente_email,
    telefone: d.cliente_telefone
  });

  const restante = Math.max(asNumber(d.total) - asNumber(d.valor_entrada), 0);
  const numero = `MAN${Date.now()}`;

  const pedidos = await supabaseRest<any[]>('/pedidos', {
    method: 'POST',
    body: JSON.stringify({
      usuario_id: cliente?.id || null,
      numero_pedido: numero,
      status: d.status,
      subtotal: d.total,
      frete: 0,
      desconto: 0,
      total: d.total,
      valor_entrada: d.valor_entrada,
      valor_restante: restante,
      metodo_pagamento: 'manual',
      status_pagamento: restante <= 0 ? 'confirmado' : asNumber(d.valor_entrada) > 0 ? 'parcial' : d.status_pagamento,
      endereco_entrega: d.endereco_entrega,
      observacoes: d.descricao || d.observacoes || 'Pedido registrado manualmente no painel administrativo.',
      prazo_entrega: d.prazo_entrega || null,
      data_entrega_estimada: d.prazo_entrega || null,
      cliente_nome: cliente?.nome || d.cliente_nome,
      cliente_email: d.cliente_email || cliente?.email || '',
      cliente_telefone: d.cliente_telefone || cliente?.telefone || '',
      origem: 'manual',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  });

  const pedido = pedidos[0];
  await registrarHistorico(pedido.id, req.user, 'criou pedido', 'pedido', '', numero);

  if (cliente?.id && !d.usuario_id) {
    await registrarHistorico(pedido.id, req.user, 'vinculou cliente', 'cliente', '', cliente.nome || cliente.email || cliente.id);
  }

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


const orcamentoSchema = z.object({
  usuario_id: z.string().uuid().optional().nullable(),
  cliente_nome: z.string().min(2),
  cliente_email: z.string().optional().default(''),
  cliente_telefone: z.string().optional().default(''),
  descricao: z.string().min(3),
  valor_total: z.number().min(0),
  validade: z.string().optional().nullable(),
  status: z.string().optional().default('rascunho'),
  observacoes: z.string().optional().default('')
});

adminRoutes.get('/orcamentos', asyncHandler(async (req, res) => {
  const status = String(req.query.status || 'todos');
  const busca = String(req.query.busca || '').trim();

  let path = '/orcamentos?select=*&order=created_at.desc&limit=1000';
  if (status && status !== 'todos') path += `&status=eq.${restEq(status)}`;

  const rows = await supabaseRest<any[]>(path).catch(() => []);

  if (!busca) return res.json(rows);

  const q = busca.toLowerCase();
  res.json(rows.filter((o) => [o.numero_orcamento, o.cliente_nome, o.cliente_email, o.cliente_telefone, o.descricao].join(' ').toLowerCase().includes(q)));
}));

adminRoutes.post('/orcamentos', asyncHandler(async (req, res) => {
  const d = orcamentoSchema.parse(req.body);
  const cliente = await findOrCreateClienteSimples({
    usuario_id: d.usuario_id,
    nome: d.cliente_nome,
    email: d.cliente_email,
    telefone: d.cliente_telefone
  });

  const numero = `ORC${Date.now()}`;
  const rows = await supabaseRest<any[]>('/orcamentos', {
    method: 'POST',
    body: JSON.stringify({
      numero_orcamento: numero,
      usuario_id: cliente?.id || null,
      cliente_nome: cliente?.nome || d.cliente_nome,
      cliente_email: d.cliente_email || cliente?.email || '',
      cliente_telefone: d.cliente_telefone || cliente?.telefone || '',
      descricao: d.descricao,
      valor_total: d.valor_total,
      validade: d.validade || null,
      status: d.status || 'rascunho',
      observacoes: d.observacoes || '',
      virou_pedido: false,
      pedido_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  });

  res.status(201).json(rows[0]);
}));

adminRoutes.put('/orcamentos/:id', asyncHandler(async (req, res) => {
  const d = orcamentoSchema.partial().parse(req.body);
  let cliente: any = null;

  if (d.cliente_nome) {
    cliente = await findOrCreateClienteSimples({
      usuario_id: d.usuario_id,
      nome: d.cliente_nome,
      email: d.cliente_email || '',
      telefone: d.cliente_telefone || ''
    });
  }

  const payload: any = {
    ...d,
    updated_at: new Date().toISOString()
  };

  if (cliente?.id) {
    payload.usuario_id = cliente.id;
    payload.cliente_nome = cliente.nome || d.cliente_nome;
    payload.cliente_email = d.cliente_email || cliente.email || '';
    payload.cliente_telefone = d.cliente_telefone || cliente.telefone || '';
  }

  const rows = await supabaseRest<any[]>(`/orcamentos?id=eq.${restEq(req.params.id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });

  res.json(rows[0] || { ok: true });
}));

adminRoutes.delete('/orcamentos/:id', asyncHandler(async (req, res) => {
  await supabaseRest(`/orcamentos?id=eq.${restEq(req.params.id)}`, { method: 'DELETE' });
  res.json({ ok: true });
}));

adminRoutes.post('/orcamentos/:id/virar-pedido', asyncHandler(async (req, res) => {
  const rows = await supabaseRest<any[]>(`/orcamentos?select=*&id=eq.${restEq(req.params.id)}&limit=1`).catch(() => []);
  const orcamento = rows[0];

  if (!orcamento) return res.status(404).json({ message: 'Orçamento não encontrado.' });

  if (orcamento.virou_pedido && orcamento.pedido_id) {
    const existing = await supabaseRest<any[]>(`/pedidos?select=*&id=eq.${restEq(orcamento.pedido_id)}&limit=1`).catch(() => []);
    if (existing[0]) return res.json(existing[0]);
  }

  const cliente = await findOrCreateClienteSimples({
    usuario_id: orcamento.usuario_id,
    nome: orcamento.cliente_nome,
    email: orcamento.cliente_email || '',
    telefone: orcamento.cliente_telefone || ''
  });

  const total = asNumber(orcamento.valor_total);
  const numero = `MAN${Date.now()}`;
  const pedidos = await supabaseRest<any[]>('/pedidos', {
    method: 'POST',
    body: JSON.stringify({
      usuario_id: cliente?.id || null,
      numero_pedido: numero,
      status: 'pendente',
      subtotal: total,
      frete: 0,
      desconto: 0,
      total,
      valor_entrada: 0,
      valor_restante: total,
      metodo_pagamento: 'orcamento',
      status_pagamento: 'pendente',
      endereco_entrega: 'A combinar',
      observacoes: orcamento.descricao || 'Pedido criado a partir de orçamento.',
      prazo_entrega: null,
      data_entrega_estimada: null,
      cliente_nome: cliente?.nome || orcamento.cliente_nome,
      cliente_email: orcamento.cliente_email || cliente?.email || '',
      cliente_telefone: orcamento.cliente_telefone || cliente?.telefone || '',
      origem: 'orcamento',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  });

  const pedido = pedidos[0];

  await supabaseRest(`/orcamentos?id=eq.${restEq(orcamento.id)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: 'aprovado',
      virou_pedido: true,
      pedido_id: pedido.id,
      updated_at: new Date().toISOString()
    })
  });

  await registrarHistorico(pedido.id, req.user, 'criou pedido', 'orçamento aprovado', orcamento.numero_orcamento, numero);

  res.status(201).json(pedido);
}));

adminRoutes.get('/cupons', onlyAdmin, asyncHandler(async (_req, res) => {
  res.json(await supabaseRest<any[]>('/cupons_desconto?select=*&order=created_at.desc'));
}));

adminRoutes.get('/mensagens', asyncHandler(async (_req, res) => {
  res.json(await supabaseRest<any[]>('/contatos_formulario?select=*&order=created_at.desc&limit=1000').catch(() => []));
}));

adminRoutes.put('/mensagens/:id', asyncHandler(async (req, res) => {
  const d = z.object({ respondido: z.boolean().optional().default(false) }).parse(req.body);
  const rows = await supabaseRest<any[]>(`/contatos_formulario?id=eq.${restEq(req.params.id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ respondido: d.respondido })
  });
  res.json(rows[0] || { ok: true });
}));

adminRoutes.delete('/mensagens/:id', asyncHandler(async (req, res) => {
  await supabaseRest(`/contatos_formulario?id=eq.${restEq(req.params.id)}`, { method: 'DELETE' });
  res.json({ ok: true });
}));

adminRoutes.get('/avaliacoes', asyncHandler(async (_req, res) => {
  res.json(await supabaseRest<any[]>('/contatos_formulario?select=*&order=created_at.desc&limit=1000').catch(() => []));
}));

adminRoutes.get('/relatorios/vendas', onlyAdmin, asyncHandler(async (_req, res) => {
  const rows = await supabaseRest<any[]>('/pedidos?select=created_at,total&order=created_at.desc&limit=90');
  res.json(rows.map((r) => ({ data: new Date(r.created_at).toLocaleDateString('pt-BR'), vendas: asNumber(r.total), pedidos: 1 })));
}));
