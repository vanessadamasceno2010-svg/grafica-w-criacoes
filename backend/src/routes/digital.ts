import { Router } from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { auth, admin } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { supabaseRest as db, restEq } from '../lib/supabaseRest.js';
import { livepix, livepixConfigured, verifiedPayment } from '../lib/livepix.js';
export const digitalRoutes=Router();
export const digitalAdminRoutes=Router();
const uuid=z.string().uuid();
const secret=z.string().regex(/^[a-f0-9]{64}$/);
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const https=z.string().url().max(2048).refine(s=>{try{return new URL(s).protocol==='https:';}catch{return false;}},'Use um link HTTPS.');
const product=z.object({nome:z.string().trim().min(1).max(150),descricao:z.string().max(10000).default(''),imagem_url:z.union([https,z.literal('')]).default(''),imagens:z.array(https).max(12).optional(),preco_centavos:z.number().int().min(1).max(100000000),download_url:https,ativo:z.boolean()}).transform(p=>{const imagens=p.imagens ?? (p.imagem_url?[p.imagem_url]:[]);return {...p,imagens,imagem_url:imagens[0]||''};});
const findOrder=async(id:string)=>(await db<any[]>('/pedidos_digitais?id=eq.'+restEq(uuid.parse(id))+'&select=*'))[0];
async function verify(order:any) {
 if(order.status==='pago' || !order.referencia) return order;
 const payments=await livepix('/payments?reference='+encodeURIComponent(order.referencia));
 const payment=Array.isArray(payments)?payments.find(p=>verifiedPayment(order,p)):null;
 if(payment) {
  await db('/pedidos_digitais?id=eq.'+order.id+'&status=neq.pago',{method:'PATCH',body:JSON.stringify({status:'pago',pagamento_id:payment.id,pago_em:new Date().toISOString()})});
  return await findOrder(order.id);
 }
 return order;
}
const publicOrder=(o:any)=>({id:o.id,nome:o.nome,valor_centavos:o.valor_centavos,status:o.status,checkout_url:o.checkout_url,...(o.status==='pago'?{download_url:o.download_url}: {})});
digitalRoutes.use((_req,res,next)=>{res.set('Cache-Control','no-store');next();});
digitalRoutes.get('/produtos',asyncHandler(async(_req,res)=>res.json(await db('/produtos_digitais?ativo=eq.true&select=id,nome,descricao,imagem_url,imagens,preco_centavos&order=created_at.desc'))));
digitalRoutes.post('/checkout',rateLimit({windowMs:60000,limit:10}),asyncHandler(async(req,res)=>{
 const input=z.object({id:uuid,produto_id:uuid,token:secret}).parse(req.body);
 let order=await findOrder(input.id);
 if(order) {
  if(order.token_hash!==hash(input.token) || order.produto_id!==input.produto_id) throw new HttpError(409,'Pedido já existente.');
  return res.json(publicOrder(order));
 }
 if(!livepixConfigured()) throw new HttpError(503,'Pagamento digital ainda não configurado.');
 const [p]=await db<any[]>('/produtos_digitais?id=eq.'+input.produto_id+'&ativo=eq.true&select=*');
 if(!p) throw new HttpError(404,'Produto indisponível.');
 const origin=new URL(process.env.DIGITAL_SITE_URL!);
 if(origin.protocol!=='https:' && origin.hostname!=='localhost') throw new HttpError(503,'Configure DIGITAL_SITE_URL com HTTPS.');
 const returnUrl=origin.origin+'/digitais/pedido/'+input.id+'#'+input.token;
 const inserted=await db<any[]>('/pedidos_digitais?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify({id:input.id,token_hash:hash(input.token),produto_id:p.id,nome:p.nome,valor_centavos:p.preco_centavos,download_url:p.download_url})});
 if(!inserted.length) throw new HttpError(409,'Pedido em processamento. Consulte sua compra.');
 try {
  const payment=await livepix('/payments',{amount:p.preco_centavos,currency:'BRL',redirectUrl:returnUrl});
  const url=new URL(payment.redirectUrl);
  if(!payment.reference || url.protocol!=='https:' || url.hostname!=='checkout.livepix.gg') throw new Error('Resposta inválida');
  [order]=await db<any[]>('/pedidos_digitais?id=eq.'+input.id,{method:'PATCH',body:JSON.stringify({status:'pendente',referencia:payment.reference,checkout_url:payment.redirectUrl})});
 } catch(e) {
  await db('/pedidos_digitais?id=eq.'+input.id+'&status=eq.criando',{method:'PATCH',body:JSON.stringify({status:'erro'})}).catch(()=>{});
  throw new HttpError(502,'Não foi possível preparar o pagamento. Nenhuma cobrança foi apresentada. Volte ao catálogo e tente uma nova compra.');
 }
 res.status(201).json(publicOrder(order));
}));
digitalRoutes.post('/pedidos/:id',asyncHandler(async(req,res)=>{
 const value=secret.parse(req.body.token);
 let order=await findOrder(req.params.id);
 if(!order || !timingSafeEqual(Buffer.from(order.token_hash,'hex'),Buffer.from(hash(value),'hex'))) throw new HttpError(404,'Compra não encontrada. Abra o link original da compra.');
 order=await verify(order);res.json(publicOrder(order));
}));
digitalRoutes.post('/webhook',asyncHandler(async(req,res)=>{
 // O evento é apenas um aviso: valores e confirmação vêm da API autenticada.
 const resource=req.body?.resource;
 if(resource?.type!=='payment' || typeof resource.reference!=='string' || resource.reference.length>200) return res.json({ok:true});
 const [order]=await db<any[]>('/pedidos_digitais?referencia=eq.'+restEq(resource.reference)+'&select=*');
 if(order) await verify(order);
 res.json({ok:true});
}));
digitalAdminRoutes.use(auth,admin);
digitalAdminRoutes.get('/produtos',asyncHandler(async(_req,res)=>res.json(await db('/produtos_digitais?select=*&order=created_at.desc'))));
digitalAdminRoutes.post('/produtos',asyncHandler(async(req,res)=>res.status(201).json((await db<any[]>('/produtos_digitais',{method:'POST',body:JSON.stringify(product.parse(req.body))}))[0])));
digitalAdminRoutes.put('/produtos/:id',asyncHandler(async(req,res)=>{
 const rows=await db<any[]>('/produtos_digitais?id=eq.'+uuid.parse(req.params.id),{method:'PATCH',body:JSON.stringify(product.parse(req.body))});
 if(!rows.length) throw new HttpError(404,'Produto não encontrado.');res.json(rows[0]);
}));
digitalAdminRoutes.get('/pedidos',asyncHandler(async(_req,res)=>res.json(await db('/pedidos_digitais?select=id,nome,valor_centavos,status,referencia,pagamento_id,created_at,pago_em&order=created_at.desc&limit=200'))));
digitalAdminRoutes.post('/pedidos/:id/verificar',asyncHandler(async(req,res)=>{
 const order=await findOrder(req.params.id);if(!order) throw new HttpError(404,'Compra não encontrada.');
 const checked=await verify(order);res.json({status:checked.status});
}));
digitalAdminRoutes.get('/integracao',asyncHandler(async(_req,res)=>res.json({configurado:livepixConfigured(),webhook_configuravel:Boolean(process.env.DIGITAL_API_URL)})));
digitalAdminRoutes.post('/integracao/webhook',asyncHandler(async(_req,res)=>{
 const base=https.parse(process.env.DIGITAL_API_URL).replace(/\/$/,'');
 const url=base+'/digital/webhook';
 const hooks=await livepix('/webhooks');
 if(!Array.isArray(hooks) || !hooks.some(h=>h.url===url)) await livepix('/webhooks',{url});
 res.json({message:'Webhook configurado no LivePix.'});
}));

const settings=z.object({
 nome:z.string().trim().min(1).max(100).default('Catálogo digital'),
 logo:z.union([https,z.literal('')]).default(''),
 titulo:z.string().max(160).default('Escolha, pague e baixe'),
 subtitulo:z.string().max(600).default('Arquivos para seus projetos. Download após a confirmação do pagamento.'),
 rodape_titulo:z.string().max(150).default('Catálogo digital'),
 rodape_texto:z.string().max(4000).default(''),
 contato:z.string().max(500).default(''),
 direitos:z.string().max(250).default(''),
 banner_intervalo:z.number().int().min(2).max(30).default(4),
 banner_automatico:z.boolean().default(true),
 banners:z.array(z.object({id:z.string().max(100),imagem:https,titulo:z.string().max(200).default(''),ativo:z.boolean().default(true)})).max(12).default([])
});
const readSettings=async()=>{const rows=await db<any[]>('/configuracoes_digitais?id=eq.1&select=dados');return settings.parse(rows[0]?.dados||{});};
digitalRoutes.get('/configuracoes',asyncHandler(async(_req,res)=>res.json(await readSettings())));
digitalAdminRoutes.get('/configuracoes',asyncHandler(async(_req,res)=>res.json(await readSettings())));
digitalAdminRoutes.put('/configuracoes',asyncHandler(async(req,res)=>{
 const dados=settings.parse(req.body);
 await db('/configuracoes_digitais?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({id:1,dados})});res.json(dados);
}));
