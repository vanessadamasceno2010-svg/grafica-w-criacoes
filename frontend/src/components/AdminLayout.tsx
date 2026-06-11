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
    <div className="min-h-screen bg-gray-100">
      <header className="lg:hidden sticky top-0 z-50 bg-primary text-white border-b border-white/10">
        <div className="px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/assets/logo-icon.png"
              alt="Gráfica W Criações"
              className="w-10 h-10 rounded-xl bg-white object-contain"
            />
            <div className="min-w-0">
              <p className="font-display font-extrabold leading-tight truncate">
                Painel Admin
              </p>
              <p className="text-xs text-white/70 truncate">Gráfica W Criações</p>
            </div>
          </div>

          <button
            type="button"
            className="admin-mobile-button"
            onClick={() => setOpen(!open)}
            aria-label="Abrir menu administrativo"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {open && (
          <nav className="bg-secondary px-4 pb-4 grid gap-2 max-h-[70vh] overflow-y-auto">
            {links.map((label) => (
              <NavLink
                key={label}
                to={path(label)}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `admin-mobile-link ${isActive ? 'admin-mobile-link-active' : ''}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <div className="flex">
        <aside className="w-72 bg-primary text-white p-6 hidden lg:block min-h-screen sticky top-0">
          <img
            src="/assets/logo-wide.jpeg"
            alt="Gráfica W Criações"
            className="rounded-2xl mb-8"
          />

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

        <section className="flex-1 p-4 sm:p-5 lg:p-8 min-w-0">
          <Outlet />
        </section>
      </div>
    </div>
  );
}