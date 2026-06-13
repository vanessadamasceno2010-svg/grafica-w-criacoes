import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  FolderTree,
  TicketPercent,
  Star,
  BarChart3,
  UserCog,
  Home
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { apiFetch } from '../../lib/api';


function readStoredUser() {
  const raw = localStorage.getItem('gp_user') || localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const allLinks = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, permissao: 'dashboard', adminOnly: false },
  { to: '/admin/produtos', label: 'Produtos', icon: Package, permissao: 'produtos', adminOnly: false },
  { to: '/admin/pedidos', label: 'Pedidos', icon: ShoppingCart, permissao: 'pedidos', adminOnly: false },
  { to: '/admin/clientes', label: 'Clientes', icon: Users, permissao: 'clientes', adminOnly: false },
  { to: '/admin/categorias', label: 'Categorias', icon: FolderTree, permissao: 'categorias', adminOnly: true },
  { to: '/admin/cupons', label: 'Cupons', icon: TicketPercent, permissao: 'cupons', adminOnly: true },
  { to: '/admin/avaliacoes', label: 'Avaliações', icon: Star, permissao: 'avaliacoes', adminOnly: false },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings, permissao: 'configuracoes', adminOnly: true },
  { to: '/admin/relatorios', label: 'Relatórios', icon: BarChart3, permissao: 'relatorios', adminOnly: false },
  { to: '/admin/usuarios', label: 'Usuários', icon: UserCog, permissao: 'usuarios', adminOnly: true }
];

export function AdminLayout() {
  const [open, setOpen] = useState(false);
  const [permissoes, setPermissoes] = useState<string[]>([]);
  const { user, setUser } = useApp();
  const navigate = useNavigate();

  const activeUser = user || readStoredUser();
  const role = String(activeUser?.role || '').toLowerCase();
  const isAdmin = role === 'admin';

  useEffect(() => {
    if (!activeUser) {
      navigate('/login');
      return;
    }

    if (!['admin', 'funcionario', 'staff', 'employee'].includes(role)) {
      navigate('/minha-conta');
      return;
    }

    if (isAdmin) {
      setPermissoes(allLinks.map((l) => l.permissao));
      return;
    }

    apiFetch<any>('/admin/me/permissoes')
      .then((data) => setPermissoes(Array.isArray(data.permissoes) ? data.permissoes : ['dashboard', 'pedidos']))
      .catch(() => setPermissoes(['dashboard', 'pedidos']));
  }, [activeUser?.id, role]);

  const links = useMemo(() => {
    if (isAdmin) return allLinks;

    return allLinks.filter((link) => !link.adminOnly && permissoes.includes(link.permissao));
  }, [isAdmin, permissoes]);

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('gp_token');
    localStorage.removeItem('user');
    localStorage.removeItem('gp_user');
    setUser(null);
    navigate('/login');
  }

  const sidebarLinks = (
    <>
      <Link
        to="/"
        onClick={() => setOpen(false)}
        className="flex items-center gap-3 px-4 py-3 rounded-xl font-bold bg-gold text-primary hover:bg-gold/90 transition-colors mb-3"
      >
        <Home size={18} />
        Tela inicial
      </Link>

      {links.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/admin'}
          onClick={() => setOpen(false)}
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
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <header className="sm:hidden fixed top-0 left-0 right-0 z-40 bg-primary text-white safe-top">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/assets/logo-icon.png" alt="Gráfica W Criações" className="w-9 h-9 rounded-xl bg-white object-contain flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-display font-bold text-sm truncate">Painel</p>
              <p className="text-xs text-gray-300 truncate">Perfil: {role || 'usuário'}</p>
            </div>
          </div>
          <button onClick={() => setOpen(!open)} className="p-2 rounded-xl bg-white/10 active:bg-white/20 transition-colors">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {open && (
          <nav className="border-t border-white/10 px-4 py-4 space-y-2 max-h-[75vh] overflow-y-auto">
            {sidebarLinks}
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
          <div className="flex items-center gap-3">
            <img src="/assets/logo-icon.png" alt="Gráfica W Criações" className="w-10 h-10 rounded-xl bg-white object-contain" />
            <div>
              <p className="font-display font-bold">Painel Admin</p>
              <p className="text-xs text-gray-400">Perfil: {role || 'usuário'}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">{sidebarLinks}</nav>

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
