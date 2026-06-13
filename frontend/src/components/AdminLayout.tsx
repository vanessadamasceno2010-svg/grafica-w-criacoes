import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  FolderTree,
  Ticket,
  Star,
  Settings,
  MessageCircle,
  BarChart3,
  LogOut,
  Home
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';

const links = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/produtos', label: 'Produtos', icon: Package },
  { to: '/admin/pedidos', label: 'Pedidos', icon: ShoppingCart },
  { to: '/admin/clientes', label: 'Clientes', icon: Users },
  { to: '/admin/categorias', label: 'Categorias', icon: FolderTree },
  { to: '/admin/cupons', label: 'Cupons', icon: Ticket },
  { to: '/admin/avaliacoes', label: 'Avaliações', icon: Star },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings },
  { to: '/admin/contatos', label: 'Contatos', icon: MessageCircle },
  { to: '/admin/relatorios', label: 'Relatórios', icon: BarChart3 }
];

export function AdminLayout() {
  const { setUser } = useApp();

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('gp_token');
    setUser(null);
    window.location.href = '/login';
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-slate-950 text-white fixed inset-y-0 left-0 z-40 hidden lg:flex flex-col">
        <div className="p-6 border-b border-white/10">
          <Link to="/" className="flex items-center gap-3 mb-4 rounded-2xl bg-white/5 hover:bg-white/10 p-3 transition">
            <Home size={18} />
            <span className="font-bold">Ir para Home</span>
          </Link>

          <div className="flex items-center gap-3">
            <img src="/assets/logo-icon.png" className="w-10 h-10 rounded-full" />
            <div>
              <h2 className="font-bold text-lg">Painel Admin</h2>
              <p className="text-xs text-slate-400">Gráfica W Criações</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon;

            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/admin'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium ${
                    isActive
                      ? 'bg-white text-slate-950'
                      : 'text-slate-400 hover:text-white hover:bg-white/10'
                  }`
                }
              >
                <Icon size={18} />
                {link.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2">
          <Link to="/" className="flex items-center gap-3 px-4 py-3 rounded-xl text-emerald-300 hover:bg-white/10">
            <Home size={18} />
            Ir para Home
          </Link>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10"
          >
            <LogOut size={18} />
            Sair do Painel
          </button>
        </div>
      </aside>

      <main className="flex-1 lg:ml-64 pb-24">
        <div className="lg:hidden sticky top-0 z-40 bg-slate-950 text-white px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold">
            <Home size={18} />
            Home
          </Link>
          <span className="font-bold">Painel Admin</span>
          <button onClick={logout} className="text-red-300 text-sm font-bold">Sair</button>
        </div>

        <Outlet />
      </main>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-950 border-t border-white/10 z-50 grid grid-cols-5 gap-1 px-2 py-2">
        {links.slice(0, 5).map((link) => {
          const Icon = link.icon;

          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/admin'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-semibold ${
                  isActive ? 'bg-amber-400 text-slate-950' : 'text-slate-300'
                }`
              }
            >
              <Icon size={18} />
              {link.label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
