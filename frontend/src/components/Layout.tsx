import { useEffect, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { WhatsAppButton } from './WhatsAppButton';   // ← Adicionado

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
      
      {/* Footer melhorado */}
      <footer className="hidden sm:block bg-primary text-white mt-auto">
        <div className="max-w-5xl mx-auto px-4 py-12 grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              {config.logo_site_url ? (
                <img src={config.logo_site_url} className="w-10 h-10 rounded-xl object-contain bg-white/10" alt={nome} />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <span className="text-gold font-display font-bold text-xl">W</span>
                </div>
              )}
              <span className="font-display font-bold text-xl">{nome}</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              {config.sobre || 'Impressos, brindes, bordados e personalizados com padrão premium há mais de 30 anos.'}
            </p>
          </div>

          <div>
            <h4 className="font-display font-bold mb-4">Loja</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/catalogo" className="hover:text-gold transition-colors">Catálogo</Link></li>
              <li><Link to="/carrinho" className="hover:text-gold transition-colors">Carrinho</Link></li>
              <li><Link to="/acompanhar" className="hover:text-gold transition-colors">Acompanhar pedido</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold mb-4">Atendimento</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>WhatsApp: <a href={`https://wa.me/88996240470`} className="hover:text-gold">{telefone}</a></li>
              <li>Email: <a href={`mailto:${email}`} className="hover:text-gold">{email}</a></li>
              <li>Endereço: {endereco}</li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold mb-4">Institucional</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/" className="hover:text-gold transition-colors">Início</Link></li>
              <li><Link to="/sobre" className="hover:text-gold transition-colors">Sobre Nós</Link></li>
              <li><Link to="/contato" className="hover:text-gold transition-colors">Contato</Link></li>
              <li><Link to="/login" className="hover:text-gold transition-colors">Área do Cliente</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 py-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} {nome}. Todos os direitos reservados. | CNPJ: em breve
        </div>
      </footer>

      {/* Botão WhatsApp Flutuante */}
      <WhatsAppButton />
    </div>
  );
}

export default Layout;
