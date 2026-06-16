import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, LayoutDashboard, Package, ShoppingCart, Users, Settings, FolderTree, TicketPercent, Star, BarChart3, UserCog, Home, ClipboardList } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

const links = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/produtos', label: 'Produtos', icon: Package },
  { to: '/admin/pedidos', label: 'Pedidos', icon: ShoppingCart },
  { to: '/admin/orcamentos', label: 'Orçamentos', icon: ClipboardList },
  { to: '/admin/clientes', label: 'Clientes', icon: Users },
  { to: '/admin/categorias', label: 'Categorias', icon: FolderTree },
  { to: '/admin/cupons', label: 'Cupons', icon: TicketPercent },
  { to: '/admin/avaliacoes', label: 'Avaliações', icon: Star },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings },
  { to: '/admin/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/admin/usuarios', label: 'Usuários', icon: UserCog },
];

export function AdminLayout() {
  const [open, setOpen] = useState(false);
  const { user, setUser } = useApp();
  const navigate = useNavigate();

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('gp_token');
    localStorage.removeItem('user');
    localStorage.removeItem('gp_user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <header className="sm:hidden fixed top-0 left-0 right-0 z-40 bg-primary text-white safe-top">
        <div className="flex items-center justify-between px-4 h-16">
          <Link to="/" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gold text-primary font-bold">
            <Home size={18} /> Início
          </Link>
          <button onClick={() => setOpen(!open)} className="p-2 rounded-xl bg-white/10 active:bg-white/20 transition-colors">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {open && (
          <nav className="border-t border-white/10 px-4 py-4 space-y-2 max-h-[75vh] overflow-y-auto">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === '/admin'} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors ${isActive ? 'bg-gold text-primary' : 'text-white/80 hover:bg-white/10'}`}>
                <Icon size={18} /> {label}
              </NavLink>
            ))}
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-red-300 hover:bg-red-500/20 transition-colors mt-4 border-t border-white/10 pt-4">
              <LogOut size={18} /> Sair
            </button>
          </nav>
        )}
      </header>

      <aside className="hidden sm:flex flex-col w-64 bg-primary text-white fixed top-0 bottom-0 left-0 z-30">
        <div className="p-5 border-b border-white/10">
          <Link to="/" className="mb-5 flex items-center justify-center gap-3 rounded-2xl bg-gold text-primary px-4 py-3 font-bold hover:brightness-105 transition">
            <Home size={18} /> Tela inicial
          </Link>
          <div className="flex items-center gap-3">
            <img src="/assets/logo-icon.png" alt="Gráfica W Criações" className="w-10 h-10 rounded-xl bg-white object-contain" />
            <div>
              <p className="font-display font-bold">Painel Admin</p>
              <p className="text-xs text-gray-400">Perfil: {user?.role || 'admin'}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/admin'} className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors ${isActive ? 'bg-white text-primary' : 'text-white/80 hover:bg-white/10'}`}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-red-300 hover:bg-red-500/20 transition-colors">
            <LogOut size={18} /> Sair do Painel
          </button>
        </div>
      </aside>

      <main className="flex-1 sm:ml-64 pt-16 sm:pt-0 min-w-0">
        <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
