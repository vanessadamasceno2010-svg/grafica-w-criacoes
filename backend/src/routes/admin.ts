import { Router } from 'express';
import { z } from 'zod';
import { auth, admin } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';
import { restEq, supabaseRest } from '../lib/supabaseRest.js';

export const adminRoutes = Router();

adminRoutes.use(auth, admin);

adminRoutes.get('/dashboard', asyncHandler(async (_req, res) => {
  const [pedidos, users, produtos] = await Promise.all([
    supabaseRest<any[]>('/pedidos?select=id,total,status,created_at&limit=1000'),
    supabaseRest<any[]>('/users?select=id,role,created_at&limit=1000'),
    supabaseRest<any[]>('/produtos?select=id,estoque,ativo&limit=1000')
  ]);

  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const pedidosMes = pedidos.filter((p) => {
    const d = new Date(p.created_at);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  const vendasMes = pedidosMes.reduce((sum, p) => sum + Number(p.total || 0), 0);
  const clientesNovos = users.filter((u) => {
    const d = new Date(u.created_at);
    return u.role === 'user' && d.getMonth() === month && d.getFullYear() === year;
  }).length;

  const produtosEmEstoque = produtos.reduce((sum, p) => sum + Number(p.estoque || 0), 0);
  const pedidosPendentes = pedidos.filter((p) =>
    ['pendente', 'confirmado', 'em_producao'].includes(p.status)
  ).length;

  res.json({
    vendasMes,
    pedidosMes: pedidosMes.length,
    ticketMedio: pedidosMes.length ? vendasMes / pedidosMes.length : 0,
    clientesNovos,
    produtosEmEstoque,
    pedidosPendentes,
    vendasPorPeriodo: pedidos.slice(0, 30).map((p) => ({
      dia: new Date(p.created_at).toLocaleDateString('pt-BR'),
      total: Number(p.total || 0)
    }))
  });
}));

adminRoutes.get('/clientes', asyncHandler(async (_req, res) => {
  const users = await supabaseRest<any[]>(
    '/users?select=id,nome,email,telefone,role,created_at&role=eq.user&order=created_at.desc&limit=1000'
  );

  const pedidos = await supabaseRest<any[]>(
    '/pedidos?select=id,usuario_id,total&limit=1000'
  ).catch(() => []);

  const rows = users.map((u) => {
    const userOrders = pedidos.filter((p) => p.usuario_id === u.id);

    return {
      ...u,
      total_gasto: userOrders.reduce((sum, p) => sum + Number(p.total || 0), 0),
      pedidos: userOrders.length
    };
  });

  res.json(rows);
}));

adminRoutes.put('/clientes/:id', asyncHandler(async (req, res) => {
  const d = z.object({
    nome: z.string().min(2).optional(),
    email: z.string().email().optional(),
    telefone: z.string().optional()
  }).parse(req.body);

  const rows = await supabaseRest<any[]>(
    `/users?id=eq.${restEq(req.params.id)}`,
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

adminRoutes.delete('/clientes/:id', asyncHandler(async (req, res) => {
  await supabaseRest(
    `/users?id=eq.${restEq(req.params.id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        role: 'inactive',
        updated_at: new Date().toISOString()
      })
    }
  );

  res.json({ ok: true });
}));

adminRoutes.post('/pedidos/manual', asyncHandler(async (req, res) => {
  const d = z.object({
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

  const numero = `MAN${Date.now()}`;

  const pedidos = await supabaseRest<any[]>('/pedidos', {
    method: 'POST',
    body: JSON.stringify({
      usuario_id: null,
      numero_pedido: numero,
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

adminRoutes.get('/pedidos/:id/recibo', asyncHandler(async (req, res) => {
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

adminRoutes.get('/configuracoes', asyncHandler(async (_req, res) => {
  const rows = await supabaseRest<any[]>(
    '/configuracoes_site?select=*&order=chave.asc'
  );
  res.json(rows);
}));

adminRoutes.put('/configuracoes/:chave', asyncHandler(async (req, res) => {
  const d = z.object({
    valor: z.string(),
    tipo: z.string().optional().default('texto')
  }).parse(req.body);

  const chave = req.params.chave;

  const existing = await supabaseRest<any[]>(
    `/configuracoes_site?select=id&chave=eq.${restEq(chave)}&limit=1`
  );

  let rows: any[];

  if (existing[0]) {
    rows = await supabaseRest<any[]>(
      `/configuracoes_site?chave=eq.${restEq(chave)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          valor: d.valor,
          tipo: d.tipo,
          updated_at: new Date().toISOString()
        })
      }
    );
  } else {
    rows = await supabaseRest<any[]>('/configuracoes_site', {
      method: 'POST',
      body: JSON.stringify({
        chave,
        valor: d.valor,
        tipo: d.tipo,
        updated_at: new Date().toISOString()
      })
    });
  }

  res.json(rows[0] || { ok: true });
}));

adminRoutes.get('/cupons', asyncHandler(async (_req, res) => {
  const rows = await supabaseRest<any[]>('/cupons_desconto?select=*&order=created_at.desc');
  res.json(rows);
}));

adminRoutes.get('/avaliacoes', asyncHandler(async (_req, res) => {
  const rows = await supabaseRest<any[]>('/avaliacoes?select=*&order=created_at.desc');
  res.json(rows);
}));

adminRoutes.get('/contatos', asyncHandler(async (_req, res) => {
  const rows = await supabaseRest<any[]>('/contatos_formulario?select=*&order=created_at.desc');
  res.json(rows);
}));

adminRoutes.get('/usuarios', asyncHandler(async (_req, res) => {
  const rows = await supabaseRest<any[]>('/users?select=id,nome,email,role,created_at&order=created_at.desc');
  res.json(rows);
}));

adminRoutes.put('/usuarios/:id', asyncHandler(async (req, res) => {
  const d = z.object({
    role: z.enum(['user', 'admin', 'inactive'])
  }).parse(req.body);

  const rows = await supabaseRest<any[]>(
    `/users?id=eq.${restEq(req.params.id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        role: d.role,
        updated_at: new Date().toISOString()
      })
    }
  );

  res.json(rows[0] || { ok: true });
}));

adminRoutes.get('/relatorios/vendas', asyncHandler(async (_req, res) => {
  const rows = await supabaseRest<any[]>(
    '/pedidos?select=created_at,total&order=created_at.desc&limit=90'
  );

  res.json(rows.map((r) => ({
    data: new Date(r.created_at).toLocaleDateString('pt-BR'),
    vendas: Number(r.total || 0),
    pedidos: 1
  })));
}));
