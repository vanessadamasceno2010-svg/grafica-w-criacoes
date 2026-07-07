import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  BadgeCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ImageIcon,
  Maximize2,
  Minus,
  Package,
  Plus,
  Share2,
  ShoppingCart,
  Star,
  X,
  Zap
} from 'lucide-react';

import {
  Product,
  ProductVariation,
  apiFetch,
  formatMoney,
  normalizeProduct
} from '../lib/api';
import { useApp } from '../contexts/AppContext';
import { BottomSheet } from '../components/BottomSheet';
import { shareProduct } from '../lib/share';

const FALLBACK_IMAGE = '/assets/chaveiros-personalizados.jpeg';

function activeVariations(product?: Product | null) {
  return Array.isArray(product?.variacoes)
    ? product.variacoes.filter(
        (variation) =>
          variation &&
          variation.ativo !== false &&
          Number(variation.preco || 0) > 0
      )
    : [];
}

function variationOptions(variation: ProductVariation) {
  const options: Record<string, string> = {
    ...(variation.opcoes &&
    typeof variation.opcoes === 'object' &&
    !Array.isArray(variation.opcoes)
      ? variation.opcoes
      : {})
  };

  if (Object.keys(options).length === 0) {
    if (variation.tamanho) options.Tamanho = variation.tamanho;
    if (variation.acabamento) options.Acabamento = variation.acabamento;
    if (variation.quantidade) options.Quantidade = variation.quantidade;
    if (variation.modelo) options.Modelo = variation.modelo;
  }

  return options;
}

function variationLabel(variation: ProductVariation) {
  const details = Array.from(
    new Set(Object.values(variationOptions(variation)).filter(Boolean))
  );

  if (details.length > 0) return details.join(' • ');

  return variation.nome || 'Variação';
}

function normalizeSearchText(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-');
}

function asNumber(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function uniqueImages(product: Product | null) {
  if (!product) return [FALLBACK_IMAGE];

  const images = [
    product.imagem_principal,
    ...(Array.isArray(product.imagens_adicionais)
      ? product.imagens_adicionais
      : [])
  ]
    .map((image) => String(image || '').trim())
    .filter(Boolean);

  return Array.from(new Set(images.length > 0 ? images : [FALLBACK_IMAGE]));
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
  const [showCartSheet, setShowCartSheet] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);

  useEffect(() => {
    if (!slug) return;

    const applyProduct = (data: unknown) => {
      const normalized = normalizeProduct(data);
      const variations = activeVariations(normalized);

      setProduct(normalized);
      setQuantity(1);
      setImageIndex(0);

      if (variations[0]?.id) {
        setSelectedVariationId(String(variations[0].id));
      } else {
        setSelectedVariationId('');
      }

      const initial: Record<string, string> = variations[0]
        ? variationOptions(variations[0])
        : {};

      if (!variations[0]) {
        Object.entries(normalized.especificacoes || {}).forEach(
          ([key, values]) => {
            if (Array.isArray(values) && values[0]) {
              initial[key] = String(values[0]);
            }
          }
        );
      }

      setSelectedSpecs(initial);
    };

    const findFallbackProduct = async () => {
      const response = await apiFetch<{ data: unknown[] }>('/produtos?limit=100');
      const rawTerm = decodeURIComponent(slug).trim();
      const term = rawTerm.toLowerCase();
      const normalizedTerm = normalizeSearchText(rawTerm);

      const found = (response.data || []).find((item: any) => {
        const id = String(item?.id || '').toLowerCase();
        const slugValue = String(item?.slug || '').toLowerCase();
        const name = String(item?.nome || '').toLowerCase();
        const normalizedName = normalizeSearchText(item?.nome);
        const normalizedSlug = normalizeSearchText(item?.slug);

        return (
          id === term ||
          slugValue === term ||
          name === term ||
          name.startsWith(term) ||
          normalizedSlug === normalizedTerm ||
          normalizedName === normalizedTerm ||
          normalizedName.startsWith(normalizedTerm)
        );
      });

      if (!found) throw new Error('Produto não encontrado.');

      return found;
    };

    setLoading(true);

    apiFetch<unknown>('/produtos/' + encodeURIComponent(slug))
      .catch(findFallbackProduct)
      .then(applyProduct)
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const variations = useMemo(() => activeVariations(product), [product]);

  const filterGroups = useMemo(() => {
    const names: string[] = [];

    const addName = (name: string) => {
      if (name && !names.includes(name)) names.push(name);
    };

    Object.keys(product?.especificacoes || {}).forEach(addName);

    variations.forEach((variation) => {
      Object.keys(variationOptions(variation)).forEach(addName);
    });

    return names
      .map((name) => ({
        name,
        values: Array.from(
          new Set(
            variations
              .map((variation) => variationOptions(variation)[name])
              .filter(Boolean)
          )
        )
      }))
      .filter((group) => group.values.length > 0);
  }, [product, variations]);

  const selectedVariation = useMemo(() => {
    const exactMatch = variations.find((variation) => {
      const options = variationOptions(variation);

      return filterGroups.every(
        (group) => options[group.name] === selectedSpecs[group.name]
      );
    });

    return (
      exactMatch ||
      variations.find(
        (variation) =>
          String(variation.id) === String(selectedVariationId)
      ) ||
      variations[0] ||
      null
    );
  }, [variations, filterGroups, selectedSpecs, selectedVariationId]);

  const allImages = useMemo(() => uniqueImages(product), [product]);

  useEffect(() => {
    if (imageIndex >= allImages.length) {
      setImageIndex(0);
    }
  }, [allImages.length, imageIndex]);

  const selectFilterValue = (groupName: string, value: string) => {
    const groupIndex = filterGroups.findIndex(
      (group) => group.name === groupName
    );

    const previousChoices = Object.fromEntries(
      filterGroups
        .slice(0, groupIndex)
        .map((group) => [group.name, selectedSpecs[group.name]])
    );

    const partialSelection = {
      ...previousChoices,
      [groupName]: value
    };

    const match = variations.find((variation) => {
      const options = variationOptions(variation);

      return Object.entries(partialSelection).every(
        ([name, selectedValue]) => options[name] === selectedValue
      );
    });

    if (!match) return;

    setSelectedSpecs(variationOptions(match));

    if (match.id) {
      setSelectedVariationId(String(match.id));
    }
  };

  const isFilterValueAvailable = (groupName: string, value: string) => {
    return variations.some((variation) => {
      const options = variationOptions(variation);

      if (options[groupName] !== value) return false;

      const groupIndex = filterGroups.findIndex(
        (group) => group.name === groupName
      );

      return filterGroups.slice(0, groupIndex).every(
        (group) =>
          !selectedSpecs[group.name] ||
          options[group.name] === selectedSpecs[group.name]
      );
    });
  };

  const unitPrice = selectedVariation
    ? asNumber(selectedVariation.preco)
    : asNumber(product?.preco);

  const deliveryDays = selectedVariation
    ? Math.max(
        1,
        asNumber(
          selectedVariation.prazo_entrega_dias ||
            product?.tempo_producao ||
            3
        )
      )
    : Math.max(1, asNumber(product?.tempo_producao || 3));

  const selectedStock = selectedVariation
    ? asNumber(selectedVariation.estoque)
    : asNumber(product?.estoque);

  const totalPrice = unitPrice * quantity;
  const isActive = product?.ativo !== false;
  const selectionComplete =
    variations.length === 0 ||
    (Boolean(selectedVariation) &&
      filterGroups.every((group) => Boolean(selectedSpecs[group.name])));

  const canPurchase = isActive && unitPrice > 0 && selectionComplete;

  const selectedEntries = Object.entries(selectedSpecs).filter(
    ([, value]) => Boolean(value)
  );

  const cartProduct = product
    ? {
        ...product,
        preco: unitPrice
      }
    : null;

  const specsForCart = {
    ...selectedSpecs,
    ...(selectedVariation
      ? {
          Variação: variationLabel(selectedVariation),
          'Preço da variação': formatMoney(unitPrice),
          'Prazo estimado': `${deliveryDays} dias úteis`
        }
      : {})
  };

  const changeQuantity = (nextQuantity: number) => {
    const minimum = Math.max(1, nextQuantity);
    const maximum = selectedStock > 0 ? selectedStock : minimum;

    setQuantity(selectedStock > 0 ? Math.min(minimum, maximum) : minimum);
  };

  const validatePurchase = () => {
    if (!isActive) {
      alert('Este produto está temporariamente indisponível.');
      return false;
    }

    if (!selectionComplete) {
      alert('Selecione todas as opções do produto.');
      return false;
    }

    if (unitPrice <= 0) {
      alert('Não foi possível identificar o preço desta opção.');
      return false;
    }

    return true;
  };

  const handleAddToCart = () => {
    if (!cartProduct || !validatePurchase()) return;

    try {
      addToCart(cartProduct, quantity, specsForCart);
      setShowCartSheet(true);
    } catch (error) {
      console.error(error);
      alert(
        'Não foi possível adicionar ao carrinho. Recarregue a página e tente novamente.'
      );
    }
  };

  const handleShare = async () => {
    if (!product) return;

    try {
      await shareProduct(product, {
        price: unitPrice,
        variationLabel: selectedVariation
          ? variationLabel(selectedVariation)
          : undefined,
        prazoEntrega: `${deliveryDays} dias úteis`
      });
    } catch (error) {
      console.error(error);
      alert('Não foi possível compartilhar este produto. Tente novamente.');
    }
  };

  const handleBuyNow = () => {
    if (!cartProduct || !validatePurchase()) return;

    try {
      addToCart(cartProduct, quantity, specsForCart);
      window.setTimeout(() => navigate('/checkout'), 80);
    } catch (error) {
      console.error(error);
      alert(
        'Não foi possível continuar para a compra. Recarregue a página e tente novamente.'
      );
    }
  };

  const nextImage = () => {
    setImageIndex((current) => (current + 1) % allImages.length);
  };

  const previousImage = () => {
    setImageIndex(
      (current) => (current - 1 + allImages.length) % allImages.length
    );
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-2 gap-8 animate-pulse">
          <div className="aspect-square rounded-3xl bg-gray-100" />
          <div className="space-y-4 py-4">
            <div className="h-6 bg-gray-100 rounded-xl w-32" />
            <div className="h-10 bg-gray-100 rounded-xl w-4/5" />
            <div className="h-8 bg-gray-100 rounded-xl w-2/5" />
            <div className="h-28 bg-gray-100 rounded-2xl" />
            <div className="h-40 bg-gray-100 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-5">
          <Package size={34} className="text-gray-400" />
        </div>

        <h1 className="font-display text-3xl font-bold text-primary mb-3">
          Produto não encontrado
        </h1>

        <p className="text-gray-500 mb-6">
          O produto pode ter sido removido ou o endereço está incorreto.
        </p>

        <Link to="/catalogo" className="btn btn-primary">
          Voltar ao catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="fade-in max-w-6xl mx-auto pb-44 sm:pb-10">
      <div className="px-0 sm:px-4 lg:px-0 pt-0 sm:pt-6">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-6 lg:gap-10">
          <section>
            <div className="relative aspect-square overflow-hidden bg-gray-100 sm:rounded-3xl group">
              <img
                src={allImages[imageIndex] || FALLBACK_IMAGE}
                alt={product.nome}
                className="w-full h-full object-cover"
                onError={(event) => {
                  event.currentTarget.src = FALLBACK_IMAGE;
                }}
              />

              <Link
                to="/catalogo"
                className="absolute top-4 left-4 w-11 h-11 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-lg"
                aria-label="Voltar ao catálogo"
              >
                <ChevronLeft size={21} className="text-primary" />
              </Link>

              <button
                type="button"
                onClick={() => setShowImagePreview(true)}
                className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-lg"
                aria-label="Ampliar imagem"
              >
                <Maximize2 size={19} className="text-primary" />
              </button>

              {allImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={previousImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-lg active:scale-95 transition"
                    aria-label="Imagem anterior"
                  >
                    <ChevronLeft size={22} className="text-primary" />
                  </button>

                  <button
                    type="button"
                    onClick={nextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-lg active:scale-95 transition"
                    aria-label="Próxima imagem"
                  >
                    <ChevronRight size={22} className="text-primary" />
                  </button>
                </>
              )}

              <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-black/60 text-white text-xs font-bold backdrop-blur">
                {imageIndex + 1}/{allImages.length}
              </div>
            </div>

            {allImages.length > 1 && (
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 mt-3 px-3 sm:px-0">
                {allImages.map((image, index) => (
                  <button
                    type="button"
                    key={`${image}-${index}`}
                    onClick={() => setImageIndex(index)}
                    className={`aspect-square rounded-xl overflow-hidden border-2 transition ${
                      index === imageIndex
                        ? 'border-gold ring-2 ring-gold/20'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={image}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(event) => {
                        event.currentTarget.src = FALLBACK_IMAGE;
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="px-4 sm:px-0 lg:sticky lg:top-24 lg:self-start">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <span className="inline-flex px-3 py-1.5 rounded-full bg-gold/10 text-gold text-xs font-bold uppercase tracking-wider">
                {product.categoria_nome || 'Produto personalizado'}
              </span>

              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-primary"
              >
                <Share2 size={17} />
                Compartilhar
              </button>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl font-bold text-primary leading-tight">
              {product.nome}
            </h1>

            <div className="flex flex-wrap items-center gap-3 mt-4 text-sm">
              <div className="inline-flex items-center gap-1.5">
                <Star size={16} className="text-gold fill-current" />
                <span className="font-bold text-primary">
                  {asNumber(product.avaliacao_media || 5).toFixed(1)}
                </span>
                <span className="text-gray-400">
                  ({asNumber(product.avaliacoes_total)} avaliações)
                </span>
              </div>

              <span className="hidden sm:inline text-gray-300">•</span>

              <div className="inline-flex items-center gap-1.5 text-gray-600">
                <Clock size={16} />
                {deliveryDays} dias úteis
              </div>
            </div>

            <p className="text-gray-600 leading-relaxed mt-5">
              {product.descricao}
            </p>

            <div className="rounded-3xl border border-gray-100 bg-white p-4 sm:p-5 mt-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  {product.preco_original &&
                    product.preco_original > unitPrice && (
                      <p className="text-base text-gray-400 line-through">
                        {formatMoney(product.preco_original)}
                      </p>
                    )}

                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                    {variations.length > 0
                      ? 'Preço da opção selecionada'
                      : 'Preço unitário'}
                  </p>

                  <p className="font-display text-4xl font-bold text-primary mt-1">
                    {formatMoney(unitPrice)}
                  </p>
                </div>

                <div className="sm:text-right">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${
                      !isActive
                        ? 'bg-gray-100 text-gray-600 border-gray-200'
                        : selectedStock > 0
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    <CheckCircle2 size={14} />
                    {!isActive
                      ? 'Indisponível'
                      : selectedStock > 0
                        ? `${selectedStock} disponível(is)`
                        : 'Produção sob encomenda'}
                  </span>
                </div>
              </div>
            </div>

            {variations.length > 0 && (
              <div className="space-y-5 mt-5 rounded-3xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm">
                <div>
                  <h2 className="font-display text-lg font-bold text-primary">
                    Escolha sua opção
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    O preço e o prazo mudam conforme as escolhas disponíveis.
                  </p>
                </div>

                {filterGroups.map((group) => (
                  <div key={group.name}>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <label className="text-sm font-bold text-gray-700">
                        {group.name}
                      </label>

                      {selectedSpecs[group.name] && (
                        <span className="text-xs text-primary font-bold">
                          {selectedSpecs[group.name]}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {group.values.map((value) => {
                        const selected =
                          selectedSpecs[group.name] === value;
                        const available = isFilterValueAvailable(
                          group.name,
                          value
                        );

                        return (
                          <button
                            type="button"
                            key={value}
                            disabled={!available}
                            onClick={() =>
                              selectFilterValue(group.name, value)
                            }
                            className={`px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                              selected
                                ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                                : available
                                  ? 'bg-white border-gray-200 text-gray-700 hover:border-gold hover:bg-gold/5'
                                  : 'bg-gray-50 border-gray-100 text-gray-300 line-through cursor-not-allowed'
                            }`}
                          >
                            {value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {selectedVariation && (
                  <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3.5">
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-700/70">
                      Combinação selecionada
                    </p>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1">
                      <p className="font-bold text-primary">
                        {variationLabel(selectedVariation)}
                      </p>

                      <div className="sm:text-right">
                        <p className="font-bold text-primary">
                          {formatMoney(unitPrice)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Entrega em {deliveryDays} dias úteis
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {variations.length === 0 &&
              Object.keys(product.especificacoes || {}).length > 0 && (
                <div className="space-y-4 mt-5 rounded-3xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm">
                  <h2 className="font-display text-lg font-bold text-primary">
                    Escolha as opções
                  </h2>

                  {Object.entries(product.especificacoes || {}).map(
                    ([key, values]) =>
                      Array.isArray(values) && values.length > 0 ? (
                        <div key={key}>
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            {key}
                          </label>

                          <div className="flex flex-wrap gap-2">
                            {values.map((value) => (
                              <button
                                type="button"
                                key={String(value)}
                                onClick={() =>
                                  setSelectedSpecs((current) => ({
                                    ...current,
                                    [key]: String(value)
                                  }))
                                }
                                className={`px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                                  selectedSpecs[key] === String(value)
                                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                                    : 'bg-white border-gray-200 text-gray-700 hover:border-gold hover:bg-gold/5'
                                }`}
                              >
                                {String(value)}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null
                  )}
                </div>
              )}

            <div className="rounded-3xl border border-gray-100 bg-white p-4 sm:p-5 mt-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-primary">
                    {filterGroups.some((group) =>
                      group.name.toLowerCase().includes('quant')
                    )
                      ? 'Número de conjuntos'
                      : 'Quantidade'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Total atualizado automaticamente
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-2xl bg-gray-100 p-1.5">
                  <button
                    type="button"
                    onClick={() => changeQuantity(quantity - 1)}
                    className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm"
                    aria-label="Diminuir quantidade"
                  >
                    <Minus size={18} />
                  </button>

                  <span className="font-display text-xl font-bold text-primary min-w-10 text-center">
                    {quantity}
                  </span>

                  <button
                    type="button"
                    onClick={() => changeQuantity(quantity + 1)}
                    className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm"
                    aria-label="Aumentar quantidade"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-100 mt-4 pt-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                    Total do pedido
                  </p>
                  <p className="font-display text-3xl font-bold text-primary mt-1">
                    {formatMoney(totalPrice)}
                  </p>
                </div>

                <p className="text-xs text-gray-500 text-right">
                  {quantity} × {formatMoney(unitPrice)}
                </p>
              </div>
            </div>

            {selectedEntries.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedEntries.map(([name, value]) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold"
                  >
                    <BadgeCheck size={14} className="text-emerald-600" />
                    {name}: {value}
                  </span>
                ))}
              </div>
            )}

            <div className="hidden sm:grid sm:grid-cols-3 gap-3 mt-5">
              <button
                type="button"
                onClick={handleShare}
                className="btn btn-outline text-base"
              >
                <Share2 size={20} />
                Compartilhar
              </button>

              <button
                type="button"
                onClick={handleAddToCart}
                className="btn btn-outline text-base"
                disabled={!canPurchase}
              >
                <ShoppingCart size={20} />
                Adicionar
              </button>

              <button
                type="button"
                onClick={handleBuyNow}
                className="btn btn-primary text-base"
                disabled={!canPurchase}
              >
                <Zap size={20} />
                Comprar agora
              </button>
            </div>
          </section>
        </div>
      </div>

      <div className="px-4 lg:px-0 mt-8 sm:mt-12 grid lg:grid-cols-[1fr_320px] gap-5">
        <div className="card p-5 sm:p-6">
          <h2 className="font-display text-xl font-bold text-primary mb-4">
            Descrição completa
          </h2>

          <p className="text-gray-600 leading-relaxed whitespace-pre-line">
            {product.descricao_longa || product.descricao}
          </p>
        </div>

        <div className="card p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold text-primary mb-4">
            Informações do pedido
          </h2>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <Clock size={17} />
              </div>
              <div>
                <p className="font-bold text-primary">Prazo estimado</p>
                <p className="text-sm text-gray-500">
                  {deliveryDays} dias úteis para produção/entrega.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 size={17} />
              </div>
              <div>
                <p className="font-bold text-primary">Opções revisadas</p>
                <p className="text-sm text-gray-500">
                  Confira as escolhas antes de concluir a compra.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <ImageIcon size={17} />
              </div>
              <div>
                <p className="font-bold text-primary">Produto personalizado</p>
                <p className="text-sm text-gray-500">
                  As características escolhidas seguem junto ao pedido.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sm:hidden fixed bottom-16 left-0 right-0 bg-white border-t border-gray-100 p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.10)] z-30">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
              Total
            </p>
            <p className="font-display text-2xl font-bold text-primary truncate">
              {formatMoney(totalPrice)}
            </p>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => changeQuantity(quantity - 1)}
              className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-primary shadow-sm"
              aria-label="Diminuir quantidade"
            >
              <Minus size={17} />
            </button>

            <span className="font-bold text-primary w-8 text-center">
              {quantity}
            </span>

            <button
              type="button"
              onClick={() => changeQuantity(quantity + 1)}
              className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-primary shadow-sm"
              aria-label="Aumentar quantidade"
            >
              <Plus size={17} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-[48px_48px_1fr] gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="btn btn-outline px-0"
            aria-label="Compartilhar produto"
          >
            <Share2 size={18} />
          </button>

          <button
            type="button"
            onClick={handleAddToCart}
            className="btn btn-outline px-0"
            aria-label="Adicionar ao carrinho"
            disabled={!canPurchase}
          >
            <ShoppingCart size={18} />
          </button>

          <button
            type="button"
            onClick={handleBuyNow}
            className="btn btn-primary"
            disabled={!canPurchase}
          >
            <Zap size={18} />
            Comprar agora
          </button>
        </div>
      </div>

      {showImagePreview && (
        <div className="fixed inset-0 z-[99999] bg-black/90 flex items-center justify-center p-3 sm:p-8">
          <button
            type="button"
            onClick={() => setShowImagePreview(false)}
            className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/90 flex items-center justify-center"
            aria-label="Fechar imagem"
          >
            <X size={22} className="text-primary" />
          </button>

          {allImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={previousImage}
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 flex items-center justify-center"
                aria-label="Imagem anterior"
              >
                <ChevronLeft size={22} className="text-primary" />
              </button>

              <button
                type="button"
                onClick={nextImage}
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 flex items-center justify-center"
                aria-label="Próxima imagem"
              >
                <ChevronRight size={22} className="text-primary" />
              </button>
            </>
          )}

          <img
            src={allImages[imageIndex] || FALLBACK_IMAGE}
            alt={product.nome}
            className="max-w-full max-h-[88vh] object-contain rounded-2xl"
            onError={(event) => {
              event.currentTarget.src = FALLBACK_IMAGE;
            }}
          />
        </div>
      )}

      <BottomSheet
        isOpen={showCartSheet}
        onClose={() => setShowCartSheet(false)}
        title="Produto adicionado"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <ShoppingCart size={32} className="text-success" />
          </div>

          <h3 className="font-display text-xl font-bold text-primary">
            Adicionado ao carrinho
          </h3>

          <p className="text-gray-600 mt-2 mb-5">
            <span className="font-bold text-primary">{product.nome}</span>{' '}
            foi adicionado com as opções selecionadas.
          </p>

          <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3 text-left mb-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-gray-500">Quantidade</span>
              <span className="font-bold text-primary">{quantity}</span>
            </div>

            <div className="flex items-center justify-between gap-3 mt-2">
              <span className="text-sm text-gray-500">Total</span>
              <span className="font-bold text-primary">
                {formatMoney(totalPrice)}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              to="/carrinho"
              className="btn btn-primary w-full"
              onClick={() => setShowCartSheet(false)}
            >
              Ver carrinho
            </Link>

            <button
              type="button"
              onClick={() => setShowCartSheet(false)}
              className="btn btn-outline w-full"
            >
              Continuar comprando
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

export default Produto;