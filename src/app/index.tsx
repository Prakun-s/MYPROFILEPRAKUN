import { useEffect, useState } from "react";

import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from "react-native";

import AddProductScreen from "../AddProductScreen";
import AdminOrdersScreen from "../AdminOrdersScreen";
import CartScreen from "../CartScreen";
import ConfirmDialog from "../components/ConfirmDialog";
import ShopLogo from "../components/ShopLogo";
import UserMenu from "../components/UserMenu";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import DashboardScreen from "../DashboardScreen";
import EditProductScreen from "../EditProductScreen";
import OrdersScreen from "../OrdersScreen";
import ProductDetailScreen from "../ProductDetailScreen";
import ProductListScreen from "../ProductListScreen";
import WishlistScreen from "../WishlistScreen";

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
  const { items: wishlistItems } = useWishlist();
  const { width } = useWindowDimensions();
  // จอแคบ (มือถือ) < 640 → ยุบส่วนหัวให้กระชับ เตรียมไว้สำหรับตอนแตกเป็นแอปมือถือ
  const isMobile = width < 640;
  const [screen, setScreen] = useState<
    | "products"
    | "add"
    | "edit"
    | "cart"
    | "orders"
    | "detail"
    | "wishlist"
    | "dashboard"
    | "adminOrders"
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
    if ((screen === "add" || screen === "edit" || screen === "dashboard" || screen === "adminOrders") && !isAdmin) {
      setScreen("products");
    }
  }, [screen, isAdmin]);

  if (screen === "add" && isAdmin) {
    return (
      <View style={styles.container}>

        <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
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

        <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
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

        <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
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

        <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
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

  if (screen === "detail" && selectedProduct) {
    return (
      <View style={styles.container}>

        <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setScreen("products");
              setSelectedProduct(null);
            }}
          >
            <Text style={styles.backText}>
              ← Products
            </Text>
          </TouchableOpacity>

          <Text style={styles.screenTitle}>รายละเอียดสินค้า</Text>

          <View style={{ width: 90 }} />
        </View>

        <View style={styles.content}>
          <ProductDetailScreen
            product={selectedProduct}
            onBack={() => {
              setScreen("products");
              setSelectedProduct(null);
            }}
          />
        </View>

      </View>
    );
  }

  if (screen === "wishlist") {
    return (
      <View style={styles.container}>

        <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setScreen("products")}
          >
            <Text style={styles.backText}>
              ← Products
            </Text>
          </TouchableOpacity>

          <Text style={styles.screenTitle}>สินค้าที่ถูกใจ</Text>

          <View style={{ width: 90 }} />
        </View>

        <View style={styles.content}>
          <WishlistScreen
            onOpenProduct={(product) => {
              setSelectedProduct(product as unknown as Product);
              setScreen("detail");
            }}
          />
        </View>

      </View>
    );
  }

  if (screen === "dashboard" && isAdmin) {
    return (
      <View style={styles.container}>

        <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setScreen("products")}
          >
            <Text style={styles.backText}>
              ← Products
            </Text>
          </TouchableOpacity>

          <Text style={styles.screenTitle}>แดชบอร์ด</Text>

          <View style={{ width: 90 }} />
        </View>

        <View style={styles.content}>
          <DashboardScreen />
        </View>

      </View>
    );
  }

  if (screen === "adminOrders" && isAdmin) {
    return (
      <View style={styles.container}>

        <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setScreen("products")}
          >
            <Text style={styles.backText}>
              ← Products
            </Text>
          </TouchableOpacity>

          <Text style={styles.screenTitle}>จัดการออเดอร์</Text>

          <View style={{ width: 90 }} />
        </View>

        <View style={styles.content}>
          <AdminOrdersScreen />
        </View>

      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={[styles.topBar, isMobile && styles.topBarMobile]}>

        <View style={styles.headerLeft}>
          <ShopLogo isMobile={isMobile} />
        </View>

        <View style={styles.headerRight}>
          {isAdmin && (
            <TouchableOpacity
              style={styles.addButton}
              activeOpacity={0.5}
              onPress={() => setScreen("add")}
            >
              <Text style={styles.addButtonText}>
                {isMobile ? "＋" : "+ Add Product"}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.iconButton}
            activeOpacity={0.6}
            onPress={() => setScreen("wishlist")}
          >
            <Text style={styles.cartIconText}>♡</Text>

            {wishlistItems.length > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>
                  {wishlistItems.length > 99 ? "99+" : wishlistItems.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cartIconButton}
            activeOpacity={0.6}
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

          {/* UserMenu ย้ายมาอยู่ขวาสุดเสมอ ไม่ว่าจอกว้างหรือแคบ */}
          <UserMenu
            username={user?.username}
            roleLabel={isAdmin ? "Admin" : "User"}
            isAdmin={isAdmin}
            onDashboard={() => setScreen("dashboard")}
            onAdminOrders={() => setScreen("adminOrders")}
            onOrders={() => setScreen("orders")}
            onLogout={confirmLogout}
          />
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
          onOpenProduct={(product) => {
            setSelectedProduct(product);
            setScreen("detail");
          }}
        />
      </View>

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

  topBarMobile: {
    height: 56,
    paddingHorizontal: 12,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  addButton: {
    backgroundColor: "#111111",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,

    // สำคัญ
    zIndex: 101,
    elevation: 101,
  },

  addButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },

  screenTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111111",
  },

  cartIconButton: {
    position: "relative",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E3DC",

    zIndex: 101,
    elevation: 101,
  },

  iconButton: {
    position: "relative",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E3DC",

    zIndex: 101,
    elevation: 101,
  },

  cartIconText: {
    fontSize: 16,
  },

  cartBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
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
