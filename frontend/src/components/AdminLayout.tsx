import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, Boxes, ClipboardList, Users, FolderTree, TicketPercent, Star, Settings, MessageSquare, FileText, UserCog, Menu, X } from 'lucide-react';

const links = [
  { label: 'Dashboard', icon: BarChart3 },
  { label: 'Produtos', icon: Boxes },
  { label: 'Pedidos', icon: ClipboardList },
  { label: 'Clientes', icon: Users },
  { label: 'Categorias', icon: FolderTree },
  { label: 'Cupons', icon: TicketPercent },
  { label: 'Avaliações', icon: Star },
  { label: 'Configurações', icon: Settings },
  { label: 'Contatos', icon: MessageSquare },
  { label: 'Relatórios', icon: FileText },
  { label: 'Usuários', icon: UserCog }
];

const path = (label: string) => '/admin' + (label === 'Dashboard' ? '' : '/' + label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));

export function AdminLayout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <img src="/assets/logo-wide.jpeg" alt="Gráfica W Criações" className="admin-sidebar-logo" />
        <h2>Painel Admin</h2>
        <p>Gestão da gráfica</p>
        <nav>
          {links.map(({ label, icon: Icon }) => (
            <NavLink key={label} to={path(label)} className={({ isActive }) => (isActive ? 'active' : '')}><Icon size={19} />{label}</NavLink>
          ))}
        </nav>
      </aside>

      <header className="admin-mobile-header">
        <div className="admin-mobile-top">
          <div className="admin-mobile-brand"><img src="/assets/logo-icon.png" alt="Gráfica W Criações" /><div><strong>Painel Admin</strong><small>Gráfica W Criações</small></div></div>
          <button onClick={() => setOpen(true)} aria-label="Abrir menu admin"><Menu size={24} /></button>
        </div>
      </header>

      {open && (
        <div className="admin-drawer-backdrop" onClick={() => setOpen(false)}>
          <aside className="admin-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head"><img src="/assets/logo-icon.png" alt="Gráfica W Criações" /><div><strong>Painel Admin</strong><small>Escolha uma seção</small></div><button onClick={() => setOpen(false)}><X size={22} /></button></div>
            <nav className="drawer-nav">
              {links.map(({ label, icon: Icon }) => <NavLink key={label} to={path(label)} onClick={() => setOpen(false)}><Icon size={19} />{label}</NavLink>)}
            </nav>
          </aside>
        </div>
      )}

      <section className="admin-content"><Outlet /></section>

      <nav className="admin-bottom-nav">
        {links.slice(0, 5).map(({ label, icon: Icon }) => <NavLink key={label} to={path(label)}><Icon size={20} /><span>{label}</span></NavLink>)}
      </nav>
    </div>
  );
}
