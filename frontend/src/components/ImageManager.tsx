import { useState } from 'react';
import { ArrowLeft, ArrowRight, GripVertical } from 'lucide-react';
import { apiFetch } from '../lib/api';

async function prepare(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Use imagens JPEG, PNG ou WebP.');
  if (file.size > 20000000) throw new Error('Cada foto deve ter até 20 MB.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  const data = canvas.toDataURL('image/webp', .82);
  if (data.length > 1900000) throw new Error('Reduza a imagem antes de enviar.');
  return data;
}

export function ImageManager({ images, onChange, onBusyChange }: { images: string[]; onChange: (images: string[]) => void; onBusyChange?: (busy: boolean) => void }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [url, setUrl] = useState(''); const [dragIndex, setDragIndex] = useState<number | null>(null);
  function move(from: number, to: number) { if (to < 0 || to >= images.length) return; const next = [...images]; const [item] = next.splice(from, 1); next.splice(to, 0, item); onChange(next); }
  function drop(index: number) { if (dragIndex !== null && dragIndex !== index) move(dragIndex, index); setDragIndex(null); }
  return <div className="space-y-3">
    <label className="block text-sm font-bold">Adicionar fotos <input className="block mt-2 max-w-full" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={async e => {
      const files = Array.from(e.target.files || []); e.target.value = ''; if (!files.length) return;
      setBusy(true); onBusyChange?.(true); setError(''); const next = [...images];
      try { if (next.length + files.length > 12) throw new Error('Use até 12 fotos por galeria.'); for (const file of files) { const result = await apiFetch<{ url: string }>('/imagens', { method: 'POST', body: JSON.stringify({ data: await prepare(file) }) }); next.push(result.url); } }
      catch (err: any) { setError(err.message || 'Falha no envio.'); } finally { onChange(next); setBusy(false); onBusyChange?.(false); }
    }} /></label>
    <div className="flex flex-col sm:flex-row gap-2"><input className="input min-w-0" placeholder="Ou cole a URL da imagem" value={url} onChange={e => setUrl(e.target.value)} /><button type="button" className="btn btn-outline whitespace-nowrap" disabled={!url.trim() || images.length >= 12} onClick={() => { onChange([...images, url.trim()]); setUrl(''); }}>Adicionar URL</button></div>
    {busy && <p role="status" className="text-sm">Enviando fotos… Aguarde antes de salvar o produto.</p>}{error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
    <p className="text-xs text-gray-500">Arraste uma foto para trocar a ordem. No celular, use as setas.</p>
    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">{images.map((image, index) => <div key={`${image}-${index}`} draggable={!busy} data-image-index={index} onDragStart={() => setDragIndex(index)} onDragOver={e => e.preventDefault()} onDrop={() => drop(index)} onDragEnd={() => setDragIndex(null)} className={`border rounded-xl p-2 w-full sm:w-32 min-w-0 ${dragIndex === index ? 'opacity-50 ring-2 ring-gold' : ''}`}><div className="flex items-center justify-between text-gray-400 mb-1"><GripVertical size={16} /><span className="text-[10px]">{index + 1}</span></div><img src={image} alt={`Foto ${index + 1}`} className="w-full h-24 object-contain" /><p className="text-xs my-1 truncate">{index === 0 ? 'Capa' : `Foto ${index + 1}`}</p><div className="flex justify-between gap-1"><button type="button" title="Mover para esquerda" disabled={busy || index === 0} className="p-1 text-primary disabled:opacity-30" onClick={() => move(index, index - 1)}><ArrowLeft size={14} /></button><button type="button" disabled={busy || index === 0} className="text-[10px] underline truncate" onClick={() => move(index, 0)}>Usar capa</button><button type="button" title="Mover para direita" disabled={busy || index === images.length - 1} className="p-1 text-primary disabled:opacity-30" onClick={() => move(index, index + 1)}><ArrowRight size={14} /></button></div><button type="button" disabled={busy} className="text-xs text-red-600 mt-1" onClick={() => onChange(images.filter((_, i) => i !== index))}>Remover</button></div>)}</div>
  </div>;
}
