import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownUp,
  BadgeDollarSign,
  CheckCircle2,
  ClipboardList,
  Edit,
  FileText,
  History,
  KeyRound,
  MessageCircle,
  ReceiptText,
  Search,
  ShoppingBag,
  Trash2,
  UserPlus,
  Users,
  X
} from 'lucide-react';

import { apiFetch, formatMoney, formatPhoneDigits } from '../../lib/api';

type Cliente = {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  role?: string;
  total_gasto?: number;
  pedidos?: number;
  valor_em_aberto?: number;
  pedidos_abertos?: number;
  ultimo_pedido_em?: string | null;
  created_at?: string;
};

type Segmento = 'todos' | 'com_pedidos' | 'sem_pedidos' | 'em_aberto';
type Ordenacao = 'maior_valor' | 'mais_pedidos' | 'mais_recente' | 'nome';

const statusLabels: Record<string, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  em_producao: 'Em produção',
  pronto: 'Pronto',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado'
};

const statusClasses: Record<string, string> = {
  pendente: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmado: 'bg-sky-50 text-sky-700 border-sky-200',
  em_producao: 'bg-purple-50 text-purple-700 border-purple-200',
  pronto: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  enviado: 'bg-blue-50 text-blue-700 border-blue-200',
  entregue: 'bg-green-50 text-green-700 border-green-200',
  cancelado: 'bg-gray-100 text-gray-600 border-gray-200'
};

const paymentLabels: Record<string, string> = {
  pendente: 'Pagamento pendente',
  parcial: 'Pagamento parcial',
  confirmado: 'Pagamento confirmado',
  recusado: 'Pagamento recusado'
};

const budgetStatusLabels: Record<string, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
  vencido: 'Vencido'
};

function asNumber(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function onlyPhoneDigits(value: string) {
  return String(value || '').replace(/\D/g, '');
}

function whatsappNumber(value: string) {
  const digits = onlyPhoneDigits(value);

  if (!digits) return '';
  if (digits.startsWith('55')) return digits;

  return `55${digits}`;
}

function formatDate(value?: string | null) {
  if (!value) return 'Sem registro';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Sem registro';

  return date.toLocaleDateString('pt-BR');
}

function getRemaining(order: any) {
  if (order?.status === 'cancelado') return 0;
  if (order?.status_pagamento === 'confirmado') return 0;

  const stored = asNumber(order?.valor_restante);

  if (stored > 0) return stored;

  return Math.max(
    asNumber(order?.total) - asNumber(order?.valor_entrada),
    0
  );
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
  tone: 'primary' | 'success' | 'warning' | 'danger';
}) {
  const tones = {
    primary: 'bg-blue-50 border-blue-100 text-blue-700',
    success: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    warning: 'bg-amber-50 border-amber-100 text-amber-700',
    danger: 'bg-red-50 border-red-100 text-red-700'
  };

  return (
    <div className={`rounded-2xl border p-3 sm:p-4 ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs font-black uppercase tracking-wide opacity-70">
            {title}
          </p>
          <p className="font-display text-lg sm:text-xl font-black mt-1 leading-tight break-words">
            {value}
          </p>
          <p className="text-[11px] sm:text-xs opacity-75 mt-1 leading-tight">
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

export function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'novo' | 'editar' | 'senha' | null>(null);
  const [selecionado, setSelecionado] = useState<Cliente | null>(null);
  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    senha: ''
  });

  const [historicoModal, setHistoricoModal] = useState(false);
  const [historicoAba, setHistoricoAba] = useState<'pedidos' | 'orcamentos'>('pedidos');
  const [clientePedidos, setClientePedidos] = useState<any[]>([]);
  const [clienteOrcamentos, setClienteOrcamentos] = useState<any[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [busca, setBusca] = useState('');
  const [segmento, setSegmento] = useState<Segmento>('todos');
  const [ordenacao, setOrdenacao] = useState<Ordenacao>('maior_valor');

  async function carregar() {
    setLoading(true);

    try {
      const data = await apiFetch<Cliente[]>('/admin/clientes');
      setClientes(Array.isArray(data) ? data : []);
    } catch (error: any) {
      alert(error.message || 'Erro ao carregar clientes.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const resumo = useMemo(() => {
    const totalClientes = clientes.length;
    const clientesComPedidos = clientes.filter(
      (cliente) => asNumber(cliente.pedidos) > 0
    ).length;

    const totalComprado = clientes.reduce(
      (sum, cliente) => sum + asNumber(cliente.total_gasto),
      0
    );

    const emAberto = clientes.reduce(
      (sum, cliente) => sum + asNumber(cliente.valor_em_aberto),
      0
    );

    return {
      totalClientes,
      clientesComPedidos,
      totalComprado,
      emAberto
    };
  }, [clientes]);

  const clientesFiltrados = useMemo(() => {
    const query = busca.trim().toLowerCase();
    const phoneQuery = onlyPhoneDigits(busca);

    const filtered = clientes.filter((cliente) => {
      const text = [
        cliente.nome,
        cliente.email,
        cliente.telefone
      ].join(' ').toLowerCase();

      const phoneMatches =
        phoneQuery &&
        onlyPhoneDigits(cliente.telefone || '').includes(phoneQuery);

      if (query && !text.includes(query) && !phoneMatches) {
        return false;
      }

      if (segmento === 'com_pedidos' && asNumber(cliente.pedidos) <= 0) {
        return false;
      }

      if (segmento === 'sem_pedidos' && asNumber(cliente.pedidos) > 0) {
        return false;
      }

      if (segmento === 'em_aberto' && asNumber(cliente.valor_em_aberto) <= 0) {
        return false;
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      if (ordenacao === 'maior_valor') {
        return asNumber(b.total_gasto) - asNumber(a.total_gasto);
      }

      if (ordenacao === 'mais_pedidos') {
        return asNumber(b.pedidos) - asNumber(a.pedidos);
      }

      if (ordenacao === 'mais_recente') {
        return String(b.ultimo_pedido_em || b.created_at || '').localeCompare(
          String(a.ultimo_pedido_em || a.created_at || '')
        );
      }

      return String(a.nome || '').localeCompare(
        String(b.nome || ''),
        'pt-BR'
      );
    });
  }, [clientes, busca, segmento, ordenacao]);

  const historicoResumo = useMemo(() => {
    const pedidosValidos = clientePedidos.filter(
      (pedido) => pedido.status !== 'cancelado'
    );

    return {
      pedidos: pedidosValidos.length,
      totalComprado: pedidosValidos.reduce(
        (sum, pedido) => sum + asNumber(pedido.total),
        0
      ),
      valorAberto: pedidosValidos.reduce(
        (sum, pedido) => sum + getRemaining(pedido),
        0
      ),
      orcamentos: clienteOrcamentos.length
    };
  }, [clientePedidos, clienteOrcamentos]);

  function abrirNovo() {
    setSelecionado(null);
    setForm({
      nome: '',
      email: '',
      telefone: '',
      senha: ''
    });
    setModal('novo');
  }

  function abrirEditar(cliente: Cliente) {
    setSelecionado(cliente);
    setForm({
      nome: cliente.nome || '',
      email: cliente.email || '',
      telefone: formatPhoneDigits(cliente.telefone || ''),
      senha: ''
    });
    setModal('editar');
  }

  function abrirSenha(cliente: Cliente) {
    setSelecionado(cliente);
    setForm({
      nome: cliente.nome || '',
      email: cliente.email || '',
      telefone: formatPhoneDigits(cliente.telefone || ''),
      senha: ''
    });
    setModal('senha');
  }

  function abrirWhatsApp(cliente: Cliente) {
    const number = whatsappNumber(cliente.telefone || '');

    if (!number) {
      alert('Este cliente não possui telefone cadastrado.');
      return;
    }

    const message = `Olá, ${cliente.nome || 'cliente'}! Aqui é da Gráfica W Criações.`;

    window.open(
      `https://wa.me/${number}?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer'
    );
  }

  async function abrirHistorico(cliente: Cliente) {
    setSelecionado(cliente);
    setHistoricoModal(true);
    setHistoricoAba('pedidos');
    setLoadingHistorico(true);

    try {
      const data = await apiFetch<{
        cliente: Cliente;
        pedidos: any[];
        orcamentos: any[];
      }>('/admin/clientes/' + cliente.id + '/pedidos');

      setClientePedidos(
        Array.isArray(data.pedidos) ? data.pedidos : []
      );

      setClienteOrcamentos(
        Array.isArray(data.orcamentos) ? data.orcamentos : []
      );
    } catch (error: any) {
      setClientePedidos([]);
      setClienteOrcamentos([]);
      alert(error.message || 'Erro ao carregar histórico do cliente.');
    } finally {
      setLoadingHistorico(false);
    }
  }

  async function salvar() {
    if (modal !== 'senha') {
      if (!form.nome.trim()) {
        return alert('Informe o nome do cliente.');
      }

      if (!form.email.trim()) {
        return alert('Informe o e-mail do cliente.');
      }
    }

    if ((modal === 'novo' || modal === 'senha') && form.senha) {
      if (form.senha.length < 8) {
        return alert('A senha precisa ter pelo menos 8 caracteres.');
      }
    }

    setSalvando(true);

    try {
      if (modal === 'novo') {
        await apiFetch('/admin/clientes', {
          method: 'POST',
          body: JSON.stringify({
            nome: form.nome.trim(),
            email: form.email.trim().toLowerCase(),
            telefone: formatPhoneDigits(form.telefone),
            senha: form.senha || '12345678',
            role: 'user'
          })
        });
      }

      if (modal === 'editar' && selecionado) {
        await apiFetch('/admin/clientes/' + selecionado.id, {
          method: 'PUT',
          body: JSON.stringify({
            nome: form.nome.trim(),
            email: form.email.trim().toLowerCase(),
            telefone: formatPhoneDigits(form.telefone)
          })
        });
      }

      if (modal === 'senha' && selecionado) {
        if (!form.senha || form.senha.length < 8) {
          return alert('A nova senha precisa ter pelo menos 8 caracteres.');
        }

        await apiFetch(
          '/admin/clientes/' + selecionado.id + '/redefinir-senha',
          {
            method: 'PUT',
            body: JSON.stringify({
              senha: form.senha
            })
          }
        );
      }

      setModal(null);
      await carregar();
      alert('Cliente salvo com sucesso.');
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar cliente.');
    } finally {
      setSalvando(false);
    }
  }

  async function deletar(cliente: Cliente) {
    if (!confirm(`Deseja excluir o cliente ${cliente.nome}?`)) {
      return;
    }

    try {
      await apiFetch('/admin/clientes/' + cliente.id, {
        method: 'DELETE'
      });

      await carregar();
    } catch (error: any) {
      alert(error.message || 'Erro ao excluir cliente.');
    }
  }

  async function imprimirDocumento(pedido: any) {
    const win = window.open('', '_blank');

    if (!win) {
      alert(
        'O navegador bloqueou a abertura do documento. Permita pop-ups e tente novamente.'
      );
      return;
    }

    win.document.write(
      '<p style="font-family:Arial;padding:24px">Gerando documento...</p>'
    );

    try {
      const data = await apiFetch<any>(
        '/admin/pedidos/' + pedido.id + '/documento'
      );

      const p = data.pedido;
      const titulo =
        data.tipo === 'recibo'
          ? 'Recibo Digital'
          : 'Ordem de Serviço';

      const html = `
        <div style="font-family:Arial;padding:24px;max-width:760px;margin:auto;color:#0b1b3a">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:2px solid #e6aa21;padding-bottom:16px;margin-bottom:20px">
            <div>
              ${
                data.empresa?.logo
                  ? `<img src="${data.empresa.logo}" style="max-height:70px;max-width:180px;object-fit:contain"/>`
                  : ''
              }
            </div>
            <div style="text-align:right">
              <h1 style="margin:0">${titulo}</h1>
              <p style="margin:4px 0">${data.empresa?.nome || 'Gráfica W Criações'}</p>
            </div>
          </div>

          <p><b>Pedido:</b> ${p.numero_pedido}</p>
          <p><b>Cliente:</b> ${p.cliente_nome || selecionado?.nome || ''}</p>
          <p><b>Telefone:</b> ${p.cliente_telefone || selecionado?.telefone || '-'}</p>
          <p><b>Email:</b> ${p.cliente_email || selecionado?.email || '-'}</p>
          <p><b>Status:</b> ${statusLabels[p.status] || p.status}</p>
          <p><b>Status pagamento:</b> ${paymentLabels[p.status_pagamento] || p.status_pagamento}</p>
          <p>
            <b>Total:</b> ${formatMoney(p.total)} |
            <b>Pago:</b> ${formatMoney(p.valor_entrada || 0)} |
            <b>Resta:</b> ${formatMoney(p.valor_restante || 0)}
          </p>
          <p><b>Prazo:</b> ${
            p.prazo_entrega
              ? new Date(p.prazo_entrega).toLocaleDateString('pt-BR')
              : 'A combinar'
          }</p>
          <p><b>Observações:</b> ${p.observacoes || '-'}</p>
          <hr/>
          <p><b>WhatsApp:</b> ${data.empresa?.whatsapp || ''}</p>
          <p><b>Endereço:</b> ${data.empresa?.endereco || ''}</p>

          ${
            data.tipo === 'recibo' && data.empresa?.assinatura
              ? `<div style="margin-top:40px;text-align:center">
                  <img src="${data.empresa.assinatura}" style="max-height:90px"/>
                  <p>Assinatura digital</p>
                </div>`
              : ''
          }

          <p style="margin-top:30px;font-size:12px;color:#666">
            Emitido em ${new Date().toLocaleString('pt-BR')}
          </p>

          <script>window.print()</script>
        </div>
      `;

      win.document.open();
      win.document.write(html);
      win.document.close();
    } catch (error: any) {
      win.close();
      alert(error.message || 'Erro ao emitir documento.');
    }
  }

  async function virarPedido(orcamento: any) {
    if (!confirm('Transformar este orçamento em pedido?')) {
      return;
    }

    try {
      const pedido = await apiFetch<any>(
        '/admin/orcamentos/' + orcamento.id + '/virar-pedido',
        {
          method: 'POST'
        }
      );

      alert(
        'Pedido criado com sucesso: ' +
          (pedido?.numero_pedido || '')
      );

      if (selecionado) {
        await abrirHistorico(selecionado);
      }
    } catch (error: any) {
      alert(error.message || 'Erro ao transformar orçamento em pedido.');
    }
  }

  return (
    <div className="fade-in w-full max-w-full overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-gold mb-2">
            Relacionamento
          </p>

          <h1 className="font-display text-2xl sm:text-3xl font-black text-primary flex items-center gap-2">
            <Users size={30} />
            Clientes
          </h1>

          <p className="text-gray-500 mt-1">
            Consulte histórico, valores em aberto e entre em contato rapidamente.
          </p>
        </div>

        <button
          type="button"
          onClick={abrirNovo}
          className="btn btn-primary w-full sm:w-auto"
        >
          <UserPlus size={18} />
          Novo cliente
        </button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3 mb-4">
        <SummaryCard
          title="Clientes"
          value={resumo.totalClientes}
          subtitle="Cadastrados"
          icon={Users}
          tone="primary"
        />

        <SummaryCard
          title="Com pedidos"
          value={resumo.clientesComPedidos}
          subtitle="Já compraram"
          icon={ShoppingBag}
          tone="success"
        />

        <SummaryCard
          title="Total comprado"
          value={formatMoney(resumo.totalComprado)}
          subtitle="Sem pedidos cancelados"
          icon={BadgeDollarSign}
          tone="warning"
        />

        <SummaryCard
          title="Em aberto"
          value={formatMoney(resumo.emAberto)}
          subtitle="Saldo dos clientes"
          icon={AlertTriangle}
          tone={resumo.emAberto > 0 ? 'danger' : 'success'}
        />
      </div>

      <div className="card p-3 sm:p-4 mb-4">
        <div className="grid lg:grid-cols-[1fr_190px_220px] gap-3">
          <div className="relative">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              size={19}
            />

            <input
              className="input pl-11"
              placeholder="Buscar por nome, telefone ou e-mail..."
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
            />
          </div>

          <select
            className="input"
            value={segmento}
            onChange={(event) =>
              setSegmento(event.target.value as Segmento)
            }
          >
            <option value="todos">Todos os clientes</option>
            <option value="com_pedidos">Com pedidos</option>
            <option value="sem_pedidos">Sem pedidos</option>
            <option value="em_aberto">Com saldo em aberto</option>
          </select>

          <label className="relative">
            <ArrowDownUp
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              size={17}
            />

            <select
              className="input pl-10"
              value={ordenacao}
              onChange={(event) =>
                setOrdenacao(event.target.value as Ordenacao)
              }
            >
              <option value="maior_valor">Maior valor comprado</option>
              <option value="mais_pedidos">Mais pedidos</option>
              <option value="mais_recente">Mais recentes</option>
              <option value="nome">Nome A–Z</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {[
            ['todos', 'Todos'],
            ['com_pedidos', 'Com pedidos'],
            ['em_aberto', 'Em aberto'],
            ['sem_pedidos', 'Sem pedidos']
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              onClick={() => setSegmento(value as Segmento)}
              className={`px-3 py-2 rounded-xl border text-xs font-black ${
                segmento === value
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
          Carregando clientes...
        </div>
      ) : (
        <div className="grid gap-3">
          {clientesFiltrados.map((cliente) => {
            const emAberto = asNumber(cliente.valor_em_aberto);
            const temPedidos = asNumber(cliente.pedidos) > 0;

            return (
              <article
                key={cliente.id}
                onClick={() => abrirHistorico(cliente)}
                className={`card cursor-pointer overflow-hidden border-l-4 transition hover:ring-2 hover:ring-gold/40 ${
                  emAberto > 0
                    ? 'border-l-red-500 bg-red-50/30'
                    : temPedidos
                      ? 'border-l-emerald-500 bg-emerald-50/20'
                      : 'border-l-gray-300 bg-white'
                }`}
              >
                <div className="p-3 sm:p-4">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display font-black text-lg text-primary leading-tight">
                          {cliente.nome}
                        </h3>

                        {emAberto > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-red-200 bg-red-50 text-red-700 text-[11px] font-black">
                            <AlertTriangle size={13} />
                            Saldo em aberto
                          </span>
                        ) : temPedidos ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px] font-black">
                            <CheckCircle2 size={13} />
                            Cliente ativo
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-600 text-[11px] font-black">
                            Sem pedidos
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                        <span className="truncate">
                          {cliente.email || 'Sem e-mail'}
                        </span>

                        <span>
                          {cliente.telefone || 'Sem telefone'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                        <div className="rounded-xl bg-white/85 border border-gray-100 p-2">
                          <p className="text-[10px] font-black text-gray-400 uppercase">
                            Total comprado
                          </p>
                          <p className="font-black text-primary">
                            {formatMoney(cliente.total_gasto || 0)}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white/85 border border-gray-100 p-2">
                          <p className="text-[10px] font-black text-gray-400 uppercase">
                            Em aberto
                          </p>
                          <p
                            className={`font-black ${
                              emAberto > 0
                                ? 'text-red-700'
                                : 'text-emerald-700'
                            }`}
                          >
                            {formatMoney(emAberto)}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white/85 border border-gray-100 p-2">
                          <p className="text-[10px] font-black text-gray-400 uppercase">
                            Pedidos
                          </p>
                          <p className="font-black text-primary">
                            {cliente.pedidos || 0}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white/85 border border-gray-100 p-2">
                          <p className="text-[10px] font-black text-gray-400 uppercase">
                            Último pedido
                          </p>
                          <p className="font-black text-primary">
                            {formatDate(cliente.ultimo_pedido_em)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      className="grid grid-cols-5 lg:grid-cols-1 gap-1.5 lg:w-36"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => abrirHistorico(cliente)}
                        className="rounded-xl border border-blue-200 bg-blue-50 px-2 py-2 text-blue-700 font-black text-[11px] flex items-center justify-center gap-1"
                        title="Histórico"
                      >
                        <History size={15} />
                        <span className="hidden lg:inline">
                          Histórico
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => abrirWhatsApp(cliente)}
                        className="rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-2 text-emerald-700 font-black text-[11px] flex items-center justify-center gap-1"
                        title="WhatsApp"
                      >
                        <MessageCircle size={15} />
                        <span className="hidden lg:inline">
                          WhatsApp
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => abrirEditar(cliente)}
                        className="rounded-xl border border-gray-200 bg-white px-2 py-2 text-gray-700 font-black text-[11px] flex items-center justify-center gap-1"
                        title="Editar"
                      >
                        <Edit size={15} />
                        <span className="hidden lg:inline">
                          Editar
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => abrirSenha(cliente)}
                        className="rounded-xl border border-amber-200 bg-amber-50 px-2 py-2 text-amber-700 font-black text-[11px] flex items-center justify-center gap-1"
                        title="Senha"
                      >
                        <KeyRound size={15} />
                        <span className="hidden lg:inline">
                          Senha
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => deletar(cliente)}
                        className="rounded-xl border border-red-200 bg-red-50 px-2 py-2 text-red-700 font-black text-[11px] flex items-center justify-center gap-1"
                        title="Excluir"
                      >
                        <Trash2 size={15} />
                        <span className="hidden lg:inline">
                          Excluir
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {clientesFiltrados.length === 0 && (
            <div className="card p-8 text-center text-gray-500">
              Nenhum cliente encontrado com os filtros selecionados.
            </div>
          )}
        </div>
      )}

      {historicoModal && selecionado && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/70 flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white w-full max-w-5xl max-h-[94dvh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-gold">
                  Histórico do cliente
                </p>

                <h2 className="text-xl sm:text-2xl font-black text-slate-950 truncate">
                  {selecionado.nome}
                </h2>

                <p className="text-sm text-slate-500 truncate">
                  {selecionado.telefone || selecionado.email}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setHistoricoModal(false)}
                className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-3 sm:p-4 border-b border-gray-100">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <SummaryCard
                  title="Pedidos"
                  value={historicoResumo.pedidos}
                  subtitle="Não cancelados"
                  icon={ReceiptText}
                  tone="primary"
                />

                <SummaryCard
                  title="Comprado"
                  value={formatMoney(historicoResumo.totalComprado)}
                  subtitle="Total acumulado"
                  icon={BadgeDollarSign}
                  tone="success"
                />

                <SummaryCard
                  title="Em aberto"
                  value={formatMoney(historicoResumo.valorAberto)}
                  subtitle="Saldo a receber"
                  icon={AlertTriangle}
                  tone={
                    historicoResumo.valorAberto > 0
                      ? 'danger'
                      : 'success'
                  }
                />

                <SummaryCard
                  title="Orçamentos"
                  value={historicoResumo.orcamentos}
                  subtitle="Vinculados"
                  icon={ClipboardList}
                  tone="warning"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setHistoricoAba('pedidos')}
                  className={`rounded-xl border px-3 py-2 text-sm font-black ${
                    historicoAba === 'pedidos'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  Pedidos
                </button>

                <button
                  type="button"
                  onClick={() => setHistoricoAba('orcamentos')}
                  className={`rounded-xl border px-3 py-2 text-sm font-black ${
                    historicoAba === 'orcamentos'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  Orçamentos
                </button>

                <button
                  type="button"
                  onClick={() => abrirWhatsApp(selecionado)}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700 flex items-center justify-center gap-1"
                >
                  <MessageCircle size={16} />
                  WhatsApp
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {loadingHistorico ? (
                <p className="text-slate-500">
                  Carregando histórico...
                </p>
              ) : historicoAba === 'pedidos' ? (
                <section>
                  <h3 className="font-black text-lg text-slate-950 mb-3 flex items-center gap-2">
                    <ReceiptText size={20} />
                    Pedidos
                  </h3>

                  <div className="grid gap-3">
                    {clientePedidos.map((pedido) => {
                      const restante = getRemaining(pedido);
                      const pago =
                        pedido.status_pagamento === 'confirmado' ||
                        restante <= 0;

                      return (
                        <div
                          key={pedido.id}
                          className="rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:p-4 grid md:grid-cols-[1fr_auto] gap-3"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-black text-slate-950">
                                {pedido.numero_pedido}
                              </p>

                              <span
                                className={`px-2.5 py-1 rounded-full border text-[11px] font-black ${
                                  statusClasses[pedido.status] ||
                                  statusClasses.pendente
                                }`}
                              >
                                {statusLabels[pedido.status] || pedido.status}
                              </span>

                              <span
                                className={`px-2.5 py-1 rounded-full text-[11px] font-black ${
                                  pago
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-amber-50 text-amber-700'
                                }`}
                              >
                                {pago
                                  ? 'Pago'
                                  : paymentLabels[pedido.status_pagamento] ||
                                    'Pendente'}
                              </span>
                            </div>

                            <p className="text-slate-600 text-sm mt-2 whitespace-pre-line">
                              {pedido.observacoes || 'Sem descrição'}
                            </p>

                            <div className="flex flex-wrap gap-2 mt-3 text-xs">
                              <span className="px-2.5 py-1.5 rounded-xl bg-white border border-gray-100">
                                <b>Total:</b>{' '}
                                {formatMoney(pedido.total || 0)}
                              </span>

                              <span className="px-2.5 py-1.5 rounded-xl bg-white border border-gray-100">
                                <b>Pago:</b>{' '}
                                {formatMoney(pedido.valor_entrada || 0)}
                              </span>

                              <span
                                className={`px-2.5 py-1.5 rounded-xl border ${
                                  restante > 0
                                    ? 'bg-red-50 border-red-100 text-red-700'
                                    : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                }`}
                              >
                                <b>Resta:</b>{' '}
                                {formatMoney(restante)}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => imprimirDocumento(pedido)}
                            className="btn btn-primary"
                          >
                            <FileText size={16} />
                            Emitir
                          </button>
                        </div>
                      );
                    })}

                    {clientePedidos.length === 0 && (
                      <p className="text-slate-500">
                        Nenhum pedido para este cliente.
                      </p>
                    )}
                  </div>
                </section>
              ) : (
                <section>
                  <h3 className="font-black text-lg text-slate-950 mb-3 flex items-center gap-2">
                    <ClipboardList size={20} />
                    Orçamentos
                  </h3>

                  <div className="grid gap-3">
                    {clienteOrcamentos.map((orcamento) => (
                      <div
                        key={orcamento.id}
                        className="rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:p-4 grid md:grid-cols-[1fr_auto] gap-3"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-black text-slate-950">
                              {orcamento.numero_orcamento}
                            </p>

                            <span className="px-2.5 py-1 rounded-full bg-white border border-gray-200 text-[11px] font-black text-gray-600">
                              {budgetStatusLabels[orcamento.status] ||
                                orcamento.status}
                            </span>

                            {orcamento.virou_pedido && (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-black">
                                Virou pedido
                              </span>
                            )}
                          </div>

                          <p className="text-slate-600 text-sm mt-2 whitespace-pre-line">
                            {orcamento.descricao}
                          </p>

                          <p className="text-sm mt-2">
                            <b>Valor:</b>{' '}
                            {formatMoney(orcamento.valor_total || 0)}
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={orcamento.virou_pedido}
                          onClick={() => virarPedido(orcamento)}
                          className="btn btn-primary disabled:opacity-50"
                        >
                          Virar pedido
                        </button>
                      </div>
                    ))}

                    {clienteOrcamentos.length === 0 && (
                      <p className="text-slate-500">
                        Nenhum orçamento para este cliente.
                      </p>
                    )}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/70 flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white w-full max-w-xl max-h-[92dvh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-950">
                {modal === 'novo'
                  ? 'Novo cliente'
                  : modal === 'editar'
                    ? 'Editar cliente'
                    : 'Redefinir senha'}
              </h2>

              <button
                type="button"
                onClick={() => setModal(null)}
                className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {modal !== 'senha' && (
                <>
                  <label className="block">
                    <span className="text-sm font-black text-slate-800">
                      Nome *
                    </span>

                    <input
                      className="input mt-1"
                      value={form.nome}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          nome: event.target.value
                        })
                      }
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-black text-slate-800">
                      E-mail *
                    </span>

                    <input
                      className="input mt-1"
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          email: event.target.value
                        })
                      }
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-black text-slate-800">
                      Telefone
                    </span>

                    <input
                      className="input mt-1"
                      value={form.telefone}
                      inputMode="numeric"
                      placeholder="Somente números. Ex: 5588996240470"
                      onChange={(event) =>
                        setForm({
                          ...form,
                          telefone: formatPhoneDigits(
                            event.target.value
                          )
                        })
                      }
                    />
                  </label>
                </>
              )}

              {(modal === 'novo' || modal === 'senha') && (
                <label className="block">
                  <span className="text-sm font-black text-slate-800">
                    {modal === 'senha'
                      ? 'Nova senha *'
                      : 'Senha'}
                  </span>

                  <input
                    className="input mt-1"
                    type="password"
                    value={form.senha}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        senha: event.target.value
                      })
                    }
                    placeholder={
                      modal === 'novo'
                        ? 'Opcional: mínimo 8 caracteres'
                        : 'Mínimo 8 caracteres'
                    }
                  />
                </label>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="btn btn-outline"
                disabled={salvando}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={salvar}
                className="btn btn-primary"
                disabled={salvando}
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Clientes;