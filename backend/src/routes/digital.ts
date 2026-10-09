import { isIP } from 'node:net';
import { digitalGateway, uvviEnvironment, uvviConfigured, uvviWebhookConfigured, uvvipay, uvviCustomer, validateDocument, matchesUvviPayment, verifyUvviSignature, uvviEvents } from '../lib/uvvipay.js';
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
const product=z.object({nome:z.string().trim().min(1).max(150),descricao:z.string().max(10000).default(''),imagem_url:z.union([https,z.literal('')]).default(''),imagens:z.array(https).max(12).optional(),preco_centavos:z.number().int().min(1).max(100000000),download_url:https,ativo:z.boolean()}).refine(p=>digitalGateway()!=='uvvipay'||(p.preco_centavos>=100&&p.preco_centavos<=15000000),'Para UvviPay, use valores entre R$ 1,00 e R$ 150.000,00.').transform(p=>{const imagens=p.imagens ?? (p.imagem_url?[p.imagem_url]:[]);return {...p,imagens,imagem_url:imagens[0]||''};});
const findOrder=async(id:string)=>(await db<any[]>('/pedidos_digitais?id=eq.'+restEq(uuid.parse(id))+'&select=*'))[0];
async function applyUvvi(order:any,payment:any) {
 payment=payment?.data&&typeof payment.data==='object'?payment.data:payment;
 if(!matchesUvviPayment(order,payment)) throw new HttpError(502,'Pagamento não corresponde a esta compra. Contate a loja.');
 const code=typeof payment.pix?.qrcode==='string' ? payment.pix.qrcode : null;
 const expires=payment.pix?.expiresAt;
 return db<any>('/rpc/aplicar_pagamento_uvvipay',{method:'POST',body:JSON.stringify({p_pedido:order.id,p_pagamento:payment.id,p_status:String(payment.status||''),p_codigo:code,p_expira:typeof expires==='string' && Number.isFinite(Date.parse(expires))?expires:null})});
}
async function prepareUvvi(order:any) {
 if(order.pagamento_id) return verify(order);
 if(!order.gateway_payload) throw new HttpError(409,'Dados da cobrança indisponíveis. Contate a loja.');
 let payment=await uvvipay('/payments',{body:order.gateway_payload,idempotencyKey:order.id,environment:order.gateway_ambiente});
 payment=payment?.data&&typeof payment.data==='object'?payment.data:payment;
 // Alguns retornos de criação informam apenas o id; uma consulta imediata
 // garante que o QR/Pix Copia e Cola já acompanhe a primeira resposta.
 if(payment?.id && !payment?.pix?.qrcode) payment=await uvvipay('/payments/'+encodeURIComponent(payment.id),{environment:order.gateway_ambiente});
 await applyUvvi(order,payment);
 return await findOrder(order.id);
}
async function verify(order:any) {
 if(order.gateway==='uvvipay') {
  if(!order.pagamento_id) return order;
  const payment=await uvvipay('/payments/'+encodeURIComponent(order.pagamento_id),{environment:order.gateway_ambiente});
  await applyUvvi(order,payment);
  return await findOrder(order.id);
 }
 if(order.status==='pago' || !order.referencia) return order;
 const payments=await livepix('/payments?reference='+encodeURIComponent(order.referencia));
 const payment=Array.isArray(payments)?payments.find(p=>verifiedPayment(order,p)):null;
 if(payment) {
  await db('/pedidos_digitais?id=eq.'+order.id+'&status=neq.pago',{method:'PATCH',body:JSON.stringify({status:'pago',pagamento_id:payment.id,pago_em:new Date().toISOString()})});
  return await findOrder(order.id);
 }
 return order;
}
const publicOrder=(o:any)=>({id:o.id,nome:o.nome,valor_centavos:o.valor_centavos,status:o.status,checkout_url:o.checkout_url,
 gateway:o.gateway||'livepix',teste:o.gateway==='uvvipay' && o.gateway_ambiente==='staging',
 pix_codigo:o.gateway==='uvvipay'&&o.pix_codigo?o.pix_codigo:null,pix_expira_em:o.gateway==='uvvipay'&&o.pix_codigo?o.pix_expira_em:null,
 pode_tentar_novamente:o.gateway==='uvvipay' && !o.pagamento_id && ['criando','erro'].includes(o.status),
 ...(o.status==='pago' && !(o.gateway==='uvvipay' && o.gateway_ambiente==='staging')?{download_url:o.download_url}: {})});
async function authorizedOrder(id:string,value:unknown) {
 const access=secret.parse(value);const order=await findOrder(id);
 if(!order || !timingSafeEqual(Buffer.from(order.token_hash,'hex'),Buffer.from(hash(access),'hex'))) throw new HttpError(404,'Compra não encontrada. Abra o link original da compra.');
 return order;
}
digitalRoutes.use((_req,res,next)=>{res.set('Cache-Control','no-store');next();});
digitalRoutes.get('/produtos',asyncHandler(async(_req,res)=>res.json(await db('/produtos_digitais?ativo=eq.true&select=id,nome,descricao,imagem_url,imagens,preco_centavos&order=created_at.desc'))));
digitalRoutes.get('/pagamento-configuracao',asyncHandler(async(_req,res)=>{
 const gateway=digitalGateway();res.json({gateway,habilitado:gateway==='uvvipay'?uvviConfigured():livepixConfigured(),teste:gateway==='uvvipay'&&uvviEnvironment()==='staging'});
}));
digitalRoutes.post('/checkout',rateLimit({windowMs:60000,limit:10}),asyncHandler(async(req,res)=>{
 const input=z.object({id:uuid,produto_id:uuid,token:secret}).parse(req.body);
 let order=await findOrder(input.id);
 if(order) {
  order=await authorizedOrder(input.id,input.token);
  if(order.produto_id!==input.produto_id) throw new HttpError(409,'Pedido já existente para outro produto.');
  if(order.gateway==='uvvipay') order=await prepareUvvi(order);
  return res.json(publicOrder(order));
 }
 const gateway=digitalGateway();
 if(gateway==='uvvipay'?!uvviConfigured():!livepixConfigured()) throw new HttpError(503,'Pagamento digital ainda não configurado.');
 const [p]=await db<any[]>('/produtos_digitais?id=eq.'+input.produto_id+'&ativo=eq.true&select=*');
 if(!p) throw new HttpError(404,'Produto indisponível.');
 let payload:any=null;
 if(gateway==='uvvipay') {
  if(p.preco_centavos<100 || p.preco_centavos>15000000) throw new HttpError(422,'Este produto está fora dos limites de valor da UvviPay. Contate a loja.');
  const customer=uvviCustomer.parse(req.body.cliente);
  const ip=String(req.ip||'').replace(/^::ffff:/,'');
  if(!isIP(ip)) throw new HttpError(400,'Não foi possível identificar a conexão do comprador.');
  payload={externalId:input.id,amount:p.preco_centavos,paymentMethod:'pix',ip,
   customer:{name:customer.nome,email:customer.email,document:{number:customer.documento,type:customer.documento.length===11?'cpf':'cnpj'}},
   items:[{title:p.nome,quantity:1,unitPrice:p.preco_centavos,tangible:false}],pix:{expiration:{type:'seconds',value:1800}}};
 }
 const documentoHash=gateway==='uvvipay'?hash((payload.customer.document.number as string)):null;
  const inserted=await db<any[]>('/pedidos_digitais?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify({id:input.id,token_hash:hash(input.token),cliente_documento_hash:documentoHash,produto_id:p.id,nome:p.nome,valor_centavos:p.preco_centavos,download_url:p.download_url,gateway,gateway_ambiente:gateway==='uvvipay'?uvviEnvironment():'production',gateway_payload:payload})});
 if(!inserted.length) throw new HttpError(409,'Pedido em processamento. Consulte sua compra.');
 order=inserted[0];
 try {
  if(gateway==='uvvipay') order=await prepareUvvi(order);
  else {
   const origin=new URL(process.env.DIGITAL_SITE_URL!);
   if(origin.protocol!=='https:' && origin.hostname!=='localhost') throw new HttpError(503,'Configure DIGITAL_SITE_URL com HTTPS.');
   const payment=await livepix('/payments',{amount:p.preco_centavos,currency:'BRL',redirectUrl:origin.origin+'/digitais/pedido/'+input.id+'#'+input.token});
   const url=new URL(payment.redirectUrl);
   if(!payment.reference||url.protocol!=='https:'||url.hostname!=='checkout.livepix.gg') throw new HttpError(502,'Resposta LivePix inválida.');
   [order]=await db<any[]>('/pedidos_digitais?id=eq.'+input.id,{method:'PATCH',body:JSON.stringify({status:'pendente',referencia:payment.reference,checkout_url:payment.redirectUrl})});
  }
 }catch(e){
  await db('/pedidos_digitais?id=eq.'+input.id+'&status=eq.criando',{method:'PATCH',body:JSON.stringify({status:'erro'})}).catch(()=>{});
  throw e;
 }
 res.status(201).json(publicOrder(order));
}));
digitalRoutes.post('/compras',rateLimit({windowMs:60000,limit:5}),asyncHandler(async(req,res)=>{
 const documento=z.string().max(30).transform(s=>s.replace(/\D/g,'')).refine(validateDocument,'CPF ou CNPJ inválido.').parse(req.body?.documento);
 const rows=await db<any[]>('/pedidos_digitais?cliente_documento_hash=eq.'+hash(documento)+'&status=eq.pago&select=id,nome,valor_centavos,status,created_at,pago_em&order=created_at.desc&limit=50');
 res.json(rows.map(o=>({...o,pode_baixar:true})));
}));
digitalRoutes.post('/compras/:id/baixar',rateLimit({windowMs:60000,limit:12}),asyncHandler(async(req,res)=>{
 const id=uuid.parse(req.params.id),documento=z.string().max(30).transform(s=>s.replace(/\D/g,'')).refine(validateDocument,'CPF ou CNPJ inválido.').parse(req.body?.documento);
 const [order]=await db<any[]>('/pedidos_digitais?id=eq.'+id+'&cliente_documento_hash=eq.'+hash(documento)+'&status=eq.pago&select=id,download_url,gateway,gateway_ambiente');
 if(!order || (order.gateway==='uvvipay'&&order.gateway_ambiente==='staging')) throw new HttpError(404,'Compra não encontrada ou ainda sem download disponível.');
 res.json({download_url:order.download_url});
}));
digitalRoutes.post('/pedidos/:id',asyncHandler(async(req,res)=>res.json(publicOrder(await verify(await authorizedOrder(req.params.id,req.body.token))))));
digitalRoutes.post('/pedidos/:id/retry',rateLimit({windowMs:60000,limit:6}),asyncHandler(async(req,res)=>{
 const order=await authorizedOrder(req.params.id,req.body.token);
 if(order.gateway!=='uvvipay') throw new HttpError(409,'Consulte a compra pelo LivePix.');
 res.json(publicOrder(await prepareUvvi(order)));
}));
digitalRoutes.post('/webhook/uvvipay',asyncHandler(async(req,res)=>{
 if(!verifyUvviSignature((req as any).rawBody,req.get('X-UvviPay-Signature'),req.get('X-UvviPay-Timestamp'))) throw new HttpError(401,'Assinatura de webhook inválida.');
 if(!uvviEvents.includes(req.body?.event)) return res.json({ok:true});
 const id=uuid.safeParse(req.body?.id);if(!id.success) throw new HttpError(400,'Identificador da transação ausente.');
 // Não confiar no status/valor do webhook. Consultar sempre a conta autenticada.
 const payment=await uvvipay('/payments/'+id.data);
 if(!uuid.safeParse(payment.externalReference).success) return res.json({ok:true});
 const order=await findOrder(payment.externalReference);
 if(order?.gateway==='uvvipay' && order.gateway_ambiente===uvviEnvironment()) await applyUvvi(order,payment);
 res.json({ok:true});
}));
digitalRoutes.post('/webhook',asyncHandler(async(req,res)=>{
 // O evento é apenas um aviso: valores e confirmação vêm da API autenticada.
 const resource=req.body?.resource;
 if(resource?.type!=='payment' || typeof resource.reference!=='string' || resource.reference.length>200) return res.json({ok:true});
 const [order]=await db<any[]>('/pedidos_digitais?gateway=eq.livepix&referencia=eq.'+restEq(resource.reference)+'&select=*');
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
digitalAdminRoutes.get('/pedidos',asyncHandler(async(_req,res)=>res.json(await db('/pedidos_digitais?select=id,nome,valor_centavos,status,gateway,gateway_ambiente,referencia,pagamento_id,created_at,pago_em&order=created_at.desc&limit=200'))));
digitalAdminRoutes.post('/pedidos/:id/verificar',asyncHandler(async(req,res)=>{
 const order=await findOrder(req.params.id);if(!order) throw new HttpError(404,'Compra não encontrada.');
 const checked=order.gateway==='uvvipay'&&!order.pagamento_id?await prepareUvvi(order):await verify(order);res.json({status:checked.status});
}));
digitalAdminRoutes.get('/integracao',asyncHandler(async(_req,res)=>{
 const gateway=digitalGateway();res.json({gateway,ambiente:gateway==='uvvipay'?uvviEnvironment():'production',configurado:gateway==='uvvipay'?uvviConfigured():livepixConfigured(),webhook_configuravel:gateway==='uvvipay'?uvviWebhookConfigured():Boolean(process.env.DIGITAL_API_URL)});
}));
digitalAdminRoutes.post('/integracao/webhook',asyncHandler(async(_req,res)=>{
 const base=https.parse(process.env.DIGITAL_API_URL).replace(/\/$/,'');
 if(digitalGateway()==='uvvipay') {
  if(!uvviWebhookConfigured()) throw new HttpError(503,'Configure DIGITAL_API_URL e UVVIPAY_WEBHOOK_SECRET (32 a 256 caracteres) no backend.');
  const url=base+'/digital/webhook/uvvipay';
  const hooks=await uvvipay('/webhooks');
  if(!Array.isArray(hooks.data)) throw new HttpError(502,'Resposta de webhooks UvviPay inválida.');
  const existing=hooks.data.find((h:any)=>h.endpoint===url);
  const body={webhook_url:url,events:uvviEvents,hmac_secret:process.env.UVVIPAY_WEBHOOK_SECRET};
  const result=await uvvipay(existing?'/webhooks/'+uuid.parse(existing.id):'/webhooks',{method:existing?'PUT':'POST',body});
  if(result?.data?.status!=='active'||result?.data?.hmac_configured!==true) throw new HttpError(502,'Webhook cadastrado, mas não está ativo com assinatura. Verifique o painel UvviPay.');
  return res.json({message:'Webhook UvviPay configurado e assinado.'});
 }
 const url=base+'/digital/webhook';const hooks=await livepix('/webhooks');
 if(!Array.isArray(hooks)||!hooks.some(h=>h.url===url))await livepix('/webhooks',{url});
 res.json({message:'Webhook LivePix configurado.'});
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
