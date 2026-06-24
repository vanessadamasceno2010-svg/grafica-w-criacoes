import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Clock, ShieldCheck, Truck, MessageCircle, ArrowRight, Search } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { BRAND, Category, Product, apiFetch, getPublicConfig, normalizeCategory, normalizeProduct, whatsappUrl } from '../lib/api';

export function Home() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [codigo, setCodigo] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    getPublicConfig().then(setConfig);
    apiFetch<{ data: any[] }>('/produtos?limit=12')
      .then((res) => {
        const list = (res.data || []).map(normalizeProduct);
        setProducts(list.sort((a, b) => Number(b.destaque) - Number(a.destaque)));
      })
      .catch(() => setProducts([]));

    apiFetch<any[]>('/categorias')
      .then((rows) => setCategories((rows || []).map(normalizeCategory)))
      .catch(() => setCategories([]));
  }, []);

  const features = [
    { icon: Sparkles, title: 'Design Premium', desc: 'Acabamentos de alta qualidade que valorizam sua marca.' },
    { icon: Clock, title: 'Produção Rápida', desc: 'Prazos ágeis sem comprometer a excelência.' },
    { icon: ShieldCheck, title: 'Pedido Controlado', desc: 'Acompanhe cada etapa da produção.' },
    { icon: Truck, title: 'Entrega ou Retirada', desc: 'Flexibilidade total para você.' }
  ];

  function acompanhar() {
    const q = codigo.trim();
    if (q) navigate('/acompanhar?pedido=' + encodeURIComponent(q));
  }

  return (
    <div className="fade-in">
      {/* ==================== HERO MELHORADA ==================== */}
      <section className="relative min-h-[90vh] flex items-center bg-gradient-to-br from-primary via-primary to-primary/90 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://picsum.photos/id/1015/2000/1200')] bg-cover bg-center opacity-20" />
        <div className="absolute inset-0 bg-black/40" />
        
        <div className="relative max-w-6xl mx-auto px-4 py-20 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm font-medium backdrop-blur-md">
              <Sparkles size={18} className="text-gold" />
              Qualidade Premium • Atendimento Humanizado
            </div>

            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tighter">
              Sua marca merece<br />
              <span className="text-gold">o melhor visual</span>
            </h1>

            <p className="text-xl text-gray-200 max-w-lg">
              Impressos, brindes, bordados e personalizados com padrão profissional. 
              Mais de 30 anos transformando ideias em resultados.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                to="/catalogo" 
                className="btn btn-primary text-lg px-8 py-4 flex items-center justify-center gap-3 font-semibold rounded-2xl hover:scale-105 transition-all"
              >
                Ver Catálogo Completo
                <ArrowRight size={24} />
              </Link>

              <a 
                href={whatsappUrl('Olá! Vi no site e quero um orçamento.')}
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-whats text-lg px-8 py-4 flex items-center justify-center gap-3 font-semibold rounded-2xl hover:scale-105 transition-all"
              >
                <MessageCircle size={24} />
                Falar no WhatsApp
              </a>
            </div>

            {/* Acompanhar Pedido */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 max-w-md">
              <h3 className="font-display font-bold text-xl mb-2">Acompanhe seu pedido</h3>
              <p className="text-gray-300 text-sm mb-4">
                Digite o código recebido para ver o status em tempo real.
              </p>
              <div className="flex gap-2">
                <input
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && acompanhar()}
                  className="flex-1 h-14 rounded-2xl px-5 text-primary outline-none text-base placeholder:text-gray-400"
                  placeholder="Ex: WC123456"
                />
                <button 
                  onClick={acompanhar} 
                  className="h-14 px-8 bg-gold hover:bg-yellow-400 text-primary font-bold rounded-2xl transition-all flex items-center gap-2"
                >
                  <Search size={20} /> Buscar
                </button>
              </div>
            </div>
          </div>

          {/* Imagem Hero */}
          <div className="relative hidden md:block">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10">
              <img
                src={config.home_banner_url || products[0]?.imagem_principal || 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800&q=80'}
                alt="Gráfica W Criações - Produtos Personalizados"
                className="w-full h-[520px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              <div className="absolute bottom-8 left-8 right-8">
                <p className="text-white/90 text-sm uppercase tracking-widest">Mais de 30 anos de experiência</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card p-8 text-center hover:shadow-xl transition-all group">
              <div className="inline-flex p-4 rounded-2xl bg-gold/10 text-gold mb-6 group-hover:scale-110 transition-transform">
                <Icon size={32} />
              </div>
              <h3 className="font-display font-bold text-xl text-primary mb-3">{title}</h3>
              <p className="text-gray-600 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Produtos em Destaque */}
      <section className="max-w-6xl mx-auto px-4 py-12 bg-gray-50">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-display text-3xl font-bold text-primary">Produtos em Destaque</h2>
          <Link to="/catalogo" className="text-gold font-semibold flex items-center gap-2 hover:gap-3 transition-all">
            Ver todos <ArrowRight size={20} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.filter((p) => p.destaque).slice(0, 3).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
          {products.filter((p) => p.destaque).length === 0 && products.slice(0, 3).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Categorias */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="font-display text-3xl font-bold text-primary mb-8">Nossas Categorias</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.map((cat) => (
            <Link 
              key={cat.id} 
              to={`/catalogo?categoria=${cat.slug || cat.id}`} 
              className="card p-6 flex flex-col items-center text-center hover:-translate-y-1 transition-all group"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                <Sparkles size={28} className="text-primary" />
              </div>
              <span className="font-semibold text-primary">{cat.nome}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
