import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeDollarSign,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Copy,
  FileCheck2,
  Filter,
  MessageCircle,
  Plus,
  Search,
  Send,
  ShoppingCart,
  Trash2,
  X
} from 'lucide-react';

import {
  apiFetch,
  formatMoney,
  formatPhoneDigits
} from '../../lib/api';

type Cliente = {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
};

type Orcamento = {
  id: string;
  numero_orcamento: string;
  usuario_id?: string | null;
  cliente_nome: string;
  cliente_email?: string;
  cliente_telefone?: string;
  descricao: string;
  valor_total: number;
  validade?: string | null;
  status: string;
  observacoes?: string;
  virou_pedido?: boolean;
  pedido_id?: string | null;
  created_at?: string;
};

type FormState = {
  usuario_id: string;
  cliente_nome: string;
  cliente_email: string;
  cliente_telefone: string;
  descricao: string;
  valor_total: string;
  validade: string;
  status: string;
  observacoes: string;
};

type StatusFilter =
  | 'todos'
  | 'rascunho'
  | 'enviado'
  | 'aprovado'
  | 'recusado'
  | 'vencido'
  | 'convertido';

const statusLabels: Record<string, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
  vencido: 'Vencido'
};

const statusClasses: Record<string, string> = {
  rascunho: 'bg-gray-100 text-gray-700 border-gray-200',
  enviado: 'bg-blue-50 text-blue-700 border-blue-200',
  aprovado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  recusado: 'bg-red-50 text-red-700 border-red-200',
  vencido: 'bg-orange-50 text-orange-700 border-orange-200'
};

const cardClasses: Record<string, string> = {
  rascunho: 'border-l-gray-400 bg-gray-50/40',
  enviado: 'border-l-blue-500 bg-blue-50/30',
  aprovado: 'border-l-emerald-500 bg-emerald-50/30',
  recusado: 'border-l-red-500 bg-red-50/30',
  vencido: 'border-l-orange-500 bg-orange-50/40'
};

function emptyForm(): FormState {
  return {
    usuario_id: '',
    cliente_nome: '',
    cliente_email: '',
    cliente_telefone: '',
    descricao: '',
    valor_total: '',
    validade: '',
    status: 'rascunho',
    observacoes: ''
  };
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function localDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function moneyToNumber(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const normalized = String(value || '0')
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  return Number(normalized) || 0;
}

function moneyInput(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '';

  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function dateOnly(value: unknown) {
  return value ? String(value).slice(0, 10) : '';
}

function formatDate(value?: string | null) {
  if (!value) return 'A combinar';

  const clean = dateOnly(value);
  const [year, month, day] = clean.split('-');

  if (!year || !month || !day) return 'A combinar';

  return `${day}/${month}/${year}`;
}

function getEffectiveStatus(orcamento: Orcamento) {
  if (orcamento.virou_pedido) return 'aprovado';

  const validade = dateOnly(orcamento.validade);

  if (
    validade &&
    validade < localDate() &&
    !['aprovado', 'recusado'].includes(orcamento.status)
  ) {
    return 'vencido';
  }

  return orcamento.status || 'rascunho';
}

function getValidityInfo(orcamento: Orcamento) {
  if (orcamento.virou_pedido) {
    return {
      label: 'Convertido em pedido',
      tone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: CheckCircle2
    };
  }

  const validade = dateOnly(orcamento.validade);

  if (!validade) {
    return {
      label: 'Sem validade definida',
      tone: 'bg-gray-50 text-gray-600 border-gray-200',
      icon: CalendarDays
    };
  }

  const today = localDate();
  const todayDate = new Date(`${today}T12:00:00`);
  const validityDate = new Date(`${validade}T12:00:00`);
  const diff = Math.ceil(
    (validityDate.getTime() - todayDate.getTime()) / 86400000
  );

  if (diff < 0) {
    return {
      label: `Vencido há ${Math.abs(diff)} dia(s)`,
      tone: 'bg-red-50 text-red-700 border-red-200',
      icon: AlertTriangle
    };
  }

  if (diff === 0) {
    return {
      label: 'Vence hoje',
      tone: 'bg-orange-50 text-orange-700 border-orange-200',
      icon: AlertTriangle
    };
  }

  if (diff <= 3) {
    return {
      label: `Vence em ${diff} dia(s)`,
      tone: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: CalendarDays
    };
  }

  return {
    label: `Válido até ${formatDate(validade)}`,
    tone: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: CalendarDays
  };
}

function buildShareMessage(orcamento: Orcamento) {
  const numero = orcamento.numero_orcamento || orcamento.id;
  const validade = orcamento.validade
    ? formatDate(orcamento.validade)
    : 'A combinar';

  return [
    `*Orçamento número:* ${numero}`,
    '',
    `*Cliente:* ${orcamento.cliente_nome || 'Cliente'}`,
    '',
    '*Descrição:*',
    String(orcamento.descricao || '').trim(),
    '',
    `*Valor total:* ${formatMoney(orcamento.valor_total || 0)}`,
    `*Validade do orçamento:* ${validade}`,
    '',
    '*Forma de pagamento:*',
    '50% no pedido e 50% na entrega',
    '',
    '*Chave Pix:*',
    'wcriacoesgrafica@gmail.com',
    '',
    'Após a confirmação, seguiremos com a criação dos layouts e enviaremos para aprovação antes de iniciar a produção dos materiais.',
    '',
    'Qualquer dúvida, estamos à disposição.'
  ].join('\n');
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: any;
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'purple';
}) {
  const tones = {
    primary: 'bg-blue-50 border-blue-100 text-blue-700',
    success: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    warning: 'bg-amber-50 border-amber-100 text-amber-700',
    danger: 'bg-red-50 border-red-100 text-red-700',
    purple: 'bg-purple-50 border-purple-100 text-purple-700'
  };

  return (
    <div className={`rounded-2xl border p-3 ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wide opacity-70">
            {title}
          </p>
          <p className="font-display text-lg sm:text-xl font-black mt-0.5 leading-tight break-words">
            {value}
          </p>
          <p className="text-[11px] opacity-75 mt-0.5 leading-tight">
            {subtitle}
          </p>
        </div>

        <div className="w-9 h-9 rounded-xl bg-white/80 flex items-center justify-center shrink-0">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

export function Orcamentos() {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('todos');
  const [month, setMonth] = useState(currentMonth());

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Orcamento | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  const [share, setShare] = useState<{
    orcamento: Orcamento;
    texto: string;
  } | null>(null);

  async function load() {
    setLoading(true);

    try {
      const [orcRows, cliRows] = await Promise.all([
        apiFetch<Orcamento[]>('/admin/orcamentos'),
        apiFetch<Cliente[]>('/admin/clientes').catch(() => [])
      ]);

      setOrcamentos(Array.isArray(orcRows) ? orcRows : []);
      setClientes(Array.isArray(cliRows) ? cliRows : []);
    } catch (error: any) {
      alert(error.message || 'Erro ao carregar orçamentos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const monthAndSearchFiltered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const phoneQuery = search.replace(/\D/g, '');

    return orcamentos.filter((orcamento) => {
      const text = [
        orcamento.numero_orcamento,
        orcamento.cliente_nome,
        orcamento.cliente_email,
        orcamento.cliente_telefone,
        orcamento.descricao
      ]
        .join(' ')
        .toLowerCase();

      const phoneMatches =
        phoneQuery &&
        String(orcamento.cliente_telefone || '')
          .replace(/\D/g, '')
          .includes(phoneQuery);

      if (query && !text.includes(query) && !phoneMatches) {
        return false;
      }

      if (
        month &&
        dateOnly(orcamento.created_at).slice(0, 7) !== month
      ) {
        return false;
      }

      return true;
    });
  }, [orcamentos, search, month]);

  const filtered = useMemo(() => {
    return monthAndSearchFiltered.filter((orcamento) => {
      if (status === 'todos') return true;
      if (status === 'convertido') return Boolean(orcamento.virou_pedido);

      return getEffectiveStatus(orcamento) === status;
    });
  }, [monthAndSearchFiltered, status]);

  const summary = useMemo(() => {
    const valid = monthAndSearchFiltered;
    const totalValue = valid.reduce(
      (sum, orcamento) => sum + moneyToNumber(orcamento.valor_total),
      0
    );

    const approved = valid.filter(
      (orcamento) => getEffectiveStatus(orcamento) === 'aprovado'
    ).length;

    const pending = valid.filter((orcamento) =>
      ['rascunho', 'enviado', 'vencido'].includes(
        getEffectiveStatus(orcamento)
      )
    ).length;

    const converted = valid.filter(
      (orcamento) => orcamento.virou_pedido
    ).length;

    return {
      total: valid.length,
      totalValue,
      approved,
      pending,
      converted
    };
  }, [monthAndSearchFiltered]);

  function openNew() {
    setEditing(null);
    setForm(emptyForm());
    setModal(true);
  }

  function openEdit(orcamento: Orcamento) {
    setEditing(orcamento);
    setForm({
      usuario_id: orcamento.usuario_id || '',
      cliente_nome: orcamento.cliente_nome || '',
      cliente_email: orcamento.cliente_email || '',
      cliente_telefone: formatPhoneDigits(
        orcamento.cliente_telefone || ''
      ),
      descricao: orcamento.descricao || '',
      valor_total: moneyInput(moneyToNumber(orcamento.valor_total)),
      validade: dateOnly(orcamento.validade),
      status: orcamento.status || 'rascunho',
      observacoes: orcamento.observacoes || ''
    });
    setModal(true);
  }

  function chooseClient(id: string) {
    const cliente = clientes.find((item) => item.id === id);

    if (!cliente) {
      setForm((current) => ({
        ...current,
        usuario_id: '',
        cliente_nome: '',
        cliente_email: '',
        cliente_telefone: ''
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      usuario_id: cliente.id,
      cliente_nome: cliente.nome || '',
      cliente_email: cliente.email || '',
      cliente_telefone: formatPhoneDigits(cliente.telefone || '')
    }));
  }

  async function save() {
    const valorTotal = moneyToNumber(form.valor_total);

    if (!form.cliente_nome.trim()) {
      return alert('Informe o nome do cliente.');
    }

    if (!form.descricao.trim()) {
      return alert('Informe a descrição do orçamento.');
    }

    if (valorTotal <= 0) {
      return alert('Informe um valor total maior que zero.');
    }

    const payload = {
      usuario_id: form.usuario_id || null,
      cliente_nome: form.cliente_nome.trim(),
      cliente_email: form.cliente_email.trim().toLowerCase(),
      cliente_telefone: formatPhoneDigits(form.cliente_telefone),
      descricao: form.descricao.trim(),
      valor_total: valorTotal,
      validade: form.validade || null,
      status: form.status,
      observacoes: form.observacoes.trim()
    };

    setSaving(true);

    try {
      if (editing) {
        await apiFetch('/admin/orcamentos/' + editing.id, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch('/admin/orcamentos', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      setModal(false);
      await load();
      alert('Orçamento salvo com sucesso.');
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar orçamento.');
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(
    orcamento: Orcamento,
    nextStatus: string
  ) {
    try {
      await apiFetch('/admin/orcamentos/' + orcamento.id, {
        method: 'PUT',
        body: JSON.stringify({
          status: nextStatus
        })
      });

      await load();
    } catch (error: any) {
      alert(error.message || 'Erro ao atualizar orçamento.');
    }
  }

  async function duplicate(orcamento: Orcamento) {
    if (
      !window.confirm(
        `Deseja duplicar o orçamento ${orcamento.numero_orcamento}?`
      )
    ) {
      return;
    }

    try {
      await apiFetch('/admin/orcamentos', {
        method: 'POST',
        body: JSON.stringify({
          usuario_id: orcamento.usuario_id || null,
          cliente_nome: orcamento.cliente_nome,
          cliente_email: orcamento.cliente_email || '',
          cliente_telefone: orcamento.cliente_telefone || '',
          descricao: orcamento.descricao,
          valor_total: moneyToNumber(orcamento.valor_total),
          validade: orcamento.validade || null,
          status: 'rascunho',
          observacoes: orcamento.observacoes || ''
        })
      });

      await load();
      alert('Orçamento duplicado com sucesso.');
    } catch (error: any) {
      alert(error.message || 'Erro ao duplicar orçamento.');
    }
  }

  async function remove(orcamento: Orcamento) {
    if (
      !window.confirm(
        `Deseja excluir o orçamento ${orcamento.numero_orcamento}?`
      )
    ) {
      return;
    }

    try {
      await apiFetch('/admin/orcamentos/' + orcamento.id, {
        method: 'DELETE'
      });

      await load();
    } catch (error: any) {
      alert(error.message || 'Erro ao excluir orçamento.');
    }
  }

  async function virarPedido(orcamento: Orcamento) {
    if (
      !window.confirm(
        'Transformar este orçamento em pedido?'
      )
    ) {
      return;
    }

    try {
      const pedido = await apiFetch<any>(
        '/admin/orcamentos/' + orcamento.id + '/virar-pedido',
        {
          method: 'POST'
        }
      );

      await load();

      alert(
        'Pedido criado com sucesso: ' +
          (pedido?.numero_pedido || '')
      );
    } catch (error: any) {
      alert(error.message || 'Erro ao transformar orçamento em pedido.');
    }
  }

  async function copyText(text: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error('Clipboard indisponível');
      }

      alert('Texto copiado.');
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.left = '-9999px';
      document.body.appendChild(area);
      area.focus();
      area.select();
      document.execCommand('copy');
      area.remove();
      alert('Texto copiado.');
    }
  }

  function sendWhatsApp(text: string, phone?: string) {
    const digits = String(phone || '').replace(/\D/g, '');
    const number = digits.startsWith('55') ? digits : `55${digits}`;

    const url = digits
      ? `https://wa.me/${number}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="fade-in w-full max-w-full overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-gold mb-2">
            Comercial
          </p>

          <h1 className="font-display text-2xl sm:text-3xl font-black text-primary flex items-center gap-2">
            <ClipboardList size={30} />
            Orçamentos
          </h1>

          <p className="text-gray-500 mt-1">
            Crie, acompanhe, compartilhe e transforme orçamentos em pedidos.
          </p>
        </div>

        <button
          type="button"
          onClick={openNew}
          className="btn btn-primary w-full sm:w-auto"
        >
          <Plus size={18} />
          Novo orçamento
        </button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-2 sm:gap-3 mb-4">
        <SummaryCard
          title="Orçamentos"
          value={summary.total}
          subtitle="No período"
          icon={ClipboardList}
          tone="primary"
        />

        <SummaryCard
          title="Valor orçado"
          value={formatMoney(summary.totalValue)}
          subtitle="Total do período"
          icon={BadgeDollarSign}
          tone="warning"
        />

        <SummaryCard
          title="Aprovados"
          value={summary.approved}
          subtitle="Confirmados"
          icon={CheckCircle2}
          tone="success"
        />

        <SummaryCard
          title="Pendentes"
          value={summary.pending}
          subtitle="Aguardando decisão"
          icon={AlertTriangle}
          tone={summary.pending > 0 ? 'danger' : 'success'}
        />

        <SummaryCard
          title="Viraram pedido"
          value={summary.converted}
          subtitle="Convertidos"
          icon={ShoppingCart}
          tone="purple"
        />
      </div>

      <div className="card p-3 sm:p-4 mb-4 space-y-3">
        <div className="grid lg:grid-cols-[1fr_190px_190px_auto] gap-3">
          <div className="relative">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              size={19}
            />

            <input
              className="input pl-11"
              placeholder="Buscar cliente, número, telefone ou descrição..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <input
            type="month"
            className="input"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />

          <select
            className="input"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as StatusFilter)
            }
          >
            <option value="todos">Todos os status</option>
            <option value="rascunho">Rascunhos</option>
            <option value="enviado">Enviados</option>
            <option value="aprovado">Aprovados</option>
            <option value="recusado">Recusados</option>
            <option value="vencido">Vencidos</option>
            <option value="convertido">Viraram pedido</option>
          </select>

          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setSearch('');
              setStatus('todos');
              setMonth(currentMonth());
            }}
          >
            <Filter size={17} />
            Limpar
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            ['todos', 'Todos'],
            ['rascunho', 'Rascunhos'],
            ['enviado', 'Enviados'],
            ['aprovado', 'Aprovados'],
            ['vencido', 'Vencidos'],
            ['convertido', 'Viraram pedido']
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              onClick={() => setStatus(value as StatusFilter)}
              className={`px-3 py-2 rounded-xl border text-xs font-black ${
                status === value
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card p-6">
          Carregando orçamentos...
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((orcamento) => {
            const effectiveStatus = getEffectiveStatus(orcamento);
            const validity = getValidityInfo(orcamento);
            const ValidityIcon = validity.icon;

            return (
              <article
                key={orcamento.id}
                onClick={() => openEdit(orcamento)}
                className={`card cursor-pointer overflow-hidden border-l-4 transition hover:ring-2 hover:ring-gold/40 ${
                  cardClasses[effectiveStatus] || cardClasses.rascunho
                }`}
              >
                <div className="p-3 sm:p-4">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black text-primary">
                          {orcamento.numero_orcamento}
                        </p>

                        <span
                          className={`px-2.5 py-1 rounded-full border text-[11px] font-black ${
                            statusClasses[effectiveStatus] ||
                            statusClasses.rascunho
                          }`}
                        >
                          {statusLabels[effectiveStatus] || effectiveStatus}
                        </span>

                        {orcamento.virou_pedido && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-purple-200 bg-purple-50 text-purple-700 text-[11px] font-black">
                            <ShoppingCart size={13} />
                            Virou pedido
                          </span>
                        )}

                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-black ${validity.tone}`}
                        >
                          <ValidityIcon size={13} />
                          {validity.label}
                        </span>
                      </div>

                      <h3 className="font-display font-black text-lg text-primary mt-2">
                        {orcamento.cliente_nome}
                      </h3>

                      <p className="text-sm text-gray-600 mt-1 line-clamp-3 whitespace-pre-line">
                        {orcamento.descricao}
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                        <div className="rounded-xl bg-white/85 border border-gray-100 p-2">
                          <p className="text-[10px] font-black text-gray-400 uppercase">
                            Valor
                          </p>
                          <p className="font-black text-primary">
                            {formatMoney(orcamento.valor_total || 0)}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white/85 border border-gray-100 p-2">
                          <p className="text-[10px] font-black text-gray-400 uppercase">
                            Criado em
                          </p>
                          <p className="font-black text-primary">
                            {formatDate(orcamento.created_at)}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white/85 border border-gray-100 p-2">
                          <p className="text-[10px] font-black text-gray-400 uppercase">
                            Validade
                          </p>
                          <p className="font-black text-primary">
                            {formatDate(orcamento.validade)}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white/85 border border-gray-100 p-2">
                          <p className="text-[10px] font-black text-gray-400 uppercase">
                            Contato
                          </p>
                          <p className="font-black text-primary truncate">
                            {orcamento.cliente_telefone ||
                              orcamento.cliente_email ||
                              'Não informado'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      className="space-y-2 lg:w-44"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          className="rounded-xl border border-blue-200 bg-blue-50 px-2 py-2 text-blue-700 font-black text-xs flex items-center justify-center gap-1"
                          onClick={() =>
                            setShare({
                              orcamento,
                              texto: buildShareMessage(orcamento)
                            })
                          }
                        >
                          <MessageCircle size={15} />
                          Enviar
                        </button>

                        <button
                          type="button"
                          className="rounded-xl border border-gray-200 bg-white px-2 py-2 text-gray-700 font-black text-xs flex items-center justify-center gap-1"
                          onClick={() =>
                            copyText(buildShareMessage(orcamento))
                          }
                        >
                          <Copy size={15} />
                          Copiar
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={orcamento.virou_pedido}
                          className="rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-2 text-emerald-700 font-black text-xs flex items-center justify-center gap-1 disabled:opacity-50"
                          onClick={() =>
                            updateStatus(orcamento, 'aprovado')
                          }
                        >
                          <CheckCircle2 size={15} />
                          Aprovar
                        </button>

                        <button
                          type="button"
                          disabled={orcamento.virou_pedido}
                          className="rounded-xl border border-purple-200 bg-purple-50 px-2 py-2 text-purple-700 font-black text-xs flex items-center justify-center gap-1 disabled:opacity-50"
                          onClick={() => virarPedido(orcamento)}
                        >
                          <ShoppingCart size={15} />
                          Pedido
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          className="rounded-xl border border-amber-200 bg-amber-50 px-2 py-2 text-amber-700 font-black text-xs flex items-center justify-center gap-1"
                          onClick={() => duplicate(orcamento)}
                        >
                          <Copy size={15} />
                          Duplicar
                        </button>

                        <button
                          type="button"
                          className="rounded-xl border border-red-200 bg-red-50 px-2 py-2 text-red-700 font-black text-xs flex items-center justify-center gap-1"
                          onClick={() => remove(orcamento)}
                        >
                          <Trash2 size={15} />
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {filtered.length === 0 && (
            <div className="card p-8 text-center text-gray-500">
              Nenhum orçamento encontrado neste período ou filtro.
            </div>
          )}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/70 flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white w-full max-w-3xl max-h-[94dvh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-gold">
                  {editing ? editing.numero_orcamento : 'Novo orçamento'}
                </p>

                <h2 className="text-xl sm:text-2xl font-black text-slate-950">
                  {editing ? 'Editar orçamento' : 'Cadastrar orçamento'}
                </h2>

                <p className="text-sm text-slate-500">
                  Preencha os dados comerciais e a validade da proposta.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModal(false)}
                className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              <label className="block">
                <span className="text-sm font-black text-slate-800">
                  Cliente cadastrado
                </span>

                <select
                  className="input mt-1"
                  value={form.usuario_id}
                  onChange={(event) => chooseClient(event.target.value)}
                >
                  <option value="">
                    Selecionar ou preencher manualmente
                  </option>

                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nome} -{' '}
                      {cliente.email ||
                        cliente.telefone ||
                        'sem contato'}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid md:grid-cols-3 gap-3">
                <label className="block">
                  <span className="text-sm font-black text-slate-800">
                    Nome do cliente *
                  </span>

                  <input
                    className="input mt-1"
                    value={form.cliente_nome}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        cliente_nome: event.target.value
                      })
                    }
                    placeholder="Nome do cliente"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-black text-slate-800">
                    Telefone
                  </span>

                  <input
                    className="input mt-1"
                    value={form.cliente_telefone}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        cliente_telefone: formatPhoneDigits(
                          event.target.value
                        )
                      })
                    }
                    placeholder="Somente números"
                    inputMode="numeric"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-black text-slate-800">
                    E-mail
                  </span>

                  <input
                    className="input mt-1"
                    type="email"
                    value={form.cliente_email}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        cliente_email: event.target.value
                      })
                    }
                    placeholder="E-mail do cliente"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-black text-slate-800">
                  Descrição do orçamento *
                </span>

                <textarea
                  className="input mt-1 min-h-36"
                  value={form.descricao}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      descricao: event.target.value
                    })
                  }
                  placeholder="Descreva produtos, quantidades, acabamentos, medidas e serviços."
                />
              </label>

              <div className="grid md:grid-cols-3 gap-3">
                <label className="block">
                  <span className="text-sm font-black text-slate-800">
                    Valor total *
                  </span>

                  <input
                    className="input mt-1"
                    value={form.valor_total}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        valor_total: event.target.value
                      })
                    }
                    placeholder="0,00"
                    inputMode="decimal"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-black text-slate-800">
                    Validade
                  </span>

                  <input
                    className="input mt-1"
                    type="date"
                    value={form.validade}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        validade: event.target.value
                      })
                    }
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-black text-slate-800">
                    Status
                  </span>

                  <select
                    className="input mt-1"
                    value={form.status}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        status: event.target.value
                      })
                    }
                  >
                    {Object.entries(statusLabels).map(
                      ([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </label>
              </div>

              <div className="rounded-2xl bg-primary text-white p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-white/60 uppercase font-black">
                      Valor informado
                    </p>
                    <p className="font-display text-xl font-black">
                      {formatMoney(moneyToNumber(form.valor_total))}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-white/60 uppercase font-black">
                      Validade
                    </p>
                    <p className="font-display text-lg font-black">
                      {form.validade
                        ? formatDate(form.validade)
                        : 'A combinar'}
                    </p>
                  </div>
                </div>
              </div>

              <label className="block">
                <span className="text-sm font-black text-slate-800">
                  Observações internas
                </span>

                <textarea
                  className="input mt-1 min-h-24"
                  value={form.observacoes}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      observacoes: event.target.value
                    })
                  }
                  placeholder="Observações internas para a equipe."
                />
              </label>
            </div>

            <div className="p-4 border-t border-slate-100 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setModal(false)}
                className="btn btn-outline"
                disabled={saving}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={save}
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Salvando...' : 'Salvar orçamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {share && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/70 flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white w-full max-w-3xl max-h-[94dvh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-gold">
                  Compartilhamento
                </p>

                <h2 className="text-xl sm:text-2xl font-black text-slate-950">
                  Enviar orçamento
                </h2>

                <p className="text-sm text-slate-500">
                  Revise o texto antes de copiar ou enviar.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShare(null)}
                className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              <textarea
                className="input min-h-[420px] font-mono text-sm leading-relaxed"
                value={share.texto}
                onChange={(event) =>
                  setShare({
                    ...share,
                    texto: event.target.value
                  })
                }
              />
            </div>

            <div className="p-4 border-t border-slate-100 grid sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => copyText(share.texto)}
                className="btn btn-outline"
              >
                <Copy size={17} />
                Copiar
              </button>

              <button
                type="button"
                onClick={() =>
                  sendWhatsApp(
                    share.texto,
                    share.orcamento.cliente_telefone
                  )
                }
                className="btn bg-emerald-500 text-white hover:bg-emerald-600"
              >
                <Send size={17} />
                WhatsApp
              </button>

              <button
                type="button"
                onClick={() => setShare(null)}
                className="btn btn-primary"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Orcamentos;