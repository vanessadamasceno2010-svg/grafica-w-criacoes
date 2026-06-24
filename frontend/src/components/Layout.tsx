import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { WhatsAppButton } from './WhatsAppButton';

export function Layout() {
  const [config, setConfig] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/configuracoes')
      .then(res => {
        // Verifica se a resposta do servidor foi bem-sucedida (status 200-299)
        if (!res.ok) {
          throw new Error(`Erro no servidor: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        if (data && typeof data === 'object') {
          setConfig(data);
        }
      })
      .catch(err => {
        // Registra o erro no console para diagnóstico, mas impede a tela branca
        console.error("Erro ao carregar configurações do site:", err);
      });
  }, []);

  const nome = config.nome_empresa || 'Gráfica W Criações';

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 pb-20 sm:pb-0">
        <Outlet />
      </main>

      <BottomNav />

      <footer className="bg-primary text-white mt-auto py-8 text-center">
        <p>© {new Date().getFullYear()} {nome}</p>
      </footer>

      <WhatsAppButton />
    </div>
  );
}

export default Layout;
