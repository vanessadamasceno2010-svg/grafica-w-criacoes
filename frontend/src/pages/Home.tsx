import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Clock, ShieldCheck, Truck, MessageCircle, ArrowRight, Search } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { apiFetch, mockProducts, mockCategories, BRAND, WHATSAPP_NUMBER } from '../lib/api';

export function Home() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<Record<string, string>>({});
  const [codigo, setCodigo] = useState('');

  useEffect(() => {
    apiFetch<Record<string, string>>('/configuracoes')
      .then(setConfig)
      .catch(() => null);
  }, []);

  const features = [
    { icon: Sparkles, title: 'Design Premium', desc: 'Acabamentos de alta qualidade que valorizam sua marca.' },
    { icon: Clock, title: 'Produção Rápida', desc: 'Prazos ágeis sem comprometer a excelência do produto.' },
    { icon: ShieldCheck, title: 'Pedido Controlado', desc: 'Acompanhe cada etapa da produção do seu pedido.' },
    { icon: Truck, title: 'Entrega ou Retirada', desc: 'Flexibilidade para receber onde e quando for melhor.' }
  ];

  const titulo = config.home_titulo || 'Produtos personalizados com impacto real.';
  const subtitulo = config.home_subtitulo || 'Escolha os produtos, monte seu carrinho e finalize o pedido diretamente pelo WhatsApp com atendimento personalizado.';
  const badge = config.home_badge || 'Padrão visual premium';
  const banner = config.home_banner_url || 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800&q=80';
  const btnCatalogo = config.home_botao_catalogo || 'Ver Catálogo';
  const btnWhatsapp = config.home_botao_whatsapp || 'Falar no WhatsApp';
  const acompanharTitulo = config.acompanhar_titulo || 'Acompanhe seu pedido';
  const acompanharSubtitulo = config.acompanhar_subtitulo || 'Digite o código do pedido para consultar o andamento da produção.';
  const whats = (config.whatsapp || WHATSAPP_NUMBER).replace(/\D/g, '');

  function buscarPedido() {
    if (!codigo.trim()) return;
    navigate('/acompanhar?pedido=' + encodeURIComponent(codigo.trim()));
  }

  return (
    <div className="fade-in">
      <section className="brand-gradient text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
        <div className="relative max-w-5xl mx-auto px-4 py-12 sm:py-20">
          <div className="text-center sm:text-left sm:flex sm:items-center sm:gap-12">
            <div className="sm:flex-1">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-sm font-semibold mb-6 border border-white/10">
                <Sparkles size={14} className="text-gold" />
                {badge}
              </span>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
                {titulo}
              </h1>
              <p className="text-gray-300 text-lg mb-8 leading-relaxed max-w-xl">
                {subtitulo}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/catalogo" className="btn btn-primary text-base">
                  {btnCatalogo}
                  <ArrowRight size={18} />
                </Link>
                <a href={'https://wa.me/' + whats} target="_blank" rel="noopener noreferrer" className="btn btn-whats text-base">
                  <MessageCircle size={18} />
                  {btnWhatsapp}
                </a>
              </div>
            </div>
            <div className="mt-10 sm:mt-0 sm:flex-1 relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                <img src={banner} alt="Banner principal" className="w-full h-64 sm:h-96 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 -mt-8 relative z-10">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-5 sm:p-6">
          <div className="grid md:grid-cols-[1fr_auto] gap-4 items-end">
            <div>
              <h2 className="font-display text-2xl font-black text-primary mb-1">{acompanharTitulo}</h2>
              <p className="text-slate-500 mb-3">{acompanharSubtitulo}</p>
              <label className="block text-sm font-bold text-slate-700 mb-2">Código do pedido</label>
              <input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscarPedido()}
                className="w-full h-14 rounded-2xl border-2 border-slate-200 px-5 text-lg font-bold tracking-wide outline-none focus:border-gold focus:ring-4 focus:ring-gold/10"
                placeholder="Ex: WC1234567890"
              />
            </div>
            <button onClick={buscarPedido} className="h-14 px-6 rounded-2xl bg-primary text-white font-black flex items-center justify-center gap-2">
              <Search size={20} />
              Acompanhar
            </button>
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
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary">Produtos em Destaque</h2>
          <Link to="/catalogo" className="text-gold font-semibold text-sm flex items-center gap-1 active:opacity-70">
            Ver todos <ArrowRight size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {mockProducts.filter(p => p.destaque).slice(0, 3).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-8 sm:py-12 mb-8">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary mb-6">Categorias</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {mockCategories.map((cat) => (
            <Link key={cat.id} to={'/catalogo?categoria=' + cat.slug} className="card p-4 flex flex-col items-center text-center gap-3 active:scale-95 transition-transform">
              <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center">
                <Sparkles size={20} className="text-primary" />
              </div>
              <span className="font-semibold text-sm text-primary">{cat.nome}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Home;
