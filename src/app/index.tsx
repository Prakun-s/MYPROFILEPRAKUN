import { useEffect, useState } from "react";

import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import AddProductScreen from "../AddProductScreen";
import CartScreen from "../CartScreen";
import ConfirmDialog from "../components/ConfirmDialog";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import EditProductScreen from "../EditProductScreen";
import OrdersScreen from "../OrdersScreen";
import ProductListScreen from "../ProductListScreen";

interface Product {
  id: number;
  name: string;
  stock: number;
  price: number;
  stock_text: string;
  category: string;
  location_count: number;
  location_text: string;
  badge_status: string;
  image_url: string;
}

export default function HomeScreen() {
  const { user, isAdmin, logout } = useAuth();
  const { cartCount } = useCart();
  const [screen, setScreen] = useState<
    "products" | "add" | "edit" | "cart" | "orders"
  >("products");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);

  // Alert.alert ของ React Native ไม่ทำงานบนเว็บ (react-native-web มองว่าเป็น no-op)
  // จึงใช้ ConfirmDialog (สร้างจาก Modal ที่รองรับเว็บจริง) แทน
  const confirmLogout = () => {
    setLogoutDialogVisible(true);
  };

  const handleConfirmLogout = () => {
    setLogoutDialogVisible(false);
    logout();
  };

  const handleCancelLogout = () => {
    setLogoutDialogVisible(false);
  };

  // ผู้ใช้ role "user" ไม่มีสิทธิ์เข้าหน้าเพิ่ม/แก้ไขสินค้า
  // (กันไว้อีกชั้นแม้ปุ่มจะถูกซ่อนไปแล้ว)
  useEffect(() => {
    if ((screen === "add" || screen === "edit") && !isAdmin) {
      setScreen("products");
    }
  }, [screen, isAdmin]);

  if (screen === "add" && isAdmin) {
    return (
      <View style={styles.container}>

        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              console.log("BACK CLICKED");
              setScreen("products");
            }}
          >
            <Text style={styles.backText}>
              ← Products
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <AddProductScreen
            onSuccess={() => setScreen("products")}
          />
        </View>

      </View>
    );
  }

  if (screen === "edit" && selectedProduct && isAdmin) {
    return (
      <View style={styles.container}>

        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              console.log("BACK CLICKED");
              setScreen("products");
              setSelectedProduct(null);
            }}
          >
            <Text style={styles.backText}>
              ← Products
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <EditProductScreen
            product={selectedProduct}
            onSuccess={() => {
              setScreen("products");
              setSelectedProduct(null);
            }}
          />
        </View>

      </View>
    );
  }

  if (screen === "cart") {
    return (
      <View style={styles.container}>

        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setScreen("products")}
          >
            <Text style={styles.backText}>
              ← Products
            </Text>
          </TouchableOpacity>

          <Text style={styles.screenTitle}>ตะกร้าสินค้า</Text>

          <View style={{ width: 90 }} />
        </View>

        <View style={styles.content}>
          <CartScreen
            onBack={() => setScreen("products")}
            onViewOrders={() => setScreen("orders")}
          />
        </View>

      </View>
    );
  }

  if (screen === "orders") {
    return (
      <View style={styles.container}>

        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setScreen("products")}
          >
            <Text style={styles.backText}>
              ← Products
            </Text>
          </TouchableOpacity>

          <Text style={styles.screenTitle}>ประวัติการสั่งซื้อ</Text>

          <View style={{ width: 90 }} />
        </View>

        <View style={styles.content}>
          <OrdersScreen />
        </View>

      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.topBar}>

        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>
            PRAKUN SHOP
          </Text>

          <View style={styles.userBadge}>
            <Text style={styles.userBadgeText}>
              {user?.username} · {isAdmin ? "Admin" : "User"}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {isAdmin && (
            <TouchableOpacity
              style={styles.addButton}
              activeOpacity={0.5}
              onPress={() => {
                console.log("ADD PRODUCT CLICKED");
                setScreen("add");
              }}
            >
              <Text style={styles.addButtonText}>
                + Add
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.logoutButton}
            activeOpacity={0.6}
            onPress={confirmLogout}
          >
            <Text style={styles.logoutButtonText}>
              ออกจากระบบ
            </Text>
          </TouchableOpacity>
        </View>

      </View>

      {/* PRODUCT LIST */}
      <View style={styles.content}>
        <ProductListScreen
          canManage={isAdmin}
          onEditProduct={(product) => {
            setSelectedProduct(product);
            setScreen("edit");
          }}
        />
      </View>

      {/* FLOATING CART BUTTON */}
      <TouchableOpacity
        style={styles.floatingCart}
        activeOpacity={0.7}
        onPress={() => setScreen("cart")}
      >
        <Text style={styles.cartIconText}>🛒</Text>

        {cartCount > 0 && (
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>
              {cartCount > 99 ? "99+" : cartCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <ConfirmDialog
        visible={logoutDialogVisible}
        title="ออกจากระบบ"
        message="ต้องการออกจากระบบใช่หรือไม่?"
        confirmText="ออกจากระบบ"
        cancelText="ยกเลิก"
        destructive
        onConfirm={handleConfirmLogout}
        onCancel={handleCancelLogout}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F6F3",
  },

  topBar: {
    height: 64,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#ECEAE4",

    // สำคัญ
    zIndex: 100,
    elevation: 4,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: -0.3,
    color: "#2B2B31",
  },

  userBadge: {
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  userBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#111111",
  },

  logoutButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E3DC",

    zIndex: 101,
    elevation: 101,
  },

  logoutButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#D2585F",
  },

  addButton: {
    backgroundColor: "#111111",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,

    // สำคัญ
    zIndex: 101,
    elevation: 101,
  },

  addButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },

  screenTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111111",
  },

  // ปุ่มตะกร้าลอยมุมขวาล่าง
  floatingCart: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E3DC",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 200,
  },

  cartIconText: {
    fontSize: 22,
  },

  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#D2585F",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },

  cartBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },

  backButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,

    zIndex: 101,
    elevation: 101,
  },

  backText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111111",
  },

  content: {
    flex: 1,
    zIndex: 0,
  },
});