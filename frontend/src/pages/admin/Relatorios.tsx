import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, ClipboardList, DollarSign, Filter, Package, PieChart, TrendingUp, WalletCards } from 'lucide-react';
import { apiFetch, formatMoney, getStoredUser } from '../../lib/api';

const statusOptions = [
  { value: 'todos', label: 'Todos os status' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'em_producao', label: 'Em produção' },
  { value: 'pronto', label: 'Pronto' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'cancelado', label: 'Cancelado' }
];

const statusLabel: Record<string, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  em_producao: 'Em produção',
  pronto: 'Pronto',
  entregue: 'Entregue',
  cancelado: 'Cancelado'
};

function maxValue(rows: any[], key: string) {
  return Math.max(1, ...rows.map((row) => Number(row[key] || 0)));
}

function shortDate(value: string) {
  if (!value) return '';
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}/${month}`;
}

export function Relatorios() {
  const user = getStoredUser();
  const isFuncionario = String(user?.role || '').toLowerCase() === 'funcionario';

  const [filters, setFilters] = useState({ status: 'todos', date_from: '', date_to: '' });
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filters.status !== 'todos') qs.set('status', filters.status);
      if (filters.date_from) qs.set('date_from', filters.date_from);
      if (filters.date_to) qs.set('date_to', filters.date_to);

      const result = await apiFetch<any>('/admin/dashboard?' + qs.toString());
      setData(result || {});
    } catch (error: any) {
      alert(error.message || 'Erro ao carregar relatórios.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const vendasPorDia = data?.vendasPorDia || [];
  const statusResumo = data?.statusResumo || [];
  const pedidosRecentes = data?.pedidosRecentes || [];
  const maxVendas = maxValue(vendasPorDia, isFuncionario ? 'pedidos' : 'vendas');
  const maxStatus = maxValue(statusResumo, 'total');

  const resumo = useMemo(() => {
    const base = [
      { label: 'Pedidos no filtro', value: String(data?.pedidosMes || 0), icon: ClipboardList, cls: 'bg-primary/10 text-primary' },
      { label: 'Pedidos pendentes', value: String(data?.pedidosPendentes || 0), icon: AlertTriangle, cls: 'bg-amber-50 text-amber-700' },
      { label: 'Pedidos atrasados', value: String(data?.pedidosAtrasados || 0), icon: AlertTriangle, cls: 'bg-red-50 text-red-700' }
    ];

    if (isFuncionario) return base;

    return [
      { label: 'Vendas filtradas', value: formatMoney(data?.vendasMes || 0), icon: DollarSign, cls: 'bg-emerald-50 text-emerald-700' },
      { label: 'A receber', value: formatMoney(data?.valoresAReceber || 0), icon: WalletCards, cls: 'bg-red-50 text-red-700' },
      { label: 'Ticket médio', value: formatMoney(data?.ticketMedio || 0), icon: TrendingUp, cls: 'bg-gold/10 text-gold' },
      ...base
    ];
  }, [data, isFuncionario]);

  return (
    <div className="fade-in w-full">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary flex items-center gap-2">
            <BarChart3 size={28} /> Relatórios
          </h1>
          <p className="text-gray-500 mt-1">
            {isFuncionario
              ? 'Relatórios operacionais de pedidos, sem exibir valores financeiros.'
              : 'Relatórios dinâmicos de pedidos, vendas e pagamentos.'}
          </p>
        </div>

        <div className="card p-3 grid sm:grid-cols-4 gap-3 w-full lg:w-auto">
          <input className="input" type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} />
          <input className="input" type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} />
          <select className="input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            {statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <button className="btn btn-primary" onClick={load}><Filter size={18} /> Filtrar</button>
        </div>
      </div>

      {loading && <div className="card p-4 mb-5">Gerando relatórios...</div>}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {resumo.map(({ label, value, icon: Icon, cls }) => (
          <div key={label} className="card p-5">
            <div className={`w-11 h-11 rounded-2xl ${cls} flex items-center justify-center mb-4`}><Icon size={21} /></div>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="font-display text-2xl font-bold text-primary mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-2 gap-5 mb-6">
        <div className="card p-5">
          <h2 className="font-display text-lg font-bold text-primary mb-1">
            {isFuncionario ? 'Pedidos dos últimos 7 dias' : 'Vendas dos últimos 7 dias'}
          </h2>
          <p className="text-sm text-gray-500 mb-5">Gráfico gerado com dados reais do Supabase.</p>
          <div className="h-72 flex items-end gap-3 border-b border-gray-100 pb-2 overflow-x-auto">
            {vendasPorDia.map((row: any) => {
              const value = isFuncionario ? Number(row.pedidos || 0) : Number(row.vendas || 0);
              const height = Math.max(10, (value / maxVendas) * 220);
              return (
                <div key={row.data} className="flex-1 min-w-[48px] flex flex-col items-center justify-end gap-2">
                  <div className="text-[11px] font-bold text-primary truncate">
                    {isFuncionario ? value : formatMoney(value)}
                  </div>
                  <div className="w-full max-w-12 rounded-t-2xl bg-gold shadow-sm" style={{ height }} />
                  <div className="text-xs text-gray-500">{shortDate(row.data)}</div>
                </div>
              );
            })}
            {vendasPorDia.length === 0 && <div className="w-full h-full grid place-items-center text-gray-500">Sem dados para o período.</div>}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-display text-lg font-bold text-primary mb-1 flex items-center gap-2"><PieChart size={20} /> Pedidos por status</h2>
          <p className="text-sm text-gray-500 mb-5">Resumo visual dos pedidos no filtro aplicado.</p>
          <div className="space-y-4">
            {statusResumo.map((row: any) => {
              const percent = Math.max(2, (Number(row.total || 0) / maxStatus) * 100);
              return (
                <div key={row.status}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-bold text-primary">{statusLabel[row.status] || row.status}</span>
                    <span className="text-gray-500">{row.total}</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
            {statusResumo.length === 0 && <div className="text-gray-500">Sem dados para montar o gráfico.</div>}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-2">
          <Package size={20} className="text-primary" />
          <h2 className="font-display text-lg font-bold text-primary">Pedidos do relatório</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {pedidosRecentes.length === 0 && <div className="p-5 text-gray-500">Nenhum pedido encontrado.</div>}
          {pedidosRecentes.map((pedido: any) => (
            <div key={pedido.id} className="p-4 sm:p-5 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-bold text-primary truncate">{pedido.numero_pedido}</p>
                <p className="text-sm text-gray-500 truncate">{pedido.cliente_nome || pedido.cliente_email || 'Cliente'}</p>
                <span className="inline-flex mt-2 px-2 py-1 rounded-full bg-gold/10 text-gold text-xs font-bold">
                  {statusLabel[pedido.status] || pedido.status}
                </span>
              </div>
              {!isFuncionario && (
                <div className="text-right shrink-0">
                  <p className="font-bold text-primary">{formatMoney(pedido.total || 0)}</p>
                  <p className="text-xs text-red-600 font-bold">Resta {formatMoney(pedido.valor_restante || 0)}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
