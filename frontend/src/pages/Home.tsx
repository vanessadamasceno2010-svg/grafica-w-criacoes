import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock,
  Headphones,
  ImageIcon,
  MessageCircle,
  PackageCheck,
  Search,
  ShieldCheck,
  Sparkles,
  Truck
} from 'lucide-react';

import { ProductCard } from '../components/ProductCard';
import {
  BRAND,
  Category,
  Product,
  apiFetch,
  getPublicConfig,
  normalizeCategory,
  normalizeProduct,
  whatsappUrl
} from '../lib/api';

const FALLBACK_IMAGE = '/assets/chaveiros-personalizados.jpeg';

function CategorySkeleton() {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-gray-100" />
      <div className="p-4 space-y-2">
        <div className="h-5 bg-gray-100 rounded-full w-3/4" />
        <div className="h-4 bg-gray-100 rounded-full w-full" />
      </div>
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-gray-100" />
      <div className="p-4 space-y-3">
        <div className="h-3 bg-gray-100 rounded-full w-24" />
        <div className="h-5 bg-gray-100 rounded-full w-4/5" />
        <div className="h-4 bg-gray-100 rounded-full w-full" />
        <div className="h-4 bg-gray-100 rounded-full w-2/3" />
        <div className="h-8 bg-gray-100 rounded-xl w-32" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="h-11 bg-gray-100 rounded-xl" />
          <div className="h-11 bg-gray-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function Home() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [codigo, setCodigo] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    getPublicConfig()
      .then(setConfig)
      .catch(() => setConfig({}));

    apiFetch<{ data: unknown[] }>('/produtos?limit=12')
      .then((response) => {
        const list = (response.data || [])
          .map(normalizeProduct)
          .filter((product) => product.ativo !== false)
          .sort((a, b) => {
            const destaque =
              Number(Boolean(b.destaque)) -
              Number(Boolean(a.destaque));

            if (destaque !== 0) return destaque;

            return String(a.nome || '').localeCompare(
              String(b.nome || ''),
              'pt-BR'
            );
          });

        setProducts(list);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false));

    apiFetch<unknown[]>('/categorias')
      .then((rows) => {
        setCategories(
          (rows || [])
            .map(normalizeCategory)
            .filter((category) => category.ativo !== false)
        );
      })
      .catch(() => setCategories([]))
      .finally(() => setLoadingCategories(false));
  }, []);

  const featuredProducts = useMemo(() => {
    const highlighted = products.filter(
      (product) => Boolean(product.destaque)
    );

    if (highlighted.length >= 6) {
      return highlighted.slice(0, 6);
    }

    const highlightedIds = new Set(
      highlighted.map((product) => product.id)
    );

    const remaining = products.filter(
      (product) => !highlightedIds.has(product.id)
    );

    return [...highlighted, ...remaining].slice(0, 6);
  }, [products]);

  const featuredCategories = useMemo(
    () => categories.slice(0, 8),
    [categories]
  );

  const bannerImage =
    config.home_banner_url ||
    products[0]?.imagem_principal ||
    FALLBACK_IMAGE;

  const features = [
    {
      icon: Sparkles,
      title: 'Acabamento profissional',
      description:
        'Produtos personalizados com atenção aos detalhes e excelente apresentação.'
    },
    {
      icon: Clock,
      title: 'Produção organizada',
      description:
        'Prazos informados antes da confirmação e acompanhamento do andamento.'
    },
    {
      icon: ShieldCheck,
      title: 'Pedido acompanhado',
      description:
        'Consulte o status usando o código recebido após a confirmação.'
    },
    {
      icon: Truck,
      title: 'Entrega ou retirada',
      description:
        'Escolha a melhor forma de receber seu pedido no fechamento.'
    }
  ];

  const steps = [
    {
      number: '01',
      title: 'Escolha o produto',
      description:
        'Acesse o catálogo e selecione medidas, acabamento e quantidade.'
    },
    {
      number: '02',
      title: 'Envie o pedido',
      description:
        'Confira o carrinho e finalize com seus dados pelo WhatsApp.'
    },
    {
      number: '03',
      title: 'Aprove e acompanhe',
      description:
        'Após a confirmação, acompanhe a produção usando o código do pedido.'
    }
  ];

  function acompanhar() {
    const query = codigo.trim();

    if (!query) {
      alert('Digite o código do pedido.');
      return;
    }

    navigate(
      '/acompanhar?pedido=' + encodeURIComponent(query)
    );
  }

  return (
    <div className="fade-in overflow-hidden">
      <section className="relative bg-primary text-white overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={bannerImage}
            alt=""
            className="w-full h-full object-cover opacity-20"
            onError={(event) => {
              event.currentTarget.src = FALLBACK_IMAGE;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/95 to-primary/75" />
        </div>

        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gold/15 blur-3xl" />
        <div className="absolute -bottom-28 -left-28 w-80 h-80 rounded-full bg-white/10 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 py-12 sm:py-16 lg:py-20">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/10 border border-white/20 text-xs sm:text-sm font-semibold backdrop-blur">
                <Sparkles size={17} className="text-gold" />
                Impressos, brindes e personalizados
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] mt-5">
                Sua ideia ganha
                <span className="block text-gold mt-1">
                  forma e qualidade
                </span>
              </h1>

              <p className="text-base sm:text-lg text-white/80 leading-relaxed mt-5 max-w-xl">
                Produtos personalizados para empresas, eventos e momentos
                especiais, com atendimento próximo e produção organizada.
              </p>

              <div className="grid sm:grid-cols-2 gap-3 mt-7 max-w-xl">
                <Link
                  to="/catalogo"
                  className="min-h-[52px] rounded-2xl bg-gold text-primary font-bold flex items-center justify-center gap-2 px-5 hover:bg-yellow-400 transition"
                >
                  Ver catálogo
                  <ArrowRight size={19} />
                </Link>

                <a
                  href={whatsappUrl(
                    'Olá! Vi o site da Gráfica W Criações e quero solicitar um orçamento.'
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[52px] rounded-2xl bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 px-5 hover:bg-emerald-600 transition"
                >
                  <MessageCircle size={20} />
                  Pedir orçamento
                </a>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-7 max-w-xl">
                <div className="rounded-2xl bg-white/10 border border-white/15 p-3 backdrop-blur">
                  <p className="font-display text-xl sm:text-2xl font-bold text-gold">
                    18+
                  </p>
                  <p className="text-[11px] sm:text-xs text-white/70 mt-1">
                    anos de experiência
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 border border-white/15 p-3 backdrop-blur">
                  <p className="font-display text-xl sm:text-2xl font-bold text-gold">
                    100%
                  </p>
                  <p className="text-[11px] sm:text-xs text-white/70 mt-1">
                    atendimento humano
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 border border-white/15 p-3 backdrop-blur">
                  <p className="font-display text-xl sm:text-2xl font-bold text-gold">
                    Online
                  </p>
                  <p className="text-[11px] sm:text-xs text-white/70 mt-1">
                    acompanhamento
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="relative rounded-3xl overflow-hidden border border-white/15 shadow-2xl">
                <img
                  src={bannerImage}
                  alt="Produtos da Gráfica W Criações"
                  className="w-full aspect-[4/3] lg:aspect-[5/4] object-cover"
                  onError={(event) => {
                    event.currentTarget.src = FALLBACK_IMAGE;
                  }}
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                <div className="absolute left-4 right-4 bottom-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/70">
                      Gráfica W Criações
                    </p>
                    <p className="font-display text-lg sm:text-xl font-bold text-white mt-1">
                      Personalização que valoriza sua marca
                    </p>
                  </div>

                  <div className="w-11 h-11 rounded-full bg-gold text-primary flex items-center justify-center shrink-0">
                    <BadgeCheck size={21} />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl bg-white text-primary p-4 sm:p-5 shadow-xl">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gold/15 text-gold flex items-center justify-center shrink-0">
                    <PackageCheck size={21} />
                  </div>

                  <div>
                    <h2 className="font-display text-lg font-bold">
                      Acompanhe seu pedido
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Digite o código recebido para consultar o andamento.
                    </p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-[1fr_auto] gap-2 mt-4">
                  <div className="relative">
                    <Search
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      value={codigo}
                      onChange={(event) =>
                        setCodigo(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') acompanhar();
                      }}
                      className="input pl-11 min-h-12"
                      placeholder="Ex: WC123456"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={acompanhar}
                    className="btn btn-primary min-h-12 px-5"
                  >
                    Consultar
                    <ArrowRight size={17} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-10 sm:py-14">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {features.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="card p-4 sm:p-5 hover:shadow-lg transition"
            >
              <div className="w-11 h-11 rounded-xl bg-gold/10 text-gold flex items-center justify-center mb-4">
                <Icon size={22} />
              </div>

              <h2 className="font-display font-bold text-primary text-base sm:text-lg leading-tight">
                {title}
              </h2>

              <p className="text-gray-500 text-xs sm:text-sm leading-relaxed mt-2">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold mb-2">
              Encontre mais rápido
            </p>

            <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary">
              Categorias
            </h2>

            <p className="text-gray-500 mt-1">
              Acesse diretamente o tipo de produto que procura.
            </p>
          </div>

          <Link
            to="/catalogo"
            className="hidden sm:inline-flex items-center gap-2 text-sm font-bold text-primary"
          >
            Ver todas
            <ArrowRight size={17} />
          </Link>
        </div>

        {loadingCategories ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 4 }, (_, index) => (
              <CategorySkeleton key={index} />
            ))}
          </div>
        ) : featuredCategories.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {featuredCategories.map((category) => {
              const target =
                category.slug || String(category.id);

              return (
                <Link
                  key={category.id}
                  to={`/catalogo?categoria=${encodeURIComponent(target)}`}
                  className="group card overflow-hidden"
                >
                  <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                    {category.imagem_url ? (
                      <img
                        src={category.imagem_url}
                        alt={category.nome}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(event) => {
                          event.currentTarget.src = FALLBACK_IMAGE;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-primary/80">
                        <ImageIcon
                          size={34}
                          className="text-gold"
                        />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

                    <div className="absolute left-3 right-3 bottom-3">
                      <h3 className="font-display font-bold text-white text-base sm:text-lg leading-tight">
                        {category.nome}
                      </h3>
                    </div>
                  </div>

                  {category.descricao && (
                    <p className="p-3 text-xs sm:text-sm text-gray-500 line-clamp-2">
                      {category.descricao}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="card p-6 text-center text-gray-500">
            As categorias serão exibidas aqui quando estiverem disponíveis.
          </div>
        )}

        <Link
          to="/catalogo"
          className="sm:hidden btn btn-outline w-full mt-4"
        >
          Ver todas as categorias
          <ArrowRight size={17} />
        </Link>
      </section>

      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-12 sm:py-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold mb-2">
                Mais procurados
              </p>

              <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary">
                Produtos em destaque
              </h2>

              <p className="text-gray-500 mt-1">
                Confira algumas opções para começar seu pedido.
              </p>
            </div>

            <Link
              to="/catalogo"
              className="btn btn-outline self-start sm:self-auto"
            >
              Ver catálogo completo
              <ArrowRight size={17} />
            </Link>
          </div>

          {loadingProducts ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {Array.from({ length: 6 }, (_, index) => (
                <ProductSkeleton key={index} />
              ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {featuredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                />
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center">
              <p className="text-gray-500">
                Os produtos em destaque aparecerão aqui.
              </p>

              <Link
                to="/catalogo"
                className="btn btn-primary mt-5"
              >
                Abrir catálogo
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-12 sm:py-16">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold mb-2">
            Processo simples
          </p>

          <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary">
            Como fazer seu pedido
          </h2>

          <p className="text-gray-500 mt-2">
            Escolha, envie e acompanhe sem complicação.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {steps.map((step) => (
            <article
              key={step.number}
              className="card p-5 sm:p-6 relative overflow-hidden"
            >
              <span className="absolute -right-2 -top-5 font-display text-7xl font-bold text-primary/5">
                {step.number}
              </span>

              <div className="relative">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-gold font-display font-bold">
                  {step.number}
                </span>

                <h3 className="font-display text-lg font-bold text-primary mt-4">
                  {step.title}
                </h3>

                <p className="text-sm text-gray-500 leading-relaxed mt-2">
                  {step.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 pb-12 sm:pb-16">
        <div className="rounded-3xl bg-primary text-white p-6 sm:p-8 lg:p-10 overflow-hidden relative">
          <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-gold/15 blur-3xl" />

          <div className="relative grid lg:grid-cols-[1fr_auto] gap-6 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-gold font-bold text-sm">
                <Headphones size={18} />
                Atendimento personalizado
              </div>

              <h2 className="font-display text-2xl sm:text-3xl font-bold mt-3">
                Precisa de ajuda para escolher?
              </h2>

              <p className="text-white/75 mt-2 max-w-2xl leading-relaxed">
                Fale com a equipe e receba orientação sobre material,
                medida, quantidade, prazo e acabamento.
              </p>
            </div>

            <a
              href={whatsappUrl(
                'Olá! Preciso de ajuda para escolher um produto no site da Gráfica W Criações.'
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[52px] rounded-2xl bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 px-6 hover:bg-emerald-600 transition"
            >
              <MessageCircle size={20} />
              Falar no WhatsApp
            </a>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 pb-12">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 flex items-start gap-3">
            <CheckCircle2
              size={20}
              className="text-emerald-600 shrink-0"
            />
            <div>
              <p className="font-bold text-primary">
                Atendimento direto
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Confirmação final feita pela equipe.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4 flex items-start gap-3">
            <ShieldCheck
              size={20}
              className="text-blue-600 shrink-0"
            />
            <div>
              <p className="font-bold text-primary">
                Pedido registrado
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Acompanhe as etapas após a confirmação.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4 flex items-start gap-3">
            <Truck
              size={20}
              className="text-amber-600 shrink-0"
            />
            <div>
              <p className="font-bold text-primary">
                Entrega combinada
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Retirada no local ou entrega sob consulta.
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Atendimento pelo WhatsApp: {BRAND.whatsapp}
        </p>
      </section>
    </div>
  );
}

export default Home;