import { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { CoinTransaction, fetchMyCoins } from "./api";
import Icon from "./components/Icon";

interface CoinsScreenProps {
  onOpenShop?: () => void;
}

// ระดับสมาชิกตามจำนวนครั้งที่ได้รับเหรียญ (ใกล้เคียงจำนวนคำสั่งซื้อสำเร็จ)
function getCoinTier(txCount: number) {
  if (txCount >= 15) {
    return { label: "GOLD MEMBER", bg: "#FBE7C6", color: "#8A5A17" };
  }
  if (txCount >= 5) {
    return { label: "SILVER MEMBER", bg: "#E7E7EA", color: "#54565C" };
  }
  if (txCount >= 1) {
    return { label: "BRONZE MEMBER", bg: "#F0DCC9", color: "#8A5A34" };
  }
  return { label: "สมาชิกใหม่", bg: "#EFE8E0", color: "#8A7D75" };
}

// หน้าแสดงเหรียญสะสมของผู้ใช้: ยอดคงเหลือ + ประวัติการได้เหรียญแต่ละออเดอร์
// (จำนวนเหรียญคำนวณโดย AI ฝั่ง backend ตอนเช็คเอาท์ ดู Backend/src/coinCalculator.js)
export default function CoinsScreen({ onOpenShop }: CoinsScreenProps) {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);

  const load = async () => {
    try {
      setError("");
      const data = await fetchMyCoins();
      setBalance(data.coin_balance);
      setTransactions(data.transactions);
    } catch (err: any) {
      console.error("Load coins error:", err);
      setError(err.message || "ไม่สามารถโหลดข้อมูลเหรียญสะสมได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const tier = useMemo(() => getCoinTier(transactions.length), [transactions.length]);
  const visibleTransactions = showAll ? transactions : transactions.slice(0, 5);

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
    <FlatList
      data={visibleTransactions}
      keyExtractor={(t) => String(t.id)}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View>
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={[styles.tierBadge, { backgroundColor: tier.bg }]}>
                <View style={[styles.tierDot, { backgroundColor: tier.color }]} />
                <Text style={[styles.tierText, { color: tier.color }]}>{tier.label}</Text>
              </View>

              {onOpenShop && (
                <TouchableOpacity
                  style={styles.shopLinkButton}
                  activeOpacity={0.7}
                  onPress={onOpenShop}
                >
                  <View style={styles.buttonInlineRow}>
                    <Icon name="redeem" size={13} color="#7F562B" />
                    <Text style={styles.shopLinkText}>ร้านแลกของรางวัล</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.balanceLabel}>เหรียญสะสมคงเหลือของคุณ</Text>

            <View style={styles.balanceRow}>
              <Icon name="monetization_on" size={22} color="#D97706" />
              <Text style={styles.balanceValue}>
                {balance.toLocaleString("th-TH")}
              </Text>
              <Text style={styles.balanceUnit}>เหรียญ</Text>
            </View>

            <View style={styles.balanceInfoBar}>
              <Icon name="sell" size={13} color="#7F562B" />
              <Text style={styles.balanceInfoText}>
                ใช้แลกโค้ดส่วนลดได้ที่ร้านแลกของรางวัล
              </Text>
            </View>

            <Text style={styles.balanceHint}>
              ได้รับเหรียญสะสมทุกครั้งที่สั่งซื้อสำเร็จ คำนวณอัตโนมัติจากยอดสั่งซื้อ
            </Text>
          </View>

          <View style={styles.historyHeaderRow}>
            <View style={styles.buttonInlineRow}>
              <Icon name="history" size={15} color="#3D2619" />
              <Text style={styles.historyTitle}>ประวัติการได้รับเหรียญล่าสุด</Text>
            </View>

            {transactions.length > 5 && (
              <TouchableOpacity onPress={() => setShowAll((v) => !v)}>
                <Text style={styles.historyToggle}>
                  {showAll ? "ย่อ" : "ดูทั้งหมด"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      }
      renderItem={({ item: t }) => (
        <View style={styles.txCard}>
          <View style={styles.txIconBadge}>
            <Icon name="shopping_bag" size={15} color="#7F562B" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.txOrderId}>คำสั่งซื้อ #{t.order_id}</Text>

            <Text style={styles.txTotal}>
              ยอดสั่งซื้อ ฿{Number(t.order_total).toLocaleString("th-TH")}
            </Text>

            {t.reasoning ? (
              <Text style={styles.txReason} numberOfLines={2}>
                {t.reasoning}
              </Text>
            ) : null}

            <Text style={styles.txDate}>
              {new Date(t.created_at).toLocaleDateString("th-TH", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>

          <View style={styles.buttonInlineRow}>
            <Text style={styles.txCoins}>+{t.coins}</Text>
            <Icon name="monetization_on" size={13} color="#2D6A4F" />
          </View>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>ยังไม่มีประวัติการได้เหรียญสะสม</Text>
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
    backgroundColor: "#F0E9DC",
  },

  buttonInlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  list: {
    padding: 16,
    flexGrow: 1,
    backgroundColor: "#F0E9DC",
  },

  heroCard: {
    backgroundColor: "#3D2619",
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
  },

  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  tierBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },

  tierDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  tierText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  shopLinkButton: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  shopLinkText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  balanceLabel: {
    fontSize: 13,
    color: "#D4C3BA",
    fontWeight: "600",
    marginBottom: 8,
  },

  balanceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 14,
  },

  balanceCoinIcon: {
    fontSize: 26,
    marginBottom: 4,
  },

  balanceValue: {
    fontSize: 34,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  balanceUnit: {
    fontSize: 14,
    color: "#D4C3BA",
    marginBottom: 6,
  },

  balanceInfoBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },

  balanceInfoIcon: {
    fontSize: 14,
  },

  balanceInfoText: {
    fontSize: 12,
    color: "#F1E7DF",
    fontWeight: "600",
    flex: 1,
  },

  balanceHint: {
    fontSize: 11.5,
    color: "#A5978D",
    lineHeight: 16,
  },

  historyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  historyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#3D2619",
  },

  historyToggle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#8A5A34",
  },

  txCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8DFD8",
    padding: 14,
    marginBottom: 12,
  },

  txIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFF6E0",
    alignItems: "center",
    justifyContent: "center",
  },

  txIconText: {
    fontSize: 17,
  },

  txOrderId: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#3D2619",
  },

  txCoins: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2D6A4F",
  },

  txTotal: {
    fontSize: 12.5,
    color: "#4A3B32",
    marginTop: 2,
  },

  txReason: {
    fontSize: 12,
    color: "#8A7D75",
    lineHeight: 17,
    marginTop: 4,
  },

  txDate: {
    fontSize: 11,
    color: "#8A7D75",
    marginTop: 4,
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
