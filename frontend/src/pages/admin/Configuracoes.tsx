import { useState, type FormEvent } from 'react';
import { BRAND } from '../../lib/api';

export function Configuracoes() {
  const tabs = ['Geral', 'Sobre', 'Frete', 'Redes Sociais', 'WhatsApp', 'Políticas'];
  const [active, setActive] = useState('Geral');
  const [saved, setSaved] = useState(false);

  const save = (e: FormEvent) => {
    e.preventDefault();
    localStorage.setItem('gp_config_saved', new Date().toISOString());
    setSaved(true);
    setTimeout(() => setSaved(false), 2400);
  };

  return (
    <div className="fade-in">
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary mb-6">Configurações do Site</h1>
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5 pb-1">
        {tabs.map((tab) => <button type="button" key={tab} onClick={() => setActive(tab)} className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-bold ${active === tab ? 'bg-primary text-white' : 'bg-white text-primary border border-gray-200'}`}>{tab}</button>)}
      </div>
      <form onSubmit={save} className="card p-4 sm:p-6 grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2"><span className="badge bg-gold/10 text-gold">{active}</span></div>
        <input className="input" defaultValue={BRAND.nome} placeholder="Nome da empresa" />
        <input className="input" defaultValue={BRAND.email} placeholder="Email" />
        <input className="input" defaultValue={BRAND.whatsapp} placeholder="Telefone" />
        <input className="input" defaultValue={BRAND.whatsappNumber} placeholder="WhatsApp com DDI" />
        <textarea className="input sm:col-span-2 min-h-32" defaultValue="Finalização de pedidos pelo WhatsApp, sem pagamento online. Recibo disponível após conclusão do pedido." />
        {saved && <div className="sm:col-span-2 rounded-xl bg-success/10 text-success font-bold p-3">Configuração salva com sucesso.</div>}
        <button className="btn btn-primary sm:col-span-2" type="submit">Salvar configurações</button>
      </form>
    </div>
  );
}
