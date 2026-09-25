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
import Icon from "./components/Icon";

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

const CLAIM_REASONS: { value: ClaimReason; label: string; icon: string }[] = [
  { value: "damaged", label: "สินค้าชำรุด/เสียหาย", icon: "inventory_2" },
  { value: "wrong_item", label: "ส่งผิดรายการ", icon: "swap_horiz" },
  { value: "missing_item", label: "สินค้าไม่ครบ", icon: "unarchive" },
  { value: "not_as_described", label: "ไม่ตรงตามที่สั่ง", icon: "search" },
  { value: "fake", label: "สงสัยสินค้าปลอม", icon: "warning" },
  { value: "other", label: "อื่นๆ", icon: "edit" },
];

const STATUS_META: Record<
  ClaimStatus,
  { label: string; bg: string; color: string }
> = {
  pending: { label: "รอตรวจสอบ", bg: "#FBEFDD", color: "#D97706" },
  approved: { label: "อนุมัติแล้ว", bg: "#E4ECFB", color: "#1A56C4" },
  rejected: { label: "ถูกปฏิเสธ", bg: "#FBE7E6", color: "#C53030" },
  completed: { label: "ดำเนินการเสร็จสิ้น", bg: "#E3F3E7", color: "#2D6A4F" },
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
          <ActivityIndicator size="large" color="#3D2619" />
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
                    ● {meta.label}
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
              <ActivityIndicator size="large" color="#3D2619" />
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
          <Icon name="check" size={30} color="#FFFFFF" weight={700} />
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
      <View style={styles.stepIndicatorRow}>
        <View style={styles.stepDone}>
          <Icon name="check" size={12} color="#FFFFFF" weight={700} />
        </View>
        <View style={styles.stepLineDone} />
        <View style={styles.stepActive}>
          <Text style={styles.stepActiveText}>2</Text>
        </View>
        <View style={styles.stepLine} />
        <View style={styles.stepPending}>
          <Text style={styles.stepPendingText}>3</Text>
        </View>
      </View>
      <View style={styles.stepLabelRow}>
        <Text style={styles.stepLabelDone}>เลือกสินค้า</Text>
        <Text style={styles.stepLabelActive}>กรอกข้อมูล</Text>
        <Text style={styles.stepLabelPending}>รอตรวจสอบ</Text>
      </View>

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
            <Icon name={r.icon} size={16} color={reason === r.value ? "#FFFFFF" : "#3D2619"} />
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
      <View style={styles.sectionLabelRow}>
        <Text style={styles.sectionLabel}>รายละเอียดปัญหา *</Text>
        <Text style={styles.charCounter}>{description.length}/300</Text>
      </View>

      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="อธิบายปัญหาที่พบ เช่น สินค้าแตกร้าวบริเวณไหน สังเกตเห็นตอนไหน..."
        value={description}
        onChangeText={(text) => setDescription(text.slice(0, 300))}
        multiline
        numberOfLines={5}
        maxLength={300}
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
    backgroundColor: "#F0E9DC",
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
    backgroundColor: "#F0E9DC",
  },

  list: {
    padding: 16,
    flexGrow: 1,
    backgroundColor: "#F0E9DC",
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
    color: "#8A7D75",
  },

  tabTextActive: {
    color: "#3D2619",
  },

  pickTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#3D2619",
    marginBottom: 12,
  },

  pickCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8DFD8",
    padding: 14,
    marginBottom: 12,
  },

  orderId: {
    fontSize: 14,
    fontWeight: "700",
    color: "#3D2619",
    marginBottom: 6,
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#F0EDE9",
  },

  itemName: {
    fontSize: 13,
    color: "#4A3B32",
    flex: 1,
    paddingRight: 8,
  },

  itemArrow: {
    fontSize: 18,
    color: "#8A7D75",
  },

  claimCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8DFD8",
    padding: 16,
    marginBottom: 8,
  },

  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3D2619",
    marginBottom: 12,
  },

  label: {
    fontSize: 12,
    color: "#8A7D75",
    marginBottom: 4,
  },

  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3D2619",
  },

  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#3D2619",
    marginTop: 18,
    marginBottom: 8,
  },

  sectionLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  charCounter: {
    fontSize: 11,
    color: "#8A7D75",
  },

  stepIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    marginTop: 4,
  },

  stepDone: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#3D2619",
    alignItems: "center",
    justifyContent: "center",
  },

  stepDoneText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  stepActive: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#3D2619",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  stepActiveText: {
    color: "#3D2619",
    fontSize: 12,
    fontWeight: "700",
  },

  stepPending: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#E8DFD8",
    alignItems: "center",
    justifyContent: "center",
  },

  stepPendingText: {
    color: "#8A7D75",
    fontSize: 12,
    fontWeight: "700",
  },

  stepLineDone: {
    flex: 1,
    height: 2,
    backgroundColor: "#3D2619",
  },

  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#E8DFD8",
  },

  stepLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  stepLabelDone: {
    fontSize: 10.5,
    color: "#3D2619",
    fontWeight: "600",
  },

  stepLabelActive: {
    fontSize: 10.5,
    color: "#3D2619",
    fontWeight: "700",
  },

  stepLabelPending: {
    fontSize: 10.5,
    color: "#8A7D75",
  },

  reasonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  reasonChip: {
    width: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E8DFD8",
    backgroundColor: "#FFFFFF",
  },

  reasonChipIcon: {
    fontSize: 16,
  },

  reasonChipSelected: {
    backgroundColor: "#F7F1EC",
    borderColor: "#3D2619",
  },

  reasonChipText: {
    fontSize: 12.5,
    color: "#4A3B32",
    fontWeight: "600",
    flexShrink: 1,
  },

  reasonChipTextSelected: {
    color: "#3D2619",
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8DFD8",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#2B2118",
  },

  textArea: {
    minHeight: 110,
    paddingTop: 12,
  },

  formError: {
    fontSize: 13,
    color: "#C53030",
    marginTop: 14,
  },

  primaryButton: {
    backgroundColor: "#3D2619",
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
    color: "#4A3B32",
    fontSize: 13,
    fontWeight: "600",
  },

  error: {
    fontSize: 14,
    color: "#C53030",
    textAlign: "center",
  },

  emptyText: {
    fontSize: 14,
    color: "#8A7D75",
  },

  // ===== ประวัติการเคลม =====
  claimListCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8DFD8",
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
    color: "#4A3B32",
    marginTop: 6,
    fontWeight: "600",
  },

  claimDescText: {
    fontSize: 12.5,
    color: "#50453E",
    marginTop: 4,
    lineHeight: 18,
  },

  adminNoteBox: {
    backgroundColor: "#F6F3EE",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },

  adminNoteLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8A7D75",
    marginBottom: 2,
  },

  adminNoteText: {
    fontSize: 12.5,
    color: "#2B2118",
  },

  claimDate: {
    fontSize: 11,
    color: "#8A7D75",
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
    color: "#2D6A4F",
    fontWeight: "700",
  },

  successTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#3D2619",
    marginBottom: 8,
  },

  successSubtitle: {
    fontSize: 13,
    color: "#50453E",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
});
