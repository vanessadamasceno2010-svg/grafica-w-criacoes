import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, CartItem, User } from '../lib/api';

type AppContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
  cart: CartItem[];
  addToCart: (product: Product, quantity: number, specs: Record<string, string>) => void;
  removeFromCart: (productId: string, specs: Record<string, string>) => void;
  updateQuantity: (productId: string, specs: Record<string, string>, quantity: number) => void;
  clearCart: () => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => {
    const saved = localStorage.getItem('gp_user') || localStorage.getItem('user');
    if (!saved) return null;

    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('gp_cart');
    if (!saved) return [];

    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
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
    localStorage.setItem('gp_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: Product, quantity: number, specs: Record<string, string>) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.id === product.id && JSON.stringify(item.especificacoes_selecionadas) === JSON.stringify(specs)
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].quantidade += quantity;
        return updated;
      }

      return [
        ...prev,
        {
          id: product.id,
          produto_id: product.id,
          nome: product.nome,
          slug: product.slug,
          imagem_principal: product.imagem_principal,
          quantidade,
          preco_unitario: product.preco,
          especificacoes_selecionadas: specs
        }
      ];
    });
  };

  const removeFromCart = (productId: string, specs: Record<string, string>) => {
    setCart((prev) =>
      prev.filter(
        (item) => !(item.id === productId && JSON.stringify(item.especificacoes_selecionadas) === JSON.stringify(specs))
      )
    );
  };

  const updateQuantity = (productId: string, specs: Record<string, string>, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, specs);
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.id === productId && JSON.stringify(item.especificacoes_selecionadas) === JSON.stringify(specs)
          ? { ...item, quantidade }
          : item
      )
    );
  };

  const clearCart = () => setCart([]);

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
