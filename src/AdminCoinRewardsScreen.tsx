import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  CoinReward,
  DiscountType,
  createCoinReward,
  deleteCoinReward,
  fetchAdminCoinRewards,
  toggleCoinReward,
} from "./api";
import ConfirmDialog from "./components/ConfirmDialog";
import Toast from "./components/Toast";

// หน้าแอดมินจัดการ "ร้านค้าเหรียญ": ตั้งว่าจะให้ลูกค้าแลกเหรียญสะสมเป็นป้ายส่วนลดอะไรได้บ้าง
export default function AdminCoinRewardsScreen() {
  const [rewards, setRewards] = useState<CoinReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coinCost, setCoinCost] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("fixed");
  const [discountValue, setDiscountValue] = useState("");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [validDays, setValidDays] = useState("30");
  const [stock, setStock] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<CoinReward | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastTone, setToastTone] = useState<"info" | "warning">("info");

  const load = async () => {
    try {
      setError("");
      const data = await fetchAdminCoinRewards();
      setRewards(data);
    } catch (err: any) {
      console.error("Load coin rewards error:", err);
      setError(err.message || "ไม่สามารถโหลดรางวัลได้");
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

  const resetForm = () => {
    setName("");
    setDescription("");
    setCoinCost("");
    setDiscountType("fixed");
    setDiscountValue("");
    setMaxDiscount("");
    setMinOrder("");
    setValidDays("30");
    setStock("");
    setFormError("");
  };

  const handleCreate = async () => {
    if (!name.trim() || !coinCost || !discountValue) {
      setFormError("กรุณากรอกชื่อรางวัล จำนวนเหรียญ และมูลค่าส่วนลด");
      return;
    }

    setFormError("");
    setSubmitting(true);

    try {
      await createCoinReward({
        name: name.trim(),
        description: description.trim() || undefined,
        coin_cost: Number(coinCost),
        discount_type: discountType,
        discount_value: Number(discountValue),
        max_discount_amount: maxDiscount ? Number(maxDiscount) : undefined,
        min_order_amount: minOrder ? Number(minOrder) : undefined,
        valid_days: validDays ? Number(validDays) : undefined,
        stock: stock ? Number(stock) : undefined,
      });

      notify(`สร้างรางวัล "${name.trim()}" สำเร็จ`);
      resetForm();
      load();
    } catch (err: any) {
      console.error("Create coin reward error:", err);
      setFormError(err.message || "สร้างรางวัลไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (item: CoinReward) => {
    const nextActive = !item.is_active;

    setRewards((prev) =>
      prev.map((r) => (r.id === item.id ? { ...r, is_active: nextActive } : r))
    );

    try {
      await toggleCoinReward(item.id, nextActive);
    } catch (err: any) {
      console.error("Toggle coin reward error:", err);
      setRewards((prev) =>
        prev.map((r) => (r.id === item.id ? { ...r, is_active: item.is_active } : r))
      );
      notify(err.message || "อัปเดตสถานะไม่สำเร็จ", "warning");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);

    try {
      await deleteCoinReward(target.id);
      setRewards((prev) => prev.filter((r) => r.id !== target.id));
      notify(`ลบรางวัล "${target.name}" แล้ว`);
    } catch (err: any) {
      console.error("Delete coin reward error:", err);
      notify(err.message || "ลบรางวัลไม่สำเร็จ", "warning");
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={rewards}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>เพิ่มรางวัลในร้านค้าเหรียญ</Text>

            <Text style={styles.sectionLabel}>ชื่อรางวัล</Text>
            <TextInput
              style={styles.input}
              placeholder="เช่น คูปองลด 50 บาท"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.sectionLabel}>คำอธิบาย (ถ้ามี)</Text>
            <TextInput
              style={styles.input}
              placeholder="เช่น ใช้ได้กับยอดซื้อ 300 บาทขึ้นไป"
              value={description}
              onChangeText={setDescription}
            />

            <Text style={styles.sectionLabel}>ใช้เหรียญกี่เหรียญในการแลก</Text>
            <TextInput
              style={styles.input}
              placeholder="เช่น 200"
              value={coinCost}
              onChangeText={setCoinCost}
              keyboardType="numeric"
            />

            <Text style={styles.sectionLabel}>ประเภทส่วนลดที่จะได้รับ</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeChip, discountType === "fixed" && styles.typeChipSelected]}
                activeOpacity={0.7}
                onPress={() => setDiscountType("fixed")}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    discountType === "fixed" && styles.typeChipTextSelected,
                  ]}
                >
                  ลดเป็นจำนวนเงิน (บาท)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeChip, discountType === "percent" && styles.typeChipSelected]}
                activeOpacity={0.7}
                onPress={() => setDiscountType("percent")}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    discountType === "percent" && styles.typeChipTextSelected,
                  ]}
                >
                  ลด % ของยอดซื้อ
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.row2}>
              <View style={styles.col}>
                <Text style={styles.sectionLabel}>
                  มูลค่าส่วนลด {discountType === "percent" ? "(%)" : "(บาท)"}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={discountType === "percent" ? "เช่น 5" : "เช่น 50"}
                  value={discountValue}
                  onChangeText={setDiscountValue}
                  keyboardType="numeric"
                />
              </View>

              {discountType === "percent" && (
                <View style={styles.col}>
                  <Text style={styles.sectionLabel}>ลดสูงสุดไม่เกิน (บาท)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="ไม่จำกัด"
                    value={maxDiscount}
                    onChangeText={setMaxDiscount}
                    keyboardType="numeric"
                  />
                </View>
              )}
            </View>

            <View style={styles.row2}>
              <View style={styles.col}>
                <Text style={styles.sectionLabel}>ยอดซื้อขั้นต่ำ (บาท)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ไม่กำหนด"
                  value={minOrder}
                  onChangeText={setMinOrder}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.col}>
                <Text style={styles.sectionLabel}>ใช้ได้กี่วันหลังแลก</Text>
                <TextInput
                  style={styles.input}
                  placeholder="30"
                  value={validDays}
                  onChangeText={setValidDays}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={styles.sectionLabel}>จำนวนที่แลกได้ทั้งหมด</Text>
            <TextInput
              style={styles.input}
              placeholder="ไม่จำกัด"
              value={stock}
              onChangeText={setStock}
              keyboardType="numeric"
            />

            {formError ? <Text style={styles.formErrorText}>{formError}</Text> : null}

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              activeOpacity={0.8}
              disabled={submitting}
              onPress={handleCreate}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>เพิ่มรางวัล</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.listTitle}>รางวัลทั้งหมด</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.rewardCard}>
            <View style={styles.rewardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rewardName}>{item.name}</Text>
                {item.description ? (
                  <Text style={styles.rewardDesc}>{item.description}</Text>
                ) : null}
              </View>

              <View
                style={[
                  styles.statusBadge,
                  item.is_active ? styles.statusBadgeActive : styles.statusBadgeInactive,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    item.is_active
                      ? styles.statusBadgeTextActive
                      : styles.statusBadgeTextInactive,
                  ]}
                >
                  {item.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                </Text>
              </View>
            </View>

            <Text style={styles.rewardMeta}>
              🪙 {item.coin_cost} เหรียญ ·{" "}
              {item.discount_type === "percent"
                ? `ลด ${item.discount_value}%`
                : `ลด ฿${Number(item.discount_value).toLocaleString("th-TH")}`}
              {item.max_discount_amount
                ? ` (สูงสุด ฿${Number(item.max_discount_amount).toLocaleString("th-TH")})`
                : ""}
            </Text>

            <Text style={styles.rewardMeta}>
              แลกไปแล้ว {item.redeemed_count} {item.stock ? `/ ${item.stock} ชิ้น` : "ครั้ง (ไม่จำกัด)"}{" "}
              · ใช้ได้ {item.valid_days} วันหลังแลก
            </Text>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.actionButton}
                activeOpacity={0.7}
                onPress={() => handleToggle(item)}
              >
                <Text style={styles.actionButtonText}>
                  {item.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                activeOpacity={0.7}
                onPress={() => setDeleteTarget(item)}
              >
                <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>ลบ</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#111111" />
            </View>
          ) : error ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <View style={styles.center}>
              <Text style={styles.emptyText}>ยังไม่มีรางวัลในร้านค้าเหรียญ</Text>
            </View>
          )
        }
      />

      <ConfirmDialog
        visible={!!deleteTarget}
        title="ลบรางวัล"
        message={deleteTarget ? `ต้องการลบรางวัล "${deleteTarget.name}" ใช่หรือไม่?` : ""}
        confirmText="ลบ"
        cancelText="ยกเลิก"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
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

  list: {
    padding: 16,
    flexGrow: 1,
    backgroundColor: "#FAFAFA",
  },

  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EDEDED",
    padding: 18,
    marginBottom: 16,
  },

  formTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 14,
  },

  sectionLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 6,
    marginTop: 10,
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E3DC",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: "#2B2B31",
  },

  typeRow: {
    flexDirection: "row",
    gap: 8,
  },

  typeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E3DC",
    alignItems: "center",
  },

  typeChipSelected: {
    backgroundColor: "#111111",
    borderColor: "#111111",
  },

  typeChipText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#4A4A4A",
  },

  typeChipTextSelected: {
    color: "#FFFFFF",
  },

  row2: {
    flexDirection: "row",
    gap: 12,
  },

  col: {
    flex: 1,
  },

  formErrorText: {
    fontSize: 12.5,
    color: "#B3413E",
    marginTop: 12,
  },

  submitButton: {
    backgroundColor: "#111111",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 16,
  },

  submitButtonDisabled: {
    opacity: 0.6,
  },

  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  listTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111111",
    marginTop: 22,
  },

  rewardCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EDEDED",
    padding: 14,
    marginBottom: 12,
  },

  rewardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },

  rewardName: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#111111",
  },

  rewardDesc: {
    fontSize: 12,
    color: "#8A8A8A",
    marginTop: 2,
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

  rewardMeta: {
    fontSize: 12,
    color: "#8A8A8A",
    marginTop: 2,
  },

  actionRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },

  actionButton: {
    paddingVertical: 4,
  },

  actionButtonText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#4A4A4A",
  },

  actionButtonTextDanger: {
    color: "#B3413E",
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
