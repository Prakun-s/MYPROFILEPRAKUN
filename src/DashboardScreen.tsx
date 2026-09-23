import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { fetchDashboardSummary } from "./api";

interface SalesDay {
  day: string;
  revenue: number;
  orders: number;
}

interface LowStockItem {
  id: number;
  name: string;
  stock: number;
  category: string;
  badge_status: string;
}

interface TopProduct {
  product_id: number;
  product_name: string;
  units_sold: number;
  revenue: number;
}

interface Summary {
  total_revenue: number;
  total_orders: number;
  today_revenue: number;
  today_orders: number;
  product_count: number;
  stock_value: number;
  sales_by_day: SalesDay[];
  low_stock: LowStockItem[];
  top_products: TopProduct[];
}

const WEEKDAY_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function money(n: number) {
  return `฿${Number(n).toLocaleString("th-TH")}`;
}

export default function DashboardScreen() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");
      const data = await fetchDashboardSummary();
      setSummary(data);
    } catch (err: any) {
      console.error("Load dashboard error:", err);
      setError(err.message || "ไม่สามารถโหลดข้อมูลแดชบอร์ดได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111111" />
      </View>
    );
  }

  if (error || !summary) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || "ไม่มีข้อมูล"}</Text>

        <TouchableOpacity style={styles.retryButton} onPress={load}>
          <Text style={styles.retryText}>ลองใหม่</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const maxRevenue = Math.max(1, ...summary.sales_by_day.map((d) => d.revenue));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* การ์ดสรุปตัวเลขหลัก */}
      <View style={styles.statGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>ยอดขายรวมทั้งหมด</Text>
          <Text style={styles.statValue}>{money(summary.total_revenue)}</Text>
          <Text style={styles.statSub}>{summary.total_orders} ออเดอร์</Text>
          <Text style={styles.statVat}>
            ก่อน VAT {money(summary.total_revenue / 1.07)} · VAT{" "}
            {money(summary.total_revenue - summary.total_revenue / 1.07)}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>ยอดขายวันนี้</Text>
          <Text style={styles.statValue}>{money(summary.today_revenue)}</Text>
          <Text style={styles.statSub}>{summary.today_orders} ออเดอร์</Text>
          <Text style={styles.statVat}>
            ก่อน VAT {money(summary.today_revenue / 1.07)} · VAT{" "}
            {money(summary.today_revenue - summary.today_revenue / 1.07)}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>มูลค่าสต๊อกคงเหลือ</Text>
          <Text style={styles.statValue}>{money(summary.stock_value)}</Text>
          <Text style={styles.statSub}>{summary.product_count} รายการสินค้า</Text>
        </View>

        <View
          style={[
            styles.statCard,
            summary.low_stock.length > 0 && styles.statCardWarning,
          ]}
        >
          <Text style={styles.statLabel}>สินค้าใกล้หมด (ต่ำกว่า 5 ชิ้น)</Text>
          <Text
            style={[
              styles.statValue,
              summary.low_stock.length > 0 && styles.statValueWarning,
            ]}
          >
            {summary.low_stock.length} รายการ
          </Text>
          <Text style={styles.statSub}>ควรเติมสต๊อกเร็วๆ นี้</Text>
        </View>
      </View>

      {/* กราฟยอดขาย 7 วันล่าสุด */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>ยอดขาย 7 วันล่าสุด</Text>

        {summary.sales_by_day.length === 0 ? (
          <Text style={styles.emptyText}>ยังไม่มีคำสั่งซื้อในช่วงนี้</Text>
        ) : (
          <View style={styles.chart}>
            {summary.sales_by_day.map((d) => {
              const date = new Date(d.day);
              const heightRatio = d.revenue / maxRevenue;

              return (
                <View key={d.day} style={styles.chartColumn}>
                  <Text style={styles.chartValue}>
                    {d.revenue > 0
                      ? d.revenue >= 1000
                        ? `${(d.revenue / 1000).toFixed(1)}k`
                        : String(d.revenue)
                      : ""}
                  </Text>

                  <View style={styles.chartBarTrack}>
                    <View
                      style={[
                        styles.chartBar,
                        { height: `${Math.max(4, heightRatio * 100)}%` },
                      ]}
                    />
                  </View>

                  <Text style={styles.chartLabel}>
                    {WEEKDAY_TH[date.getDay()]}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* สินค้าขายดี */}
      {summary.top_products.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>สินค้าขายดี</Text>

          {summary.top_products.map((p, index) => (
            <View key={`${p.product_id}-${index}`} style={styles.listRow}>
              <Text style={styles.listRank}>#{index + 1}</Text>

              <View style={styles.listInfo}>
                <Text style={styles.listName} numberOfLines={1}>
                  {p.product_name}
                </Text>
                <Text style={styles.listSub}>ขายแล้ว {p.units_sold} ชิ้น</Text>
              </View>

              <Text style={styles.listValue}>{money(p.revenue)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* สินค้าใกล้หมดสต๊อก */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>สินค้าใกล้หมดสต๊อก</Text>

        {summary.low_stock.length === 0 ? (
          <Text style={styles.emptyText}>สต๊อกทุกรายการยังเพียงพอ</Text>
        ) : (
          summary.low_stock.map((item) => (
            <View key={item.id} style={styles.listRow}>
              <View style={styles.lowStockDot} />

              <View style={styles.listInfo}>
                <Text style={styles.listName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.listSub}>{item.category}</Text>
              </View>

              <Text style={styles.lowStockValue}>เหลือ {item.stock} ชิ้น</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },

  content: {
    padding: 16,
    paddingBottom: 60,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#FAFAFA",
  },

  errorText: {
    fontSize: 14,
    color: "#B3413E",
    marginBottom: 14,
    textAlign: "center",
  },

  retryButton: {
    backgroundColor: "#111111",
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 10,
  },

  retryText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },

  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },

  statCard: {
    flexGrow: 1,
    flexBasis: 160,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EDEDED",
    padding: 14,
  },

  statCardWarning: {
    borderColor: "#F0C4C2",
    backgroundColor: "#FFF7F6",
  },

  statLabel: {
    fontSize: 12,
    color: "#8A8A8A",
    marginBottom: 8,
  },

  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111111",
    marginBottom: 4,
  },

  statValueWarning: {
    color: "#B3413E",
  },

  statSub: {
    fontSize: 11,
    color: "#9A9A9A",
  },

  statVat: {
    fontSize: 10.5,
    color: "#B0B0B0",
    marginTop: 2,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EDEDED",
    padding: 16,
    marginBottom: 14,
  },

  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 14,
  },

  emptyText: {
    fontSize: 13,
    color: "#8A8A8A",
  },

  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 160,
    gap: 10,
  },

  chartColumn: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
  },

  chartValue: {
    fontSize: 10,
    color: "#8A8A8A",
    marginBottom: 4,
  },

  chartBarTrack: {
    width: "70%",
    flex: 1,
    justifyContent: "flex-end",
  },

  chartBar: {
    width: "100%",
    backgroundColor: "#111111",
    borderRadius: 6,
    minHeight: 4,
  },

  chartLabel: {
    fontSize: 11,
    color: "#8A8A8A",
    marginTop: 6,
  },

  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F1",
  },

  listRank: {
    width: 28,
    fontSize: 13,
    fontWeight: "700",
    color: "#9A9A9A",
  },

  lowStockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#B3413E",
    marginRight: 12,
  },

  listInfo: {
    flex: 1,
    paddingRight: 8,
  },

  listName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111111",
  },

  listSub: {
    fontSize: 11,
    color: "#9A9A9A",
    marginTop: 2,
  },

  listValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111111",
  },

  lowStockValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B3413E",
  },
});
