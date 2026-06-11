import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { ShoppingCart, Menu, ShieldCheck, Phone, X } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { BRAND } from '../lib/api';

export function Layout() {
  const { cart, user } = useApp();
  const [open, setOpen] = useState(false);

  const closeMenu = () => setOpen(false);

  return (
    <>
      <header className="sticky top-0 z-50 glass border-b border-gray-200">
        <div className="containerx min-h-16 md:h-20 flex items-center justify-between gap-3 py-3">
          <Link to="/" className="flex items-center gap-2 min-w-0" onClick={closeMenu}>
            <img
              src="/assets/logo-icon.png"
              alt="Gráfica W Criações"
              className="w-10 h-10 md:w-12 md:h-12 object-contain shrink-0"
            />
            <span className="font-display text-base sm:text-xl md:text-2xl font-extrabold text-primary leading-tight truncate">
              Gráfica <span className="gold-text">W Criações</span>
            </span>
          </Link>

          <nav className="hidden md:flex gap-6 font-semibold text-sm">
            <NavLink to="/catalogo">Catálogo</NavLink>
            <NavLink to="/acompanhar">Acompanhar</NavLink>
            <NavLink to="/sobre">Sobre</NavLink>
            <NavLink to="/contato">Contato</NavLink>
            {user?.role === 'admin' && (
              <NavLink to="/admin" className="text-accent">
                Admin
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            <a
              href="https://wa.me/5588996240470"
              target="_blank"
              className="hidden lg:flex text-sm font-bold items-center gap-1"
            >
              <Phone size={16} />
              {BRAND.whatsapp}
            </a>

            <Link to="/login" className="hidden sm:flex text-sm font-bold items-center gap-1">
              <ShieldCheck size={16} />
              {user ? user.nome : 'Entrar'}
            </Link>

            <Link to="/carrinho" className="relative btn btn-dark mobile-cart-btn">
              <ShoppingCart size={18} />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-accent text-primary rounded-full text-xs w-6 h-6 grid place-items-center font-extrabold">
                  {cart.length}
                </span>
              )}
            </Link>

            <button
              type="button"
              className="md:hidden mobile-menu-button"
              onClick={() => setOpen(!open)}
              aria-label="Abrir menu"
            >
              {open ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <nav className="containerx py-4 grid gap-2 font-bold">
              <NavLink onClick={closeMenu} className="mobile-nav-link" to="/">
                Início
              </NavLink>
              <NavLink onClick={closeMenu} className="mobile-nav-link" to="/catalogo">
                Catálogo
              </NavLink>
              <NavLink onClick={closeMenu} className="mobile-nav-link" to="/carrinho">
                Carrinho
              </NavLink>
              <NavLink onClick={closeMenu} className="mobile-nav-link" to="/acompanhar">
                Acompanhar pedido
              </NavLink>
              <NavLink onClick={closeMenu} className="mobile-nav-link" to="/sobre">
                Sobre
              </NavLink>
              <NavLink onClick={closeMenu} className="mobile-nav-link" to="/contato">
                Contato
              </NavLink>
              <NavLink onClick={closeMenu} className="mobile-nav-link" to="/login">
                {user ? 'Minha conta' : 'Entrar'}
              </NavLink>
              {user?.role === 'admin' && (
                <NavLink onClick={closeMenu} className="mobile-nav-link text-accent" to="/admin">
                  Painel admin
                </NavLink>
              )}
              <a
                href="https://wa.me/5588996240470"
                target="_blank"
                className="btn btn-whats mt-2"
              >
                Chamar no WhatsApp
              </a>
            </nav>
          </div>
        )}
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="bg-primary text-white mt-14 md:mt-20">
        <div className="containerx py-10 md:py-12 grid sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <img
              src="/assets/logo-wide.jpeg"
              alt="Gráfica W Criações"
              className="rounded-2xl max-w-[220px] w-full"
            />
            <p className="text-gray-300 mt-3">
              Impressos, brindes e personalizados com padrão premium.
            </p>
          </div>

          <div>
            <b>Loja</b>
            <p className="text-gray-300 mt-3 leading-7">
              Catálogo
              <br />
              Carrinho
              <br />
              Finalização pelo WhatsApp
            </p>
          </div>

          <div>
            <b>Atendimento</b>
            <p className="text-gray-300 mt-3 leading-7">
              WhatsApp: {BRAND.whatsapp}
              <br />
              Pedidos personalizados
              <br />
              Orçamentos
            </p>
          </div>

          <div>
            <b>Legal</b>
            <p className="text-gray-300 mt-3 leading-7">
              Privacidade
              <br />
              Termos
              <br />
              Recibos de pedido
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}