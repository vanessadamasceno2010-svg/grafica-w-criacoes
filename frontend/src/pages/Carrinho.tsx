import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  MessageCircle,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2
} from 'lucide-react';

import { useApp } from '../contexts/AppContext';
import {
  createWhatsAppOrderMessage,
  formatMoney,
  LocalOrder,
  whatsappUrl
} from '../lib/api';

function safeQuantity(value: unknown) {
  const quantity = Number(value || 1);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}

function safePrice(value: unknown) {
  const price = Number(value || 0);
  return Number.isFinite(price) ? price : 0;
}

function selectedOptions(
  specifications: Record<string, unknown> | undefined
) {
  return Object.entries(specifications || {})
    .filter(([, value]) => {
      return (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ''
      );
    })
    .map(([key, value]) => ({
      key,
      value: String(value)
    }));
}

export function Carrinho() {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    clearCart
  } = useApp();

  const navigate = useNavigate();

  const subtotal = cart.reduce((sum, item) => {
    const price = safePrice(
      item.preco_unitario || (item as any).preco
    );

    return sum + price * safeQuantity(item.quantidade);
  }, 0);

  const cartCount = cart.reduce(
    (sum, item) => sum + safeQuantity(item.quantidade),
    0
  );

  const handleClearCart = () => {
    if (
      !window.confirm(
        'Deseja remover todos os produtos do carrinho?'
      )
    ) {
      return;
    }

    clearCart();
  };

  const handlePedidoRapido = () => {
    if (cart.length === 0) return;

    const order: LocalOrder = {
      numero: 'ORC-' + Date.now(),
      items: cart,
      cliente: {
        nome: 'Cliente',
        telefone: '',
        email: '',
        endereco: 'A combinar',
        observacoes: 'Pedido rápido pelo carrinho'
      },
      subtotal,
      frete: 0,
      desconto: 0,
      total: subtotal,
      created_at: new Date().toISOString()
    };

    window.open(
      whatsappUrl(createWhatsAppOrderMessage(order)),
      '_blank',
      'noopener,noreferrer'
    );
  };

  if (cart.length === 0) {
    return (
      <div className="fade-in max-w-5xl mx-auto px-4 py-14 sm:py-20 text-center">
        <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
          <ShoppingBag size={42} className="text-gray-400" />
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary mb-3">
          Seu carrinho está vazio
        </h1>

        <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
          Explore o catálogo e escolha os produtos personalizados
          ideais para sua marca, evento ou negócio.
        </p>

        <Link to="/catalogo" className="btn btn-primary">
          Ver catálogo
          <ArrowRight size={18} />
        </Link>
      </div>
    );
  }

  return (
    <div className="fade-in max-w-6xl mx-auto px-4 py-6 pb-40 sm:pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <Link
            to="/catalogo"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary mb-3"
          >
            <ArrowLeft size={17} />
            Continuar comprando
          </Link>

          <h1 className="font-display text-3xl sm:text-4xl font-bold text-primary">
            Carrinho
          </h1>

          <p className="text-gray-500 mt-1">
            {cartCount} {cartCount === 1 ? 'item' : 'itens'} no carrinho
          </p>
        </div>

        <button
          type="button"
          onClick={handleClearCart}
          className="inline-flex items-center justify-center gap-2 text-sm font-bold text-danger hover:bg-red-50 rounded-xl px-4 py-3 self-start sm:self-auto"
        >
          <Trash2 size={17} />
          Limpar carrinho
        </button>
      </div>

      <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-6">
        <section className="space-y-3">
          {cart.map((item) => {
            const quantity = safeQuantity(item.quantidade);
            const unitPrice = safePrice(
              item.preco_unitario || (item as any).preco
            );
            const itemTotal = unitPrice * quantity;
            const options = selectedOptions(
              item.especificacoes_selecionadas
            );

            return (
              <article
                key={`${item.id}-${JSON.stringify(
                  item.especificacoes_selecionadas
                )}`}
                className="card overflow-hidden"
              >
                <div className="p-3 sm:p-4">
                  <div className="grid grid-cols-[92px_1fr] sm:grid-cols-[120px_1fr_auto] gap-3 sm:gap-4 items-start">
                    <img
                      src={item.imagem_principal}
                      alt={item.nome}
                      className="w-[92px] h-[92px] sm:w-[120px] sm:h-[120px] rounded-2xl object-cover bg-gray-100"
                      onError={(event) => {
                        event.currentTarget.src =
                          '/assets/chaveiros-personalizados.jpeg';
                      }}
                    />

                    <div className="min-w-0">
                      <h2 className="font-display font-bold text-primary text-base sm:text-lg leading-tight">
                        {item.nome}
                      </h2>

                      <p className="text-xs text-gray-400 mt-1">
                        Valor unitário: {formatMoney(unitPrice)}
                      </p>

                      {options.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {options.map((option) => (
                            <span
                              key={`${option.key}-${option.value}`}
                              className="inline-flex px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-[11px] font-semibold"
                            >
                              {option.key}: {option.value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeFromCart(
                          item.id,
                          item.especificacoes_selecionadas
                        )
                      }
                      className="hidden sm:flex w-10 h-10 rounded-xl bg-red-50 text-danger items-center justify-center hover:bg-red-100"
                      aria-label={`Remover ${item.nome}`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-[1fr_auto] items-end gap-3 mt-4 pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">
                        Quantidade
                      </p>

                      <div className="inline-flex items-center gap-1.5 bg-gray-100 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(
                              item.id,
                              item.especificacoes_selecionadas,
                              quantity - 1
                            )
                          }
                          className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-primary shadow-sm active:scale-95 transition"
                          aria-label="Diminuir quantidade"
                        >
                          <Minus size={16} />
                        </button>

                        <span className="font-bold text-primary min-w-9 text-center">
                          {quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(
                              item.id,
                              item.especificacoes_selecionadas,
                              quantity + 1
                            )
                          }
                          className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-primary shadow-sm active:scale-95 transition"
                          aria-label="Aumentar quantidade"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                        Total
                      </p>

                      <p className="font-display font-bold text-xl sm:text-2xl text-primary mt-1">
                        {formatMoney(itemTotal)}
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          removeFromCart(
                            item.id,
                            item.especificacoes_selecionadas
                          )
                        }
                        className="sm:hidden inline-flex items-center gap-1.5 text-xs font-bold text-danger mt-2"
                      >
                        <Trash2 size={14} />
                        Remover
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <aside className="mt-6 lg:mt-0">
          <div className="card p-5 sm:p-6 lg:sticky lg:top-24">
            <div className="flex items-center gap-2 mb-5">
              <Package size={20} className="text-gold" />

              <h2 className="font-display text-xl font-bold text-primary">
                Resumo do pedido
              </h2>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-gray-600">
                <span>Itens</span>
                <span className="font-semibold">
                  {cartCount}
                </span>
              </div>

              <div className="flex items-center justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-semibold">
                  {formatMoney(subtotal)}
                </span>
              </div>

              <div className="flex items-center justify-between text-gray-600">
                <span>Entrega</span>
                <span className="font-semibold text-success">
                  A combinar
                </span>
              </div>
            </div>

            <div className="h-px bg-gray-200 my-5" />

            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-sm text-gray-500">
                  Total
                </p>

                <p className="font-display font-bold text-3xl text-primary">
                  {formatMoney(subtotal)}
                </p>
              </div>

              <span className="text-xs text-gray-400 text-right">
                Sem cobrança online
              </span>
            </div>

            <div className="space-y-3 mt-6">
              <button
                type="button"
                onClick={() => navigate('/checkout')}
                className="btn btn-primary w-full text-base"
              >
                Finalizar pedido
                <ArrowRight size={18} />
              </button>

              <button
                type="button"
                onClick={handlePedidoRapido}
                className="btn btn-whats w-full text-base"
              >
                <MessageCircle size={18} />
                Pedido rápido pelo WhatsApp
              </button>
            </div>

            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3 mt-5">
              <div className="flex items-start gap-2.5">
                <ShieldCheck
                  size={18}
                  className="text-emerald-700 shrink-0 mt-0.5"
                />

                <p className="text-xs text-emerald-800 leading-relaxed">
                  O pagamento não é realizado pelo site. A gráfica
                  confirmará prazo, entrega e forma de pagamento pelo
                  WhatsApp.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="sm:hidden fixed bottom-16 left-0 right-0 z-30 bg-white border-t border-gray-100 p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.10)]">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
              Total do carrinho
            </p>

            <p className="font-display text-2xl font-bold text-primary">
              {formatMoney(subtotal)}
            </p>
          </div>

          <span className="text-xs text-gray-500">
            {cartCount} {cartCount === 1 ? 'item' : 'itens'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => navigate('/checkout')}
          className="btn btn-primary w-full"
        >
          Finalizar pedido
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}

export default Carrinho;