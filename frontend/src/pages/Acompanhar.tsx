import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Package, CheckCircle2, Clock, Truck, AlertTriangle } from 'lucide-react';
import { apiFetch, formatMoney, WHATSAPP_NUMBER } from '../lib/api';

const steps = [
  { id: 'pendente', label: 'Pendente', icon: Clock },
  { id: 'confirmado', label: 'Confirmado', icon: CheckCircle2 },
  { id: 'em_producao', label: 'Em Produção', icon: Package },
  { id: 'pronto', label: 'Pronto', icon: CheckCircle2 },
  { id: 'enviado', label: 'Enviado', icon: Truck },
  { id: 'entregue', label: 'Entregue', icon: CheckCircle2 }
];

function stepIndex(status: string) {
  const i = steps.findIndex((s) => s.id === status);
  return i >= 0 ? i : 0;
}

function prazoClass(status: string) {
  if (status === 'atrasado') return 'bg-red-50 text-red-700';
  if (status === 'atenção') return 'bg-yellow-50 text-yellow-700';
  if (status === 'no_prazo') return 'bg-green-50 text-green-700';
  return 'bg-gray-50 text-gray-600';
}

export function Acompanhar() {
  const [params] = useSearchParams();
  const [pedidoNumero, setPedidoNumero] = useState(params.get('pedido') || '');
  const [email, setEmail] = useState('');
  const [pedido, setPedido] = useState<any>(null);
  const [erro, setErro] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'found' | 'not_found'>('idle');

  async function handleSearch() {
    if (!pedidoNumero.trim()) return;
    setErro('');
    setStatus('loading');

    try {
      const query = new URLSearchParams({ numero: pedidoNumero.trim() });
      if (email.trim()) query.set('email', email.trim());
      const data = await apiFetch<any>('/pedidos/acompanhar?' + query.toString());
      setPedido(data);
      setStatus('found');
    } catch (error: any) {
      setPedido(null);
      setErro(error.message || 'Pedido não encontrado.');
      setStatus('not_found');
    }
  }

  useEffect(() => {
    if (params.get('pedido')) handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentStepIndex = stepIndex(pedido?.status || 'pendente');

  return (
    <div className="fade-in max-w-3xl mx-auto px-4 py-8 sm:py-12">
      <h1 className="font-display text-3xl font-bold text-primary mb-2 text-center sm:text-left">
        Acompanhar Pedido
      </h1>
      <p className="text-gray-500 mb-8 text-center sm:text-left">
        Digite o código do pedido para verificar o status. O email é opcional, mas aumenta a segurança da consulta.
      </p>

      <div className="card p-5 sm:p-6 mb-8 border-2 border-gold/20">
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Código do Pedido</label>
            <input type="text" value={pedidoNumero} onChange={(e) => setPedidoNumero(e.target.value)} className="w-full h-14 rounded-2xl border-2 border-slate-200 px-5 text-lg font-black tracking-wide outline-none focus:border-gold focus:ring-4 focus:ring-gold/10" placeholder="Ex: WC1234567890" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input h-14" placeholder="seu@email.com" />
          </div>
        </div>
        <button onClick={handleSearch} disabled={status === 'loading' || !pedidoNumero.trim()} className="btn btn-primary w-full sm:w-auto mt-6 disabled:opacity-70">
          {status === 'loading' ? 'Buscando...' : <><Search size={18} /> Buscar Pedido</>}
        </button>
      </div>

      {status === 'found' && pedido && (
        <div className="card p-6 sm:p-8 fade-in">
          <div className="text-center mb-8">
            <span className={'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold mb-4 ' + prazoClass(pedido.prazo_status)}>
              {pedido.prazo_status === 'atrasado' ? <AlertTriangle size={16} /> : <Clock size={16} />}
              {pedido.prazo_status === 'atrasado' ? 'Atrasado' : pedido.prazo_status === 'atenção' ? 'Atenção ao prazo' : pedido.prazo_status === 'no_prazo' ? 'No prazo' : 'Prazo a combinar'}
            </span>
            <h2 className="font-display text-2xl font-bold text-primary mb-2">Pedido {pedido.numero_pedido}</h2>
            <p className="text-gray-500">Previsão de entrega: <span className="font-semibold text-primary">{pedido.prazo_entrega || pedido.data_entrega_estimada || 'A combinar'}</span></p>
            <p className="text-gray-500 mt-1">Total: <b>{formatMoney(pedido.total)}</b> • Pago: <b>{formatMoney(pedido.valor_entrada || 0)}</b> • Resta: <b>{formatMoney(pedido.valor_restante || 0)}</b></p>
          </div>

          <div className="relative">
            <div className="absolute left-6 sm:left-1/2 top-0 bottom-0 w-0.5 bg-gray-200 -translate-x-1/2" />
            <div className="space-y-8 relative">
              {steps.map((step, index) => {
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const Icon = step.icon;
                return (
                  <div key={step.id} className="flex items-center gap-4 sm:gap-6">
                    <div className={'relative z-10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 border-4 transition-all ' + (isCompleted ? 'bg-gold border-gold/20 text-primary' : 'bg-gray-100 border-gray-200 text-gray-400')}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1 pt-1">
                      <h3 className={'font-bold ' + (isCompleted ? 'text-primary' : 'text-gray-400')}>{step.label}</h3>
                      {isCurrent && <p className="text-sm text-gray-500 mt-1">Status atual do seu pedido.</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-gray-100 text-center">
            <p className="text-gray-600 mb-4">Precisa de ajuda com este pedido?</p>
            <a href={'https://wa.me/' + WHATSAPP_NUMBER} target="_blank" rel="noopener noreferrer" className="btn btn-whats inline-flex">Falar com o Atendimento</a>
          </div>
        </div>
      )}

      {status === 'not_found' && (
        <div className="card p-8 text-center fade-in">
          <Package size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="font-display text-xl font-bold text-primary mb-2">Pedido não encontrado</h3>
          <p className="text-gray-500 mb-6">{erro || 'Verifique se o código do pedido está correto.'}</p>
          <button onClick={() => setStatus('idle')} className="btn btn-outline">Tentar Novamente</button>
        </div>
      )}
    </div>
  );
}

export default Acompanhar;
