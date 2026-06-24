import { useEffect, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { WhatsAppButton } from './WhatsAppButton';
import { SEO } from './SEO';

export function Layout() {
  const [config, setConfig] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/configuracoes')
      .then(res => res.json())
      .then(setConfig)
      .catch(() => null);
  }, []);

  const nome = config.nome_empresa || 'Gráfica W Criações';

  return (
    <div className="min-h-screen flex flex-col">
      <SEO 
        title="Gráfica em Guaraciaba do Norte"
        description="Especializada em impressão de materiais promocionais, brindes corporativos, embalagens e sacolas de papel personalizadas com qualidade premium."
        keywords="gráfica guaraciaba do norte, brindes corporativos, embalagens personalizadas, sacolas de papel, impressão digital, adesivos, banners, materiais para empresas"
      />

      <Header />
      
      <main className="flex-1 pb-20 sm:pb-0">
        <Outlet />
      </main>

      <BottomNav />

      <footer className="bg-primary text-white mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="grid md:grid-cols-4 gap-10">
            <div>
              <div className="flex items-center gap-3 mb-6">
                {config.logo_site_url ? (
                  <img src={config.logo_site_url} className="w-12 h-12 rounded-2xl object-contain bg-white/10" alt={nome} />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                    <span className="text-gold font-display font-bold text-3xl">W</span>
                  </div>
                )}
                <span className="font-display font-bold text-2xl">{nome}</span>
              </div>
              <p className="text-gray-300 leading-relaxed">
                Impressão profissional, brindes corporativos, embalagens e sacolas personalizadas. Qualidade que valoriza sua marca.
              </p>
              <p className="text-gold font-medium mt-4">18 anos de experiência no mercado</p>
            </div>

            <div>
              <h4 className="font-display font-bold text-lg mb-5">Produtos</h4>
              <ul className="space-y-3 text-gray-300">
                <li>Brindes Corporativos</li>
                <li>Embalagens Personalizadas</li>
                <li>Sacolas de Papel</li>
                <li>Impressos Promocionais</li>
              </ul>
            </div>

            <div>
              <h4 className="font-display font-bold text-lg mb-5">Atendimento</h4>
              <ul className="space-y-3 text-gray-300">
                <li>WhatsApp: (88) 99624-0470</li>
                <li>Guaraciaba do Norte - CE</li>
              </ul>
            </div>

            <div>
              <h4 className="font-display font-bold text-lg mb-5">Empresa</h4>
              <ul className="space-y-3 text-gray-300">
                <li><Link to="/" className="hover:text-gold">Início</Link></li>
                <li><Link to="/catalogo" className="hover:text-gold">Catálogo</Link></li>
                <li><Link to="/sobre" className="hover:text-gold">Sobre Nós</Link></li>
                <li><Link to="/contato" className="hover:text-gold">Contato</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 py-6 text-center text-sm text-gray-400">
          © {new Date().getFullYear()} {nome}. Todos os direitos reservados.
        </div>
      </footer>

      <WhatsAppButton />
    </div>
  );
}

export default Layout;