import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { apiFetch, slugify } from '../../lib/api';
import { BottomSheet } from '../../components/BottomSheet';

export function Categorias() {
  const [items, setItems] = useState<any[]>([]);
  const [edit, setEdit] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setItems(await apiFetch<any[]>('/categorias')); }
    catch (err: any) { alert(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!edit.nome) return alert('Informe o nome.');
    const payload = { nome: edit.nome, slug: edit.slug || slugify(edit.nome), descricao: edit.descricao || '', imagem_url: edit.imagem_url || '', ordem: Number(edit.ordem || 0), ativo: edit.ativo !== false };
    try {
      if (edit.id) await apiFetch(`/categorias/${edit.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await apiFetch('/categorias', { method: 'POST', body: JSON.stringify(payload) });
      setEdit(null); await load(); alert('Categoria salva no Supabase.');
    } catch (err: any) { alert(err.message); }
  };

  const remove = async (item: any) => {
    if (!confirm(`Deletar categoria ${item.nome}?`)) return;
    try { await apiFetch(`/categorias/${item.id}`, { method: 'DELETE' }); await load(); }
    catch (err: any) { alert(err.message); }
  };

  return <div className="fade-in"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"><h1 className="font-display text-2xl sm:text-3xl font-bold text-primary">Gerenciador de Categorias</h1><button className="btn btn-primary" onClick={()=>setEdit({nome:'',slug:'',ativo:true})}><Plus size={18}/>Nova Categoria</button></div>{loading && <div className="card p-4 mb-4">Carregando categorias...</div>}<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{items.map((c)=><div className="card p-4" key={c.id}><div className="flex justify-between gap-3"><div><h3 className="font-bold text-primary">{c.nome}</h3><p className="text-sm text-gray-500">/{c.slug}</p></div><span className="badge bg-success/10 text-success">{c.ativo === false ? 'Inativa' : 'Ativa'}</span></div><p className="text-sm text-gray-600 mt-4">{c.descricao || 'Sem descrição'}</p><div className="grid grid-cols-2 gap-2 mt-4"><button className="btn btn-outline" onClick={()=>setEdit({...c})}><Edit2 size={16}/>Editar</button><button className="btn btn-danger" onClick={()=>remove(c)}><Trash2 size={16}/>Deletar</button></div></div>)}</div><BottomSheet isOpen={!!edit} onClose={()=>setEdit(null)} title="Categoria">{edit && <div className="space-y-4"><input className="input" placeholder="Nome" value={edit.nome || ''} onChange={(e)=>setEdit({...edit,nome:e.target.value})}/><input className="input" placeholder="Slug" value={edit.slug || ''} onChange={(e)=>setEdit({...edit,slug:e.target.value})}/><textarea className="input min-h-24" placeholder="Descrição" value={edit.descricao || ''} onChange={(e)=>setEdit({...edit,descricao:e.target.value})}/><input className="input" placeholder="URL da imagem" value={edit.imagem_url || ''} onChange={(e)=>setEdit({...edit,imagem_url:e.target.value})}/><button className="btn btn-primary w-full" onClick={save}>Salvar categoria no Supabase</button></div>}</BottomSheet></div>;
}
