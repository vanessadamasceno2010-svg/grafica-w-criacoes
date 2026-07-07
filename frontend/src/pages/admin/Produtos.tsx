import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Trash2, Copy, X, Wand2, Package, CheckCircle2, AlertTriangle, Star, Filter, Eye, EyeOff } from 'lucide-react';
import {
  apiFetch,
  confirmAction,
  formatMoney,
  normalizeProduct,
  Product,
  ProductVariation,
  slugify
} from '../../lib/api';
import { BottomSheet } from '../../components/BottomSheet';

type Category = {
  id: string;
  nome: string;
  slug: string;
  descricao?: string;
  imagem_url?: string;
  ativo?: boolean;
};

type ProductForm = Product & {
  categoria_id: string;
  preco_original?: number | null;
  ativo?: boolean;
  variacoes: ProductVariation[];
};

type SpecGroup = {
  id: string;
  nome: string;
  valoresTexto: string;
};

const NEW_CATEGORY_VALUE = '__nova_categoria__';

const emptyProduct: ProductForm = {
  id: '',
  categoria_id: '',
  nome: '',
  slug: '',
  sku: '',
  descricao: '',
  descricao_longa: '',
  preco: 0,
  preco_original: null,
  estoque: 0,
  tempo_producao: 3,
  imagem_principal: '/assets/chaveiros-personalizados.jpeg',
  imagens_adicionais: [],
  especificacoes: {},
  destaque: false,
  ativo: true,
  peso: 0,
  dimensoes: {},
  variacoes: []
};

function makeId(prefix = 'ID') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 999999)}`;
}

function makeVariation(groups: SpecGroup[] = []): ProductVariation {
  return {
    id: makeId('VAR'),
    nome: '',
    opcoes: Object.fromEntries(
      groups
        .map((group) => group.nome.trim())
        .filter(Boolean)
        .map((groupName) => [groupName, ''])
    ),
    quantidade: '',
    modelo: '',
    acabamento: '',
    tamanho: '',
    preco: 0,
    prazo_entrega_dias: 3,
    estoque: 0,
    ativo: true
  };
}

function normalizeVariations(value: any): ProductVariation[] {
  if (!Array.isArray(value)) return [];

  return value.map((v) => ({
    id: v?.id || makeId('VAR'),
    nome: v?.nome || '',
    opcoes: v?.opcoes && typeof v.opcoes === 'object' && !Array.isArray(v.opcoes)
      ? Object.fromEntries(
          Object.entries(v.opcoes).map(([key, optionValue]) => [key, String(optionValue || '')])
        )
      : {},
    quantidade: v?.quantidade || '',
    modelo: v?.modelo || '',
    acabamento: v?.acabamento || '',
    tamanho: v?.tamanho || '',
    preco: Number(v?.preco || 0),
    prazo_entrega_dias: Math.max(1, Number(v?.prazo_entrega_dias || 3)),
    estoque: Number(v?.estoque || 0),
    ativo: v?.ativo !== false
  }));
}

function productMinPrice(product: ProductForm) {
  const activeVariations = normalizeVariations(product.variacoes).filter(
    (v) => v.ativo !== false && Number(v.preco || 0) > 0
  );

  if (activeVariations.length === 0) return Number(product.preco || 0);

  return Math.min(...activeVariations.map((v) => Number(v.preco || 0)));
}

function variationOptions(variation: ProductVariation) {
  const options: Record<string, string> = {
    ...(variation.opcoes && typeof variation.opcoes === 'object' ? variation.opcoes : {})
  };

  if (Object.keys(options).length === 0) {
    if (variation.tamanho) options.Tamanho = variation.tamanho;
    if (variation.acabamento) options.Acabamento = variation.acabamento;
    if (variation.quantidade) options.Quantidade = variation.quantidade;
    if (variation.modelo) options.Modelo = variation.modelo;
  }

  return options;
}

function variationDescription(variation: ProductVariation) {
  const optionValues = Array.from(new Set(Object.values(variationOptions(variation)).filter(Boolean)));
  return optionValues.join(' • ') || variation.nome || 'Nova combinação';
}

function validateVariations(variations: ProductVariation[], groups: SpecGroup[]) {
  if (variations.length === 0) return '';

  const seen = new Set<string>();
  const requiredGroups = groups
    .map((group) => group.nome.trim())
    .filter(Boolean);

  for (let index = 0; index < variations.length; index += 1) {
    const variation = variations[index];
    const position = index + 1;
    const options = variationOptions(variation);

    for (const groupName of requiredGroups) {
      if (!String(options[groupName] || '').trim()) {
        return `Escolha “${groupName}” na combinação ${position}.`;
      }
    }

    if (Number(variation.preco || 0) <= 0) {
      return `Informe um preço maior que zero na combinação ${position}.`;
    }

    if (Number(variation.prazo_entrega_dias || 0) < 1) {
      return `Informe o prazo de entrega na combinação ${position}.`;
    }

    const key = ((requiredGroups.length > 0
      ? requiredGroups.map((groupName) => options[groupName])
      : Object.entries(options)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([keyName, value]) => `${keyName}:${value}`)
    ).map((value) => String(value || '').trim().toLowerCase()).join('|')) || String(variation.nome || '').trim().toLowerCase();

    if (seen.has(key)) {
      return `A combinação ${position} está repetida. Altere pelo menos uma opção.`;
    }

    seen.add(key);
  }

  return '';
}

function specsToGroups(specs: any): SpecGroup[] {
  if (!specs || typeof specs !== 'object' || Array.isArray(specs)) return [];

  return Object.entries(specs).map(([nome, valores]) => ({
    id: makeId('SPEC'),
    nome,
    valoresTexto: Array.isArray(valores) ? valores.join(', ') : String(valores || '')
  }));
}

function groupsToSpecs(groups: SpecGroup[]) {
  return groups.reduce<Record<string, string[]>>((acc, group) => {
    const nome = group.nome.trim();

    if (!nome) return acc;

    const valores = group.valoresTexto
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    acc[nome] = valores;
    return acc;
  }, {});
}

function splitValues(text: string) {
  return text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function applySpecValueToVariation(variation: ProductVariation, groupName: string, value: string) {
  const name = groupName.toLowerCase();

  if (name.includes('quant')) return { ...variation, quantidade: value };
  if (name.includes('acab')) return { ...variation, acabamento: value };
  if (name.includes('tamanho') || name.includes('medida')) return { ...variation, tamanho: value };
  if (name.includes('modelo') || name.includes('tipo')) return { ...variation, modelo: value };

  return variation;
}

function generateVariationsFromSpecs(groups: SpecGroup[], basePrice: number, baseStock: number) {
  const cleanGroups = groups
    .map((group) => ({
      nome: group.nome.trim(),
      valores: splitValues(group.valoresTexto)
    }))
    .filter((group) => group.nome && group.valores.length > 0);

  if (cleanGroups.length === 0) return [];

  const combinations = cleanGroups.reduce<Array<Record<string, string>>>(
    (acc, group) => {
      const next: Array<Record<string, string>> = [];

      acc.forEach((item) => {
        group.valores.forEach((valor) => {
          next.push({ ...item, [group.nome]: valor });
        });
      });

      return next;
    },
    [{}]
  );

  return combinations.map((combo, index) => {
    let variation: ProductVariation = {
      id: makeId('VAR'),
      nome: Object.values(combo).join(' • '),
      opcoes: combo,
      quantidade: '',
      modelo: '',
      acabamento: '',
      tamanho: '',
      preco: Number(basePrice || 0),
      prazo_entrega_dias: 3,
      estoque: Number(baseStock || 0),
      ativo: true
    };

    Object.entries(combo).forEach(([key, value]) => {
      variation = applySpecValueToVariation(variation, key, value);
    });

    if (!variation.nome) variation.nome = `Variação ${index + 1}`;

    return variation;
  });
}


function productStock(product: ProductForm) {
  const activeVariations = normalizeVariations(product.variacoes).filter(
    (variation) => variation.ativo !== false
  );

  if (activeVariations.length > 0) {
    return activeVariations.reduce(
      (sum, variation) => sum + Number(variation.estoque || 0),
      0
    );
  }

  return Number(product.estoque || 0);
}

function ProductSummaryCard({
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
  tone: 'primary' | 'success' | 'warning' | 'danger';
}) {
  const tones = {
    primary: 'bg-blue-50 border-blue-100 text-blue-700',
    success: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    warning: 'bg-amber-50 border-amber-100 text-amber-700',
    danger: 'bg-red-50 border-red-100 text-red-700'
  };

  return (
    <div className={`rounded-2xl border p-3 ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">
            {title}
          </p>
          <p className="font-display text-lg sm:text-xl font-bold mt-0.5 leading-tight">
            {value}
          </p>
          <p className="text-[11px] opacity-75 mt-0.5 leading-tight">
            {subtitle}
          </p>
        </div>

        <div className="w-9 h-9 rounded-xl bg-white/80 flex items-center justify-center shrink-0">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

export function Produtos() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [stockFilter, setStockFilter] = useState('todos');
  const [savingStatusId, setSavingStatusId] = useState('');
  const [products, setProducts] = useState<ProductForm[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductForm | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductForm | null>(null);
  const [specGroups, setSpecGroups] = useState<SpecGroup[]>([]);
  const [mode, setMode] = useState<'view' | 'edit' | 'new' | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);

    try {
      const [prodRes, cats] = await Promise.all([
        apiFetch<{ data: any[] }>('/produtos?limit=100'),
        apiFetch<Category[]>('/categorias')
      ]);

      setProducts(
        (prodRes.data || []).map((p) => ({
          ...normalizeProduct(p),
          variacoes: normalizeVariations(p.variacoes),
          especificacoes: p.especificacoes && typeof p.especificacoes === 'object' ? p.especificacoes : {}
        })) as ProductForm[]
      );

      setCategories(cats || []);
    } catch (err: any) {
      alert(err.message || 'Erro ao carregar produtos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const summary = useMemo(() => {
    const ativos = products.filter((product) => product.ativo !== false).length;
    const destaques = products.filter((product) => Boolean(product.destaque)).length;
    const atencao = products.filter(
      (product) => product.ativo === false || productStock(product) <= 0
    ).length;

    return {
      total: products.length,
      ativos,
      destaques,
      atencao
    };
  }, [products]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const searchable = [
        product.nome,
        product.categoria_nome,
        product.sku
      ]
        .join(' ')
        .toLowerCase();

      if (query && !searchable.includes(query)) return false;

      if (
        categoryFilter !== 'todos' &&
        product.categoria_id !== categoryFilter
      ) {
        return false;
      }

      if (
        statusFilter === 'ativos' &&
        product.ativo === false
      ) {
        return false;
      }

      if (
        statusFilter === 'inativos' &&
        product.ativo !== false
      ) {
        return false;
      }

      const estoque = productStock(product);

      if (stockFilter === 'com_estoque' && estoque <= 0) return false;
      if (stockFilter === 'sem_estoque' && estoque > 0) return false;
      if (stockFilter === 'baixo' && (estoque <= 0 || estoque > 5)) return false;

      return true;
    });
  }, [products, search, categoryFilter, statusFilter, stockFilter]);

  const openNew = () => {
    const firstCategory = categories[0]?.id || '';
    const product = {
      ...emptyProduct,
      categoria_id: firstCategory,
      sku: `SKU-${Date.now()}`,
      variacoes: [],
      especificacoes: {
        Acabamento: ['Fosco', 'Brilho', 'Verniz localizado'],
        Quantidade: ['100', '250', '500', '1000']
      }
    };

    setEditingProduct(product);
    setNewCategoryName('');
    setSpecGroups(specsToGroups(product.especificacoes));
    setMode('new');
  };

  const openEdit = (product: ProductForm) => {
    const nextProduct = {
      ...product,
      variacoes: normalizeVariations(product.variacoes),
      especificacoes: product.especificacoes && typeof product.especificacoes === 'object' ? product.especificacoes : {}
    };

    setEditingProduct(nextProduct);
    setNewCategoryName('');
    setSpecGroups(specsToGroups(nextProduct.especificacoes));
    setMode('edit');
  };

  const openView = (product: ProductForm) => {
    setSelectedProduct({
      ...product,
      variacoes: normalizeVariations(product.variacoes)
    });
    setMode('view');
  };

  const close = () => {
    setSelectedProduct(null);
    setEditingProduct(null);
    setSpecGroups([]);
    setNewCategoryName('');
    setMode(null);
  };

  const updateProductSpecs = (groups: SpecGroup[]) => {
    setSpecGroups(groups);

    if (!editingProduct) return;

    setEditingProduct({
      ...editingProduct,
      especificacoes: groupsToSpecs(groups)
    });
  };

  const addSpecGroup = (nome = '', valoresTexto = '') => {
    updateProductSpecs([
      ...specGroups,
      {
        id: makeId('SPEC'),
        nome,
        valoresTexto
      }
    ]);
  };

  const updateSpecGroup = (index: number, field: keyof SpecGroup, value: string) => {
    const next = [...specGroups];
    next[index] = { ...next[index], [field]: value };
    updateProductSpecs(next);
  };

  const removeSpecGroup = (index: number) => {
    updateProductSpecs(specGroups.filter((_, i) => i !== index));
  };

  const payloadFromForm = (p: ProductForm) => ({
    categoria_id: p.categoria_id || categories[0]?.id,
    nome: p.nome,
    descricao: p.descricao || p.nome,
    descricao_longa: p.descricao_longa || p.descricao || '',
    preco: (() => {
      const variationPrices = normalizeVariations(p.variacoes)
        .filter((variation) => variation.ativo !== false && Number(variation.preco || 0) > 0)
        .map((variation) => Number(variation.preco));

      return variationPrices.length > 0
        ? Math.min(...variationPrices)
        : Number(p.preco || 0);
    })(),
    preco_original: p.preco_original ? Number(p.preco_original) : null,
    estoque: Number(p.estoque || 0),
    imagem_principal: p.imagem_principal || '/assets/chaveiros-personalizados.jpeg',
    imagens_adicionais: Array.isArray(p.imagens_adicionais) ? p.imagens_adicionais : [],
    especificacoes: p.especificacoes && typeof p.especificacoes === 'object' ? p.especificacoes : groupsToSpecs(specGroups),
    variacoes: normalizeVariations(p.variacoes)
      .filter((v) => String(v.nome || '').trim() || Object.values(variationOptions(v)).some(Boolean) || Number(v.preco || 0) > 0)
      .map((v) => ({
        id: v.id || makeId('VAR'),
        nome: v.nome || variationDescription(v),
        opcoes: variationOptions(v),
        quantidade: v.quantidade || '',
        modelo: v.modelo || '',
        acabamento: v.acabamento || '',
        tamanho: v.tamanho || '',
        preco: Number(v.preco || 0),
        prazo_entrega_dias: Math.max(1, Number(v.prazo_entrega_dias || 3)),
        estoque: Number(v.estoque || 0),
        ativo: v.ativo !== false
      })),
    slug: p.slug || slugify(p.nome),
    sku: p.sku || `SKU-${Date.now()}`,
    peso: Number(p.peso || 0),
    dimensoes: p.dimensoes && typeof p.dimensoes === 'object' ? p.dimensoes : {},
    tempo_producao: Number(p.tempo_producao || 3),
    destaque: Boolean(p.destaque),
    ativo: p.ativo !== false
  });

  const saveProduct = async () => {
    if (!editingProduct?.nome) return alert('Informe o nome do produto.');
    if (!editingProduct.categoria_id) {
      return alert('Selecione uma categoria ou escolha “Outros”.');
    }
    if (editingProduct.categoria_id === NEW_CATEGORY_VALUE && newCategoryName.trim().length < 2) {
      return alert('Digite o nome da nova categoria.');
    }

    const groupNames = specGroups.map((group) => group.nome.trim()).filter(Boolean);
    if (new Set(groupNames.map((name) => name.toLowerCase())).size !== groupNames.length) {
      return alert('Existem grupos de opção com o mesmo nome. Altere ou remova o grupo repetido.');
    }

    const variations = normalizeVariations(editingProduct.variacoes)
      .filter((variation) => String(variation.nome || '').trim() || Object.values(variationOptions(variation)).some(Boolean) || Number(variation.preco || 0) > 0);
    const variationError = validateVariations(variations, specGroups);

    if (variationError) return alert(variationError);

    if (variations.length === 0 && Number(editingProduct.preco || 0) <= 0) {
      return alert('Adicione pelo menos uma combinação com preço antes de salvar.');
    }

    try {
      let categoryId = editingProduct.categoria_id;

      if (categoryId === NEW_CATEGORY_VALUE) {
        const categoryName = newCategoryName.trim();
        const existingCategory = categories.find(
          (category) => category.nome.trim().toLowerCase() === categoryName.toLowerCase()
        );

        if (existingCategory?.id) {
          categoryId = existingCategory.id;
        } else {
          const createdCategory = await apiFetch<Category>('/categorias', {
            method: 'POST',
            body: JSON.stringify({
              nome: categoryName,
              slug: slugify(categoryName),
              descricao: '',
              ativo: true
            })
          });

          if (!createdCategory?.id) throw new Error('Não foi possível criar a nova categoria.');
          categoryId = createdCategory.id;
        }
      }

      const body = payloadFromForm({
        ...editingProduct,
        categoria_id: categoryId,
        descricao: editingProduct.descricao_longa || editingProduct.descricao || editingProduct.nome,
        especificacoes: groupsToSpecs(specGroups)
      });

      if (mode === 'new') {
        await apiFetch('/produtos', { method: 'POST', body: JSON.stringify(body) });
      } else {
        await apiFetch(`/produtos/${editingProduct.id}`, { method: 'PUT', body: JSON.stringify(body) });
      }

      close();
      await load();
      alert('Produto salvo no Supabase.');
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar produto.');
    }
  };

  const deleteProduct = async (product: ProductForm) => {
    if (!confirmAction(`Deseja deletar o produto ${product.nome}?`)) return;

    try {
      await apiFetch(`/produtos/${product.id}`, { method: 'DELETE' });
      await load();
      alert('Produto excluído.');
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir produto.');
    }
  };

  const duplicateProduct = async (product: ProductForm) => {
    if (!confirmAction(`Deseja duplicar o produto ${product.nome}?`)) return;

    try {
      const body = payloadFromForm({
        ...product,
        id: '',
        nome: `${product.nome} - Cópia`,
        slug: `${slugify(product.nome)}-copia-${Date.now()}`,
        sku: `${product.sku || 'SKU'}-COPIA-${Date.now()}`,
        destaque: false,
        variacoes: normalizeVariations(product.variacoes).map((v, index) => ({
          ...v,
          id: `VAR-${Date.now()}-${index}`
        }))
      });

      await apiFetch('/produtos', { method: 'POST', body: JSON.stringify(body) });
      await load();
      alert('Produto duplicado com sucesso.');
    } catch (err: any) {
      alert(err.message || 'Erro ao duplicar produto.');
    }
  };

  const toggleProductStatus = async (product: ProductForm) => {
    const nextActive = product.ativo === false;

    setSavingStatusId(product.id);

    try {
      const body = payloadFromForm({
        ...product,
        ativo: nextActive
      });

      await apiFetch(`/produtos/${product.id}`, {
        method: 'PUT',
        body: JSON.stringify(body)
      });

      setProducts((current) =>
        current.map((item) =>
          item.id === product.id
            ? { ...item, ativo: nextActive }
            : item
        )
      );
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status do produto.');
    } finally {
      setSavingStatusId('');
    }
  };

  const updateVariation = (index: number, field: keyof ProductVariation, value: any) => {
    if (!editingProduct) return;

    const next = normalizeVariations(editingProduct.variacoes);
    next[index] = {
      ...next[index],
      [field]: field === 'preco' || field === 'estoque' || field === 'prazo_entrega_dias' ? Number(value || 0) : value
    };

    setEditingProduct({ ...editingProduct, variacoes: next });
  };

  const updateVariationOption = (index: number, groupName: string, value: string) => {
    if (!editingProduct) return;

    const next = normalizeVariations(editingProduct.variacoes);
    let variation: ProductVariation = {
      ...next[index],
      opcoes: {
        ...variationOptions(next[index]),
        [groupName]: value
      }
    };

    variation = applySpecValueToVariation(variation, groupName, value);
    next[index] = variation;
    setEditingProduct({ ...editingProduct, variacoes: next });
  };

  const addVariation = () => {
    if (!editingProduct) return;

    setEditingProduct({
      ...editingProduct,
      variacoes: [...normalizeVariations(editingProduct.variacoes), makeVariation(specGroups)]
    });
  };

  const removeVariation = (index: number) => {
    if (!editingProduct) return;

    const next = normalizeVariations(editingProduct.variacoes).filter((_, i) => i !== index);
    setEditingProduct({ ...editingProduct, variacoes: next });
  };

  const generateVariations = () => {
    if (!editingProduct) return;

    const generated = generateVariationsFromSpecs(
      specGroups,
      Number(editingProduct.preco || 0),
      Number(editingProduct.estoque || 0)
    );

    if (generated.length === 0) {
      alert('Cadastre pelo menos uma opção com valores antes de gerar variações.');
      return;
    }

    if (
      normalizeVariations(editingProduct.variacoes).length > 0 &&
      !confirmAction('Já existem variações cadastradas. Deseja substituir pelas variações geradas automaticamente?')
    ) {
      return;
    }

    setEditingProduct({
      ...editingProduct,
      variacoes: generated
    });
  };

  const renderActions = (product: ProductForm) => (
    <>
      <button
        onClick={(event) => {
          event.stopPropagation();
          duplicateProduct(product);
        }}
        className="p-2 rounded-lg hover:bg-amber-50 text-amber-700"
        title="Duplicar"
      >
        <Copy size={16} />
      </button>

      <button
        onClick={(event) => {
          event.stopPropagation();
          deleteProduct(product);
        }}
        className="p-2 rounded-lg hover:bg-red-50 text-red-600"
        title="Deletar"
      >
        <Trash2 size={16} />
      </button>
    </>
  );

  return (
    <div className="fade-in w-full max-w-full overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold mb-2">
            Catálogo
          </p>

          <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary flex items-center gap-2">
            <Package size={30} />
            Produtos
          </h1>

          <p className="text-gray-500 mt-1">
            Gerencie preços, opções, variações, estoque e disponibilidade.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary w-full sm:w-auto"
          onClick={openNew}
        >
          <Plus size={18} />
          Novo produto
        </button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3 mb-4">
        <ProductSummaryCard
          title="Produtos"
          value={summary.total}
          subtitle="Cadastrados"
          icon={Package}
          tone="primary"
        />

        <ProductSummaryCard
          title="Ativos"
          value={summary.ativos}
          subtitle="Visíveis no catálogo"
          icon={CheckCircle2}
          tone="success"
        />

        <ProductSummaryCard
          title="Destaques"
          value={summary.destaques}
          subtitle="Promovidos na vitrine"
          icon={Star}
          tone="warning"
        />

        <ProductSummaryCard
          title="Atenção"
          value={summary.atencao}
          subtitle="Inativos ou sem estoque"
          icon={AlertTriangle}
          tone={summary.atencao > 0 ? 'danger' : 'success'}
        />
      </div>

      <div className="card p-3 sm:p-4 mb-4">
        <div className="grid lg:grid-cols-[1fr_190px_170px_170px_auto] gap-3">
          <div className="relative">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              size={19}
            />

            <input
              type="text"
              placeholder="Buscar por nome, categoria ou SKU..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input pl-11"
            />
          </div>

          <select
            className="input"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="todos">Todas as categorias</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.nome}
              </option>
            ))}
          </select>

          <select
            className="input"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="todos">Todos os status</option>
            <option value="ativos">Ativos</option>
            <option value="inativos">Inativos</option>
          </select>

          <select
            className="input"
            value={stockFilter}
            onChange={(event) => setStockFilter(event.target.value)}
          >
            <option value="todos">Todo estoque</option>
            <option value="com_estoque">Com estoque</option>
            <option value="baixo">Estoque baixo</option>
            <option value="sem_estoque">Sem estoque</option>
          </select>

          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setSearch('');
              setCategoryFilter('todos');
              setStatusFilter('todos');
              setStockFilter('todos');
            }}
          >
            <Filter size={17} />
            Limpar
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {[
            ['todos', 'Todos'],
            ['ativos', 'Ativos'],
            ['inativos', 'Inativos']
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`px-3 py-2 rounded-xl border text-xs font-bold ${
                statusFilter === value
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="card p-4 mb-4">
          Carregando produtos do Supabase...
        </div>
      )}

      {!loading && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((product) => {
            const variations = normalizeVariations(product.variacoes);
            const optionCount = Object.keys(product.especificacoes || {}).length;
            const stock = productStock(product);
            const active = product.ativo !== false;

            return (
              <article
                key={product.id}
                onClick={() => openEdit(product)}
                className={`card cursor-pointer overflow-hidden border-l-4 transition hover:ring-2 hover:ring-gold/40 ${
                  active
                    ? stock > 0
                      ? 'border-l-emerald-500 bg-emerald-50/20'
                      : 'border-l-orange-500 bg-orange-50/30'
                    : 'border-l-gray-400 bg-gray-50'
                }`}
              >
                <div className="p-3 sm:p-4">
                  <div className="flex gap-3">
                    <img
                      src={product.imagem_principal}
                      alt={product.nome}
                      className="w-20 h-20 rounded-2xl object-cover bg-gray-100 shrink-0"
                      onError={(event) => {
                        event.currentTarget.src = '/assets/chaveiros-personalizados.jpeg';
                      }}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap gap-1.5 mb-1">
                        <span
                          className={`px-2.5 py-1 rounded-full border text-[10px] font-bold ${
                            active
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-gray-100 border-gray-200 text-gray-600'
                          }`}
                        >
                          {active ? 'Ativo' : 'Inativo'}
                        </span>

                        {product.destaque && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700 text-[10px] font-bold">
                            <Star size={11} />
                            Destaque
                          </span>
                        )}

                        {stock <= 0 && (
                          <span className="px-2.5 py-1 rounded-full border border-red-200 bg-red-50 text-red-700 text-[10px] font-bold">
                            Sem estoque
                          </span>
                        )}
                      </div>

                      <h3 className="font-display font-bold text-base sm:text-lg text-primary leading-tight line-clamp-2">
                        {product.nome}
                      </h3>

                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {product.categoria_nome || 'Sem categoria'} · {product.sku || 'Sem SKU'}
                      </p>

                      <p className="font-bold text-primary mt-2">
                        {variations.length > 0
                          ? `A partir de ${formatMoney(productMinPrice(product))}`
                          : formatMoney(product.preco)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div className="rounded-xl bg-white/85 border border-gray-100 p-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">
                        Opções
                      </p>
                      <p className="font-bold text-primary">
                        {optionCount}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white/85 border border-gray-100 p-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">
                        Variações
                      </p>
                      <p className="font-bold text-primary">
                        {variations.length}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white/85 border border-gray-100 p-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">
                        Estoque
                      </p>
                      <p
                        className={`font-bold ${
                          stock <= 0
                            ? 'text-red-700'
                            : stock <= 5
                              ? 'text-amber-700'
                              : 'text-primary'
                        }`}
                      >
                        {stock}
                      </p>
                    </div>
                  </div>

                  <div
                    className="grid grid-cols-4 gap-1.5 mt-3"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => openEdit(product)}
                      className="rounded-xl border border-blue-200 bg-blue-50 px-2 py-2 text-blue-700 font-bold text-[11px]"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => duplicateProduct(product)}
                      className="rounded-xl border border-amber-200 bg-amber-50 px-2 py-2 text-amber-700 font-bold text-[11px]"
                    >
                      <Copy size={14} className="mx-auto" />
                    </button>

                    <button
                      type="button"
                      disabled={savingStatusId === product.id}
                      onClick={() => toggleProductStatus(product)}
                      className={`rounded-xl border px-2 py-2 font-bold text-[11px] ${
                        active
                          ? 'border-gray-200 bg-white text-gray-700'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      }`}
                      title={active ? 'Desativar produto' : 'Ativar produto'}
                    >
                      {active ? (
                        <EyeOff size={14} className="mx-auto" />
                      ) : (
                        <Eye size={14} className="mx-auto" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteProduct(product)}
                      className="rounded-xl border border-red-200 bg-red-50 px-2 py-2 text-red-700 font-bold text-[11px]"
                    >
                      <Trash2 size={14} className="mx-auto" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}

          {filtered.length === 0 && (
            <div className="card p-8 text-center text-gray-500 md:col-span-2 xl:col-span-3">
              Nenhum produto encontrado com os filtros selecionados.
            </div>
          )}
        </div>
      )}

      <BottomSheet isOpen={mode === 'view' && !!selectedProduct} onClose={close} title="Detalhes do Produto">
        {selectedProduct && (
          <div className="space-y-4">
            <img src={selectedProduct.imagem_principal} className="w-full h-56 object-cover rounded-2xl" />

            <div>
              <h3 className="font-display text-xl font-bold text-primary">{selectedProduct.nome}</h3>
              <p className="text-gray-600">{selectedProduct.descricao}</p>
            </div>

            <div className="grid gap-3">
              <div className="card p-4 shadow-none"><p className="text-sm text-gray-500">Variações</p><p className="font-bold text-primary">{normalizeVariations(selectedProduct.variacoes).length}</p></div>
            </div>

            <button className="btn btn-primary w-full" onClick={() => openEdit(selectedProduct)}>Editar produto</button>
          </div>
        )}
      </BottomSheet>

      <BottomSheet isOpen={(mode === 'edit' || mode === 'new') && !!editingProduct} onClose={close} title={mode === 'new' ? 'Novo Produto' : 'Editar Produto'}>
        {editingProduct && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
              <h3 className="font-bold text-primary">Cadastro avançado de produto</h3>
              <p className="text-sm text-gray-600 mt-1">
                Cadastre as opções que o cliente verá e informe o preço em cada combinação.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-bold text-primary">Nome do produto</span>
                <input className="input" placeholder="Ex: Cartão de Visita Premium" value={editingProduct.nome} onChange={(e) => setEditingProduct({ ...editingProduct, nome: e.target.value })} />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-primary">Categoria</span>
                <select className="input" value={editingProduct.categoria_id || ''} onChange={(e) => {
                  const categoria_id = e.target.value;
                  setEditingProduct({ ...editingProduct, categoria_id });
                  if (categoria_id !== NEW_CATEGORY_VALUE) setNewCategoryName('');
                }}>
                  <option value="">Selecione uma categoria</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  <option value={NEW_CATEGORY_VALUE}>Outros — criar nova categoria</option>
                </select>
              </label>
            </div>

            {editingProduct.categoria_id === NEW_CATEGORY_VALUE && (
              <label className="block">
                <span className="text-sm font-bold text-primary">Nome da nova categoria</span>
                <input className="input" placeholder="Ex: Adesivos personalizados" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                <span className="block text-xs text-gray-500 mt-1">A categoria será criada automaticamente ao salvar o produto.</span>
              </label>
            )}

            <label className="block">
              <span className="text-sm font-bold text-primary">Descrição completa</span>
              <textarea className="input min-h-28" placeholder="Descrição completa do produto" value={editingProduct.descricao_longa || ''} onChange={(e) => setEditingProduct({ ...editingProduct, descricao_longa: e.target.value })} />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-primary">Imagem principal</span>
              <input className="input" placeholder="URL da imagem" value={editingProduct.imagem_principal || ''} onChange={(e) => setEditingProduct({ ...editingProduct, imagem_principal: e.target.value })} />
            </label>

            <div className="rounded-3xl border border-gray-100 p-4 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-primary text-lg">Opções do produto</h3>
                  <p className="text-sm text-gray-500">Essas opções aparecem como botões para o cliente escolher no produto.</p>
                </div>

                <div className="grid grid-cols-2 sm:flex gap-2">
                  <button type="button" className="btn btn-outline px-3" onClick={() => addSpecGroup('Acabamento', 'Fosco, Brilho, Verniz localizado')}>Acabamento</button>
                  <button type="button" className="btn btn-outline px-3" onClick={() => addSpecGroup('Quantidade', '100, 250, 500, 1000')}>Quantidade</button>
                  <button type="button" className="btn btn-outline px-3" onClick={() => addSpecGroup('Tamanho', '5x5 cm, 9x5 cm, 60x90 cm')}>Tamanho</button>
                  <button type="button" className="btn btn-outline px-3" onClick={() => addSpecGroup()}>Outra</button>
                </div>
              </div>

              {specGroups.length === 0 && (
                <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-500">
                  Nenhuma opção cadastrada. Adicione Acabamento, Quantidade, Tamanho ou outra opção.
                </p>
              )}

              <div className="space-y-3">
                {specGroups.map((group, index) => (
                  <div key={group.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-3 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold text-primary">Grupo de opção {index + 1}</p>
                      <button type="button" className="rounded-lg bg-red-50 p-2 text-red-600" onClick={() => removeSpecGroup(index)}>
                        <X size={16} />
                      </button>
                    </div>

                    <div className="grid sm:grid-cols-[220px_1fr] gap-3">
                      <label className="block">
                        <span className="text-sm font-bold text-primary">Título do grupo</span>
                        <input
                          className="input"
                          placeholder="Ex: Acabamento"
                          value={group.nome}
                          onChange={(e) => updateSpecGroup(index, 'nome', e.target.value)}
                        />
                      </label>

                      <label className="block">
                        <span className="text-sm font-bold text-primary">Opções separadas por vírgula</span>
                        <input
                          className="input"
                          placeholder="Ex: Fosco, Brilho, Verniz localizado"
                          value={group.valoresTexto}
                          onChange={(e) => updateSpecGroup(index, 'valoresTexto', e.target.value)}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border-2 border-gold/30 bg-amber-50/30 p-4 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-primary text-lg">Preços por combinação</h3>
                  <p className="text-sm text-gray-500">
                    Cada combinação das opções acima pode ter um preço diferente. Funciona com opções prontas ou personalizadas.
                  </p>
                </div>

                <div className="grid sm:flex gap-2">
                  <button type="button" className="btn btn-outline" onClick={generateVariations}>
                    <Wand2 size={16} />
                    Gerar pelas opções
                  </button>

                  <button type="button" className="btn btn-outline" onClick={addVariation}>
                    <Plus size={16} />
                    Adicionar preço
                  </button>
                </div>
              </div>

              {normalizeVariations(editingProduct.variacoes).length === 0 && (
                <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-500">
                  Nenhuma combinação cadastrada. Clique em “Adicionar preço” ou gere automaticamente pelas opções acima.
                </p>
              )}

              <div className="space-y-3">
                {normalizeVariations(editingProduct.variacoes).map((variation, index) => (
                  <div key={variation.id || index} className="rounded-2xl border border-amber-200 bg-white p-4 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-primary">Preço {index + 1}</p>
                        <p className="text-xs text-gray-500">{variationDescription(variation)}</p>
                      </div>
                      <button type="button" className="rounded-lg bg-red-50 p-2 text-red-600" onClick={() => removeVariation(index)}>
                        <X size={16} />
                      </button>
                    </div>

                    {specGroups.filter((group) => group.nome.trim()).length > 0 ? (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {specGroups.filter((group) => group.nome.trim()).map((group) => {
                          const values = splitValues(group.valoresTexto);
                          const selectedValue = variationOptions(variation)[group.nome.trim()] || '';

                          return (
                            <label className="block" key={group.id}>
                              <span className="text-sm font-bold text-primary">{group.nome.trim()} *</span>
                              {values.length > 0 ? (
                                <select className="input" value={selectedValue} onChange={(e) => updateVariationOption(index, group.nome.trim(), e.target.value)}>
                                  <option value="">Selecione</option>
                                  {values.map((value) => <option key={value} value={value}>{value}</option>)}
                                </select>
                              ) : (
                                <input className="input" value={selectedValue} placeholder={`Informe ${group.nome.trim()}`} onChange={(e) => updateVariationOption(index, group.nome.trim(), e.target.value)} />
                              )}
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-3">
                        <label className="block">
                          <span className="text-sm font-bold text-primary">Quantidade</span>
                          <input className="input" placeholder="Ex: 100 unidades" value={variation.quantidade || ''} onChange={(e) => updateVariation(index, 'quantidade', e.target.value)} />
                        </label>

                        <label className="block">
                          <span className="text-sm font-bold text-primary">Acabamento</span>
                          <input className="input" placeholder="Ex: Fosco" value={variation.acabamento || ''} onChange={(e) => updateVariation(index, 'acabamento', e.target.value)} />
                        </label>
                      </div>
                    )}

                    <div className="grid sm:grid-cols-2 gap-3">
                      <label className="block">
                        <span className="text-sm font-bold text-primary">Preço *</span>
                        <input className="input" placeholder="Ex: 80,00" type="number" min="0" step="0.01" value={variation.preco || ''} onChange={(e) => updateVariation(index, 'preco', e.target.value)} />
                      </label>

                      <label className="block">
                        <span className="text-sm font-bold text-primary">Prazo de entrega (dias úteis) *</span>
                        <input className="input" placeholder="Ex: 5" type="number" min="1" step="1" value={variation.prazo_entrega_dias || 3} onChange={(e) => updateVariation(index, 'prazo_entrega_dias', e.target.value)} />
                      </label>
                    </div>

                    <details className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                      <summary className="cursor-pointer text-sm font-bold text-primary">Mais detalhes (opcional)</summary>
                      <div className="grid sm:grid-cols-3 gap-3 pt-3">
                      <label className="block">
                          <span className="text-sm font-bold text-primary">Nome exibido</span>
                          <input className="input" placeholder="Gerado automaticamente" value={variation.nome || ''} onChange={(e) => updateVariation(index, 'nome', e.target.value)} />
                      </label>

                      <label className="block">
                          <span className="text-sm font-bold text-primary">Tamanho</span>
                          <input className="input" placeholder="Ex: 9x5 cm" value={variation.tamanho || ''} onChange={(e) => updateVariation(index, 'tamanho', e.target.value)} />
                      </label>

                        <label className="block">
                          <span className="text-sm font-bold text-primary">Modelo</span>
                          <input className="input" placeholder="Ex: Frente única" value={variation.modelo || ''} onChange={(e) => updateVariation(index, 'modelo', e.target.value)} />
                        </label>
                      </div>
                    </details>

                    <label className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-3 font-semibold text-primary">
                      <input type="checkbox" checked={variation.ativo !== false} onChange={(e) => updateVariation(index, 'ativo', e.target.checked)} />
                      Disponível para o cliente
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-2 rounded-xl border border-gray-100 px-4 py-3">
                <input type="checkbox" checked={!!editingProduct.destaque} onChange={(e) => setEditingProduct({ ...editingProduct, destaque: e.target.checked })} />
                Produto em destaque
              </label>

              <label className="flex items-center gap-2 rounded-xl border border-gray-100 px-4 py-3">
                <input type="checkbox" checked={editingProduct.ativo !== false} onChange={(e) => setEditingProduct({ ...editingProduct, ativo: e.target.checked })} />
                Produto ativo
              </label>

            </div>

            <div className="sticky bottom-0 -mx-5 -mb-5 bg-white border-t border-gray-100 p-4 grid grid-cols-2 gap-3">
              <button type="button" className="btn btn-outline" onClick={close}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveProduct}>Salvar produto</button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}