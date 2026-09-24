import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../utils/http.js';
import { supabaseRest } from '../lib/supabaseRest.js';

export const catalogOrderRoutes = Router();
export const checkoutSchema = z.object({
  chave_checkout: z.string().uuid(),
  cliente_nome: z.string().trim().min(2).max(160),
  cliente_telefone: z.string().regex(/^[+\d\s()\-]{10,30}$/),
  cliente_email: z.union([z.string().email(), z.literal('')]).default(''),
  tipo_entrega: z.enum(['entrega','retirada']).default('retirada'),
  endereco_entrega: z.string().trim().min(3).max(1000),
  observacoes: z.string().max(3000).default(''),
  items: z.array(z.object({
    produto_id: z.string().uuid(), quantidade: z.number().int().min(1).max(10000),
    variacao_id: z.string().max(150).optional(),
    especificacoes: z.record(z.string().max(500)).default({})
  })).min(1).max(100)
});
catalogOrderRoutes.post('/pedidos/site', rateLimit({windowMs:60000,limit:10}), asyncHandler(async (req,res) => {
  const d = checkoutSchema.parse(req.body);
  const pedido = await supabaseRest('/rpc/criar_pedido_catalogo', {method:'POST',body:JSON.stringify({d})});
  res.status(201).json(pedido);
}));
