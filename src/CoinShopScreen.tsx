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
  DiscountType,
  collectDiscountCode,
  fetchCoinRewards,
  fetchMyDiscountCodes,
  fetchPublicDiscountCodes,
  redeemCoinReward,
} from "./api";
import ConfirmDialog from "./components/ConfirmDialog";
import Icon from "./components/Icon";
import Toast from "./components/Toast";
import { useCoins } from "./context/CoinContext";
import { SEASON_PRESETS } from "./lib/seasonPresets";

type Tab = "shop" | "publicCodes" | "myCodes";

interface CoinShopScreenProps {
  onOpenHistory?: () => void;
}

// ป้ายหมวดของรางวัลตามประเภทส่วนลด (ไม่มีข้อมูลสินค้าจริง ใช้จัดกลุ่มด้วยประเภทส่วนลดแทน)
function getRewardMeta(discountType: DiscountType) {
  if (discountType === "percent") {
    return { icon: "sell", bg: "#FFF6E0", eyebrow: "ส่วนลดเปอร์เซ็นต์" };
  }
  return { icon: "payments", bg: "#E3F3E7", eyebrow: "ส่วนลดเงินสด" };
}

// ร้านค้าเหรียญ: ใช้เหรียญสะสมแลกเป็นโค้ดส่วนลดส่วนตัว + เก็บโค้ดส่วนลดตามฤดูกาลจากแอดมิน
export default function CoinShopScreen({ onOpenHistory }: CoinShopScreenProps) {
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
        <View>
          <Text style={styles.balanceLabel}>เหรียญสะสมของคุณ</Text>
          <View style={styles.buttonInlineRow}>
            <Icon name="monetization_on" size={18} color="#FFFFFF" />
            <Text style={styles.balanceValue}>{coinBalance.toLocaleString("th-TH")}</Text>
          </View>
        </View>

        {onOpenHistory && (
          <TouchableOpacity
            style={styles.historyButton}
            activeOpacity={0.7}
            onPress={onOpenHistory}
          >
            <Text style={styles.historyButtonText}>⟲ ประวัติเหรียญ</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabButton, tab === "shop" && styles.tabButtonActive]}
          activeOpacity={0.7}
          onPress={() => setTab("shop")}
        >
          <Text style={[styles.tabText, tab === "shop" && styles.tabTextActive]}>
            ร้านแลกของรางวัล
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, tab === "publicCodes" && styles.tabButtonActive]}
          activeOpacity={0.7}
          onPress={() => setTab("publicCodes")}
        >
          <Text style={[styles.tabText, tab === "publicCodes" && styles.tabTextActive]}>
            โค้ดทั่วไป
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
                  <View style={styles.buttonInlineRow}>
                    <Icon name={preset?.icon || "sell"} size={13} color="#7F562B" />
                    <Text style={styles.publicCodeText}>{item.code}</Text>
                  </View>
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
                  ) : collected ? (
                    <View style={styles.buttonInlineRow}>
                      <Icon name="check" size={13} color="#FFFFFF" />
                      <Text style={styles.redeemButtonText}>เก็บแล้ว</Text>
                    </View>
                  ) : (
                    <Text style={styles.redeemButtonText}>เก็บโค้ด</Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            publicCodesLoading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color="#3D2619" />
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
            const meta = getRewardMeta(item.discount_type);
            const shortBy = item.coin_cost - coinBalance;

            return (
              <View style={styles.rewardCard}>
                <View style={styles.rewardTopRow}>
                  <View style={[styles.rewardIconBox, { backgroundColor: meta.bg }]}>
                    <Icon name={meta.icon} size={18} color="#7F562B" />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.rewardEyebrow}>{meta.eyebrow}</Text>
                    <Text style={styles.rewardName}>{item.name}</Text>
                    {item.description ? (
                      <Text style={styles.rewardDesc} numberOfLines={2}>
                        {item.description}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <Text style={styles.rewardValue}>
                  {item.discount_type === "percent"
                    ? `ลด ${item.discount_value}%`
                    : `ลด ฿${Number(item.discount_value).toLocaleString("th-TH")}`}
                  {item.min_order_amount > 0
                    ? ` · ซื้อขั้นต่ำ ฿${Number(item.min_order_amount).toLocaleString("th-TH")}`
                    : ""}
                </Text>

                <View style={styles.rewardBottomRow}>
                  <View style={styles.rewardCostRow}>
                    <Icon name="monetization_on" size={15} color="#D97706" />
                    <Text style={styles.rewardCostValue}>{item.coin_cost} เหรียญ</Text>
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
                    <Text
                      style={[
                        styles.redeemButtonText,
                        (!affordable || outOfStock) && styles.redeemButtonTextDisabled,
                      ]}
                    >
                      {outOfStock ? "หมดแล้ว" : "แลกเลย"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {!outOfStock && (
                  <View style={styles.buttonInlineRow}>
                    <Icon
                      name={affordable ? "check_circle" : "error"}
                      size={13}
                      color={affordable ? "#2D6A4F" : "#D97706"}
                    />
                    <Text
                      style={[
                        styles.rewardStatus,
                        affordable ? styles.rewardStatusOk : styles.rewardStatusShort,
                      ]}
                    >
                      {affordable ? "เหรียญเพียงพอสำหรับแลก" : `ขาดอีก ${shortBy} เหรียญ`}
                    </Text>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            rewardsLoading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color="#3D2619" />
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
                <ActivityIndicator size="large" color="#3D2619" />
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

  buttonInlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  balanceBar: {
    backgroundColor: "#3D2619",
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  balanceLabel: {
    fontSize: 13,
    color: "#D4C3BA",
    fontWeight: "600",
    marginBottom: 4,
  },

  balanceValue: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "800",
  },

  historyButton: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  historyButtonText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#FFFFFF",
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
    color: "#8A7D75",
  },

  tabTextActive: {
    color: "#3D2619",
  },

  list: {
    padding: 16,
    flexGrow: 1,
    backgroundColor: "#F0E9DC",
  },

  rewardCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8DFD8",
    padding: 14,
    marginBottom: 14,
  },

  rewardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
  },

  rewardIconBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  rewardIcon: {
    fontSize: 22,
  },

  rewardEyebrow: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#8A7D75",
    letterSpacing: 0.4,
    marginBottom: 2,
    textTransform: "uppercase",
  },

  rewardName: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#3D2619",
  },

  rewardDesc: {
    fontSize: 12,
    color: "#8A7D75",
    marginTop: 2,
  },

  rewardValue: {
    fontSize: 12.5,
    color: "#4A3B32",
    fontWeight: "600",
    marginBottom: 10,
  },

  rewardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  rewardCostRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  rewardCostIcon: {
    fontSize: 15,
  },

  rewardCostValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#3D2619",
  },

  redeemButton: {
    backgroundColor: "#3D2619",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },

  redeemButtonDisabled: {
    backgroundColor: "#F0EDE9",
  },

  redeemButtonText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },

  redeemButtonTextDisabled: {
    color: "#8A7D75",
  },

  rewardStatus: {
    fontSize: 11.5,
    fontWeight: "700",
    marginTop: 8,
  },

  rewardStatusOk: {
    color: "#2D6A4F",
  },

  rewardStatusShort: {
    color: "#D97706",
  },

  codeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8DFD8",
    padding: 14,
    marginBottom: 12,
  },

  publicCodeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8DFD8",
    padding: 14,
    marginBottom: 12,
  },

  publicCodeText: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#3D2619",
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
    color: "#3D2619",
    letterSpacing: 0.5,
  },

  codeLabel: {
    fontSize: 12.5,
    color: "#50453E",
    marginBottom: 4,
  },

  codeMeta: {
    fontSize: 12,
    color: "#8A7D75",
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
    backgroundColor: "#F0EDE9",
  },

  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },

  statusBadgeTextActive: {
    color: "#2D6A4F",
  },

  statusBadgeTextInactive: {
    color: "#8A7D75",
  },

  errorText: {
    fontSize: 14,
    color: "#C53030",
    textAlign: "center",
  },

  emptyText: {
    fontSize: 14,
    color: "#8A7D75",
  },
});
