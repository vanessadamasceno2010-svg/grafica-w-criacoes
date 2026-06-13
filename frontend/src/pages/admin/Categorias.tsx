import { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { mockCategories } from '../../lib/api';
import { BottomSheet } from '../../components/BottomSheet';

export function Categorias() {
  const [items, setItems] = useState(mockCategories.map((c, i) => ({...c, produtos: i + 3, status: 'Ativo'})));
  const [edit, setEdit] = useState<any>(null);

  const save = () => {
    if (!edit.nome) return alert('Informe o nome.');
    if (items.some((i) => i.id === edit.id)) setItems(items.map((i) => i.id === edit.id ? edit : i));
    else setItems([{...edit, id: String(Date.now()), produtos: 0, status: 'Ativo'}, ...items]);
    setEdit(null);
    alert('Categoria salva.');
  };

  const remove = (item: any) => {
    if (confirm(`Deletar categoria ${item.nome}?`)) setItems(items.filter((i) => i.id !== item.id));
  };

  return <div className="fade-in"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"><h1 className="font-display text-2xl sm:text-3xl font-bold text-primary">Gerenciador de Categorias</h1><button className="btn btn-primary" onClick={()=>setEdit({nome:'',slug:''})}><Plus size={18}/>Nova Categoria</button></div><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{items.map((c)=><div className="card p-4" key={c.id}><div className="flex justify-between gap-3"><div><h3 className="font-bold text-primary">{c.nome}</h3><p className="text-sm text-gray-500">/{c.slug}</p></div><span className="badge bg-success/10 text-success">{c.status}</span></div><p className="text-sm text-gray-600 mt-4">{c.produtos} produtos cadastrados</p><div className="grid grid-cols-2 gap-2 mt-4"><button className="btn btn-outline" onClick={()=>setEdit({...c})}><Edit2 size={16}/>Editar</button><button className="btn btn-danger" onClick={()=>remove(c)}><Trash2 size={16}/>Deletar</button></div></div>)}</div><BottomSheet isOpen={!!edit} onClose={()=>setEdit(null)} title="Categoria">{edit && <div className="space-y-4"><input className="input" placeholder="Nome" value={edit.nome} onChange={(e)=>setEdit({...edit,nome:e.target.value})}/><input className="input" placeholder="Slug" value={edit.slug} onChange={(e)=>setEdit({...edit,slug:e.target.value})}/><button className="btn btn-primary w-full" onClick={save}>Salvar categoria</button></div>}</BottomSheet></div>;
}
