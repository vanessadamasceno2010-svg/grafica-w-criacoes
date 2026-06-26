import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
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

function addMonthsToDate(value: string, months: number) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const targetMonth = (month - 1) + months;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(day, lastDay);
  return `${targetYear}-${String(normalizedMonth + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
}

function currentMonthRange() {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
  const [year, month] = today.split('-').map(Number);
  const end = new Date(Date.UTC(year, month, 0));
  return {
    start: `${year}-${String(month).padStart(2, '0')}-01`,
    end: end.toISOString().slice(0, 10),
    today
  };
}


async function registrarEntradaCaixaPedido(pedido: any, usuario: any, valor: number, observacaoExtra = '') {
  const entrada = asNumber(valor);
  if (entrada <= 0 || !pedido?.id) return;

  const cliente = pedido.cliente_nome || pedido.cliente_email || pedido.cliente_telefone || 'Cliente';
  const descricaoPedido = String(pedido.observacoes || pedido.descricao || pedido.numero_pedido || 'Pedido').trim();

  await supabaseRest('/caixa_movimentacoes', {
    method: 'POST',
    body: JSON.stringify({
      data_movimento: new Date().toISOString().slice(0, 10),
      descricao: `${cliente} - ${descricaoPedido}`,
      valor: entrada,
      forma_pagamento: pedido.metodo_pagamento || 'pix',
      origem: 'pedido',
      pedido_id: pedido.id,
      usuario_id: usuario?.id || null,
      usuario_nome: usuario?.nome || usuario?.email || 'Sistema',
      observacoes: `Entrada vinculada ao pedido ${pedido.numero_pedido || pedido.id}${observacaoExtra ? ' - ' + observacaoExtra : ''}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  }).catch(() => null);
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
  const financialMonth = currentMonthRange();
  const inicioMesStr = financialMonth.start;
  const fimMesStr = financialMonth.end;
  const caixaMesRows = await supabaseRest<any[]>(`/caixa_movimentacoes?select=valor&data_movimento=gte.${restEq(inicioMesStr)}&data_movimento=lte.${restEq(fimMesStr)}&limit=5000`).catch(() => []);
  const fluxoCaixaMes = caixaMesRows.reduce((sum, item) => sum + asNumber(item.valor), 0);
  const hoje = financialMonth.today;
  const contasPagar = req.user?.role === 'admin'
    ? await supabaseRest<any[]>('/contas_pagar?select=valor_parcela,vencimento,status&limit=5000').catch(() => [])
    : [];
  const contasDoMes = contasPagar.filter((conta) => conta.status !== 'cancelado' && conta.vencimento >= inicioMesStr && conta.vencimento <= fimMesStr);
  const contasAVencerDoMes = contasPagar.filter((conta) => conta.status === 'pendente' && conta.vencimento >= hoje && conta.vencimento <= fimMesStr);
  const contasVencidas = contasPagar.filter((conta) => conta.status === 'pendente' && conta.vencimento < hoje);
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
    fluxoCaixaMes,
    contasPagarMes: contasDoMes.reduce((sum, conta) => sum + asNumber(conta.valor_parcela), 0),
    contasAVencerMes: contasAVencerDoMes.reduce((sum, conta) => sum + asNumber(conta.valor_parcela), 0),
    contasVencidas: contasVencidas.reduce((sum, conta) => sum + asNumber(conta.valor_parcela), 0),
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

  await registrarEntradaCaixaPedido(pedido, req.user, d.valor_entrada, 'pedido manual criado no painel');

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

const caixaSchema = z.object({
  data_movimento: z.string().min(8),
  descricao: z.string().min(2),
  valor: z.coerce.number().positive(),
  forma_pagamento: z.string().optional().default('pix'),
  origem: z.string().optional().default('manual'),
  observacoes: z.string().optional().default(''),
  pedido_id: z.string().uuid().optional().nullable()
});

adminRoutes.get('/fluxo-caixa', asyncHandler(async (req, res) => {
  const dateFrom = String(req.query.date_from || '');
  const dateTo = String(req.query.date_to || '');
  const formaPagamento = String(req.query.forma_pagamento || 'todos');
  const origem = String(req.query.origem || 'todos');
  const q = String(req.query.q || '').trim().toLowerCase();

  let path = '/caixa_movimentacoes?select=*&order=data_movimento.desc,created_at.desc&limit=3000';
  if (dateFrom) path += `&data_movimento=gte.${restEq(dateFrom)}`;
  if (dateTo) path += `&data_movimento=lte.${restEq(dateTo)}`;
  if (formaPagamento && formaPagamento !== 'todos') path += `&forma_pagamento=eq.${restEq(formaPagamento)}`;
  if (origem && origem !== 'todos') path += `&origem=eq.${restEq(origem)}`;

  let movimentos = await supabaseRest<any[]>(path).catch(() => []);

  if (q) {
    movimentos = movimentos.filter((m) => [
      m.descricao,
      m.forma_pagamento,
      m.origem,
      m.usuario_nome,
      m.observacoes
    ].join(' ').toLowerCase().includes(q));
  }

  const totalEntradas = movimentos.reduce((sum, m) => sum + asNumber(m.valor), 0);
  const map = new Map<string, { data: string; total: number; quantidade: number }>();

  for (const m of movimentos) {
    const key = dateOnly(m.data_movimento || m.created_at);
    if (!key) continue;
    const item = map.get(key) || { data: key, total: 0, quantidade: 0 };
    item.total += asNumber(m.valor);
    item.quantidade += 1;
    map.set(key, item);
  }

  const resumoPorDia = Array.from(map.values()).sort((a, b) => b.data.localeCompare(a.data));

  res.json({
    movimentos,
    resumoPorDia,
    totalEntradas,
    quantidade: movimentos.length
  });
}));

adminRoutes.post('/fluxo-caixa', asyncHandler(async (req, res) => {
  const d = caixaSchema.parse(req.body);

  const rows = await supabaseRest<any[]>('/caixa_movimentacoes', {
    method: 'POST',
    body: JSON.stringify({
      data_movimento: d.data_movimento.slice(0, 10),
      descricao: d.descricao,
      valor: d.valor,
      forma_pagamento: d.forma_pagamento,
      origem: d.origem,
      observacoes: d.observacoes || '',
      pedido_id: d.pedido_id || null,
      usuario_id: req.user?.id || null,
      usuario_nome: req.user?.nome || req.user?.email || 'Sistema',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  });

  res.status(201).json(rows[0]);
}));

adminRoutes.put('/fluxo-caixa/:id', asyncHandler(async (req, res) => {
  const d = caixaSchema.partial().parse(req.body);

  const rows = await supabaseRest<any[]>(`/caixa_movimentacoes?id=eq.${restEq(req.params.id)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      ...d,
      data_movimento: d.data_movimento ? d.data_movimento.slice(0, 10) : undefined,
      updated_at: new Date().toISOString()
    })
  });

  res.json(rows[0] || { ok: true });
}));

adminRoutes.delete('/fluxo-caixa/:id', onlyAdmin, asyncHandler(async (req, res) => {
  await supabaseRest(`/caixa_movimentacoes?id=eq.${restEq(req.params.id)}`, { method: 'DELETE' });
  res.json({ ok: true });
}));

const contaPagarSchema = z.object({
  descricao: z.string().min(2),
  fornecedor: z.string().optional().default(''),
  categoria: z.string().optional().default(''),
  valor_total: z.coerce.number().nonnegative().optional(),
  valor_parcela: z.coerce.number().positive().optional(),
  quantidade_parcelas: z.coerce.number().int().min(1).max(120).default(1),
  primeiro_vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  conta_fixa: z.boolean().optional().default(false),
  observacoes: z.string().optional().default('')
}).refine((data) => Number(data.valor_total || 0) > 0 || Number(data.valor_parcela || 0) > 0, {
  message: 'Informe o valor total ou o valor da parcela.'
});

function rangeForContasPagar(dateFrom: string, dateTo: string) {
  if (dateFrom && dateTo) {
    return {
      start: dateFrom,
      end: dateTo,
      today: currentMonthRange().today
    };
  }

  const month = currentMonthRange();

  return {
    start: month.start,
    end: month.end,
    today: month.today
  };
}

function maxParcelaNumero(rows: any[]) {
  return rows.reduce((max, row) => Math.max(max, Number(row.parcela_numero || 1)), 1);
}

async function ajustarQuantidadeParcelasDaConta(params: {
  contaAtual: any;
  novaQuantidade: number;
  valorParcela: number;
  contaFixa: boolean;
  descricao?: string;
  fornecedor?: string;
  categoria?: string;
  observacoes?: string;
  usuarioId?: string | null;
  usuarioNome?: string;
}) {
  const grupoId = params.contaAtual.grupo_id || params.contaAtual.id;
  const novaQuantidade = Math.max(1, Math.min(120, Number(params.novaQuantidade || 1)));

  const grupoRows = await supabaseRest<any[]>(
    `/contas_pagar?select=*&grupo_id=eq.${restEq(grupoId)}&order=parcela_numero.asc&limit=200`
  ).catch(() => []);

  const rows = grupoRows.length > 0 ? grupoRows : [params.contaAtual];
  const quantidadeAtual = maxParcelaNumero(rows);
  const primeiraParcela = rows.find((row) => Number(row.parcela_numero || 1) === 1) || rows[0] || params.contaAtual;
  const primeiroVencimento = String(primeiraParcela.vencimento || params.contaAtual.vencimento || currentMonthRange().today).slice(0, 10);
  const now = new Date().toISOString();
  const valorParcela = asNumber(params.valorParcela || primeiraParcela.valor_parcela || 0);
  const valorTotal = params.contaFixa ? 0 : valorParcela * novaQuantidade;

  await supabaseRest(`/contas_pagar?grupo_id=eq.${restEq(grupoId)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      quantidade_parcelas: novaQuantidade,
      valor_total: valorTotal,
      updated_at: now
    })
  });

  if (novaQuantidade > quantidadeAtual) {
    const novasParcelas = Array.from({ length: novaQuantidade - quantidadeAtual }, (_, index) => {
      const parcelaNumero = quantidadeAtual + index + 1;

      return {
        grupo_id: grupoId,
        descricao: params.descricao ?? primeiraParcela.descricao,
        fornecedor: params.fornecedor ?? primeiraParcela.fornecedor ?? '',
        categoria: params.categoria ?? primeiraParcela.categoria ?? '',
        valor_total: valorTotal,
        valor_parcela: valorParcela,
        parcela_numero: parcelaNumero,
        quantidade_parcelas: novaQuantidade,
        vencimento: addMonthsToDate(primeiroVencimento, parcelaNumero - 1),
        status: 'pendente',
        data_pagamento: null,
        conta_fixa: params.contaFixa,
        observacoes: params.observacoes ?? primeiraParcela.observacoes ?? '',
        usuario_id: params.usuarioId || primeiraParcela.usuario_id || null,
        usuario_nome: params.usuarioNome || primeiraParcela.usuario_nome || 'Administrador',
        created_at: now,
        updated_at: now
      };
    });

    if (novasParcelas.length > 0) {
      await supabaseRest('/contas_pagar', {
        method: 'POST',
        body: JSON.stringify(novasParcelas)
      });
    }
  }

  if (novaQuantidade < quantidadeAtual) {
    await supabaseRest(
      `/contas_pagar?grupo_id=eq.${restEq(grupoId)}&parcela_numero=gt.${novaQuantidade}&status=eq.pendente`,
      { method: 'DELETE' }
    ).catch(() => null);
  }
}

adminRoutes.get('/contas-pagar', onlyAdmin, asyncHandler(async (req, res) => {
  const dateFrom = String(req.query.date_from || '');
  const dateTo = String(req.query.date_to || '');
  const status = String(req.query.status || 'todos');
  const q = String(req.query.q || '').trim().toLowerCase();
  const range = rangeForContasPagar(dateFrom, dateTo);

  const all = await supabaseRest<any[]>('/contas_pagar?select=*&order=vencimento.asc,created_at.desc&limit=5000');

  const valorRestantePorGrupo = new Map<string, number>();

  all.forEach((conta) => {
    if (conta.conta_fixa === true) return;
    if (conta.status !== 'pendente') return;

    const grupo = conta.grupo_id || conta.id;
    valorRestantePorGrupo.set(
      grupo,
      (valorRestantePorGrupo.get(grupo) || 0) + asNumber(conta.valor_parcela)
    );
  });

  let contas = all.filter((conta) => {
    if (range.start && conta.vencimento < range.start) return false;
    if (range.end && conta.vencimento > range.end) return false;
    if (status !== 'todos' && conta.status !== status) return false;

    if (
      q &&
      ![
        conta.descricao,
        conta.fornecedor,
        conta.categoria,
        conta.observacoes
      ].join(' ').toLowerCase().includes(q)
    ) {
      return false;
    }

    return true;
  }).map((conta) => ({
    ...conta,
    valor_restante_conta: conta.conta_fixa === true
      ? 0
      : valorRestantePorGrupo.get(conta.grupo_id || conta.id) || 0
  }));

  const contasDoPeriodo = all.filter((conta) =>
    conta.status !== 'cancelado' &&
    conta.vencimento >= range.start &&
    conta.vencimento <= range.end
  );

  const aVencerPeriodo = all.filter((conta) =>
    conta.status === 'pendente' &&
    conta.vencimento >= range.today &&
    conta.vencimento >= range.start &&
    conta.vencimento <= range.end
  );

  const vencidas = all.filter((conta) =>
    conta.status === 'pendente' &&
    conta.vencimento < range.today &&
    conta.vencimento >= range.start &&
    conta.vencimento <= range.end
  );

  const contasPagasPeriodo = all.filter((conta) =>
    conta.status === 'pago' &&
    conta.vencimento >= range.start &&
    conta.vencimento <= range.end
  );

  const contasFixasPeriodo = contasDoPeriodo.filter((conta) => conta.conta_fixa === true);

  res.json({
    contas,
    resumo: {
      totalMes: contasDoPeriodo.reduce((sum, conta) => sum + asNumber(conta.valor_parcela), 0),
      quantidadeMes: contasDoPeriodo.length,
      aVencerMes: aVencerPeriodo.reduce((sum, conta) => sum + asNumber(conta.valor_parcela), 0),
      quantidadeAVencer: aVencerPeriodo.length,
      contasPagasMes: contasPagasPeriodo.reduce((sum, conta) => sum + asNumber(conta.valor_parcela), 0),
      quantidadePagasMes: contasPagasPeriodo.length,
      vencidas: vencidas.reduce((sum, conta) => sum + asNumber(conta.valor_parcela), 0),
      quantidadeVencidas: vencidas.length,
      contasFixasMes: contasFixasPeriodo.reduce((sum, conta) => sum + asNumber(conta.valor_parcela), 0),
      quantidadeFixasMes: contasFixasPeriodo.length,
      totalFiltrado: contas.reduce((sum, conta) => sum + asNumber(conta.valor_parcela), 0),
      quantidadeFiltrada: contas.length
    }
  });
}));

adminRoutes.post('/contas-pagar', onlyAdmin, asyncHandler(async (req, res) => {
  const d = contaPagarSchema.parse(req.body);
  const grupoId = randomUUID();

  // Conta fixa precisa aparecer nos meses seguintes.
  // Se o usuário marcar como fixa e deixar apenas 1 parcela, criamos 12 meses automaticamente.
  const quantidadeParcelas = Boolean(d.conta_fixa) && Number(d.quantidade_parcelas || 1) <= 1
    ? 12
    : Number(d.quantidade_parcelas || 1);

  const valorParcelaBase = asNumber(d.valor_parcela || 0);
  const valorTotalBase = asNumber(d.valor_total || 0);

  const totalCents = Math.round(
    valorParcelaBase > 0
      ? valorParcelaBase * quantidadeParcelas * 100
      : valorTotalBase * 100
  );

  if (totalCents < quantidadeParcelas) {
    return res.status(400).json({
      message: 'O valor total é muito baixo para a quantidade de parcelas.'
    });
  }

  const baseCents = valorParcelaBase > 0
    ? Math.round(valorParcelaBase * 100)
    : Math.floor(totalCents / quantidadeParcelas);

  const remainder = valorParcelaBase > 0
    ? 0
    : totalCents - (baseCents * quantidadeParcelas);

  const valorTotal = Boolean(d.conta_fixa) ? 0 : totalCents / 100;
  const now = new Date().toISOString();

  const parcelas = Array.from({ length: quantidadeParcelas }, (_, index) => ({
    grupo_id: grupoId,
    descricao: d.descricao,
    fornecedor: d.fornecedor || '',
    categoria: d.categoria || '',
    valor_total: valorTotal,
    valor_parcela: (baseCents + (index === quantidadeParcelas - 1 ? remainder : 0)) / 100,
    parcela_numero: index + 1,
    quantidade_parcelas: quantidadeParcelas,
    vencimento: addMonthsToDate(d.primeiro_vencimento, index),
    status: 'pendente',
    data_pagamento: null,
    conta_fixa: Boolean(d.conta_fixa),
    observacoes: d.observacoes || '',
    usuario_id: req.user?.id || null,
    usuario_nome: req.user?.nome || req.user?.email || 'Administrador',
    created_at: now,
    updated_at: now
  }));

  const rows = await supabaseRest<any[]>('/contas_pagar', {
    method: 'POST',
    body: JSON.stringify(parcelas)
  });

  res.status(201).json({
    grupo_id: grupoId,
    parcelas: rows
  });
}));

adminRoutes.put('/contas-pagar/:id', onlyAdmin, asyncHandler(async (req, res) => {
  const d = z.object({
    descricao: z.string().min(2).optional(),
    fornecedor: z.string().optional(),
    categoria: z.string().optional(),
    valor_parcela: z.coerce.number().positive().optional(),
    quantidade_parcelas: z.coerce.number().int().min(1).max(120).optional(),
    vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    status: z.enum(['pendente', 'pago', 'cancelado']).optional(),
    conta_fixa: z.boolean().optional(),
    observacoes: z.string().optional()
  }).parse(req.body);

  const atualRows = await supabaseRest<any[]>(
    `/contas_pagar?select=*&id=eq.${restEq(req.params.id)}&limit=1`
  ).catch(() => []);

  const contaAtual = atualRows[0];

  if (!contaAtual) {
    return res.status(404).json({ message: 'Conta não encontrada.' });
  }

  const quantidadeNova = d.quantidade_parcelas
    ? Math.max(1, Math.min(120, Number(d.quantidade_parcelas || 1)))
    : Number(contaAtual.quantidade_parcelas || 1);

  const valorParcelaNovo = d.valor_parcela !== undefined
    ? asNumber(d.valor_parcela)
    : asNumber(contaAtual.valor_parcela || 0);

  const contaFixaNova = d.conta_fixa !== undefined
    ? Boolean(d.conta_fixa)
    : Boolean(contaAtual.conta_fixa);

  const payload: any = {
    ...d,
    quantidade_parcelas: quantidadeNova,
    valor_total: contaFixaNova ? 0 : valorParcelaNovo * quantidadeNova,
    updated_at: new Date().toISOString()
  };

  if (d.vencimento) payload.vencimento = d.vencimento.slice(0, 10);
  if (d.status === 'pago') payload.data_pagamento = currentMonthRange().today;
  if (d.status === 'pendente' || d.status === 'cancelado') payload.data_pagamento = null;

  const rows = await supabaseRest<any[]>(
    `/contas_pagar?id=eq.${restEq(req.params.id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }
  );

  if (d.quantidade_parcelas && contaAtual.grupo_id) {
    await ajustarQuantidadeParcelasDaConta({
      contaAtual,
      novaQuantidade: quantidadeNova,
      valorParcela: valorParcelaNovo,
      contaFixa: contaFixaNova,
      descricao: d.descricao,
      fornecedor: d.fornecedor,
      categoria: d.categoria,
      observacoes: d.observacoes,
      usuarioId: req.user?.id || null,
      usuarioNome: req.user?.nome || req.user?.email || 'Administrador'
    });
  }

  res.json(rows[0] || { ok: true });
}));

adminRoutes.delete('/contas-pagar/grupo/:grupoId', onlyAdmin, asyncHandler(async (req, res) => {
  await supabaseRest(`/contas_pagar?grupo_id=eq.${restEq(req.params.grupoId)}`, {
    method: 'DELETE'
  });

  res.json({ ok: true });
}));

adminRoutes.delete('/contas-pagar/:id', onlyAdmin, asyncHandler(async (req, res) => {
  await supabaseRest(`/contas_pagar?id=eq.${restEq(req.params.id)}`, {
    method: 'DELETE'
  });

  res.json({ ok: true });
}));



adminRoutes.get('/relatorios/vendas', onlyAdmin, asyncHandler(async (_req, res) => {
  const rows = await supabaseRest<any[]>('/pedidos?select=created_at,total&order=created_at.desc&limit=90');
  res.json(rows.map((r) => ({ data: new Date(r.created_at).toLocaleDateString('pt-BR'), vendas: asNumber(r.total), pedidos: 1 })));
}));
