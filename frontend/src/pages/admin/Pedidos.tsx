import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Printer,
  Trash2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  UserRound,
  Mail,
  Phone,
  FileText,
  CalendarDays,
  Share2,
  Copy,
  MessageCircle,
  X,
  RefreshCw,
  BadgeDollarSign,
  ClipboardList,
  PackageCheck,
  Filter
} from 'lucide-react';
import { apiFetch, confirmAction, formatMoney, formatPhoneDigits } from '../../lib/api';
import { BottomSheet } from '../../components/BottomSheet';

const statusLabels: Record<string, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  em_producao: 'Em produção',
  pronto: 'Pronto',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado'
};

const paymentLabels: Record<string, string> = {
  pendente: 'Pagamento pendente',
  parcial: 'Pagamento parcial',
  confirmado: 'Pagamento confirmado',
  recusado: 'Pagamento recusado'
};

const statusClasses: Record<string, string> = {
  pendente: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmado: 'bg-blue-50 text-blue-700 border-blue-200',
  em_producao: 'bg-purple-50 text-purple-700 border-purple-200',
  pronto: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  enviado: 'bg-sky-50 text-sky-700 border-sky-200',
  entregue: 'bg-green-50 text-green-700 border-green-200',
  cancelado: 'bg-gray-100 text-gray-600 border-gray-200'
};

const paymentClasses: Record<string, string> = {
  pendente: 'bg-red-50 text-red-700 border-red-200',
  parcial: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  recusado: 'bg-red-100 text-red-800 border-red-200'
};

type PedidoForm = {
  usuario_id: string;
  cliente_nome: string;
  cliente_email: string;
  cliente_telefone: string;
  descricao: string;
  total: string;
  valor_entrada: string;
  valor_restante: number;
  status: string;
  status_pagamento: string;
  prazo_entrega: string;
};

function moneyToNumber(value: any) {
  if (typeof value === 'number') return value;

  const normalized = String(value || '0')
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  return Number(normalized) || 0;
}

function dateOnly(value: any) {
  return value ? String(value).slice(0, 10) : '';
}

function formatDate(value: any) {
  const clean = dateOnly(value);

  if (!clean) return 'A combinar';

  try {
    return new Date(clean + 'T12:00:00').toLocaleDateString('pt-BR');
  } catch {
    return 'A combinar';
  }
}

function daysUntilDeadline(order: any) {
  if (!order.prazo_entrega) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadline = new Date(dateOnly(order.prazo_entrega) + 'T00:00:00');

  return Math.ceil((deadline.getTime() - today.getTime()) / 86400000);
}

function prazoStatus(order: any) {
  if (order.status === 'pronto') {
    return {
      label: 'Pronto',
      shortLabel: 'Pronto',
      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      border: 'border-l-emerald-500',
      icon: CheckCircle2,
      priority: 20
    };
  }

  if (order.status === 'entregue') {
    return {
      label: 'Entregue',
      shortLabel: 'Entregue',
      cls: 'bg-green-50 text-green-700 border-green-200',
      border: 'border-l-green-500',
      icon: CheckCircle2,
      priority: 90
    };
  }

  if (order.status === 'cancelado') {
    return {
      label: 'Cancelado',
      shortLabel: 'Cancelado',
      cls: 'bg-gray-100 text-gray-600 border-gray-200',
      border: 'border-l-gray-300',
      icon: Clock,
      priority: 99
    };
  }

  if (!order.prazo_entrega) {
    return {
      label: 'Sem prazo',
      shortLabel: 'Sem prazo',
      cls: 'bg-gray-100 text-gray-600 border-gray-200',
      border: 'border-l-gray-300',
      icon: Clock,
      priority: 6
    };
  }

  const diff = daysUntilDeadline(order);

  if (diff !== null && diff < 0) {
    return {
      label: 'Atrasado',
      shortLabel: `${Math.abs(diff)} dia(s) atrasado`,
      cls: 'bg-red-50 text-red-700 border-red-200',
      border: 'border-l-red-500',
      icon: AlertTriangle,
      priority: 1
    };
  }

  if (diff === 0) {
    return {
      label: 'Hoje',
      shortLabel: 'Entrega hoje',
      cls: 'bg-orange-50 text-orange-700 border-orange-200',
      border: 'border-l-orange-500',
      icon: AlertTriangle,
      priority: 2
    };
  }

  if (diff !== null && diff <= 2) {
    return {
      label: 'Atenção',
      shortLabel: `Faltam ${diff} dia(s)`,
      cls: 'bg-amber-50 text-amber-700 border-amber-200',
      border: 'border-l-amber-500',
      icon: AlertTriangle,
      priority: 3
    };
  }

  return {
    label: 'No prazo',
    shortLabel: `Faltam ${diff} dia(s)`,
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    border: 'border-l-emerald-500',
    icon: CheckCircle2,
    priority: 5
  };
}

function orderPriority(order: any) {
  if (order.status === 'cancelado') return 99;
  if (order.status === 'entregue') return 90;
  if (order.status === 'pronto') return 20;

  const prazo = prazoStatus(order);

  if (prazo.priority <= 3) return prazo.priority;
  if (order.status === 'pendente') return 4;
  if (order.status === 'confirmado') return 5;
  if (order.status === 'em_producao') return 6;

  return prazo.priority;
}

function getOrderDescription(order: any) {
  return String(order.observacoes || order.descricao || 'Pedido sem descrição').trim();
}

function getOrderRemaining(order: any) {
  return moneyToNumber(
    order.valor_restante !== undefined && order.valor_restante !== null
      ? order.valor_restante
      : Math.max(moneyToNumber(order.total) - moneyToNumber(order.valor_entrada), 0)
  );
}

function buildInitialPedidoForm(): PedidoForm {
  return {
    usuario_id: '',
    cliente_nome: '',
    cliente_email: '',
    cliente_telefone: '',
    descricao: '',
    total: '',
    valor_entrada: '',
    valor_restante: 0,
    status: 'pendente',
    status_pagamento: 'pendente',
    prazo_entrega: ''
  };
}

function getCardTone(order: any) {
  const prazo = prazoStatus(order);

  if (prazo.label === 'Atrasado') {
    return 'bg-red-50/70 border-red-100';
  }

  if (order.status === 'pronto') {
    return 'bg-emerald-50/70 border-emerald-100';
  }

  if (order.status === 'entregue') {
    return 'bg-green-50/70 border-green-100';
  }

  if (order.status === 'cancelado') {
    return 'bg-gray-50 border-gray-200';
  }

  if (order.status === 'em_producao') {
    return 'bg-purple-50/50 border-purple-100';
  }

  if (order.status === 'pendente') {
    return 'bg-amber-50/60 border-amber-100';
  }

  if (order.status === 'confirmado') {
    return 'bg-sky-50/50 border-sky-100';
  }

  if (prazo.label === 'Hoje' || prazo.label === 'Atenção') {
    return 'bg-orange-50/50 border-orange-100';
  }

  return 'bg-white border-gray-100';
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
  tone?: 'default' | 'danger' | 'warning' | 'success' | 'money';
}) {
  const tones = {
    default: 'bg-white border-gray-100 text-primary',
    danger: 'bg-red-50 border-red-100 text-red-700',
    warning: 'bg-amber-50 border-amber-100 text-amber-700',
    success: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    money: 'bg-blue-50 border-blue-100 text-blue-700'
  };

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide opacity-70">{title}</p>
          <p className="font-display text-2xl font-bold mt-1">{value}</p>
          <p className="text-xs opacity-75 mt-1">{subtitle}</p>
        </div>

        <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center shrink-0">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export function Pedidos() {
  const [orders, setOrders] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [prazoFilter, setPrazoFilter] = useState('todos');
  const [quickFilter, setQuickFilter] = useState('todos');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [newOrder, setNewOrder] = useState<PedidoForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareOrderData, setShareOrderData] = useState<any>(null);
  const [shareText, setShareText] = useState('');

  const load = async () => {
    setLoading(true);

    try {
      const [pedidos, clientesData] = await Promise.all([
        apiFetch<any[]>('/pedidos'),
        apiFetch<any[]>('/admin/clientes').catch(() => [])
      ]);

      setOrders(Array.isArray(pedidos) ? pedidos : []);
      setClientes(Array.isArray(clientesData) ? clientesData : []);
    } catch (err: any) {
      alert(err.message || 'Erro ao carregar pedidos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  async function openOrder(order: any) {
    setSelectedOrder({
      ...order,
      total: Number(order.total || 0),
      valor_entrada: Number(order.valor_entrada || 0),
      valor_restante: getOrderRemaining(order),
      prazo_entrega: dateOnly(order.prazo_entrega)
    });

    try {
      const data = await apiFetch<any[]>('/admin/pedidos/' + order.id + '/historico');
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      setHistory([]);
    }
  }

  const summary = useMemo(() => {
    const ativos = orders.filter((o) => !['cancelado', 'entregue'].includes(o.status));
    const atrasados = orders.filter((o) => prazoStatus(o).label === 'Atrasado');
    const hoje = orders.filter((o) => prazoStatus(o).label === 'Hoje');
    const producao = orders.filter((o) => o.status === 'em_producao');
    const prontos = orders.filter((o) => o.status === 'pronto');
    const pendentes = orders.filter((o) => o.status === 'pendente');
    const aReceber = orders.reduce((sum, o) => sum + getOrderRemaining(o), 0);

    return {
      total: orders.length,
      ativos: ativos.length,
      atrasados: atrasados.length,
      hoje: hoje.length,
      producao: producao.length,
      prontos: prontos.length,
      pendentes: pendentes.length,
      aReceber
    };
  }, [orders]);

  const filtered = useMemo(() => {
    return [...orders]
      .filter((o) => {
        const text = [
          o.numero_pedido,
          o.cliente_nome,
          o.cliente_email,
          o.cliente_telefone,
          o.observacoes,
          o.descricao
        ]
          .join(' ')
          .toLowerCase();

        const matchesSearch = text.includes(search.toLowerCase().trim());
        const matchesStatus = statusFilter === 'todos' || o.status === statusFilter;

        const prazo = prazoStatus(o);
        const diff = daysUntilDeadline(o);

        const matchesPrazo =
          prazoFilter === 'todos' ||
          prazo.label === prazoFilter ||
          (prazoFilter === 'Hoje' && diff === 0) ||
          (prazoFilter === 'Proximos' && diff !== null && diff >= 0 && diff <= 2);

        const matchesQuick =
          quickFilter === 'todos' ||
          (quickFilter === 'atrasados' && prazo.label === 'Atrasado') ||
          (quickFilter === 'hoje' && diff === 0) ||
          (quickFilter === 'proximos' && diff !== null && diff >= 0 && diff <= 2) ||
          (quickFilter === 'pendentes' && o.status === 'pendente') ||
          (quickFilter === 'producao' && o.status === 'em_producao') ||
          (quickFilter === 'prontos' && o.status === 'pronto') ||
          (quickFilter === 'pagamento' && o.status_pagamento !== 'confirmado');

        return matchesSearch && matchesStatus && matchesPrazo && matchesQuick;
      })
      .sort((a, b) => {
        const priority = orderPriority(a) - orderPriority(b);
        if (priority !== 0) return priority;

        const aPrazo = dateOnly(a.prazo_entrega) || '9999-12-31';
        const bPrazo = dateOnly(b.prazo_entrega) || '9999-12-31';

        if (aPrazo !== bPrazo) return aPrazo.localeCompare(bPrazo);

        return String(b.created_at || '').localeCompare(String(a.created_at || ''));
      });
  }, [orders, search, statusFilter, prazoFilter, quickFilter]);

  function clearFilters() {
    setSearch('');
    setStatusFilter('todos');
    setPrazoFilter('todos');
    setQuickFilter('todos');
  }

  function setNewClient(id: string) {
    if (!newOrder) return;
    const c = clientes.find((x) => x.id === id);

    if (!c) {
      setNewOrder({ ...newOrder, usuario_id: '', cliente_nome: '', cliente_email: '', cliente_telefone: '' });
      return;
    }

    setNewOrder({
      ...newOrder,
      usuario_id: c.id,
      cliente_nome: c.nome || '',
      cliente_email: c.email || '',
      cliente_telefone: c.telefone || ''
    });
  }

  function updateNewOrderMoney(field: 'total' | 'valor_entrada', value: string) {
    if (!newOrder) return;

    const next = { ...newOrder, [field]: value };
    const total = moneyToNumber(field === 'total' ? value : newOrder.total);
    const entrada = moneyToNumber(field === 'valor_entrada' ? value : newOrder.valor_entrada);
    next.valor_restante = Math.max(total - entrada, 0);

    if (total > 0 && next.valor_restante <= 0) next.status_pagamento = 'confirmado';
    else if (entrada > 0) next.status_pagamento = 'parcial';
    else next.status_pagamento = 'pendente';

    setNewOrder(next);
  }

  const createOrder = async () => {
    if (!newOrder) return;

    if (!newOrder.cliente_nome.trim()) return alert('Informe o nome do cliente.');
    if (!newOrder.cliente_telefone.trim() && !newOrder.cliente_email.trim()) return alert('Informe telefone ou email do cliente.');
    if (!newOrder.descricao.trim()) return alert('Informe a descrição do pedido.');

    const total = moneyToNumber(newOrder.total);
    const entrada = moneyToNumber(newOrder.valor_entrada);
    const restante = Math.max(total - entrada, 0);

    if (!confirmAction('Confirmar criação deste pedido?')) return;

    try {
      const created = await apiFetch<any>('/admin/pedidos/manual', {
        method: 'POST',
        body: JSON.stringify({
          usuario_id: newOrder.usuario_id || null,
          cliente_nome: newOrder.cliente_nome,
          cliente_email: newOrder.cliente_email || '',
          cliente_telefone: newOrder.cliente_telefone || '',
          descricao: newOrder.descricao,
          total,
          valor_entrada: entrada,
          valor_restante: restante,
          status: newOrder.status,
          status_pagamento: restante <= 0 ? 'confirmado' : entrada > 0 ? 'parcial' : newOrder.status_pagamento,
          prazo_entrega: newOrder.prazo_entrega || null,
          endereco_entrega: 'A combinar'
        })
      });

      setNewOrder(null);
      await load();
      if (created?.id) await openOrder(created);
      alert('Pedido salvo com sucesso. Use o botão Compartilhar pedido para enviar o resumo ao cliente.');
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar pedido.');
    }
  };

  const saveStatus = async () => {
    if (!selectedOrder) return;
    if (!confirmAction('Confirmar alteração deste pedido?')) return;

    const total = moneyToNumber(selectedOrder.total);
    const entrada = moneyToNumber(selectedOrder.valor_entrada);
    const restante = Math.max(total - entrada, 0);

    try {
      await apiFetch('/pedidos/' + selectedOrder.id, {
        method: 'PUT',
        body: JSON.stringify({
          status: selectedOrder.status,
          status_pagamento: restante <= 0 ? 'confirmado' : entrada > 0 ? 'parcial' : selectedOrder.status_pagamento,
          observacoes: selectedOrder.observacoes || '',
          total,
          valor_entrada: entrada,
          valor_restante: restante,
          prazo_entrega: selectedOrder.prazo_entrega || null,
          cliente_nome: selectedOrder.cliente_nome || '',
          cliente_email: selectedOrder.cliente_email || '',
          cliente_telefone: selectedOrder.cliente_telefone || ''
        })
      });

      setSelectedOrder(null);
      setHistory([]);
      await load();
      alert('Pedido atualizado com sucesso.');
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar pedido.');
    }
  };

  async function deleteOrder(order: any) {
    if (!confirmAction('Deseja excluir este pedido? Essa ação não pode ser desfeita.')) return;

    try {
      await apiFetch('/pedidos/' + order.id, { method: 'DELETE' });
      if (selectedOrder?.id === order.id) setSelectedOrder(null);
      await load();
      alert('Pedido excluído.');
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir pedido.');
    }
  }

  async function updateOrderQuick(order: any, changes: { status?: string; status_pagamento?: string }, successMessage: string) {
    const total = moneyToNumber(order.total);
    const entradaAtual = moneyToNumber(order.valor_entrada);
    let valorEntrada = entradaAtual;
    let valorRestante = getOrderRemaining(order);
    const nextPaymentStatus = changes.status_pagamento || order.status_pagamento || 'pendente';

    if (nextPaymentStatus === 'confirmado') {
      valorEntrada = total;
      valorRestante = 0;
    }

    try {
      await apiFetch('/pedidos/' + order.id, {
        method: 'PUT',
        body: JSON.stringify({
          status: changes.status || order.status,
          status_pagamento: nextPaymentStatus,
          observacoes: order.observacoes || '',
          total,
          valor_entrada: valorEntrada,
          valor_restante: valorRestante,
          prazo_entrega: dateOnly(order.prazo_entrega) || null,
          cliente_nome: order.cliente_nome || '',
          cliente_email: order.cliente_email || '',
          cliente_telefone: order.cliente_telefone || ''
        })
      });

      await load();
      alert(successMessage);
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar pedido.');
    }
  }

  function buildShareMessage(order: any) {
    const numero = order.numero_pedido || order.numero || order.id;
    const prazo = order.prazo_entrega ? formatDate(order.prazo_entrega) : 'A combinar';
    const link = window.location.origin + '/acompanhar?pedido=' + encodeURIComponent(numero);
    const descricao = getOrderDescription(order);

    return [
      `*Pedido número:* ${numero}`,
      '',
      `*Cliente:* ${order.cliente_nome || 'Cliente'}`,
      '',
      `*Descrição do pedido:*`,
      descricao,
      '',
      `*Forma de pagamento:*`,
      '50% Pedido e 50% Entrega',
      '',
      `*Chave Pix:*`,
      'wcriacoesgrafica@gmail.com',
      '',
      `*Prazo de entrega:* ${prazo}`,
      '',
      'Após a confirmação do pedido, seguiremos com a criação dos layouts e enviaremos para aprovação antes de iniciar a produção dos materiais.',
      '',
      'Você pode acompanhar o andamento do seu pedido pelo link abaixo:',
      link,
      '',
      `*Código do pedido:* ${numero}`
    ].join('\n');
  }

  function shareOrder(order: any) {
    setSelectedOrder(null);
    setShareOrderData(order);
    setShareText(buildShareMessage(order));
  }

  async function copyShareText() {
    try {
      await navigator.clipboard.writeText(shareText);
      alert('Texto copiado para a área de transferência.');
    } catch {
      const area = document.createElement('textarea');
      area.value = shareText;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
      alert('Texto copiado para a área de transferência.');
    }
  }

  function sendShareWhatsApp() {
    const phone = String(shareOrderData?.cliente_telefone || '').replace(/\D/g, '');
    const url = phone
      ? 'https://wa.me/55' + phone.replace(/^55/, '') + '?text=' + encodeURIComponent(shareText)
      : 'https://wa.me/?text=' + encodeURIComponent(shareText);

    window.open(url, '_blank');
  }

  const printDocument = async (order: any) => {
    const win = window.open('', '_blank');

    if (!win) {
      alert('O navegador bloqueou a abertura do documento. Permita pop-ups para este site e tente novamente.');
      return;
    }

    win.document.write(`
      <html>
        <head>
          <title>Carregando documento...</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body style="font-family:Arial;padding:24px;color:#0b1b3a">
          <p>Carregando documento...</p>
        </body>
      </html>
    `);
    win.document.close();

    try {
      const data = await apiFetch<any>('/admin/pedidos/' + order.id + '/documento');
      const pedido = data.pedido;
      const tipoTitulo = data.tipo === 'recibo' ? 'Recibo Digital' : 'Ordem de Serviço';
      const html = `
        <html>
          <head>
            <title>${tipoTitulo} - ${pedido.numero_pedido || 'Pedido'}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
          </head>
          <body>
            <div style="font-family:Arial;padding:24px;max-width:760px;margin:auto;color:#0b1b3a">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:2px solid #e6aa21;padding-bottom:16px;margin-bottom:20px">
                <div>${data.empresa?.logo ? `<img src="${data.empresa.logo}" style="max-height:70px;max-width:180px;object-fit:contain"/>` : ''}</div>
                <div style="text-align:right"><h1 style="margin:0">${tipoTitulo}</h1><p style="margin:4px 0">${data.empresa?.nome || 'Gráfica W Criações'}</p></div>
              </div>
              <p><b>Pedido:</b> ${pedido.numero_pedido}</p>
              <p><b>Cliente:</b> ${pedido.cliente_nome || pedido.cliente_email || ''}</p>
              <p><b>Telefone:</b> ${pedido.cliente_telefone || '-'}</p>
              <p><b>Email:</b> ${pedido.cliente_email || '-'}</p>
              <p><b>Status:</b> ${statusLabels[pedido.status] || pedido.status}</p>
              <p><b>Status pagamento:</b> ${paymentLabels[pedido.status_pagamento] || pedido.status_pagamento}</p>
              <p><b>Total:</b> ${formatMoney(pedido.total)} | <b>Pago:</b> ${formatMoney(pedido.valor_entrada || 0)} | <b>Resta:</b> ${formatMoney(pedido.valor_restante || 0)}</p>
              <p><b>Prazo de entrega:</b> ${pedido.prazo_entrega ? formatDate(pedido.prazo_entrega) : 'A combinar'}</p>
              <p><b>Observações:</b></p>
              <div style="white-space:pre-line;border:1px solid #eee;border-radius:12px;padding:12px;background:#fafafa">${pedido.observacoes || '-'}</div>
              <hr style="margin:24px 0"/>
              <p><b>WhatsApp:</b> ${data.empresa?.whatsapp || ''}</p>
              <p><b>Endereço:</b> ${data.empresa?.endereco || ''}</p>
              ${data.tipo === 'recibo' && data.empresa?.assinatura ? `<div style="margin-top:40px;text-align:center"><img src="${data.empresa.assinatura}" style="max-height:90px"/><p>Assinatura digital</p></div>` : ''}
              <p style="margin-top:30px;font-size:12px;color:#666">Emitido em ${new Date().toLocaleString('pt-BR')}</p>
              <div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap">
                <button onclick="window.print()" style="padding:12px 18px;border:0;border-radius:10px;background:#0b1b3a;color:#fff;font-weight:bold">Imprimir / Salvar PDF</button>
                <button onclick="window.close()" style="padding:12px 18px;border:1px solid #ddd;border-radius:10px;background:#fff;color:#0b1b3a;font-weight:bold">Fechar</button>
              </div>
            </div>
          </body>
        </html>`;

      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();

      setTimeout(() => {
        try {
          win.print();
        } catch {
          // Em alguns celulares o navegador bloqueia impressão automática.
        }
      }, 500);
    } catch (err: any) {
      win.document.open();
      win.document.write(`
        <html>
          <head>
            <title>Erro ao emitir documento</title>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
          </head>
          <body style="font-family:Arial;padding:24px;color:#0b1b3a">
            <h2>Erro ao emitir documento</h2>
            <p>${err.message || 'Erro ao emitir documento.'}</p>
            <button onclick="window.close()" style="padding:12px 18px;border:0;border-radius:10px;background:#0b1b3a;color:#fff;font-weight:bold">Fechar</button>
          </body>
        </html>
      `);
      win.document.close();
    }
  };

  const quickButtons = [
    { key: 'todos', label: 'Todos' },
    { key: 'atrasados', label: `Atrasados ${summary.atrasados}` },
    { key: 'hoje', label: `Hoje ${summary.hoje}` },
    { key: 'proximos', label: 'Próx. 2 dias' },
    { key: 'pendentes', label: `Pendentes ${summary.pendentes}` },
    { key: 'producao', label: `Produção ${summary.producao}` },
    { key: 'prontos', label: `Prontos ${summary.prontos}` },
    { key: 'pagamento', label: 'Pgto pendente' }
  ];

  return (
    <div className="fade-in w-full max-w-full overflow-hidden px-1 sm:px-0">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold mb-2">
            Painel administrativo
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary">
            Gerenciador de Pedidos
          </h1>
          <p className="text-gray-500 mt-1">
            Pedidos urgentes aparecem primeiro. Use os filtros rápidos para organizar a produção.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
          <button className="btn btn-outline w-full sm:w-auto" onClick={load} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>

          <button className="btn btn-primary w-full sm:w-auto" onClick={() => setNewOrder(buildInitialPedidoForm())}>
            <Plus size={18} />
            Pedido Manual
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
        <SummaryCard
          title="Pedidos ativos"
          value={summary.ativos}
          subtitle={`${summary.total} pedidos no total`}
          icon={ClipboardList}
        />

        <SummaryCard
          title="Atrasados"
          value={summary.atrasados}
          subtitle="Precisam de atenção"
          icon={AlertTriangle}
          tone={summary.atrasados > 0 ? 'danger' : 'success'}
        />

        <SummaryCard
          title="Em produção"
          value={summary.producao}
          subtitle={`${summary.prontos} pronto(s)`}
          icon={PackageCheck}
          tone="warning"
        />

        <SummaryCard
          title="A receber"
          value={formatMoney(summary.aReceber)}
          subtitle="Saldo restante dos pedidos"
          icon={BadgeDollarSign}
          tone="money"
        />
      </div>

      <div className="card p-4 mb-4 space-y-4">
        <div className="grid lg:grid-cols-[1fr_220px_220px_auto] gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              className="input pl-11"
              placeholder="Buscar por pedido, cliente, telefone, email ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="todos">Todos os status</option>
            {Object.entries(statusLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <select className="input" value={prazoFilter} onChange={(e) => setPrazoFilter(e.target.value)}>
            <option value="todos">Todos os prazos</option>
            <option value="Atrasado">Atrasados</option>
            <option value="Hoje">Entrega hoje</option>
            <option value="Proximos">Próximos 2 dias</option>
            <option value="Atenção">Atenção</option>
            <option value="No prazo">No prazo</option>
            <option value="Sem prazo">Sem prazo</option>
            <option value="Pronto">Pronto</option>
          </select>

          <button type="button" className="btn btn-outline" onClick={clearFilters}>
            <Filter size={17} />
            Limpar
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {quickButtons.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setQuickFilter(item.key)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold border transition ${
                quickFilter === item.key
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-primary border-gray-200 hover:border-gold'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          Exibindo <b className="text-primary">{filtered.length}</b> pedido(s), ordenados por urgência.
        </p>
      </div>

      {loading && <div className="card p-4 mb-4">Carregando pedidos...</div>}

      {!loading && filtered.length === 0 && (
        <div className="card p-8 text-center">
          <p className="font-bold text-primary">Nenhum pedido encontrado.</p>
          <p className="text-gray-500 mt-1">Tente limpar os filtros ou buscar por outro cliente.</p>
        </div>
      )}

      <div className="grid gap-2">
        {filtered.map((o) => {
          const pz = prazoStatus(o);
          const Icon = pz.icon;
          const remaining = getOrderRemaining(o);
          const paymentClass = paymentClasses[o.status_pagamento] || 'bg-gray-100 text-gray-600 border-gray-200';
          const statusClass = statusClasses[o.status] || 'bg-gray-100 text-gray-600 border-gray-200';
          const cardTone = getCardTone(o);

          return (
            <div
              key={o.id}
              role="button"
              tabIndex={0}
              onClick={() => openOrder(o)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') openOrder(o);
              }}
              className={`card overflow-hidden border-l-4 ${pz.border} ${cardTone} hover:ring-2 hover:ring-gold/40 transition cursor-pointer`}
            >
              <div className="p-3 sm:p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold ${statusClass}`}>
                      {statusLabels[o.status] || o.status || 'Sem status'}
                    </span>

                    {o.status !== 'pronto' && o.status !== 'entregue' && o.status !== 'cancelado' && (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-bold ${pz.cls}`}>
                        <Icon size={13} />
                        {pz.shortLabel}
                      </span>
                    )}

                    <span className="px-2.5 py-1 rounded-full border border-gray-200 bg-white/80 text-gray-600 text-[11px] font-bold">
                      Data: {formatDate(o.created_at)}
                    </span>

                    <span className="px-2.5 py-1 rounded-full border border-gray-200 bg-white/80 text-gray-600 text-[11px] font-bold">
                      Prazo: {formatDate(o.prazo_entrega)}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-display font-bold text-base sm:text-lg text-primary leading-tight">
                      {o.cliente_nome || 'Cliente não informado'}
                    </h3>
                  </div>

                  <div className="rounded-2xl bg-white/75 border border-white/80 p-3">
                    <p className="text-sm text-primary whitespace-pre-line leading-relaxed font-semibold">
                      {getOrderDescription(o)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[12px] sm:text-sm">
                    <span className="px-2.5 py-1.5 rounded-xl bg-white/80 border border-gray-100 text-gray-700">
                      <b className="text-primary">Valor:</b> {formatMoney(o.total)}
                    </span>

                    <span className="px-2.5 py-1.5 rounded-xl bg-white/80 border border-gray-100 text-gray-700">
                      <b className="text-primary">Pago:</b> {formatMoney(o.valor_entrada || 0)}
                    </span>

                    <span className={`px-2.5 py-1.5 rounded-xl border ${
                      remaining > 0
                        ? 'bg-red-50 border-red-100 text-red-700'
                        : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                    }`}>
                      <b>Restante:</b> {formatMoney(remaining)}
                    </span>

                    <span className={`px-2.5 py-1.5 rounded-xl border ${paymentClass}`}>
                      {paymentLabels[o.status_pagamento] || o.status_pagamento || 'Pagamento'}
                    </span>
                  </div>

                  <div
                    className="space-y-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="grid grid-cols-4 gap-1.5">
                      <button
                        type="button"
                        className="rounded-xl border border-purple-200 bg-white/85 px-1.5 py-2 text-[10px] font-bold text-purple-700"
                        onClick={() => updateOrderQuick(o, { status: 'em_producao' }, 'Pedido movido para Em produção.')}
                      >
                        Produção
                      </button>

                      <button
                        type="button"
                        className="rounded-xl border border-emerald-200 bg-white/85 px-1.5 py-2 text-[10px] font-bold text-emerald-700"
                        onClick={() => updateOrderQuick(o, { status: 'pronto' }, 'Pedido marcado como Pronto.')}
                      >
                        Pronto
                      </button>

                      <button
                        type="button"
                        className="rounded-xl border border-green-200 bg-white/85 px-1.5 py-2 text-[10px] font-bold text-green-700"
                        onClick={() => updateOrderQuick(o, { status: 'entregue' }, 'Pedido marcado como Entregue.')}
                      >
                        Entregue
                      </button>

                      <button
                        type="button"
                        className="rounded-xl border border-blue-200 bg-white/85 px-1.5 py-2 text-[10px] font-bold text-blue-700"
                        onClick={() => updateOrderQuick(o, { status_pagamento: 'confirmado' }, 'Pagamento marcado como Confirmado.')}
                      >
                        Pago
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button className="btn btn-outline text-sm px-2 py-2 min-w-0" onClick={() => printDocument(o)} title="Documento">
                        <Printer size={15} />
                        Doc.
                      </button>

                      <button className="btn btn-outline text-sm px-2 py-2 min-w-0" onClick={() => shareOrder(o)}>
                        <Share2 size={15} />
                        Enviar
                      </button>

                      <button className="btn btn-outline text-red-700 text-sm px-2 py-2 min-w-0" onClick={() => deleteOrder(o)} title="Excluir">
                        <Trash2 size={15} />
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <BottomSheet isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} title="Pedido">
        {selectedOrder && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-primary text-white p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/70">Pedido</p>
                  <h2 className="font-display text-xl font-bold">
                    {selectedOrder.numero_pedido || selectedOrder.id}
                  </h2>
                  <p className="text-sm text-white/70 mt-1">
                    {selectedOrder.cliente_nome || 'Cliente não informado'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="rounded-xl bg-white/10 px-3 py-2 font-bold">
                    {statusLabels[selectedOrder.status] || selectedOrder.status}
                  </span>
                  <span className="rounded-xl bg-white/10 px-3 py-2 font-bold">
                    {paymentLabels[selectedOrder.status_pagamento] || selectedOrder.status_pagamento}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-bold text-primary mb-1 block">Nome do cliente</span>
                <input
                  className="input"
                  value={selectedOrder.cliente_nome || ''}
                  onChange={(e) => setSelectedOrder({ ...selectedOrder, cliente_nome: e.target.value })}
                  placeholder="Cliente"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-primary mb-1 block">Telefone do cliente</span>
                <input
                  className="input"
                  value={selectedOrder.cliente_telefone || ''}
                  onChange={(e) => setSelectedOrder({ ...selectedOrder, cliente_telefone: formatPhoneDigits(e.target.value) })}
                  placeholder="Telefone"
                  inputMode="numeric"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-primary mb-1 block">Email do cliente</span>
                <input
                  className="input"
                  value={selectedOrder.cliente_email || ''}
                  onChange={(e) => setSelectedOrder({ ...selectedOrder, cliente_email: e.target.value })}
                  placeholder="Email"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-primary mb-1 block">Prazo de entrega</span>
                <input
                  className="input"
                  type="date"
                  value={selectedOrder.prazo_entrega || ''}
                  onChange={(e) => setSelectedOrder({ ...selectedOrder, prazo_entrega: e.target.value })}
                />
              </label>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <label className="block">
                <span className="text-sm font-bold text-primary mb-1 block">Valor total</span>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={selectedOrder.total || 0}
                  onChange={(e) => {
                    const total = moneyToNumber(e.target.value);
                    const entrada = moneyToNumber(selectedOrder.valor_entrada);
                    setSelectedOrder({ ...selectedOrder, total, valor_restante: Math.max(total - entrada, 0) });
                  }}
                  placeholder="Total"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-primary mb-1 block">Valor pago / entrada</span>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={selectedOrder.valor_entrada || 0}
                  onChange={(e) => {
                    const entrada = moneyToNumber(e.target.value);
                    const total = moneyToNumber(selectedOrder.total);
                    setSelectedOrder({ ...selectedOrder, valor_entrada: entrada, valor_restante: Math.max(total - entrada, 0) });
                  }}
                  placeholder="Pago/entrada"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-primary mb-1 block">Valor restante</span>
                <input
                  className="input bg-gray-50"
                  readOnly
                  value={formatMoney(selectedOrder.valor_restante || 0)}
                  placeholder="Resta"
                />
              </label>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-bold text-primary mb-1 block">Status do pedido</span>
                <select
                  className="input"
                  value={selectedOrder.status}
                  onChange={(e) => setSelectedOrder({ ...selectedOrder, status: e.target.value })}
                >
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-bold text-primary mb-1 block">Status do pagamento</span>
                <select
                  className="input"
                  value={selectedOrder.status_pagamento || 'pendente'}
                  onChange={(e) => {
                    const status = e.target.value;
                    const total = moneyToNumber(selectedOrder.total);
                    const entradaAtual = moneyToNumber(selectedOrder.valor_entrada);
                    const entrada = status === 'confirmado' ? total : status === 'pendente' ? 0 : entradaAtual;

                    setSelectedOrder({
                      ...selectedOrder,
                      status_pagamento: status,
                      valor_entrada: entrada,
                      valor_restante: Math.max(total - entrada, 0)
                    });
                  }}
                >
                  {Object.entries(paymentLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-bold text-primary mb-1 block">Descrição / observações do pedido</span>
              <textarea
                className="input min-h-32 whitespace-pre-line"
                placeholder="Descreva o pedido, itens, medidas, materiais e observações..."
                value={selectedOrder.observacoes || ''}
                onChange={(e) => setSelectedOrder({ ...selectedOrder, observacoes: e.target.value })}
              />
            </label>

            <div className="border-t border-gray-100 pt-4">
              <h3 className="font-bold text-primary mb-3">Histórico do pedido</h3>
              {history.length === 0 && <p className="text-sm text-gray-500">Nenhuma alteração registrada.</p>}

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {history.map((h) => (
                  <div key={h.id || h.created_at} className="bg-gray-50 rounded-xl p-3 text-sm">
                    <p className="font-bold text-primary">
                      {h.usuario_nome || 'Sistema'} {h.acao} {h.campo}
                    </p>
                    <p className="text-gray-500">
                      De: {h.valor_anterior || '-'} • Para: {h.valor_novo || '-'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(h.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="sticky bottom-0 -mx-5 -mb-5 bg-white border-t border-gray-100 p-4 grid grid-cols-1 sm:grid-cols-4 gap-2">
              <button className="btn btn-outline" onClick={() => printDocument(selectedOrder)}>
                Documento
              </button>
              <button className="btn btn-outline" onClick={() => shareOrder(selectedOrder)}>
                <Share2 size={16} />
                Compartilhar
              </button>
              <button className="btn btn-outline text-red-700" onClick={() => deleteOrder(selectedOrder)}>
                Excluir
              </button>
              <button className="btn btn-primary" onClick={saveStatus}>
                Salvar
              </button>
            </div>
          </div>
        )}
      </BottomSheet>

      <BottomSheet isOpen={!!newOrder} onClose={() => setNewOrder(null)} title="Novo Pedido Manual">
        {newOrder && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
              <p className="font-bold text-primary">Cliente do pedido</p>
              <p className="text-sm text-gray-600">
                Escolha um cliente já cadastrado ou preencha os dados manualmente.
              </p>
            </div>

            <label className="block">
              <span className="text-sm font-bold text-primary mb-1 flex items-center gap-2">
                <UserRound size={16} />
                Nome do cliente
              </span>
              <input
                className="input border-2 border-amber-300 focus:border-amber-500"
                placeholder="Digite o nome do cliente"
                value={newOrder.cliente_nome}
                onChange={(e) => setNewOrder({ ...newOrder, cliente_nome: e.target.value })}
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-primary mb-1 flex items-center gap-2">
                <UserRound size={16} />
                Selecionar cliente cadastrado
              </span>
              <select className="input" value={newOrder.usuario_id || ''} onChange={(e) => setNewClient(e.target.value)}>
                <option value="">Selecionar cliente cadastrado ou preencher manualmente</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} - {c.email || c.telefone || 'sem contato'}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-bold text-primary mb-1 flex items-center gap-2">
                  <Phone size={16} />
                  Telefone
                </span>
                <input
                  className="input"
                  placeholder="Somente números. Ex: 5588996240470"
                  inputMode="numeric"
                  value={newOrder.cliente_telefone}
                  onChange={(e) => setNewOrder({ ...newOrder, cliente_telefone: formatPhoneDigits(e.target.value) })}
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-primary mb-1 flex items-center gap-2">
                  <Mail size={16} />
                  Email
                </span>
                <input
                  className="input"
                  placeholder="Email do cliente"
                  value={newOrder.cliente_email}
                  onChange={(e) => setNewOrder({ ...newOrder, cliente_email: e.target.value })}
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-bold text-primary mb-1 flex items-center gap-2">
                <FileText size={16} />
                Descrição do pedido
              </span>
              <textarea
                className="input min-h-28"
                placeholder="Descreva o pedido, produto, tamanho, material, observações..."
                value={newOrder.descricao}
                onChange={(e) => setNewOrder({ ...newOrder, descricao: e.target.value })}
              />
            </label>

            <div className="grid sm:grid-cols-3 gap-3">
              <label className="block">
                <span className="text-sm font-bold text-primary mb-1">Total R$</span>
                <input className="input" placeholder="Total R$" value={newOrder.total} onChange={(e) => updateNewOrderMoney('total', e.target.value)} />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-primary mb-1">Entrada R$</span>
                <input className="input" placeholder="Entrada R$" value={newOrder.valor_entrada} onChange={(e) => updateNewOrderMoney('valor_entrada', e.target.value)} />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-primary mb-1">Resta</span>
                <input className="input bg-gray-50" readOnly value={formatMoney(newOrder.valor_restante || 0)} />
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-bold text-primary mb-1 flex items-center gap-2">
                <CalendarDays size={16} />
                Prazo de entrega
              </span>
              <input className="input" type="date" value={newOrder.prazo_entrega} onChange={(e) => setNewOrder({ ...newOrder, prazo_entrega: e.target.value })} />
            </label>

            <div className="sticky bottom-0 -mx-5 -mb-5 bg-white border-t border-gray-100 p-4 grid grid-cols-2 gap-3">
              <button type="button" className="btn btn-outline" onClick={() => setNewOrder(null)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={createOrder}>
                Salvar pedido
              </button>
            </div>
          </div>
        )}
      </BottomSheet>

      {shareOrderData && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/70 px-3 py-4 sm:p-6 flex items-center justify-center">
          <div className="w-full max-w-3xl max-h-[94dvh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-primary">
                  Compartilhar pedido
                </h2>
                <p className="text-sm text-gray-500">
                  Confira, edite, copie ou envie o texto pelo WhatsApp.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShareOrderData(null)}
                className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center text-primary shrink-0"
                aria-label="Fechar"
              >
                <X size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              <textarea
                className="input min-h-[420px] sm:min-h-[520px] font-mono text-sm leading-relaxed resize-none"
                value={shareText}
                onChange={(e) => setShareText(e.target.value)}
              />
            </div>

            <div className="border-t border-gray-100 bg-white p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button type="button" className="btn btn-outline" onClick={copyShareText}>
                <Copy size={17} />
                Copiar texto
              </button>

              <button type="button" className="btn btn-whats" onClick={sendShareWhatsApp}>
                <MessageCircle size={17} />
                Enviar WhatsApp
              </button>

              <button type="button" className="btn btn-primary" onClick={() => setShareOrderData(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
