import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download, ArrowLeft, Search } from 'lucide-react';
import { apiFetch, formatMoney } from '../lib/api';
export type DigitalProduct={id:string;nome:string;descricao:string;imagem_url:string;preco_centavos:number;download_url?:string;ativo?:boolean};
type Purchase={id:string;nome:string;valor_centavos:number;status:string;checkout_url?:string;download_url?:string};
const button='inline-flex justify-center items-center gap-2 rounded-xl bg-primary px-5 py-3 text-white font-semibold disabled:opacity-50';
function Frame({children}:{children:React.ReactNode}) {
 return <div className="min-h-screen bg-slate-50"><header className="bg-white border-b"><div className="max-w-6xl mx-auto px-4 py-5 flex flex-wrap gap-4 items-center justify-between"><Link to="/digitais"><img className="w-52" src="/assets/logo-grafica-w-criacoes.png" alt="Gráfica W Criações" /></Link><Link to="/" className="text-sm flex items-center gap-2"><ArrowLeft size={16}/> Site da gráfica</Link></div></header><main className="max-w-6xl mx-auto px-4 py-8">{children}</main></div>;
}
function recentPurchases():{id:string;token:string;nome:string}[] {
 try{return JSON.parse(localStorage.getItem('compras_digitais')||'[]');}catch{return [];}
}
export function Digitais() {
 const [products,setProducts]=useState<DigitalProduct[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(''),[query,setQuery]=useState('');
 useEffect(()=>{apiFetch<DigitalProduct[]>('/digital/produtos').then(setProducts).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
 async function buy(p:DigitalProduct) {
  if(busy)return;setBusy(p.id);setError('');
  const id=crypto.randomUUID(),token=Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');
  try {
   // Salvar antes de sair para o checkout mantém o acesso neste navegador.
   localStorage.setItem('compras_digitais',JSON.stringify([{id,token,nome:p.nome},...recentPurchases()].slice(0,30)));
   await apiFetch('/digital/checkout',{method:'POST',body:JSON.stringify({id,token,produto_id:p.id})});
   window.location.assign('/digitais/pedido/'+id+'#'+token);
  }catch(e:any){setError(e.message);}finally{setBusy('');}
 }
 const shown=products.filter(p=>(p.nome+' '+p.descricao).toLocaleLowerCase().includes(query.toLocaleLowerCase()));
 return <Frame><p className="text-sm font-semibold text-blue-700">ARQUIVOS DIGITAIS</p><h1 className="text-3xl font-bold mt-2">Escolha, pague e baixe</h1><p className="text-slate-600 mt-3">Arquivos para seus projetos. O link de download é liberado após a confirmação do pagamento.</p><label className="flex items-center gap-3 bg-white border rounded-xl p-3 my-6"><Search size={20}/><input aria-label="Buscar arquivo digital" className="w-full outline-none" placeholder="Qual arquivo você procura?" value={query} onChange={e=>setQuery(e.target.value)}/></label>{error&&<p role="alert" className="p-4 bg-red-50 text-red-700 rounded-xl mb-4">{error}</p>}{loading?<p>Carregando arquivos…</p>:<><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">{shown.map(p=><article key={p.id} className="bg-white border rounded-2xl overflow-hidden flex flex-col">{p.imagem_url?<img src={p.imagem_url} alt={p.nome} className="aspect-square object-cover w-full" loading="lazy" referrerPolicy="no-referrer"/>:<div className="aspect-square grid place-items-center bg-blue-50 text-primary"><Download size={42}/></div>}<div className="p-3 sm:p-5 flex flex-col flex-1"><h2 className="font-bold break-words">{p.nome}</h2><p className="text-sm text-slate-600 whitespace-pre-wrap mt-2 break-words">{p.descricao}</p><strong className="text-xl mt-4 mb-3">{formatMoney(p.preco_centavos/100)}</strong><button disabled={!!busy} onClick={()=>buy(p)} className={button+' mt-auto text-sm px-2'}>{busy===p.id?'Preparando…':'Comprar arquivo'}</button></div></article>)}</div>{!shown.length&&<p className="py-10 text-center text-slate-500">Nenhum arquivo encontrado.</p>}</>}{recentPurchases().length>0&&<section className="mt-10 border-t pt-6"><h2 className="font-bold mb-3">Minhas compras neste navegador</h2><div className="flex flex-wrap gap-3">{recentPurchases().map(p=><Link key={p.id} className="rounded-xl border bg-white p-3 underline" to={'/digitais/pedido/'+p.id+'#'+p.token}>{p.nome}</Link>)}</div></section>}</Frame>;
}
export function PedidoDigital() {
 const {id}=useParams();
 const token=window.location.hash.slice(1)||recentPurchases().find(p=>p.id===id)?.token||'';
 const [order,setOrder]=useState<Purchase|null>(null),[error,setError]=useState(''),[checking,setChecking]=useState(false),[notice,setNotice]=useState('');
 async function check(){if(!token){setError('Abra o link original da sua compra neste navegador.');return;}setChecking(true);try{const o=await apiFetch<Purchase>('/digital/pedidos/'+id,{method:'POST',body:JSON.stringify({token})});setOrder(o);setError('');return o.status;}catch(e:any){setError(e.message);}finally{setChecking(false);}}
 useEffect(()=>{let cancelled=false;let timer:ReturnType<typeof setTimeout>;async function poll(){if(cancelled)return;const status=await check();if(!cancelled && status!=='pago' && status!=='erro')timer=setTimeout(poll,12000);}void poll();return()=>{cancelled=true;clearTimeout(timer);};},[id,token]);
 async function copy(){try{await navigator.clipboard.writeText(window.location.origin+'/digitais/pedido/'+id+'#'+token);setNotice('Link copiado. Guarde-o para acessar sua compra.');}catch{setNotice('Copie o endereço desta página para guardar o acesso.');}}
 return <Frame><div className="max-w-xl mx-auto bg-white rounded-2xl border p-5 sm:p-8"><Link className="text-sm underline" to="/digitais">Voltar ao catálogo digital</Link><h1 className="text-2xl font-bold mt-6">{order?.status==='pago'?'Seu arquivo está disponível':'Sua compra digital'}</h1>{error&&<p role="alert" className="text-red-700 my-4">{error}</p>}{order?<><h2 className="font-semibold mt-5">{order.nome}</h2><p className="text-2xl font-bold mt-2">{formatMoney(order.valor_centavos/100)}</p><p className="text-xs text-slate-500 break-all mt-3">Pedido {order.id}</p><div className="my-6 space-y-3">{order.status==='pago'&&order.download_url?<a className={button+' w-full'} href={order.download_url} target="_blank" rel="noreferrer"><Download size={20}/> Baixar arquivo</a>:order.checkout_url?<><p className="text-slate-600">Aguardando pagamento. Depois de pagar, volte a esta página. A confirmação é consultada automaticamente.</p><a className={button+' w-full'} href={order.checkout_url} target="_blank" rel="noreferrer">Pagar com LivePix</a></>:<p>{order.status==='erro'?'Não foi possível gerar o pagamento. Volte ao catálogo para tentar novamente.':'Preparando pagamento. Aguarde alguns instantes.'}</p>}</div><button className="border rounded-xl px-4 py-3 w-full" onClick={copy}>Copiar link desta compra</button><p className="text-xs text-slate-500 mt-3">Guarde este link: ele dá acesso ao seu arquivo após o pagamento. Não o compartilhe.</p>{notice&&<p role="status" className="text-sm mt-3">{notice}</p>}</>:!error&&<p className="my-6">Consultando compra…</p>}<button disabled={checking} className="underline text-sm mt-5 disabled:opacity-50" onClick={check}>{checking?'Consultando…':'Verificar pagamento agora'}</button></div></Frame>;
}
