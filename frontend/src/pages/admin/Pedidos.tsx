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
  X
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

function prazoStatus(order: any) {
  if (!order.prazo_entrega || ['entregue', 'cancelado'].includes(order.status)) {
    return { label: 'Sem prazo', cls: 'bg-gray-100 text-gray-600', icon: Clock };
  }

  const today = new Date();
  const deadline = new Date(dateOnly(order.prazo_entrega) + 'T23:59:59');
  const diff = Math.ceil((deadline.getTime() - today.getTime()) / 86400000);

  if (diff < 0) return { label: 'Atrasado', cls: 'bg-red-50 text-red-700', icon: AlertTriangle };
  if (diff <= 2) return { label: 'Atenção', cls: 'bg-amber-50 text-amber-700', icon: AlertTriangle };
  return { label: 'No prazo', cls: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 };
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

export function Pedidos() {
  const [orders, setOrders] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [prazoFilter, setPrazoFilter] = useState('todos');
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
      valor_restante: Number(order.valor_restante || Math.max(Number(order.total || 0) - Number(order.valor_entrada || 0), 0)),
      prazo_entrega: dateOnly(order.prazo_entrega)
    });

    try {
      const data = await apiFetch<any[]>('/admin/pedidos/' + order.id + '/historico');
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      setHistory([]);
    }
  }

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const text = [o.numero_pedido, o.cliente_nome, o.cliente_email, o.cliente_telefone].join(' ').toLowerCase();
      const matchesSearch = text.includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'todos' || o.status === statusFilter;
      const prazo = prazoStatus(o).label;
      const matchesPrazo = prazoFilter === 'todos' || prazo === prazoFilter;
      return matchesSearch && matchesStatus && matchesPrazo;
    });
  }, [orders, search, statusFilter, prazoFilter]);

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


  function buildShareMessage(order: any) {
    const numero = order.numero_pedido || order.numero || order.id;
    const prazo = order.prazo_entrega
      ? new Date(order.prazo_entrega).toLocaleDateString('pt-BR')
      : 'A combinar';
    const link = window.location.origin + '/acompanhar?pedido=' + encodeURIComponent(numero);
    const descricao = String(order.observacoes || order.descricao || 'Pedido registrado no painel.').trim();
    const total = moneyToNumber(order.total);
    const entrada = moneyToNumber(order.valor_entrada);
    const restante = Math.max(total - entrada, 0);
    const formaPagamento = restante <= 0
      ? 'Pagamento integral confirmado'
      : entrada > 0
        ? '50% Pedido e 50% Entrega'
        : 'A combinar na confirmação do pedido';

    return [
      `*Pedido número:* ${numero}`,
      '',
      `*Cliente:* ${order.cliente_nome || 'Cliente'}`,
      `*Descrição:*`,
      descricao,
      '',
      `*Valor total:* ${formatMoney(total)}`,
      `*Valor pago/entrada:* ${formatMoney(entrada)}`,
      `*Valor restante:* ${formatMoney(restante)}`,
      '',
      `*Forma de pagamento:*`,
      formaPagamento,
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
    try {
      const data = await apiFetch<any>('/admin/pedidos/' + order.id + '/documento');
      const pedido = data.pedido;
      const tipoTitulo = data.tipo === 'recibo' ? 'Recibo Digital' : 'Ordem de Serviço';
      const html = `
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
          <p><b>Prazo de entrega:</b> ${pedido.prazo_entrega ? new Date(pedido.prazo_entrega).toLocaleDateString('pt-BR') : 'A combinar'}</p>
          <p><b>Observações:</b> ${pedido.observacoes || '-'}</p>
          <hr/>
          <p><b>WhatsApp:</b> ${data.empresa?.whatsapp || ''}</p>
          <p><b>Endereço:</b> ${data.empresa?.endereco || ''}</p>
          ${data.tipo === 'recibo' && data.empresa?.assinatura ? `<div style="margin-top:40px;text-align:center"><img src="${data.empresa.assinatura}" style="max-height:90px"/><p>Assinatura digital</p></div>` : ''}
          <p style="margin-top:30px;font-size:12px;color:#666">Emitido em ${new Date().toLocaleString('pt-BR')}</p>
          <script>window.print()</script>
        </div>`;

      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao emitir documento.');
    }
  };

  return (
    <div className="fade-in w-full max-w-full overflow-hidden px-1 sm:px-0">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary">Gerenciador de Pedidos</h1>
          <p className="text-gray-500 mt-1">Clique em qualquer pedido para abrir, editar e ver histórico.</p>
        </div>
        <button className="btn btn-primary w-full sm:w-auto" onClick={() => setNewOrder(buildInitialPedidoForm())}>
          <Plus size={18} /> Pedido Manual
        </button>
      </div>

      <div className="card p-4 mb-6 grid lg:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input className="input pl-11" placeholder="Buscar pedido ou cliente..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="todos">Todos os status</option>
          {Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <select className="input" value={prazoFilter} onChange={(e) => setPrazoFilter(e.target.value)}>
          <option value="todos">Todos os prazos</option>
          <option value="Atrasado">Atrasados</option>
          <option value="Atenção">Atenção</option>
          <option value="No prazo">No prazo</option>
          <option value="Sem prazo">Sem prazo</option>
        </select>
      </div>

      {loading && <div className="card p-4 mb-4">Carregando pedidos...</div>}

      <div className="grid gap-3">
        {filtered.map((o) => {
          const pz = prazoStatus(o);
          const Icon = pz.icon;
          return (
            <button key={o.id} onClick={() => openOrder(o)} className="card p-4 text-left hover:ring-2 hover:ring-gold/40 transition">
              <div className="grid xl:grid-cols-[1fr_1fr_130px_170px_130px] gap-3 items-center">
                <div><p className="font-bold text-primary">{o.numero_pedido}</p><p className="text-sm text-gray-500">{statusLabels[o.status] || o.status}</p></div>
                <div><p className="font-semibold text-primary truncate">{o.cliente_nome || o.cliente_email || 'Cliente'}</p><p className="text-sm text-gray-500 truncate">{o.cliente_telefone || o.cliente_email}</p></div>
                <div><span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${pz.cls}`}><Icon size={14} />{pz.label}</span><p className="text-xs text-gray-500 mt-1">{o.prazo_entrega ? new Date(o.prazo_entrega).toLocaleDateString('pt-BR') : 'A combinar'}</p></div>
                <div><p className="font-bold text-primary">{formatMoney(o.total)}</p><p className="text-xs text-gray-500">Pago {formatMoney(o.valor_entrada || 0)} • Resta {formatMoney(o.valor_restante || 0)}</p></div>
                <div className="flex gap-2 justify-start xl:justify-end" onClick={(e) => e.stopPropagation()}>
                  <button className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100" onClick={() => printDocument(o)} title="Documento"><Printer size={17} /></button>
                  <button className="p-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100" onClick={() => deleteOrder(o)} title="Excluir"><Trash2 size={17} /></button>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <BottomSheet isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} title="Pedido">
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <input className="input" value={selectedOrder.cliente_nome || ''} onChange={(e) => setSelectedOrder({ ...selectedOrder, cliente_nome: e.target.value })} placeholder="Cliente" />
              <input className="input" value={selectedOrder.cliente_telefone || ''} onChange={(e) => setSelectedOrder({ ...selectedOrder, cliente_telefone: formatPhoneDigits(e.target.value) })} placeholder="Telefone" inputMode="numeric" />
              <input className="input" value={selectedOrder.cliente_email || ''} onChange={(e) => setSelectedOrder({ ...selectedOrder, cliente_email: e.target.value })} placeholder="Email" />
              <input className="input" type="date" value={selectedOrder.prazo_entrega || ''} onChange={(e) => setSelectedOrder({ ...selectedOrder, prazo_entrega: e.target.value })} />
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <input className="input" type="number" step="0.01" value={selectedOrder.total || 0} onChange={(e) => { const total = moneyToNumber(e.target.value); const entrada = moneyToNumber(selectedOrder.valor_entrada); setSelectedOrder({ ...selectedOrder, total, valor_restante: Math.max(total - entrada, 0) }); }} placeholder="Total" />
              <input className="input" type="number" step="0.01" value={selectedOrder.valor_entrada || 0} onChange={(e) => { const entrada = moneyToNumber(e.target.value); const total = moneyToNumber(selectedOrder.total); setSelectedOrder({ ...selectedOrder, valor_entrada: entrada, valor_restante: Math.max(total - entrada, 0) }); }} placeholder="Pago/entrada" />
              <input className="input bg-gray-50" readOnly value={formatMoney(selectedOrder.valor_restante || 0)} placeholder="Resta" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <select className="input" value={selectedOrder.status} onChange={(e) => setSelectedOrder({ ...selectedOrder, status: e.target.value })}>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
              <select className="input" value={selectedOrder.status_pagamento || 'pendente'} onChange={(e) => setSelectedOrder({ ...selectedOrder, status_pagamento: e.target.value })}>{Object.entries(paymentLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
            </div>
            <textarea className="input min-h-24" placeholder="Observações" value={selectedOrder.observacoes || ''} onChange={(e) => setSelectedOrder({ ...selectedOrder, observacoes: e.target.value })} />
            <div className="sticky bottom-0 -mx-5 -mb-5 bg-white border-t border-gray-100 p-4 grid grid-cols-1 sm:grid-cols-4 gap-2">
              <button className="btn btn-outline" onClick={() => printDocument(selectedOrder)}>Documento</button>
              <button className="btn btn-outline" onClick={() => shareOrder(selectedOrder)}><Share2 size={16} /> Compartilhar</button>
              <button className="btn btn-outline text-red-700" onClick={() => deleteOrder(selectedOrder)}>Excluir</button>
              <button className="btn btn-primary" onClick={saveStatus}>Salvar</button>
            </div>
            <div className="border-t border-gray-100 pt-4">
              <h3 className="font-bold text-primary mb-3">Histórico do pedido</h3>
              {history.length === 0 && <p className="text-sm text-gray-500">Nenhuma alteração registrada.</p>}
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {history.map((h) => <div key={h.id || h.created_at} className="bg-gray-50 rounded-xl p-3 text-sm"><p className="font-bold text-primary">{h.usuario_nome || 'Sistema'} {h.acao} {h.campo}</p><p className="text-gray-500">De: {h.valor_anterior || '-'} • Para: {h.valor_novo || '-'}</p><p className="text-xs text-gray-400">{new Date(h.created_at).toLocaleString('pt-BR')}</p></div>)}
              </div>
            </div>
          </div>
        )}
      </BottomSheet>

      <BottomSheet isOpen={!!newOrder} onClose={() => setNewOrder(null)} title="Novo Pedido Manual">
        {newOrder && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4"><p className="font-bold text-primary">Cliente do pedido</p><p className="text-sm text-gray-600">Escolha um cliente já cadastrado ou preencha os dados manualmente.</p></div>
            <label className="block"><span className="text-sm font-bold text-primary mb-1 flex items-center gap-2"><UserRound size={16} />Nome do cliente</span><input className="input border-2 border-amber-300 focus:border-amber-500" placeholder="Digite o nome do cliente" value={newOrder.cliente_nome} onChange={(e) => setNewOrder({ ...newOrder, cliente_nome: e.target.value })} /></label>
            <label className="block"><span className="text-sm font-bold text-primary mb-1 flex items-center gap-2"><UserRound size={16} />Selecionar cliente cadastrado</span><select className="input" value={newOrder.usuario_id || ''} onChange={(e) => setNewClient(e.target.value)}><option value="">Selecionar cliente cadastrado ou preencher manualmente</option>{clientes.map((c) => <option key={c.id} value={c.id}>{c.nome} - {c.email || c.telefone || 'sem contato'}</option>)}</select></label>
            <div className="grid sm:grid-cols-2 gap-3"><label className="block"><span className="text-sm font-bold text-primary mb-1 flex items-center gap-2"><Phone size={16} />Telefone</span><input className="input" placeholder="Somente números. Ex: 5588996240470" inputMode="numeric" value={newOrder.cliente_telefone} onChange={(e) => setNewOrder({ ...newOrder, cliente_telefone: formatPhoneDigits(e.target.value) })} /></label><label className="block"><span className="text-sm font-bold text-primary mb-1 flex items-center gap-2"><Mail size={16} />Email</span><input className="input" placeholder="Email do cliente" value={newOrder.cliente_email} onChange={(e) => setNewOrder({ ...newOrder, cliente_email: e.target.value })} /></label></div>
            <label className="block"><span className="text-sm font-bold text-primary mb-1 flex items-center gap-2"><FileText size={16} />Descrição do pedido</span><textarea className="input min-h-28" placeholder="Descreva o pedido, produto, tamanho, material, observações..." value={newOrder.descricao} onChange={(e) => setNewOrder({ ...newOrder, descricao: e.target.value })} /></label>
            <div className="grid sm:grid-cols-3 gap-3"><label className="block"><span className="text-sm font-bold text-primary mb-1">Total R$</span><input className="input" placeholder="Total R$" value={newOrder.total} onChange={(e) => updateNewOrderMoney('total', e.target.value)} /></label><label className="block"><span className="text-sm font-bold text-primary mb-1">Entrada R$</span><input className="input" placeholder="Entrada R$" value={newOrder.valor_entrada} onChange={(e) => updateNewOrderMoney('valor_entrada', e.target.value)} /></label><label className="block"><span className="text-sm font-bold text-primary mb-1">Resta</span><input className="input bg-gray-50" readOnly value={formatMoney(newOrder.valor_restante || 0)} /></label></div>
            <label className="block"><span className="text-sm font-bold text-primary mb-1 flex items-center gap-2"><CalendarDays size={16} />Prazo de entrega</span><input className="input" type="date" value={newOrder.prazo_entrega} onChange={(e) => setNewOrder({ ...newOrder, prazo_entrega: e.target.value })} /></label>
            <div className="sticky bottom-0 -mx-5 -mb-5 bg-white border-t border-gray-100 p-4 grid grid-cols-2 gap-3"><button type="button" className="btn btn-outline" onClick={() => setNewOrder(null)}>Cancelar</button><button className="btn btn-primary" onClick={createOrder}>Salvar pedido</button></div>
          </div>
        )}
      </BottomSheet>

      {shareOrderData && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/70 px-3 py-4 sm:p-6 flex items-center justify-center">
          <div className="w-full max-w-3xl max-h-[94dvh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-primary">Compartilhar pedido</h2>
                <p className="text-sm text-gray-500">Confira, edite, copie ou envie o texto pelo WhatsApp.</p>
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
