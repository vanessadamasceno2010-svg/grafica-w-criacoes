import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { ShoppingCart, Menu, ShieldCheck, Phone, X } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { BRAND } from '../lib/api';

export function Layout() {
  const { cart, user } = useApp();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <>
      <header className="sticky top-0 z-50 glass border-b border-gray-200">
        <div className="containerx site-header">
          <Link to="/" className="brand-link" onClick={close}>
            <img
              src="/assets/logo-icon.png"
              alt="Gráfica W Criações"
              className="brand-icon"
            />
            <span className="brand-name">
              Gráfica <span className="gold-text">W Criações</span>
            </span>
          </Link>

          <nav className="desktop-nav">
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

          <div className="header-actions">
            <a
              href="https://wa.me/5588996240470"
              target="_blank"
              className="desktop-phone"
            >
              <Phone size={16} />
              {BRAND.whatsapp}
            </a>

            <Link to="/login" className="desktop-login">
              <ShieldCheck size={16} />
              {user ? user.nome : 'Entrar'}
            </Link>

            <Link to="/carrinho" className="relative cart-button">
              <ShoppingCart size={20} />
              {cart.length > 0 && (
                <span className="cart-badge">{cart.length}</span>
              )}
            </Link>

            <button
              type="button"
              className="mobile-menu-button"
              onClick={() => setOpen(!open)}
              aria-label="Abrir menu"
            >
              {open ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {open && (
          <div className="mobile-menu-panel">
            <nav className="containerx mobile-menu-nav">
              <NavLink onClick={close} to="/">Início</NavLink>
              <NavLink onClick={close} to="/catalogo">Catálogo</NavLink>
              <NavLink onClick={close} to="/carrinho">Carrinho</NavLink>
              <NavLink onClick={close} to="/acompanhar">Acompanhar pedido</NavLink>
              <NavLink onClick={close} to="/sobre">Sobre</NavLink>
              <NavLink onClick={close} to="/contato">Contato</NavLink>
              <NavLink onClick={close} to="/login">{user ? 'Minha conta' : 'Entrar'}</NavLink>
              {user?.role === 'admin' && (
                <NavLink onClick={close} to="/admin">Painel admin</NavLink>
              )}
              <a href="https://wa.me/5588996240470" target="_blank" className="btn btn-whats">
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
        <div className="containerx footer-grid">
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
              Catálogo<br />Carrinho<br />Finalização pelo WhatsApp
            </p>
          </div>

          <div>
            <b>Atendimento</b>
            <p className="text-gray-300 mt-3 leading-7">
              WhatsApp: {BRAND.whatsapp}<br />Pedidos personalizados<br />Orçamentos
            </p>
          </div>

          <div>
            <b>Legal</b>
            <p className="text-gray-300 mt-3 leading-7">
              Privacidade<br />Termos<br />Recibos de pedido
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
