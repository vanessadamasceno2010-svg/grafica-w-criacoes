import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, CartItem, User } from '../lib/api';

type AppContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number, specs?: Record<string, string>) => void;
  removeFromCart: (productId: string, specs?: Record<string, string>) => void;
  updateQuantity: (productId: string, specs: Record<string, string> | undefined, quantity: number) => void;
  clearCart: () => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeSpecs(specs?: Record<string, string>) {
  return Object.keys(specs || {})
    .sort()
    .reduce((acc, key) => {
      acc[key] = String((specs || {})[key] || '');
      return acc;
    }, {} as Record<string, string>);
}

function sameSpecs(a?: Record<string, string>, b?: Record<string, string>) {
  return JSON.stringify(normalizeSpecs(a)) === JSON.stringify(normalizeSpecs(b));
}

function normalizeCartItem(item: any): CartItem {
  return {
    id: String(item?.id || item?.produto_id || ''),
    produto_id: String(item?.produto_id || item?.id || ''),
    nome: String(item?.nome || 'Produto'),
    slug: String(item?.slug || item?.produto_id || item?.id || ''),
    imagem_principal: String(item?.imagem_principal || '/assets/chaveiros-personalizados.jpeg'),
    quantidade: Math.max(Number(item?.quantidade || item?.quantity || 1), 1),
    preco_unitario: Number(item?.preco_unitario || item?.preco || 0),
    especificacoes_selecionadas: normalizeSpecs(item?.especificacoes_selecionadas || item?.specs || {})
  };
}

function saveCart(cart: CartItem[]) {
  localStorage.setItem('gp_cart', JSON.stringify(cart.map(normalizeCartItem)));
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => {
    return readJson<User | null>('gp_user', readJson<User | null>('user', null));
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = readJson<any[]>('gp_cart', []);
    return Array.isArray(saved) ? saved.map(normalizeCartItem).filter((item) => item.produto_id) : [];
  });

  const setUser = (nextUser: User | null) => {
    setUserState(nextUser);
  };

  useEffect(() => {
    if (user) {
      localStorage.setItem('gp_user', JSON.stringify(user));
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('gp_user');
      localStorage.removeItem('user');
    }
  }, [user]);

  useEffect(() => {
    saveCart(cart);
  }, [cart]);

  const addToCart = (product: Product, quantity = 1, specs: Record<string, string> = {}) => {
    if (!product?.id) {
      alert('Produto inválido. Recarregue a página e tente novamente.');
      return;
    }

    const safeQuantity = Math.max(Number(quantity || 1), 1);
    const safeSpecs = normalizeSpecs(specs);
    const productId = String(product.id);

    setCart((prev) => {
      const normalizedPrev = Array.isArray(prev) ? prev.map(normalizeCartItem) : [];
      const existingIndex = normalizedPrev.findIndex(
        (item) => item.produto_id === productId && sameSpecs(item.especificacoes_selecionadas, safeSpecs)
      );

      let updated: CartItem[];

      if (existingIndex >= 0) {
        updated = [...normalizedPrev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantidade: Number(updated[existingIndex].quantidade || 0) + safeQuantity
        };
      } else {
        updated = [
          ...normalizedPrev,
          {
            id: productId,
            produto_id: productId,
            nome: product.nome || 'Produto',
            slug: product.slug || productId,
            imagem_principal: product.imagem_principal || '/assets/chaveiros-personalizados.jpeg',
            quantidade: safeQuantity,
            preco_unitario: Number(product.preco || 0),
            especificacoes_selecionadas: safeSpecs
          }
        ];
      }

      saveCart(updated);
      return updated;
    });
  };

  const removeFromCart = (productId: string, specs: Record<string, string> = {}) => {
    setCart((prev) => {
      const updated = prev
        .map(normalizeCartItem)
        .filter((item) => !(item.produto_id === productId && sameSpecs(item.especificacoes_selecionadas, specs)));
      saveCart(updated);
      return updated;
    });
  };

  const updateQuantity = (productId: string, specs: Record<string, string> = {}, quantity: number) => {
    const safeQuantity = Number(quantity || 0);

    if (safeQuantity <= 0) {
      removeFromCart(productId, specs);
      return;
    }

    setCart((prev) => {
      const updated = prev.map((item) => {
        const normalized = normalizeCartItem(item);
        return normalized.produto_id === productId && sameSpecs(normalized.especificacoes_selecionadas, specs)
          ? { ...normalized, quantidade: safeQuantity }
          : normalized;
      });
      saveCart(updated);
      return updated;
    });
  };

  const clearCart = () => {
    setCart([]);
    saveCart([]);
  };

  return (
    <AppContext.Provider value={{ user, setUser, cart, addToCart, removeFromCart, updateQuantity, clearCart }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }

  return context;
}
