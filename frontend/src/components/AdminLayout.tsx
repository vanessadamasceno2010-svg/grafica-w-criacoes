import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const links = [
  'Dashboard',
  'Produtos',
  'Pedidos',
  'Clientes',
  'Categorias',
  'Cupons',
  'Avaliações',
  'Configurações',
  'Contatos',
  'Relatórios',
  'Usuários'
];

const path = (label: string) =>
  '/admin' +
  (label === 'Dashboard'
    ? ''
    : '/' +
      label
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''));

export function AdminLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="admin-shell">
      <header className="admin-mobile-header">
        <div className="admin-mobile-top">
          <div className="admin-mobile-brand">
            <img src="/assets/logo-icon.png" alt="Gráfica W Criações" />
            <div>
              <b>Painel Admin</b>
              <span>Gráfica W Criações</span>
            </div>
          </div>

          <button
            type="button"
            className="admin-menu-button"
            onClick={() => setOpen(!open)}
            aria-label="Abrir menu administrativo"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {open && (
          <nav className="admin-mobile-nav">
            {links.map((label) => (
              <NavLink
                key={label}
                to={path(label)}
                onClick={() => setOpen(false)}
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                {label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <aside className="admin-sidebar">
        <img src="/assets/logo-wide.jpeg" alt="Gráfica W Criações" className="rounded-2xl mb-8" />
        <h2 className="font-display text-2xl mb-5">Painel Admin</h2>

        <nav className="grid gap-2">
          {links.map((label) => (
            <NavLink
              key={label}
              to={path(label)}
              className={({ isActive }) =>
                `px-4 py-3 rounded-xl transition ${
                  isActive ? 'bg-white text-primary font-extrabold' : 'hover:bg-white/10'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <section className="admin-content">
        <Outlet />
      </section>
    </div>
  );
}
