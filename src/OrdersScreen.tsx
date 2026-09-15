import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { fetchMyOrders } from "./api";

interface OrderItem {
  product_id: number;
  product_name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: number;
  total_amount: number;
  created_at: string;
  items: OrderItem[];
}

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchMyOrders();
        setOrders(data);
      } catch (err: any) {
        console.error("Load orders error:", err);
        setError(err.message || "ไม่สามารถโหลดประวัติการสั่งซื้อได้");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111111" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={orders}
      keyExtractor={(order) => String(order.id)}
      contentContainerStyle={styles.list}
      renderItem={({ item: order }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.orderId}>คำสั่งซื้อ #{order.id}</Text>

            <Text style={styles.orderDate}>
              {new Date(order.created_at).toLocaleDateString("th-TH", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>

          {order.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.product_name} × {item.quantity}
              </Text>

              <Text style={styles.itemPrice}>
                ฿{(Number(item.price) * item.quantity).toLocaleString("th-TH")}
              </Text>
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>ยอดรวม</Text>
            <Text style={styles.totalValue}>
              ฿{Number(order.total_amount).toLocaleString("th-TH")}
            </Text>
          </View>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>ยังไม่มีประวัติการสั่งซื้อ</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#FAFAFA",
  },

  list: {
    padding: 16,
    flexGrow: 1,
    backgroundColor: "#FAFAFA",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EDEDED",
    padding: 14,
    marginBottom: 12,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  orderId: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111111",
  },

  orderDate: {
    fontSize: 12,
    color: "#8A8A8A",
  },

  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  itemName: {
    fontSize: 13,
    color: "#4A4A4A",
    flex: 1,
    paddingRight: 8,
  },

  itemPrice: {
    fontSize: 13,
    color: "#4A4A4A",
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#EDEDED",
  },

  totalLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111111",
  },

  totalValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111111",
  },

  error: {
    fontSize: 14,
    color: "#B3413E",
    textAlign: "center",
  },

  emptyText: {
    fontSize: 14,
    color: "#8A8A8A",
  },
});
