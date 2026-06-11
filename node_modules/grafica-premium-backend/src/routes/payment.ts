import { Router } from 'express';
import { asyncHandler } from '../utils/http.js';

export const paymentRoutes = Router();

paymentRoutes.post('/pagamento/criar-sessao', asyncHandler(async (_req,res)=>{
  res.status(410).json({ message: 'Pagamento online desativado. Finalize o pedido pelo WhatsApp da gráfica.' });
}));

paymentRoutes.post('/pagamento/webhook', asyncHandler(async (_req,res)=>{
  res.json({ received: true, disabled: true });
}));
