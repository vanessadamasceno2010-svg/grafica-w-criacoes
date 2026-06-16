import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Star,
  Clock,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Zap,
  Loader2
} from 'lucide-react';
import { apiFetch, formatMoney, Product, ProductVariation } from '../lib/api';
import { useApp } from '../contexts/AppContext';
import { BottomSheet } from '../components/BottomSheet';

function activeVariations(product?: Product | null) {
  if (!product || !Array.isArray(product.variacoes)) return [];

  return product.variacoes.filter((v) => v && v.ativo !== false && Number(v.preco || 0) > 0);
}

function variationLabel(v: ProductVariation) {
  const parts = [v.nome, v.quantidade].filter(Boolean);
  return parts.join(' • ') || 'Variação';
}

export function Produto() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addToCart } = useApp();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string>>({});
  const [selectedVariationIndex, setSelectedVariationIndex] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);
  const [showCartSheet, setShowCartSheet] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);

      try {
        const data = await apiFetch<Product>('/produtos/' + encodeURIComponent(slug || ''));

        if (!active) return;

        setProduct(data);

        const initial: Record<string, string> = {};
        Object.entries(data.especificacoes || {}).forEach(([key, values]: any) => {
          if (Array.isArray(values) && values[0]) initial[key] = values[0];
        });

        const vars = activeVariations(data);

        if (vars[0]) {
          initial['Variação'] = variationLabel(vars[0]);

          Object.entries(vars[0].opcoes || {}).forEach(([key, value]) => {
            initial[key] = String(value);
          });
        }

        setSelectedSpecs(initial);
        setSelectedVariationIndex(0);
      } catch (err: any) {
        alert(err.message || 'Produto não encontrado.');
        navigate('/catalogo');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [slug, navigate]);

  const variations = activeVariations(product);

  const selectedVariation = variations[selectedVariationIndex] || null;

  const unitPrice = selectedVariation ? Number(selectedVariation.preco || 0) : Number(product?.preco || 0);

  const totalPrice = unitPrice * quantity;

  const allImages = useMemo(() => {
    if (!product) return [];

    return [product.imagem_principal, ...(product.imagens_adicionais || [])].filter(Boolean);
  }, [product]);

  function selectVariation(index: number) {
    const v = variations[index];

    setSelectedVariationIndex(index);

    if (!v) return;

    setSelectedSpecs((prev) => {
      const next = {
        ...prev,
        Variação: variationLabel(v)
      };

      Object.entries(v.opcoes || {}).forEach(([key, value]) => {
        next[key] = String(value);
      });

      return next;
    });
  }

  const productForCart = () => {
    if (!product) return null;

    return {
      ...product,
      preco: unitPrice,
      estoque: selectedVariation ? Number(selectedVariation.estoque || product.estoque || 0) : product.estoque
    };
  };

  const handleAddToCart = () => {
    const p = productForCart();
    if (!p) return;

    addToCart(p, quantity, selectedSpecs);
    setShowCartSheet(false);
    navigate('/carrinho');
  };

  const handleBuyNow = () => {
    const p = productForCart();
    if (!p) return;

    addToCart(p, quantity, selectedSpecs);
    navigate('/checkout');
  };

  const nextImage = () => setImageIndex((prev) => (prev + 1) % Math.max(allImages.length, 1));
  const prevImage = () => setImageIndex((prev) => (prev - 1 + Math.max(allImages.length, 1)) % Math.max(allImages.length, 1));

  if (loading || !product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-primary">
        <Loader2 className="animate-spin mb-3" size={32} />
        <p className="font-bold">Carregando produto...</p>
      </div>
    );
  }

  return (
    <div className="fade-in max-w-5xl mx-auto pb-24 sm:pb-8">
      <div className="relative bg-gray-100 sm:hidden">
        <div className="aspect-square relative overflow-hidden">
          <img
            src={allImages[imageIndex] || product.imagem_principal}
            alt={product.nome}
            className="w-full h-full object-cover"
          />

          {allImages.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow-lg active:scale-90 transition-transform"
              >
                <ChevronLeft size={20} className="text-primary" />
              </button>

              <button
                onClick={nextImage}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow-lg active:scale-90 transition-transform"
              >
                <ChevronRight size={20} className="text-primary" />
              </button>
            </>
          )}
        </div>

        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
          {allImages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setImageIndex(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === imageIndex ? 'bg-white w-6' : 'bg-white/50'
              }`}
            />
          ))}
        </div>

        <Link
          to="/catalogo"
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow-lg"
        >
          <ChevronLeft size={20} className="text-primary" />
        </Link>
      </div>

      <div className="px-4 sm:px-0 sm:grid sm:grid-cols-2 sm:gap-10 sm:mt-8">
        <div className="hidden sm:block">
          <div className="aspect-square rounded-3xl overflow-hidden bg-gray-100 mb-4">
            <img
              src={allImages[imageIndex] || product.imagem_principal}
              alt={product.nome}
              className="w-full h-full object-cover"
            />
          </div>

          {allImages.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setImageIndex(idx)}
                  className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all ${
                    idx === imageIndex ? 'border-gold' : 'border-transparent'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pt-6 sm:pt-0">
          <Link to="/catalogo" className="hidden sm:inline-flex items-center gap-1 text-gray-500 hover:text-primary mb-6">
            <ChevronLeft size={16} />
            Voltar ao catálogo
          </Link>

          <p className="text-sm font-bold text-gold uppercase tracking-wider mb-2">
            {product.categoria_nome}
          </p>

          <h1 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-3">
            {product.nome}
          </h1>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-1">
              <Star size={18} className="text-gold fill-current" />
              <span className="font-bold text-primary">{Number(product.avaliacao_media || 5).toFixed(1)}</span>
            </div>

            <span className="text-gray-300">•</span>

            <div className="flex items-center gap-1 text-gray-500">
              <Clock size={16} />
              <span>{product.tempo_producao} dias úteis</span>
            </div>
          </div>

          <p className="text-gray-600 leading-relaxed mb-6">
            {product.descricao_longa || product.descricao}
          </p>

          <div className="mb-6">
            {product.preco_original && product.preco_original > unitPrice && (
              <p className="text-gray-400 line-through text-lg">
                {formatMoney(product.preco_original)}
              </p>
            )}

            {variations.length > 0 && (
              <p className="text-sm font-bold text-gray-500 mb-1">Preço da opção selecionada</p>
            )}

            <p className="font-display text-4xl font-bold text-primary">
              {formatMoney(unitPrice)}
            </p>

            <p className="text-sm text-gray-500 mt-1">
              Total: {formatMoney(totalPrice)}
            </p>
          </div>

          {variations.length > 0 && (
            <div className="mb-6">
              <h3 className="font-bold text-primary mb-3">Escolha a variação</h3>

              <div className="grid gap-3">
                {variations.map((v, index) => (
                  <button
                    key={v.id || index}
                    type="button"
                    onClick={() => selectVariation(index)}
                    className={`text-left rounded-2xl border p-4 transition ${
                      index === selectedVariationIndex
                        ? 'border-gold bg-amber-50 ring-2 ring-gold/20'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-primary">{variationLabel(v)}</p>
                        {Object.keys(v.opcoes || {}).length > 0 && (
                          <p className="text-sm text-gray-500 mt-1">
                            {Object.entries(v.opcoes || {})
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(' | ')}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          Estoque: {Number(v.estoque || 0)}
                        </p>
                      </div>

                      <p className="font-bold text-primary">{formatMoney(v.preco)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {Object.entries(product.especificacoes || {}).map(([key, values]: any) => (
            <div key={key} className="mb-5">
              <h3 className="font-bold text-primary mb-3">{key}</h3>

              <div className="flex flex-wrap gap-2">
                {(Array.isArray(values) ? values : []).map((value: string) => (
                  <button
                    key={value}
                    onClick={() => setSelectedSpecs({ ...selectedSpecs, [key]: value })}
                    className={`px-4 py-2 rounded-xl border-2 font-medium transition-all ${
                      selectedSpecs[key] === value
                        ? 'border-gold bg-gold/10 text-primary'
                        : 'border-gray-200 text-gray-600 active:border-gray-300'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="mb-6">
            <h3 className="font-bold text-primary mb-3">Quantidade</h3>

            <div className="inline-flex items-center rounded-2xl border-2 border-gray-200 overflow-hidden">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-12 h-12 flex items-center justify-center text-xl font-bold active:bg-gray-100"
              >
                -
              </button>

              <span className="w-16 text-center font-bold text-primary">{quantity}</span>

              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-12 h-12 flex items-center justify-center text-xl font-bold active:bg-gray-100"
              >
                +
              </button>
            </div>
          </div>

          <div className="hidden sm:grid grid-cols-2 gap-3">
            <button onClick={() => setShowCartSheet(true)} className="btn btn-outline text-base">
              <ShoppingCart size={20} />
              Adicionar
            </button>

            <button onClick={handleBuyNow} className="btn btn-primary text-base">
              <Zap size={20} />
              Comprar agora
            </button>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 sm:hidden z-40">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-gray-500">Total</p>
            <p className="font-display font-bold text-xl text-primary">
              {formatMoney(totalPrice)}
            </p>
          </div>

          <button onClick={() => setShowCartSheet(true)} className="btn btn-outline px-4">
            <ShoppingCart size={20} />
          </button>

          <button onClick={handleBuyNow} className="btn btn-primary px-6">
            Comprar
          </button>
        </div>
      </div>

      <BottomSheet isOpen={showCartSheet} onClose={() => setShowCartSheet(false)} title="Confirmar item">
        <div className="space-y-4">
          <div className="flex gap-4">
            <img
              src={product.imagem_principal}
              alt={product.nome}
              className="w-20 h-20 rounded-2xl object-cover"
            />

            <div>
              <h3 className="font-bold text-primary">{product.nome}</h3>
              <p className="text-sm text-gray-500">{quantity} unidade(s)</p>
              <p className="font-bold text-primary">{formatMoney(totalPrice)}</p>
            </div>
          </div>

          {Object.keys(selectedSpecs).length > 0 && (
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="font-bold text-primary mb-2">Opções selecionadas</p>

              <div className="space-y-1">
                {Object.entries(selectedSpecs).map(([key, value]) => (
                  <p key={key} className="text-sm text-gray-600">
                    <b>{key}:</b> {value}
                  </p>
                ))}
              </div>
            </div>
          )}

          <button onClick={handleAddToCart} className="btn btn-primary w-full">
            Adicionar ao carrinho
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
