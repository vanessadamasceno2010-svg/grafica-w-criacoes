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
      {/* ==================== HERO MELHORADA PARA MOBILE ==================== */}
      <section className="relative min-h-[85vh] md:min-h-[90vh] flex items-center bg-gradient-to-br from-primary via-primary to-primary/90 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://picsum.photos/id/1015/2000/1200')] bg-cover bg-center opacity-20" />
        <div className="absolute inset-0 bg-black/40" />
        
        <div className="relative max-w-6xl mx-auto px-4 py-12 md:py-20 w-full">
          <div className="grid md:grid-cols-2 gap-10 md:gap-12 items-center">
            
            {/* Texto */}
            <div className="space-y-6 md:space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm font-medium backdrop-blur-md">
                <Sparkles size={18} className="text-gold" />
                Qualidade Premium • Atendimento Humanizado
              </div>

              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tighter">
                Sua marca merece<br />
                <span className="text-gold">o melhor visual</span>
              </h1>

              <p className="text-lg md:text-xl text-gray-200 leading-relaxed max-w-lg">
                Impressos, brindes, bordados e personalizados com padrão profissional. 
                18 anos transformando ideias em resultados que impactam.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  to="/catalogo" 
                  className="btn btn-primary text-base sm:text-lg px-8 py-4 flex items-center justify-center gap-3 font-semibold rounded-2xl hover:scale-[1.02] transition-all"
                >
                  Ver Catálogo Completo
                  <ArrowRight size={22} />
                </Link>

                <a 
                  href={whatsappUrl('Olá! Vi no site e quero um orçamento.')}
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn btn-whats text-base sm:text-lg px-8 py-4 flex items-center justify-center gap-3 font-semibold rounded-2xl hover:scale-[1.02] transition-all"
                >
                  <MessageCircle size={24} />
                  Falar no WhatsApp
                </a>
              </div>

              {/* Acompanhar Pedido - mais compacto no mobile */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-5 md:p-6">
                <h3 className="font-display font-bold text-lg md:text-xl mb-2">Acompanhe seu pedido</h3>
                <p className="text-gray-300 text-sm mb-4">
                  Digite o código recebido para ver o status em tempo real.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && acompanhar()}
                    className="h-12 md:h-14 rounded-2xl px-5 text-primary outline-none flex-1 text-base"
                    placeholder="Ex: WC123456"
                  />
                  <button 
                    onClick={acompanhar} 
                    className="h-12 md:h-14 px-8 bg-gold hover:bg-yellow-400 text-primary font-bold rounded-2xl transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <Search size={20} /> Buscar
                  </button>
                </div>
              </div>
            </div>

            {/* Imagem - escondida em telas muito pequenas para evitar corte */}
            <div className="hidden md:block relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                <img
                  src={config.home_banner_url || products[0]?.imagem_principal || 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800&q=80'}
                  alt="Gráfica W Criações"
                  className="w-full h-[520px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-8 left-8">
                  <p className="text-white/90 text-sm uppercase tracking-widest">18 anos de experiência</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* O resto da página permanece igual (Features, Destaques, Categorias) */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card p-6 md:p-8 text-center hover:shadow-xl transition-all group">
              <div className="inline-flex p-4 rounded-2xl bg-gold/10 text-gold mb-6 group-hover:scale-110 transition-transform">
                <Icon size={32} />
              </div>
              <h3 className="font-display font-bold text-xl text-primary mb-3">{title}</h3>
              <p className="text-gray-600 leading-relaxed text-sm md:text-base">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ... (mantenha o resto do código de Produtos em Destaque e Categorias igual) ... */}
    </div>
  );
}