import { useEffect, useState } from 'react'; // Corrigido de "Import" para "import"
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
    // Busca as configurações públicas com segurança
    getPublicConfig()
      .then(setConfig)
      .catch((err) => console.error("Erro ao carregar configurações públicas:", err));

    // Busca os produtos com tratamento seguro de respostas nulas/indefinidas
    apiFetch<{ data: any[] }>('/produtos?limit=12')
      .then((res) => {
        const list = (res?.data || []).map(normalizeProduct);
        setProducts(list.sort((a, b) => Number(b.destaque) - Number(a.destaque)));
      })
      .catch((err) => {
        console.error("Erro ao buscar produtos da API:", err);
        setProducts([]);
      });

    // Busca as categorias de forma segura
    apiFetch<any[]>('/categorias')
      .then((rows) => setCategories((rows || []).map(normalizeCategory)))
      .catch((err) => {
        console.error("Erro ao buscar categorias da API:", err);
        setCategories([]);
      });
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

        {/* Categorias */}
        <section className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="font-display font-bold text-3xl text-primary mb-8 text-center md:text-left">Categorias</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {categories.map((cat) => (
              <Link key={cat.id} to={`/catalogo?categoria=${cat.slug}`} className="card p-4 text-center hover:border-gold hover:shadow-md transition-all">
                {cat.imagem && (
                  <img src={cat.imagem} alt={cat.nome} className="w-16 h-16 object-contain mx-auto mb-3 rounded" />
                )}
                <span className="font-medium text-sm text-gray-800 break-words">{cat.nome}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Produtos em Destaque */}
        <section className="max-w-6xl mx-auto px-4 py-12 mb-12">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
            <h2 className="font-display font-bold text-3xl text-primary">Produtos em Destaque</h2>
            <Link to="/catalogo" className="text-primary hover:text-gold font-medium flex items-center gap-1 transition-colors">
              Ver todos os produtos <ArrowRight size={18} />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        {/* Caixa de Acompanhamento de Pedido */}
        <section className="max-w-md mx-auto px-4 py-12">
          <div className="card p-6 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50/50">
            <h3 className="font-display font-bold text-lg text-primary mb-2 flex items-center gap-2">
              <Search size={20} className="text-gold" /> Já tem um projeto conosco?
            </h3>
            <p className="text-gray-600 text-sm mb-4">Insira o código do seu pedido para acompanhar o andamento.</p>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Ex: #1234" 
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && acompanhar()}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:border-primary text-gray-800"
              />
              <button onClick={acompanhar} className="btn btn-primary px-4 py-2 rounded-xl text-sm font-semibold">
                Buscar
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
