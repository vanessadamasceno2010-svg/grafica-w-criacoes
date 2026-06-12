import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Home, ShoppingCart, Menu, ShieldCheck, Phone, X, Grid3X3, Search, UserCog } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { BRAND } from '../lib/api';

export function Layout() {
  const { cart, user } = useApp();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <header className="premium-header">
        <div className="premium-header-inner">
          <Link to="/" className="premium-logo" onClick={close}>
            <img src="/assets/logo-icon.png" alt="Gráfica W Criações" />
            <div>
              <strong>Gráfica <span>W Criações</span></strong>
              <small>Personalizados premium</small>
            </div>
          </Link>

          <nav className="premium-desktop-nav">
            <NavLink to="/catalogo">Catálogo</NavLink>
            <NavLink to="/acompanhar">Acompanhar</NavLink>
            <NavLink to="/sobre">Sobre</NavLink>
            <NavLink to="/contato">Contato</NavLink>
            {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
          </nav>

          <div className="premium-actions">
            <a className="premium-phone" href="https://wa.me/5588996240470" target="_blank">
              <Phone size={16} /> {BRAND.whatsapp}
            </a>
            <Link to="/login" className="premium-login">
              <ShieldCheck size={16} /> {user ? user.nome : 'Entrar'}
            </Link>
            <Link to="/carrinho" className="premium-cart">
              <ShoppingCart size={20} />
              {cart.length > 0 && <b>{cart.length}</b>}
            </Link>
            <button className="premium-menu" onClick={() => setOpen(true)} aria-label="Abrir menu">
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="premium-drawer-backdrop" onClick={close}>
          <aside className="premium-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="premium-drawer-head">
              <img src="/assets/logo-icon.png" alt="Gráfica W Criações" />
              <div>
                <strong>Gráfica W Criações</strong>
                <small>Menu principal</small>
              </div>
              <button onClick={close}><X size={22} /></button>
            </div>

            <nav className="premium-drawer-nav">
              <NavLink onClick={close} to="/"><Home size={18} /> Início</NavLink>
              <NavLink onClick={close} to="/catalogo"><Grid3X3 size={18} /> Catálogo</NavLink>
              <NavLink onClick={close} to="/carrinho"><ShoppingCart size={18} /> Carrinho</NavLink>
              <NavLink onClick={close} to="/acompanhar"><Search size={18} /> Acompanhar pedido</NavLink>
              <NavLink onClick={close} to="/sobre">Sobre</NavLink>
              <NavLink onClick={close} to="/contato">Contato</NavLink>
              <NavLink onClick={close} to="/login"><ShieldCheck size={18} /> {user ? 'Minha conta' : 'Entrar'}</NavLink>
              {user?.role === 'admin' && <NavLink onClick={close} to="/admin"><UserCog size={18} /> Painel Admin</NavLink>}
            </nav>

            <a className="premium-whatsapp" href="https://wa.me/5588996240470" target="_blank">
              Falar no WhatsApp
            </a>
          </aside>
        </div>
      )}

      <main className="premium-main">
        <Outlet />
      </main>

      <nav className="premium-bottom-nav">
        <NavLink to="/"><Home size={21} /><span>Início</span></NavLink>
        <NavLink to="/catalogo"><Grid3X3 size={21} /><span>Catálogo</span></NavLink>
        <NavLink to="/carrinho" className="bottom-cart">
          <ShoppingCart size={22} />
          {cart.length > 0 && <b>{cart.length}</b>}
          <span>Carrinho</span>
        </NavLink>
        {user?.role === 'admin'
          ? <NavLink to="/admin"><UserCog size={21} /><span>Admin</span></NavLink>
          : <NavLink to="/login"><ShieldCheck size={21} /><span>Entrar</span></NavLink>}
      </nav>

      <footer className="premium-footer">
        <div className="containerx premium-footer-grid">
          <div>
            <img src="/assets/logo-wide.jpeg" alt="Gráfica W Criações" />
            <p>Impressos, brindes e personalizados com padrão premium.</p>
          </div>
          <div><b>Loja</b><p>Catálogo<br />Carrinho<br />Finalização pelo WhatsApp</p></div>
          <div><b>Atendimento</b><p>WhatsApp: {BRAND.whatsapp}<br />Pedidos personalizados<br />Orçamentos</p></div>
          <div><b>Legal</b><p>Privacidade<br />Termos<br />Recibos de pedido</p></div>
        </div>
      </footer>
    </>
  );
}
