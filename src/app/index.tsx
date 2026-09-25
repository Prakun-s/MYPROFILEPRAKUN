import { useEffect, useRef, useState } from "react";

import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from "react-native";

import AddProductScreen from "../AddProductScreen";
import { fetchAllClaims, fetchAllOrders, fetchProfile } from "../api";
import AdminChatListScreen from "../AdminChatListScreen";
import AdminChatScreen from "../AdminChatScreen";
import AdminClaimsScreen from "../AdminClaimsScreen";
import AdminCoinRewardsScreen from "../AdminCoinRewardsScreen";
import AdminDiscountsScreen from "../AdminDiscountsScreen";
import AdminOrdersScreen from "../AdminOrdersScreen";
import AdminProductsScreen from "../AdminProductsScreen";
import AdminNavTabs, { AdminTabKey } from "../components/AdminNavTabs";
import BottomTabBar, { TabKey } from "../components/BottomTabBar";
import CartScreen, { CartScreenHandle } from "../CartScreen";
import ChatScreen from "../ChatScreen";
import ClaimScreen, { ClaimScreenHandle } from "../ClaimScreen";
import CoinShopScreen from "../CoinShopScreen";
import CoinsScreen from "../CoinsScreen";
import ConfirmDialog from "../components/ConfirmDialog";
import ShopLogo from "../components/ShopLogo";
import HeaderAvatarButton from "../components/HeaderAvatarButton";
import NotificationBell from "../components/NotificationBell";
import Icon from "../components/Icon";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useCoins } from "../context/CoinContext";
import { useWishlist } from "../context/WishlistContext";
import DashboardScreen from "../DashboardScreen";
import MenuScreen from "../MenuScreen";
import NotificationsScreen from "../NotificationsScreen";
import EditProductScreen from "../EditProductScreen";
import OrdersScreen from "../OrdersScreen";
import ProductDetailScreen from "../ProductDetailScreen";
import ProductListScreen from "../ProductListScreen";
import ProfileScreen from "../ProfileScreen";
import SettingsScreen from "../SettingsScreen";
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

  // รูปโปรไฟล์ผู้ใช้ (โชว์เป็นปุ่มวงกลมมุมขวาบน กดแล้วพาไปหน้าโปรไฟล์โดยตรง) — โหลดครั้งเดียวตอนล็อกอิน
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setAvatarUrl(null);
      return;
    }

    (async () => {
      try {
        const profile = await fetchProfile();
        setAvatarUrl(profile.avatar_url || null);
      } catch (err) {
        console.error("Load avatar error:", err);
      }
    })();
  }, [user?.id]);

  // นับออเดอร์/เคลมที่รอดำเนินการ ใช้โชว์ badge ตัวเลขบนแถบเมนูแอดมิน (AdminNavTabs)
  const [adminPendingOrders, setAdminPendingOrders] = useState(0);
  const [adminPendingClaims, setAdminPendingClaims] = useState(0);
  // ใช้ส่งเลขออเดอร์ไปกรองล่วงหน้า ตอนกดลิงก์ "ดูคำสั่งซื้อ" จากหน้าเคลม
  const [adminOrdersInitialSearch, setAdminOrdersInitialSearch] = useState("");

  useEffect(() => {
    if (!isAdmin) return;

    (async () => {
      try {
        const orders = await fetchAllOrders();
        setAdminPendingOrders(
          Array.isArray(orders)
            ? orders.filter((o: any) => o.status === "pending").length
            : 0
        );
      } catch (err) {
        console.error("Load admin pending orders error:", err);
      }

      try {
        const claims = await fetchAllClaims();
        setAdminPendingClaims(
          Array.isArray(claims)
            ? claims.filter((c: any) => c.status === "pending").length
            : 0
        );
      } catch (err) {
        console.error("Load admin pending claims error:", err);
      }
    })();
  }, [isAdmin]);

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
    | "adminDiscounts"
    | "adminProducts"
    | "adminCoinRewards"
    | "claim"
    | "coins"
    | "coinShop"
    | "profile"
    | "menu"
    | "notifications"
    | "settings"
    | "chat"
    | "adminChatList"
    | "adminChat"
  >("products");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  // ผู้ใช้ที่แอดมินกำลังเปิดคุยด้วย (เลือกจาก AdminChatListScreen แล้วเข้าหน้า AdminChatScreen)
  const [chatUserId, setChatUserId] = useState<number | null>(null);
  const [chatUserName, setChatUserName] = useState("");
  const [claimTarget, setClaimTarget] = useState<{
    order: ClaimOrder;
    item: ClaimOrderItem;
  } | null>(null);
  // จำหน้าที่กดเข้ามาเคลมสินค้าไว้ เพื่อให้ปุ่ม "← กลับ" ย้อนไปหน้านั้นแทนที่จะไปหน้า Products เสมอ
  const [claimOrigin, setClaimOrigin] = useState<"products" | "orders" | "menu">(
    "products"
  );
  const claimScreenRef = useRef<ClaimScreenHandle>(null);
  const cartScreenRef = useRef<CartScreenHandle>(null);

  // ใช้โดยแถบเมนูล่าง (BottomTabBar): เคลียร์สถานะที่ค้างจากหน้าย่อย แล้วสลับไปแท็บหลักที่เลือก
  const handleTabNavigate = (tab: TabKey) => {
    setSelectedProduct(null);
    setClaimTarget(null);
    setScreen(tab);
  };

  // ใช้โดยแถบสลับหน้าแอดมิน (AdminNavTabs) ให้สลับไปหน้าแอดมินที่เลือกได้จากทุกหน้าแอดมิน
  const handleAdminNavigate = (tab: AdminTabKey) => {
    if (tab === "products") {
      setScreen("adminProducts");
      return;
    }
    if (tab === "dashboard") {
      setScreen("dashboard");
      return;
    }
    if (tab === "orders") {
      setAdminOrdersInitialSearch("");
      setScreen("adminOrders");
      return;
    }
    if (tab === "claims") {
      setScreen("adminClaims");
      return;
    }
    setScreen("adminDiscounts");
  };

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
    if ((screen === "add" || screen === "edit" || screen === "dashboard" || screen === "adminOrders" || screen === "adminClaims" || screen === "adminDiscounts" || screen === "adminProducts" || screen === "adminCoinRewards") && !isAdmin) {
      setScreen("products");
    }
  }, [screen, isAdmin]);

  if (screen === "add" && isAdmin) {
    return (
      <View style={styles.container}>

        <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
          <View style={styles.headerLeft}>
            <ShopLogo
              isMobile={isMobile}
              subtitle="เพิ่มสินค้า"
              onPress={() => setScreen("products")}
            />
          </View>

          <View style={styles.headerRight}>
            <NotificationBell isAdmin={isAdmin} onPress={() => setScreen("notifications")} />

            <HeaderAvatarButton
              username={user?.username}
              avatarUrl={avatarUrl}
              onPress={() => setScreen("profile")}
            />
          </View>
        </View>

        <View style={styles.content}>
          <AddProductScreen
            onSuccess={() => setScreen("products")}
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

  if (screen === "edit" && selectedProduct && isAdmin) {
    return (
      <View style={styles.container}>

        <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
          <View style={styles.headerLeft}>
            <ShopLogo
              isMobile={isMobile}
              subtitle="แก้ไขสินค้า"
              onPress={() => {
                setScreen("products");
                setSelectedProduct(null);
              }}
            />
          </View>

          <View style={styles.headerRight}>
            <NotificationBell isAdmin={isAdmin} onPress={() => setScreen("notifications")} />

            <HeaderAvatarButton
              username={user?.username}
              avatarUrl={avatarUrl}
              onPress={() => setScreen("profile")}
            />
          </View>
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

  if (screen === "cart") {
    return (
      <View style={styles.container}>

        <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
          <View style={styles.headerLeft}>
            <ShopLogo
              isMobile={isMobile}
              subtitle="ตะกร้าสินค้า"
              onPress={() => {
                const handledInternally = cartScreenRef.current?.goBack();

                if (!handledInternally) {
                  setScreen("products");
                }
              }}
            />
          </View>

          <View style={styles.headerRight}>
            <NotificationBell isAdmin={isAdmin} onPress={() => setScreen("notifications")} />

            <HeaderAvatarButton
              username={user?.username}
              avatarUrl={avatarUrl}
              onPress={() => setScreen("profile")}
            />
          </View>
        </View>

        <View style={styles.content}>
          <CartScreen
            ref={cartScreenRef}
            onBack={() => setScreen("products")}
            onViewOrders={() => setScreen("orders")}
          />
        </View>

        <BottomTabBar active="cart" cartCount={cartCount} onNavigate={handleTabNavigate} />

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

  if (screen === "orders") {
    return (
      <View style={styles.container}>

        <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
          <View style={styles.headerLeft}>
            <ShopLogo
              isMobile={isMobile}
              subtitle="ประวัติการสั่งซื้อ"
              onPress={() => setScreen("products")}
            />
          </View>

          <View style={styles.headerRight}>
            <NotificationBell isAdmin={isAdmin} onPress={() => setScreen("notifications")} />

            <HeaderAvatarButton
              username={user?.username}
              avatarUrl={avatarUrl}
              onPress={() => setScreen("profile")}
            />
          </View>
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

        <BottomTabBar active="orders" cartCount={cartCount} onNavigate={handleTabNavigate} />

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

  if (screen === "coins") {
    return (
      <View style={styles.container}>

        <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
          <View style={styles.headerLeft}>
            <ShopLogo
              isMobile={isMobile}
              subtitle="เหรียญสะสม"
              onPress={() => setScreen("products")}
            />
          </View>

          <View style={styles.headerRight}>
            <NotificationBell isAdmin={isAdmin} onPress={() => setScreen("notifications")} />

            <HeaderAvatarButton
              username={user?.username}
              avatarUrl={avatarUrl}
              onPress={() => setScreen("profile")}
            />
          </View>
        </View>

        <View style={styles.content}>
          <CoinsScreen onOpenShop={() => setScreen("coinShop")} />
        </View>

        <BottomTabBar active="coins" cartCount={cartCount} onNavigate={handleTabNavigate} />

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

  if (screen === "claim") {
    return (
      <View style={styles.container}>

        <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
          <View style={styles.headerLeft}>
            <ShopLogo
              isMobile={isMobile}
              subtitle="เคลมสินค้า"
              onPress={() => {
                // ลองให้หน้าเคลมย้อนกลับภายในตัวเองก่อน (เช่น จากฟอร์ม กลับไปหน้าเลือกสินค้า)
                // ถ้าไม่มีอะไรให้ย้อนแล้ว ค่อยออกจากหน้านี้กลับไปหน้าที่กดเข้ามา
                const handledInternally = claimScreenRef.current?.goBack();

                if (!handledInternally) {
                  setScreen(claimOrigin);
                  setClaimTarget(null);
                }
              }}
            />
          </View>

          <View style={styles.headerRight}>
            <NotificationBell isAdmin={isAdmin} onPress={() => setScreen("notifications")} />

            <HeaderAvatarButton
              username={user?.username}
              avatarUrl={avatarUrl}
              onPress={() => setScreen("profile")}
            />
          </View>
        </View>

        <View style={styles.content}>
          <ClaimScreen
            ref={claimScreenRef}
            order={claimTarget?.order}
            item={claimTarget?.item}
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

  if (screen === "detail" && selectedProduct) {
    return (
      <View style={styles.container}>

        <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
          <View style={styles.headerLeft}>
            <ShopLogo
              isMobile={isMobile}
              subtitle="รายละเอียดสินค้า"
              onPress={() => {
                setScreen("products");
                setSelectedProduct(null);
              }}
            />
          </View>

          <View style={styles.headerRight}>
            <NotificationBell isAdmin={isAdmin} onPress={() => setScreen("notifications")} />

            <HeaderAvatarButton
              username={user?.username}
              avatarUrl={avatarUrl}
              onPress={() => setScreen("profile")}
            />
          </View>
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

  if (screen === "wishlist") {
    return (
      <View style={styles.container}>

        <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
          <View style={styles.headerLeft}>
            <ShopLogo
              isMobile={isMobile}
              subtitle="Home"
              onPress={() => setScreen("products")}
            />
          </View>

          <View style={styles.headerRight}>
            <NotificationBell isAdmin={isAdmin} onPress={() => setScreen("notifications")} />

            <HeaderAvatarButton
              username={user?.username}
              avatarUrl={avatarUrl}
              onPress={() => setScreen("profile")}
            />
          </View>
        </View>

        <View style={styles.content}>
          <WishlistScreen
            onOpenProduct={(product) => {
              setSelectedProduct(product as unknown as Product);
              setScreen("detail");
            }}
          />
        </View>

        <BottomTabBar active="products" cartCount={cartCount} onNavigate={handleTabNavigate} />

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

  if (screen === "dashboard" && isAdmin) {
    return (
      <View style={styles.container}>

        <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
          <View style={styles.headerLeft}>
            <ShopLogo
              isMobile={isMobile}
              subtitle="แดชบอร์ด"
              onPress={() => setScreen("products")}
            />
          </View>

          <View style={styles.headerRight}>
            <NotificationBell isAdmin={isAdmin} onPress={() => setScreen("notifications")} />

            <HeaderAvatarButton
              username={user?.username}
              avatarUrl={avatarUrl}
              onPress={() => setScreen("profile")}
            />
          </View>
        </View>

        <AdminNavTabs
          active="dashboard"
          onNavigate={handleAdminNavigate}
          ordersCount={adminPendingOrders}
          claimsCount={adminPendingClaims}
        />

        <View style={styles.content}>
          <DashboardScreen
            onOpenStock={() => setScreen("adminProducts")}
            onOpenOrders={() => { setAdminOrdersInitialSearch(""); setScreen("adminOrders"); }}
            onOpenClaims={() => setScreen("adminClaims")}
            onOpenDiscounts={() => setScreen("adminDiscounts")}
            onOpenChats={() => setScreen("adminChatList")}
            onBackToStore={() => setScreen("products")}
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

  if (screen === "adminOrders" && isAdmin) {
    return (
      <View style={styles.container}>

        <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
          <View style={styles.headerLeft}>
            <ShopLogo
              isMobile={isMobile}
              subtitle="ออเดอร์"
              onPress={() => setScreen("products")}
            />
          </View>

          <View style={styles.headerRight}>
            <NotificationBell isAdmin={isAdmin} onPress={() => setScreen("notifications")} />

            <HeaderAvatarButton
              username={user?.username}
              avatarUrl={avatarUrl}
              onPress={() => setScreen("profile")}
            />
          </View>
        </View>

        <AdminNavTabs
          active="orders"
          onNavigate={handleAdminNavigate}
          ordersCount={adminPendingOrders}
          claimsCount={adminPendingClaims}
        />

        <View style={styles.content}>
          <AdminOrdersScreen initialSearch={adminOrdersInitialSearch} />
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

  if (screen === "adminClaims" && isAdmin) {
    return (
      <View style={styles.container}>

        <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
          <View style={styles.headerLeft}>
            <ShopLogo
              isMobile={isMobile}
              subtitle="เคลมสินค้า"
              onPress={() => setScreen("products")}
            />
          </View>

          <View style={styles.headerRight}>
            <NotificationBell isAdmin={isAdmin} onPress={() => setScreen("notifications")} />

            <HeaderAvatarButton
              username={user?.username}
              avatarUrl={avatarUrl}
              onPress={() => setScreen("profile")}
            />
          </View>
        </View>

        <AdminNavTabs
          active="claims"
          onNavigate={handleAdminNavigate}
          ordersCount={adminPendingOrders}
          claimsCount={adminPendingClaims}
        />

        <View style={styles.content}>
          <AdminClaimsScreen
            onOpenOrder={(orderId) => {
              setAdminOrdersInitialSearch(String(orderId));
              setScreen("adminOrders");
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

  if (screen === "adminDiscounts" && isAdmin) {
    return (
      <View style={styles.container}>

        <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
          <View style={styles.headerLeft}>
            <ShopLogo
              isMobile={isMobile}
              subtitle="ส่วนลด"
              onPress={() => setScreen("products")}
            />
          </View>

          <View style={styles.headerRight}>
            <NotificationBell isAdmin={isAdmin} onPress={() => setScreen("notifications")} />

            <HeaderAvatarButton
              username={user?.username}
              avatarUrl={avatarUrl}
              onPress={() => setScreen("profile")}
            />
          </View>
        </View>

        <AdminNavTabs
          active="discounts"
          onNavigate={handleAdminNavigate}
          ordersCount={adminPendingOrders}
          claimsCount={adminPendingClaims}
        />

        <View style={styles.content}>
          <AdminDiscountsScreen />
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

  if (screen === "adminProducts" && isAdmin) {
    return (
      <View style={styles.container}>

        <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
          <View style={styles.headerLeft}>
            <ShopLogo
              isMobile={isMobile}
              subtitle="จัดการสินค้า"
              onPress={() => setScreen("products")}
            />
          </View>

          <View style={styles.headerRight}>
            <NotificationBell isAdmin={isAdmin} onPress={() => setScreen("notifications")} />

            <HeaderAvatarButton
              username={user?.username}
              avatarUrl={avatarUrl}
              onPress={() => setScreen("profile")}
            />
          </View>
        </View>

        <AdminNavTabs
          active="products"
          onNavigate={handleAdminNavigate}
          ordersCount={adminPendingOrders}
          claimsCount={adminPendingClaims}
        />

        <View style={styles.content}>
          <AdminProductsScreen />
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

  if (screen === "adminCoinRewards" && isAdmin) {
    return (
      <View style={styles.container}>

        <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
          <View style={styles.headerLeft}>
            <ShopLogo
              isMobile={isMobile}
              subtitle="ร้านค้าเหรียญ (แอดมิน)"
              onPress={() => setScreen("products")}
            />
          </View>

          <View style={styles.headerRight}>
            <NotificationBell isAdmin={isAdmin} onPress={() => setScreen("notifications")} />

            <HeaderAvatarButton
              username={user?.username}
              avatarUrl={avatarUrl}
              onPress={() => setScreen("profile")}
            />
          </View>
        </View>

        <View style={styles.content}>
          <AdminCoinRewardsScreen />
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

  if (screen === "coinShop") {
    return (
      <View style={styles.container}>

        <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
          <View style={styles.headerLeft}>
            <ShopLogo
              isMobile={isMobile}
              subtitle="ร้านแลกของรางวัล"
              onPress={() => setScreen("products")}
            />
          </View>

          <View style={styles.headerRight}>
            <NotificationBell isAdmin={isAdmin} onPress={() => setScreen("notifications")} />

            <HeaderAvatarButton
              username={user?.username}
              avatarUrl={avatarUrl}
              onPress={() => setScreen("profile")}
            />
          </View>
        </View>

        <View style={styles.content}>
          <CoinShopScreen onOpenHistory={() => setScreen("coins")} />
        </View>

        <BottomTabBar active="coins" cartCount={cartCount} onNavigate={handleTabNavigate} />

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

  if (screen === "profile") {
    return (
      <View style={styles.container}>

        <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
          <View style={styles.headerLeft}>
            <ShopLogo
              isMobile={isMobile}
              subtitle="Profile"
              onPress={() => setScreen("products")}
            />
          </View>

          <View style={styles.headerRight}>
            <NotificationBell isAdmin={isAdmin} onPress={() => setScreen("notifications")} />

            <HeaderAvatarButton
              username={user?.username}
              avatarUrl={avatarUrl}
              onPress={() => setScreen("profile")}
            />
          </View>
        </View>

        <View style={styles.content}>
          <ProfileScreen
            isAdmin={isAdmin}
            onDashboard={() => setScreen("dashboard")}
            onOrders={() => setScreen("orders")}
            onWishlist={() => setScreen("wishlist")}
            onSettings={() => setScreen("settings")}
            onLogout={confirmLogout}
            onAvatarChange={setAvatarUrl}
          />
        </View>

        <BottomTabBar active="menu" cartCount={cartCount} onNavigate={handleTabNavigate} />

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

  // หน้าตั้งค่า: แก้ไขข้อมูลส่วนตัว/เปลี่ยนรหัสผ่าน/การตั้งค่าทั่วไป เข้าถึงจากปุ่มในหน้าโปรไฟล์หลัก
  if (screen === "settings") {
    return (
      <View style={styles.container}>

        <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
          <View style={styles.headerLeft}>
            <ShopLogo
              isMobile={isMobile}
              subtitle="ตั้งค่า"
              onPress={() => setScreen("profile")}
            />
          </View>

          <View style={styles.headerRight}>
            <NotificationBell isAdmin={isAdmin} onPress={() => setScreen("notifications")} />

            <HeaderAvatarButton
              username={user?.username}
              avatarUrl={avatarUrl}
              onPress={() => setScreen("profile")}
            />
          </View>
        </View>

        <View style={styles.content}>
          <SettingsScreen />
        </View>

      </View>
    );
  }

  // หน้าเมนูเต็มหน้าจอ: เข้าถึงจากแถบเมนูล่าง (ปุ่ม "เมนู") — สลับระบบกับปุ่มรูปโปรไฟล์มุมขวาบนแล้ว
  // (ปุ่มรูปโปรไฟล์กดแล้วพาไปหน้าโปรไฟล์โดยตรง ส่วนทางลัดอื่นๆ ที่เคยอยู่ในดรอปดาวน์ย้ายมาอยู่ที่นี่แทน)
  if (screen === "menu") {
    return (
      <View style={styles.container}>

        <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
          <View style={styles.headerLeft}>
            <ShopLogo
              isMobile={isMobile}
              subtitle="เมนู"
              onPress={() => setScreen("products")}
            />
          </View>

          <View style={styles.headerRight}>
            <NotificationBell isAdmin={isAdmin} onPress={() => setScreen("notifications")} />

            <HeaderAvatarButton
              username={user?.username}
              avatarUrl={avatarUrl}
              onPress={() => setScreen("profile")}
            />
          </View>
        </View>

        <View style={styles.content}>
          <MenuScreen
            username={user?.username}
            roleLabel={isAdmin ? "Admin" : "User"}
            isAdmin={isAdmin}
            avatarUrl={avatarUrl}
            onDashboard={() => setScreen("dashboard")}
            onAdminProducts={() => setScreen("adminProducts")}
            onAdminOrders={() => { setAdminOrdersInitialSearch(""); setScreen("adminOrders"); }}
            onAdminClaims={() => setScreen("adminClaims")}
            onAdminDiscounts={() => setScreen("adminDiscounts")}
            onAdminCoinRewards={() => setScreen("adminCoinRewards")}
            onAdminChat={() => setScreen("adminChatList")}
            onOrders={() => setScreen("orders")}
            onClaims={() => {
              setClaimTarget(null);
              setClaimOrigin("menu");
              setScreen("claim");
            }}
            onChat={() => setScreen("chat")}
            onCoins={() => setScreen("coins")}
            onCoinShop={() => setScreen("coinShop")}
            onWishlist={() => setScreen("wishlist")}
            onProfile={() => setScreen("profile")}
            onLogout={confirmLogout}
          />
        </View>

        <BottomTabBar active="menu" cartCount={cartCount} onNavigate={handleTabNavigate} />

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

  // หน้าแชทเต็มหน้าจอฝั่ง user: คุยกับแอดมินโดยตรง (เข้าถึงจากเมนู "แชทกับแอดมิน")
  if (screen === "chat") {
    return (
      <View style={styles.container}>

        <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
          <View style={styles.headerLeft}>
            <ShopLogo
              isMobile={isMobile}
              subtitle="แชทกับแอดมิน"
              onPress={() => setScreen("menu")}
            />
          </View>

          <View style={styles.headerRight}>
            <HeaderAvatarButton
              username={user?.username}
              avatarUrl={avatarUrl}
              onPress={() => setScreen("profile")}
            />
          </View>
        </View>

        <View style={styles.content}>
          <ChatScreen />
        </View>

      </View>
    );
  }

  // หน้ารายชื่อบทสนทนาเต็มหน้าจอ ฝั่งแอดมิน: เข้าถึงจากเมนู/แดชบอร์ด "ข้อความจากลูกค้า"
  if (screen === "adminChatList" && isAdmin) {
    return (
      <View style={styles.container}>

        <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
          <View style={styles.headerLeft}>
            <ShopLogo
              isMobile={isMobile}
              subtitle="ข้อความจากลูกค้า"
              onPress={() => setScreen("menu")}
            />
          </View>

          <View style={styles.headerRight}>
            <HeaderAvatarButton
              username={user?.username}
              avatarUrl={avatarUrl}
              onPress={() => setScreen("profile")}
            />
          </View>
        </View>

        <View style={styles.content}>
          <AdminChatListScreen
            onOpenConversation={(userId, displayName) => {
              setChatUserId(userId);
              setChatUserName(displayName);
              setScreen("adminChat");
            }}
          />
        </View>

      </View>
    );
  }

  // หน้าแชทเต็มหน้าจอฝั่งแอดมิน: คุยกับ user คนที่เลือกจาก AdminChatListScreen
  if (screen === "adminChat" && isAdmin && chatUserId !== null) {
    return (
      <View style={styles.container}>

        <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
          <View style={styles.headerLeft}>
            <ShopLogo
              isMobile={isMobile}
              subtitle={chatUserName || "แชท"}
              onPress={() => setScreen("adminChatList")}
            />
          </View>

          <View style={styles.headerRight}>
            <HeaderAvatarButton
              username={user?.username}
              avatarUrl={avatarUrl}
              onPress={() => setScreen("profile")}
            />
          </View>
        </View>

        <View style={styles.content}>
          <AdminChatScreen userId={chatUserId} />
        </View>

      </View>
    );
  }

  // หน้าแจ้งเตือนเต็มหน้าจอ: เข้าถึงจากปุ่มกระดิ่งที่ header ทุกหน้า
  if (screen === "notifications") {
    return (
      <View style={styles.container}>

        <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
          <View style={styles.headerLeft}>
            <ShopLogo
              isMobile={isMobile}
              subtitle="การแจ้งเตือน"
              onPress={() => setScreen("products")}
            />
          </View>

          <View style={styles.headerRight}>
            <HeaderAvatarButton
              username={user?.username}
              avatarUrl={avatarUrl}
              onPress={() => setScreen("profile")}
            />
          </View>
        </View>

        <View style={styles.content}>
          <NotificationsScreen isAdmin={isAdmin} />
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
            subtitle="Home"
            onPress={() => {
              setSelectedProduct(null);
              setClaimTarget(null);
              setScreen("products");
            }}
          />
        </View>

        <View style={styles.headerRight}>
          <NotificationBell isAdmin={isAdmin} onPress={() => setScreen("notifications")} />

          {/* ปุ่มรูปโปรไฟล์อยู่ขวาสุดเสมอ ไม่ว่าจอกว้างหรือแคบ */}
          <HeaderAvatarButton
            username={user?.username}
            avatarUrl={avatarUrl}
            onPress={() => setScreen("profile")}
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

      <BottomTabBar active="products" cartCount={cartCount} onNavigate={handleTabNavigate} />

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
    backgroundColor: "#F0E9DC",
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
    backgroundColor: "#3D2619",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,

    // สำคัญ
    zIndex: 101,
    elevation: 101,
  },

  addButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },

  screenTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3D2619",
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
    borderColor: "#E8DFD8",
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
    borderColor: "#E8DFD8",

    zIndex: 101,
    elevation: 101,
  },

  iconButtonPlain: {
    position: "relative",
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },

  headerIconText: {
    fontSize: 18,
  },

  notificationDot: {
    position: "absolute",
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D97706",
    borderWidth: 1.5,
    borderColor: "#F0E9DC",
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
    color: "#3D2619",
  },

  content: {
    flex: 1,
    zIndex: 0,
  },
});
