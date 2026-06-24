import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Clock, ShieldCheck, Truck, MessageCircle, ArrowRight, Search } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { SEO } from '../components/SEO';
import { apiFetch, Category, Product, getPublicConfig, normalizeCategory, normalizeProduct, whatsappUrl } from '../lib/api';

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
    { icon: Sparkles, title: 'Qualidade Premium', desc: 'Impressão e acabamento profissional para sua marca.' },
    { icon: Clock, title: 'Produção Rápida', desc: 'Prazos ágeis para materiais promocionais e brindes.' },
    { icon: ShieldCheck, title: 'Pedido Controlado', desc: 'Acompanhe todo o processo do seu projeto.' },
    { icon: Truck, title: 'Entrega em Todo Ceará', desc: 'Flexibilidade e pontualidade na entrega.' }
  ];

  function acompanhar() {
    const q = codigo.trim();
    if (q) navigate('/acompanhar?pedido=' + encodeURIComponent(q));
  }

  return (
    <>
      <SEO 
        title="Gráfica em Guaraciaba do Norte"
        description="Impressão de materiais promocionais, brindes corporativos, embalagens e sacolas personalizadas com qualidade premium. Atendemos empresas em toda região."
        keywords="gráfica guaraciaba do norte, brindes corporativos, embalagens personalizadas, sacolas de papel, impressão digital, adesivos, banners"
      />

      <div className="fade-in">
        {/* Hero Section */}
        <section className="relative min-h-[85vh] md:min-h-[90vh] flex items-center bg-gradient-to-br from-primary via-primary to-primary/90 text-white overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://picsum.photos/id/1015/2000/1200')] bg-cover bg-center opacity-20" />
          <div className="absolute inset-0 bg-black/40" />
          
          <div className="relative max-w-6xl mx-auto px-4 py-12 md:py-20 w-full">
            <div className="grid md:grid-cols-2 gap-10 md:gap-12 items-center">
              <div className="space-y-6 md:space-y-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm font-medium backdrop-blur-md">
                  <Sparkles size={18} className="text-gold" />
                  18 anos de Excelência
                </div>

                <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tighter">
                  Sua marca merece<br />
                  <span className="text-gold">o melhor visual</span>
                </h1>

                <p className="text-lg md:text-xl text-gray-200 leading-relaxed max-w-lg">
                  Especialistas em impressão, brindes corporativos, embalagens e sacolas personalizadas para empresas.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/catalogo" className="btn btn-primary text-base sm:text-lg px-8 py-4 flex items-center justify-center gap-3 font-semibold rounded-2xl">
                    Ver Catálogo Completo <ArrowRight size={22} />
                  </Link>

                  <a href={whatsappUrl('Olá! Quero um orçamento para brindes e impressos.')} target="_blank" rel="noopener noreferrer" className="btn btn-whats text-base sm:text-lg px-8 py-4 flex items-center justify-center gap-3 font-semibold rounded-2xl">
                    <MessageCircle size={24} /> Falar no WhatsApp
                  </a>
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

        {/* Produtos em Destaque e Categorias (mantidos) */}
        {/* ... (o resto do seu código de produtos e categorias pode ficar igual) ... */}
      </div>
    </>
  );
}