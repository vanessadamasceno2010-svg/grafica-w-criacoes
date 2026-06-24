import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Menu, X, User, LayoutDashboard, Phone } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { BRAND, WHATSAPP_NUMBER } from '../lib/api';
import { BottomSheet } from './BottomSheet';

export function Header() {
  const { cart, user } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  
  const cartCount = cart.reduce((sum, item) => sum + item.quantidade, 0);
  const role = String(user?.role || '').toLowerCase();
  const isPanelUser = role === 'admin' || role === 'funcionario' || role === 'staff' || role === 'employee';

  const navLinks = [
    { to: '/', label: 'Início' },
    { to: '/catalogo', label: 'Catálogo' },
    { to: '/acompanhar', label: 'Acompanhar' },
    { to: '/sobre', label: 'Sobre Nós' },
    { to: '/contato', label: 'Contato' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 safe-top shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          
          {/* Logo - Mais profissional */}
<Link to="/" className="flex items-center gap-3 group">
  <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center flex-shrink-0 shadow-md transition-transform group-hover:scale-105">
    <span className="text-gold font-display font-bold text-3xl">W</span>
  </div>
  <div className="hidden sm:block">
    <span className="font-display font-bold text-2xl tracking-tight text-primary">
      Gráfica W
    </span>
    <p className="text-xs text-gray-500 -mt-1 font-medium">CRIAÇÕES</p>   {/* ← Alterado */}
  </div>
</Link>

          {/* Menu Desktop */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`transition-all hover:text-primary relative py-1
                  ${isActive(link.to) 
                    ? 'text-primary font-semibold after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-primary' 
                    : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Ações */}
          <div className="flex items-center gap-3">
            
            {/* Orçamento Rápido (Desktop) */}
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Olá! Vi no site e gostaria de um orçamento.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all active:scale-95 shadow-sm"
            >
              <Phone size={18} />
              Orçamento Rápido
            </a>

            {isPanelUser && (
              <Link
                to="/admin"
                className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-100 text-amber-700 font-semibold hover:bg-amber-200 transition-colors"
              >
                <LayoutDashboard size={18} />
                Painel
              </Link>
            )}

            <Link
              to={user ? (isPanelUser ? '/admin' : '/minha-conta') : '/login'}
              className="p-3 rounded-2xl bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all"
              aria-label="Minha conta"
            >
              <User size={22} />
            </Link>

            <Link
              to="/carrinho"
              className="relative p-3 rounded-2xl bg-primary text-white hover:bg-primary/90 transition-all"
              aria-label="Carrinho"
            >
              <ShoppingCart size={22} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gold text-primary text-[11px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMenuOpen(true)}
              className="md:hidden p-3 rounded-2xl bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all"
              aria-label="Abrir menu"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>

      {/* BottomSheet Mobile (mantido igual, só melhorado visualmente) */}
      <BottomSheet isOpen={menuOpen} onClose={() => setMenuOpen(false)} title="Menu">
        <nav className="grid gap-2 p-2">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-semibold transition-all text-base
                ${isActive(link.to)
                  ? 'bg-primary text-white'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
            >
              {link.label}
            </Link>
          ))}

          {isPanelUser && (
            <Link
              to="/admin"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center gap-2 px-5 py-4 rounded-2xl font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 transition-all"
            >
              <LayoutDashboard size={20} />
              Painel Administrativo
            </Link>
          )}

          <div className="h-px bg-gray-200 my-4" />

          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Olá vim do Site')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 px-5 py-4 rounded-2xl font-bold bg-green-500 text-white hover:bg-green-600 transition-all text-base"
          >
            <Phone size={22} />
            Chamar no WhatsApp
          </a>
        </nav>
      </BottomSheet>
    </>
  );
}
