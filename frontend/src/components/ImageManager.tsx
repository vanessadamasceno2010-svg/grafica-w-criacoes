import { useState } from 'react';
import { apiFetch } from '../lib/api';
async function prepare(file: File): Promise<string> {
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Use imagens JPEG, PNG ou WebP.');
 if(file.size>20000000) throw new Error('Cada foto deve ter até 20 MB.');
 const bitmap=await createImageBitmap(file);
 const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
 const canvas=document.createElement('canvas'); canvas.width=Math.round(bitmap.width*scale); canvas.height=Math.round(bitmap.height*scale);
 canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height); bitmap.close();
 const data=canvas.toDataURL('image/webp',.82);
 if(data.length>1900000) throw new Error('Reduza a imagem antes de enviar.');
 return data;
}
export function ImageManager({images,onChange,onBusyChange}:{images:string[];onChange:(images:string[])=>void;onBusyChange?:(busy:boolean)=>void}) {
 const [busy,setBusy]=useState(false); const [error,setError]=useState('');
 return <div className="space-y-3">
 <label className="block text-sm font-bold">Adicionar fotos <input className="block mt-2" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={async e=>{
 const files=Array.from(e.target.files||[]); e.target.value=''; if(!files.length)return;
 setBusy(true);onBusyChange?.(true);setError(''); const next=[...images];
 try {if(next.length+files.length>12)throw new Error('Use até 12 fotos por galeria.'); for(const file of files){const result=await apiFetch<{url:string}>('/imagens',{method:'POST',body:JSON.stringify({data:await prepare(file)})});next.push(result.url);} }
 catch(err:any){setError(err.message||'Falha no envio.');}finally{onChange(next);setBusy(false);onBusyChange?.(false);}
 }}/></label>
 {busy&&<p role="status">Enviando fotos… Aguarde antes de salvar o produto.</p>}{error&&<p role="alert" className="text-red-600">{error}</p>}
 <div className="flex flex-wrap gap-3">{images.map((url,index)=><div key={`${url}-${index}`} className="border rounded-xl p-2 w-32"><img src={url} alt={`Foto ${index+1}`} className="w-full h-24 object-contain"/><p className="text-xs my-1">{index===0?'Capa':'Foto '+(index+1)}</p><button type="button" disabled={busy||index===0} className="text-xs mr-2 underline" onClick={()=>onChange([url,...images.filter((_,i)=>i!==index)])}>Usar capa</button><button type="button" disabled={busy} className="text-xs text-red-600" onClick={()=>onChange(images.filter((_,i)=>i!==index))}>Remover</button></div>)}</div>
 </div>;
}
