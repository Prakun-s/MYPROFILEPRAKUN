import { useEffect, useState } from "react";

import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import AddProductScreen from "../AddProductScreen";
import ConfirmDialog from "../components/ConfirmDialog";
import { useAuth } from "../context/AuthContext";
import EditProductScreen from "../EditProductScreen";
import ProductListScreen from "../ProductListScreen";

interface Product {
  id: number;
  name: string;
  stock: number;
  stock_text: string;
  category: string;
  location_count: number;
  location_text: string;
  badge_status: string;
  image_url: string;
}

export default function HomeScreen() {
  const { user, isAdmin, logout } = useAuth();
  const [screen, setScreen] = useState<"products" | "add" | "edit">("products");
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

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.topBar}>

        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>
            Inventory
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
                + Add Product
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
    gap: 8,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: -0.3,
    color: "#2B2B31",
  },

  userBadge: {
    backgroundColor: "#EEF0FF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  userBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#5B5FEF",
  },

  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E3DC",

    zIndex: 101,
    elevation: 101,
  },

  logoutButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#D2585F",
  },

  addButton: {
    backgroundColor: "#5B5FEF",
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

  backButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,

    zIndex: 101,
    elevation: 101,
  },

  backText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#5B5FEF",
  },

  content: {
    flex: 1,
    zIndex: 0,
  },
});