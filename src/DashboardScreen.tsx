import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Image,
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { fetchAllClaims, fetchAllOrders, fetchDashboardSummary } from "./api";
import Icon from "./components/Icon";

interface DashboardScreenProps {
  onOpenStock?: () => void;
  onOpenOrders?: () => void;
  onOpenClaims?: () => void;
  onOpenDiscounts?: () => void;
  onOpenChats?: () => void;
  onBackToStore?: () => void;
}

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
  image_url?: string;
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

// แปลงวันที่ (Date object หรือสตริงจาก backend) เป็นคีย์ "YYYY-MM-DD" ตามวันที่ท้องถิ่น
// ใช้จับคู่ข้อมูลยอดขายจริงกับวันที่ในสัปดาห์ ไม่พึ่ง toISOString ที่จะเลื่อนวันตาม timezone
function dateKey(input: string | Date) {
  const date = new Date(input);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// เติมวันที่ขาดหายให้ครบ 7 วันล่าสุด (รวมวันนี้) โดยวันที่ไม่มีออเดอร์จริงจะได้ยอดขาย 0
// backend ส่งมาเฉพาะวันที่มีออเดอร์เท่านั้น (GROUP BY) เลยต้องเติมช่องว่างฝั่งหน้าจอเอง
// ไม่ใช่การสร้างข้อมูลเท็จ แค่แสดงวันที่ไม่มียอดขายจริงเป็น 0 ให้ครบสัปดาห์
function buildLastSevenDays(salesByDay: SalesDay[]): SalesDay[] {
  const byKey = new Map(salesByDay.map((d) => [dateKey(d.day), d]));
  const result: SalesDay[] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = dateKey(date);
    const existing = byKey.get(key);
    result.push(existing || { day: key, revenue: 0, orders: 0 });
  }

  return result;
}

const CHART_HEIGHT = 150;
const CHART_TOP_PAD = 22;
const CURVE_STEPS = 32; // จำนวนช่วงย่อยต่อโค้ง 1 ช่วง ยิ่งเยอะเส้นยิ่งลื่น (ไม่พึ่ง react-native-svg)
const GRADIENT_OPACITIES = [0.24, 0.16, 0.1, 0.05, 0.02]; // ไล่สีพื้นที่ใต้เส้นจากเข้ม (บน) ไปจาง (ล่าง)

// สอด (interpolate) จุดโค้งแบบ Catmull-Rom ระหว่าง p1→p2 โดยอ้างอิงจุดข้างเคียง p0,p3
// เพื่อให้เส้นโค้งมนลื่นไหลผ่านทุกจุดข้อมูลจริง (ไม่ตัดมุมเหมือนเส้นตรงเดิม)
function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

// กราฟเส้นยอดขาย 7 วันล่าสุด วาดด้วย View ล้วน (ไม่พึ่ง react-native-svg)
// เส้นโค้งมนคำนวณจากการสอดจุดแบบ Catmull-Rom แล้วต่อด้วยเส้นตรงสั้นๆ จำนวนมากให้ดูลื่นไหล
function SalesLineChart({ days, maxRevenue }: { days: SalesDay[]; maxRevenue: number }) {
  const [width, setWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  const plotHeight = CHART_HEIGHT - CHART_TOP_PAD;
  const points = days.map((d, i) => {
    const x = days.length > 1 ? (i / (days.length - 1)) * width : width / 2;
    const ratio = maxRevenue > 0 ? d.revenue / maxRevenue : 0;
    const y = CHART_TOP_PAD + (plotHeight - ratio * plotHeight * 0.92);
    return { x, y, day: d };
  });

  // สร้างจุดโค้งละเอียดจากจุดข้อมูลจริง (ใช้ได้ตั้งแต่ 2 จุดขึ้นไป)
  const curvePoints: { x: number; y: number }[] = [];
  if (width > 0 && points.length > 1) {
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      for (let s = 0; s < CURVE_STEPS; s++) {
        const t = s / CURVE_STEPS;
        curvePoints.push({
          x: catmullRom(p0.x, p1.x, p2.x, p3.x, t),
          y: catmullRom(p0.y, p1.y, p2.y, p3.y, t),
        });
      }
    }
    curvePoints.push(points[points.length - 1]);
  }

  return (
    <View onLayout={onLayout} style={{ height: CHART_HEIGHT + 26 }}>
      <View style={{ height: CHART_HEIGHT, width: "100%" }}>
        {/* พื้นที่แรเงาใต้เส้นโค้ง จำลองไล่สีแบบ gradient ด้วยการซ้อนแถบสีจางลงเรื่อยๆ จากเส้นถึงพื้น */}
        {curvePoints.slice(0, -1).map((p, i) => {
          const next = curvePoints[i + 1];
          const colWidth = Math.max(1, next.x - p.x + 1);
          const colTop = Math.min(p.y, next.y);
          const colHeight = Math.max(0, CHART_HEIGHT - colTop);
          const bandCount = GRADIENT_OPACITIES.length;
          const bandHeight = colHeight / bandCount;

          return (
            <View key={`area-${i}`} style={{ position: "absolute", left: p.x, top: colTop, width: colWidth }}>
              {GRADIENT_OPACITIES.map((opacity, bandIndex) => (
                <View
                  key={bandIndex}
                  style={{
                    width: colWidth,
                    height: bandHeight,
                    backgroundColor: "#8A5A34",
                    opacity,
                  }}
                />
              ))}
            </View>
          );
        })}

        {/* เส้นโค้ง: ต่อจุดโค้งละเอียดด้วยเส้นตรงสั้นๆ จำนวนมาก หัวเส้นมนกลม + ยืดเผื่อรอยต่อเล็กน้อย
            เพื่อไม่ให้เห็นรอยหยักตรงข้อต่อระหว่างท่อนเส้น (จำลอง stroke-linecap: round) */}
        {curvePoints.slice(0, -1).map((p, i) => {
          const next = curvePoints[i + 1];
          const dx = next.x - p.x;
          const dy = next.y - p.y;
          const length = Math.sqrt(dx * dx + dy * dy) + 1.4;
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          const midX = (p.x + next.x) / 2;
          const midY = (p.y + next.y) / 2;

          return (
            <View
              key={`line-${i}`}
              style={{
                position: "absolute",
                left: midX - length / 2,
                top: midY - 1.375,
                width: length,
                height: 2.75,
                borderRadius: 1.4,
                backgroundColor: "#8A5A34",
                transform: [{ rotate: `${angle}deg` }],
              }}
            />
          );
        })}

        {width > 0 &&
          points.map((p, i) => {
            const isLast = i === points.length - 1;

            return (
              <View key={`pt-${p.day.day}`}>
                {p.day.revenue > 0 && (
                  <Text
                    style={[
                      styles.chartValue,
                      { position: "absolute", left: p.x - 20, top: p.y - 22, width: 40 },
                    ]}
                  >
                    {p.day.revenue >= 1000
                      ? `${(p.day.revenue / 1000).toFixed(1)}k`
                      : String(p.day.revenue)}
                  </Text>
                )}

                <View
                  style={[
                    styles.chartDot,
                    isLast && styles.chartDotActive,
                    { left: p.x - (isLast ? 7 : 4), top: p.y - (isLast ? 7 : 4) },
                  ]}
                />
              </View>
            );
          })}
      </View>

      <View style={styles.chartLabelRow}>
        {days.map((d) => {
          const date = new Date(d.day);
          return (
            <Text key={d.day} style={styles.chartLabel}>
              {WEEKDAY_TH[date.getDay()]}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const MINI_BAR_HEIGHT = 46;

// กราฟแท่งเล็กแสดงยอดขายรายวัน 7 วัน ใช้ในการ์ดสรุปยอดขายรวม (hero card)
// แท่งของวันนี้ (วันสุดท้าย) จะไฮไลต์เด่นกว่าวันอื่น
function MiniBarChart({ days, maxRevenue }: { days: SalesDay[]; maxRevenue: number }) {
  return (
    <View style={styles.miniBarRow}>
      {days.map((d, i) => {
        const isLast = i === days.length - 1;
        const ratio = maxRevenue > 0 ? d.revenue / maxRevenue : 0;
        const barHeight = Math.max(4, ratio * MINI_BAR_HEIGHT);
        const date = new Date(d.day);

        return (
          <View key={d.day} style={styles.miniBarCol}>
            <View style={styles.miniBarTrack}>
              <View
                style={[
                  styles.miniBar,
                  { height: barHeight },
                  isLast && styles.miniBarActive,
                ]}
              />
            </View>
            <Text style={[styles.miniBarLabel, isLast && styles.miniBarLabelActive]}>
              {WEEKDAY_TH[date.getDay()]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function DashboardScreen({
  onOpenStock,
  onOpenOrders,
  onOpenClaims,
  onOpenDiscounts,
  onOpenChats,
  onBackToStore,
}: DashboardScreenProps) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingOrders, setPendingOrders] = useState(0);
  const [pendingClaims, setPendingClaims] = useState(0);

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

  const loadQuickCounts = async () => {
    try {
      const orders = await fetchAllOrders();
      setPendingOrders(
        Array.isArray(orders)
          ? orders.filter((o: any) => o.status === "pending").length
          : 0
      );
    } catch (err) {
      console.error("Load pending orders error:", err);
    }

    try {
      const claims = await fetchAllClaims();
      setPendingClaims(
        Array.isArray(claims)
          ? claims.filter((c) => c.status === "pending").length
          : 0
      );
    } catch (err) {
      console.error("Load pending claims error:", err);
    }
  };

  useEffect(() => {
    load();
    loadQuickCounts();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3D2619" />
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

  const sevenDays = buildLastSevenDays(summary.sales_by_day);
  const maxRevenue = Math.max(1, ...sevenDays.map((d) => d.revenue));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* การ์ดระบุตัวตนแอดมิน */}
      <View style={styles.identityCard}>
        <View style={styles.identityIconBox}>
          <Icon name="admin_panel_settings" size={20} color="#7F562B" />
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.identityTitleRow}>
            <Text style={styles.identityTitle}>ระบบจัดการหลังร้าน</Text>
            <View style={styles.adminTag}>
              <Text style={styles.adminTagText}>ADMIN</Text>
            </View>
          </View>
          <Text style={styles.identitySubtitle}>PRAKUN Boutique Inventory</Text>
        </View>

        {onBackToStore && (
          <TouchableOpacity
            style={styles.storeViewButton}
            activeOpacity={0.7}
            onPress={onBackToStore}
          >
            <View style={styles.buttonInlineRow}>
              <Icon name="storefront" size={13} color="#3D2619" />
              <Text style={styles.storeViewButtonText}>มุมมองร้านค้า</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* การ์ดยอดขายรวม (hero card) พร้อมกราฟแท่งเล็ก 7 วันล่าสุด */}
      <View style={styles.heroStatCard}>
        <View style={styles.heroStatTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroStatLabel}>ยอดขายรวมทั้งหมด</Text>
            <Text style={styles.heroStatValue}>{money(summary.total_revenue)}</Text>
            <Text style={styles.heroStatSub}>{summary.total_orders} ออเดอร์ทั้งหมด</Text>
          </View>

          <View style={styles.heroStatIconCircle}>
            <Icon name="payments" size={18} color="#F0DCC9" />
          </View>
        </View>

        <MiniBarChart days={sevenDays} maxRevenue={maxRevenue} />
      </View>

      {/* การ์ดสรุปตัวเลขรอง */}
      <View style={styles.statGrid}>
        <View style={styles.statCard}>
          <View style={styles.statCardTopRow}>
            <Text style={styles.statLabel}>ยอดขายวันนี้</Text>
            <View style={styles.statIconCircle}>
              <Icon name="calendar_month" size={15} color="#7F562B" />
            </View>
          </View>
          <Text style={styles.statValue}>{money(summary.today_revenue)}</Text>
          <Text style={styles.statSub}>{summary.today_orders} ออเดอร์วันนี้</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statCardTopRow}>
            <Text style={styles.statLabel}>ออเดอร์รอจัดส่ง</Text>
            <View style={styles.statIconCircle}>
              <Icon name="local_shipping" size={15} color="#7F562B" />
            </View>
          </View>
          <Text style={styles.statValue}>{pendingOrders} รายการ</Text>
          {pendingOrders > 0 ? (
            <View style={styles.statBadgeWarning}>
              <Text style={styles.statBadgeWarningText}>● รอแพ็กของ</Text>
            </View>
          ) : (
            <Text style={styles.statSub}>ไม่มีออเดอร์ค้าง</Text>
          )}
        </View>

        <View
          style={[
            styles.statCard,
            summary.low_stock.length > 0 && styles.statCardWarning,
          ]}
        >
          <View style={styles.statCardTopRow}>
            <Text style={styles.statLabel}>สินค้าในคลัง</Text>
            <View style={styles.statIconCircle}>
              <Icon name="inventory_2" size={15} color="#7F562B" />
            </View>
          </View>
          <Text style={styles.statValue}>{summary.product_count} รายการ</Text>
          <Text
            style={[
              styles.statSub,
              summary.low_stock.length > 0 && styles.statSubWarning,
            ]}
          >
            {summary.low_stock.length > 0
              ? `ใกล้หมด ${summary.low_stock.length} รายการ`
              : "สต๊อกเพียงพอ"}
          </Text>
        </View>
      </View>

      {/* เมนูลัดสำหรับผู้ดูแล */}
      <View style={styles.quickHeaderRow}>
        <Text style={styles.quickTitle}>เมนูลัดสำหรับผู้ดูแล</Text>
        <Text style={styles.quickCount}>5 การจัดการ</Text>
      </View>

      <View style={styles.quickGrid}>
        <TouchableOpacity
          style={styles.quickCard}
          activeOpacity={0.8}
          onPress={onOpenStock}
        >
          <View style={[styles.quickIconBox, { backgroundColor: "#DFF3F1" }]}>
            <Icon name="inventory_2" size={19} color="#0F766E" />
          </View>
          <Text style={styles.quickCardTitle}>สต็อกสินค้า</Text>
          <Text style={styles.quickCardSub}>ปรับเพิ่ม-ลดจำนวน</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickCard}
          activeOpacity={0.8}
          onPress={onOpenOrders}
        >
          <View style={[styles.quickIconBox, { backgroundColor: "#E4ECFB" }]}>
            <Icon name="receipt_long" size={19} color="#1A56C4" />
          </View>
          <Text style={styles.quickCardTitle}>ออเดอร์ใหม่</Text>
          <Text style={styles.quickCardSub}>
            {pendingOrders > 0 ? `${pendingOrders} รายการรอตรวจ` : "ไม่มีรายการค้าง"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickCard}
          activeOpacity={0.8}
          onPress={onOpenClaims}
        >
          <View style={[styles.quickIconBox, { backgroundColor: "#FBE2E1" }]}>
            <Icon name="build" size={19} color="#C0392B" />
          </View>
          <View style={styles.quickCardTitleRow}>
            <Text style={styles.quickCardTitle}>อนุมัติการเคลม</Text>
            {pendingClaims > 0 && <View style={styles.quickDot} />}
          </View>
          <Text style={styles.quickCardSub}>
            {pendingClaims > 0 ? `รอตรวจ ${pendingClaims} เคส` : "ไม่มีเคสค้าง"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickCard}
          activeOpacity={0.8}
          onPress={onOpenDiscounts}
        >
          <View style={[styles.quickIconBox, { backgroundColor: "#FEF3C7" }]}>
            <Icon name="sell" size={19} color="#D97706" />
          </View>
          <Text style={styles.quickCardTitle}>โค้ดส่วนลด</Text>
          <Text style={styles.quickCardSub}>ดูคูปองร้านค้า</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickCard}
          activeOpacity={0.8}
          onPress={onOpenChats}
        >
          <View style={[styles.quickIconBox, { backgroundColor: "#EDE4FB" }]}>
            <Icon name="forum" size={19} color="#6D28D9" />
          </View>
          <Text style={styles.quickCardTitle}>ข้อความจากลูกค้า</Text>
          <Text style={styles.quickCardSub}>คุยโต้ตอบกับลูกค้า</Text>
        </TouchableOpacity>
      </View>

      {/* กราฟยอดขาย 7 วันล่าสุด */}
      <View style={styles.card}>
        <View style={styles.chartHeaderRow}>
          <View>
            <Text style={styles.cardTitle}>ยอดขาย 7 วันล่าสุด</Text>
            <Text style={styles.chartAvgText}>
              เฉลี่ย{" "}
              {money(
                Math.round(sevenDays.reduce((sum, d) => sum + d.revenue, 0) / sevenDays.length)
              )}{" "}
              / วัน
            </Text>
          </View>

          <View style={styles.chartPill}>
            <Text style={styles.chartPillText}>สัปดาห์นี้</Text>
          </View>
        </View>

        {summary.total_orders === 0 ? (
          <Text style={styles.emptyText}>ยังไม่มีคำสั่งซื้อในช่วงนี้</Text>
        ) : (
          <SalesLineChart days={sevenDays} maxRevenue={maxRevenue} />
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
        <View style={styles.lowStockHeaderRow}>
          <View style={styles.buttonInlineRow}>
            <Icon name="warning" size={15} color="#D97706" />
            <Text style={styles.cardTitle}>สินค้าใกล้หมดสต๊อก</Text>
          </View>

          {summary.low_stock.length > 0 && onOpenStock && (
            <TouchableOpacity onPress={onOpenStock}>
              <Text style={styles.lowStockHeaderLink}>เติมสต๊อกทั้งหมด</Text>
            </TouchableOpacity>
          )}
        </View>

        {summary.low_stock.length === 0 ? (
          <Text style={styles.emptyText}>สต๊อกทุกรายการยังเพียงพอ</Text>
        ) : (
          summary.low_stock.map((item) => {
            const outOfStock = item.stock < 1;
            const productCode = `PRK-${String(item.id).padStart(3, "0")}`;

            return (
              <View key={item.id} style={styles.lowStockRow}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.lowStockImage} />
                ) : (
                  <View style={[styles.lowStockImage, styles.lowStockImagePlaceholder]}>
                    <Icon name="inventory_2" size={16} color="#8A7D75" />
                  </View>
                )}

                <View style={styles.listInfo}>
                  <Text style={styles.listName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.listSub}>รหัสสินค้า: {productCode}</Text>
                </View>

                <View style={{ alignItems: "flex-end", gap: 5 }}>
                  <View
                    style={[
                      styles.lowStockPill,
                      outOfStock && styles.lowStockPillDanger,
                    ]}
                  >
                    <Text
                      style={[
                        styles.lowStockPillText,
                        outOfStock && styles.lowStockPillTextDanger,
                      ]}
                    >
                      {outOfStock ? "สินค้าหมด" : `เหลือน้อย (${item.stock} ชิ้น)`}
                    </Text>
                  </View>

                  {onOpenStock && (
                    <TouchableOpacity
                      onPress={onOpenStock}
                      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    >
                      <Text
                        style={[
                          styles.restockLink,
                          outOfStock && styles.restockLinkDanger,
                        ]}
                      >
                        {outOfStock ? "! สั่งด่วน" : "⊕ เติมของ"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0E9DC",
  },

  buttonInlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
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
    backgroundColor: "#F0E9DC",
  },

  errorText: {
    fontSize: 14,
    color: "#C53030",
    marginBottom: 14,
    textAlign: "center",
  },

  retryButton: {
    backgroundColor: "#3D2619",
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 10,
  },

  retryText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },

  identityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F0EDE9",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },

  identityIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#3D2619",
    alignItems: "center",
    justifyContent: "center",
  },

  identityIconText: {
    fontSize: 19,
  },

  identityTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  identityTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#3D2619",
  },

  adminTag: {
    backgroundColor: "#3D2619",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },

  adminTagText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },

  identitySubtitle: {
    fontSize: 11.5,
    color: "#8A7D75",
    marginTop: 2,
  },

  storeViewButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#E8DFD8",
  },

  storeViewButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#3D2619",
  },

  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },

  statCard: {
    flexGrow: 1,
    flexBasis: 160,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8DFD8",
    padding: 14,
  },

  statCardWarning: {
    borderColor: "#F0C4C2",
    backgroundColor: "#FFF7F6",
  },

  statCardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  statIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F0EDE9",
    alignItems: "center",
    justifyContent: "center",
  },

  statIconText: {
    fontSize: 14,
  },

  statLabel: {
    fontSize: 12,
    color: "#8A7D75",
    flex: 1,
    paddingRight: 8,
  },

  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#3D2619",
    marginBottom: 4,
  },

  statValueWarning: {
    color: "#C53030",
  },

  statSub: {
    fontSize: 11,
    color: "#8A7D75",
  },

  statSubWarning: {
    color: "#C53030",
    fontWeight: "700",
  },

  statBadgeWarning: {
    alignSelf: "flex-start",
    backgroundColor: "#FEF3C7",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },

  statBadgeWarningText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#B45309",
  },

  heroStatCard: {
    backgroundColor: "#3D2619",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },

  heroStatTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  heroStatLabel: {
    fontSize: 12.5,
    color: "rgba(255,255,255,0.65)",
    marginBottom: 6,
  },

  heroStatValue: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 5,
  },

  heroStatSub: {
    fontSize: 11.5,
    color: "rgba(255,255,255,0.6)",
  },

  heroStatIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  miniBarRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    paddingTop: 14,
  },

  miniBarCol: {
    alignItems: "center",
    flex: 1,
  },

  miniBarTrack: {
    height: MINI_BAR_HEIGHT,
    justifyContent: "flex-end",
    marginBottom: 8,
  },

  miniBar: {
    width: 8,
    borderRadius: 4,
    backgroundColor: "rgba(240,220,201,0.35)",
  },

  miniBarActive: {
    backgroundColor: "#F0DCC9",
  },

  miniBarLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.45)",
  },

  miniBarLabelActive: {
    color: "#F0DCC9",
    fontWeight: "700",
  },

  quickHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  quickTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#3D2619",
  },

  quickCount: {
    fontSize: 11.5,
    color: "#8A7D75",
  },

  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },

  quickCard: {
    flexGrow: 1,
    flexBasis: 160,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8DFD8",
    padding: 14,
  },

  quickIconBox: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  quickIconText: {
    fontSize: 18,
  },

  quickCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  quickCardTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#3D2619",
    marginBottom: 3,
  },

  quickDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#C53030",
    marginBottom: 3,
  },

  quickCardSub: {
    fontSize: 11,
    color: "#8A7D75",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8DFD8",
    padding: 16,
    marginBottom: 14,
  },

  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#3D2619",
    marginBottom: 14,
  },

  chartHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  chartAvgText: {
    fontSize: 11.5,
    color: "#8A7D75",
    marginTop: -10,
  },

  chartPill: {
    backgroundColor: "#F0EDE9",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  chartPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#3D2619",
  },

  lowStockHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  lowStockHeaderLink: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#8A5A34",
  },

  lowStockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EDE9",
  },

  lowStockImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#F0EDE9",
  },

  lowStockImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },

  lowStockImagePlaceholderText: {
    fontSize: 18,
  },

  lowStockPill: {
    backgroundColor: "#FEF3C7",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },

  lowStockPillDanger: {
    backgroundColor: "#FBE2E1",
  },

  lowStockPillText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#B45309",
  },

  lowStockPillTextDanger: {
    color: "#C53030",
  },

  restockLink: {
    fontSize: 11,
    fontWeight: "700",
    color: "#3D2619",
  },

  restockLinkDanger: {
    color: "#C53030",
  },

  emptyText: {
    fontSize: 13,
    color: "#8A7D75",
  },

  chartValue: {
    fontSize: 10,
    color: "#8A7D75",
    textAlign: "center",
  },

  chartDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3D2619",
  },

  chartDotActive: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#3D2619",
    borderWidth: 3,
    borderColor: "#F0DCC9",
  },

  chartLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },

  chartLabel: {
    fontSize: 11,
    color: "#8A7D75",
    flex: 1,
    textAlign: "center",
  },

  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EDE9",
  },

  listRank: {
    width: 28,
    fontSize: 13,
    fontWeight: "700",
    color: "#8A7D75",
  },

  lowStockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#C53030",
    marginRight: 12,
  },

  listInfo: {
    flex: 1,
    paddingRight: 8,
  },

  listName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3D2619",
  },

  listSub: {
    fontSize: 11,
    color: "#8A7D75",
    marginTop: 2,
  },

  listValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#3D2619",
  },

  lowStockValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#C53030",
  },
});
