import { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
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
import Icon from "./components/Icon";
import Toast from "./components/Toast";
import { SEASON_PRESETS } from "./lib/seasonPresets";

type FilterKey = "all" | "active" | "expired";

function money(n: number) {
  return `฿${Number(n).toLocaleString("th-TH")}`;
}

function formatDate(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric" as const,
  });
}

function isExpired(item: DiscountCode) {
  if (!item.end_date) return false;
  return new Date(item.end_date).getTime() < Date.now();
}

function daysLeft(endDate: string) {
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function discountLine(item: DiscountCode) {
  const base =
    item.discount_type === "percent"
      ? `ลด ${item.discount_value}%${
          item.max_discount_amount ? ` (สูงสุด ${money(Number(item.max_discount_amount))})` : ""
        }`
      : `ส่วนลดเงินสด ${money(Number(item.discount_value))}`;
  return base;
}

// หน้าแอดมินจัดการโค้ดส่วนลดตามฤดูกาล/เทศกาล: เลือกพรีเซ็ตเทศกาลเร็วๆ หรือกำหนดเอง
// แล้วตั้งเปอร์เซ็นต์/จำนวนเงินส่วนลด ช่วงวันที่ใช้ได้ และจำนวนสิทธิ์การใช้
export default function AdminDiscountsScreen() {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const [modalVisible, setModalVisible] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

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
    setShowAdvanced(false);
  };

  const openCreateModal = () => {
    resetForm();
    setModalVisible(true);
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
        code: code.trim().toUpperCase(),
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
      setModalVisible(false);
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

  const handleCopy = (codeText: string) => {
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(codeText);
      notify(`คัดลอกโค้ด ${codeText} เรียบร้อย!`);
    } else {
      notify(`โค้ดคือ: ${codeText}`);
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

  const activeCount = useMemo(
    () => codes.filter((c) => !!c.is_active && !isExpired(c)).length,
    [codes]
  );
  const expiredCount = useMemo(() => codes.filter((c) => isExpired(c)).length, [codes]);
  const totalUsed = useMemo(
    () => codes.reduce((sum, c) => sum + Number(c.used_count || 0), 0),
    [codes]
  );

  const filteredCodes = useMemo(() => {
    if (filter === "active") return codes.filter((c) => !!c.is_active && !isExpired(c));
    if (filter === "expired") return codes.filter((c) => isExpired(c));
    return codes;
  }, [codes, filter]);

  const FILTER_OPTIONS: { value: FilterKey; label: string; count: number }[] = [
    { value: "all", label: "ทั้งหมด", count: codes.length },
    { value: "active", label: "ใช้งานอยู่", count: activeCount },
    { value: "expired", label: "หมดอายุ", count: expiredCount },
  ];

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={filteredCodes}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <View style={styles.pageHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.eyebrow}>ร้านค้า PRAKUN ADMIN</Text>
                <Text style={styles.pageTitle}>จัดการโค้ดส่วนลด</Text>
                <Text style={styles.pageSubtitle}>Discounts & Coupons Manager</Text>
              </View>

              <TouchableOpacity
                style={styles.createButton}
                activeOpacity={0.85}
                onPress={openCreateModal}
              >
                <Text style={styles.createButtonText}>＋ สร้างโค้ดใหม่</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statBanner}>
              <View style={styles.statCell}>
                <View style={styles.statCellLabelRow}>
                  <View style={styles.statDotGreen} />
                  <Text style={styles.statCellLabel}>ใช้งานอยู่</Text>
                </View>
                <Text style={styles.statCellValue}>{activeCount}</Text>
                <Text style={styles.statCellUnit}>โค้ด</Text>
              </View>

              <View style={styles.statCell}>
                <View style={styles.statCellLabelRow}>
                  <Icon name="autorenew" size={11} color="#8A7D75" />
                  <Text style={styles.statCellLabel}>ยอดใช้งาน</Text>
                </View>
                <Text style={styles.statCellValue}>{totalUsed}</Text>
                <Text style={styles.statCellUnit}>ครั้ง</Text>
              </View>

              <View style={styles.statCell}>
                <View style={styles.statCellLabelRow}>
                  <Icon name="schedule" size={11} color="#D97706" />
                  <Text style={[styles.statCellLabel, { color: "#D97706" }]}>หมดอายุแล้ว</Text>
                </View>
                <Text style={[styles.statCellValue, { color: "#7F562B" }]}>{expiredCount}</Text>
                <Text style={styles.statCellUnit}>โค้ด</Text>
              </View>
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
                  <Text
                    style={[
                      styles.filterChipText,
                      filter === option.value && styles.filterChipTextActive,
                    ]}
                  >
                    {option.label} ({option.count})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const preset = SEASON_PRESETS.find((p) => p.id === item.season);
          const expired = isExpired(item);
          const usagePct = item.usage_limit
            ? Math.min(100, Math.round((Number(item.used_count) / Number(item.usage_limit)) * 100))
            : 100;

          return (
            <View style={[styles.card, expired && styles.cardExpired]}>
              {/* รอยปรุแบบตั๋วคูปอง */}
              <View style={styles.notchLeft} />
              <View style={styles.notchRight} />

              <View style={styles.cardTopRow}>
                <View style={styles.cardTopLeft}>
                  <View style={[styles.iconCircle, expired && styles.iconCircleExpired]}>
                    <Icon
                      name={expired ? "event_busy" : preset?.icon || "sell"}
                      size={18}
                      color={expired ? "#8A7D75" : "#7F562B"}
                    />
                  </View>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.codeRow}>
                      <Text
                        style={[styles.codeText, expired && styles.codeTextExpired]}
                        numberOfLines={1}
                      >
                        {item.code}
                      </Text>
                      {expired ? (
                        <View style={styles.expiredBadge}>
                          <Text style={styles.expiredBadgeText}>หมดอายุแล้ว</Text>
                        </View>
                      ) : (
                        <View style={styles.seasonBadge}>
                          <Text style={styles.seasonBadgeText}>
                            {preset ? preset.label : "ทั่วไป"}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.discountLine} numberOfLines={1}>
                      {discountLine(item)}
                    </Text>
                    <Text style={styles.conditionLine} numberOfLines={1}>
                      {Number(item.min_order_amount) > 0
                        ? `เงื่อนไข: เมื่อซื้อครบ ${money(Number(item.min_order_amount))}`
                        : item.label}
                    </Text>
                  </View>
                </View>

                <Switch
                  value={!!item.is_active}
                  onValueChange={() => handleToggle(item)}
                  disabled={expired}
                  trackColor={{ false: "#E5E2DD", true: "#2D6A4F" }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.usageBox}>
                <View style={styles.usageRow}>
                  <Text style={styles.usageLabel}>
                    {expired ? "สถิติการใช้งานจริง" : "สถิติการใช้งาน"}
                  </Text>
                  <Text style={styles.usageValue}>
                    {item.used_count}
                    {item.usage_limit ? ` / ${item.usage_limit} ครั้ง (${usagePct}%)` : " ครั้ง (ไม่จำกัดโควต้า)"}
                  </Text>
                </View>

                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      expired && styles.progressFillExpired,
                      { width: `${usagePct}%` },
                    ]}
                  />
                </View>

                <View style={styles.usageFooterRow}>
                  <Text style={styles.usageFooterText}>
                    {item.end_date
                      ? `${expired ? "สิ้นสุดเมื่อ" : "หมดอายุ"}: ${formatDate(item.end_date)}`
                      : "∞ ไม่มีวันหมดอายุ"}
                  </Text>
                  <Text
                    style={[
                      styles.usageFooterHighlight,
                      expired && styles.usageFooterHighlightMuted,
                    ]}
                  >
                    {expired
                      ? "ยอดครบสมบูรณ์"
                      : item.end_date
                      ? `เหลือ ${daysLeft(item.end_date)} วัน`
                      : "เปิดรับตลอด"}
                  </Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.actionButton}
                  activeOpacity={0.75}
                  onPress={() => handleCopy(item.code)}
                >
                  <View style={styles.buttonInlineRow}>
                    <Icon name="content_copy" size={13} color="#3D2619" />
                    <Text style={styles.actionButtonText}>คัดลอกโค้ด</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  activeOpacity={0.75}
                  onPress={() => setDeleteTarget(item)}
                >
                  <View style={styles.buttonInlineRow}>
                    <Icon name="delete" size={13} color="#C53030" />
                    <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>
                      ลบโค้ด
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#3D2619" />
            </View>
          ) : error ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <View style={styles.center}>
              <Text style={styles.emptyText}>ไม่มีโค้ดส่วนลดในหมวดนี้</Text>
            </View>
          )
        }
      />

      {/* โมดัลสร้างโค้ดใหม่ */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled">
                <View>
                  <View style={styles.modalHeaderRow}>
                    <Text style={styles.modalTitle}>สร้างโค้ดส่วนลดใหม่</Text>
                    <TouchableOpacity
                      style={styles.modalCloseButton}
                      onPress={() => setModalVisible(false)}
                    >
                      <Icon name="close" size={16} color="#3D2619" />
                    </TouchableOpacity>
                  </View>

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
                        <Icon
                          name={preset.icon}
                          size={19}
                          color={selectedPreset === preset.id ? "#FFFFFF" : "#7F562B"}
                        />
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

                  <Text style={styles.sectionLabel}>รหัสคูปอง (Coupon Code)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="เช่น MONDAYBREW"
                    placeholderTextColor="#A79A90"
                    value={code}
                    onChangeText={setCode}
                    autoCapitalize="characters"
                  />

                  <Text style={styles.sectionLabel}>ชื่อโปรโมชัน</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="เช่น ลดรับสงกรานต์"
                    placeholderTextColor="#A79A90"
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
                        ส่วนลดเปอร์เซ็นต์ (%)
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
                        ส่วนลดเงินสด (บาท)
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.sectionLabel}>
                    มูลค่าส่วนลด {discountType === "percent" ? "(%)" : "(บาท)"}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={discountType === "percent" ? "เช่น 10" : "เช่น 100"}
                    placeholderTextColor="#A79A90"
                    value={discountValue}
                    onChangeText={setDiscountValue}
                    keyboardType="numeric"
                  />

                  <TouchableOpacity
                    style={styles.advancedToggle}
                    activeOpacity={0.7}
                    onPress={() => setShowAdvanced((v) => !v)}
                  >
                    <Text style={styles.advancedToggleText}>
                      {showAdvanced ? "ซ่อนตัวเลือกเพิ่มเติม ▲" : "ตัวเลือกเพิ่มเติม (ลดสูงสุด/วันหมดอายุ/จำนวนสิทธิ์) ▼"}
                    </Text>
                  </TouchableOpacity>

                  {showAdvanced && (
                    <View>
                      <View style={styles.row2}>
                        {discountType === "percent" && (
                          <View style={styles.col}>
                            <Text style={styles.sectionLabel}>ลดสูงสุดไม่เกิน (บาท)</Text>
                            <TextInput
                              style={styles.input}
                              placeholder="ไม่จำกัด"
                              placeholderTextColor="#A79A90"
                              value={maxDiscount}
                              onChangeText={setMaxDiscount}
                              keyboardType="numeric"
                            />
                          </View>
                        )}
                        <View style={styles.col}>
                          <Text style={styles.sectionLabel}>ยอดซื้อขั้นต่ำ (บาท)</Text>
                          <TextInput
                            style={styles.input}
                            placeholder="ไม่กำหนด"
                            placeholderTextColor="#A79A90"
                            value={minOrder}
                            onChangeText={setMinOrder}
                            keyboardType="numeric"
                          />
                        </View>
                      </View>

                      <View style={styles.row2}>
                        <View style={styles.col}>
                          <Text style={styles.sectionLabel}>จำนวนสิทธิ์ใช้ทั้งหมด</Text>
                          <TextInput
                            style={styles.input}
                            placeholder="ไม่จำกัด"
                            placeholderTextColor="#A79A90"
                            value={usageLimit}
                            onChangeText={setUsageLimit}
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={styles.col}>
                          <Text style={styles.sectionLabel}>วันหมดอายุ (YYYY-MM-DD)</Text>
                          <TextInput
                            style={styles.input}
                            placeholder="ไม่กำหนด"
                            placeholderTextColor="#A79A90"
                            value={endDate}
                            onChangeText={setEndDate}
                          />
                        </View>
                      </View>

                      <Text style={styles.sectionLabel}>วันเริ่มใช้ (YYYY-MM-DD)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="ไม่กำหนด"
                        placeholderTextColor="#A79A90"
                        value={startDate}
                        onChangeText={setStartDate}
                      />
                    </View>
                  )}

                  {formError ? <Text style={styles.formErrorText}>{formError}</Text> : null}

                  <View style={styles.modalButtonRow}>
                    <TouchableOpacity
                      style={styles.modalCancelButton}
                      activeOpacity={0.7}
                      onPress={() => setModalVisible(false)}
                    >
                      <Text style={styles.modalCancelText}>ยกเลิก</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalSaveButton, submitting && styles.modalSaveButtonDisabled]}
                      activeOpacity={0.85}
                      disabled={submitting}
                      onPress={handleCreate}
                    >
                      {submitting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.modalSaveText}>บันทึกโค้ด</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
    backgroundColor: "#F0E9DC",
  },

  pageHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },

  eyebrow: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#7F562B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
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

  createButton: {
    backgroundColor: "#6F4E37",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  createButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  statBanner: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#F6F3EE",
    borderRadius: 14,
    padding: 8,
    marginBottom: 14,
  },

  statCell: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },

  statCellLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  statDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2D6A4F",
  },

  statCellLabel: {
    fontSize: 10,
    color: "#8A7D75",
    fontWeight: "600",
    marginBottom: 3,
  },

  statCellValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2B2118",
  },

  statCellUnit: {
    fontSize: 9.5,
    color: "#8A7D75",
  },

  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },

  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F0EDE9",
  },

  filterChipActive: {
    backgroundColor: "#3D2619",
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
    padding: 14,
    marginBottom: 12,
    position: "relative",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  cardExpired: {
    backgroundColor: "#F6F3EE",
    opacity: 0.85,
  },

  notchLeft: {
    position: "absolute",
    left: -8,
    top: "50%",
    marginTop: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#F0E9DC",
  },

  notchRight: {
    position: "absolute",
    right: -8,
    top: "50%",
    marginTop: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#F0E9DC",
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },

  cardTopLeft: {
    flexDirection: "row",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },

  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FEC793",
    alignItems: "center",
    justifyContent: "center",
  },

  iconCircleExpired: {
    backgroundColor: "#E5E2DD",
  },

  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },

  codeText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#2B2118",
    letterSpacing: 0.3,
  },

  codeTextExpired: {
    color: "#8A7D75",
    textDecorationLine: "line-through",
  },

  seasonBadge: {
    backgroundColor: "#F0EDE9",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },

  seasonBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#4A3B32",
  },

  expiredBadge: {
    backgroundColor: "#FBDCDC",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },

  expiredBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#A82424",
  },

  discountLine: {
    fontSize: 12.5,
    color: "#4A3B32",
    marginTop: 3,
  },

  conditionLine: {
    fontSize: 11,
    color: "#8A7D75",
    marginTop: 1,
  },

  usageBox: {
    backgroundColor: "#F6F3EE",
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    gap: 6,
  },

  usageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  usageLabel: {
    fontSize: 11,
    color: "#4A3B32",
    fontWeight: "600",
  },

  usageValue: {
    fontSize: 11,
    fontWeight: "800",
    color: "#2B2118",
  },

  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E5E2DD",
    overflow: "hidden",
  },

  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#7F562B",
  },

  progressFillExpired: {
    backgroundColor: "#A79A90",
  },

  usageFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  usageFooterText: {
    fontSize: 10.5,
    color: "#8A7D75",
  },

  usageFooterHighlight: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#D97706",
  },

  usageFooterHighlightMuted: {
    color: "#8A7D75",
  },

  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 10,
  },

  actionButton: {
    backgroundColor: "#F0EDE9",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  actionButtonText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#4A3B32",
  },

  actionButtonTextDanger: {
    color: "#C53030",
  },

  buttonInlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(20, 20, 24, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  modalCard: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "85%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
  },

  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2B2118",
  },

  modalCloseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F0EDE9",
    alignItems: "center",
    justifyContent: "center",
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#3D2619",
    marginBottom: 6,
    marginTop: 12,
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
    borderColor: "#E8DFD8",
    backgroundColor: "#FFFFFF",
  },

  presetChipSelected: {
    backgroundColor: "#3D2619",
    borderColor: "#3D2619",
  },

  presetIcon: {
    fontSize: 13,
  },

  presetLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4A3B32",
  },

  presetLabelSelected: {
    color: "#FFFFFF",
  },

  input: {
    backgroundColor: "#F6F3EE",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 13.5,
    color: "#2B2118",
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
    borderColor: "#E8DFD8",
    alignItems: "center",
  },

  typeChipSelected: {
    backgroundColor: "#3D2619",
    borderColor: "#3D2619",
  },

  typeChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4A3B32",
  },

  typeChipTextSelected: {
    color: "#FFFFFF",
  },

  advancedToggle: {
    marginTop: 12,
    paddingVertical: 4,
  },

  advancedToggleText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#7F562B",
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
    color: "#C53030",
    marginTop: 12,
  },

  modalButtonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },

  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#F0EDE9",
    alignItems: "center",
  },

  modalCancelText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#4A3B32",
  },

  modalSaveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#6F4E37",
    alignItems: "center",
  },

  modalSaveButtonDisabled: {
    opacity: 0.6,
  },

  modalSaveText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
