import { useEffect, useMemo, useState } from 'react';
import { DollarSign, ShoppingCart, Users, Package, TrendingUp, WalletCards, AlertTriangle } from 'lucide-react';
import { apiFetch, formatMoney } from '../../lib/api';

const statusOptions = [
  { value: 'todos', label: 'Todos os status' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'em_producao', label: 'Em produção' },
  { value: 'pronto', label: 'Pronto' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'cancelado', label: 'Cancelado' }
];

export function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: 'todos', date_from: '', date_to: '' });

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams();
    if (filters.status !== 'todos') qs.set('status', filters.status);
    if (filters.date_from) qs.set('date_from', filters.date_from);
    if (filters.date_to) qs.set('date_to', filters.date_to);

    try {
      const dashboard = await apiFetch<any>('/admin/dashboard?' + qs.toString());
      setData(dashboard);
      setOrders(dashboard.pedidosRecentes || []);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => [
    { label: 'Vendas filtradas', value: formatMoney(data?.vendasMes || 0), icon: DollarSign, color: 'text-success', bg: 'bg-success/10' },
    { label: 'A receber', value: formatMoney(data?.valoresAReceber || 0), icon: WalletCards, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Pedidos filtrados', value: String(data?.pedidosMes || 0), icon: ShoppingCart, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Ticket médio', value: formatMoney(data?.ticketMedio || 0), icon: TrendingUp, color: 'text-gold', bg: 'bg-gold/10' },
    { label: 'Clientes', value: String(data?.clientesNovos || 0), icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Estoque total', value: String(data?.produtosEmEstoque || 0), icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Pendentes', value: String(data?.pedidosPendentes || 0), icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Atrasados', value: String(data?.pedidosAtrasados || 0), icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' }
  ], [data]);

  return (
    <div className="fade-in w-full">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary">Dashboard</h1>
          <p className="text-gray-500 mt-1">Os filtros abaixo controlam os dados exibidos no dashboard.</p>
        </div>
        <div className="card p-3 grid sm:grid-cols-4 gap-3 w-full lg:w-auto">
          <input className="input" type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} />
          <input className="input" type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} />
          <select className="input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            {statusOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button className="btn btn-primary" onClick={load}>Filtrar</button>
        </div>
      </div>

      {loading && <div className="card p-4 mb-5">Carregando dados do Supabase...</div>}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
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
          <h2 className="font-display text-lg font-bold text-primary">Pedidos recentes do filtro</h2>
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
                <p className="text-xs text-red-600 font-bold">Resta {formatMoney(order.valor_restante || 0)}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-gold/10 text-gold text-xs font-semibold">{order.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
