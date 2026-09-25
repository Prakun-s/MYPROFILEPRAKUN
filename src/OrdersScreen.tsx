import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { addToCart, fetchMyOrders } from "./api";
import Icon from "./components/Icon";
import ReceiptModal from "./components/ReceiptModal";
import Toast from "./components/Toast";
import { useCart } from "./context/CartContext";

interface OrderItem {
  product_id: number;
  product_name: string;
  price: number;
  quantity: number;
  image_url?: string;
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

type StatusKey = "pending" | "shipping" | "delivered" | "cancelled";

const STATUS_META: Record<
  StatusKey,
  { label: string; tone: StatusKey }
> = {
  pending: { label: "กำลังเตรียม", tone: "pending" },
  shipping: { label: "กำลังจัดส่ง", tone: "shipping" },
  delivered: { label: "จัดส่งสำเร็จ", tone: "delivered" },
  cancelled: { label: "ยกเลิกออเดอร์", tone: "cancelled" },
};

const TABS: { key: StatusKey | "all"; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "pending", label: "กำลังเตรียม" },
  { key: "shipping", label: "กำลังจัดส่ง" },
  { key: "delivered", label: "สำเร็จ" },
];

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
  const { refreshCart } = useCart();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [tab, setTab] = useState<StatusKey | "all">("all");
  const [reorderingId, setReorderingId] = useState<number | null>(null);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastTone, setToastTone] = useState<"info" | "warning">("info");

  const notify = (message: string, tone: "info" | "warning" = "info") => {
    setToastMessage(message);
    setToastTone(tone);
    setToastVisible(true);
  };

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

  const handleReorder = async (order: Order) => {
    setReorderingId(order.id);

    try {
      const results = await Promise.allSettled(
        order.items.map((item) => addToCart(item.product_id, item.quantity))
      );

      const failed = results.filter((r) => r.status === "rejected").length;
      await refreshCart();

      if (failed === 0) {
        notify("เพิ่มสินค้าทั้งหมดลงตะกร้าแล้ว");
      } else if (failed < results.length) {
        notify(`เพิ่มลงตะกร้าบางส่วน (สินค้า ${failed} ชิ้นอาจหมดสต๊อก)`, "warning");
      } else {
        notify("เพิ่มลงตะกร้าไม่สำเร็จ สินค้าอาจหมดสต๊อกแล้ว", "warning");
      }
    } catch (err: any) {
      console.error("Reorder error:", err);
      notify(err.message || "สั่งซื้ออีกครั้งไม่สำเร็จ", "warning");
    } finally {
      setReorderingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3D2619" />
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

  const counts = {
    all: orders.length,
    pending: orders.filter((o) => getShippingStatus(o).tone === "pending").length,
    shipping: orders.filter((o) => getShippingStatus(o).tone === "shipping").length,
    delivered: orders.filter((o) => getShippingStatus(o).tone === "delivered").length,
    cancelled: orders.filter((o) => getShippingStatus(o).tone === "cancelled").length,
  };

  const visibleOrders =
    tab === "all" ? orders : orders.filter((o) => getShippingStatus(o).tone === tab);

  return (
    <>
      <FlatList
        data={visibleOrders}
        keyExtractor={(order) => String(order.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabRow}
            contentContainerStyle={styles.tabRowContent}
          >
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.tabChip, active && styles.tabChipActive]}
                  activeOpacity={0.7}
                  onPress={() => setTab(t.key)}
                >
                  <Text style={[styles.tabChipText, active && styles.tabChipTextActive]}>
                    {t.label} ({counts[t.key]})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        }
        renderItem={({ item: order }) => {
          const status = getShippingStatus(order);
          const firstItem = order.items[0];
          const extraCount = order.items.length - 1;

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Icon name="inventory_2" size={14} color="#3D2619" />
                  <Text style={styles.orderId}>#PK-{order.id.toString().padStart(6, "0")}</Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    status.tone === "pending" && styles.statusPending,
                    status.tone === "shipping" && styles.statusShipping,
                    status.tone === "delivered" && styles.statusDelivered,
                    status.tone === "cancelled" && styles.statusCancelled,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      status.tone === "pending" && styles.statusPendingText,
                      status.tone === "shipping" && styles.statusShippingText,
                      status.tone === "delivered" && styles.statusDeliveredText,
                      status.tone === "cancelled" && styles.statusCancelledText,
                    ]}
                  >
                    ● {status.label}
                  </Text>
                </View>
              </View>

              <Text style={styles.orderDate}>
                {new Date(order.created_at).toLocaleDateString("th-TH", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>

              <View style={styles.itemPreviewRow}>
                <View style={styles.thumbRow}>
                  {order.items.slice(0, 2).map((item, idx) =>
                    item.image_url ? (
                      <Image
                        key={idx}
                        source={{ uri: item.image_url }}
                        style={[styles.thumb, idx > 0 && styles.thumbOverlap]}
                      />
                    ) : (
                      <View key={idx} style={[styles.thumb, styles.thumbPlaceholder, idx > 0 && styles.thumbOverlap]} />
                    )
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {firstItem?.product_name || "สินค้า"}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {extraCount > 0
                      ? `และอีก ${extraCount} รายการ · รวม ${order.items.length} รายการ`
                      : `จำนวน ${firstItem?.quantity ?? 1} ชิ้น`}
                  </Text>
                </View>
              </View>

              {status.tone === "delivered" && onClaimItem && order.items.length === 1 && (
                <TouchableOpacity
                  style={styles.claimLink}
                  activeOpacity={0.7}
                  onPress={() => onClaimItem(order, order.items[0])}
                >
                  <Text style={styles.claimLinkText}>เคลมสินค้านี้</Text>
                </TouchableOpacity>
              )}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>ยอดรวมทั้งสิ้น</Text>
                <Text style={styles.totalValue}>
                  ฿{Number(order.total_amount).toLocaleString("th-TH")}
                </Text>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.outlineButton}
                  activeOpacity={0.7}
                  onPress={() => setReceiptOrder(order)}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <Icon name="receipt_long" size={14} color="#3D2619" />
                    <Text style={styles.outlineButtonText}>ดูใบเสร็จ</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filledButton, reorderingId === order.id && styles.filledButtonDisabled]}
                  activeOpacity={0.8}
                  disabled={reorderingId === order.id}
                  onPress={() => handleReorder(order)}
                >
                  {reorderingId === order.id ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <Icon name="refresh" size={14} color="#FFFFFF" weight={700} />
                      <Text style={styles.filledButtonText}>สั่งซื้ออีกครั้ง</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
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

      <Toast
        visible={toastVisible}
        message={toastMessage}
        tone={toastTone}
        onHide={() => setToastVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F0E9DC",
  },

  list: {
    padding: 16,
    flexGrow: 1,
    backgroundColor: "#F0E9DC",
  },

  tabRow: {
    marginBottom: 14,
  },

  tabRowContent: {
    gap: 8,
  },

  tabChip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E8DFD8",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  tabChipActive: {
    backgroundColor: "#3D2619",
    borderColor: "#3D2619",
  },

  tabChipText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#4A3B32",
  },

  tabChipTextActive: {
    color: "#FFFFFF",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8DFD8",
    padding: 14,
    marginBottom: 12,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 2,
  },

  orderId: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#3D2619",
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },

  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
  },

  statusPending: {
    backgroundColor: "#FFF3E0",
  },
  statusPendingText: {
    color: "#D97706",
  },

  statusShipping: {
    backgroundColor: "#E8F0FE",
  },
  statusShippingText: {
    color: "#1A56C4",
  },

  statusDelivered: {
    backgroundColor: "#E7F6EC",
  },
  statusDeliveredText: {
    color: "#2D6A4F",
  },

  statusCancelled: {
    backgroundColor: "#FBEAE9",
  },
  statusCancelledText: {
    color: "#C53030",
  },

  orderDate: {
    fontSize: 11.5,
    color: "#8A7D75",
    marginBottom: 10,
  },

  itemPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  thumbRow: {
    flexDirection: "row",
    marginRight: 10,
  },

  thumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  thumbPlaceholder: {
    backgroundColor: "#F0EDE9",
  },

  thumbOverlap: {
    marginLeft: -14,
  },

  itemName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3D2619",
    marginBottom: 2,
  },

  itemMeta: {
    fontSize: 11.5,
    color: "#8A7D75",
  },

  claimLink: {
    alignSelf: "flex-start",
    marginBottom: 8,
  },

  claimLinkText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#3D2619",
    textDecorationLine: "underline",
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E8DFD8",
  },

  totalLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3D2619",
  },

  totalValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#3D2619",
  },

  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },

  outlineButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#D4C3BA",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },

  outlineButtonText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#4A3B32",
  },

  filledButton: {
    flex: 1,
    backgroundColor: "#3D2619",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },

  filledButtonDisabled: {
    opacity: 0.6,
  },

  filledButtonText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  error: {
    fontSize: 14,
    color: "#C53030",
    textAlign: "center",
  },

  emptyText: {
    fontSize: 14,
    color: "#8A7D75",
  },
});
