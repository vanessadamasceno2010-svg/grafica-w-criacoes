import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Filter,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  Trash2
} from 'lucide-react';
import { apiFetch, formatMoney } from '../../lib/api';
import { BottomSheet } from '../../components/BottomSheet';

type AccountForm = {
  descricao: string;
  fornecedor: string;
  categoria: string;
  valor_total: string;
  quantidade_parcelas: number;
  primeiro_vencimento: string;
  observacoes: string;
};

function localDate(value = new Date()) {
  const offset = value.getTimezoneOffset() * 60000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
}

function monthStart() {
  const date = new Date();
  date.setDate(1);
  return localDate(date);
}

function monthEnd() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1, 0);
  return localDate(date);
}

function shortDate(value: string) {
  if (!value) return '';
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

function moneyToNumber(value: string) {
  const normalized = String(value || '')
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return Number(normalized) || 0;
}

function buildForm(): AccountForm {
  return {
    descricao: '',
    fornecedor: '',
    categoria: '',
    valor_total: '',
    quantidade_parcelas: 1,
    primeiro_vencimento: localDate(),
    observacoes: ''
  };
}

const statusLabels: Record<string, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  cancelado: 'Cancelado'
};

export function ContasPagar() {
  const [filters, setFilters] = useState({
    date_from: monthStart(),
    date_to: monthEnd(),
    status: 'todos',
    q: ''
  });
  const [data, setData] = useState<any>({ contas: [], resumo: {} });
  const [form, setForm] = useState<AccountForm>(buildForm());
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filters.date_from) query.set('date_from', filters.date_from);
      if (filters.date_to) query.set('date_to', filters.date_to);
      if (filters.status !== 'todos') query.set('status', filters.status);
      if (filters.q.trim()) query.set('q', filters.q.trim());
      const result = await apiFetch<any>('/admin/contas-pagar?' + query.toString());
      setData(result || { contas: [], resumo: {} });
    } catch (error: any) {
      alert(error.message || 'Erro ao carregar contas a pagar.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveAccount() {
    const total = moneyToNumber(form.valor_total);
    if (!form.descricao.trim()) return alert('Informe a descrição da conta.');
    if (total <= 0) return alert('Informe um valor maior que zero.');
    if (!form.primeiro_vencimento) return alert('Informe o primeiro vencimento.');
    if (form.quantidade_parcelas < 1) return alert('Informe pelo menos uma parcela.');

    setSaving(true);
    try {
      await apiFetch('/admin/contas-pagar', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          valor_total: total,
          quantidade_parcelas: Number(form.quantidade_parcelas)
        })
      });
      setForm(buildForm());
      setShowForm(false);
      await load();
      alert('Conta e parcelas cadastradas com sucesso.');
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar conta.');
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(account: any, status: 'pendente' | 'pago') {
    try {
      await apiFetch('/admin/contas-pagar/' + account.id, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      await load();
    } catch (error: any) {
      alert(error.message || 'Erro ao atualizar conta.');
    }
  }

  async function removeAccount(account: any) {
    if (!window.confirm(`Excluir a parcela ${account.parcela_numero}/${account.quantidade_parcelas}?`)) return;
    try {
      await apiFetch('/admin/contas-pagar/' + account.id, { method: 'DELETE' });
      await load();
    } catch (error: any) {
      alert(error.message || 'Erro ao excluir parcela.');
    }
  }

  const contas = Array.isArray(data.contas) ? data.contas : [];
  const resumo = data.resumo || {};

  return (
    <div className="fade-in w-full">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary flex items-center gap-2">
            <ReceiptText size={30} /> Contas a Pagar
          </h1>
          <p className="text-gray-500 mt-1">Cadastre contas, parcelas e acompanhe os vencimentos.</p>
        </div>
        <button className="btn btn-primary w-full sm:w-auto" onClick={() => { setForm(buildForm()); setShowForm(true); }}>
          <Plus size={18} /> Nova conta
        </button>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="card p-5">
          <ReceiptText className="text-primary mb-3" size={24} />
          <p className="text-sm text-gray-500">Total do mês</p>
          <p className="font-display text-2xl font-bold text-primary">{formatMoney(resumo.totalMes || 0)}</p>
          <p className="text-xs text-gray-500">{resumo.quantidadeMes || 0} parcela(s)</p>
        </div>
        <div className="card p-5">
          <Clock3 className="text-amber-600 mb-3" size={24} />
          <p className="text-sm text-gray-500">A vencer no mês</p>
          <p className="font-display text-2xl font-bold text-primary">{formatMoney(resumo.aVencerMes || 0)}</p>
          <p className="text-xs text-gray-500">{resumo.quantidadeAVencer || 0} parcela(s)</p>
        </div>
        <div className="card p-5">
          <AlertTriangle className="text-red-600 mb-3" size={24} />
          <p className="text-sm text-gray-500">Contas vencidas</p>
          <p className="font-display text-2xl font-bold text-red-600">{formatMoney(resumo.vencidas || 0)}</p>
          <p className="text-xs text-gray-500">{resumo.quantidadeVencidas || 0} parcela(s)</p>
        </div>
        <div className="card p-5">
          <Filter className="text-blue-600 mb-3" size={24} />
          <p className="text-sm text-gray-500">Total filtrado</p>
          <p className="font-display text-2xl font-bold text-primary">{formatMoney(resumo.totalFiltrado || 0)}</p>
          <p className="text-xs text-gray-500">{resumo.quantidadeFiltrada || 0} parcela(s)</p>
        </div>
      </div>

      <div className="card p-4 mb-6 grid sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <label><span className="text-xs font-bold text-primary">De</span><input className="input" type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} /></label>
        <label><span className="text-xs font-bold text-primary">Até</span><input className="input" type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} /></label>
        <label><span className="text-xs font-bold text-primary">Situação</span><select className="input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="todos">Todas</option><option value="pendente">Pendentes</option><option value="pago">Pagas</option><option value="cancelado">Canceladas</option></select></label>
        <label className="relative"><span className="text-xs font-bold text-primary">Buscar</span><Search className="absolute left-3 top-9 text-gray-400" size={17} /><input className="input pl-10" placeholder="Conta ou fornecedor" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} /></label>
        <button className="btn btn-primary self-end" onClick={load}><Filter size={17} /> Aplicar filtro</button>
      </div>

      {loading && <div className="card p-4 mb-4">Carregando contas...</div>}

      <div className="card overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100"><tr><th className="text-left p-4">Conta</th><th className="text-left p-4">Parcela</th><th className="text-left p-4">Vencimento</th><th className="text-left p-4">Valor</th><th className="text-left p-4">Situação</th><th className="text-right p-4">Ações</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {contas.map((account: any) => (
                <tr key={account.id}>
                  <td className="p-4"><p className="font-bold text-primary">{account.descricao}</p><p className="text-xs text-gray-500">{account.fornecedor || account.categoria || 'Sem fornecedor'}</p></td>
                  <td className="p-4">{account.parcela_numero}/{account.quantidade_parcelas}</td>
                  <td className="p-4">{shortDate(account.vencimento)}</td>
                  <td className="p-4 font-bold">{formatMoney(account.valor_parcela)}</td>
                  <td className="p-4"><span className={`badge ${account.status === 'pago' ? 'bg-green-50 text-green-700' : account.status === 'cancelado' ? 'bg-gray-100 text-gray-500' : account.vencimento < localDate() ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{account.status === 'pendente' && account.vencimento < localDate() ? 'Vencida' : statusLabels[account.status] || account.status}</span></td>
                  <td className="p-4"><div className="flex justify-end gap-2">{account.status === 'pago' ? <button className="p-2 rounded-lg bg-gray-100" title="Voltar para pendente" onClick={() => setStatus(account, 'pendente')}><RotateCcw size={16} /></button> : <button className="p-2 rounded-lg bg-green-50 text-green-700" title="Marcar como paga" onClick={() => setStatus(account, 'pago')}><CheckCircle2 size={16} /></button>}<button className="p-2 rounded-lg bg-red-50 text-red-600" title="Excluir parcela" onClick={() => removeAccount(account)}><Trash2 size={16} /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-gray-100">
          {contas.map((account: any) => (
            <div key={account.id} className="p-4 space-y-3">
              <div className="flex justify-between gap-3"><div><p className="font-bold text-primary">{account.descricao}</p><p className="text-sm text-gray-500">Parcela {account.parcela_numero}/{account.quantidade_parcelas}</p></div><p className="font-bold text-primary">{formatMoney(account.valor_parcela)}</p></div>
              <div className="flex items-center justify-between text-sm"><span><CalendarDays size={15} className="inline mr-1" />{shortDate(account.vencimento)}</span><span className="font-bold">{account.status === 'pendente' && account.vencimento < localDate() ? 'Vencida' : statusLabels[account.status]}</span></div>
              <div className="grid grid-cols-2 gap-2">{account.status === 'pago' ? <button className="btn btn-outline px-2" onClick={() => setStatus(account, 'pendente')}><RotateCcw size={16} />Reabrir</button> : <button className="btn btn-outline px-2" onClick={() => setStatus(account, 'pago')}><CheckCircle2 size={16} />Pagar</button>}<button className="btn btn-danger px-2" onClick={() => removeAccount(account)}><Trash2 size={16} />Excluir</button></div>
            </div>
          ))}
        </div>

        {!loading && contas.length === 0 && <div className="p-8 text-center text-gray-500">Nenhuma conta encontrada neste período.</div>}
      </div>

      <BottomSheet isOpen={showForm} onClose={() => setShowForm(false)} title="Nova conta a pagar">
        <div className="space-y-4">
          <label className="block"><span className="text-sm font-bold text-primary">Descrição *</span><input className="input" placeholder="Ex: Aluguel da gráfica" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></label>
          <div className="grid sm:grid-cols-2 gap-3"><label><span className="text-sm font-bold text-primary">Fornecedor</span><input className="input" placeholder="Nome do fornecedor" value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} /></label><label><span className="text-sm font-bold text-primary">Categoria</span><input className="input" placeholder="Ex: Material, aluguel" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></label></div>
          <div className="grid sm:grid-cols-3 gap-3"><label><span className="text-sm font-bold text-primary">Valor total *</span><input className="input" inputMode="decimal" placeholder="Ex: 1.200,00" value={form.valor_total} onChange={(e) => setForm({ ...form, valor_total: e.target.value })} /></label><label><span className="text-sm font-bold text-primary">Quantidade de parcelas *</span><input className="input" type="number" min="1" max="120" value={form.quantidade_parcelas} onChange={(e) => setForm({ ...form, quantidade_parcelas: Math.max(1, Number(e.target.value || 1)) })} /></label><label><span className="text-sm font-bold text-primary">Primeiro vencimento *</span><input className="input" type="date" value={form.primeiro_vencimento} onChange={(e) => setForm({ ...form, primeiro_vencimento: e.target.value })} /></label></div>
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-sm text-gray-600">As próximas parcelas serão criadas mensalmente a partir do primeiro vencimento.</div>
          <label className="block"><span className="text-sm font-bold text-primary">Observações</span><textarea className="input min-h-24" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></label>
          <div className="grid grid-cols-2 gap-3"><button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancelar</button><button className="btn btn-primary" disabled={saving} onClick={saveAccount}>{saving ? 'Salvando...' : 'Cadastrar conta'}</button></div>
        </div>
      </BottomSheet>
    </div>
  );
}

export default ContasPagar;
