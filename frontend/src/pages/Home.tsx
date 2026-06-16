import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Clock,
  ShieldCheck,
  Truck,
  MessageCircle,
  ArrowRight,
  Search
} from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import {
  apiFetch,
  normalizeProduct,
  normalizeCategory,
  Product,
  Category,
  BRAND,
  getPublicConfig
} from '../lib/api';

export function Home() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [codigo, setCodigo] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getPublicConfig().then(setConfig);

    Promise.all([
      apiFetch<{ data: any[] }>('/produtos?limit=12').catch(() => ({ data: [] })),
      apiFetch<any[]>('/categorias').catch(() => [])
    ]).then(([prodRes, cats]) => {
      setProducts((prodRes.data || []).map(normalizeProduct));
      setCategories((cats || []).map(normalizeCategory));
    });
  }, []);

  const features = [
    {
      icon: Sparkles,
      title: 'Design Premium',
      desc: 'Acabamentos de alta qualidade que valorizam sua marca.'
    },
    {
      icon: Clock,
      title: 'Produção Rápida',
      desc: 'Prazos ágeis sem comprometer a excelência do produto.'
    },
    {
      icon: ShieldCheck,
      title: 'Pedido Controlado',
      desc: 'Acompanhe cada etapa da produção do seu pedido.'
    },
    {
      icon: Truck,
      title: 'Entrega ou Retirada',
      desc: 'Flexibilidade para receber onde e quando for melhor.'
    }
  ];

  function acompanhar() {
    const q = codigo.trim();
    if (q) navigate('/acompanhar?pedido=' + encodeURIComponent(q));
  }

  const featured = products.filter((p) => p.destaque).slice(0, 3);
  const shownProducts = featured.length > 0 ? featured : products.slice(0, 3);

  return (
    <div className="fade-in">
      <section className="brand-gradient text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />

        <div className="relative max-w-5xl mx-auto px-4 py-12 sm:py-20">
          <div className="text-center sm:text-left sm:flex sm:items-center sm:gap-12">
            <div className="sm:flex-1">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-sm font-semibold mb-6 border border-white/10">
                <Sparkles size={14} className="text-gold" />
                {config.home_badge || 'Padrão visual premium'}
              </span>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
                {config.home_titulo || (
                  <>
                    Produtos personalizados com <span className="gold-text">impacto real</span>.
                  </>
                )}
              </h1>

              <p className="text-gray-300 text-lg mb-8 leading-relaxed max-w-xl">
                {config.home_subtitulo ||
                  'Escolha os produtos, monte seu carrinho e finalize o pedido diretamente pelo WhatsApp com atendimento personalizado.'}
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/catalogo" className="btn btn-primary text-base">
                  Ver Catálogo <ArrowRight size={18} />
                </Link>

                <a
                  href={'https://wa.me/' + BRAND.whatsappNumber}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-whats text-base"
                >
                  <MessageCircle size={18} />
                  Falar no WhatsApp
                </a>
              </div>

              <div className="mt-8 bg-white/10 border border-white/15 rounded-3xl p-4 backdrop-blur-sm max-w-xl">
                <h2 className="font-display font-bold text-xl mb-1">
                  {config.home_codigo_pedido_titulo || 'Acompanhe seu pedido'}
                </h2>

                <p className="text-gray-300 text-sm mb-3">
                  {config.home_codigo_pedido_texto ||
                    'Digite o código do pedido para consultar o andamento.'}
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && acompanhar()}
                    className="h-12 rounded-2xl px-4 text-primary outline-none flex-1 text-base"
                    placeholder="Ex: WC1234567890"
                  />

                  <button
                    onClick={acompanhar}
                    className="h-12 px-5 rounded-2xl bg-gold text-primary font-bold flex items-center justify-center gap-2"
                  >
                    <Search size={18} />
                    Buscar
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-10 sm:mt-0 sm:flex-1 relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                <img
                  src={
                    config.home_banner_url ||
                    'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800&q=80'
                  }
                  alt="Produtos personalizados"
                  className="w-full h-64 sm:h-96 object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card p-4 sm:p-6 text-center sm:text-left">
              <div className="inline-flex p-3 rounded-2xl bg-gold/10 text-gold mb-4">
                <Icon size={24} />
              </div>

              <h3 className="font-display font-bold text-primary mb-2">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed hidden sm:block">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary">
            Produtos em Destaque
          </h2>

          <Link
            to="/catalogo"
            className="text-gold font-semibold text-sm flex items-center gap-1 active:opacity-70"
          >
            Ver todos <ArrowRight size={16} />
          </Link>
        </div>

        {shownProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {shownProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="card p-6 text-center text-gray-500">
            Nenhum produto cadastrado ainda.
          </div>
        )}
      </section>

      <section className="max-w-5xl mx-auto px-4 py-8 sm:py-12 mb-8">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary mb-6">
          Categorias
        </h2>

        {categories.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/catalogo?categoria=${cat.slug}`}
                className="card p-4 flex flex-col items-center text-center gap-3 active:scale-95 transition-transform"
              >
                <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center">
                  <Sparkles size={20} className="text-primary" />
                </div>

                <span className="font-semibold text-sm text-primary">{cat.nome}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card p-6 text-center text-gray-500">
            Nenhuma categoria cadastrada ainda.
          </div>
        )}
      </section>
    </div>
  );
}
