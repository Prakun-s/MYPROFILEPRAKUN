import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import { fetchCart } from "../api";
import { useAuth } from "./AuthContext";

interface CartContextValue {
  cartCount: number;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cartCount, setCartCount] = useState(0);

  const refreshCart = useCallback(async () => {
    if (!user) {
      setCartCount(0);
      return;
    }

    try {
      const items = await fetchCart();
      const total = items.reduce(
        (sum: number, item: any) => sum + Number(item.quantity),
        0
      );

      setCartCount(total);
    } catch (error) {
      console.error("Refresh cart error:", error);
    }
  }, [user]);

  // โหลดจำนวนสินค้าในตะกร้าใหม่ทุกครั้งที่ login/logout
  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const value = useMemo<CartContextValue>(
    () => ({ cartCount, refreshCart }),
    [cartCount, refreshCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }

  return context;
}
