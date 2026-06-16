import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Catalogo } from './pages/Catalogo';
import { Produto } from './pages/Produto';
import { Carrinho } from './pages/Carrinho';
import { Checkout } from './pages/Checkout';
import { Confirmacao } from './pages/Confirmacao';
import { Acompanhar } from './pages/Acompanhar';
import { Login } from './pages/Login';
import { MinhaConta } from './pages/MinhaConta';
import { Sobre } from './pages/Sobre';
import { Contato } from './pages/Contato';
import { AdminLayout } from './pages/admin/AdminLayout';
import { Dashboard } from './pages/admin/Dashboard';
import { Produtos } from './pages/admin/Produtos';
import { Pedidos } from './pages/admin/Pedidos';
import { Clientes } from './pages/admin/Clientes';
import { Categorias } from './pages/admin/Categorias';
import { Configuracoes } from './pages/admin/Configuracoes';
import { Cupons } from './pages/admin/Cupons';
import { Avaliacoes } from './pages/admin/Avaliacoes';
import { Relatorios } from './pages/admin/Relatorios';
import { Usuarios } from './pages/admin/Usuarios';
import { Orcamentos } from './pages/admin/Orcamentos';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="catalogo" element={<Catalogo />} />
            <Route path="produto/:slug" element={<Produto />} />
            <Route path="carrinho" element={<Carrinho />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="pedido-confirmado/:numero" element={<Confirmacao />} />
            <Route path="acompanhar" element={<Acompanhar />} />
            <Route path="login" element={<Login />} />
            <Route path="minha-conta" element={<MinhaConta />} />
            <Route path="sobre" element={<Sobre />} />
            <Route path="contato" element={<Contato />} />
          </Route>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="produtos" element={<Produtos />} />
            <Route path="pedidos" element={<Pedidos />} />
            <Route path="orcamentos" element={<Orcamentos />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="categorias" element={<Categorias />} />
            <Route path="cupons" element={<Cupons />} />
            <Route path="avaliacoes" element={<Avaliacoes />} />
            <Route path="configuracoes" element={<Configuracoes />} />
            <Route path="relatorios" element={<Relatorios />} />
            <Route path="usuarios" element={<Usuarios />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
