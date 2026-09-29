import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {createHash} from 'node:crypto';
process.env.SUPABASE_URL='https://database.test';
process.env.SUPABASE_SERVICE_ROLE_KEY='test';
process.env.LIVEPIX_CLIENT_ID='test';process.env.LIVEPIX_CLIENT_SECRET='test';process.env.DIGITAL_SITE_URL='https://site.test';
const {verifiedPayment}=await import('../dist/lib/livepix.js');
const db=new PGlite();
await db.exec('create role anon; create role authenticated; create role service_role;');
const sql=readFileSync(new URL('../../database/migrations/015_catalogo_digital.sql',import.meta.url),'utf8');
await db.exec(sql);await db.exec(sql);
const claim=async()=>(await db.query("select livepix_token_claim('test') as v")).rows[0].v;
assert.equal((await claim()).claim,true);assert.equal((await claim()).busy,true);
await db.exec("update livepix_tokens set access_token='cached',expires_at=now()+interval '1 hour'");
assert.equal((await claim()).token,'cached');
await db.exec('set role anon');await assert.rejects(()=>db.query('select * from produtos_digitais'));await assert.rejects(()=>db.query("select livepix_token_claim('test')"));await db.exec('reset role');
const order={id:'11111111-1111-4111-8111-111111111111',produto_id:'22222222-2222-4222-8222-222222222222',nome:'Arquivo',valor_centavos:1500,referencia:'ref-one',status:'pendente',download_url:'https://files.test/private.zip',token_hash:createHash('sha256').update('a'.repeat(64)).digest('hex')};
const correct={id:'payment-one',reference:'ref-one',amount:1500,currency:'BRL'};
assert(verifiedPayment(order,correct));
for(const patch of [{reference:'other'},{amount:1},{currency:'USD'},{amount:'1500'},{id:''}]) assert(!verifiedPayment(order,{...correct,...patch}));
let payments=[],writes=0;
const originalFetch=global.fetch;
global.fetch=async(url,options={})=>{
 const u=new URL(url),body=options.body?JSON.parse(options.body):null;
 if(u.hostname==='api.livepix.gg')return Response.json({data:payments});
 if(u.pathname.endsWith('/rpc/livepix_token_claim'))return Response.json({token:'test-token'});
 if(u.pathname.endsWith('/pedidos_digitais')){
  if(options.method==='PATCH'){Object.assign(order,body);writes++;}
  return Response.json([order]);
 }
 if(u.pathname.endsWith('/produtos_digitais')){assert(!u.search.includes('download_url'));return Response.json([{id:order.produto_id,nome:'Arquivo',preco_centavos:1500}]);}
 throw new Error('Unexpected '+url);
};
const express=(await import('express')).default;
const {digitalRoutes,digitalAdminRoutes}=await import('../dist/routes/digital.js');
const {errorHandler}=await import('../dist/middleware/error.js');
const app=express();app.use(express.json());app.use('/digital',digitalRoutes);app.use('/admin/digital',digitalAdminRoutes);app.use(errorHandler);
const server=app.listen(0);await new Promise(r=>server.once('listening',r));
const base='http://localhost:'+server.address().port;
async function req(path,body){const r=await originalFetch(base+path,{...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
try{
 assert.equal((await req('/admin/digital/produtos')).status,401);
 assert(!JSON.stringify((await req('/digital/produtos')).data).includes('private.zip'));
 assert.equal((await req('/digital/pedidos/'+order.id,{token:'b'.repeat(64)})).status,404);
 assert.equal((await req('/digital/pedidos/'+order.id,{token:'a'.repeat(64)})).data.download_url,undefined);
 await req('/digital/webhook',{resource:{type:'payment',reference:'ref-one'},status:'paid',amount:1500});assert.equal(order.status,'pendente');
 payments=[{...correct,amount:100}];await req('/digital/webhook',{resource:{type:'payment',reference:'ref-one'}});assert.equal(order.status,'pendente');
 payments=[correct];await req('/digital/webhook',{resource:{type:'payment',reference:'ref-one'}});assert.equal(order.status,'pago');assert.equal(writes,1);
 await req('/digital/webhook',{resource:{type:'payment',reference:'ref-one'}});assert.equal(writes,1);
 assert.equal((await req('/digital/pedidos/'+order.id,{token:'a'.repeat(64)})).data.download_url,order.download_url);
 assert.equal((await req('/digital/pedidos/'+order.id,{token:'b'.repeat(64)})).status,404);
 console.log('PASS: migration, RLS, shared token cache, admin auth, secret access, fake webhook, amount validation, verified delivery and idempotency.');
}finally{server.close();global.fetch=originalFetch;await db.close();}
