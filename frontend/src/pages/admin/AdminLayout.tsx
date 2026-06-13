import { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { Menu, X, LogOut, LayoutDashboard, Package, ShoppingCart, Users, Settings, FolderTree, TicketPercent, Star, BarChart3, UserCog, Home } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

const links = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, key: 'dashboard' },
  { to: '/admin/produtos', label: 'Produtos', icon: Package, key: 'produtos' },
  { to: '/admin/pedidos', label: 'Pedidos', icon: ShoppingCart, key: 'pedidos' },
  { to: '/admin/clientes', label: 'Clientes', icon: Users, key: 'clientes' },
  { to: '/admin/categorias', label: 'Categorias', icon: FolderTree, key: 'categorias' },
  { to: '/admin/cupons', label: 'Cupons', icon: TicketPercent, key: 'cupons' },
  { to: '/admin/avaliacoes', label: 'Avaliações', icon: Star, key: 'avaliacoes' },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings, key: 'configuracoes', adminOnly: true },
  { to: '/admin/relatorios', label: 'Relatórios', icon: BarChart3, key: 'relatorios' },
  { to: '/admin/usuarios', label: 'Usuários', icon: UserCog, key: 'usuarios', adminOnly: true },
];

export function AdminLayout() {
  const [open, setOpen] = useState(false);
  const { user, setUser } = useApp();
  const navigate = useNavigate();

  const role = String(user?.role || '').toLowerCase();
  const permissoes = Array.isArray(user?.funcionario_permissoes) ? user?.funcionario_permissoes : [];
  const isAdmin = role === 'admin';

  const visibleLinks = links.filter((link) => {
    if (isAdmin) return true;
    if (link.adminOnly) return false;
    if (role === 'funcionario') return permissoes.includes(link.key);
    return false;
  });

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('gp_token');
    localStorage.removeItem('token');
    localStorage.removeItem('gp_user');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <header className="sm:hidden fixed top-0 left-0 right-0 z-40 bg-primary text-white safe-top">
        <div className="flex items-center justify-between px-4 h-16">
          <Link to="/" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gold text-primary font-bold">
            <Home size={18} />
            Início
          </Link>
          <p className="font-display font-bold text-sm">Painel</p>
          <button onClick={() => setOpen(!open)} className="p-2 rounded-xl bg-white/10 active:bg-white/20 transition-colors">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {open && (
          <nav className="border-t border-white/10 px-4 py-4 space-y-2 max-h-[75vh] overflow-y-auto">
            {visibleLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/admin'}
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
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-red-300 hover:bg-red-500/20 transition-colors mt-4 border-t border-white/10 pt-4">
              <LogOut size={18} />
              Sair
            </button>
          </nav>
        )}
      </header>

      <aside className="hidden sm:flex flex-col w-64 bg-primary text-white fixed top-0 bottom-0 left-0 z-30">
        <div className="p-5 border-b border-white/10">
          <Link to="/" className="flex items-center justify-center gap-2 mb-4 px-4 py-3 rounded-xl bg-gold text-primary font-bold">
            <Home size={18} />
            Tela inicial
          </Link>
          <div className="flex items-center gap-3">
            <img src="/assets/logo-icon.png" alt="Gráfica W Criações" className="w-10 h-10 rounded-xl bg-white object-contain" />
            <div>
              <p className="font-display font-bold">Painel Admin</p>
              <p className="text-xs text-gray-400">Perfil: {role || 'usuário'}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {visibleLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admin'}
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
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-red-300 hover:bg-red-500/20 transition-colors">
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
