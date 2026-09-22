import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { CoinTransaction, fetchMyCoins } from "./api";

// หน้าแสดงเหรียญสะสมของผู้ใช้: ยอดคงเหลือ + ประวัติการได้เหรียญแต่ละออเดอร์
// (จำนวนเหรียญคำนวณโดย AI ฝั่ง backend ตอนเช็คเอาท์ ดู Backend/src/coinCalculator.js)
export default function CoinsScreen() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    <FlatList
      data={transactions}
      keyExtractor={(t) => String(t.id)}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>เหรียญสะสมของคุณ</Text>

            <View style={styles.balanceRow}>
              <Text style={styles.balanceCoinIcon}>🪙</Text>
              <Text style={styles.balanceValue}>
                {balance.toLocaleString("th-TH")}
              </Text>
            </View>

            <Text style={styles.balanceHint}>
              ได้รับเหรียญสะสมทุกครั้งที่สั่งซื้อสำเร็จ คำนวณอัตโนมัติจากยอดสั่งซื้อ
            </Text>
          </View>

          <Text style={styles.historyTitle}>ประวัติการได้เหรียญ</Text>
        </View>
      }
      renderItem={({ item: t }) => (
        <View style={styles.txCard}>
          <View style={styles.txHeader}>
            <Text style={styles.txOrderId}>คำสั่งซื้อ #{t.order_id}</Text>

            <Text style={styles.txCoins}>+{t.coins} 🪙</Text>
          </View>

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
    backgroundColor: "#FAFAFA",
  },

  list: {
    padding: 16,
    flexGrow: 1,
    backgroundColor: "#FAFAFA",
  },

  balanceCard: {
    backgroundColor: "#111111",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },

  balanceLabel: {
    fontSize: 13,
    color: "#C9C9C9",
    fontWeight: "600",
    marginBottom: 8,
  },

  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },

  balanceCoinIcon: {
    fontSize: 26,
  },

  balanceValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  balanceHint: {
    fontSize: 12,
    color: "#B0B0B0",
    lineHeight: 17,
  },

  historyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 12,
  },

  txCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EDEDED",
    padding: 14,
    marginBottom: 12,
  },

  txHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  txOrderId: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#111111",
  },

  txCoins: {
    fontSize: 14,
    fontWeight: "800",
    color: "#B26A00",
  },

  txTotal: {
    fontSize: 12.5,
    color: "#4A4A4A",
    marginBottom: 4,
  },

  txReason: {
    fontSize: 12,
    color: "#8A8A8A",
    lineHeight: 17,
    marginBottom: 6,
  },

  txDate: {
    fontSize: 11,
    color: "#B0B0B0",
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
