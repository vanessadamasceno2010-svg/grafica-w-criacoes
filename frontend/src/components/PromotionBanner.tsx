import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
export type Banner = {id:string;imagem:string;titulo:string;link:string;ativo:boolean};
export function parseBanners(value?:string):Banner[]{try {const rows=JSON.parse(value||'[]');return Array.isArray(rows)?rows.filter(b=>b && typeof b.imagem==='string'):[];}catch{return [];}}
export function safeBannerLink(link:string){return /^(https?:\/\/|\/(?!\/))/.test(link)?link:'';}
export function PromotionBanner({banners}:{banners:Banner[]}){
 const active=banners.filter(b=>b.ativo!==false&&b.imagem);const [index,setIndex]=useState(0);const [paused,setPaused]=useState(false);
 useEffect(()=>{if(active.length<2||paused||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const t=window.setInterval(()=>setIndex(i=>(i+1)%active.length),5000);return()=>clearInterval(t);},[active.length,paused]);
 if(!active.length)return null;const current=active[index%active.length];const move=(n:number)=>setIndex(i=>(i+n+active.length)%active.length);
 const img=<img src={current.imagem} alt={current.titulo||'Promoções e novidades'} className="w-full h-full object-cover"/>;
 return <section aria-label="Promoções e novidades" className="relative overflow-hidden rounded-2xl bg-slate-100 mb-4 aspect-[2/1] sm:aspect-[4/1]" onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)}>
 {safeBannerLink(current.link)?<a href={safeBannerLink(current.link)} className="block h-full">{img}</a>:img}
 {active.length>1&&<><button aria-label="Banner anterior" onClick={()=>move(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full p-2 bg-black/50 text-white"><ChevronLeft size={18}/></button><button aria-label="Próximo banner" onClick={()=>move(1)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 bg-black/50 text-white"><ChevronRight size={18}/></button><div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">{active.map((b,i)=><button key={b.id} aria-label={`Banner ${i+1}`} aria-current={i===index%active.length} onClick={()=>setIndex(i)} className={`w-3 h-3 rounded-full border border-black/20 ${i===index%active.length?'bg-white':'bg-white/40'}`}/>)}</div><button className="absolute bottom-2 right-2 rounded-full p-2 bg-black/50 text-white" aria-label={paused?'Reproduzir banners':'Pausar banners'} onClick={()=>setPaused(!paused)}>{paused?<Play size={14}/>:<Pause size={14}/>}</button></>}
 </section>;
}
