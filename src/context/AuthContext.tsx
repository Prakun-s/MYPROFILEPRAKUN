import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import { loginRequest, registerRequest } from "../api/auth";
import { updateProfile } from "../api";
import { clearSession, loadSession, saveSession } from "../lib/authStorage";
import type { AuthUser } from "../types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (username: string, password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ตอนเปิดแอป: โหลด session เดิม (ถ้ามี) จาก AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const session = await loadSession();

        if (session) {
          setToken(session.token);
          setUser(session.user);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (
    username: string,
    password: string,
    rememberMe: boolean = true
  ) => {
    const { token: newToken, user: newUser } = await loginRequest(
      username,
      password
    );

    await saveSession(newToken, newUser, rememberMe);

    setToken(newToken);
    setUser(newUser);
  };

  const register = async (
    username: string,
    password: string,
    fullName?: string
  ) => {
    const { token: newToken, user: newUser } = await registerRequest(
      username,
      password
    );

    await saveSession(newToken, newUser);

    setToken(newToken);
    setUser(newUser);

    // ถ้ากรอกชื่อ-นามสกุล/ชื่อร้านมาตอนสมัคร บันทึกลงโปรไฟล์จริงต่อเลย (คอลัมน์ full_name มีอยู่แล้ว)
    if (fullName && fullName.trim()) {
      try {
        await updateProfile({ full_name: fullName.trim() });
      } catch (err) {
        console.error("Save full name after register error:", err);
      }
    }
  };

  const logout = async () => {
    await clearSession();

    setToken(null);
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isAdmin: user?.role === "admin",
      login,
      register,
      logout,
    }),
    [user, token, isLoading]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
