import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Download,
  Filter,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  WalletCards
} from 'lucide-react';
import { apiFetch, formatMoney, getStoredUser } from '../../lib/api';

type CaixaForm = {
  data_movimento: string;
  descricao: string;
  valor: string;
  forma_pagamento: string;
  origem: string;
  observacoes: string;
};

const formasPagamento = [
  { value: 'pix', label: 'Pix' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'outro', label: 'Outro' }
];

const origens = [
  { value: 'manual', label: 'Entrada manual' },
  { value: 'pedido', label: 'Pedido' },
  { value: 'orcamento', label: 'Orçamento' },
  { value: 'outro', label: 'Outro' }
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function moneyToNumber(value: any) {
  if (typeof value === 'number') return value;

  const normalized = String(value || '0')
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  return Number(normalized) || 0;
}

function shortDate(value: string) {
  if (!value) return '';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

function buildForm(): CaixaForm {
  return {
    data_movimento: today(),
    descricao: '',
    valor: '',
    forma_pagamento: 'pix',
    origem: 'manual',
    observacoes: ''
  };
}

export function FluxoCaixa() {
  const user = getStoredUser();
  const isAdmin = String(user?.role || '').toLowerCase() === 'admin';

  const [filters, setFilters] = useState({
    date_from: today(),
    date_to: today(),
    forma_pagamento: 'todos',
    origem: 'todos',
    q: ''
  });
  const [data, setData] = useState<any>({ movimentos: [], resumoPorDia: [], totalEntradas: 0, quantidade: 0 });
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CaixaForm>(buildForm());
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);

    try {
      const qs = new URLSearchParams();
      if (filters.date_from) qs.set('date_from', filters.date_from);
      if (filters.date_to) qs.set('date_to', filters.date_to);
      if (filters.forma_pagamento !== 'todos') qs.set('forma_pagamento', filters.forma_pagamento);
      if (filters.origem !== 'todos') qs.set('origem', filters.origem);
      if (filters.q.trim()) qs.set('q', filters.q.trim());

      const result = await apiFetch<any>('/admin/fluxo-caixa?' + qs.toString());
      setData(result || { movimentos: [], resumoPorDia: [], totalEntradas: 0, quantidade: 0 });
    } catch (error: any) {
      alert(error.message || 'Erro ao carregar fluxo de caixa.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const movimentos = Array.isArray(data.movimentos) ? data.movimentos : [];
  const resumoPorDia = Array.isArray(data.resumoPorDia) ? data.resumoPorDia : [];
  const maiorDia = Math.max(1, ...resumoPorDia.map((item: any) => Number(item.total || 0)));

  const formasMap = useMemo(() => Object.fromEntries(formasPagamento.map((item) => [item.value, item.label])), []);
  const origensMap = useMemo(() => Object.fromEntries(origens.map((item) => [item.value, item.label])), []);

  async function saveMovement() {
    const valor = moneyToNumber(form.valor);

    if (!form.data_movimento) {
      alert('Informe a data da entrada.');
      return;
    }

    if (!form.descricao.trim()) {
      alert('Informe a descrição da entrada.');
      return;
    }

    if (valor <= 0) {
      alert('Informe um valor de entrada maior que zero.');
      return;
    }

    try {
      await apiFetch('/admin/fluxo-caixa', {
        method: 'POST',
        body: JSON.stringify({
          data_movimento: form.data_movimento,
          descricao: form.descricao,
          valor,
          forma_pagamento: form.forma_pagamento,
          origem: form.origem,
          observacoes: form.observacoes
        })
      });

      setForm(buildForm());
      setShowForm(false);
      await load();
      alert('Entrada registrada no caixa.');
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar entrada no caixa.');
    }
  }

  async function deleteMovement(movimento: any) {
    if (!isAdmin) {
      alert('Apenas administrador pode excluir movimentações do caixa.');
      return;
    }

    if (!confirm('Deseja excluir esta entrada do caixa?')) return;

    try {
      await apiFetch('/admin/fluxo-caixa/' + movimento.id, { method: 'DELETE' });
      await load();
      alert('Entrada excluída.');
    } catch (error: any) {
      alert(error.message || 'Erro ao excluir entrada.');
    }
  }

  function exportCsv() {
    const header = ['Data', 'Descrição', 'Valor', 'Forma de pagamento', 'Origem', 'Responsável', 'Observações'];
    const rows = movimentos.map((m: any) => [
      shortDate(m.data_movimento),
      m.descricao || '',
      String(Number(m.valor || 0)).replace('.', ','),
      formasMap[m.forma_pagamento] || m.forma_pagamento || '',
      origensMap[m.origem] || m.origem || '',
      m.usuario_nome || '',
      m.observacoes || ''
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fluxo-caixa-${filters.date_from || 'inicio'}-${filters.date_to || 'fim'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fade-in w-full">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary flex items-center gap-2">
            <WalletCards size={30} /> Fluxo de Caixa
          </h1>
          <p className="text-gray-500 mt-1">
            Registre somente entradas do caixa e acompanhe a movimentação por período.
          </p>
        </div>

        <button className="btn btn-primary w-full sm:w-auto" onClick={() => setShowForm(true)}>
          <Plus size={18} /> Nova entrada
        </button>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="card p-5">
          <p className="text-sm text-gray-500">Total de entradas</p>
          <p className="font-display text-3xl font-bold text-primary mt-1">{formatMoney(data.totalEntradas || 0)}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500">Movimentações</p>
          <p className="font-display text-3xl font-bold text-primary mt-1">{data.quantidade || 0}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500">Período inicial</p>
          <p className="font-display text-xl font-bold text-primary mt-1">{shortDate(filters.date_from)}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500">Período final</p>
          <p className="font-display text-xl font-bold text-primary mt-1">{shortDate(filters.date_to)}</p>
        </div>
      </div>

      <div className="card p-4 mb-6 grid md:grid-cols-2 xl:grid-cols-6 gap-3">
        <label className="block">
          <span className="text-xs font-bold text-primary mb-1 flex items-center gap-1"><CalendarDays size={14} /> Início</span>
          <input className="input" type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} />
        </label>

        <label className="block">
          <span className="text-xs font-bold text-primary mb-1 flex items-center gap-1"><CalendarDays size={14} /> Fim</span>
          <input className="input" type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} />
        </label>

        <label className="block">
          <span className="text-xs font-bold text-primary mb-1">Pagamento</span>
          <select className="input" value={filters.forma_pagamento} onChange={(e) => setFilters({ ...filters, forma_pagamento: e.target.value })}>
            <option value="todos">Todos</option>
            {formasPagamento.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-bold text-primary mb-1">Origem</span>
          <select className="input" value={filters.origem} onChange={(e) => setFilters({ ...filters, origem: e.target.value })}>
            <option value="todos">Todas</option>
            {origens.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-bold text-primary mb-1 flex items-center gap-1"><Search size={14} /> Buscar</span>
          <input className="input" value={filters.q} placeholder="Descrição..." onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
        </label>

        <div className="flex items-end gap-2">
          <button className="btn btn-primary flex-1" onClick={load}><Filter size={18} /> Filtrar</button>
          <button className="btn btn-outline px-4" onClick={exportCsv} title="Exportar CSV"><Download size={18} /></button>
        </div>
      </div>

      {loading && <div className="card p-4 mb-6">Carregando movimentações...</div>}

      <div className="grid xl:grid-cols-[1fr_1.4fr] gap-5">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-bold text-primary">Entradas por dia</h2>
              <p className="text-sm text-gray-500">Relatório visual conforme o filtro.</p>
            </div>
            <button className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100" onClick={load} title="Atualizar"><RefreshCcw size={18} /></button>
          </div>

          <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
            {resumoPorDia.length === 0 && <p className="text-gray-500">Nenhuma entrada encontrada no período.</p>}
            {resumoPorDia.map((item: any) => {
              const width = Math.max(3, (Number(item.total || 0) / maiorDia) * 100);
              return (
                <div key={item.data}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-bold text-primary">{shortDate(item.data)}</span>
                    <span className="text-gray-500">{formatMoney(item.total || 0)} • {item.quantidade} entrada(s)</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gold rounded-full" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-display text-lg font-bold text-primary">Movimentações de entrada</h2>
            <p className="text-sm text-gray-500">Registro diário do caixa.</p>
          </div>

          <div className="divide-y divide-gray-100 max-h-[560px] overflow-y-auto">
            {movimentos.length === 0 && <div className="p-5 text-gray-500">Nenhuma movimentação encontrada.</div>}
            {movimentos.map((m: any) => (
              <div key={m.id} className="p-4 sm:p-5 flex items-start justify-between gap-4 hover:bg-gray-50 transition-colors">
                <div className="min-w-0">
                  <p className="font-bold text-primary truncate">{m.descricao}</p>
                  <p className="text-sm text-gray-500">
                    {shortDate(m.data_movimento)} • {formasMap[m.forma_pagamento] || m.forma_pagamento} • {origensMap[m.origem] || m.origem}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Registrado por: {m.usuario_nome || 'Sistema'}</p>
                  {m.observacoes && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{m.observacoes}</p>}
                </div>

                <div className="text-right shrink-0">
                  <p className="font-display text-lg font-bold text-emerald-700">{formatMoney(m.valor || 0)}</p>
                  {isAdmin && (
                    <button className="mt-2 p-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100" onClick={() => deleteMovement(m)} title="Excluir entrada">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-display text-xl font-bold text-primary">Nova entrada no caixa</h2>
              <p className="text-sm text-gray-500">Registre somente valores que entraram no caixa.</p>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <label className="block">
                <span className="text-sm font-bold text-primary mb-1">Data da entrada</span>
                <input className="input" type="date" value={form.data_movimento} onChange={(e) => setForm({ ...form, data_movimento: e.target.value })} />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-primary mb-1">Descrição</span>
                <input className="input" value={form.descricao} placeholder="Ex: Entrada do pedido MAN123, pagamento de cliente..." onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
              </label>

              <div className="grid sm:grid-cols-3 gap-3">
                <label className="block">
                  <span className="text-sm font-bold text-primary mb-1">Valor da entrada R$</span>
                  <input className="input" value={form.valor} placeholder="0,00" onChange={(e) => setForm({ ...form, valor: e.target.value })} />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-primary mb-1">Forma de pagamento</span>
                  <select className="input" value={form.forma_pagamento} onChange={(e) => setForm({ ...form, forma_pagamento: e.target.value })}>
                    {formasPagamento.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-primary mb-1">Origem</span>
                  <select className="input" value={form.origem} onChange={(e) => setForm({ ...form, origem: e.target.value })}>
                    {origens.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-bold text-primary mb-1">Observações</span>
                <textarea className="input min-h-24" value={form.observacoes} placeholder="Observações internas sobre esta entrada..." onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
              </label>
            </div>

            <div className="p-4 border-t border-gray-100 grid grid-cols-2 gap-3">
              <button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveMovement}>Salvar entrada</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
