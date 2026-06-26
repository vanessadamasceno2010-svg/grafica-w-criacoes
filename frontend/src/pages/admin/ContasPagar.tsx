import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Calculator,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  Plus,
  ReceiptText,
  Repeat,
  RotateCcw,
  Search,
  Trash2,
  WalletCards,
  X
} from 'lucide-react';

import { apiFetch, formatMoney } from '../../lib/api';
import { BottomSheet } from '../../components/BottomSheet';

type AccountForm = {
  descricao: string;
  fornecedor: string;
  categoria: string;
  valor_parcela: string;
  valor_total: string;
  quantidade_parcelas: number;
  primeiro_vencimento: string;
  conta_fixa: boolean;
  observacoes: string;
};

type EditAccountForm = {
  id: string;
  grupo_id: string;
  parcela_numero: number;
  quantidade_parcelas: number;
  descricao: string;
  fornecedor: string;
  categoria: string;
  valor_parcela: string;
  vencimento: string;
  status: 'pendente' | 'pago' | 'cancelado';
  conta_fixa: boolean;
  observacoes: string;
};

type MonthRange = {
  date_from: string;
  date_to: string;
};

const statusLabels: Record<string, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  cancelado: 'Cancelado'
};

const statusClasses: Record<string, string> = {
  pendente: 'bg-amber-50 text-amber-700 border-amber-200',
  pago: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelado: 'bg-gray-100 text-gray-600 border-gray-200'
};

function localDate(value = new Date()) {
  const offset = value.getTimezoneOffset() * 60000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
}

function currentMonthValue() {
  return localDate().slice(0, 7);
}

function monthRangeFromValue(value: string): MonthRange {
  const [year, month] = String(value || currentMonthValue()).split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  return {
    date_from: localDate(start),
    date_to: localDate(end)
  };
}

function addMonths(monthValue: string, amount: number) {
  const [year, month] = String(monthValue || currentMonthValue()).split('-').map(Number);
  const date = new Date(year, month - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(monthValue: string) {
  const [year, month] = String(monthValue || currentMonthValue()).split('-').map(Number);

  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric'
  }).format(new Date(year, month - 1, 1));
}

function shortDate(value: string) {
  if (!value) return '';
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

function moneyToNumber(value: string | number) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  const normalized = String(value || '')
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  return Number(normalized) || 0;
}

function onlyDigits(value: string) {
  return String(value || '').replace(/\D/g, '');
}

function moneyInput(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '';
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function calculateTotal(valorParcela: string, quantidade: number) {
  const parcela = moneyToNumber(valorParcela);
  const qtd = Math.max(1, Number(quantidade || 1));

  return parcela * qtd;
}

function buildForm(): AccountForm {
  return {
    descricao: '',
    fornecedor: '',
    categoria: '',
    valor_parcela: '',
    valor_total: '',
    quantidade_parcelas: 1,
    primeiro_vencimento: localDate(),
    conta_fixa: false,
    observacoes: ''
  };
}

function getDueStatus(account: any) {
  const today = localDate();
  const vencimento = String(account.vencimento || '').slice(0, 10);

  if (account.status === 'pago') {
    return {
      label: 'Pago',
      icon: CheckCircle2,
      card: 'border-l-emerald-500 bg-emerald-50/50',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };
  }

  if (account.status === 'cancelado') {
    return {
      label: 'Cancelado',
      icon: X,
      card: 'border-l-gray-400 bg-gray-50',
      badge: 'bg-gray-100 text-gray-600 border-gray-200'
    };
  }

  if (vencimento && vencimento < today) {
    return {
      label: 'Vencida',
      icon: AlertTriangle,
      card: 'border-l-red-500 bg-red-50/60',
      badge: 'bg-red-50 text-red-700 border-red-200'
    };
  }

  if (vencimento === today) {
    return {
      label: 'Vence hoje',
      icon: AlertTriangle,
      card: 'border-l-orange-500 bg-orange-50/60',
      badge: 'bg-orange-50 text-orange-700 border-orange-200'
    };
  }

  return {
    label: 'A vencer',
    icon: Clock3,
    card: 'border-l-amber-500 bg-white',
    badge: 'bg-amber-50 text-amber-700 border-amber-200'
  };
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = 'default'
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: any;
  tone?: 'default' | 'danger' | 'warning' | 'success' | 'money' | 'purple';
}) {
  const tones = {
    default: 'bg-white border-gray-100 text-primary',
    danger: 'bg-red-50 border-red-100 text-red-700',
    warning: 'bg-amber-50 border-amber-100 text-amber-700',
    success: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    money: 'bg-blue-50 border-blue-100 text-blue-700',
    purple: 'bg-purple-50 border-purple-100 text-purple-700'
  };

  return (
    <div className={`rounded-2xl border p-3 ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{title}</p>
          <p className="font-display text-xl font-bold mt-0.5 leading-tight">{value}</p>
          <p className="text-[11px] opacity-75 mt-0.5 leading-tight">{subtitle}</p>
        </div>

        <div className="w-9 h-9 rounded-xl bg-white/80 flex items-center justify-center shrink-0">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

export function ContasPagar() {
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue());
  const [filters, setFilters] = useState({
    ...monthRangeFromValue(currentMonthValue()),
    status: 'todos',
    q: ''
  });

  const [data, setData] = useState<any>({ contas: [], resumo: {} });
  const [form, setForm] = useState<AccountForm>(buildForm());
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<EditAccountForm | null>(null);
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
  }, [filters.date_from, filters.date_to, filters.status]);

  function applyMonth(monthValue: string) {
    const range = monthRangeFromValue(monthValue);
    setSelectedMonth(monthValue);
    setFilters((prev) => ({
      ...prev,
      ...range
    }));
  }

  function updateInstallmentValue(value: string) {
    const total = calculateTotal(value, form.quantidade_parcelas);

    setForm({
      ...form,
      valor_parcela: value,
      valor_total: moneyInput(total)
    });
  }

  function updateInstallmentQuantity(value: string | number) {
    const digits = onlyDigits(String(value));
    const quantidade = Math.max(1, Math.min(120, Number(digits || 1)));
    const total = calculateTotal(form.valor_parcela, quantidade);

    setForm({
      ...form,
      quantidade_parcelas: quantidade,
      valor_total: moneyInput(total)
    });
  }

  function toggleContaFixa(checked: boolean) {
    const quantidade = checked && Number(form.quantidade_parcelas || 1) <= 1
      ? 12
      : Math.max(1, Number(form.quantidade_parcelas || 1));

    const total = calculateTotal(form.valor_parcela, quantidade);

    setForm({
      ...form,
      conta_fixa: checked,
      quantidade_parcelas: quantidade,
      valor_total: moneyInput(total)
    });
  }

  async function saveAccount() {
    const valorParcela = moneyToNumber(form.valor_parcela);
    const quantidade = Math.max(1, Number(form.quantidade_parcelas || 1));
    const total = valorParcela * quantidade;
    const valorTotalPayload = form.conta_fixa ? 0 : total;

    if (!form.descricao.trim()) return alert('Informe a descrição da conta.');
    if (valorParcela <= 0) return alert('Informe o valor da parcela.');
    if (!form.conta_fixa && total <= 0) return alert('O valor total precisa ser maior que zero.');
    if (!form.primeiro_vencimento) return alert('Informe o primeiro vencimento.');
    if (quantidade < 1) return alert('Informe pelo menos uma parcela.');

    setSaving(true);

    try {
      await apiFetch('/admin/contas-pagar', {
        method: 'POST',
        body: JSON.stringify({
          descricao: form.descricao,
          fornecedor: form.fornecedor,
          categoria: form.categoria,
          valor_parcela: valorParcela,
          valor_total: valorTotalPayload,
          quantidade_parcelas: quantidade,
          primeiro_vencimento: form.primeiro_vencimento,
          conta_fixa: form.conta_fixa,
          observacoes: form.observacoes
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
    const isParcelada = Number(account.quantidade_parcelas || 1) > 1 && account.grupo_id;

    let endpoint = '/admin/contas-pagar/' + account.id;
    let mensagemSucesso = 'Parcela excluída com sucesso.';

    if (isParcelada) {
      const excluirTodas = window.confirm(
        `Essa conta possui ${account.quantidade_parcelas} parcelas.\n\n` +
        'Clique em OK para excluir TODAS as parcelas desta conta.\n' +
        'Clique em Cancelar para excluir APENAS esta parcela atual.'
      );

      if (excluirTodas) {
        if (!window.confirm('Confirma excluir todas as parcelas desta conta?')) return;
        endpoint = '/admin/contas-pagar/grupo/' + account.grupo_id;
        mensagemSucesso = 'Todas as parcelas da conta foram excluídas.';
      } else {
        if (!window.confirm(`Confirma excluir apenas a parcela ${account.parcela_numero}/${account.quantidade_parcelas}?`)) return;
      }
    } else if (!window.confirm('Excluir esta conta?')) {
      return;
    }

    try {
      await apiFetch(endpoint, { method: 'DELETE' });
      setEditingAccount(null);
      await load();
      alert(mensagemSucesso);
    } catch (error: any) {
      alert(error.message || 'Erro ao excluir conta.');
    }
  }

  function openEditAccount(account: any) {
    setEditingAccount({
      id: account.id,
      grupo_id: account.grupo_id || '',
      parcela_numero: Number(account.parcela_numero || 1),
      quantidade_parcelas: Number(account.quantidade_parcelas || 1),
      descricao: account.descricao || '',
      fornecedor: account.fornecedor || '',
      categoria: account.categoria || '',
      valor_parcela: moneyInput(moneyToNumber(account.valor_parcela || 0)),
      vencimento: String(account.vencimento || '').slice(0, 10),
      status: account.status || 'pendente',
      conta_fixa: Boolean(account.conta_fixa),
      observacoes: account.observacoes || ''
    });
  }

  async function saveAccountChanges() {
    if (!editingAccount) return;

    const valorParcela = moneyToNumber(editingAccount.valor_parcela);

    if (!editingAccount.descricao.trim()) return alert('Informe a descrição da conta.');
    if (valorParcela <= 0) return alert('Informe o valor da parcela.');
    if (!editingAccount.vencimento) return alert('Informe o vencimento.');

    setSaving(true);

    try {
      await apiFetch('/admin/contas-pagar/' + editingAccount.id, {
        method: 'PUT',
        body: JSON.stringify({
          descricao: editingAccount.descricao,
          fornecedor: editingAccount.fornecedor,
          categoria: editingAccount.categoria,
          valor_parcela: valorParcela,
          quantidade_parcelas: Math.max(1, Number(editingAccount.quantidade_parcelas || 1)),
          vencimento: editingAccount.vencimento,
          status: editingAccount.status,
          conta_fixa: editingAccount.conta_fixa,
          observacoes: editingAccount.observacoes
        })
      });

      setEditingAccount(null);
      await load();
      alert('Conta atualizada com sucesso.');
    } catch (error: any) {
      alert(error.message || 'Erro ao atualizar conta.');
    } finally {
      setSaving(false);
    }
  }

  const contas = Array.isArray(data.contas) ? data.contas : [];
  const resumo = data.resumo || {};

  const contasFixasFiltradas = useMemo(() => {
    return contas.filter((conta) => conta.conta_fixa && conta.status !== 'cancelado');
  }, [contas]);

  function valorRestanteConta(account: any) {
    if (account.conta_fixa) return '-';

    const restante = account.valor_restante_conta !== undefined && account.valor_restante_conta !== null
      ? moneyToNumber(account.valor_restante_conta)
      : moneyToNumber(account.valor_total || 0);

    return formatMoney(restante);
  }

  const valorTotalFormulario = moneyToNumber(form.valor_total);
  const valorParcelaFormulario = moneyToNumber(form.valor_parcela);

  return (
    <div className="fade-in w-full max-w-full overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold mb-2">
            Financeiro
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary flex items-center gap-2">
            <ReceiptText size={30} />
            Contas a Pagar
          </h1>
          <p className="text-gray-500 mt-1">
            Controle parcelas, vencimentos, contas fixas e pagamentos por mês.
          </p>
        </div>

        <button
          className="btn btn-primary w-full sm:w-auto"
          onClick={() => {
            setForm(buildForm());
            setShowForm(true);
          }}
        >
          <Plus size={18} />
          Nova conta
        </button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-2 sm:gap-3 mb-4">
        <SummaryCard
          title="Total do mês"
          value={formatMoney(resumo.totalMes || 0)}
          subtitle={`${resumo.quantidadeMes || 0} parcela(s)`}
          icon={ReceiptText}
          tone="money"
        />

        <SummaryCard
          title="A vencer"
          value={formatMoney(resumo.aVencerMes || 0)}
          subtitle={`${resumo.quantidadeAVencer || 0} no mês`}
          icon={Clock3}
          tone="warning"
        />

        <SummaryCard
          title="Pagas"
          value={formatMoney(resumo.contasPagasMes || 0)}
          subtitle={`${resumo.quantidadePagasMes || 0} quitada(s)`}
          icon={CheckCircle2}
          tone="success"
        />

        <SummaryCard
          title="Vencidas"
          value={formatMoney(resumo.vencidas || 0)}
          subtitle={`${resumo.quantidadeVencidas || 0} em atraso`}
          icon={AlertTriangle}
          tone={Number(resumo.quantidadeVencidas || 0) > 0 ? 'danger' : 'success'}
        />

        <SummaryCard
          title="Contas fixas"
          value={formatMoney(resumo.contasFixasMes || 0)}
          subtitle={`${resumo.quantidadeFixasMes || contasFixasFiltradas.length} fixa(s)`}
          icon={Repeat}
          tone="purple"
        />
      </div>

      <div className="card p-3 sm:p-4 mb-4 space-y-4">
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
          <p className="text-xs font-bold text-gray-400 uppercase mb-2">Filtro rápido por mês</p>

          <div className="grid grid-cols-[44px_1fr_44px] gap-2 items-center">
            <button
              type="button"
              className="btn btn-outline px-2 py-2"
              onClick={() => applyMonth(addMonths(selectedMonth, -1))}
              aria-label="Mês anterior"
            >
              <ChevronLeft size={18} />
            </button>

            <input
              type="month"
              className="input text-center font-bold capitalize"
              value={selectedMonth}
              onChange={(e) => applyMonth(e.target.value || currentMonthValue())}
            />

            <button
              type="button"
              className="btn btn-outline px-2 py-2"
              onClick={() => applyMonth(addMonths(selectedMonth, 1))}
              aria-label="Próximo mês"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2">
            <button
              type="button"
              className="rounded-xl border border-gray-200 bg-white px-2 py-2 text-xs font-bold text-primary"
              onClick={() => applyMonth(currentMonthValue())}
            >
              Mês atual
            </button>

            <button
              type="button"
              className="rounded-xl border border-gray-200 bg-white px-2 py-2 text-xs font-bold text-primary"
              onClick={() => setFilters((prev) => ({ ...prev, status: 'pendente' }))}
            >
              Pendentes
            </button>

            <button
              type="button"
              className="rounded-xl border border-gray-200 bg-white px-2 py-2 text-xs font-bold text-primary"
              onClick={() => setFilters((prev) => ({ ...prev, status: 'pago' }))}
            >
              Pagas
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-2 capitalize">
            Período selecionado: <b>{monthLabel(selectedMonth)}</b>
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_180px_auto] gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={19} />
            <input
              className="input pl-11"
              placeholder="Buscar por descrição, fornecedor ou categoria..."
              value={filters.q}
              onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') load();
              }}
            />
          </div>

          <select
            className="input"
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
          >
            <option value="todos">Todos os status</option>
            <option value="pendente">Pendentes</option>
            <option value="pago">Pagas</option>
            <option value="cancelado">Canceladas</option>
          </select>

          <button type="button" className="btn btn-outline" onClick={load} disabled={loading}>
            <Filter size={17} />
            {loading ? 'Carregando...' : 'Filtrar'}
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-primary">Parcelas do período</h2>
            <p className="text-sm text-gray-500">
              {contas.length} conta(s) encontrada(s) · Total filtrado {formatMoney(resumo.totalFiltrado || 0)}
            </p>
          </div>
        </div>

        {loading && <div className="p-4 text-gray-500">Carregando contas...</div>}

        <div className="grid gap-3 p-3 sm:p-4">
          {contas.map((account: any) => {
            const due = getDueStatus(account);
            const DueIcon = due.icon;

            return (
              <div
                key={account.id}
                role="button"
                tabIndex={0}
                onClick={() => openEditAccount(account)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') openEditAccount(account);
                }}
                className={`rounded-2xl border border-gray-100 border-l-4 ${due.card} p-3 sm:p-4 cursor-pointer hover:ring-2 hover:ring-gold/40 transition`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-bold ${due.badge}`}>
                        <DueIcon size={13} />
                        {due.label}
                      </span>

                      <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold ${statusClasses[account.status] || statusClasses.pendente}`}>
                        {statusLabels[account.status] || account.status}
                      </span>

                      {account.conta_fixa && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-purple-200 bg-purple-50 text-purple-700 text-[11px] font-bold">
                          <Repeat size={13} />
                          Conta fixa
                        </span>
                      )}

                      <span className="px-2.5 py-1 rounded-full border border-gray-200 bg-white/80 text-gray-600 text-[11px] font-bold">
                        {account.parcela_numero}/{account.quantidade_parcelas}
                      </span>
                    </div>

                    <h3 className="font-display text-lg font-bold text-primary leading-tight">
                      {account.descricao}
                    </h3>

                    <p className="text-sm text-gray-500 mt-1">
                      {[account.fornecedor, account.categoria].filter(Boolean).join(' · ') || 'Sem fornecedor/categoria'}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                      <div className="rounded-xl bg-white/80 border border-gray-100 p-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Vencimento</p>
                        <p className="font-bold text-primary">{shortDate(account.vencimento)}</p>
                      </div>

                      <div className="rounded-xl bg-white/80 border border-gray-100 p-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Parcela</p>
                        <p className="font-bold text-primary">{formatMoney(account.valor_parcela || 0)}</p>
                      </div>

                      <div className="rounded-xl bg-white/80 border border-gray-100 p-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Restante</p>
                        <p className="font-bold text-primary">{valorRestanteConta(account)}</p>
                      </div>

                      <div className="rounded-xl bg-white/80 border border-gray-100 p-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Pagamento</p>
                        <p className="font-bold text-primary">
                          {account.data_pagamento ? shortDate(account.data_pagamento) : 'Não pago'}
                        </p>
                      </div>
                    </div>

                    {account.observacoes && (
                      <p className="text-sm text-gray-600 mt-3 whitespace-pre-line">
                        {account.observacoes}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 lg:w-40" onClick={(e) => e.stopPropagation()}>
                    {account.status === 'pago' ? (
                      <button className="btn btn-outline px-2" onClick={() => setStatus(account, 'pendente')}>
                        <RotateCcw size={16} />
                        Reabrir
                      </button>
                    ) : (
                      <button className="btn btn-primary px-2" onClick={() => setStatus(account, 'pago')}>
                        <CheckCircle2 size={16} />
                        Pagar
                      </button>
                    )}

                    <button className="btn btn-danger px-2" onClick={() => removeAccount(account)}>
                      <Trash2 size={16} />
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!loading && contas.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            Nenhuma conta encontrada neste período.
          </div>
        )}
      </div>

      <BottomSheet isOpen={showForm} onClose={() => setShowForm(false)} title="Nova conta a pagar">
        <div className="space-y-4">
          <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
            <div className="flex items-start gap-3">
              <Calculator className="text-blue-700 shrink-0 mt-1" size={22} />
              <div>
                <p className="font-bold text-primary">Cálculo automático</p>
                <p className="text-sm text-gray-600">
                  Informe o valor da parcela e a quantidade. O valor total será calculado automaticamente.
                </p>
              </div>
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-bold text-primary">Descrição *</span>
            <input
              className="input"
              placeholder="Ex: Aluguel da gráfica"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
          </label>

          <div className="grid sm:grid-cols-2 gap-3">
            <label>
              <span className="text-sm font-bold text-primary">Fornecedor</span>
              <input
                className="input"
                placeholder="Nome do fornecedor"
                value={form.fornecedor}
                onChange={(e) => setForm({ ...form, fornecedor: e.target.value })}
              />
            </label>

            <label>
              <span className="text-sm font-bold text-primary">Categoria</span>
              <input
                className="input"
                placeholder="Ex: Material, aluguel, sistema"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              />
            </label>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <label>
              <span className="text-sm font-bold text-primary">Valor da parcela *</span>
              <input
                className="input border-2 border-blue-200 focus:border-blue-500"
                inputMode="decimal"
                placeholder="Ex: 100,00"
                value={form.valor_parcela}
                onChange={(e) => updateInstallmentValue(e.target.value)}
              />
            </label>

            <label>
              <span className="text-sm font-bold text-primary">Quantidade *</span>
              <input
                className="input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={String(form.quantidade_parcelas || '')}
                onChange={(e) => updateInstallmentQuantity(e.target.value)}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData('text');
                  if (/\D/.test(pasted)) e.preventDefault();
                }}
              />
            </label>

            <label>
              <span className="text-sm font-bold text-primary">Total / restante automático</span>
              <input
                className="input bg-gray-50 font-bold"
                readOnly
                value={form.conta_fixa ? '-' : form.valor_total}
                placeholder="0,00"
              />
            </label>
          </div>

          <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 grid sm:grid-cols-2 gap-3 items-center">
            <label>
              <span className="text-sm font-bold text-primary">Primeiro vencimento *</span>
              <input
                className="input"
                type="date"
                value={form.primeiro_vencimento}
                onChange={(e) => setForm({ ...form, primeiro_vencimento: e.target.value })}
              />
            </label>

            <label className="flex items-center gap-3 rounded-2xl bg-white border border-gray-100 p-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5"
                checked={form.conta_fixa}
                onChange={(e) => toggleContaFixa(e.target.checked)}
              />

              <span>
                <span className="font-bold text-primary flex items-center gap-2">
                  <Repeat size={16} />
                  Conta fixa
                </span>
                <span className="block text-xs text-gray-500">
                  Marque para aluguel, internet, sistema, energia etc. Se estiver em 1 parcela, o sistema muda para 12 meses.
                </span>
              </span>
            </label>
          </div>

          <div className="rounded-2xl bg-primary text-white p-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-white/60 uppercase font-bold">Parcela</p>
                <p className="font-display text-xl font-bold">{formatMoney(valorParcelaFormulario)}</p>
              </div>

              <div>
                <p className="text-xs text-white/60 uppercase font-bold">Total / restante</p>
                <p className="font-display text-xl font-bold">{form.conta_fixa ? '-' : formatMoney(valorTotalFormulario)}</p>
                {form.conta_fixa && (
                  <p className="text-xs text-white/60 mt-1">Conta fixa não soma os 12 meses</p>
                )}
              </div>
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-bold text-primary">Observações</span>
            <textarea
              className="input min-h-24"
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              placeholder="Observações internas sobre esta conta"
            />
          </label>

          <div className="sticky bottom-0 -mx-5 -mb-5 bg-white border-t border-gray-100 p-4 grid grid-cols-2 gap-3">
            <button className="btn btn-outline" onClick={() => setShowForm(false)}>
              Cancelar
            </button>

            <button className="btn btn-primary" disabled={saving} onClick={saveAccount}>
              {saving ? 'Salvando...' : 'Cadastrar conta'}
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet isOpen={!!editingAccount} onClose={() => setEditingAccount(null)} title="Editar conta">
        {editingAccount && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
              <p className="font-bold text-primary">Editar parcela</p>
              <p className="text-sm text-gray-600">
                Altere os dados desta conta, marque como paga ou sinalize como conta fixa.
              </p>
            </div>

            <label className="block">
              <span className="text-sm font-bold text-primary">Descrição *</span>
              <input
                className="input"
                value={editingAccount.descricao}
                onChange={(e) => setEditingAccount({ ...editingAccount, descricao: e.target.value })}
              />
            </label>

            <div className="grid sm:grid-cols-2 gap-3">
              <label>
                <span className="text-sm font-bold text-primary">Fornecedor</span>
                <input
                  className="input"
                  value={editingAccount.fornecedor}
                  onChange={(e) => setEditingAccount({ ...editingAccount, fornecedor: e.target.value })}
                />
              </label>

              <label>
                <span className="text-sm font-bold text-primary">Categoria</span>
                <input
                  className="input"
                  value={editingAccount.categoria}
                  onChange={(e) => setEditingAccount({ ...editingAccount, categoria: e.target.value })}
                />
              </label>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <label>
                <span className="text-sm font-bold text-primary">Valor da parcela *</span>
                <input
                  className="input"
                  inputMode="decimal"
                  value={editingAccount.valor_parcela}
                  onChange={(e) => setEditingAccount({ ...editingAccount, valor_parcela: e.target.value })}
                />
              </label>

              <label>
                <span className="text-sm font-bold text-primary">Quantidade de parcelas</span>
                <input
                  className="input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={String(editingAccount.quantidade_parcelas || '')}
                  onChange={(e) => {
                    const digits = onlyDigits(e.target.value);
                    setEditingAccount({
                      ...editingAccount,
                      quantidade_parcelas: Math.max(1, Math.min(120, Number(digits || 1)))
                    });
                  }}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData('text');
                    if (/\D/.test(pasted)) e.preventDefault();
                  }}
                />
                <span className="text-xs text-gray-500">
                  Ao salvar, o sistema recalcula o restante e cria/remove parcelas futuras.
                </span>
              </label>

              <label>
                <span className="text-sm font-bold text-primary">Vencimento *</span>
                <input
                  className="input"
                  type="date"
                  value={editingAccount.vencimento}
                  onChange={(e) => setEditingAccount({ ...editingAccount, vencimento: e.target.value })}
                />
              </label>

              <label>
                <span className="text-sm font-bold text-primary">Status</span>
                <select
                  className="input"
                  value={editingAccount.status}
                  onChange={(e) => setEditingAccount({ ...editingAccount, status: e.target.value as EditAccountForm['status'] })}
                >
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </label>
            </div>

            <label className="flex items-center gap-3 rounded-2xl bg-gray-50 border border-gray-100 p-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5"
                checked={editingAccount.conta_fixa}
                onChange={(e) => setEditingAccount({ ...editingAccount, conta_fixa: e.target.checked })}
              />

              <span>
                <span className="font-bold text-primary flex items-center gap-2">
                  <Repeat size={16} />
                  Conta fixa
                </span>
                <span className="block text-xs text-gray-500">
                  Use para contas recorrentes mensais.
                </span>
              </span>
            </label>

            <label className="block">
              <span className="text-sm font-bold text-primary">Observações</span>
              <textarea
                className="input min-h-24"
                value={editingAccount.observacoes}
                onChange={(e) => setEditingAccount({ ...editingAccount, observacoes: e.target.value })}
              />
            </label>

            <div className="sticky bottom-0 -mx-5 -mb-5 bg-white border-t border-gray-100 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button className="btn btn-outline" onClick={() => setEditingAccount(null)}>
                Cancelar
              </button>

              <button
                className="btn btn-danger"
                onClick={() => removeAccount({
                  id: editingAccount.id,
                  grupo_id: editingAccount.grupo_id,
                  parcela_numero: editingAccount.parcela_numero,
                  quantidade_parcelas: editingAccount.quantidade_parcelas
                })}
              >
                Excluir
              </button>

              <button className="btn btn-primary" disabled={saving} onClick={saveAccountChanges}>
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

export default ContasPagar;
