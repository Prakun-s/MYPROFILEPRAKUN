import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  CoinReward,
  DiscountCode,
  collectDiscountCode,
  fetchCoinRewards,
  fetchMyDiscountCodes,
  fetchPublicDiscountCodes,
  redeemCoinReward,
} from "./api";
import ConfirmDialog from "./components/ConfirmDialog";
import Toast from "./components/Toast";
import { useCoins } from "./context/CoinContext";
import { SEASON_PRESETS } from "./lib/seasonPresets";

type Tab = "shop" | "publicCodes" | "myCodes";

// ร้านค้าเหรียญ: ใช้เหรียญสะสมแลกเป็นโค้ดส่วนลดส่วนตัว + เก็บโค้ดส่วนลดตามฤดูกาลจากแอดมิน
export default function CoinShopScreen() {
  const { coinBalance, refreshCoins } = useCoins();

  const [tab, setTab] = useState<Tab>("shop");

  const [rewards, setRewards] = useState<CoinReward[]>([]);
  const [rewardsLoading, setRewardsLoading] = useState(true);
  const [rewardsError, setRewardsError] = useState("");

  const [publicCodes, setPublicCodes] = useState<DiscountCode[]>([]);
  const [publicCodesLoading, setPublicCodesLoading] = useState(false);
  const [publicCodesError, setPublicCodesError] = useState("");
  const [collectingId, setCollectingId] = useState<number | null>(null);

  const [myCodes, setMyCodes] = useState<DiscountCode[]>([]);
  const [myCodesLoading, setMyCodesLoading] = useState(false);
  const [myCodesError, setMyCodesError] = useState("");

  const [redeemTarget, setRedeemTarget] = useState<CoinReward | null>(null);
  const [redeeming, setRedeeming] = useState(false);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastTone, setToastTone] = useState<"info" | "warning">("info");

  const notify = (message: string, tone: "info" | "warning" = "info") => {
    setToastMessage(message);
    setToastTone(tone);
    setToastVisible(true);
  };

  const loadRewards = async () => {
    try {
      setRewardsError("");
      const data = await fetchCoinRewards();
      setRewards(data);
    } catch (err: any) {
      console.error("Load coin rewards error:", err);
      setRewardsError(err.message || "ไม่สามารถโหลดร้านค้าเหรียญได้");
    } finally {
      setRewardsLoading(false);
    }
  };

  const loadPublicCodes = async () => {
    try {
      setPublicCodesLoading(true);
      setPublicCodesError("");
      const data = await fetchPublicDiscountCodes();
      setPublicCodes(data);
    } catch (err: any) {
      console.error("Load public discount codes error:", err);
      setPublicCodesError(err.message || "ไม่สามารถโหลดโค้ดส่วนลดได้");
    } finally {
      setPublicCodesLoading(false);
    }
  };

  const loadMyCodes = async () => {
    try {
      setMyCodesLoading(true);
      setMyCodesError("");
      const data = await fetchMyDiscountCodes();
      setMyCodes(data);
    } catch (err: any) {
      console.error("Load my discount codes error:", err);
      setMyCodesError(err.message || "ไม่สามารถโหลดโค้ดของคุณได้");
    } finally {
      setMyCodesLoading(false);
    }
  };

  useEffect(() => {
    loadRewards();
  }, []);

  useEffect(() => {
    if (tab === "publicCodes") {
      loadPublicCodes();
      // โหลดโค้ดของฉันไว้ด้วย เพื่อเช็คว่าโค้ดไหนเก็บไปแล้วบ้าง
      loadMyCodes();
    } else if (tab === "myCodes") {
      loadMyCodes();
    }
  }, [tab]);

  const collectedSourceIds = new Set(
    myCodes.filter((c) => c.source === "collected").map((c) => c.source_code_id)
  );

  const handleCollect = async (item: DiscountCode) => {
    setCollectingId(item.id);

    try {
      const result = await collectDiscountCode(item.id);
      notify(`เก็บโค้ด "${result.code}" แล้ว ดูได้ที่แท็บ "โค้ดของฉัน"`);
      loadMyCodes();
    } catch (err: any) {
      console.error("Collect discount code error:", err);
      notify(err.message || "เก็บโค้ดไม่สำเร็จ", "warning");
    } finally {
      setCollectingId(null);
    }
  };

  const handleRedeem = async () => {
    if (!redeemTarget) return;
    const target = redeemTarget;
    setRedeemTarget(null);
    setRedeeming(true);

    try {
      const result = await redeemCoinReward(target.id);
      notify(`แลกสำเร็จ! ได้รับโค้ด "${result.code}"`);
      refreshCoins();
      loadRewards();
      if (tab === "myCodes") loadMyCodes();
    } catch (err: any) {
      console.error("Redeem coin reward error:", err);
      notify(err.message || "แลกรางวัลไม่สำเร็จ", "warning");
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.balanceBar}>
        <Text style={styles.balanceLabel}>เหรียญสะสมของคุณ</Text>
        <Text style={styles.balanceValue}>🪙 {coinBalance.toLocaleString("th-TH")}</Text>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabButton, tab === "shop" && styles.tabButtonActive]}
          activeOpacity={0.7}
          onPress={() => setTab("shop")}
        >
          <Text style={[styles.tabText, tab === "shop" && styles.tabTextActive]}>
            ร้านค้าเหรียญ
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, tab === "publicCodes" && styles.tabButtonActive]}
          activeOpacity={0.7}
          onPress={() => setTab("publicCodes")}
        >
          <Text style={[styles.tabText, tab === "publicCodes" && styles.tabTextActive]}>
            โค้ดส่วนลด
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, tab === "myCodes" && styles.tabButtonActive]}
          activeOpacity={0.7}
          onPress={() => setTab("myCodes")}
        >
          <Text style={[styles.tabText, tab === "myCodes" && styles.tabTextActive]}>
            โค้ดของฉัน
          </Text>
        </TouchableOpacity>
      </View>

      {tab === "publicCodes" ? (
        <FlatList
          data={publicCodes}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const preset = SEASON_PRESETS.find((p) => p.id === item.season);
            const collected = collectedSourceIds.has(item.id);

            return (
              <View style={styles.publicCodeCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.publicCodeText}>
                    {preset ? `${preset.icon} ` : "🏷️ "}
                    {item.code}
                  </Text>
                  <Text style={styles.rewardName}>{item.label}</Text>
                  <Text style={styles.rewardValue}>
                    {item.discount_type === "percent"
                      ? `ลด ${item.discount_value}%`
                      : `ลด ฿${Number(item.discount_value).toLocaleString("th-TH")}`}
                    {item.min_order_amount > 0
                      ? ` · ซื้อขั้นต่ำ ฿${Number(item.min_order_amount).toLocaleString("th-TH")}`
                      : ""}
                    {item.end_date ? ` · หมดอายุ ${String(item.end_date).slice(0, 10)}` : ""}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.redeemButton,
                    collected && styles.redeemButtonDisabled,
                  ]}
                  activeOpacity={0.7}
                  disabled={collected || collectingId === item.id}
                  onPress={() => handleCollect(item)}
                >
                  {collectingId === item.id ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.redeemButtonText}>
                      {collected ? "เก็บแล้ว ✓" : "เก็บโค้ด"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            publicCodesLoading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color="#111111" />
              </View>
            ) : publicCodesError ? (
              <View style={styles.center}>
                <Text style={styles.errorText}>{publicCodesError}</Text>
              </View>
            ) : (
              <View style={styles.center}>
                <Text style={styles.emptyText}>ยังไม่มีโค้ดส่วนลดตอนนี้</Text>
              </View>
            )
          }
        />
      ) : tab === "shop" ? (
        <FlatList
          data={rewards}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const affordable = coinBalance >= item.coin_cost;
            const outOfStock = item.stock !== null && item.redeemed_count >= (item.stock ?? 0);

            return (
              <View style={styles.rewardCard}>
                <View style={styles.rewardIconCircle}>
                  <Text style={styles.rewardIcon}>🎟️</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.rewardName}>{item.name}</Text>
                  {item.description ? (
                    <Text style={styles.rewardDesc}>{item.description}</Text>
                  ) : null}
                  <Text style={styles.rewardValue}>
                    {item.discount_type === "percent"
                      ? `ลด ${item.discount_value}%`
                      : `ลด ฿${Number(item.discount_value).toLocaleString("th-TH")}`}
                    {item.min_order_amount > 0
                      ? ` · ซื้อขั้นต่ำ ฿${Number(item.min_order_amount).toLocaleString("th-TH")}`
                      : ""}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.redeemButton,
                    (!affordable || outOfStock) && styles.redeemButtonDisabled,
                  ]}
                  activeOpacity={0.7}
                  disabled={!affordable || outOfStock || redeeming}
                  onPress={() => setRedeemTarget(item)}
                >
                  <Text style={styles.redeemButtonText}>
                    {outOfStock ? "หมดแล้ว" : `🪙 ${item.coin_cost}`}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            rewardsLoading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color="#111111" />
              </View>
            ) : rewardsError ? (
              <View style={styles.center}>
                <Text style={styles.errorText}>{rewardsError}</Text>
              </View>
            ) : (
              <View style={styles.center}>
                <Text style={styles.emptyText}>ยังไม่มีรางวัลให้แลกตอนนี้</Text>
              </View>
            )
          }
        />
      ) : (
        <FlatList
          data={myCodes}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const expired = item.end_date ? new Date(item.end_date) < new Date() : false;
            const used = !!item.used_at;

            let statusLabel = "ใช้ได้";
            let statusStyle = styles.statusBadgeActive;
            let statusTextStyle = styles.statusBadgeTextActive;

            if (used) {
              statusLabel = "ใช้แล้ว";
              statusStyle = styles.statusBadgeInactive;
              statusTextStyle = styles.statusBadgeTextInactive;
            } else if (expired) {
              statusLabel = "หมดอายุ";
              statusStyle = styles.statusBadgeInactive;
              statusTextStyle = styles.statusBadgeTextInactive;
            }

            return (
              <View style={styles.codeCard}>
                <View style={styles.codeHeader}>
                  <Text style={styles.codeText}>{item.code}</Text>
                  <View style={[styles.statusBadge, statusStyle]}>
                    <Text style={[styles.statusBadgeText, statusTextStyle]}>{statusLabel}</Text>
                  </View>
                </View>

                <Text style={styles.codeLabel}>{item.label}</Text>

                <Text style={styles.codeMeta}>
                  {item.discount_type === "percent"
                    ? `ลด ${item.discount_value}%`
                    : `ลด ฿${Number(item.discount_value).toLocaleString("th-TH")}`}
                  {item.end_date
                    ? ` · หมดอายุ ${String(item.end_date).slice(0, 10)}`
                    : ""}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            myCodesLoading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color="#111111" />
              </View>
            ) : myCodesError ? (
              <View style={styles.center}>
                <Text style={styles.errorText}>{myCodesError}</Text>
              </View>
            ) : (
              <View style={styles.center}>
                <Text style={styles.emptyText}>ยังไม่มีโค้ดที่แลกไว้</Text>
              </View>
            )
          }
        />
      )}

      <ConfirmDialog
        visible={!!redeemTarget}
        title="ยืนยันการแลกรางวัล"
        message={
          redeemTarget
            ? `ใช้เหรียญ ${redeemTarget.coin_cost} เหรียญ แลก "${redeemTarget.name}" ใช่หรือไม่?`
            : ""
        }
        confirmText="แลกเลย"
        cancelText="ยกเลิก"
        onCancel={() => setRedeemTarget(null)}
        onConfirm={handleRedeem}
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
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },

  balanceBar: {
    backgroundColor: "#111111",
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  balanceLabel: {
    fontSize: 13,
    color: "#C9C9C9",
    fontWeight: "600",
  },

  balanceValue: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "800",
  },

  tabRow: {
    flexDirection: "row",
    backgroundColor: "#EFEEEA",
    margin: 16,
    marginBottom: 0,
    borderRadius: 10,
    padding: 4,
  },

  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },

  tabButtonActive: {
    backgroundColor: "#FFFFFF",
  },

  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8A8A8A",
  },

  tabTextActive: {
    color: "#111111",
  },

  list: {
    padding: 16,
    flexGrow: 1,
    backgroundColor: "#FAFAFA",
  },

  rewardCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EDEDED",
    padding: 14,
    marginBottom: 12,
  },

  rewardIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF6E0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  rewardIcon: {
    fontSize: 20,
  },

  rewardName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111111",
  },

  rewardDesc: {
    fontSize: 12,
    color: "#8A8A8A",
    marginTop: 2,
  },

  rewardValue: {
    fontSize: 12.5,
    color: "#4A4A4A",
    fontWeight: "600",
    marginTop: 4,
  },

  redeemButton: {
    backgroundColor: "#111111",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginLeft: 10,
  },

  redeemButtonDisabled: {
    backgroundColor: "#D8D8D8",
  },

  redeemButtonText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },

  codeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EDEDED",
    padding: 14,
    marginBottom: 12,
  },

  publicCodeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EDEDED",
    padding: 14,
    marginBottom: 12,
  },

  publicCodeText: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#111111",
    letterSpacing: 0.3,
    marginBottom: 2,
  },

  codeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },

  codeText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111111",
    letterSpacing: 0.5,
  },

  codeLabel: {
    fontSize: 12.5,
    color: "#6B6B6B",
    marginBottom: 4,
  },

  codeMeta: {
    fontSize: 12,
    color: "#8A8A8A",
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },

  statusBadgeActive: {
    backgroundColor: "#E3F3E7",
  },

  statusBadgeInactive: {
    backgroundColor: "#F1F1F1",
  },

  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },

  statusBadgeTextActive: {
    color: "#1E8E3E",
  },

  statusBadgeTextInactive: {
    color: "#8A8A8A",
  },

  errorText: {
    fontSize: 14,
    color: "#B3413E",
    textAlign: "center",
  },

  emptyText: {
    fontSize: 14,
    color: "#8A8A8A",
  },
});
