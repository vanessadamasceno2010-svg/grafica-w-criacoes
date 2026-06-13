import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  LogOut,
  Home,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  FolderTree,
  TicketPercent,
  Star,
  BarChart3,
  UserCog
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

const allLinks = [
  { to: '/', label: 'Tela inicial', icon: Home, roles: ['admin', 'funcionario'] },
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'funcionario'] },
  { to: '/admin/produtos', label: 'Produtos', icon: Package, roles: ['admin', 'funcionario'] },
  { to: '/admin/pedidos', label: 'Pedidos', icon: ShoppingCart, roles: ['admin', 'funcionario'] },
  { to: '/admin/clientes', label: 'Clientes', icon: Users, roles: ['admin', 'funcionario'] },
  { to: '/admin/categorias', label: 'Categorias', icon: FolderTree, roles: ['admin'] },
  { to: '/admin/cupons', label: 'Cupons', icon: TicketPercent, roles: ['admin'] },
  { to: '/admin/avaliacoes', label: 'Avaliações', icon: Star, roles: ['admin', 'funcionario'] },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings, roles: ['admin'] },
  { to: '/admin/relatorios', label: 'Relatórios', icon: BarChart3, roles: ['admin'] },
  { to: '/admin/usuarios', label: 'Usuários', icon: UserCog, roles: ['admin'] }
];

export function AdminLayout() {
  const [open, setOpen] = useState(false);
  const { user, setUser } = useApp();
  const navigate = useNavigate();
  const role = String(user?.role || 'user').toLowerCase();
  const links = allLinks.filter((link) => link.roles.includes(role));

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('gp_token');
    localStorage.removeItem('gp_user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <header className="sm:hidden fixed top-0 left-0 right-0 z-40 bg-primary text-white safe-top">
        <div className="flex items-center justify-between px-4 h-16">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 rounded-xl bg-gold text-primary px-3 py-2 font-bold"
          >
            <Home size={18} />
            Início
          </button>
          <div className="text-center min-w-0">
            <p className="font-display font-bold text-sm truncate">Painel</p>
            <p className="text-[11px] text-gray-300 truncate">{role}</p>
          </div>
          <button
            onClick={() => setOpen(!open)}
            className="p-2 rounded-xl bg-white/10 active:bg-white/20 transition-colors"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {open && (
          <nav className="border-t border-white/10 px-4 py-4 space-y-2 max-h-[75vh] overflow-y-auto">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/admin' || to === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors ${
                    isActive ? 'bg-gold text-primary' : 'text-white/80 hover:bg-white/10'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-red-300 hover:bg-red-500/20 transition-colors mt-4 border-t border-white/10 pt-4"
            >
              <LogOut size={18} />
              Sair
            </button>
          </nav>
        )}
      </header>

      <aside className="hidden sm:flex flex-col w-64 bg-primary text-white fixed top-0 bottom-0 left-0 z-30">
        <div className="p-6 border-b border-white/10">
          <button
            onClick={() => navigate('/')}
            className="w-full mb-4 flex items-center justify-center gap-2 rounded-xl bg-gold text-primary px-4 py-3 font-black hover:bg-gold/90 transition-colors"
          >
            <Home size={18} />
            Tela inicial
          </button>
          <div className="flex items-center gap-3">
            <img src="/assets/logo-icon.png" alt="Gráfica W Criações" className="w-10 h-10 rounded-xl bg-white object-contain" />
            <div>
              <p className="font-display font-bold">Painel Admin</p>
              <p className="text-xs text-gray-400">Perfil: {role}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admin' || to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors ${
                  isActive ? 'bg-white text-primary' : 'text-white/80 hover:bg-white/10'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-red-300 hover:bg-red-500/20 transition-colors"
          >
            <LogOut size={18} />
            Sair do Painel
          </button>
        </div>
      </aside>

      <main className="flex-1 sm:ml-64 pt-16 sm:pt-0">
        <div className="max-w-6xl mx-auto p-4 sm:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
