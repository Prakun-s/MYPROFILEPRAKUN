import { useEffect, useRef, useState } from "react";

import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from "react-native";

import AddProductScreen from "../AddProductScreen";
import AdminClaimsScreen from "../AdminClaimsScreen";
import AdminOrdersScreen from "../AdminOrdersScreen";
import CartScreen, { CartScreenHandle } from "../CartScreen";
import ClaimScreen, { ClaimScreenHandle } from "../ClaimScreen";
import CoinsScreen from "../CoinsScreen";
import ConfirmDialog from "../components/ConfirmDialog";
import ShopLogo from "../components/ShopLogo";
import UserMenu from "../components/UserMenu";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useCoins } from "../context/CoinContext";
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

interface ClaimOrderItem {
  product_id: number;
  product_name: string;
  price: number;
  quantity: number;
}

interface ClaimOrder {
  id: number;
  total_amount: number;
  created_at: string;
}

export default function HomeScreen() {
  const { user, isAdmin, logout } = useAuth();
  const { cartCount } = useCart();
  const { coinBalance } = useCoins();
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
    | "adminClaims"
    | "claim"
    | "coins"
  >("products");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const [claimTarget, setClaimTarget] = useState<{
    order: ClaimOrder;
    item: ClaimOrderItem;
  } | null>(null);
  // จำหน้าที่กดเข้ามาเคลมสินค้าไว้ เพื่อให้ปุ่ม "← กลับ" ย้อนไปหน้านั้นแทนที่จะไปหน้า Products เสมอ
  const [claimOrigin, setClaimOrigin] = useState<"products" | "orders">(
    "products"
  );
  const claimScreenRef = useRef<ClaimScreenHandle>(null);
  const cartScreenRef = useRef<CartScreenHandle>(null);

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
    if ((screen === "add" || screen === "edit" || screen === "dashboard" || screen === "adminOrders" || screen === "adminClaims") && !isAdmin) {
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
            onPress={() => {
              const handledInternally = cartScreenRef.current?.goBack();

              if (!handledInternally) {
                setScreen("products");
              }
            }}
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
            ref={cartScreenRef}
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
          <OrdersScreen
            onClaimItem={(order, item) => {
              setClaimTarget({ order, item });
              setClaimOrigin("orders");
              setScreen("claim");
            }}
          />
        </View>

      </View>
    );
  }

  if (screen === "coins") {
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

          <Text style={styles.screenTitle}>เหรียญสะสม</Text>

          <View style={{ width: 90 }} />
        </View>

        <View style={styles.content}>
          <CoinsScreen />
        </View>

      </View>
    );
  }

  if (screen === "claim") {
  return (
    <View style={styles.container}>

      <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            // ลองให้หน้าเคลมย้อนกลับภายในตัวเองก่อน (เช่น จากฟอร์ม กลับไปหน้าเลือกสินค้า)
            // ถ้าไม่มีอะไรให้ย้อนแล้ว ค่อยออกจากหน้านี้กลับไปหน้าที่กดเข้ามา
            const handledInternally = claimScreenRef.current?.goBack();

            if (!handledInternally) {
              setScreen(claimOrigin);
              setClaimTarget(null);
            }
          }}
        >
          
            <Text style={styles.backText}>
              {claimOrigin === "orders" ? "← ประวัติการสั่งซื้อ" : "← Products"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.screenTitle}>เคลมสินค้า</Text>

          <View style={{ width: 90 }} />
        </View>

        <View style={styles.content}>
          <ClaimScreen
          ref={claimScreenRef}
          order={claimTarget?.order} 
          item={claimTarget?.item} />
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

  if (screen === "adminClaims" && isAdmin) {
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

          <Text style={styles.screenTitle}>จัดการคำขอเคลม</Text>

          <View style={{ width: 90 }} />
        </View>

        <View style={styles.content}>
          <AdminClaimsScreen />
        </View>

      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={[styles.topBar, isMobile && styles.topBarMobile]}>

        <View style={styles.headerLeft}>
          <ShopLogo
            isMobile={isMobile}
            onPress={() => {
              setSelectedProduct(null);
              setClaimTarget(null);
              setScreen("products");
            }}
          />
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
            onPress={() => setScreen("coins")}
          >
            <Text style={styles.cartIconText}>🪙</Text>

            {coinBalance > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>
                  {coinBalance > 99 ? "99+" : coinBalance}
                </Text>
              </View>
            )}
          </TouchableOpacity>

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
  style={styles.iconButton}
  activeOpacity={0.6}
  onPress={() => {
    setClaimTarget(null);
    setClaimOrigin("products");
    setScreen("claim");
  }}
>
  <Text style={styles.cartIconText}>📋</Text>
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
            onAdminClaims={() => setScreen("adminClaims")}
            onOrders={() => setScreen("orders")}
            onCoins={() => setScreen("coins")}
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
    gap: 6,
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
