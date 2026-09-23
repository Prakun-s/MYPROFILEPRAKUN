import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { fetchMyOrders } from "./api";
import ReceiptModal from "./components/ReceiptModal";

interface OrderItem {
  product_id: number;
  product_name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: number;
  total_amount: number;
  status?: "pending" | "shipping" | "delivered" | "cancelled";
  payment_method?: string;
  discount_code?: string | null;
  discount_amount?: number;
  created_at: string;
  items: OrderItem[];
}

const STATUS_META: Record<
  "pending" | "shipping" | "delivered" | "cancelled",
  { label: string; tone: "pending" | "shipping" | "delivered" | "cancelled" }
> = {
  pending: { label: "กำลังเตรียมสินค้า", tone: "pending" },
  shipping: { label: "กำลังจัดส่ง", tone: "shipping" },
  delivered: { label: "จัดส่งสำเร็จ", tone: "delivered" },
  cancelled: { label: "ยกเลิกออเดอร์", tone: "cancelled" },
};

// เผื่อกรณียังไม่ได้รัน migration เพิ่มคอลัมน์ status ใน DB (order.status จะเป็น undefined)
// จำลองสถานะจากอายุของออเดอร์ไปก่อนเป็น fallback เท่านั้น
function getShippingStatus(order: Order) {
  if (order.status && STATUS_META[order.status]) {
    return STATUS_META[order.status];
  }

  const hoursSince =
    (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60);

  if (hoursSince < 1) return STATUS_META.pending;
  if (hoursSince < 24) return STATUS_META.shipping;
  return STATUS_META.delivered;
}

interface OrdersScreenProps {
  // เรียกตอนกดปุ่ม "เคลมสินค้า" ของรายการในออเดอร์ที่จัดส่งสำเร็จแล้ว
  onClaimItem?: (order: Order, item: OrderItem) => void;
}

export default function OrdersScreen({ onClaimItem }: OrdersScreenProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

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
    <>
      <FlatList
        data={orders}
        keyExtractor={(order) => String(order.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item: order }) => {
        const status = getShippingStatus(order);

        return (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
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

              <Text
                style={[
                  styles.statusBadge,
                  status.tone === "pending" && styles.statusPending,
                  status.tone === "shipping" && styles.statusShipping,
                  status.tone === "delivered" && styles.statusDelivered,
                  status.tone === "cancelled" && styles.statusCancelled,
                ]}
              >
                {status.label}
              </Text>
            </View>

            {order.items.map((item, index) => (
              <View key={index} style={styles.itemBlock}>
                <View style={styles.itemRow}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.product_name} × {item.quantity}
                  </Text>

                  <Text style={styles.itemPrice}>
                    ฿{(Number(item.price) * item.quantity).toLocaleString("th-TH")}
                  </Text>
                </View>

                {status.tone === "delivered" && onClaimItem && (
                  <TouchableOpacity
                    style={styles.claimButton}
                    activeOpacity={0.7}
                    onPress={() => onClaimItem(order, item)}
                  >
                    <Text style={styles.claimButtonText}>เคลมสินค้า</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>ยอดรวม</Text>
              <Text style={styles.totalValue}>
                ฿{Number(order.total_amount).toLocaleString("th-TH")}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.receiptButton}
              activeOpacity={0.7}
              onPress={() => setReceiptOrder(order)}
            >
              <Text style={styles.receiptButtonText}>🧾 ดูใบเสร็จ</Text>
            </TouchableOpacity>
          </View>
        );
        }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>ยังไม่มีประวัติการสั่งซื้อ</Text>
          </View>
        }
      />

      {receiptOrder && (
        <ReceiptModal
          visible={!!receiptOrder}
          orderId={receiptOrder.id}
          createdAt={receiptOrder.created_at}
          items={receiptOrder.items}
          totalAmount={receiptOrder.total_amount}
          paymentMethod={receiptOrder.payment_method}
          discountCode={receiptOrder.discount_code}
          discountAmount={receiptOrder.discount_amount}
          onClose={() => setReceiptOrder(null)}
        />
      )}
    </>
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
    alignItems: "flex-start",
    marginBottom: 10,
  },

  statusBadge: {
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    overflow: "hidden",
  },

  statusPending: {
    backgroundColor: "#FFF3E0",
    color: "#B26A00",
  },

  statusShipping: {
    backgroundColor: "#E8F0FE",
    color: "#1A56C4",
  },

  statusDelivered: {
    backgroundColor: "#E7F6EC",
    color: "#1E8E3E",
  },

  statusCancelled: {
    backgroundColor: "#FBEAE9",
    color: "#B3413E",
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

  itemBlock: {
    marginBottom: 6,
  },

  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  claimButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#111111",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 2,
    marginBottom: 4,
  },

  claimButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111111",
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

  receiptButton: {
    alignSelf: "flex-start",
    marginTop: 12,
  },

  receiptButtonText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#4A4A4A",
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
