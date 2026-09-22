import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import { fetchMyCoins } from "../api";
import { useAuth } from "./AuthContext";

interface CoinContextValue {
  coinBalance: number;
  refreshCoins: () => Promise<void>;
}

const CoinContext = createContext<CoinContextValue | undefined>(undefined);

export function CoinProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [coinBalance, setCoinBalance] = useState(0);

  const refreshCoins = useCallback(async () => {
    if (!user) {
      setCoinBalance(0);
      return;
    }

    try {
      const data = await fetchMyCoins();
      setCoinBalance(data.coin_balance);
    } catch (error) {
      console.error("Refresh coins error:", error);
    }
  }, [user]);

  // โหลดยอดเหรียญใหม่ทุกครั้งที่ login/logout
  useEffect(() => {
    refreshCoins();
  }, [refreshCoins]);

  const value = useMemo<CoinContextValue>(
    () => ({ coinBalance, refreshCoins }),
    [coinBalance, refreshCoins]
  );

  return <CoinContext.Provider value={value}>{children}</CoinContext.Provider>;
}

export function useCoins() {
  const context = useContext(CoinContext);

  if (!context) {
    throw new Error("useCoins must be used within a CoinProvider");
  }

  return context;
}
