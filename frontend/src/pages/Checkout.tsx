import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, CheckCircle, MapPin, Store } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { apiFetch, formatMoney, whatsappUrl, LocalOrder, BRAND } from '../lib/api';

const STORE_ADDRESS = 'Tv. João Miguel da Fonseca Lobo, 105 - Centro';

function safeQuantity(value: any) {
  const qty = Number(value || 1);
  return Number.isFinite(qty) && qty > 0 ? qty : 1;
}

function safePrice(value: any) {
  const price = Number(value || 0);
  return Number.isFinite(price) ? price : 0;
}

function buildCheckoutWhatsAppMessage(order: LocalOrder, backendOrder?: any) {
  const numero = backendOrder?.numero_pedido || order.numero;
  const link = `${window.location.origin}/acompanhar?pedido=${encodeURIComponent(numero)}`;

  const itens = order.items
    .map((item, index) => {
      const specs = Object.entries(item.especificacoes_selecionadas || {})
        .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
        .map(([key, value]) => `${key}: ${value}`)
        .join(' | ');

      const quantidade = safeQuantity(item.quantidade);
      const preco = safePrice(item.preco_unitario || (item as any).preco);

      return `${index + 1}. ${quantidade}x ${item.nome}${specs ? ` (${specs})` : ''} - ${formatMoney(preco * quantidade)}`;
    })
    .join('\n');

  return [
    'Olá, vim do Site e quero finalizar meu pedido na Gráfica W Criações.',
    '',
    `*Pedido número:* ${numero}`,
    `*Código para acompanhamento:* ${numero}`,
    '',
    '*Cliente:*',
    `Nome: ${order.cliente.nome}`,
    `Telefone: ${order.cliente.telefone}`,
    `Email: ${order.cliente.email || 'não informado'}`,
    '',
    '*Entrega/retirada:*',
    order.cliente.endereco,
    '',
    '*Itens:*',
    itens,
    '',
    `*Subtotal:* ${formatMoney(order.subtotal)}`,
    `*Frete:* ${order.frete > 0 ? formatMoney(order.frete) : 'A combinar'}`,
    `*Total:* ${formatMoney(order.total)}`,
    '',
    '*Forma de pagamento:*',
    '50% Pedido e 50% Entrega',
    '',
    '*Chave Pix:*',
    'wcriacoesgrafica@gmail.com',
    '',
    'Após a confirmação do pedido, seguiremos com a criação dos layouts e enviaremos para aprovação antes de iniciar a produção dos materiais.',
    '',
    'Você pode acompanhar o andamento do seu pedido pelo link abaixo:',
    link,
    '',
    `Observações: ${order.cliente.observacoes || 'sem observações'}`
  ].join('\n');
}

export function Checkout() {
  const { cart, clearCart } = useApp();
  const navigate = useNavigate();

  const [deliveryType, setDeliveryType] = useState<'entrega' | 'retirada'>('retirada');
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    cep: '',
    rua: '',
    numero: '',
    complemento: '',
    cidade: '',
    estado: '',
    observacoes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const quantidade = safeQuantity(item.quantidade);
      const preco = safePrice(item.preco_unitario || (item as any).preco);
      return sum + preco * quantidade;
    }, 0);
  }, [cart]);

  const frete = 0;
  const total = subtotal + frete;

  useEffect(() => {
    if (cart.length === 0 && !isSubmitting) {
      navigate('/carrinho', { replace: true });
    }
  }, [cart.length, isSubmitting, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const buildAddress = () => {
    if (deliveryType === 'retirada') {
      return `Retirada no local: ${STORE_ADDRESS}`;
    }

    return `${formData.rua}, ${formData.numero}${formData.complemento ? `, ${formData.complemento}` : ''} - ${formData.cidade}/${formData.estado} - CEP ${formData.cep}`;
  };

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      alert('Seu carrinho está vazio.');
      navigate('/carrinho');
      return;
    }

    if (!formData.nome.trim()) return alert('Informe seu nome.');
    if (!formData.telefone.trim()) return alert('Informe seu WhatsApp.');

    if (deliveryType === 'entrega') {
      if (!formData.cep.trim() || !formData.rua.trim() || !formData.numero.trim() || !formData.cidade.trim() || !formData.estado.trim()) {
        return alert('Preencha o endereço de entrega ou selecione retirada no local.');
      }
    }

    setIsSubmitting(true);

    try {
      const numeroLocal = 'WC' + Date.now();
      const endereco = buildAddress();

      const safeItems = cart.map((item) => ({
        ...item,
        quantidade: safeQuantity(item.quantidade),
        preco_unitario: safePrice(item.preco_unitario || (item as any).preco),
        especificacoes_selecionadas: item.especificacoes_selecionadas || {}
      }));

      const order: LocalOrder = {
        numero: numeroLocal,
        items: safeItems,
        cliente: {
          nome: formData.nome,
          telefone: formData.telefone,
          email: formData.email,
          endereco,
          observacoes: formData.observacoes,
        },
        subtotal,
        frete,
        desconto: 0,
        total,
        created_at: new Date().toISOString(),
        status: 'pendente' as any,
      };

      let backendOrder: any = null;

      try {
        backendOrder = await apiFetch('/pedidos/site', {
          method: 'POST',
          body: JSON.stringify({
            items: safeItems,
            subtotal,
            frete,
            desconto: 0,
            total,
            valor_entrada: 0,
            metodo_pagamento: 'whatsapp',
            status_pagamento: 'pendente',
            endereco_entrega: endereco,
            tipo_entrega: deliveryType,
            observacoes: formData.observacoes,
            cliente_nome: formData.nome,
            cliente_email: formData.email,
            cliente_telefone: formData.telefone,
            origem: 'site'
          })
        });
      } catch (error) {
        console.error('Falha ao salvar pedido no backend:', error);
        alert('Não foi possível registrar o pedido no painel. Tente novamente em alguns segundos.');
        setIsSubmitting(false);
        return;
      }

      const orderToSave = {
        ...order,
        numero: backendOrder?.numero_pedido || numeroLocal
      };

      localStorage.setItem('gp_last_order', JSON.stringify(orderToSave));

      const url = whatsappUrl(buildCheckoutWhatsAppMessage(orderToSave, backendOrder));
      clearCart();

      await new Promise((resolve) => setTimeout(resolve, 300));

      window.open(url, '_blank');
      navigate(`/pedido-confirmado/${backendOrder?.numero_pedido || numeroLocal}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return null;
  }

  return (
    <div className="fade-in max-w-5xl mx-auto px-4 py-6 pb-32 sm:pb-8">
      <button
        onClick={() => navigate('/carrinho')}
        className="flex items-center gap-2 text-gray-500 hover:text-primary mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        Voltar ao carrinho
      </button>

      <h1 className="font-display text-3xl font-bold text-primary mb-3">Finalizar Pedido</h1>
      <p className="text-gray-500 mb-8 leading-relaxed">
        O pagamento <strong>não</strong> é feito pelo site. Seu pedido será registrado no painel e enviado para o WhatsApp da gráfica ({BRAND.whatsapp}) para confirmação.
      </p>

      <div className="lg:grid lg:grid-cols-3 lg:gap-8">
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          <div className="card p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-primary mb-5 flex items-center gap-2">
              <CheckCircle size={20} className="text-gold" />
              Dados Pessoais
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome Completo *</label>
                <input type="text" name="nome" required value={formData.nome} onChange={handleInputChange} className="input" placeholder="Seu nome completo" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">WhatsApp *</label>
                <input type="tel" name="telefone" required value={formData.telefone} onChange={handleInputChange} className="input" placeholder="(00) 00000-0000" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="input" placeholder="seu@email.com" />
              </div>
            </div>
          </div>

          <div className="card p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-primary mb-5 flex items-center gap-2">
              <MapPin size={20} className="text-gold" />
              Entrega ou Retirada
            </h2>

            <div className="grid sm:grid-cols-2 gap-3 mb-5">
              <button
                type="button"
                onClick={() => setDeliveryType('retirada')}
                className={`rounded-2xl border p-4 text-left transition ${deliveryType === 'retirada' ? 'border-gold bg-gold/10' : 'border-gray-200 bg-white'}`}
              >
                <Store size={20} className="text-gold mb-2" />
                <p className="font-bold text-primary">Retirada no local</p>
                <p className="text-sm text-gray-500">{STORE_ADDRESS}</p>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryType('entrega')}
                className={`rounded-2xl border p-4 text-left transition ${deliveryType === 'entrega' ? 'border-gold bg-gold/10' : 'border-gray-200 bg-white'}`}
              >
                <MapPin size={20} className="text-gold mb-2" />
                <p className="font-bold text-primary">Entrega</p>
                <p className="text-sm text-gray-500">Informe o endereço para combinar a entrega.</p>
              </button>
            </div>

            {deliveryType === 'entrega' && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">CEP *</label>
                  <input type="text" name="cep" required value={formData.cep} onChange={handleInputChange} className="input" placeholder="00000-000" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Rua *</label>
                  <input type="text" name="rua" required value={formData.rua} onChange={handleInputChange} className="input" placeholder="Nome da rua" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Número *</label>
                  <input type="text" name="numero" required value={formData.numero} onChange={handleInputChange} className="input" placeholder="123" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Complemento</label>
                  <input type="text" name="complemento" value={formData.complemento} onChange={handleInputChange} className="input" placeholder="Apto, Bloco, etc." />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cidade *</label>
                  <input type="text" name="cidade" required value={formData.cidade} onChange={handleInputChange} className="input" placeholder="Sua cidade" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Estado *</label>
                  <input type="text" name="estado" required value={formData.estado} onChange={handleInputChange} className="input" placeholder="UF" maxLength={2} />
                </div>
              </div>
            )}
          </div>

          <div className="card p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-primary mb-5 flex items-center gap-2">
              <CheckCircle size={20} className="text-gold" />
              Observações
            </h2>
            <textarea
              name="observacoes"
              value={formData.observacoes}
              onChange={handleInputChange}
              className="input min-h-[120px] resize-none"
              placeholder="Alguma observação sobre o pedido? Ex: cor preferida, data necessária, detalhes da arte..."
            />
          </div>
        </form>

        <div className="lg:col-span-1 mt-6 lg:mt-0">
          <div className="card p-6 sticky top-24">
            <h2 className="font-display text-lg font-bold text-primary mb-5">Resumo</h2>

            <div className="space-y-3 mb-6 max-h-60 overflow-y-auto no-scrollbar">
              {cart.map((item) => {
                const quantidade = safeQuantity(item.quantidade);
                const preco = safePrice(item.preco_unitario || (item as any).preco);

                return (
                  <div key={`${item.id}-${JSON.stringify(item.especificacoes_selecionadas)}`} className="flex gap-3 text-sm">
                    <span className="font-bold text-primary flex-shrink-0">{quantidade}x</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-800 truncate">{item.nome}</p>
                      <p className="text-gray-500 text-xs">
                        {Object.values(item.especificacoes_selecionadas || {}).join(' / ')}
                      </p>
                    </div>
                    <span className="font-semibold text-gray-700 flex-shrink-0">
                      {formatMoney(preco * quantidade)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="h-px bg-gray-200 my-4" />

            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-gray-600 text-sm">
                <span>Subtotal</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600 text-sm">
                <span>Entrega</span>
                <span>{deliveryType === 'retirada' ? 'Retirada no local' : 'A combinar'}</span>
              </div>
              <div className="flex justify-between items-baseline pt-3 border-t border-gray-200">
                <span className="font-display font-bold text-lg text-primary">Total</span>
                <span className="font-display font-bold text-2xl text-primary">{formatMoney(total)}</span>
              </div>
            </div>

            <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="btn btn-whats w-full text-base disabled:opacity-70">
              {isSubmitting ? 'Enviando...' : <><MessageCircle size={18} /> Enviar Pedido pelo WhatsApp</>}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4 leading-relaxed">
              Ao clicar, o pedido será registrado no painel admin e depois enviado para o WhatsApp.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
