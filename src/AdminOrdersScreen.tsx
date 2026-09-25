import { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { fetchAllOrders, updateOrderStatus } from "./api";
import Icon from "./components/Icon";
import Toast from "./components/Toast";

interface OrderItem {
  product_id: number;
  product_name: string;
  price: number;
  quantity: number;
  image_url?: string | null;
}

type OrderStatus = "pending" | "shipping" | "delivered" | "cancelled";

interface Order {
  id: number;
  user_id: number;
  username: string | null;
  total_amount: number;
  status: OrderStatus;
  payment_method?: string | null;
  discount_code?: string | null;
  discount_amount?: number | null;
  created_at: string;
  items: OrderItem[];
}

const STATUS_OPTIONS: { value: OrderStatus; label: string; dot: string }[] = [
  { value: "pending", label: "เตรียมสินค้า", dot: "#D97706" },
  { value: "shipping", label: "กำลังจัดส่ง", dot: "#1A56C4" },
  { value: "delivered", label: "สำเร็จ", dot: "#2D6A4F" },
  { value: "cancelled", label: "ยกเลิก", dot: "#C53030" },
];

const FILTER_OPTIONS: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  ...STATUS_OPTIONS,
];

const PAYMENT_LABELS: Record<string, string> = {
  cod: "เก็บเงินปลายทาง",
  promptpay: "พร้อมเพย์",
  bank_transfer: "โอนเงินผ่านธนาคาร",
  card: "บัตรเครดิต/เดบิต",
};

function money(n: number) {
  return `฿${Number(n).toLocaleString("th-TH")}`;
}

function orderCode(id: number) {
  return `#PK-${String(id).padStart(6, "0")}`;
}

interface Props {
  // ค่าเริ่มต้นของช่องค้นหา ใช้ตอนกดลิงก์ "ดูคำสั่งซื้อ" มาจากหน้าเคลม เพื่อกรองไปที่ออเดอร์นั้นทันที
  initialSearch?: string;
}

// หน้าจัดการออเดอร์สำหรับ admin: ดูออเดอร์ทั้งร้าน + เปลี่ยนสถานะจัดส่งได้จริง
// (บันทึกลงคอลัมน์ status ใน DB ผ่าน PUT /api/orders/:id/status)
export default function AdminOrdersScreen({ initialSearch }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState(initialSearch || "");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastTone, setToastTone] = useState<"info" | "warning">("info");

  const load = async () => {
    try {
      setError("");
      const data = await fetchAllOrders();
      setOrders(data);
      setLastRefreshed(new Date());
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

      notify(`อัปเดตออเดอร์ ${orderCode(order.id)} เป็น "${label}" แล้ว`);
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

  const searchedOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;

    return orders.filter((order) => {
      if (String(order.id).includes(q)) return true;
      if (order.username?.toLowerCase().includes(q)) return true;
      return order.items.some((item) =>
        item.product_name.toLowerCase().includes(q)
      );
    });
  }, [orders, search]);

  const filteredOrders = useMemo(() => {
    if (filter === "all") return searchedOrders;
    return searchedOrders.filter((order) => order.status === filter);
  }, [searchedOrders, filter]);

  const countByStatus = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    for (const status of STATUS_OPTIONS) {
      counts[status.value] = orders.filter(
        (o) => o.status === status.value
      ).length;
    }
    return counts;
  }, [orders]);

  const pendingOrders = useMemo(
    () => orders.filter((o) => o.status === "pending"),
    [orders]
  );

  const pendingRevenue = useMemo(
    () => pendingOrders.reduce((sum, o) => sum + Number(o.total_amount), 0),
    [pendingOrders]
  );

  const todayCount = useMemo(() => {
    const today = new Date().toDateString();
    return orders.filter((o) => new Date(o.created_at).toDateString() === today)
      .length;
  }, [orders]);

  const handleExportCsv = () => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      notify("ส่งออกรายงานได้เฉพาะบนเว็บเบราว์เซอร์");
      return;
    }

    const rows = [
      ["รหัสออเดอร์", "ลูกค้า", "ยอดรวม", "สถานะ", "วันที่"],
      ...filteredOrders.map((o) => [
        orderCode(o.id),
        o.username || "-",
        String(o.total_amount),
        STATUS_OPTIONS.find((s) => s.value === o.status)?.label || o.status,
        new Date(o.created_at).toLocaleString("th-TH"),
      ]),
    ];

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `prakun-orders-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    notify(`ส่งออกรายงาน ${filteredOrders.length} รายการแล้ว`);
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
          <View>
            <View style={styles.pageHeaderRow}>
              <View>
                <Text style={styles.pageTitle}>จัดการออเดอร์</Text>
                <Text style={styles.pageSubtitle}>Orders Management & Fulfillment</Text>
              </View>

              <TouchableOpacity
                style={styles.exportButton}
                activeOpacity={0.75}
                onPress={handleExportCsv}
              >
                <View style={styles.buttonInlineRow}>
                  <Icon name="download" size={14} color="#3D2619" />
                  <Text style={styles.exportButtonText}>ส่งออกรายงาน</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statCard}>
                <View style={[styles.statIconCircle, { backgroundColor: "#FEF3C7" }]}>
                  <Icon name="pending" size={16} color="#D97706" />
                </View>
                <Text style={styles.statValue}>{money(pendingRevenue)}</Text>
                <Text style={styles.statLabel}>
                  ยอดขายรอจัดส่ง · รอแพ็ก {pendingOrders.length} คำสั่งซื้อ
                </Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconCircle, { backgroundColor: "#DFF3F1" }]}>
                  <Icon name="shopping_cart" size={16} color="#0F766E" />
                </View>
                <Text style={styles.statValue}>{todayCount} รายการ</Text>
                <Text style={styles.statLabel}>ออเดอร์ใหม่วันนี้</Text>
              </View>
            </View>

            <View style={styles.searchRow}>
              <Icon name="search" size={16} color="#8A7D75" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="ค้นหาเลขคำสั่งซื้อ ชื่อลูกค้า หรือสินค้า..."
                placeholderTextColor="#A79A90"
                value={search}
                onChangeText={setSearch}
              />
            </View>

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
                  {option.value !== "all" && (
                    <View
                      style={[
                        styles.filterDot,
                        {
                          backgroundColor: STATUS_OPTIONS.find(
                            (s) => s.value === option.value
                          )?.dot,
                        },
                      ]}
                    />
                  )}
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
          </View>
        }
        renderItem={({ item: order }) => {
          const statusMeta = STATUS_OPTIONS.find((s) => s.value === order.status);

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <View style={styles.orderIdRow}>
                    <Text style={styles.orderId}>{orderCode(order.id)}</Text>
                    <View style={styles.statusPill}>
                      <View style={[styles.statusDot, { backgroundColor: statusMeta?.dot }]} />
                      <Text style={styles.statusPillText}>{statusMeta?.label}</Text>
                    </View>
                  </View>
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

                <Text style={styles.totalValue}>{money(order.total_amount)}</Text>
              </View>

              {order.items.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.itemImage} />
                  ) : (
                    <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                      <Icon name="inventory_2" size={15} color="#8A7D75" />
                    </View>
                  )}
                  <Text style={styles.itemLine} numberOfLines={1}>
                    {item.product_name}
                  </Text>
                  <Text style={styles.itemQty}>× {item.quantity}</Text>
                </View>
              ))}

              <View style={styles.metaRow}>
                <View style={styles.metaTextRow}>
                  <Icon name="credit_card" size={13} color="#8A7D75" />
                  <Text style={styles.metaText}>
                    {PAYMENT_LABELS[order.payment_method || ""] || "ไม่ระบุช่องทาง"}
                  </Text>
                </View>
                {order.discount_code && (
                  <View style={styles.metaTextRow}>
                    <Icon name="sell" size={13} color="#8A7D75" />
                    <Text style={styles.metaText}>
                      {order.discount_code} (-{money(Number(order.discount_amount) || 0)})
                    </Text>
                  </View>
                )}
              </View>

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
          );
        }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>ไม่มีออเดอร์ในหมวดนี้</Text>
          </View>
        }
        ListFooterComponent={
          lastRefreshed ? (
            <View style={styles.footerRow}>
              <View style={styles.footerLive} />
              <Text style={styles.footerText}>
                อัปเดตล่าสุดเมื่อ{" "}
                {lastRefreshed.toLocaleTimeString("th-TH", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              <TouchableOpacity
                style={styles.buttonInlineRow}
                onPress={load}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Icon name="refresh" size={13} color="#3D2619" />
                <Text style={styles.footerRefresh}>รีเฟรช</Text>
              </TouchableOpacity>
            </View>
          ) : null
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
    backgroundColor: "#F0E9DC",
  },

  list: {
    padding: 16,
    flexGrow: 1,
    backgroundColor: "#F0E9DC",
  },

  pageHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  pageTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#3D2619",
  },

  pageSubtitle: {
    fontSize: 12,
    color: "#8A7D75",
    marginTop: 2,
  },

  exportButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E8DFD8",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  exportButtonText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#3D2619",
  },

  statRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8DFD8",
    padding: 12,
  },

  statIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  statIconText: {
    fontSize: 14,
  },

  statValue: {
    fontSize: 17,
    fontWeight: "800",
    color: "#3D2619",
    marginBottom: 3,
  },

  statLabel: {
    fontSize: 10.5,
    color: "#8A7D75",
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8DFD8",
    paddingHorizontal: 14,
    marginBottom: 12,
  },

  searchIcon: {
    fontSize: 14,
  },

  searchInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 13,
    color: "#2B2118",
  },

  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },

  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D4C3BA",
    backgroundColor: "#FFFFFF",
  },

  filterChipActive: {
    backgroundColor: "#3D2619",
    borderColor: "#3D2619",
  },

  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4A3B32",
  },

  filterChipTextActive: {
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
    marginBottom: 10,
  },

  orderIdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 3,
  },

  orderId: {
    fontSize: 14,
    fontWeight: "800",
    color: "#3D2619",
  },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F0EDE9",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  statusPillText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#3D2619",
  },

  orderMeta: {
    fontSize: 12,
    color: "#8A7D75",
  },

  totalValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#3D2619",
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },

  itemImage: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#F0EDE9",
  },

  itemImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },

  itemLine: {
    flex: 1,
    fontSize: 12,
    color: "#50453E",
  },

  itemQty: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8A7D75",
  },

  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0EDE9",
  },

  metaText: {
    fontSize: 11.5,
    color: "#8A7D75",
    fontWeight: "600",
  },

  metaTextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  buttonInlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0EDE9",
  },

  statusChip: {
    minWidth: 84,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D4C3BA",
  },

  statusChipActive: {
    backgroundColor: "#3D2619",
    borderColor: "#3D2619",
  },

  statusChipCancelled: {
    backgroundColor: "#C53030",
    borderColor: "#C53030",
  },

  statusChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4A3B32",
  },

  statusChipTextActive: {
    color: "#FFFFFF",
  },

  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },

  footerLive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2D6A4F",
  },

  footerText: {
    fontSize: 11.5,
    color: "#8A7D75",
  },

  footerRefresh: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#3D2619",
  },

  error: {
    fontSize: 14,
    color: "#C53030",
    textAlign: "center",
    marginBottom: 12,
  },

  retryButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#3D2619",
  },

  retryText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },

  emptyText: {
    fontSize: 14,
    color: "#8A7D75",
  },
});
