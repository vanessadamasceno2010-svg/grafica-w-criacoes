import { useEffect, useState } from 'react';
import { Edit, KeyRound, Trash2, UserPlus, Printer, X, ClipboardList } from 'lucide-react';
import { apiFetch, formatMoney } from '../../lib/api';

type Cliente = {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  role?: string;
  total_gasto?: number;
  pedidos?: number;
};

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

export function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'novo' | 'editar' | 'senha' | null>(null);
  const [selecionado, setSelecionado] = useState<Cliente | null>(null);
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', senha: '' });
  const [pedidosModal, setPedidosModal] = useState(false);
  const [clientePedidos, setClientePedidos] = useState<any[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);

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

  function abrirNovo() {
    setSelecionado(null);
    setForm({ nome: '', email: '', telefone: '', senha: '' });
    setModal('novo');
  }

  function abrirEditar(cliente: Cliente) {
    setSelecionado(cliente);
    setForm({ nome: cliente.nome || '', email: cliente.email || '', telefone: cliente.telefone || '', senha: '' });
    setModal('editar');
  }

  function abrirSenha(cliente: Cliente) {
    setSelecionado(cliente);
    setForm({ nome: cliente.nome || '', email: cliente.email || '', telefone: cliente.telefone || '', senha: '' });
    setModal('senha');
  }

  async function abrirPedidos(cliente: Cliente) {
    setSelecionado(cliente);
    setPedidosModal(true);
    setLoadingPedidos(true);
    try {
      const data = await apiFetch<{ cliente: Cliente; pedidos: any[] }>('/admin/clientes/' + cliente.id + '/pedidos');
      setClientePedidos(Array.isArray(data.pedidos) ? data.pedidos : []);
    } catch (error: any) {
      setClientePedidos([]);
      alert(error.message || 'Erro ao carregar pedidos do cliente.');
    } finally {
      setLoadingPedidos(false);
    }
  }

  async function salvar() {
    try {
      if (modal === 'novo') {
        await apiFetch('/admin/clientes', {
          method: 'POST',
          body: JSON.stringify({
            nome: form.nome,
            email: form.email,
            telefone: form.telefone,
            senha: form.senha || '12345678',
            role: 'user'
          })
        });
      }

      if (modal === 'editar' && selecionado) {
        await apiFetch('/admin/clientes/' + selecionado.id, {
          method: 'PUT',
          body: JSON.stringify({ nome: form.nome, email: form.email, telefone: form.telefone })
        });
      }

      if (modal === 'senha' && selecionado) {
        if (!form.senha || form.senha.length < 6) return alert('A nova senha precisa ter pelo menos 6 caracteres.');
        await apiFetch('/admin/clientes/' + selecionado.id + '/redefinir-senha', {
          method: 'PUT',
          body: JSON.stringify({ senha: form.senha })
        });
      }

      setModal(null);
      await carregar();
      alert('Cliente salvo com sucesso.');
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar.');
    }
  }

  async function deletar(cliente: Cliente) {
    if (!confirm('Deseja excluir este cliente?')) return;
    try {
      await apiFetch('/admin/clientes/' + cliente.id, { method: 'DELETE' });
      await carregar();
    } catch (error: any) {
      alert(error.message || 'Erro ao excluir cliente.');
    }
  }

  async function imprimirDocumento(pedido: any) {
    try {
      const data = await apiFetch<any>('/admin/pedidos/' + pedido.id + '/documento');
      const p = data.pedido;
      const titulo = data.tipo === 'recibo' ? 'Recibo Digital' : 'Ordem de Serviço';
      const html = `
        <div style="font-family:Arial;padding:24px;max-width:760px;margin:auto;color:#0b1b3a">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:2px solid #e6aa21;padding-bottom:16px;margin-bottom:20px">
            <div>${data.empresa?.logo ? `<img src="${data.empresa.logo}" style="max-height:70px;max-width:180px;object-fit:contain"/>` : ''}</div>
            <div style="text-align:right"><h1 style="margin:0">${titulo}</h1><p style="margin:4px 0">${data.empresa?.nome || 'Gráfica W Criações'}</p></div>
          </div>
          <p><b>Pedido:</b> ${p.numero_pedido}</p>
          <p><b>Cliente:</b> ${p.cliente_nome || p.cliente_email || selecionado?.nome || ''}</p>
          <p><b>Telefone:</b> ${p.cliente_telefone || selecionado?.telefone || '-'}</p>
          <p><b>Email:</b> ${p.cliente_email || selecionado?.email || '-'}</p>
          <p><b>Status:</b> ${statusLabels[p.status] || p.status}</p>
          <p><b>Status pagamento:</b> ${paymentLabels[p.status_pagamento] || p.status_pagamento}</p>
          <p><b>Total:</b> ${formatMoney(p.total)} | <b>Pago:</b> ${formatMoney(p.valor_entrada || 0)} | <b>Resta:</b> ${formatMoney(p.valor_restante || 0)}</p>
          <p><b>Prazo:</b> ${p.prazo_entrega ? new Date(p.prazo_entrega).toLocaleDateString('pt-BR') : 'A combinar'}</p>
          <p><b>Observações:</b> ${p.observacoes || '-'}</p>
          <hr/>
          <p><b>WhatsApp:</b> ${data.empresa?.whatsapp || ''}</p>
          <p><b>Endereço:</b> ${data.empresa?.endereco || ''}</p>
          ${data.tipo === 'recibo' && data.empresa?.assinatura ? `<div style="margin-top:40px;text-align:center"><img src="${data.empresa.assinatura}" style="max-height:90px"/><p>Assinatura digital</p></div>` : ''}
          <p style="margin-top:30px;font-size:12px;color:#666">Emitido em ${new Date().toLocaleString('pt-BR')}</p>
          <script>window.print()</script>
        </div>
      `;
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
      }
    } catch (error: any) {
      alert(error.message || 'Erro ao emitir documento.');
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-950">Clientes</h1>
          <p className="text-slate-500">Clique em um cliente para ver os pedidos, recibos e ordens de serviço.</p>
        </div>
        <button onClick={abrirNovo} className="h-12 px-5 rounded-2xl bg-amber-400 text-slate-950 font-black flex items-center justify-center gap-2">
          <UserPlus size={18} /> Novo Cliente
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-6 shadow-sm">Carregando clientes...</div>
      ) : (
        <div className="grid gap-4">
          {clientes.map((cliente) => (
            <button key={cliente.id} onClick={() => abrirPedidos(cliente)} className="text-left bg-white rounded-3xl border border-slate-100 shadow-sm p-5 hover:ring-2 hover:ring-amber-300 transition">
              <div className="grid md:grid-cols-[1fr_auto] gap-4">
                <div>
                  <h3 className="font-black text-lg text-slate-950">{cliente.nome}</h3>
                  <p className="text-slate-600">{cliente.email}</p>
                  <p className="text-slate-500">{cliente.telefone || 'Sem telefone'}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-sm">
                    <span className="px-3 py-1 rounded-full bg-slate-100 font-bold">Perfil: {cliente.role || 'user'}</span>
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold">Total: {formatMoney(cliente.total_gasto || 0)}</span>
                    <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold">Pedidos: {cliente.pedidos || 0}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" onClick={(event) => event.stopPropagation()}>
                  <button onClick={() => abrirEditar(cliente)} className="h-11 px-4 rounded-xl bg-slate-100 font-bold flex items-center justify-center gap-2"><Edit size={16} />Editar</button>
                  <button onClick={() => abrirSenha(cliente)} className="h-11 px-4 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center gap-2"><KeyRound size={16} />Senha</button>
                  <button onClick={() => deletar(cliente)} className="h-11 px-4 rounded-xl bg-red-50 text-red-700 font-bold flex items-center justify-center gap-2"><Trash2 size={16} />Excluir</button>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {pedidosModal && selecionado && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/70 flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white w-full max-w-4xl max-h-[92dvh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-950">Pedidos de {selecionado.nome}</h2>
                <p className="text-slate-500">Recibo aparece quando pagamento integral; caso contrário, gera Ordem de Serviço.</p>
              </div>
              <button onClick={() => setPedidosModal(false)} className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center"><X size={20} /></button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3">
              {loadingPedidos && <div className="rounded-2xl bg-slate-50 p-4">Carregando pedidos...</div>}
              {!loadingPedidos && clientePedidos.length === 0 && (
                <div className="rounded-2xl bg-slate-50 p-6 text-center text-slate-500">Nenhum pedido encontrado para este cliente.</div>
              )}
              {clientePedidos.map((pedido) => {
                const integral = pedido.status_pagamento === 'confirmado' || Number(pedido.valor_restante || 0) <= 0;
                return (
                  <div key={pedido.id} className="rounded-2xl border border-slate-100 p-4 grid md:grid-cols-[1fr_auto] gap-3 items-center">
                    <div>
                      <p className="font-black text-slate-950">{pedido.numero_pedido}</p>
                      <p className="text-sm text-slate-500">{statusLabels[pedido.status] || pedido.status} • {paymentLabels[pedido.status_pagamento] || pedido.status_pagamento}</p>
                      <p className="text-sm text-slate-600">Total {formatMoney(pedido.total)} • Pago {formatMoney(pedido.valor_entrada || 0)} • Resta {formatMoney(pedido.valor_restante || 0)}</p>
                    </div>
                    <button onClick={() => imprimirDocumento(pedido)} className="h-11 px-4 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center gap-2">
                      {integral ? <Printer size={16} /> : <ClipboardList size={16} />}
                      {integral ? 'Emitir recibo' : 'Ordem de serviço'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-[99999] bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl max-h-[92dvh] overflow-y-auto">
            <h2 className="text-2xl font-black mb-4">{modal === 'novo' ? 'Novo Cliente' : modal === 'editar' ? 'Editar Cliente' : 'Redefinir Senha'}</h2>
            {modal !== 'senha' && (
              <>
                <label className="block mb-3"><span className="text-sm font-bold text-slate-700">Nome</span><input className="mt-1 w-full h-12 rounded-2xl border px-4" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></label>
                <label className="block mb-3"><span className="text-sm font-bold text-slate-700">Email para login</span><input type="email" className="mt-1 w-full h-12 rounded-2xl border px-4" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
                <label className="block mb-3"><span className="text-sm font-bold text-slate-700">Telefone</span><input className="mt-1 w-full h-12 rounded-2xl border px-4" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></label>
              </>
            )}
            {modal === 'novo' && <label className="block mb-3"><span className="text-sm font-bold text-slate-700">Senha inicial</span><input type="password" className="mt-1 w-full h-12 rounded-2xl border px-4" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} placeholder="Opcional: padrão 12345678" /></label>}
            {modal === 'senha' && <label className="block mb-3"><span className="text-sm font-bold text-slate-700">Nova senha para {selecionado?.nome}</span><input type="password" className="mt-1 w-full h-12 rounded-2xl border px-4" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} placeholder="Digite a nova senha" /></label>}
            <div className="grid grid-cols-2 gap-3 mt-5">
              <button onClick={() => setModal(null)} className="h-12 rounded-2xl bg-slate-100 font-black">Cancelar</button>
              <button onClick={salvar} className="h-12 rounded-2xl bg-amber-400 text-slate-950 font-black">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Clientes;
