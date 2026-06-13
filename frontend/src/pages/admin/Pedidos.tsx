import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Eye, Printer, AlertTriangle } from 'lucide-react';
import { apiFetch, confirmAction, formatMoney, notifySuccess } from '../../lib/api';
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

const pagamentoLabels: Record<string, string> = {
  pendente: 'Pendente',
  parcial: 'Parcial',
  confirmado: 'Confirmado',
  recusado: 'Recusado'
};

function prazoClass(status: string) {
  if (status === 'atrasado') return 'bg-red-50 text-red-700 border-red-200';
  if (status === 'atenção') return 'bg-yellow-50 text-yellow-700 border-yellow-200';
  if (status === 'no_prazo') return 'bg-green-50 text-green-700 border-green-200';
  return 'bg-gray-50 text-gray-600 border-gray-200';
}

function prazoLabel(status: string) {
  if (status === 'atrasado') return 'Atrasado';
  if (status === 'atenção') return 'Atenção';
  if (status === 'no_prazo') return 'No prazo';
  return 'Sem prazo';
}

export function Pedidos() {
  const [orders, setOrders] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterPrazo, setFilterPrazo] = useState('todos');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [newOrder, setNewOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [pedidos, clientesRows] = await Promise.all([
        apiFetch<any[]>('/pedidos'),
        apiFetch<any[]>('/admin/clientes').catch(() => [])
      ]);
      setOrders(pedidos);
      setClientes(clientesRows);
    } catch (err: any) {
      alert(err.message || 'Erro ao carregar pedidos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const term = search.toLowerCase();
      const matchesText =
        String(o.numero_pedido || '').toLowerCase().includes(term) ||
        String(o.cliente_nome || o.cliente_email || '').toLowerCase().includes(term);
      const matchesStatus = filterStatus === 'todos' || o.status === filterStatus || o.status_pagamento === filterStatus;
      const matchesPrazo = filterPrazo === 'todos' || o.prazo_status === filterPrazo;
      return matchesText && matchesStatus && matchesPrazo;
    });
  }, [orders, search, filterStatus, filterPrazo]);

  const openNew = () => setNewOrder({
    usuario_id: '',
    client: '',
    email: '',
    phone: '',
    description: '',
    total: '',
    entrada: '',
    restante: '',
    prazo: '',
    status: 'pendente',
    payment: 'pendente',
    useExistingClient: true
  });

  function selectClient(id: string) {
    const cliente = clientes.find((c) => c.id === id);
    if (!cliente) {
      setNewOrder({ ...newOrder, usuario_id: '', client: '', email: '', phone: '' });
      return;
    }

    setNewOrder({
      ...newOrder,
      usuario_id: cliente.id,
      client: cliente.nome || '',
      email: cliente.email || '',
      phone: cliente.telefone || ''
    });
  }

  function updateMoney(field: string, value: string) {
    const next = { ...newOrder, [field]: value };
    const total = Number(String(field === 'total' ? value : next.total).replace(',', '.')) || 0;
    const entrada = Number(String(field === 'entrada' ? value : next.entrada).replace(',', '.')) || 0;
    next.restante = String(Math.max(total - entrada, 0));
    next.payment = total > 0 && entrada >= total ? 'confirmado' : entrada > 0 ? 'parcial' : 'pendente';
    setNewOrder(next);
  }

  const createOrder = async () => {
    if (!newOrder.client || !newOrder.description) return alert('Informe cliente e descrição.');
    if (!confirmAction('Confirmar criação deste pedido?')) return;

    const total = Number(String(newOrder.total).replace(',', '.')) || 0;
    const entrada = Number(String(newOrder.entrada).replace(',', '.')) || 0;
    const restante = Math.max(total - entrada, 0);

    try {
      await apiFetch('/admin/pedidos/manual', {
        method: 'POST',
        body: JSON.stringify({
          usuario_id: newOrder.usuario_id || null,
          cliente_nome: newOrder.client,
          cliente_email: newOrder.email || '',
          cliente_telefone: newOrder.phone || '',
          descricao: newOrder.description,
          total,
          valor_entrada: entrada,
          valor_restante: restante,
          status: newOrder.status,
          status_pagamento: newOrder.payment,
          prazo_entrega: newOrder.prazo,
          endereco_entrega: 'A combinar'
        })
      });
      setNewOrder(null);
      await load();
      notifySuccess('Pedido salvo com sucesso.');
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar pedido.');
    }
  };

  const saveStatus = async () => {
    if (!confirmAction('Confirmar alteração deste pedido?')) return;

    try {
      await apiFetch('/pedidos/' + selectedOrder.id, {
        method: 'PUT',
        body: JSON.stringify({
          status: selectedOrder.status,
          status_pagamento: selectedOrder.status_pagamento,
          observacoes: selectedOrder.observacoes || '',
          valor_entrada: Number(selectedOrder.valor_entrada || 0),
          valor_restante: Number(selectedOrder.valor_restante || 0),
          prazo_entrega: selectedOrder.prazo_entrega || selectedOrder.data_entrega_estimada || '',
          data_entrega_estimada: selectedOrder.prazo_entrega || selectedOrder.data_entrega_estimada || '',
          assinatura_url: selectedOrder.assinatura_url || '',
          logo_documento_url: selectedOrder.logo_documento_url || ''
        })
      });
      setSelectedOrder(null);
      await load();
      notifySuccess('Pedido atualizado com sucesso.');
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar pedido.');
    }
  };

  const printDocument = async (order: any) => {
    try {
      const data = await apiFetch<any>('/admin/pedidos/' + order.id + '/recibo');
      const pedido = data.pedido;
      const doc = data.documento;
      const tipo = data.tipo_documento;
      const paymentInfo = tipo === 'recibo' ? 'Pagamento confirmado' : 'Ordem de serviço - pagamento ainda não confirmado';

      const html = `
        <div style="font-family:Arial;padding:24px;max-width:760px;margin:auto;color:#0b1635">
          <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #d9a321;padding-bottom:12px;margin-bottom:20px">
            <div>${doc.logo_url ? `<img src="${doc.logo_url}" style="max-height:72px;max-width:180px;object-fit:contain"/>` : `<h2>${doc.empresa}</h2>`}</div>
            <div style="text-align:right"><h1 style="margin:0">${doc.titulo}</h1><p style="margin:4px 0">${pedido.numero_pedido}</p></div>
          </div>
          <p><b>Cliente:</b> ${pedido.cliente_nome || pedido.cliente_email || ''}</p>
          <p><b>Telefone:</b> ${pedido.cliente_telefone || ''}</p>
          <p><b>Status do pedido:</b> ${statusLabels[pedido.status] || pedido.status}</p>
          <p><b>Status do pagamento:</b> ${pagamentoLabels[pedido.status_pagamento] || pedido.status_pagamento}</p>
          <p><b>Total:</b> ${formatMoney(pedido.total)}</p>
          <p><b>Entrada:</b> ${formatMoney(pedido.valor_entrada || 0)}</p>
          <p><b>Restante:</b> ${formatMoney(pedido.valor_restante || 0)}</p>
          <p><b>Prazo de entrega:</b> ${pedido.prazo_entrega || pedido.data_entrega_estimada || 'A combinar'}</p>
          <hr/>
          <p><b>Observações:</b></p>
          <p>${String(pedido.observacoes || '').replace(/\n/g, '<br/>')}</p>
          <hr/>
          <p><b>${paymentInfo}</b></p>
          ${doc.assinatura_url ? `<div style="margin-top:40px;text-align:center"><img src="${doc.assinatura_url}" style="max-height:90px;object-fit:contain"/><p>Assinatura</p></div>` : ''}
          <p style="margin-top:40px;font-size:12px;color:#666">Emitido em ${new Date().toLocaleString('pt-BR')}</p>
          <script>window.print()</script>
        </div>`;
      const win = window.open('', '_blank');
      if (win) { win.document.write(html); win.document.close(); }
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar documento.');
    }
  };

  return (
    <div className="fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary">Gerenciador de Pedidos</h1>
        <button className="btn btn-primary" onClick={openNew}><Plus size={18}/>Pedido Manual</button>
      </div>

      <div className="card p-4 grid md:grid-cols-4 gap-3 mb-6">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
          <input className="input pl-11" placeholder="Buscar pedido ou cliente..." value={search} onChange={(e)=>setSearch(e.target.value)}/>
        </div>
        <select className="input" value={filterStatus} onChange={(e)=>setFilterStatus(e.target.value)}>
          <option value="todos">Todos os status</option>
          {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          <option value="parcial">Pagamento parcial</option>
          <option value="confirmado">Pagamento confirmado</option>
        </select>
        <select className="input" value={filterPrazo} onChange={(e)=>setFilterPrazo(e.target.value)}>
          <option value="todos">Todos os prazos</option>
          <option value="atrasado">Atrasados</option>
          <option value="atenção">Atenção</option>
          <option value="no_prazo">No prazo</option>
          <option value="sem_prazo">Sem prazo</option>
        </select>
      </div>

      {loading && <div className="card p-4 mb-4">Carregando pedidos...</div>}

      <div className="card overflow-hidden">
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200"><tr><th className="text-left px-6 py-4">Pedido</th><th className="text-left px-6 py-4">Cliente</th><th className="text-left px-6 py-4">Prazo</th><th className="text-left px-6 py-4">Pagamento</th><th className="text-left px-6 py-4">Total</th><th className="text-right px-6 py-4">Ações</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((o)=><tr key={o.id}>
                <td className="px-6 py-4 font-bold text-primary">{o.numero_pedido}</td>
                <td className="px-6 py-4">{o.cliente_nome || o.cliente_email || 'Cliente'}</td>
                <td className="px-6 py-4"><span className={'px-2 py-1 rounded-full border text-xs font-bold ' + prazoClass(o.prazo_status)}>{prazoLabel(o.prazo_status)}</span><p className="text-xs text-gray-500 mt-1">{o.prazo_entrega || o.data_entrega_estimada || '-'}</p></td>
                <td className="px-6 py-4"><p>{pagamentoLabels[o.status_pagamento] || o.status_pagamento}</p><p className="text-xs text-gray-500">Entrada: {formatMoney(o.valor_entrada || 0)}</p><p className="text-xs text-gray-500">Resta: {formatMoney(o.valor_restante || 0)}</p></td>
                <td className="px-6 py-4 font-bold">{formatMoney(o.total)}</td>
                <td className="px-6 py-4"><div className="flex justify-end gap-2"><button className="p-2 rounded-lg hover:bg-gray-100" onClick={()=>setSelectedOrder({...o})}><Eye size={16}/></button><button className="p-2 rounded-lg hover:bg-gray-100" onClick={()=>printDocument(o)}><Printer size={16}/></button></div></td>
              </tr>)}
            </tbody>
          </table>
        </div>

        <div className="sm:hidden divide-y divide-gray-100">
          {filtered.map((o)=><div key={o.id} className="p-4">
            <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-primary">{o.numero_pedido}</h3><p className="text-sm text-gray-500">{o.cliente_nome || o.cliente_email || 'Cliente'}</p></div><span className={'px-2 py-1 rounded-full border text-xs font-bold ' + prazoClass(o.prazo_status)}>{prazoLabel(o.prazo_status)}</span></div>
            <p className="mt-2"><b>{formatMoney(o.total)}</b> • {statusLabels[o.status] || o.status}</p>
            <p className="text-xs text-gray-500">Entrada {formatMoney(o.valor_entrada || 0)} • Resta {formatMoney(o.valor_restante || 0)}</p>
            <div className="grid grid-cols-2 gap-2 mt-4"><button className="btn btn-outline" onClick={()=>setSelectedOrder({...o})}><Eye size={16}/>Ver</button><button className="btn btn-outline" onClick={()=>printDocument(o)}><Printer size={16}/>{o.status_pagamento === 'confirmado' ? 'Recibo' : 'OS'}</button></div>
          </div>)}
        </div>
      </div>

      <BottomSheet isOpen={!!selectedOrder} onClose={()=>setSelectedOrder(null)} title="Pedido">
        {selectedOrder && <div className="space-y-4">
          <p><b>Pedido:</b> {selectedOrder.numero_pedido}</p>
          <p><b>Cliente:</b> {selectedOrder.cliente_nome || selectedOrder.cliente_email}</p>
          <p><b>Total:</b> {formatMoney(selectedOrder.total)}</p>
          <div className="grid sm:grid-cols-2 gap-3"><input className="input" placeholder="Entrada R$" value={selectedOrder.valor_entrada || ''} onChange={(e)=>setSelectedOrder({...selectedOrder,valor_entrada:e.target.value})}/><input className="input" placeholder="Restante R$" value={selectedOrder.valor_restante || ''} onChange={(e)=>setSelectedOrder({...selectedOrder,valor_restante:e.target.value})}/></div>
          <label className="block"><span className="text-sm font-bold text-gray-600">Prazo de entrega</span><input type="date" className="input mt-1" value={(selectedOrder.prazo_entrega || selectedOrder.data_entrega_estimada || '').slice(0,10)} onChange={(e)=>setSelectedOrder({...selectedOrder,prazo_entrega:e.target.value,data_entrega_estimada:e.target.value})}/></label>
          <select className="input" value={selectedOrder.status} onChange={(e)=>setSelectedOrder({...selectedOrder,status:e.target.value})}>{Object.entries(statusLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>
          <select className="input" value={selectedOrder.status_pagamento || 'pendente'} onChange={(e)=>setSelectedOrder({...selectedOrder,status_pagamento:e.target.value})}><option value="pendente">Pagamento pendente</option><option value="parcial">Pagamento parcial</option><option value="confirmado">Pagamento confirmado</option><option value="recusado">Pagamento recusado</option></select>
          <input className="input" placeholder="URL da assinatura do recibo" value={selectedOrder.assinatura_url || ''} onChange={(e)=>setSelectedOrder({...selectedOrder,assinatura_url:e.target.value})}/>
          <input className="input" placeholder="URL da logo do documento" value={selectedOrder.logo_documento_url || ''} onChange={(e)=>setSelectedOrder({...selectedOrder,logo_documento_url:e.target.value})}/>
          <textarea className="input min-h-24" placeholder="Observações" value={selectedOrder.observacoes || ''} onChange={(e)=>setSelectedOrder({...selectedOrder,observacoes:e.target.value})}/>
          <div className="grid grid-cols-2 gap-2"><button className="btn btn-outline" onClick={()=>printDocument(selectedOrder)}>{selectedOrder.status_pagamento === 'confirmado' ? 'Recibo' : 'Ordem de Serviço'}</button><button className="btn btn-primary" onClick={saveStatus}>Salvar</button></div>
        </div>}
      </BottomSheet>

      <BottomSheet isOpen={!!newOrder} onClose={()=>setNewOrder(null)} title="Novo Pedido Manual">
        {newOrder && <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={newOrder.useExistingClient} onChange={(e)=>setNewOrder({...newOrder,useExistingClient:e.target.checked,usuario_id:''})}/>Selecionar cliente cadastrado</label>
          {newOrder.useExistingClient && <select className="input" value={newOrder.usuario_id} onChange={(e)=>selectClient(e.target.value)}><option value="">Selecione um cliente</option>{clientes.map((c)=><option key={c.id} value={c.id}>{c.nome} - {c.email}</option>)}</select>}
          <input className="input" placeholder="Nome do cliente" value={newOrder.client} onChange={(e)=>setNewOrder({...newOrder,client:e.target.value})}/>
          <input className="input" placeholder="Email" value={newOrder.email} onChange={(e)=>setNewOrder({...newOrder,email:e.target.value})}/>
          <input className="input" placeholder="Telefone" value={newOrder.phone} onChange={(e)=>setNewOrder({...newOrder,phone:e.target.value})}/>
          <textarea className="input min-h-24" placeholder="Descrição do pedido" value={newOrder.description} onChange={(e)=>setNewOrder({...newOrder,description:e.target.value})}/>
          <div className="grid sm:grid-cols-3 gap-3"><input className="input" placeholder="Total R$" value={newOrder.total} onChange={(e)=>updateMoney('total',e.target.value)}/><input className="input" placeholder="Entrada R$" value={newOrder.entrada} onChange={(e)=>updateMoney('entrada',e.target.value)}/><input className="input" placeholder="Resta R$" value={newOrder.restante} onChange={(e)=>setNewOrder({...newOrder,restante:e.target.value})}/></div>
          <label className="block"><span className="text-sm font-bold text-gray-600">Prazo de entrega</span><input type="date" className="input mt-1" value={newOrder.prazo} onChange={(e)=>setNewOrder({...newOrder,prazo:e.target.value})}/></label>
          <button className="btn btn-primary w-full" onClick={createOrder}>Salvar pedido no Supabase</button>
        </div>}
      </BottomSheet>
    </div>
  );
}
