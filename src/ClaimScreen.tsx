import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  ClaimReason,
  ClaimRecord,
  ClaimStatus,
  fetchMyClaims,
  fetchMyOrders,
  submitClaim,
} from "./api";

interface ClaimOrderItem {
  product_id: number;
  product_name: string;
  price: number;
  quantity: number;
}

interface ClaimOrder {
  id: number;
  total_amount: number;
  status?: "pending" | "shipping" | "delivered" | "cancelled";
  created_at: string;
  items: ClaimOrderItem[];
}

interface ClaimScreenProps {
  // ถ้าส่งมาจากปุ่ม "เคลมสินค้า" ในหน้า Orders จะข้ามหน้าเลือกไปที่ฟอร์มเคลมเลย
  // ถ้าไม่ส่งมา (เช่น กดจาก navbar) จะให้เลือกออเดอร์/สินค้าในหน้านี้แทน
  order?: ClaimOrder;
  item?: ClaimOrderItem;
}

// ให้หน้าอื่น (เช่น top bar ปุ่ม "← กลับ") เรียก goBack() ผ่าน ref ได้
// คืนค่า true = จัดการ "ย้อนกลับ" ภายในหน้านี้แล้ว (เช่น จากฟอร์ม กลับไปหน้าเลือกสินค้า)
// คืนค่า false = ไม่มีอะไรให้ย้อนในหน้านี้แล้ว ให้ผู้เรียก (หน้าหลัก) จัดการออกจากหน้านี้เอง
export interface ClaimScreenHandle {
  goBack: () => boolean;
}

// ใช้ pattern เดียวกับ OrdersScreen.tsx: ถ้ายังไม่มีคอลัมน์ status ใน DB
// ให้จำลองจากอายุออเดอร์ไปก่อน (เคลมได้เฉพาะออเดอร์ที่ "จัดส่งสำเร็จ" แล้ว)
function isDelivered(order: ClaimOrder) {
  if (order.status) {
    return order.status === "delivered";
  }

  const hoursSince =
    (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60);

  return hoursSince >= 24;
}

const CLAIM_REASONS: { value: ClaimReason; label: string }[] = [
  { value: "damaged", label: "สินค้าชำรุด / เสียหาย" },
  { value: "wrong_item", label: "ได้รับสินค้าผิดรายการ" },
  { value: "missing_item", label: "สินค้าไม่ครบ / ขาดอุปกรณ์" },
  { value: "not_as_described", label: "สินค้าไม่ตรงตามที่สั่ง" },
  { value: "fake", label: "สงสัยว่าเป็นสินค้าปลอม" },
  { value: "other", label: "อื่นๆ" },
];

const STATUS_META: Record<
  ClaimStatus,
  { label: string; bg: string; color: string }
> = {
  pending: { label: "รอตรวจสอบ", bg: "#FBEFDD", color: "#B26A00" },
  approved: { label: "อนุมัติแล้ว", bg: "#E4ECFB", color: "#1A56C4" },
  rejected: { label: "ถูกปฏิเสธ", bg: "#FBE7E6", color: "#B3413E" },
  completed: { label: "ดำเนินการเสร็จสิ้น", bg: "#E3F3E7", color: "#1E8E3E" },
};

type ClaimSelection = { order: ClaimOrder; item: ClaimOrderItem } | null;
type ClaimView = "pick" | "history" | "form" | "success";

const ClaimScreen = forwardRef<ClaimScreenHandle, ClaimScreenProps>(function ClaimScreen(
  { order: initialOrder, item: initialItem },
  ref
) {
  const cameFromOrders = Boolean(initialOrder && initialItem);

  const [selected, setSelected] = useState<ClaimSelection>(
    cameFromOrders ? { order: initialOrder!, item: initialItem! } : null
  );
  const [view, setView] = useState<ClaimView>(cameFromOrders ? "form" : "pick");

  // ===== รายการออเดอร์ (สำหรับหน้าเลือกสินค้าที่จะเคลม) =====
  const [orders, setOrders] = useState<ClaimOrder[]>([]);
  const [loading, setLoading] = useState(!cameFromOrders);
  const [error, setError] = useState("");

  // ===== ฟอร์มเคลม =====
  const [reason, setReason] = useState<ClaimReason | null>(null);
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [lastClaimId, setLastClaimId] = useState<number | null>(null);

  // ===== ประวัติการเคลม =====
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimsError, setClaimsError] = useState("");

  useEffect(() => {
    // มี order/item ส่งมาจากหน้า Orders อยู่แล้ว ไม่ต้องโหลดลิสต์
    if (cameFromOrders) return;
    if (view !== "pick") return;

    (async () => {
      try {
        setLoading(true);
        const data = await fetchMyOrders();
        setOrders(data);
      } catch (err: any) {
        console.error("Load orders for claim error:", err);
        setError(err.message || "ไม่สามารถโหลดประวัติการสั่งซื้อได้");
      } finally {
        setLoading(false);
      }
    })();
  }, [view, cameFromOrders]);

  const loadClaims = async () => {
    try {
      setClaimsLoading(true);
      setClaimsError("");
      const data = await fetchMyClaims();
      setClaims(data);
    } catch (err: any) {
      console.error("Load claims error:", err);
      setClaimsError(err.message || "ไม่สามารถโหลดประวัติการเคลมได้");
    } finally {
      setClaimsLoading(false);
    }
  };

  useEffect(() => {
    if (view === "history") {
      loadClaims();
    }
  }, [view]);

  const resetForm = () => {
    setReason(null);
    setDescription("");
    setImageUrl("");
    setContactPhone("");
    setFormError("");
  };

  const handleSubmitClaim = async () => {
    if (!selected) return;

    if (!reason) {
      setFormError("กรุณาเลือกเหตุผลในการเคลม");
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      setFormError("กรุณาอธิบายรายละเอียดปัญหาอย่างน้อย 10 ตัวอักษร");
      return;
    }

    setFormError("");
    setSubmitting(true);

    try {
      const result = await submitClaim({
        order_id: selected.order.id,
        product_id: selected.item.product_id,
        product_name: selected.item.product_name,
        quantity: selected.item.quantity,
        reason,
        description: description.trim(),
        image_url: imageUrl.trim() || undefined,
        contact_phone: contactPhone.trim() || undefined,
      });

      setLastClaimId(result.data?.id ?? null);
      setView("success");
    } catch (err: any) {
      console.error("Submit claim error:", err);
      setFormError(err.message || "ไม่สามารถส่งคำขอเคลมได้ กรุณาลองใหม่");
    } finally {
      setSubmitting(false);
    }
  };

  // เปิดให้หน้าหลัก (ปุ่ม "← กลับ" บน top bar) เรียก goBack() ของหน้านี้ก่อน
  // ถ้าย้อนกลับภายในหน้านี้ได้ (เช่น จากฟอร์ม/ประวัติ กลับไปหน้าเลือกสินค้า) ให้จัดการเอง
  // ถ้าอยู่หน้าแรกสุดของ flow นี้แล้ว (เลือกสินค้า หรือฟอร์มที่มาจาก Orders ตรงๆ)
  // ให้คืน false เพื่อบอกหน้าหลักว่าต้องออกจากหน้านี้ไปเลย
  useImperativeHandle(ref, () => ({
    goBack: () => {
      if (view === "history") {
        setView("pick");
        return true;
      }

      if (view === "form" && !cameFromOrders) {
        setView("pick");
        return true;
      }

      return false;
    },
  }));

  // ===== หน้าเลือกออเดอร์/สินค้าที่จะเคลม (กรณีเข้ามาตรงๆ จาก navbar) =====
  if (view === "pick") {
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
        </View>
      );
    }

    const deliveredOrders = orders.filter(isDelivered);

    return (
      <FlatList
        data={deliveredOrders}
        keyExtractor={(o) => String(o.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <View style={styles.tabRow}>
              <View style={[styles.tabButton, styles.tabButtonActive]}>
                <Text style={[styles.tabText, styles.tabTextActive]}>
                  เคลมสินค้าใหม่
                </Text>
              </View>

              <TouchableOpacity
                style={styles.tabButton}
                activeOpacity={0.7}
                onPress={() => setView("history")}
              >
                <Text style={styles.tabText}>ประวัติการเคลม</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.pickTitle}>เลือกสินค้าที่ต้องการเคลม</Text>
          </View>
        }
        renderItem={({ item: o }) => (
          <View style={styles.pickCard}>
            <Text style={styles.orderId}>คำสั่งซื้อ #{o.id}</Text>

            {o.items.map((it, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.itemRow}
                activeOpacity={0.6}
                onPress={() => {
                  setSelected({ order: o, item: it });
                  resetForm();
                  setView("form");
                }}
              >
                <Text style={styles.itemName} numberOfLines={1}>
                  {it.product_name} × {it.quantity}
                </Text>

                <Text style={styles.itemArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              ยังไม่มีสินค้าที่จัดส่งสำเร็จให้เคลม
            </Text>
          </View>
        }
      />
    );
  }

  // ===== ประวัติการเคลมของฉัน =====
  if (view === "history") {
    return (
      <FlatList
        data={claims}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={styles.tabButton}
              activeOpacity={0.7}
              onPress={() => setView("pick")}
            >
              <Text style={styles.tabText}>เคลมสินค้าใหม่</Text>
            </TouchableOpacity>

            <View style={[styles.tabButton, styles.tabButtonActive]}>
              <Text style={[styles.tabText, styles.tabTextActive]}>
                ประวัติการเคลม
              </Text>
            </View>
          </View>
        }
        renderItem={({ item: c }) => {
          const meta = STATUS_META[c.status];
          const reasonLabel =
            CLAIM_REASONS.find((r) => r.value === c.reason)?.label ??
            c.reason;

          return (
            <View style={styles.claimListCard}>
              <View style={styles.claimListHeader}>
                <Text style={styles.orderId}>
                  คำสั่งซื้อ #{c.order_id} · เคลม #{c.id}
                </Text>

                <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: meta.color }]}>
                    {meta.label}
                  </Text>
                </View>
              </View>

              <Text style={styles.productName}>
                {c.product_name} × {c.quantity}
              </Text>

              <Text style={styles.claimReasonText}>เหตุผล: {reasonLabel}</Text>
              <Text style={styles.claimDescText} numberOfLines={3}>
                {c.description}
              </Text>

              {c.admin_note ? (
                <View style={styles.adminNoteBox}>
                  <Text style={styles.adminNoteLabel}>หมายเหตุจากร้าน</Text>
                  <Text style={styles.adminNoteText}>{c.admin_note}</Text>
                </View>
              ) : null}

              <Text style={styles.claimDate}>
                ส่งคำขอเมื่อ{" "}
                {new Date(c.created_at).toLocaleDateString("th-TH", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          claimsLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#111111" />
            </View>
          ) : claimsError ? (
            <View style={styles.center}>
              <Text style={styles.error}>{claimsError}</Text>
            </View>
          ) : (
            <View style={styles.center}>
              <Text style={styles.emptyText}>ยังไม่มีประวัติการเคลม</Text>
            </View>
          )
        }
      />
    );
  }

  // ===== หน้าสำเร็จ =====
  if (view === "success" && selected) {
    return (
      <View style={styles.center}>
        <View style={styles.successIconCircle}>
          <Text style={styles.successIcon}>✓</Text>
        </View>

        <Text style={styles.successTitle}>ส่งคำขอเคลมสำเร็จ</Text>

        <Text style={styles.successSubtitle}>
          {lastClaimId ? `หมายเลขคำขอเคลม #${lastClaimId}\n` : ""}
          ทีมงานจะตรวจสอบและติดต่อกลับภายใน 1-3 วันทำการ
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.8}
          onPress={() => setView("history")}
        >
          <Text style={styles.primaryButtonText}>ดูสถานะการเคลม</Text>
        </TouchableOpacity>

        {!cameFromOrders && (
          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.7}
            onPress={() => {
              setSelected(null);
              resetForm();
              setView("pick");
            }}
          >
            <Text style={styles.secondaryButtonText}>เคลมสินค้าอื่นเพิ่ม</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // ===== ฟอร์มเคลม (แบบเต็ม) =====
  if (!selected) return null;

  const { order, item } = selected;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.formContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.claimCard}>
        <Text style={styles.title}>เคลมสินค้า</Text>

        <Text style={styles.label}>คำสั่งซื้อ #{order.id}</Text>
        <Text style={styles.productName}>
          {item.product_name} × {item.quantity}
        </Text>
      </View>

      {/* เหตุผลในการเคลม */}
      <Text style={styles.sectionLabel}>เหตุผลในการเคลม *</Text>

      <View style={styles.reasonGrid}>
        {CLAIM_REASONS.map((r) => (
          <TouchableOpacity
            key={r.value}
            style={[
              styles.reasonChip,
              reason === r.value && styles.reasonChipSelected,
            ]}
            activeOpacity={0.7}
            onPress={() => setReason(r.value)}
          >
            <Text
              style={[
                styles.reasonChipText,
                reason === r.value && styles.reasonChipTextSelected,
              ]}
            >
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* รายละเอียดปัญหา */}
      <Text style={styles.sectionLabel}>รายละเอียดปัญหา *</Text>

      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="อธิบายปัญหาที่พบ เช่น สินค้าแตกร้าวบริเวณไหน สังเกตเห็นตอนไหน..."
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={5}
        textAlignVertical="top"
      />

      {/* รูปภาพประกอบ */}
      <Text style={styles.sectionLabel}>ลิงก์รูปภาพประกอบ (ถ้ามี)</Text>

      <TextInput
        style={styles.input}
        placeholder="https://... รูปสินค้าที่มีปัญหา"
        value={imageUrl}
        onChangeText={setImageUrl}
        autoCapitalize="none"
      />

      {/* เบอร์ติดต่อกลับ */}
      <Text style={styles.sectionLabel}>เบอร์ติดต่อกลับ (ถ้ามี)</Text>

      <TextInput
        style={styles.input}
        placeholder="เช่น 08x-xxx-xxxx"
        value={contactPhone}
        onChangeText={setContactPhone}
        keyboardType="phone-pad"
      />

      {formError ? <Text style={styles.formError}>{formError}</Text> : null}

      <TouchableOpacity
        style={[styles.primaryButton, submitting && styles.buttonDisabled]}
        activeOpacity={0.8}
        onPress={handleSubmitClaim}
        disabled={submitting}
      >
        <Text style={styles.primaryButtonText}>
          {submitting ? "กำลังส่งคำขอ..." : "ส่งคำขอเคลม"}
        </Text>
      </TouchableOpacity>

      {!cameFromOrders && (
        <TouchableOpacity
          style={styles.secondaryButton}
          activeOpacity={0.7}
          onPress={() => {
            setSelected(null);
            resetForm();
            setView("pick");
          }}
        >
          <Text style={styles.secondaryButtonText}>‹ เลือกสินค้าอื่น</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
});

export default ClaimScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },

  formContent: {
    padding: 16,
    paddingBottom: 40,
  },

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

  tabRow: {
    flexDirection: "row",
    backgroundColor: "#EFEEEA",
    borderRadius: 10,
    padding: 4,
    marginBottom: 18,
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

  pickTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 12,
  },

  pickCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EDEDED",
    padding: 14,
    marginBottom: 12,
  },

  orderId: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 6,
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F1F1",
  },

  itemName: {
    fontSize: 13,
    color: "#4A4A4A",
    flex: 1,
    paddingRight: 8,
  },

  itemArrow: {
    fontSize: 18,
    color: "#B0B0B0",
  },

  claimCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EDEDED",
    padding: 16,
    marginBottom: 8,
  },

  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 12,
  },

  label: {
    fontSize: 12,
    color: "#8A8A8A",
    marginBottom: 4,
  },

  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111111",
  },

  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111111",
    marginTop: 18,
    marginBottom: 8,
  },

  reasonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  reasonChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E3DC",
    backgroundColor: "#FFFFFF",
  },

  reasonChipSelected: {
    backgroundColor: "#111111",
    borderColor: "#111111",
  },

  reasonChipText: {
    fontSize: 12.5,
    color: "#4A4A4A",
    fontWeight: "600",
  },

  reasonChipTextSelected: {
    color: "#FFFFFF",
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E3DC",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#2B2B31",
  },

  textArea: {
    minHeight: 110,
    paddingTop: 12,
  },

  formError: {
    fontSize: 13,
    color: "#B3413E",
    marginTop: 14,
  },

  primaryButton: {
    backgroundColor: "#111111",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 22,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  secondaryButton: {
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },

  secondaryButtonText: {
    color: "#4A4A4A",
    fontSize: 13,
    fontWeight: "600",
  },

  error: {
    fontSize: 14,
    color: "#B3413E",
    textAlign: "center",
  },

  emptyText: {
    fontSize: 14,
    color: "#8A8A8A",
  },

  // ===== ประวัติการเคลม =====
  claimListCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EDEDED",
    padding: 14,
    marginBottom: 12,
  },

  claimListHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },

  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },

  claimReasonText: {
    fontSize: 12.5,
    color: "#4A4A4A",
    marginTop: 6,
    fontWeight: "600",
  },

  claimDescText: {
    fontSize: 12.5,
    color: "#6B6B74",
    marginTop: 4,
    lineHeight: 18,
  },

  adminNoteBox: {
    backgroundColor: "#F7F6F3",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },

  adminNoteLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8A8A8A",
    marginBottom: 2,
  },

  adminNoteText: {
    fontSize: 12.5,
    color: "#2B2B31",
  },

  claimDate: {
    fontSize: 11,
    color: "#B0B0B0",
    marginTop: 10,
  },

  // ===== หน้าสำเร็จ =====
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E3F3E7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  successIcon: {
    fontSize: 30,
    color: "#1E8E3E",
    fontWeight: "700",
  },

  successTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 8,
  },

  successSubtitle: {
    fontSize: 13,
    color: "#6B6B74",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
});
