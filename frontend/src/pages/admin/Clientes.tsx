import { useState } from 'react';
import { Search, Eye, Edit2 } from 'lucide-react';
import { formatMoney } from '../../lib/api';
import { BottomSheet } from '../../components/BottomSheet';

const baseClients = Array.from({ length: 8 }, (_, i) => ({
  id: String(i + 1),
  nome: `Cliente ${i + 1}`,
  email: `cliente${i + 1}@email.com`,
  telefone: '(88) 99624-0470',
  total: 240 + i * 95,
  pedidos: i + 1,
}));

export function Clientes() {
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState(baseClients);
  const [selected, setSelected] = useState<any>(null);
  const [edit, setEdit] = useState<any>(null);

  const filtered = clients.filter((c) => c.nome.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()));

  const save = () => {
    setClients((prev) => prev.map((c) => c.id === edit.id ? edit : c));
    setEdit(null);
    alert('Cliente salvo com sucesso.');
  };

  return (
    <div className="fade-in">
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary mb-6">Gerenciador de Clientes</h1>
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input className="input pl-11" placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="card overflow-hidden">
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200"><tr><th className="text-left px-6 py-4">Nome</th><th className="text-left px-6 py-4">Email</th><th className="text-left px-6 py-4">Telefone</th><th className="text-left px-6 py-4">Total gasto</th><th className="text-right px-6 py-4">Ações</th></tr></thead>
            <tbody className="divide-y divide-gray-100">{filtered.map((c) => <tr key={c.id}><td className="px-6 py-4 font-semibold text-primary">{c.nome}</td><td className="px-6 py-4">{c.email}</td><td className="px-6 py-4">{c.telefone}</td><td className="px-6 py-4 font-bold">{formatMoney(c.total)}</td><td className="px-6 py-4"><div className="flex justify-end gap-2"><button onClick={() => setSelected(c)} className="p-2 rounded-lg hover:bg-gray-100"><Eye size={16}/></button><button onClick={() => setEdit({...c})} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"><Edit2 size={16}/></button></div></td></tr>)}</tbody>
          </table>
        </div>
        <div className="sm:hidden divide-y divide-gray-100">{filtered.map((c) => <div key={c.id} className="p-4"><div className="flex justify-between gap-3"><div className="min-w-0"><h3 className="font-bold text-primary truncate">{c.nome}</h3><p className="text-sm text-gray-500 truncate">{c.email}</p><p className="text-sm text-gray-500">{c.telefone}</p></div><div className="flex gap-1"><button onClick={() => setSelected(c)} className="p-2.5 rounded-lg bg-gray-100"><Eye size={17}/></button><button onClick={() => setEdit({...c})} className="p-2.5 rounded-lg bg-blue-50 text-blue-600"><Edit2 size={17}/></button></div></div><p className="mt-3 font-bold text-primary">{formatMoney(c.total)} em compras</p></div>)}</div>
      </div>
      <BottomSheet isOpen={!!selected} onClose={() => setSelected(null)} title="Detalhes do Cliente">{selected && <div className="space-y-3"><p><b>Nome:</b> {selected.nome}</p><p><b>Email:</b> {selected.email}</p><p><b>Telefone:</b> {selected.telefone}</p><p><b>Pedidos:</b> {selected.pedidos}</p><p><b>Total gasto:</b> {formatMoney(selected.total)}</p><button className="btn btn-primary w-full" onClick={() => { setEdit({...selected}); setSelected(null); }}>Editar cliente</button></div>}</BottomSheet>
      <BottomSheet isOpen={!!edit} onClose={() => setEdit(null)} title="Editar Cliente">{edit && <div className="space-y-4"><input className="input" value={edit.nome} onChange={(e)=>setEdit({...edit,nome:e.target.value})}/><input className="input" value={edit.email} onChange={(e)=>setEdit({...edit,email:e.target.value})}/><input className="input" value={edit.telefone} onChange={(e)=>setEdit({...edit,telefone:e.target.value})}/><button className="btn btn-primary w-full" onClick={save}>Salvar cliente</button></div>}</BottomSheet>
    </div>
  );
}
