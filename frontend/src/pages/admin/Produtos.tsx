import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Trash2, Copy, X, Wand2 } from 'lucide-react';
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
    prazo_entrega: '',
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
    prazo_entrega: v?.prazo_entrega || v?.prazo || '',
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
      prazo_entrega: '',
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

export function Produtos() {
  const [search, setSearch] = useState('');
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

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const text = [p.nome, p.categoria_nome, p.sku]
        .join(' ')
        .toLowerCase();

      return text.includes(search.toLowerCase());
    });
  }, [products, search]);

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
      .filter((v) => String(v.nome || '').trim() || Object.values(variationOptions(v)).some(Boolean) || Number(v.preco || 0) > 0 || String(v.prazo_entrega || '').trim())
      .map((v) => ({
        id: v.id || makeId('VAR'),
        nome: v.nome || variationDescription(v),
        opcoes: variationOptions(v),
        quantidade: v.quantidade || '',
        modelo: v.modelo || '',
        acabamento: v.acabamento || '',
        tamanho: v.tamanho || '',
        preco: Number(v.preco || 0),
        prazo_entrega: v.prazo_entrega || '',
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
      .filter((variation) => String(variation.nome || '').trim() || Object.values(variationOptions(variation)).some(Boolean) || Number(variation.preco || 0) > 0 || String(variation.prazo_entrega || '').trim());
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

  const updateVariation = (index: number, field: keyof ProductVariation, value: any) => {
    if (!editingProduct) return;

    const next = normalizeVariations(editingProduct.variacoes);
    next[index] = {
      ...next[index],
      [field]: field === 'preco' || field === 'estoque' ? Number(value || 0) : value
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
    <div className="fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary">Gerenciador de Produtos</h1>
          <p className="text-gray-500 mt-1">Clique no produto para editar. Cadastre opções como acabamento, quantidade e tamanho.</p>
        </div>

        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={18} />
          Novo Produto
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar por nome ou categoria..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-11"
        />
      </div>

      {loading && <div className="card p-4 mb-4">Carregando produtos do Supabase...</div>}

      <div className="card overflow-hidden">
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4">Produto</th>
                <th className="text-left px-6 py-4">Categoria</th>
                <th className="text-left px-6 py-4">Preço</th>
                <th className="text-left px-6 py-4">Opções</th>
                <th className="text-left px-6 py-4">Variações</th>
                <th className="text-right px-6 py-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((product) => {
                const qtdVariacoes = normalizeVariations(product.variacoes).length;
                const qtdOpcoes = Object.keys(product.especificacoes || {}).length;

                return (
                  <tr key={product.id} onClick={() => openEdit(product)} className="cursor-pointer hover:bg-amber-50/40 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={product.imagem_principal} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                        <span className="font-semibold text-primary">{product.nome}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{product.categoria_nome}</td>
                    <td className="px-6 py-4 font-semibold">
                      {qtdVariacoes > 0 ? `A partir de ${formatMoney(productMinPrice(product))}` : formatMoney(product.preco)}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{qtdOpcoes}</td>
                    <td className="px-6 py-4 text-gray-600">{qtdVariacoes}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">{renderActions(product)}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="sm:hidden divide-y divide-gray-100">
          {filtered.map((product) => {
            const qtdVariacoes = normalizeVariations(product.variacoes).length;
            const qtdOpcoes = Object.keys(product.especificacoes || {}).length;

            return (
              <div key={product.id} className="p-4 cursor-pointer active:bg-amber-50" onClick={() => openEdit(product)}>
                <div className="flex gap-3">
                  <img src={product.imagem_principal} alt="" className="w-16 h-16 rounded-xl object-cover bg-gray-100" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-primary truncate">{product.nome}</h3>
                    <p className="text-sm text-gray-500 truncate">{product.categoria_nome}</p>
                    <p className="font-bold text-primary mt-1">
                      {qtdVariacoes > 0 ? `A partir de ${formatMoney(productMinPrice(product))}` : formatMoney(product.preco)}
                    </p>
                    <p className="text-xs text-gray-500">{qtdOpcoes} opção(ões) • {qtdVariacoes} variação(ões)</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4" onClick={(event) => event.stopPropagation()}>
                  <button onClick={() => duplicateProduct(product)} className="btn btn-outline px-2"><Copy size={16} />Duplicar</button>
                  <button onClick={() => deleteProduct(product)} className="btn btn-danger px-2"><Trash2 size={16} />Excluir</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
                        <span className="text-sm font-bold text-primary">Prazo de entrega</span>
                        <input className="input" placeholder="Ex: 3 dias úteis" value={variation.prazo_entrega || ''} onChange={(e) => updateVariation(index, 'prazo_entrega', e.target.value)} />
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
