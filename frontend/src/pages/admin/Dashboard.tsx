import { useEffect, useState } from 'react';
import { DollarSign, ShoppingCart, Users, Package, TrendingUp } from 'lucide-react';
import { apiFetch, formatMoney } from '../../lib/api';

export function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<any>('/admin/dashboard'),
      apiFetch<any[]>('/pedidos')
    ])
      .then(([dashboard, pedidos]) => {
        setData(dashboard);
        setOrders(pedidos.slice(0, 5));
      })
      .catch((err) => alert(err.message))
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: 'Vendas do Mês', value: formatMoney(data?.vendasMes || 0), icon: DollarSign, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Pedidos do Mês', value: String(data?.pedidosMes || 0), icon: ShoppingCart, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Ticket Médio', value: formatMoney(data?.ticketMedio || 0), icon: TrendingUp, color: 'text-gold', bg: 'bg-gold/10' },
    { label: 'Clientes Novos', value: String(data?.clientesNovos || 0), icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  ];

  return (
    <div className="fade-in">
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary mb-6">Dashboard</h1>
      {loading && <div className="card p-4 mb-5">Carregando dados do Supabase...</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-5">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4`}><Icon size={20} className={color} /></div>
            <p className="text-sm text-gray-500 mb-1">{label}</p>
            <p className="font-display text-xl sm:text-2xl font-bold text-primary">{value}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-primary">Pedidos Recentes</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {orders.length === 0 && <div className="p-6 text-gray-500">Nenhum pedido encontrado.</div>}
          {orders.map((order) => (
            <div key={order.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center flex-shrink-0"><Package size={18} className="text-primary" /></div>
                <div className="min-w-0">
                  <p className="font-semibold text-primary text-sm sm:text-base truncate">{order.numero_pedido}</p>
                  <p className="text-sm text-gray-500 truncate">{order.cliente_nome || order.cliente_email || 'Cliente'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-primary">{formatMoney(order.total)}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-gold/10 text-gold text-xs font-semibold">{order.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
