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
  DiscountCode,
  DiscountType,
  createDiscountCode,
  deleteDiscountCode,
  fetchAdminDiscountCodes,
  toggleDiscountCode,
} from "./api";
import ConfirmDialog from "./components/ConfirmDialog";
import Toast from "./components/Toast";
import { SEASON_PRESETS } from "./lib/seasonPresets";

// หน้าแอดมินจัดการโค้ดส่วนลดตามฤดูกาล/เทศกาล: เลือกพรีเซ็ตเทศกาลเร็วๆ หรือกำหนดเอง
// แล้วตั้งเปอร์เซ็นต์/จำนวนเงินส่วนลด ช่วงวันที่ใช้ได้ และจำนวนสิทธิ์การใช้
export default function AdminDiscountsScreen() {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedPreset, setSelectedPreset] = useState(SEASON_PRESETS[0].id);
  const [code, setCode] = useState(SEASON_PRESETS[0].suggestedCode);
  const [label, setLabel] = useState(SEASON_PRESETS[0].label + "ลดราคา");
  const [discountType, setDiscountType] = useState<DiscountType>("percent");
  const [discountValue, setDiscountValue] = useState("10");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<DiscountCode | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastTone, setToastTone] = useState<"info" | "warning">("info");

  const load = async () => {
    try {
      setError("");
      const data = await fetchAdminDiscountCodes();
      setCodes(data);
    } catch (err: any) {
      console.error("Load discount codes error:", err);
      setError(err.message || "ไม่สามารถโหลดโค้ดส่วนลดได้");
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

  const applyPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = SEASON_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setCode(preset.suggestedCode);
    setLabel(presetId === "custom" ? "" : `${preset.label}ลดราคา`);
  };

  const resetForm = () => {
    applyPreset(SEASON_PRESETS[0].id);
    setDiscountType("percent");
    setDiscountValue("10");
    setMaxDiscount("");
    setMinOrder("");
    setStartDate("");
    setEndDate("");
    setUsageLimit("");
    setFormError("");
  };

  const handleCreate = async () => {
    if (!code.trim() || !label.trim()) {
      setFormError("กรุณากรอกโค้ดและชื่อโปรโมชัน");
      return;
    }

    if (!discountValue || Number(discountValue) <= 0) {
      setFormError("กรุณาระบุมูลค่าส่วนลดที่มากกว่า 0");
      return;
    }

    setFormError("");
    setSubmitting(true);

    try {
      await createDiscountCode({
        code: code.trim(),
        label: label.trim(),
        season: selectedPreset === "custom" ? undefined : selectedPreset,
        discount_type: discountType,
        discount_value: Number(discountValue),
        max_discount_amount: maxDiscount ? Number(maxDiscount) : undefined,
        min_order_amount: minOrder ? Number(minOrder) : undefined,
        start_date: startDate.trim() || undefined,
        end_date: endDate.trim() || undefined,
        usage_limit: usageLimit ? Number(usageLimit) : undefined,
      });

      notify(`สร้างโค้ด "${code.trim().toUpperCase()}" สำเร็จ`);
      resetForm();
      load();
    } catch (err: any) {
      console.error("Create discount code error:", err);
      setFormError(err.message || "สร้างโค้ดส่วนลดไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (item: DiscountCode) => {
    const nextActive = !item.is_active;

    setCodes((prev) =>
      prev.map((c) => (c.id === item.id ? { ...c, is_active: nextActive } : c))
    );

    try {
      await toggleDiscountCode(item.id, nextActive);
    } catch (err: any) {
      console.error("Toggle discount code error:", err);
      setCodes((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, is_active: item.is_active } : c))
      );
      notify(err.message || "อัปเดตสถานะไม่สำเร็จ", "warning");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);

    try {
      await deleteDiscountCode(target.id);
      setCodes((prev) => prev.filter((c) => c.id !== target.id));
      notify(`ลบโค้ด "${target.code}" แล้ว`);
    } catch (err: any) {
      console.error("Delete discount code error:", err);
      notify(err.message || "ลบโค้ดไม่สำเร็จ", "warning");
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={codes}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>สร้างโค้ดส่วนลดใหม่</Text>

            <Text style={styles.sectionLabel}>เลือกฤดูกาล/เทศกาล</Text>
            <View style={styles.presetGrid}>
              {SEASON_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.id}
                  style={[
                    styles.presetChip,
                    selectedPreset === preset.id && styles.presetChipSelected,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => applyPreset(preset.id)}
                >
                  <Text style={styles.presetIcon}>{preset.icon}</Text>
                  <Text
                    style={[
                      styles.presetLabel,
                      selectedPreset === preset.id && styles.presetLabelSelected,
                    ]}
                  >
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>โค้ด (ลูกค้าใช้กรอกตอนสั่งซื้อ)</Text>
            <TextInput
              style={styles.input}
              placeholder="เช่น SONGKRAN10"
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
            />

            <Text style={styles.sectionLabel}>ชื่อโปรโมชัน</Text>
            <TextInput
              style={styles.input}
              placeholder="เช่น ลดรับสงกรานต์"
              value={label}
              onChangeText={setLabel}
            />

            <Text style={styles.sectionLabel}>ประเภทส่วนลด</Text>
            <View style={styles.typeRow}>
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
            </View>

            <View style={styles.row2}>
              <View style={styles.col}>
                <Text style={styles.sectionLabel}>
                  มูลค่าส่วนลด {discountType === "percent" ? "(%)" : "(บาท)"}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={discountType === "percent" ? "เช่น 10" : "เช่น 100"}
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
                <Text style={styles.sectionLabel}>จำนวนสิทธิ์ใช้ทั้งหมด</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ไม่จำกัด"
                  value={usageLimit}
                  onChangeText={setUsageLimit}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.row2}>
              <View style={styles.col}>
                <Text style={styles.sectionLabel}>วันเริ่มใช้ (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ไม่กำหนด"
                  value={startDate}
                  onChangeText={setStartDate}
                />
              </View>

              <View style={styles.col}>
                <Text style={styles.sectionLabel}>วันหมดอายุ (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ไม่กำหนด"
                  value={endDate}
                  onChangeText={setEndDate}
                />
              </View>
            </View>

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
                <Text style={styles.submitButtonText}>สร้างโค้ดส่วนลด</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.listTitle}>โค้ดส่วนลดทั้งหมด</Text>
          </View>
        }
        renderItem={({ item }) => {
          const preset = SEASON_PRESETS.find((p) => p.id === item.season);

          return (
            <View style={styles.codeCard}>
              <View style={styles.codeHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.codeText}>
                    {preset ? `${preset.icon} ` : ""}
                    {item.code}
                  </Text>
                  <Text style={styles.codeLabel}>{item.label}</Text>
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

              <Text style={styles.codeMeta}>
                {item.discount_type === "percent"
                  ? `ลด ${item.discount_value}%`
                  : `ลด ฿${Number(item.discount_value).toLocaleString("th-TH")}`}
                {item.max_discount_amount
                  ? ` (สูงสุด ฿${Number(item.max_discount_amount).toLocaleString("th-TH")})`
                  : ""}
                {Number(item.min_order_amount) > 0
                  ? ` · ซื้อขั้นต่ำ ฿${Number(item.min_order_amount).toLocaleString("th-TH")}`
                  : ""}
              </Text>

              <Text style={styles.codeMeta}>
                ใช้ไปแล้ว {item.used_count} {item.usage_limit ? `/ ${item.usage_limit}` : "ครั้ง (ไม่จำกัด)"}
                {item.start_date || item.end_date
                  ? ` · ${item.start_date ? String(item.start_date).slice(0, 10) : "…"} ถึง ${
                      item.end_date ? String(item.end_date).slice(0, 10) : "…"
                    }`
                  : ""}
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
                  <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>
                    ลบ
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
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
              <Text style={styles.emptyText}>ยังไม่มีโค้ดส่วนลด</Text>
            </View>
          )
        }
      />

      <ConfirmDialog
        visible={!!deleteTarget}
        title="ลบโค้ดส่วนลด"
        message={deleteTarget ? `ต้องการลบโค้ด "${deleteTarget.code}" ใช่หรือไม่?` : ""}
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

  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  presetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E3DC",
    backgroundColor: "#FFFFFF",
  },

  presetChipSelected: {
    backgroundColor: "#111111",
    borderColor: "#111111",
  },

  presetIcon: {
    fontSize: 14,
  },

  presetLabel: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#4A4A4A",
  },

  presetLabelSelected: {
    color: "#FFFFFF",
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

  codeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EDEDED",
    padding: 14,
    marginBottom: 12,
  },

  codeHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
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

  codeMeta: {
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
