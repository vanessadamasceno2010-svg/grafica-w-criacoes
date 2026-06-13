import { useEffect, useState } from 'react';
import { DollarSign, ShoppingCart, Users, Package, TrendingUp, AlertTriangle } from 'lucide-react';
import { apiFetch, formatMoney } from '../../lib/api';

export function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ from: '', to: '', status: 'todos' });

  async function load() {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      if (filters.status !== 'todos') params.set('status', filters.status);

      const dashboard = await apiFetch<any>('/admin/dashboard' + (params.toString() ? '?' + params.toString() : ''));
      setData(dashboard);
    } catch (err: any) {
      alert(err.message || 'Erro ao carregar dashboard.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const stats = [
    { label: 'Vendas do Mês', value: formatMoney(data?.vendasMes || 0), icon: DollarSign, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Pedidos do Mês', value: String(data?.pedidosMes || 0), icon: ShoppingCart, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Ticket Médio', value: formatMoney(data?.ticketMedio || 0), icon: TrendingUp, color: 'text-gold', bg: 'bg-gold/10' },
    { label: 'Clientes Novos', value: String(data?.clientesNovos || 0), icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  ];

  const recent = data?.pedidosRecentes || [];

  return (
    <div className="fade-in">
      <div className="flex flex-col gap-4 mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary">Dashboard</h1>

        <div className="card p-4 grid md:grid-cols-4 gap-3">
          <input type="date" className="input" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          <input type="date" className="input" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
          <select className="input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="todos">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="confirmado">Confirmado</option>
            <option value="em_producao">Em produção</option>
            <option value="pronto">Pronto</option>
            <option value="entregue">Entregue</option>
            <option value="cancelado">Cancelado</option>
            <option value="parcial">Pagamento parcial</option>
            <option value="confirmado">Pagamento confirmado</option>
          </select>
          <button className="btn btn-primary" onClick={load}>Filtrar</button>
        </div>
      </div>

      {loading && <div className="card p-4 mb-5">Carregando dados do Supabase...</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-5">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4`}><Icon size={20} className={color} /></div>
            <p className="text-sm text-gray-500 mb-1">{label}</p>
            <p className="font-display text-xl sm:text-2xl font-bold text-primary">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="card p-5 border-l-4 border-red-500"><p className="text-sm text-gray-500">Atrasados</p><p className="text-2xl font-bold text-red-600">{data?.filtro?.atrasados || 0}</p></div>
        <div className="card p-5 border-l-4 border-yellow-500"><p className="text-sm text-gray-500">Atenção</p><p className="text-2xl font-bold text-yellow-600">{data?.filtro?.atencao || 0}</p></div>
        <div className="card p-5 border-l-4 border-green-500"><p className="text-sm text-gray-500">No prazo</p><p className="text-2xl font-bold text-green-600">{data?.filtro?.noPrazo || 0}</p></div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-primary">Pedidos Recentes</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {recent.length === 0 && <div className="p-6 text-gray-500">Nenhum pedido encontrado.</div>}
          {recent.map((order: any) => (
            <div key={order.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4 min-w-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${order.prazo_status === 'atrasado' ? 'bg-red-100' : order.prazo_status === 'atenção' ? 'bg-yellow-100' : 'bg-green-100'}`}>
                  {order.prazo_status === 'atrasado' ? <AlertTriangle size={18} className="text-red-600" /> : <Package size={18} className="text-primary" />}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-primary text-sm sm:text-base truncate">{order.numero_pedido}</p>
                  <p className="text-sm text-gray-500 truncate">{order.cliente_nome || order.cliente_email || 'Cliente'}</p>
                  <p className="text-xs text-gray-400">Prazo: {order.prazo_entrega || order.data_entrega_estimada || 'não definido'}</p>
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
