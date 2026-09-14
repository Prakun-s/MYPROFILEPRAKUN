import { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import ConfirmDialog from "./components/ConfirmDialog";
import { fetchProducts } from "./api";
import { useDeleteProduct } from "./hooks/use-delete-product";
import { useProductSearch } from "./hooks/use-product-search";

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

type PriceTier = "Low" | "Mid" | "High";

// จัดกลุ่มราคาสินค้าเป็น 3 ระดับ (Low / Mid / High) ด้วย K-Means แบบง่าย
// รันบนเครื่อง client เอง ไม่ต้องพึ่ง backend — ปรับมาจากไอเดียตัวอย่างของอาจารย์
function clusterPricesByTier(items: Product[]): Map<number, PriceTier> {
  const tierById = new Map<number, PriceTier>();

  if (items.length === 0) {
    return tierById;
  }

  const prices = items.map((item) => Number(item.price) || 0);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  let centroids = [minPrice, (minPrice + maxPrice) / 2, maxPrice];
  let assignments: number[] = [];
  let changed = true;

  while (changed) {
    changed = false;

    assignments = prices.map((price) => {
      const diffs = centroids.map((c) => Math.abs(price - c));
      return diffs.indexOf(Math.min(...diffs));
    });

    const newCentroids = [0, 1, 2].map((clusterIndex) => {
      const clusterPrices = prices.filter(
        (_, index) => assignments[index] === clusterIndex
      );

      return clusterPrices.length
        ? clusterPrices.reduce((a, b) => a + b, 0) / clusterPrices.length
        : centroids[clusterIndex];
    });

    if (JSON.stringify(centroids) !== JSON.stringify(newCentroids)) {
      centroids = newCentroids;
      changed = true;
    }
  }

  const sortedCentroids = [...centroids].sort((a, b) => a - b);
  const labels: PriceTier[] = ["Low", "Mid", "High"];

  items.forEach((item, index) => {
    const myCentroid = centroids[assignments[index]];
    const tierIndex = sortedCentroids.indexOf(myCentroid);
    tierById.set(item.id, labels[tierIndex]);
  });

  return tierById;
}

interface Props {
  onEditProduct?: (product: Product) => void;
  // ควบคุมว่าแสดงปุ่ม "แก้ไข" / "ลบ" หรือไม่ (เฉพาะ admin เท่านั้น)
  canManage?: boolean;
}

export default function ProductListScreen({ onEditProduct, canManage = false }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const {
    deletingId,
    deleteTarget,
    askDelete,
    cancelDelete,
    confirmDelete,
  } = useDeleteProduct((deletedId) => {
    setProducts((prev) => prev.filter((p) => p.id !== deletedId));
  });

  const { searchText, setSearchText, filteredProducts } =
    useProductSearch(products);

  // แบ่งกลุ่มราคาเป็น Low / Mid / High ใหม่ทุกครั้งที่รายการสินค้าเปลี่ยน
  const priceTierById = useMemo(
    () => clusterPricesByTier(products),
    [products]
  );

  const loadProducts = async () => {
    try {
      setError("");

      const data = await fetchProducts();

      if (!Array.isArray(data)) {
        throw new Error("Invalid data format");
      }

      setProducts(data);
    } catch (err: any) {
      console.error("Fetch products error:", err);
      setError(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  // โหลดสินค้าอัตโนมัติเมื่อเปิดหน้า
  useEffect(() => {
    loadProducts();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  const renderProduct = ({ item }: { item: Product }) => {
    return (
      <View style={styles.card}>

        <Image
          source={{ uri: item.image_url }}
          style={styles.image}
          resizeMode="cover"
        />

        <View style={styles.info}>

          <View style={styles.nameRow}>
            <Text style={styles.name}>
              {item.name}
            </Text>

            {canManage && (
              <TouchableOpacity
                style={styles.editButton}
                activeOpacity={0.7}
                onPress={() => onEditProduct && onEditProduct(item)}
              >
                <Text style={styles.editButtonText}>
                  แก้ไข
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.price}>
            ฿{Number(item.price).toLocaleString("th-TH")}
          </Text>

          <Text style={styles.text}>
            Stock: {item.stock_text}
          </Text>

          <Text style={styles.text}>
            Category: {item.category}
          </Text>

          <Text style={styles.text}>
            Location: {item.location_text}
          </Text>

          <View style={styles.bottomRow}>

            <View style={styles.badgeGroup}>
              <Text
                style={[
                  styles.badge,
                  item.stock < 5
                    ? styles.lowStock
                    : styles.available,
                ]}
              >
                {item.badge_status}
              </Text>

              {priceTierById.get(item.id) && (
                <Text
                  style={[
                    styles.badge,
                    priceTierById.get(item.id) === "Low" && styles.priceTierLow,
                    priceTierById.get(item.id) === "Mid" && styles.priceTierMid,
                    priceTierById.get(item.id) === "High" && styles.priceTierHigh,
                  ]}
                >
                  {priceTierById.get(item.id)}
                </Text>
              )}
            </View>

            {canManage && (
              <TouchableOpacity
                style={styles.deleteButton}
                activeOpacity={0.7}
                onPress={() => askDelete(item)}
                disabled={deletingId === item.id}
              >
                {deletingId === item.id ? (
                  <ActivityIndicator size="small" color="#D2585F" />
                ) : (
                  <Text style={styles.deleteButtonText}>
                    ลบ
                  </Text>
                )}
              </TouchableOpacity>
            )}

          </View>

        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>
          Loading products...
        </Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.center}>

        <Text style={styles.error}>
          {error}
        </Text>

        <TouchableOpacity
          style={styles.retryButton}
          activeOpacity={0.8}
          onPress={loadProducts}
        >
          <Text style={styles.retryText}>
            Retry
          </Text>
        </TouchableOpacity>

      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <Text style={styles.title}>
          Products
        </Text>

        <TouchableOpacity
          style={styles.refreshButton}
          activeOpacity={0.7}
          onPress={loadProducts}
        >
          <Text style={styles.refreshText}>
            Refresh
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.searchInput}
          placeholder="ค้นหาสินค้า ชื่อ, หมวดหมู่, ตำแหน่ง..."
          placeholderTextColor="#A9A8A2"
          value={searchText}
          onChangeText={setSearchText}
        />

        {searchText.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            activeOpacity={0.7}
            onPress={() => setSearchText("")}
          >
            <Text style={styles.clearButtonText}>
              ✕
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.count}>
        {searchText
          ? `พบ ${filteredProducts.length} จาก ${products.length} รายการ`
          : `${products.length} Products`}
      </Text>

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderProduct}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              ไม่พบสินค้าที่ตรงกับ "{searchText}"
            </Text>
          </View>
        }
      />

      <ConfirmDialog
        visible={!!deleteTarget}
        title="ลบสินค้า"
        message={
          deleteTarget
            ? `ต้องการลบ "${deleteTarget.name}" ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้`
            : ""
        }
        confirmText="ลบ"
        cancelText="ยกเลิก"
        destructive
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#F7F6F3",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#F7F6F3",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#F7F6F3",
  },

  title: {
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: -0.3,
    color: "#2B2B31",
  },

  refreshButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E3DC",
  },

  refreshText: {
    fontWeight: "500",
    fontSize: 13,
    color: "#4B4B54",
  },

  count: {
    fontSize: 13,
    fontWeight: "500",
    color: "#8A8A93",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },

  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E3DC",
    paddingHorizontal: 12,
  },

  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: "#2B2B31",
  },

  clearButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },

  clearButtonText: {
    fontSize: 14,
    color: "#A9A8A2",
    fontWeight: "600",
  },

  emptyState: {
    paddingTop: 40,
    alignItems: "center",
  },

  emptyStateText: {
    fontSize: 14,
    color: "#8A8A93",
    textAlign: "center",
  },

  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    marginBottom: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#EFEDE7",
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  image: {
    width: 92,
    height: 92,
    borderRadius: 10,
    backgroundColor: "#F1F0EC",
  },

  info: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "center",
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  editButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#EEEDFB",
  },

  editButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#5B5FEF",
  },

  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2B2B31",
    flexShrink: 1,
    paddingRight: 8,
  },

  price: {
    fontSize: 15,
    fontWeight: "700",
    color: "#5B5FEF",
    marginBottom: 2,
  },

  text: {
    fontSize: 13,
    color: "#8A8A93",
    marginBottom: 2,
  },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },

  badgeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "600",
    overflow: "hidden",
  },

  priceTierLow: {
    backgroundColor: "#E6F4EC",
    color: "#2F9E63",
  },

  priceTierMid: {
    backgroundColor: "#FFF3DE",
    color: "#B8791A",
  },

  priceTierHigh: {
    backgroundColor: "#F1EAFB",
    color: "#7C4FDB",
  },

  available: {
    backgroundColor: "#E6F4EC",
    color: "#2F9E63",
  },

  lowStock: {
    backgroundColor: "#FBECEC",
    color: "#D2585F",
  },

  arrow: {
    fontSize: 20,
    color: "#C7C6C1",
  },

  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#FBECEC",
    minWidth: 44,
    alignItems: "center",
  },

  deleteButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#D2585F",
  },

  loadingText: {
    marginTop: 10,
    color: "#8A8A93",
    fontSize: 14,
  },

  error: {
    color: "#D2585F",
    textAlign: "center",
    marginBottom: 15,
    fontSize: 14,
  },

  retryButton: {
    backgroundColor: "#5B5FEF",
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 10,
  },

  retryText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },

});