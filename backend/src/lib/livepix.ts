import { createHash } from 'node:crypto';
import { supabaseRest, restEq } from './supabaseRest.js';
import { HttpError } from '../utils/http.js';
let memory: { token: string; until: number } | undefined;
let pending: Promise<string> | undefined;
export function livepixConfigured() {
 return Boolean(process.env.LIVEPIX_CLIENT_ID && process.env.LIVEPIX_CLIENT_SECRET && process.env.DIGITAL_SITE_URL);
}
async function acquire(): Promise<string> {
 if (!livepixConfigured()) throw new HttpError(503, 'Pagamento digital ainda não configurado.');
 const id = createHash('sha256').update(process.env.LIVEPIX_CLIENT_ID! + process.env.LIVEPIX_CLIENT_SECRET!).digest('hex');
 const cached = await supabaseRest<any>('/rpc/livepix_token_claim', {method:'POST',body:JSON.stringify({cache_id:id})});
 if(cached.token) { memory={token:cached.token,until:Date.now()+30000}; return cached.token; }
 if(!cached.claim) throw new HttpError(503,'Conectando ao LivePix. Tente novamente em alguns segundos.');
 try {
  const response=await fetch('https://oauth.livepix.gg/oauth2/token',{method:'POST',signal:AbortSignal.timeout(15000),body:new URLSearchParams({grant_type:'client_credentials',client_id:process.env.LIVEPIX_CLIENT_ID!,client_secret:process.env.LIVEPIX_CLIENT_SECRET!,scope:'payments:read payments:write webhooks'})});
  const data=await response.json() as any;
  if(!response.ok || !data.access_token || !Number.isFinite(data.expires_in)) throw new HttpError(502,'Falha na autenticação LivePix. Confira a configuração no servidor.');
  const until=Date.now()+data.expires_in*1000;
  await supabaseRest('/livepix_tokens?id=eq.'+restEq(id),{method:'PATCH',body:JSON.stringify({access_token:data.access_token,expires_at:new Date(until).toISOString(),locked_until:null})});
  memory={token:data.access_token,until:until-60000};return data.access_token;
 } catch(e) {
  await supabaseRest('/livepix_tokens?id=eq.'+restEq(id),{method:'PATCH',body:JSON.stringify({locked_until:null})}).catch(()=>{});
  throw e;
 }
}
async function token() {
 if(memory && memory.until>Date.now()) return memory.token;
 if(!pending) pending=acquire().finally(()=>{pending=undefined;});
 return pending;
}
export async function livepix(path:string, body?:unknown) {
 const bearer=await token();
 const response=await fetch('https://api.livepix.gg/v2'+path,{method:body?'POST':'GET',signal:AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+bearer,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 if(!response.ok) throw new HttpError(502,'LivePix indisponível ou configuração inválida. Tente novamente mais tarde.');
 return (await response.json() as any).data;
}
export function verifiedPayment(order:any, payment:any):boolean {
 return Boolean(order.referencia && payment?.id && payment.reference===order.referencia && payment.currency==='BRL' && Number.isInteger(payment.amount) && payment.amount===order.valor_centavos);
}
