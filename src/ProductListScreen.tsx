import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { fetchProducts } from "./api";

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

export default function ProductListScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

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

          <Text style={styles.name}>
            {item.name}
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

            <Text style={styles.arrow}>
              ›
            </Text>

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
          onPress={loadProducts}
        >
          <Text style={styles.refreshText}>
            Refresh
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.count}>
        {products.length} Products
      </Text>

      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderProduct}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      />

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#ffffff",
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
  },

  refreshButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#eeeeee",
  },

  refreshText: {
    fontWeight: "600",
  },

  count: {
    fontSize: 16,
    fontWeight: "600",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  list: {
    padding: 12,
  },

  card: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    elevation: 3,
  },

  image: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: "#eeeeee",
  },

  info: {
    flex: 1,
    marginLeft: 12,
  },

  name: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },

  text: {
    fontSize: 13,
    color: "#555555",
    marginBottom: 3,
  },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    color: "#ffffff",
    fontSize: 12,
    overflow: "hidden",
  },

  available: {
    backgroundColor: "#22c55e",
  },

  lowStock: {
    backgroundColor: "#ef4444",
  },

  arrow: {
    fontSize: 25,
    color: "#777777",
  },

  loadingText: {
    marginTop: 10,
  },

  error: {
    color: "red",
    textAlign: "center",
    marginBottom: 15,
  },

  retryButton: {
    backgroundColor: "#333333",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },

  retryText: {
    color: "#ffffff",
    fontWeight: "bold",
  },

});