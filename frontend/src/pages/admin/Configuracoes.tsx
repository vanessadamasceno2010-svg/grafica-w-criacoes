import { useEffect, useState, type FormEvent } from 'react';
import { apiFetch, BRAND } from '../../lib/api';

const keys = ['nome_empresa', 'email', 'telefone', 'whatsapp', 'sobre', 'politicas'];

export function Configuracoes() {
  const tabs = ['Geral', 'Sobre', 'Frete', 'Redes Sociais', 'WhatsApp', 'Políticas'];
  const [active, setActive] = useState('Geral');
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<any>({ nome_empresa: BRAND.nome, email: BRAND.email, telefone: BRAND.whatsapp, whatsapp: BRAND.whatsappNumber, sobre: 'Finalização de pedidos pelo WhatsApp, sem pagamento online.', politicas: '' });

  useEffect(() => {
    apiFetch<any[]>('/admin/configuracoes').then((rows) => {
      const next = { ...form };
      rows.forEach((r: any) => { next[r.chave] = r.valor; });
      setForm(next);
    }).catch(() => {});
  }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await Promise.all(keys.map((chave) => apiFetch(`/admin/configuracoes/${chave}`, { method: 'PUT', body: JSON.stringify({ valor: String(form[chave] || ''), tipo: 'texto' }) })));
      setSaved(true); setTimeout(() => setSaved(false), 2400);
    } catch (err: any) { alert(err.message); }
  };

  return (
    <div className="fade-in">
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary mb-6">Configurações do Site</h1>
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5 pb-1">{tabs.map((tab) => <button type="button" key={tab} onClick={() => setActive(tab)} className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-bold ${active === tab ? 'bg-primary text-white' : 'bg-white text-primary border border-gray-200'}`}>{tab}</button>)}</div>
      <form onSubmit={save} className="card p-4 sm:p-6 grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2"><span className="badge bg-gold/10 text-gold">{active}</span></div>
        <input className="input" value={form.nome_empresa} onChange={(e)=>setForm({...form,nome_empresa:e.target.value})} placeholder="Nome da empresa" />
        <input className="input" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} placeholder="Email" />
        <input className="input" value={form.telefone} onChange={(e)=>setForm({...form,telefone:e.target.value})} placeholder="Telefone" />
        <input className="input" value={form.whatsapp} onChange={(e)=>setForm({...form,whatsapp:e.target.value})} placeholder="WhatsApp com DDI" />
        <textarea className="input sm:col-span-2 min-h-32" value={form.sobre} onChange={(e)=>setForm({...form,sobre:e.target.value})} />
        <textarea className="input sm:col-span-2 min-h-24" value={form.politicas} onChange={(e)=>setForm({...form,politicas:e.target.value})} placeholder="Políticas e observações" />
        {saved && <div className="sm:col-span-2 rounded-xl bg-success/10 text-success font-bold p-3">Configuração salva no Supabase com sucesso.</div>}
        <button className="btn btn-primary sm:col-span-2" type="submit">Salvar configurações</button>
      </form>
    </div>
  );
}
