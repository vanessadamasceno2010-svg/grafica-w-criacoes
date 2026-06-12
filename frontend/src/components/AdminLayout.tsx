import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  BarChart3, Boxes, ClipboardList, Users, FolderTree, TicketPercent,
  Star, Settings, MessageSquare, FileText, UserCog, Menu, X
} from 'lucide-react';

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

const path = (label: string) =>
  '/admin' + (label === 'Dashboard' ? '' : '/' + label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));

export function AdminLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="premium-admin-shell">
      <aside className="premium-admin-sidebar">
        <img src="/assets/logo-wide.jpeg" alt="Gráfica W Criações" />
        <h2>Painel Admin</h2>
        <p>Gestão da gráfica</p>
        <nav>
          {links.map(({ label, icon: Icon }) => (
            <NavLink key={label} to={path(label)} className={({ isActive }) => isActive ? 'active' : ''}>
              <Icon size={19} /> {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <header className="premium-admin-mobile-header">
        <div>
          <img src="/assets/logo-icon.png" alt="Gráfica W Criações" />
          <div>
            <strong>Painel Admin</strong>
            <small>Gráfica W Criações</small>
          </div>
        </div>
        <button onClick={() => setOpen(true)} aria-label="Abrir menu admin"><Menu size={24} /></button>
      </header>

      {open && (
        <div className="premium-drawer-backdrop" onClick={() => setOpen(false)}>
          <aside className="premium-drawer admin-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="premium-drawer-head">
              <img src="/assets/logo-icon.png" alt="Gráfica W Criações" />
              <div>
                <strong>Painel Admin</strong>
                <small>Escolha uma seção</small>
              </div>
              <button onClick={() => setOpen(false)}><X size={22} /></button>
            </div>

            <nav className="premium-drawer-nav">
              {links.map(({ label, icon: Icon }) => (
                <NavLink key={label} to={path(label)} onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}>
                  <Icon size={19} /> {label}
                </NavLink>
              ))}
            </nav>
          </aside>
        </div>
      )}

      <section className="premium-admin-content">
        <Outlet />
      </section>

      <nav className="premium-admin-bottom-nav">
        {links.slice(0, 5).map(({ label, icon: Icon }) => (
          <NavLink key={label} to={path(label)}>
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
