import { useState } from 'react';
import { Search, Eye, Printer, Plus } from 'lucide-react';
import { formatMoney } from '../../lib/api';
import { BottomSheet } from '../../components/BottomSheet';

const statusLabels: Record<string, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  em_producao: 'Em Produção',
  pronto: 'Pronto',
  enviado: 'Enviado',
  entregue: 'Entregue',
};

const statusColors: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-700',
  confirmado: 'bg-blue-100 text-blue-700',
  em_producao: 'bg-purple-100 text-purple-700',
  pronto: 'bg-success/10 text-success',
  enviado: 'bg-indigo-100 text-indigo-700',
  entregue: 'bg-gray-100 text-gray-600',
};

const initialOrders = [
  { id: 'WC1718000001', client: 'João Silva', phone: '(88) 99624-0470', date: '12/06/2026', status: 'em_producao', total: 245.00, description: 'Chaveiros personalizados' },
  { id: 'WC1718000002', client: 'Maria Oliveira', phone: '(88) 99624-0470', date: '12/06/2026', status: 'pendente', total: 89.90, description: 'Cartões de visita' },
  { id: 'WC1718000003', client: 'Pedro Santos', phone: '(88) 99624-0470', date: '11/06/2026', status: 'pronto', total: 520.00, description: 'Banner e adesivos' },
];

export function Pedidos() {
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [newOrder, setNewOrder] = useState<any>(null);

  const filtered = orders.filter((o) =>
    o.id.toLowerCase().includes(search.toLowerCase()) ||
    o.client.toLowerCase().includes(search.toLowerCase())
  );

  const saveStatus = () => {
    setOrders((prev) => prev.map((o) => o.id === selectedOrder.id ? selectedOrder : o));
    setSelectedOrder(null);
    alert('Pedido atualizado.');
  };

  const createOrder = () => {
    if (!newOrder?.client) return alert('Informe o nome do cliente.');
    setOrders((prev) => [{
      ...newOrder,
      id: `WC${Date.now()}`,
      date: new Date().toLocaleDateString('pt-BR'),
      status: newOrder.status || 'pendente',
      total: Number(String(newOrder.total || '0').replace(',', '.')) || 0,
    }, ...prev]);
    setNewOrder(null);
    alert('Pedido manual criado.');
  };

  const printReceipt = (order: any) => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<div style="font-family:Arial;padding:24px;line-height:1.6"><h1>Recibo de Pedido</h1><h2>Gráfica W Criações</h2><p><b>Pedido:</b> ${order.id}</p><p><b>Cliente:</b> ${order.client}</p><p><b>Telefone:</b> ${order.phone || '-'}</p><p><b>Descrição:</b> ${order.description || '-'}</p><p><b>Status:</b> ${statusLabels[order.status]}</p><h2>Total: ${formatMoney(order.total)}</h2><script>window.print()</script></div>`);
    win.document.close();
  };

  return (
    <div className="fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary">Gerenciador de Pedidos</h1>
        <button className="btn btn-primary" onClick={() => setNewOrder({ client: '', phone: '', description: '', total: '', status: 'pendente' })}>
          <Plus size={18} />
          Pedido Manual
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input type="text" placeholder="Buscar por número ou cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-11" />
      </div>

      <div className="card overflow-hidden">
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr><th className="text-left px-6 py-4 font-semibold text-gray-600">Número</th><th className="text-left px-6 py-4 font-semibold text-gray-600">Cliente</th><th className="text-left px-6 py-4 font-semibold text-gray-600">Data</th><th className="text-left px-6 py-4 font-semibold text-gray-600">Status</th><th className="text-left px-6 py-4 font-semibold text-gray-600">Total</th><th className="text-right px-6 py-4 font-semibold text-gray-600">Ações</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-mono font-semibold text-primary">{order.id}</td>
                  <td className="px-6 py-4">{order.client}</td>
                  <td className="px-6 py-4 text-gray-500">{order.date}</td>
                  <td className="px-6 py-4"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${statusColors[order.status]}`}>{statusLabels[order.status]}</span></td>
                  <td className="px-6 py-4 font-bold">{formatMoney(order.total)}</td>
                  <td className="px-6 py-4"><div className="flex items-center justify-end gap-2"><button onClick={() => setSelectedOrder({...order})} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><Eye size={16}/></button><button onClick={() => printReceipt(order)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><Printer size={16}/></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="sm:hidden divide-y divide-gray-100">
          {filtered.map((order) => (
            <div key={order.id} className="p-4">
              <div className="flex items-start justify-between mb-3 gap-3">
                <div className="min-w-0"><p className="font-mono font-bold text-primary truncate">{order.id}</p><p className="text-sm text-gray-600 truncate">{order.client}</p></div>
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${statusColors[order.status]}`}>{statusLabels[order.status]}</span>
              </div>
              <div className="flex items-center justify-between"><span className="text-sm text-gray-500">{order.date}</span><span className="font-bold text-primary">{formatMoney(order.total)}</span></div>
              <div className="grid grid-cols-2 gap-2 mt-4"><button className="btn btn-outline" onClick={() => setSelectedOrder({...order})}><Eye size={16}/>Ver</button><button className="btn btn-outline" onClick={() => printReceipt(order)}><Printer size={16}/>Recibo</button></div>
            </div>
          ))}
        </div>
      </div>

      <BottomSheet isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} title={`Pedido ${selectedOrder?.id || ''}`}>
        {selectedOrder && <div className="space-y-4"><div className="p-4 bg-gray-50 rounded-xl"><p className="text-sm text-gray-500">Cliente</p><p className="font-semibold">{selectedOrder.client}</p><p className="text-sm text-gray-500 mt-2">Total</p><p className="font-bold text-primary text-lg">{formatMoney(selectedOrder.total)}</p></div><div><p className="text-sm text-gray-500 mb-2">Alterar Status</p><select className="input" value={selectedOrder.status} onChange={(e) => setSelectedOrder({...selectedOrder, status: e.target.value})}>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div><textarea className="input min-h-24" value={selectedOrder.description || ''} onChange={(e) => setSelectedOrder({...selectedOrder, description: e.target.value})}/><div className="flex gap-3 pt-4"><button className="btn btn-outline flex-1" onClick={() => printReceipt(selectedOrder)}>Imprimir Recibo</button><button className="btn btn-primary flex-1" onClick={saveStatus}>Salvar</button></div></div>}
      </BottomSheet>

      <BottomSheet isOpen={!!newOrder} onClose={() => setNewOrder(null)} title="Novo Pedido Manual">
        {newOrder && <div className="space-y-4"><input className="input" placeholder="Nome do cliente" value={newOrder.client} onChange={(e) => setNewOrder({...newOrder, client: e.target.value})}/><input className="input" placeholder="Telefone" value={newOrder.phone} onChange={(e) => setNewOrder({...newOrder, phone: e.target.value})}/><textarea className="input min-h-24" placeholder="Descrição do pedido" value={newOrder.description} onChange={(e) => setNewOrder({...newOrder, description: e.target.value})}/><input className="input" placeholder="Total R$" value={newOrder.total} onChange={(e) => setNewOrder({...newOrder, total: e.target.value})}/><select className="input" value={newOrder.status} onChange={(e) => setNewOrder({...newOrder, status: e.target.value})}>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><button className="btn btn-primary w-full" onClick={createOrder}>Salvar Pedido</button></div>}
      </BottomSheet>
    </div>
  );
}
