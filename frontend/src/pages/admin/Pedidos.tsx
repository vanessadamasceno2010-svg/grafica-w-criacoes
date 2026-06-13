import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Eye, Printer } from 'lucide-react';
import { apiFetch, formatMoney } from '../../lib/api';
import { BottomSheet } from '../../components/BottomSheet';

const statusLabels: Record<string, string> = { pendente: 'Pendente', confirmado: 'Confirmado', em_producao: 'Em produção', pronto: 'Pronto', enviado: 'Enviado', entregue: 'Entregue', cancelado: 'Cancelado' };

export function Pedidos() {
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [newOrder, setNewOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setOrders(await apiFetch<any[]>('/pedidos')); }
    catch (err: any) { alert(err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => orders.filter((o) => String(o.numero_pedido || '').toLowerCase().includes(search.toLowerCase()) || String(o.cliente_nome || o.cliente_email || '').toLowerCase().includes(search.toLowerCase())), [orders, search]);

  const openNew = () => setNewOrder({ client: '', email: '', phone: '', description: '', total: '', status: 'pendente', payment: 'pendente' });

  const createOrder = async () => {
    if (!newOrder.client || !newOrder.description) return alert('Informe cliente e descrição.');
    try {
      await apiFetch('/admin/pedidos/manual', { method: 'POST', body: JSON.stringify({ cliente_nome: newOrder.client, cliente_email: newOrder.email || '', cliente_telefone: newOrder.phone || '', descricao: newOrder.description, total: Number(String(newOrder.total).replace(',', '.')) || 0, status: newOrder.status, status_pagamento: newOrder.payment, endereco_entrega: 'A combinar' }) });
      setNewOrder(null); await load(); alert('Pedido salvo no Supabase.');
    } catch (err: any) { alert(err.message); }
  };

  const saveStatus = async () => {
    try {
      await apiFetch(`/pedidos/${selectedOrder.id}`, { method: 'PUT', body: JSON.stringify({ status: selectedOrder.status, status_pagamento: selectedOrder.status_pagamento, observacoes: selectedOrder.observacoes || '' }) });
      setSelectedOrder(null); await load(); alert('Pedido atualizado.');
    } catch (err: any) { alert(err.message); }
  };

  const printReceipt = async (order: any) => {
    try {
      const data = await apiFetch<any>(`/admin/pedidos/${order.id}/recibo`);
      const pedido = data.pedido;
      const html = `<div style="font-family:Arial;padding:24px;max-width:680px;margin:auto"><h1>Recibo - Gráfica W Criações</h1><p><b>Pedido:</b> ${pedido.numero_pedido}</p><p><b>Cliente:</b> ${pedido.cliente_nome || pedido.cliente_email || ''}</p><p><b>Status:</b> ${pedido.status}</p><p><b>Total:</b> ${formatMoney(pedido.total)}</p><hr/><p>Emitido em ${new Date().toLocaleString('pt-BR')}</p><script>window.print()</script></div>`;
      const win = window.open('', '_blank');
      if (win) { win.document.write(html); win.document.close(); }
    } catch (err: any) { alert(err.message); }
  };

  return <div className="fade-in"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"><h1 className="font-display text-2xl sm:text-3xl font-bold text-primary">Gerenciador de Pedidos</h1><button className="btn btn-primary" onClick={openNew}><Plus size={18}/>Pedido Manual</button></div><div className="relative mb-6"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={20}/><input className="input pl-11" placeholder="Buscar pedido ou cliente..." value={search} onChange={(e)=>setSearch(e.target.value)}/></div>{loading && <div className="card p-4 mb-4">Carregando pedidos...</div>}<div className="card overflow-hidden"><div className="hidden sm:block overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 border-b border-gray-200"><tr><th className="text-left px-6 py-4">Pedido</th><th className="text-left px-6 py-4">Cliente</th><th className="text-left px-6 py-4">Status</th><th className="text-left px-6 py-4">Total</th><th className="text-right px-6 py-4">Ações</th></tr></thead><tbody className="divide-y divide-gray-100">{filtered.map((o)=><tr key={o.id}><td className="px-6 py-4 font-bold text-primary">{o.numero_pedido}</td><td className="px-6 py-4">{o.cliente_nome || o.cliente_email || 'Cliente'}</td><td className="px-6 py-4">{statusLabels[o.status] || o.status}</td><td className="px-6 py-4 font-bold">{formatMoney(o.total)}</td><td className="px-6 py-4"><div className="flex justify-end gap-2"><button className="p-2 rounded-lg hover:bg-gray-100" onClick={()=>setSelectedOrder({...o})}><Eye size={16}/></button><button className="p-2 rounded-lg hover:bg-gray-100" onClick={()=>printReceipt(o)}><Printer size={16}/></button></div></td></tr>)}</tbody></table></div><div className="sm:hidden divide-y divide-gray-100">{filtered.map((o)=><div key={o.id} className="p-4"><h3 className="font-bold text-primary">{o.numero_pedido}</h3><p className="text-sm text-gray-500">{o.cliente_nome || o.cliente_email || 'Cliente'}</p><p className="mt-2"><b>{formatMoney(o.total)}</b> • {statusLabels[o.status] || o.status}</p><div className="grid grid-cols-2 gap-2 mt-4"><button className="btn btn-outline" onClick={()=>setSelectedOrder({...o})}><Eye size={16}/>Ver</button><button className="btn btn-outline" onClick={()=>printReceipt(o)}><Printer size={16}/>Recibo</button></div></div>)}</div></div><BottomSheet isOpen={!!selectedOrder} onClose={()=>setSelectedOrder(null)} title="Pedido">{selectedOrder && <div className="space-y-4"><p><b>Pedido:</b> {selectedOrder.numero_pedido}</p><p><b>Cliente:</b> {selectedOrder.cliente_nome || selectedOrder.cliente_email}</p><p><b>Total:</b> {formatMoney(selectedOrder.total)}</p><select className="input" value={selectedOrder.status} onChange={(e)=>setSelectedOrder({...selectedOrder,status:e.target.value})}>{Object.entries(statusLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><select className="input" value={selectedOrder.status_pagamento || 'pendente'} onChange={(e)=>setSelectedOrder({...selectedOrder,status_pagamento:e.target.value})}><option value="pendente">Pagamento pendente</option><option value="confirmado">Pagamento confirmado</option><option value="recusado">Pagamento recusado</option></select><textarea className="input min-h-24" placeholder="Observações" value={selectedOrder.observacoes || ''} onChange={(e)=>setSelectedOrder({...selectedOrder,observacoes:e.target.value})}/><div className="grid grid-cols-2 gap-2"><button className="btn btn-outline" onClick={()=>printReceipt(selectedOrder)}>Recibo</button><button className="btn btn-primary" onClick={saveStatus}>Salvar</button></div></div>}</BottomSheet><BottomSheet isOpen={!!newOrder} onClose={()=>setNewOrder(null)} title="Novo Pedido Manual">{newOrder && <div className="space-y-4"><input className="input" placeholder="Nome do cliente" value={newOrder.client} onChange={(e)=>setNewOrder({...newOrder,client:e.target.value})}/><input className="input" placeholder="Email" value={newOrder.email} onChange={(e)=>setNewOrder({...newOrder,email:e.target.value})}/><input className="input" placeholder="Telefone" value={newOrder.phone} onChange={(e)=>setNewOrder({...newOrder,phone:e.target.value})}/><textarea className="input min-h-24" placeholder="Descrição do pedido" value={newOrder.description} onChange={(e)=>setNewOrder({...newOrder,description:e.target.value})}/><input className="input" placeholder="Total R$" value={newOrder.total} onChange={(e)=>setNewOrder({...newOrder,total:e.target.value})}/><button className="btn btn-primary w-full" onClick={createOrder}>Salvar pedido no Supabase</button></div>}</BottomSheet></div>;
}
