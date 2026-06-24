import { useEffect, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { WhatsAppButton } from './WhatsAppButton';

export function Layout() {
  const [config, setConfig] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/configuracoes')
      .then(res => res.json())
      .then(setConfig)
      .catch(() => null);
  }, []);

  const nome = config.nome_empresa || 'Gráfica W Criações';
  const telefone = config.telefone || config.whatsapp || '(88) 99624-0470';
  const email = config.email || 'contato@graficawcriacoes.com';
  const endereco = config.endereco || 'Guaraciaba do Norte - CE';

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 pb-20 sm:pb-0">
        <Outlet />
      </main>

      <BottomNav />

      {/* ==================== FOOTER MELHORADO ==================== */}
      <footer className="bg-primary text-white mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="grid md:grid-cols-4 gap-10">
            
            {/* Coluna 1 - Sobre */}
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
                Impressos, brindes, bordados computadorizados e artigos personalizados com qualidade premium.
              </p>
              <p className="text-gold font-medium mt-4">18 anos de experiência no mercado</p>
            </div>

            {/* Coluna 2 - Loja */}
            <div>
              <h4 className="font-display font-bold text-lg mb-5">Loja</h4>
              <ul className="space-y-3 text-gray-300">
                <li><Link to="/catalogo" className="hover:text-gold transition-colors">Catálogo Completo</Link></li>
                <li><Link to="/carrinho" className="hover:text-gold transition-colors">Meu Carrinho</Link></li>
                <li><Link to="/acompanhar" className="hover:text-gold transition-colors">Acompanhar Pedido</Link></li>
              </ul>
            </div>

            {/* Coluna 3 - Atendimento */}
            <div>
              <h4 className="font-display font-bold text-lg mb-5">Atendimento</h4>
              <ul className="space-y-3 text-gray-300">
                <li>
                  <a href={`https://wa.me/88996240470`} className="hover:text-gold transition-colors">
                    WhatsApp: {telefone}
                  </a>
                </li>
                <li>
                  <a href={`mailto:${email}`} className="hover:text-gold transition-colors">
                    E-mail: {email}
                  </a>
                </li>
                <li className="text-gray-300">Endereço: {endereco}</li>
              </ul>
            </div>

            {/* Coluna 4 - Institucional */}
            <div>
              <h4 className="font-display font-bold text-lg mb-5">Institucional</h4>
              <ul className="space-y-3 text-gray-300">
                <li><Link to="/" className="hover:text-gold transition-colors">Início</Link></li>
                <li><Link to="/sobre" className="hover:text-gold transition-colors">Sobre Nós</Link></li>
                <li><Link to="/contato" className="hover:text-gold transition-colors">Contato</Link></li>
                <li><Link to="/login" className="hover:text-gold transition-colors">Área do Cliente</Link></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Linha inferior */}
        <div className="border-t border-white/10 py-6 text-center text-sm text-gray-400">
          © {new Date().getFullYear()} {nome}. Todos os direitos reservados.
          <br className="sm:hidden" />
          <span className="mx-2 hidden sm:inline">•</span>
          CNPJ: em breve • Guaraciaba do Norte - CE
        </div>
      </footer>

      {/* Botão WhatsApp Flutuante */}
      <WhatsAppButton />
    </div>
  );
}

export default Layout;
