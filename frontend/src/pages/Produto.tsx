import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Star, Clock, ChevronLeft, ChevronRight, ShoppingCart, Zap } from 'lucide-react';
import { Product, ProductVariation, apiFetch, formatMoney, normalizeProduct } from '../lib/api';
import { useApp } from '../contexts/AppContext';
import { BottomSheet } from '../components/BottomSheet';

function activeVariations(product?: Product | null) {
  return Array.isArray(product?.variacoes)
    ? product!.variacoes!.filter((v) => v && v.ativo !== false && Number(v.preco || 0) > 0)
    : [];
}

function variationOptions(v: ProductVariation) {
  const options: Record<string, string> = { ...(v.opcoes || {}) };
  if (Object.keys(options).length === 0) {
    if (v.tamanho) options.Tamanho = v.tamanho;
    if (v.acabamento) options.Acabamento = v.acabamento;
    if (v.quantidade) options.Quantidade = v.quantidade;
    if (v.modelo) options.Modelo = v.modelo;
  }
  return options;
}

function variationLabel(v: ProductVariation) {
  const details = Array.from(new Set(Object.values(variationOptions(v)).filter(Boolean)));
  return details.length > 0 ? details.join(' • ') : v.nome || 'Variação';
}

export function Produto() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addToCart } = useApp();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariationId, setSelectedVariationId] = useState('');
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string>>({});
  const [imageIndex, setImageIndex] = useState(0);

  // === LÓGICA DE CARREGAMENTO (mantida) ===
  useEffect(() => {
    if (!slug) return;
    setLoading(true);

    const applyProduct = (data: any) => {
      const normalized = normalizeProduct(data);
      setProduct(normalized);
      const vars = activeVariations(normalized);
      if (vars[0]?.id) setSelectedVariationId(String(vars[0].id));
      setSelectedSpecs(vars[0] ? variationOptions(vars[0]) : {});
    };

    apiFetch<any>('/produtos/' + encodeURIComponent(slug))
      .then(applyProduct)
      .catch(async () => {
        // fallback
        const res = await apiFetch<{ data: any[] }>('/produtos?limit=100');
        const term = decodeURIComponent(slug).toLowerCase();
        const found = (res.data || []).find((p: any) => 
          String(p.slug || p.id || p.nome).toLowerCase().includes(term)
        );
        if (found) applyProduct(found);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const variations = useMemo(() => activeVariations(product), [product]);
  const filterGroups = useMemo(() => {
    const names = [...new Set([
      ...Object.keys(product?.especificacoes || {}),
      ...variations.flatMap(v => Object.keys(variationOptions(v)))
    ])];

    return names.map(name => ({
      name,
      values: [...new Set(variations.map(v => variationOptions(v)[name]).filter(Boolean))]
    })).filter(g => g.values.length > 0);
  }, [product, variations]);

  const selectedVariation = variations.find(v => 
    Object.entries(selectedSpecs).every(([k, val]) => variationOptions(v)[k] === val)
  ) || variations[0] || null;

  const unitPrice = selectedVariation ? Number(selectedVariation.preco || 0) : Number(product?.preco || 0);
  const deliveryDays = Math.max(1, Number(selectedVariation?.prazo_entrega_dias || product?.tempo_producao || 3));
  const totalPrice = unitPrice * quantity;
  const allImages = product ? [product.imagem_principal, ...(product.imagens_adicionais || [])].filter(Boolean) : [];

  const handleAddToCart = () => { /* ... mesma lógica */ };
  const handleBuyNow = () => { /* ... mesma lógica */ };

  if (loading) return <div className="p-8 text-center">Carregando...</div>;
  if (!product) return <div className="p-8 text-center">Produto não encontrado</div>;

  return (
    <div className="fade-in max-w-5xl mx-auto pb-28 sm:pb-12">
      {/* Imagem Mobile - Corrigida */}
      <div className="sm:hidden relative bg-white border-b">
        <div className="aspect-[4/3] relative overflow-hidden">
          <img 
            src={allImages[imageIndex] || product.imagem_principal} 
            alt={product.nome} 
            className="w-full h-full object-contain bg-white p-4" 
          />
        </div>
      </div>

      <div className="px-4 sm:px-6">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-primary mt-6 mb-4">{product.nome}</h1>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-1"><Star size={18} className="text-gold fill-current" /> 5.0</div>
          <div className="flex items-center gap-1 text-gray-500"><Clock size={18} /> {deliveryDays} dias úteis</div>
        </div>

        <p className="text-4xl font-display font-bold text-primary mb-6">{formatMoney(unitPrice)}</p>

        <p className="text-gray-600 leading-relaxed mb-8">{product.descricao}</p>

        {/* === VARIAÇÕES SEM "MONTE SUA OPÇÃO" === */}
        {(variations.length > 0 || Object.keys(product.especificacoes || {}).length > 0) && (
          <div className="mb-8">
            {filterGroups.map((group) => (
              <div key={group.name} className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-3">{group.name}</label>
                <div className="flex flex-wrap gap-3">
                  {group.values.map((value) => (
                    <button
                      key={value}
                      onClick={() => {/* lógica de seleção */}}
                      className={`px-6 py-3 rounded-2xl text-sm font-medium ${/* selected logic */}`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quantidade */}
        <div className="mb-8">
          <label className="block text-sm font-bold text-gray-700 mb-3">Quantidade</label>
          <div className="flex items-center gap-4">
            <button onClick={() => setQuantity(q => Math.max(1, q-1))} className="w-14 h-14 rounded-2xl bg-gray-100 text-3xl font-bold">-</button>
            <span className="font-display text-3xl font-bold w-16 text-center">{quantity}</span>
            <button onClick={() => setQuantity(q => q + 1)} className="w-14 h-14 rounded-2xl bg-gray-100 text-3xl font-bold">+</button>
          </div>
        </div>

        {/* DESCRIÇÃO LONGA - FORÇADA A APARECER */}
        <div className="card p-6 mb-20">
          <h2 className="font-display text-2xl font-bold text-primary mb-4">Descrição Completa</h2>
          <div className="max-h-[400px] overflow-y-auto pr-2 text-gray-600 leading-relaxed whitespace-pre-line">
            {product.descricao_longa || product.descricao || 'Descrição não disponível.'}
          </div>
        </div>
      </div>

      {/* Botão fixo mobile */}
      <div className="sm:hidden fixed bottom-16 left-0 right-0 bg-white border-t p-4 shadow-2xl z-50">
        <div className="flex justify-between mb-4">
          <div>
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-2xl font-display font-bold text-primary">{formatMoney(totalPrice)}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setQuantity(q => Math.max(1,q-1))} className="w-11 h-11 rounded-xl bg-gray-100 text-2xl">-</button>
            <span className="text-2xl font-bold w-10 text-center self-center">{quantity}</span>
            <button onClick={() => setQuantity(q => q+1)} className="w-11 h-11 rounded-xl bg-gray-100 text-2xl">+</button>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={handleAddToCart} className="btn btn-outline flex-1">Carrinho</button>
          <button onClick={handleBuyNow} className="btn btn-primary flex-[2]">Comprar Agora</button>
        </div>
      </div>
    </div>
  );
}