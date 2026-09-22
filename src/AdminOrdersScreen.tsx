import { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { fetchAllOrders, updateOrderStatus } from "./api";
import Toast from "./components/Toast";

interface OrderItem {
  product_id: number;
  product_name: string;
  price: number;
  quantity: number;
}

type OrderStatus = "pending" | "shipping" | "delivered" | "cancelled";

interface Order {
  id: number;
  user_id: number;
  username: string | null;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
  items: OrderItem[];
}

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "เตรียมสินค้า" },
  { value: "shipping", label: "กำลังจัดส่ง" },
  { value: "delivered", label: "สำเร็จ" },
  { value: "cancelled", label: "ยกเลิก" },
];

const FILTER_OPTIONS: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  ...STATUS_OPTIONS,
];

// หน้าจัดการออเดอร์สำหรับ admin: ดูออเดอร์ทั้งร้าน + เปลี่ยนสถานะจัดส่งได้จริง
// (บันทึกลงคอลัมน์ status ใน DB ผ่าน PUT /api/orders/:id/status)
export default function AdminOrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastTone, setToastTone] = useState<"info" | "warning">("info");

  const load = async () => {
    try {
      setError("");
      const data = await fetchAllOrders();
      setOrders(data);
    } catch (err: any) {
      console.error("Load all orders error:", err);
      setError(err.message || "ไม่สามารถโหลดรายการออเดอร์ได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const notify = (message: string, tone: "info" | "warning" = "info") => {
    setToastMessage(message);
    setToastTone(tone);
    setToastVisible(true);
  };

  const handleChangeStatus = async (order: Order, status: OrderStatus) => {
    if (order.status === status) return;

    const previous = order.status;

    // อัปเดตหน้าจอทันที (optimistic) แล้วค่อยยืนยันกับ backend
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, status } : o))
    );
    setUpdatingId(order.id);

    try {
      await updateOrderStatus(order.id, status);

      const label =
        STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;

      notify(`อัปเดตออเดอร์ #${order.id} เป็น "${label}" แล้ว`);
    } catch (err: any) {
      console.error("Update order status error:", err);

      // ย้อนสถานะกลับถ้าบันทึกไม่สำเร็จ
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: previous } : o))
      );

      notify(err.message || "อัปเดตสถานะไม่สำเร็จ", "warning");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    if (filter === "all") return orders;
    return orders.filter((order) => order.status === filter);
  }, [orders, filter]);

  const countByStatus = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    for (const status of STATUS_OPTIONS) {
      counts[status.value] = orders.filter(
        (o) => o.status === status.value
      ).length;
    }
    return counts;
  }, [orders]);

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

        <TouchableOpacity style={styles.retryButton} onPress={load}>
          <Text style={styles.retryText}>ลองใหม่</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={filteredOrders}
        keyExtractor={(order) => String(order.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.filterRow}>
            {FILTER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.filterChip,
                  filter === option.value && styles.filterChipActive,
                ]}
                activeOpacity={0.7}
                onPress={() => setFilter(option.value)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filter === option.value && styles.filterChipTextActive,
                  ]}
                >
                  {option.label} ({countByStatus[option.value] ?? 0})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        }
        renderItem={({ item: order }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.orderId}>คำสั่งซื้อ #{order.id}</Text>
                <Text style={styles.orderMeta}>
                  {order.username || "ไม่ทราบชื่อผู้ใช้"} ·{" "}
                  {new Date(order.created_at).toLocaleDateString("th-TH", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>

              <Text style={styles.totalValue}>
                ฿{Number(order.total_amount).toLocaleString("th-TH")}
              </Text>
            </View>

            {order.items.map((item, index) => (
              <Text key={index} style={styles.itemLine} numberOfLines={1}>
                {item.product_name} × {item.quantity}
              </Text>
            ))}

            <View style={styles.statusRow}>
              {STATUS_OPTIONS.map((option) => {
                const active = order.status === option.value;
                const disabled = updatingId === order.id;

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.statusChip,
                      active && styles.statusChipActive,
                      option.value === "cancelled" &&
                        active &&
                        styles.statusChipCancelled,
                    ]}
                    activeOpacity={0.7}
                    disabled={disabled}
                    onPress={() => handleChangeStatus(order, option.value)}
                  >
                    {disabled && active ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text
                        style={[
                          styles.statusChipText,
                          active && styles.statusChipTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>ไม่มีออเดอร์ในหมวดนี้</Text>
          </View>
        }
      />

      <Toast
        visible={toastVisible}
        message={toastMessage}
        tone={toastTone}
        onHide={() => setToastVisible(false)}
      />
    </View>
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

  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },

  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D8D8D8",
    backgroundColor: "#FFFFFF",
  },

  filterChipActive: {
    backgroundColor: "#111111",
    borderColor: "#111111",
  },

  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4A4A4A",
  },

  filterChipTextActive: {
    color: "#FFFFFF",
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
    marginBottom: 8,
  },

  orderId: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111111",
  },

  orderMeta: {
    fontSize: 12,
    color: "#8A8A8A",
    marginTop: 2,
  },

  totalValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111111",
  },

  itemLine: {
    fontSize: 12,
    color: "#6B6B6B",
    marginBottom: 2,
  },

  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },

  statusChip: {
    minWidth: 84,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D8D8D8",
  },

  statusChipActive: {
    backgroundColor: "#111111",
    borderColor: "#111111",
  },

  statusChipCancelled: {
    backgroundColor: "#B3413E",
    borderColor: "#B3413E",
  },

  statusChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4A4A4A",
  },

  statusChipTextActive: {
    color: "#FFFFFF",
  },

  error: {
    fontSize: 14,
    color: "#B3413E",
    textAlign: "center",
    marginBottom: 12,
  },

  retryButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#111111",
  },

  retryText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },

  emptyText: {
    fontSize: 14,
    color: "#8A8A8A",
  },
});
