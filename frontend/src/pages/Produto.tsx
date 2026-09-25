import { productImages, visualKey, isQuantityOption } from '../lib/productImages';
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

    if (filterGroups.length > 0) return exactMatch || null;
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

  const allImages = useMemo(() => productImages(product, selectedVariation), [product, selectedVariation]);
  useEffect(() => { setImageIndex(0); }, [selectedVariation ? visualKey(selectedVariation) : '']);

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
        preco: unitPrice,
        imagem_principal: allImages[0]
      }
    : null;

  const specsForCart = {...selectedSpecs, ...(selectedVariation ? {_variacao_id:String(selectedVariation.id || '')} : {})};
  const quantityInOptions = filterGroups.some(group=>isQuantityOption(group.name));
  useEffect(()=>{if(quantityInOptions)setQuantity(1);},[quantityInOptions]);

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
    <div className="max-w-6xl mx-auto px-3 sm:px-5 py-4 pb-36 sm:pb-8">
      <Link to="/" className="text-sm text-gray-500 inline-block mb-3">← Voltar</Link>
      <div className="grid lg:grid-cols-2 gap-5 lg:gap-8">
        <section className="min-w-0">
          <button className="block w-full rounded-2xl bg-gray-50 overflow-hidden" aria-label="Ampliar imagem" onClick={()=>setShowImagePreview(true)}><img src={allImages[imageIndex] || FALLBACK_IMAGE} alt={product.nome} className="w-full h-[280px] sm:h-[420px] object-contain"/></button>
          {allImages.length>1 && <div className="flex gap-2 overflow-x-auto mt-2">{allImages.map((src,index)=><button key={src} aria-label={`Foto ${index+1}`} onClick={()=>setImageIndex(index)} className={`shrink-0 rounded-lg border-2 ${index===imageIndex?'border-gold':'border-transparent'}`}><img src={src} alt="" className="w-14 h-14 object-contain rounded-lg"/></button>)}</div>}
        </section>
        <section className="min-w-0">
          <div className="flex justify-between gap-2"><h1 className="font-display text-2xl sm:text-3xl font-bold text-primary">{product.nome}</h1><button aria-label="Compartilhar produto" onClick={handleShare} className="p-2 self-start text-gray-500"><Share2 size={18}/></button></div>
          <p className="text-sm text-gray-600 mt-2">{product.descricao}</p>
          <p className="flex items-center gap-1 text-xs text-gray-500 my-3"><Clock size={14}/>{deliveryDays} dias úteis</p>
          <div className="space-y-3 border-y border-gray-100 py-3">
          {variations.length>0 ? filterGroups.map(group=><div key={group.name}><p className="text-sm font-bold mb-2">{group.name}</p><div className="flex flex-wrap gap-2">{group.values.map(value=><button key={value} disabled={!isFilterValueAvailable(group.name,value)} onClick={()=>selectFilterValue(group.name,value)} className={`px-3 py-2 rounded-lg border text-sm disabled:opacity-30 disabled:line-through ${selectedSpecs[group.name]===value?'bg-primary border-primary text-white':'border-gray-200'}`}>{value}</button>)}</div></div>) : Object.entries(product.especificacoes || {}).map(([key,values])=>Array.isArray(values)&&values.length>0?<label key={key} className="block text-sm font-bold">{key}<select className="input mt-1" value={selectedSpecs[key]||''} onChange={e=>setSelectedSpecs(prev=>({...prev,[key]:e.target.value}))}>{values.map(value=><option key={String(value)}>{String(value)}</option>)}</select></label>:null)}
          </div>
          <div className="flex items-center justify-between gap-3 my-4"><div>{product.preco_original && product.preco_original>unitPrice ? <p className="line-through text-xs text-gray-400">{formatMoney(product.preco_original)}</p>:null}<p className="text-3xl font-bold text-primary">{formatMoney(totalPrice)}</p></div>
          {!quantityInOptions&&<div className="flex items-center gap-2"><button className="border rounded-lg w-10 h-10" aria-label="Diminuir quantidade" onClick={()=>changeQuantity(quantity-1)}>−</button><span>{quantity}</span><button className="border rounded-lg w-10 h-10" aria-label="Aumentar quantidade" onClick={()=>changeQuantity(quantity+1)}>+</button></div>}</div>
          <div className="grid grid-cols-2 gap-2 fixed sm:static bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 z-30 p-3 sm:p-0 bg-white border-t sm:border-0 shadow-lg sm:shadow-none">
            <button className="btn btn-outline px-2 text-xs sm:text-sm" onClick={handleAddToCart} disabled={!canPurchase}><ShoppingCart size={17}/>Adicionar ao carrinho</button>
            <button className="btn btn-primary px-2 text-xs sm:text-sm" onClick={handleBuyNow} disabled={!canPurchase}><Zap size={17}/>Comprar agora</button>
          </div>
          {product.descricao_longa && product.descricao_longa!==product.descricao && <details className="mt-5 text-sm border rounded-xl p-3"><summary className="cursor-pointer font-semibold">Descrição completa</summary><p className="mt-3 whitespace-pre-line text-gray-600">{product.descricao_longa}</p></details>}
        </section>
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