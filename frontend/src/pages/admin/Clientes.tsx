import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownUp, BadgeDollarSign, ClipboardList, Edit, FileText, History, KeyRound, MessageCircle, ReceiptText, Search, ShoppingBag, Trash2, UserPlus, Users, X } from 'lucide-react';
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

const budgetStatusLabels: Record<string, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
  vencido: 'Vencido'
};


type Segmento = 'todos' | 'com_pedidos' | 'sem_pedidos' | 'em_aberto';
type Ordenacao = 'maior_valor' | 'mais_pedidos' | 'mais_recente' | 'nome';

function asMoney(value: any) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function phoneDigits(value: string) {
  return String(value || '').replace(/\D/g, '');
}

function whatsappNumber(value: string) {
  const digits = phoneDigits(value);
  if (!digits) return '';
  return digits.startsWith('55') ? digits : `55${digits}`;
}

function formatDate(value?: string | null) {
  if (!value) return 'Sem registro';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Sem registro' : date.toLocaleDateString('pt-BR');
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
  tone: 'blue' | 'green' | 'amber' | 'red';
}) {
  const tones = {
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
    green: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    amber: 'bg-amber-50 border-amber-100 text-amber-700',
    red: 'bg-red-50 border-red-100 text-red-700'
  };

  return (
    <div className="fade-in w-full max-w-full overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-gold mb-2">Relacionamento</p>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-primary flex items-center gap-2">
            <Users size={30} />
            Clientes
          </h1>
          <p className="text-gray-500 mt-1">Consulte compras, saldo em aberto e histórico de cada cliente.</p>
        </div>

        <button onClick={abrirNovo} className="btn btn-primary w-full sm:w-auto">
          <UserPlus size={18} />
          Novo cliente
        </button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3 mb-4">
        <SummaryCard title="Clientes" value={resumo.total} subtitle="Cadastrados" icon={Users} tone="blue" />
        <SummaryCard title="Com pedidos" value={resumo.comPedidos} subtitle="Já compraram" icon={ShoppingBag} tone="green" />
        <SummaryCard title="Total comprado" value={formatMoney(resumo.totalComprado)} subtitle="Sem cancelados" icon={BadgeDollarSign} tone="amber" />
        <SummaryCard title="Em aberto" value={formatMoney(resumo.emAberto)} subtitle="Saldo a receber" icon={AlertTriangle} tone={resumo.emAberto > 0 ? 'red' : 'green'} />
      </div>

      <div className="card p-3 sm:p-4 mb-4">
        <div className="grid lg:grid-cols-[1fr_190px_220px] gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={19} />
            <input
              className="input pl-11"
              placeholder="Buscar por nome, telefone ou e-mail..."
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
            />
          </div>

          <select className="input" value={segmento} onChange={(event) => setSegmento(event.target.value as Segmento)}>
            <option value="todos">Todos os clientes</option>
            <option value="com_pedidos">Com pedidos</option>
            <option value="sem_pedidos">Sem pedidos</option>
            <option value="em_aberto">Com saldo em aberto</option>
          </select>

          <label className="relative">
            <ArrowDownUp className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={17} />
            <select className="input pl-10" value={ordenacao} onChange={(event) => setOrdenacao(event.target.value as Ordenacao)}>
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
        <div className="card p-6">Carregando clientes...</div>
      ) : (
        <div className="grid gap-3">
          {clientesFiltrados.map((cliente) => {
            const emAberto = asMoney(cliente.valor_em_aberto);
            const temPedidos = asMoney(cliente.pedidos) > 0;

            return (
              <article
                key={cliente.id}
                onClick={() => abrirHistorico(cliente)}
                className={`card cursor-pointer border-l-4 transition hover:ring-2 hover:ring-gold/40 ${
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
                        <h3 className="font-display font-black text-lg text-primary leading-tight">{cliente.nome}</h3>

                        {emAberto > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-red-200 bg-red-50 text-red-700 text-[11px] font-black">
                            <AlertTriangle size={13} />
                            Saldo em aberto
                          </span>
                        ) : temPedidos ? (
                          <span className="px-2.5 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px] font-black">
                            Cliente ativo
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-600 text-[11px] font-black">
                            Sem pedidos
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                        <span>{cliente.email || 'Sem e-mail'}</span>
                        <span>{cliente.telefone || 'Sem telefone'}</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                        <div className="rounded-xl bg-white/85 border border-gray-100 p-2">
                          <p className="text-[10px] font-black text-gray-400 uppercase">Total comprado</p>
                          <p className="font-black text-primary">{formatMoney(cliente.total_gasto || 0)}</p>
                        </div>

                        <div className="rounded-xl bg-white/85 border border-gray-100 p-2">
                          <p className="text-[10px] font-black text-gray-400 uppercase">Em aberto</p>
                          <p className={`font-black ${emAberto > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{formatMoney(emAberto)}</p>
                        </div>

                        <div className="rounded-xl bg-white/85 border border-gray-100 p-2">
                          <p className="text-[10px] font-black text-gray-400 uppercase">Pedidos</p>
                          <p className="font-black text-primary">{cliente.pedidos || 0}</p>
                        </div>

                        <div className="rounded-xl bg-white/85 border border-gray-100 p-2">
                          <p className="text-[10px] font-black text-gray-400 uppercase">Último pedido</p>
                          <p className="font-black text-primary">{formatDate(cliente.ultimo_pedido_em)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 lg:grid-cols-1 gap-1.5 lg:w-36" onClick={(event) => event.stopPropagation()}>
                      <button onClick={() => abrirHistorico(cliente)} className="rounded-xl border border-blue-200 bg-blue-50 px-2 py-2 text-blue-700 font-black text-[11px] flex items-center justify-center gap-1" title="Histórico">
                        <History size={15} />
                        <span className="hidden lg:inline">Histórico</span>
                      </button>
                      <button onClick={() => abrirWhatsApp(cliente)} className="rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-2 text-emerald-700 font-black text-[11px] flex items-center justify-center gap-1" title="WhatsApp">
                        <MessageCircle size={15} />
                        <span className="hidden lg:inline">WhatsApp</span>
                      </button>
                      <button onClick={() => abrirEditar(cliente)} className="rounded-xl border border-gray-200 bg-white px-2 py-2 text-gray-700 font-black text-[11px] flex items-center justify-center gap-1" title="Editar">
                        <Edit size={15} />
                        <span className="hidden lg:inline">Editar</span>
                      </button>
                      <button onClick={() => abrirSenha(cliente)} className="rounded-xl border border-amber-200 bg-amber-50 px-2 py-2 text-amber-700 font-black text-[11px] flex items-center justify-center gap-1" title="Senha">
                        <KeyRound size={15} />
                        <span className="hidden lg:inline">Senha</span>
                      </button>
                      <button onClick={() => deletar(cliente)} className="rounded-xl border border-red-200 bg-red-50 px-2 py-2 text-red-700 font-black text-[11px] flex items-center justify-center gap-1" title="Excluir">
                        <Trash2 size={15} />
                        <span className="hidden lg:inline">Excluir</span>
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
          <div className="bg-white w-full max-w-5xl max-h-[92dvh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-950">Histórico de {selecionado.nome}</h2>
                <p className="text-slate-500">Pedidos, recibos, ordens de serviço e orçamentos vinculados ao cliente.</p>
              </div>
              <button onClick={() => setHistoricoModal(false)} className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {loadingHistorico ? (
                <p className="text-slate-500">Carregando histórico...</p>
              ) : (
                <>
                  <section>
                    <h3 className="font-black text-xl text-slate-950 mb-3 flex items-center gap-2"><ReceiptText size={20} /> Pedidos</h3>
                    <div className="grid gap-3">
                      {clientePedidos.map((pedido) => {
                        const pago = pedido.status_pagamento === 'confirmado' || Number(pedido.valor_restante || 0) <= 0;
                        return (
                          <div key={pedido.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 grid md:grid-cols-[1fr_auto] gap-3">
                            <div>
                              <p className="font-black text-slate-950">{pedido.numero_pedido}</p>
                              <p className="text-slate-600 text-sm">{pedido.observacoes || 'Sem descrição'}</p>
                              <p className="text-sm mt-1"><b>Total:</b> {formatMoney(pedido.total || 0)} • <b>Pago:</b> {formatMoney(pedido.valor_entrada || 0)} • <b>Resta:</b> {formatMoney(pedido.valor_restante || 0)}</p>
                              <span className={`inline-flex mt-2 px-3 py-1 rounded-full text-sm font-black ${pago ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{pago ? 'Recibo disponível' : 'Ordem de Serviço'}</span>
                            </div>
                            <button onClick={() => imprimirDocumento(pedido)} className="h-11 px-4 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center gap-2"><FileText size={16} /> Emitir</button>
                          </div>
                        );
                      })}
                      {clientePedidos.length === 0 && <p className="text-slate-500">Nenhum pedido para este cliente.</p>}
                    </div>
                  </section>

                  <section>
                    <h3 className="font-black text-xl text-slate-950 mb-3 flex items-center gap-2"><ClipboardList size={20} /> Orçamentos</h3>
                    <div className="grid gap-3">
                      {clienteOrcamentos.map((orc) => (
                        <div key={orc.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 grid md:grid-cols-[1fr_auto] gap-3">
                          <div>
                            <p className="font-black text-slate-950">{orc.numero_orcamento}</p>
                            <p className="text-slate-600 text-sm">{orc.descricao}</p>
                            <p className="text-sm mt-1"><b>Valor:</b> {formatMoney(orc.valor_total || 0)} • <b>Status:</b> {budgetStatusLabels[orc.status] || orc.status}</p>
                            {orc.virou_pedido && <span className="inline-flex mt-2 px-3 py-1 rounded-full text-sm font-black bg-emerald-50 text-emerald-700">Virou pedido</span>}
                          </div>
                          <button disabled={orc.virou_pedido} onClick={() => virarPedido(orc)} className="h-11 px-4 rounded-xl bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-500 text-white font-black flex items-center justify-center gap-2">Virar Pedido</button>
                        </div>
                      ))}
                      {clienteOrcamentos.length === 0 && <p className="text-slate-500">Nenhum orçamento para este cliente.</p>}
                    </div>
                  </section>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/70 flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white w-full max-w-xl max-h-[92dvh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-black text-slate-950">{modal === 'novo' ? 'Novo cliente' : modal === 'editar' ? 'Editar cliente' : 'Redefinir senha'}</h2>
              <button onClick={() => setModal(null)} className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {modal !== 'senha' && (
                <>
                  <label className="block"><span className="text-sm font-black text-slate-800">Nome</span><input className="input mt-1" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></label>
                  <label className="block"><span className="text-sm font-black text-slate-800">Email</span><input className="input mt-1" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
                  <label className="block"><span className="text-sm font-black text-slate-800">Telefone</span><input className="input mt-1" value={form.telefone} inputMode="numeric" placeholder="Somente números. Ex: 5588996240470" onChange={(e) => setForm({ ...form, telefone: formatPhoneDigits(e.target.value) })} /></label>
                </>
              )}
              {(modal === 'novo' || modal === 'senha') && (
                <label className="block"><span className="text-sm font-black text-slate-800">Senha</span><input className="input mt-1" type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} placeholder={modal === 'novo' ? 'Opcional: padrão 12345678' : 'Nova senha'} /></label>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 grid grid-cols-2 gap-3">
              <button onClick={() => setModal(null)} className="h-12 rounded-2xl border border-slate-200 font-black">Cancelar</button>
              <button onClick={salvar} disabled={salvando} className="h-12 rounded-2xl bg-amber-400 disabled:opacity-60 text-slate-950 font-black">{salvando ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}