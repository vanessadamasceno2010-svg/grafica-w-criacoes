import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { HttpError } from '../utils/http.js';

export function digitalGateway(): 'livepix' | 'uvvipay' {
 const value=process.env.DIGITAL_PAYMENT_GATEWAY||'uvvipay';
 if(value!=='livepix' && value!=='uvvipay') throw new HttpError(503,'DIGITAL_PAYMENT_GATEWAY inválido no servidor.');
 return value;
}
export function uvviEnvironment(): 'production' | 'staging' {
 const value=process.env.UVVIPAY_ENV||'production';
 if(value!=='production' && value!=='staging') throw new HttpError(503,'UVVIPAY_ENV inválido no servidor.');
 return value;
}
export function uvviConfigured() {
 return Boolean(process.env.UVVIPAY_CLIENT_ID && process.env.UVVIPAY_CLIENT_SECRET);
}
export function uvviWebhookConfigured() {
 const secret=process.env.UVVIPAY_WEBHOOK_SECRET||'';
 return secret.length>=32 && secret.length<=256 && /^https:\/\//.test(process.env.DIGITAL_API_URL||'');
}
export async function uvvipay(path:string, options:{method?:string;body?:unknown;idempotencyKey?:string;environment?:string}={}) {
 if(!uvviConfigured()) throw new HttpError(503,'Configure as credenciais UvviPay no backend.');
 const environment=options.environment||uvviEnvironment();
 if(environment!==uvviEnvironment()) throw new HttpError(409,'Esta compra pertence a outro ambiente UvviPay. Consulte o administrador.');
 const base=environment==='staging'?'https://api-staging.uvvipay.com.br':'https://api.uvvipay.com.br';
 let response:Response;
 try {
  response=await fetch(base+'/v1'+path,{
   method:options.method||(options.body?'POST':'GET'),signal:AbortSignal.timeout(12000),redirect:'error',
   headers:{'Content-Type':'application/json','client-id':process.env.UVVIPAY_CLIENT_ID!,'client-secret':process.env.UVVIPAY_CLIENT_SECRET!,...(options.idempotencyKey?{'x-idempotency-key':options.idempotencyKey}:{})},
   ...(options.body?{body:JSON.stringify(options.body)}:{})
  });
 }catch{throw new HttpError(502,'Não foi possível consultar a UvviPay. Use “Tentar novamente” nesta mesma compra.');}
 const data=await response.json().catch(()=>null) as any;
 if(!response.ok){
  // Não registrar credenciais, documentos, payloads ou respostas integrais do provedor.
  if(response.status===409)throw new HttpError(409,'Pagamento em processamento. Aguarde e tente novamente nesta compra.');
  if(response.status===401||response.status===403)throw new HttpError(503,'Credenciais ou permissões UvviPay inválidas. Contate a loja.');
  if(data?.code==='IDEMPOTENCY_KEY_NOT_SUPPORTED')throw new HttpError(503,'A conta UvviPay precisa habilitar idempotência para esta integração.');
  if(response.status===400||response.status===422)throw new HttpError(422,'A UvviPay não aceitou a cobrança. Confira os dados do comprador e os limites da conta.');
  throw new HttpError(502,'UvviPay indisponível. Tente novamente nesta mesma compra.');
 }
 if(!data)throw new HttpError(502,'Resposta inválida da UvviPay.');
 return data;
}
export function validateDocument(value:string) {
 const n=value.replace(/\D/g,'');
 if(!/^(\d{11}|\d{14})$/.test(n)||/^(\d)\1+$/.test(n))return false;
 function digit(base:string,weights:number[]){const sum=base.split('').reduce((a,c,i)=>a+Number(c)*weights[i],0);const r=sum%11;return r<2?0:11-r;}
 if(n.length===11)return digit(n.slice(0,9),[10,9,8,7,6,5,4,3,2])===Number(n[9])&&digit(n.slice(0,10),[11,10,9,8,7,6,5,4,3,2])===Number(n[10]);
 return digit(n.slice(0,12),[5,4,3,2,9,8,7,6,5,4,3,2])===Number(n[12])&&digit(n.slice(0,13),[6,5,4,3,2,9,8,7,6,5,4,3,2])===Number(n[13]);
}
export const uvviCustomer=z.object({
 nome:z.string().trim().min(3).max(255),email:z.string().trim().email().max(320),
 documento:z.string().max(30).transform(s=>s.replace(/\D/g,'')).refine(validateDocument,'CPF ou CNPJ inválido.')
});
export function matchesUvviPayment(order:any,payment:any) {
 return Boolean(payment && typeof payment.id==='string' && z.string().uuid().safeParse(payment.id).success
  && (!order.pagamento_id || order.pagamento_id===payment.id)
  && payment.externalReference===order.id && payment.paymentMethod==='pix'
  && Number.isSafeInteger(payment.amount) && payment.amount===order.valor_centavos
  && (payment.currency===undefined || payment.currency==='BRL'));
}
export function verifyUvviSignature(raw:Buffer|undefined,signature:string|undefined,timestamp:string|undefined,now=Date.now()) {
 const secret=process.env.UVVIPAY_WEBHOOK_SECRET||'';
 if(secret.length<32||!raw||!signature||!timestamp||!/^\d+$/.test(timestamp)||!/^sha256=[a-f0-9]{64}$/.test(signature))return false;
 if(Math.abs(Math.floor(now/1000)-Number(timestamp))>300)return false;
 const expected='sha256='+createHmac('sha256',secret).update(timestamp+'.').update(raw).digest('hex');
 return timingSafeEqual(Buffer.from(expected),Buffer.from(signature));
}
export const uvviEvents=['transaction.paid','transaction.refused','transaction.refunded','transaction.chargedback','transaction.cancelled','transaction.expired','transaction.in_analysis'];
