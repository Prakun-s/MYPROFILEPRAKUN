import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuth } from "./AuthContext";

// เก็บข้อมูลสินค้าแบบย่อไว้ใน wishlist เพื่อไม่ต้องยิง API ซ้ำตอนแสดงผล
export interface WishlistProduct {
  id: number;
  name: string;
  price: number;
  image_url: string;
  category: string;
  stock: number;
  badge_status: string;
}

interface WishlistContextValue {
  items: WishlistProduct[];
  ids: number[];
  isWishlisted: (id: number) => boolean;
  toggleWishlist: (product: WishlistProduct) => void;
  removeFromWishlist: (id: number) => void;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(
  undefined
);

// แยกที่เก็บ wishlist ตามผู้ใช้ (username) กันข้อมูลปนกันเวลาสลับบัญชี
function storageKey(username?: string | null) {
  return `wishlist_${username || "guest"}`;
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<WishlistProduct[]>([]);
  const [loaded, setLoaded] = useState(false);

  // โหลด wishlist ที่เคยบันทึกไว้ทุกครั้งที่ผู้ใช้เปลี่ยน (login/logout/สลับบัญชี)
  useEffect(() => {
    let cancelled = false;
    setLoaded(false);

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey(user?.username));
        if (!cancelled) {
          setItems(raw ? JSON.parse(raw) : []);
        }
      } catch (err) {
        console.error("Load wishlist error:", err);
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.username]);

  // บันทึกลง AsyncStorage ทุกครั้งที่ wishlist เปลี่ยน (หลังโหลดรอบแรกเสร็จแล้วเท่านั้น)
  useEffect(() => {
    if (!loaded) return;

    AsyncStorage.setItem(
      storageKey(user?.username),
      JSON.stringify(items)
    ).catch((err) => console.error("Save wishlist error:", err));
  }, [items, loaded, user?.username]);

  const isWishlisted = useCallback(
    (id: number) => items.some((item) => item.id === id),
    [items]
  );

  const toggleWishlist = useCallback((product: WishlistProduct) => {
    setItems((prev) => {
      const exists = prev.some((item) => item.id === product.id);

      if (exists) {
        return prev.filter((item) => item.id !== product.id);
      }

      return [product, ...prev];
    });
  }, []);

  const removeFromWishlist = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const ids = useMemo(() => items.map((item) => item.id), [items]);

  const value = useMemo<WishlistContextValue>(
    () => ({ items, ids, isWishlisted, toggleWishlist, removeFromWishlist }),
    [items, ids, isWishlisted, toggleWishlist, removeFromWishlist]
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);

  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }

  return context;
}
