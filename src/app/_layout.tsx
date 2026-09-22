import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";

import { ActivityIndicator, View } from "react-native";

import { AuthProvider, useAuth } from "../context/AuthContext";
import { CartProvider } from "../context/CartContext";
import { CoinProvider } from "../context/CoinContext";
import { WishlistProvider } from "../context/WishlistContext";

function AuthGate() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const inAuthGroup =
      segments[0] === "login" || segments[0] === "register";

    if (!user && !inAuthGroup) {
      // ยังไม่ login -> เด้งไปหน้า login
      router.replace("/login");
    } else if (user && inAuthGroup) {
      // login แล้วแต่ดันอยู่หน้า login/register -> เด้งกลับหน้าแรก
      router.replace("/");
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function Layout() {
  return (
    <AuthProvider>
      <CartProvider>
        <CoinProvider>
          <WishlistProvider>
            <AuthGate />
          </WishlistProvider>
        </CoinProvider>
      </CartProvider>
    </AuthProvider>
  );
}
