import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHmac,randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
Object.assign(process.env,{VERCEL:'1',SUPABASE_URL:'https://database.test',SUPABASE_SERVICE_ROLE_KEY:'test',JWT_SECRET:'a-test-secret-that-is-longer-than-32-characters',UVVIPAY_CLIENT_ID:'test-client',UVVIPAY_CLIENT_SECRET:'test-secret',UVVIPAY_WEBHOOK_SECRET:'a-secret-for-webhooks-at-least-32-characters',UVVIPAY_ENV:'production',DIGITAL_PAYMENT_GATEWAY:'uvvipay',DIGITAL_API_URL:'https://api.store.test/api'});
const db=new PGlite();await db.exec('create role anon; create role authenticated; create role service_role;');
for(const name of ['015_catalogo_digital.sql','016_digital_identidade_imagens.sql','017_digital_uvvipay.sql','017_digital_uvvipay.sql'])await db.exec(readFileSync(new URL('../../database/migrations/'+name,import.meta.url),'utf8'));
await db.exec('set role anon');await assert.rejects(()=>db.query('select gateway_payload from pedidos_digitais'));await assert.rejects(()=>db.query("select aplicar_pagamento_uvvipay(gen_random_uuid(),'id','paid')"));await db.exec('reset role');
const productId=randomUUID();await db.query("insert into produtos_digitais(id,nome,preco_centavos,download_url) values($1,'Arquivo digital',2590,'https://files.test/secret.zip')",[productId]);
const {validateDocument,verifyUvviSignature,matchesUvviPayment}=await import('../dist/lib/uvvipay.js');
assert(validateDocument('529.982.247-25'));assert(!validateDocument('11111111111'));assert(!validateDocument('52998224726'));
const nativeFetch=global.fetch,payments=new Map(),keys=new Map();let creations=0,failOnce=false,hookWrites=0;
const quote=s=>'"'+s.replace(/"/g,'""')+'"';
async function rest(url,options){
 const table=url.pathname.split('/').pop(),body=options.body?JSON.parse(options.body):null,method=options.method||'GET';
 if(table==='aplicar_pagamento_uvvipay')return Response.json((await db.query('select aplicar_pagamento_uvvipay($1,$2,$3,$4,$5) as value',[body.p_pedido,body.p_pagamento,body.p_status,body.p_codigo,body.p_expira])).rows[0].value);
 assert(['pedidos_digitais','produtos_digitais'].includes(table));
 const values=[],where=[];
 for(const [key,value] of url.searchParams){if(['select','order','limit','on_conflict'].includes(key))continue;const dot=value.indexOf('.'),op=value.slice(0,dot),v=value.slice(dot+1);assert(['eq','neq'].includes(op));values.push(v);where.push(quote(key)+(op==='eq'?'=':'<>')+'$'+values.length);}
 const clause=where.length?' where '+where.join(' and '):'';
 if(method==='GET'){const columns=(url.searchParams.get('select')||'*').split(',').map(x=>x==='*'?'*':quote(x)).join(',');return Response.json((await db.query('select '+columns+' from '+table+clause,values)).rows);}
 if(method==='POST'){const fields=Object.keys(body);const rows=await db.query('insert into '+table+'('+fields.map(quote).join(',')+') values('+fields.map((_,i)=>'$'+(i+1)).join(',')+') on conflict(id) do nothing returning *',fields.map(k=>body[k]));return Response.json(rows.rows);}
 if(method==='PATCH'){const set=Object.keys(body).map(k=>{values.push(body[k]);return quote(k)+'=$'+values.length;});return Response.json((await db.query('update '+table+' set '+set.join(',')+clause+' returning *',values)).rows);}
 throw new Error(method);
}
global.fetch=async(url,options={})=>{
 const u=new URL(url);
 if(u.hostname==='database.test')return rest(u,options);
 assert(['api.uvvipay.com.br','api-staging.uvvipay.com.br'].includes(u.hostname));
 assert.equal(options.headers['client-secret'],'test-secret');
 if(u.pathname==='/v1/payments'){
  const body=JSON.parse(options.body),key=options.headers['x-idempotency-key'];assert.equal(key,body.externalId);
  assert.equal(body.amount,2590);assert.equal(body.items[0].tangible,false);assert(body.ip);
  if(!keys.has(key)){const payment={id:randomUUID(),externalReference:body.externalId,amount:body.amount,paymentMethod:'pix',status:'waiting_payment',pix:{qrcode:'000201-PAYLOAD-TEST',expiresAt:new Date(Date.now()+1800000).toISOString()}};keys.set(key,{body:options.body,id:payment.id});payments.set(payment.id,payment);creations++;}
  assert.equal(options.body,keys.get(key).body,'retry must use immutable payload');
  if(failOnce){failOnce=false;throw new Error('Simulated timeout after create');}
  return Response.json(payments.get(keys.get(key).id));
 }
 if(u.pathname.startsWith('/v1/payments/'))return Response.json(payments.get(u.pathname.split('/').pop()));
 if(u.pathname==='/v1/webhooks'){
  if(options.method==='GET')return Response.json({data:[]});hookWrites++;const body=JSON.parse(options.body);assert(body.events.includes('transaction.refunded'));assert.equal(body.hmac_secret,process.env.UVVIPAY_WEBHOOK_SECRET);return Response.json({data:{status:'active',hmac_configured:true}});
 }
 throw new Error(u.toString());
};
const {app}=await import('../dist/index.js');const {signToken}=await import('../dist/middleware/auth.js');
const server=app.listen(0);await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port+'/api';
async function req(path,body,headers={}){const response=await nativeFetch(base+path,{...(body?{method:'POST',body:JSON.stringify(body)}:{}),headers:{'Content-Type':'application/json',...headers}});return {status:response.status,data:await response.json()};}
async function webhook(id,event='transaction.paid',extra={},bad=false){const body={id,event,...extra},raw=JSON.stringify(body),timestamp=String(Math.floor(Date.now()/1000)),signature='sha256='+createHmac('sha256',process.env.UVVIPAY_WEBHOOK_SECRET).update(timestamp+'.'+raw).digest('hex');return req('/digital/webhook/uvvipay',body,{'X-UvviPay-Timestamp':timestamp,'X-UvviPay-Signature':bad?'sha256='+'0'.repeat(64):signature});}
const buyer={nome:'Comprador Teste',email:'teste@example.com',documento:'52998224725'};
const input={id:randomUUID(),produto_id:productId,token:'a'.repeat(64),cliente:buyer,total:1,status:'pago'};
try {
 assert.equal((await req('/admin/digital/integracao')).status,401);
 assert.equal((await req('/digital/checkout',{...input,cliente:{...buyer,documento:'11111111111'}})).status,422);
 failOnce=true;assert.equal((await req('/digital/checkout',input)).status,502);assert.equal(creations,1);
 let order=(await req('/digital/pedidos/'+input.id,{token:input.token})).data;assert.equal(order.status,'erro');assert(order.pode_tentar_novamente);assert(!order.download_url);assert(!JSON.stringify(order).includes(buyer.documento));
 order=(await req('/digital/pedidos/'+input.id+'/retry',{token:input.token})).data;assert.equal(order.status,'pendente');assert.equal(creations,1);assert(order.pix_codigo);assert(!order.download_url);
 await req('/digital/checkout',input);assert.equal(creations,1);
 assert.equal((await req('/digital/pedidos/'+input.id,{token:'b'.repeat(64)})).status,404);
 const payment=payments.get(keys.get(input.id).id);
 assert.equal((await webhook(payment.id,'transaction.paid',{},true)).status,401);
 assert.equal((await webhook(payment.id,'transaction.paid',{status:'paid',amount:2590})).status,200);
 assert.equal((await req('/digital/pedidos/'+input.id,{token:input.token})).data.download_url,undefined);
 payment.status='paid';payment.amount=1;assert.equal((await webhook(payment.id)).status,502);payment.amount=2590;
 payment.externalReference=randomUUID();assert(!matchesUvviPayment({id:input.id,valor_centavos:2590},payment));payment.externalReference=input.id;
 assert.equal((await webhook(payment.id)).status,200);order=(await req('/digital/pedidos/'+input.id,{token:input.token})).data;assert.equal(order.status,'pago');assert.equal(order.download_url,'https://files.test/secret.zip');
 const time=(await db.query('select pago_em from pedidos_digitais where id=$1',[input.id])).rows[0].pago_em;await webhook(payment.id);assert.deepEqual((await db.query('select pago_em from pedidos_digitais where id=$1',[input.id])).rows[0].pago_em,time);
 payment.status='refunded';await webhook(payment.id,'transaction.refunded');order=(await req('/digital/pedidos/'+input.id,{token:input.token})).data;assert.equal(order.status,'estornado');assert(!order.download_url);
 // Uma resposta atrasada de paid não reabre acesso após estorno.
 payment.status='paid';await webhook(payment.id);assert.equal((await req('/digital/pedidos/'+input.id,{token:input.token})).data.status,'estornado');
 const timestamp=String(Math.floor(Date.now()/1000)-301),raw=Buffer.from('{}'),signature='sha256='+createHmac('sha256',process.env.UVVIPAY_WEBHOOK_SECRET).update(timestamp+'.{}').digest('hex');assert(!verifyUvviSignature(raw,signature,timestamp));
 const auth={Authorization:'Bearer '+signToken({id:randomUUID(),email:'admin@example.com',role:'admin'})};assert.equal((await req('/admin/digital/integracao/webhook',{},auth)).status,200);assert.equal(hookWrites,1);
 process.env.UVVIPAY_ENV='staging';const testInput={...input,id:randomUUID(),token:'c'.repeat(64)};await req('/digital/checkout',testInput);const tp=payments.get(keys.get(testInput.id).id);tp.status='paid';order=(await req('/digital/pedidos/'+testInput.id,{token:testInput.token})).data;assert(order.teste);assert.equal(order.status,'pago');assert(!order.download_url);
 console.log('PASS UvviPay: SQL/RLS, buyer validation, authoritative prices, idempotent timeout recovery, private payload, HMAC/replay checks, authenticated confirmation, wrong amounts, refund/reordering, webhook registration, staging isolation.');
} finally {await new Promise(r=>server.close(r));global.fetch=nativeFetch;await db.close();}
