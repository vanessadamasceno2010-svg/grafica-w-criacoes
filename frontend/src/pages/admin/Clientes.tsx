import { useEffect, useMemo, useState } from 'react';
import { Search, Eye, Edit2, Trash2 } from 'lucide-react';
import { apiFetch, formatMoney } from '../../lib/api';
import { BottomSheet } from '../../components/BottomSheet';

export function Clientes() {
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [edit, setEdit] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setClients(await apiFetch<any[]>('/admin/clientes')); }
    catch (err: any) { alert(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => clients.filter((c) => String(c.nome || '').toLowerCase().includes(search.toLowerCase()) || String(c.email || '').toLowerCase().includes(search.toLowerCase())), [clients, search]);

  const save = async () => {
    try {
      await apiFetch(`/admin/clientes/${edit.id}`, { method: 'PUT', body: JSON.stringify({ nome: edit.nome, email: edit.email, telefone: edit.telefone }) });
      setEdit(null); await load(); alert('Cliente salvo no Supabase.');
    } catch (err: any) { alert(err.message); }
  };

  const remove = async (c: any) => {
    if (!confirm(`Deseja excluir ${c.nome}?`)) return;
    try { await apiFetch(`/admin/clientes/${c.id}`, { method: 'DELETE' }); await load(); }
    catch (err: any) { alert(err.message); }
  };

  return (
    <div className="fade-in">
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary mb-6">Gerenciador de Clientes</h1>
      <div className="relative mb-6"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={20}/><input className="input pl-11" placeholder="Buscar cliente..." value={search} onChange={(e)=>setSearch(e.target.value)}/></div>
      {loading && <div className="card p-4 mb-4">Carregando clientes...</div>}
      <div className="card overflow-hidden"><div className="hidden sm:block overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 border-b border-gray-200"><tr><th className="text-left px-6 py-4">Nome</th><th className="text-left px-6 py-4">Email</th><th className="text-left px-6 py-4">Telefone</th><th className="text-left px-6 py-4">Total gasto</th><th className="text-right px-6 py-4">Ações</th></tr></thead><tbody className="divide-y divide-gray-100">{filtered.map((c) => <tr key={c.id}><td className="px-6 py-4 font-semibold text-primary">{c.nome}</td><td className="px-6 py-4">{c.email}</td><td className="px-6 py-4">{c.telefone}</td><td className="px-6 py-4 font-bold">{formatMoney(c.total_gasto || 0)}</td><td className="px-6 py-4"><div className="flex justify-end gap-2"><button onClick={()=>setSelected(c)} className="p-2 rounded-lg hover:bg-gray-100"><Eye size={16}/></button><button onClick={()=>setEdit({...c})} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"><Edit2 size={16}/></button><button onClick={()=>remove(c)} className="p-2 rounded-lg hover:bg-red-50 text-red-600"><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div><div className="sm:hidden divide-y divide-gray-100">{filtered.map((c) => <div key={c.id} className="p-4"><div className="flex justify-between gap-3"><div className="min-w-0"><h3 className="font-bold text-primary truncate">{c.nome}</h3><p className="text-sm text-gray-500 truncate">{c.email}</p><p className="text-sm text-gray-500">{c.telefone}</p></div></div><p className="mt-3 font-bold text-primary">{formatMoney(c.total_gasto || 0)} em compras</p><div className="grid grid-cols-3 gap-2 mt-4"><button onClick={()=>setSelected(c)} className="btn btn-outline"><Eye size={16}/>Ver</button><button onClick={()=>setEdit({...c})} className="btn btn-outline"><Edit2 size={16}/>Editar</button><button onClick={()=>remove(c)} className="btn btn-danger"><Trash2 size={16}/>Excluir</button></div></div>)}</div></div>
      <BottomSheet isOpen={!!selected} onClose={()=>setSelected(null)} title="Detalhes do Cliente">{selected && <div className="space-y-3"><p><b>Nome:</b> {selected.nome}</p><p><b>Email:</b> {selected.email}</p><p><b>Telefone:</b> {selected.telefone}</p><p><b>Pedidos:</b> {selected.pedidos}</p><p><b>Total gasto:</b> {formatMoney(selected.total_gasto || 0)}</p><button className="btn btn-primary w-full" onClick={()=>{setEdit({...selected});setSelected(null)}}>Editar cliente</button></div>}</BottomSheet>
      <BottomSheet isOpen={!!edit} onClose={()=>setEdit(null)} title="Editar Cliente">{edit && <div className="space-y-4"><input className="input" value={edit.nome || ''} onChange={(e)=>setEdit({...edit,nome:e.target.value})}/><input className="input" value={edit.email || ''} onChange={(e)=>setEdit({...edit,email:e.target.value})}/><input className="input" value={edit.telefone || ''} onChange={(e)=>setEdit({...edit,telefone:e.target.value})}/><button className="btn btn-primary w-full" onClick={save}>Salvar cliente no Supabase</button></div>}</BottomSheet>
    </div>
  );
}
