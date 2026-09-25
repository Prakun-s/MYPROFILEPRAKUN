import { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ClaimReason, ClaimRecord, ClaimStatus, fetchAllClaims, updateClaimStatus } from "./api";
import Icon from "./components/Icon";
import Toast from "./components/Toast";

interface Props {
  // เปิดหน้าออเดอร์ (แอดมิน) พร้อมกรองไปที่เลขออเดอร์นี้ทันที ใช้กับลิงก์ "ดูคำสั่งซื้อ"
  onOpenOrder?: (orderId: number) => void;
}

// ชื่อไอคอนตาม Material Symbols ligature
const REASON_META: Record<ClaimReason, { label: string; icon: string }> = {
  damaged: { label: "สินค้าชำรุด / แตกหักจากการขนส่ง", icon: "broken_image" },
  wrong_item: { label: "ได้รับสินค้าผิดรายการ", icon: "swap_horiz" },
  missing_item: { label: "สินค้าไม่ครบ / ขาดอุปกรณ์", icon: "inbox" },
  not_as_described: { label: "สินค้าไม่ตรงตามที่สั่ง", icon: "sync_problem" },
  fake: { label: "สงสัยว่าเป็นสินค้าปลอม", icon: "help" },
  other: { label: "อื่นๆ", icon: "more_horiz" },
};

const STATUS_META: Record<ClaimStatus, { label: string; dot: string; bg: string; fg: string }> = {
  pending: { label: "รอตรวจสอบ", dot: "#D97706", bg: "#FCE9CB", fg: "#95590A" },
  approved: { label: "อนุมัติแล้ว", dot: "#2D6A4F", bg: "#DCEEE5", fg: "#215C41" },
  rejected: { label: "ปฏิเสธคำร้อง", dot: "#C53030", bg: "#FBDCDC", fg: "#A82424" },
  completed: { label: "เสร็จสิ้น", dot: "#1A56C4", bg: "#DCE6FB", fg: "#1A56C4" },
};

const FILTER_OPTIONS: { value: ClaimStatus | "all"; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "pending", label: "รอตรวจสอบ" },
  { value: "approved", label: "อนุมัติแล้ว" },
  { value: "rejected", label: "ปฏิเสธ" },
  { value: "completed", label: "เสร็จสิ้น" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric" as const,
    hour: "2-digit",
    minute: "2-digit",
  });
}

type DecisionKind = "approve_replace" | "approve_refund" | "reject";

interface PendingDecision {
  claim: ClaimRecord;
  kind: DecisionKind;
}

const DECISION_META: Record<
  DecisionKind,
  { title: string; confirmLabel: string; defaultNote: string; status: ClaimStatus; destructive?: boolean }
> = {
  approve_replace: {
    title: "อนุมัติเคลม (ส่งสินค้าใหม่)",
    confirmLabel: "ยืนยันอนุมัติ",
    defaultNote: "ส่งสินค้าทดแทนให้ลูกค้าใหม่",
    status: "approved",
  },
  approve_refund: {
    title: "คืนเงินให้ลูกค้า",
    confirmLabel: "ยืนยันคืนเงิน",
    defaultNote: "คืนเงินให้ลูกค้าเต็มจำนวน",
    status: "approved",
  },
  reject: {
    title: "ปฏิเสธคำร้อง",
    confirmLabel: "ยืนยันปฏิเสธ",
    defaultNote: "",
    status: "rejected",
    destructive: true,
  },
};

// หน้าจัดการคำขอเคลมสำหรับ admin: ดูคำขอเคลมทั้งร้าน + ตัดสินใจอนุมัติ/คืนเงิน/ปฏิเสธได้จริง
// (บันทึกผ่าน PUT /api/admin/claims/:id/status พร้อมบันทึกเหตุผล/หมายเหตุลง admin_note)
export default function AdminClaimsScreen({ onOpenOrder }: Props) {
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<ClaimStatus | "all">("all");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [pendingDecision, setPendingDecision] = useState<PendingDecision | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastTone, setToastTone] = useState<"info" | "warning">("info");

  const load = async () => {
    try {
      setError("");
      const data = await fetchAllClaims();
      setClaims(data);
    } catch (err: any) {
      console.error("Load all claims error:", err);
      setError(err.message || "ไม่สามารถโหลดรายการเคลมได้");
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

  const applyStatus = async (claim: ClaimRecord, status: ClaimStatus, note?: string) => {
    const previous = { status: claim.status, admin_note: claim.admin_note };

    setClaims((prev) =>
      prev.map((c) =>
        c.id === claim.id
          ? { ...c, status, admin_note: note !== undefined ? note : c.admin_note }
          : c
      )
    );
    setUpdatingId(claim.id);

    try {
      await updateClaimStatus(claim.id, status, note !== undefined ? note : claim.admin_note || undefined);

      const label = STATUS_META[status]?.label ?? status;
      notify(`อัปเดตคำขอเคลม #CLM-${claim.id} เป็น "${label}" แล้ว`);
    } catch (err: any) {
      console.error("Update claim status error:", err);

      setClaims((prev) =>
        prev.map((c) =>
          c.id === claim.id ? { ...c, status: previous.status, admin_note: previous.admin_note } : c
        )
      );

      notify(err.message || "อัปเดตสถานะไม่สำเร็จ", "warning");
    } finally {
      setUpdatingId(null);
    }
  };

  const openDecision = (claim: ClaimRecord, kind: DecisionKind) => {
    setPendingDecision({ claim, kind });
    setNoteDraft(DECISION_META[kind].defaultNote);
  };

  const confirmDecision = () => {
    if (!pendingDecision) return;
    const { claim, kind } = pendingDecision;
    const meta = DECISION_META[kind];

    applyStatus(claim, meta.status, noteDraft.trim());
    setPendingDecision(null);
    setNoteDraft("");
  };

  const handleMarkCompleted = (claim: ClaimRecord) => {
    applyStatus(claim, "completed");
  };

  const filteredClaims = useMemo(() => {
    if (filter === "all") return claims;
    return claims.filter((c) => c.status === filter);
  }, [claims, filter]);

  const countByStatus = useMemo(() => {
    const counts: Record<string, number> = { all: claims.length };
    (["pending", "approved", "rejected", "completed"] as ClaimStatus[]).forEach((status) => {
      counts[status] = claims.filter((c) => c.status === status).length;
    });
    return counts;
  }, [claims]);

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
    <View style={{ flex: 1 }}>
      <FlatList
        data={filteredClaims}
        keyExtractor={(claim) => String(claim.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <View style={styles.pageHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pageTitle}>จัดการคำร้องเคลมสินค้า</Text>
                <Text style={styles.pageSubtitle}>Customer Return &amp; Claim Requests</Text>
              </View>

              {countByStatus.pending > 0 && (
                <View style={styles.pendingBadge}>
                  <View style={styles.pendingDot} />
                  <Text style={styles.pendingBadgeText}>
                    รอตรวจ {countByStatus.pending} เคส
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.statRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>เคลมทั้งหมด</Text>
                <Text style={styles.statValue}>{countByStatus.all}</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={[styles.statLabel, { color: "#D97706" }]}>รอตรวจสอบ</Text>
                <Text style={[styles.statValue, { color: "#D97706" }]}>
                  {countByStatus.pending}
                </Text>
              </View>

              <View style={styles.statCard}>
                <Text style={[styles.statLabel, { color: "#2D6A4F" }]}>อนุมัติแล้ว</Text>
                <Text style={[styles.statValue, { color: "#2D6A4F" }]}>
                  {countByStatus.approved}
                </Text>
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
                    {option.label} ({countByStatus[option.value] ?? 0})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        renderItem={({ item: claim }) => {
          const statusMeta = STATUS_META[claim.status];
          const reasonMeta = REASON_META[claim.reason] ?? REASON_META.other;
          const disabled = updatingId === claim.id;

          return (
            <View style={styles.card}>
              {/* หัวการ์ด: รหัสเคลม + สถานะ */}
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.claimIdRow}>
                    <Text style={styles.claimId}>#CLM-{claim.id}</Text>
                    <View style={[styles.statusPill, { backgroundColor: statusMeta.bg }]}>
                      <View style={[styles.statusDot, { backgroundColor: statusMeta.dot }]} />
                      <Text style={[styles.statusPillText, { color: statusMeta.fg }]}>
                        {statusMeta.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.claimMeta}>
                    {claim.status === "pending"
                      ? `ส่งคำร้องเมื่อ: ${formatDate(claim.created_at)}`
                      : claim.status === "rejected"
                      ? `ปิดเคสเมื่อ: ${formatDate(claim.updated_at || claim.created_at)}`
                      : `อัปเดตเมื่อ: ${formatDate(claim.updated_at || claim.created_at)}`}
                  </Text>
                </View>

                <Text style={styles.orderRefText}>#PK-{String(claim.order_id).padStart(6, "0")}</Text>
              </View>

              {/* ผู้ยื่นคำร้อง + ลิงก์ไปดูออเดอร์จริง */}
              <View style={styles.customerBanner}>
                <View style={styles.customerLeft}>
                  <View style={styles.avatarCircle}>
                    <Icon name="person" size={14} color="#7F562B" />
                  </View>
                  <View style={{ minWidth: 0 }}>
                    <Text style={styles.customerName} numberOfLines={1}>
                      {claim.username || "ไม่ทราบชื่อผู้ใช้"}
                    </Text>
                    <Text style={styles.customerOrderRef}>
                      ออเดอร์ #{claim.order_id}
                    </Text>
                  </View>
                </View>

                {onOpenOrder && (
                  <TouchableOpacity
                    style={styles.viewOrderLink}
                    activeOpacity={0.7}
                    onPress={() => onOpenOrder(claim.order_id)}
                  >
                    <Text style={styles.viewOrderLinkText}>ดูคำสั่งซื้อ ›</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* สินค้าที่ถูกเคลม */}
              <View style={styles.productRow}>
                <View style={styles.productIcon}>
                  <Icon name="inventory_2" size={16} color="#7F562B" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.productName} numberOfLines={1}>
                    {claim.product_name}
                  </Text>
                  <Text style={styles.productQty}>จำนวน: {claim.quantity} ชิ้น</Text>
                </View>
              </View>

              {/* หมวดปัญหา + รายละเอียดจากลูกค้า */}
              <View style={styles.issueBox}>
                <View style={styles.issueHeaderRow}>
                  <Icon name={reasonMeta.icon} size={15} color="#4A3B32" />
                  <Text style={styles.issueLabel}>{reasonMeta.label}</Text>
                </View>
                <View style={styles.issueQuoteBox}>
                  <Text style={styles.issueQuoteText}>"{claim.description}"</Text>
                </View>
              </View>

              {/* หลักฐาน/ข้อมูลติดต่อกลับ ถ้าลูกค้าแนบมา */}
              {(claim.image_url || claim.contact_phone) && (
                <View style={styles.evidenceRow}>
                  {claim.image_url && (
                    <TouchableOpacity
                      style={styles.evidenceChip}
                      activeOpacity={0.7}
                      onPress={() => Linking.openURL(claim.image_url as string)}
                    >
                      <View style={styles.buttonInlineRow}>
                        <Icon name="image" size={13} color="#3D2619" />
                        <Text style={styles.evidenceChipText} numberOfLines={1}>
                          ดูหลักฐานภาพถ่ายจากลูกค้า
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  {claim.contact_phone && (
                    <View style={styles.buttonInlineRow}>
                      <Icon name="call" size={13} color="#8A7D75" />
                      <Text style={styles.contactText}>{claim.contact_phone}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* พื้นที่การตัดสินใจ / สรุปผล ตามสถานะ */}
              {claim.status === "pending" ? (
                <View style={styles.decisionArea}>
                  <TouchableOpacity
                    style={styles.primaryDecisionButton}
                    activeOpacity={0.85}
                    disabled={disabled}
                    onPress={() => openDecision(claim, "approve_replace")}
                  >
                    {disabled ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <View style={styles.buttonInlineRow}>
                        <Icon name="local_shipping" size={14} color="#FFFFFF" />
                        <Text style={styles.primaryDecisionButtonText}>
                          อนุมัติเคลม (ส่งสินค้าใหม่)
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={styles.decisionRow}>
                    <TouchableOpacity
                      style={styles.secondaryDecisionButton}
                      activeOpacity={0.85}
                      disabled={disabled}
                      onPress={() => openDecision(claim, "approve_refund")}
                    >
                      <View style={styles.buttonInlineRow}>
                        <Icon name="currency_exchange" size={13} color="#3D2619" />
                        <Text style={styles.secondaryDecisionButtonText}>คืนเงินให้ลูกค้า</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.rejectDecisionButton}
                      activeOpacity={0.85}
                      disabled={disabled}
                      onPress={() => openDecision(claim, "reject")}
                    >
                      <View style={styles.buttonInlineRow}>
                        <Icon name="block" size={13} color="#C53030" />
                        <Text style={styles.rejectDecisionButtonText}>ปฏิเสธคำร้อง</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : claim.status === "rejected" ? (
                <View style={styles.rejectionNoteBox}>
                  <View style={styles.buttonInlineRow}>
                    <Icon name="info" size={13} color="#8A7D75" />
                    <Text style={styles.rejectionNoteLabel}>บันทึกชี้แจงจากแอดมิน:</Text>
                  </View>
                  <Text style={styles.rejectionNoteText}>
                    {claim.admin_note || "ไม่ได้ระบุเหตุผลเพิ่มเติม"}
                  </Text>
                </View>
              ) : (
                <View style={styles.resultBox}>
                  <View style={styles.resultLeft}>
                    <View style={styles.resultIconCircle}>
                      <Icon name="check" size={14} color="#2D6A4F" />
                    </View>
                    <View style={{ minWidth: 0, flex: 1 }}>
                      <Text style={styles.resultLabel}>ผลการพิจารณา</Text>
                      <Text style={styles.resultText}>
                        {claim.admin_note || "อนุมัติคำร้องแล้ว"}
                      </Text>
                    </View>
                  </View>

                  {claim.status === "approved" && (
                    <TouchableOpacity
                      style={styles.completeLink}
                      activeOpacity={0.7}
                      disabled={disabled}
                      onPress={() => handleMarkCompleted(claim)}
                    >
                      {disabled ? (
                        <ActivityIndicator size="small" color="#3D2619" />
                      ) : (
                        <Text style={styles.completeLinkText}>เสร็จสิ้น ›</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Icon name="check_circle" size={20} color="#2D6A4F" />
            </View>
            <Text style={styles.emptyTitle}>คุณตรวจคำร้องที่สำคัญครบถ้วนแล้ว</Text>
            <Text style={styles.emptySubtitle}>
              ระบบจะแจ้งเตือนทันทีเมื่อมีคำร้องใหม่ส่งเข้ามา
            </Text>
          </View>
        }
      />

      {/* โมดัลกรอกหมายเหตุ/เหตุผล ก่อนยืนยันการอนุมัติ/คืนเงิน/ปฏิเสธ */}
      <Modal
        visible={!!pendingDecision}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingDecision(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {pendingDecision && (
              <>
                <Text style={styles.modalTitle}>{DECISION_META[pendingDecision.kind].title}</Text>
                <Text style={styles.modalSubtitle}>
                  #CLM-{pendingDecision.claim.id} · {pendingDecision.claim.product_name}
                </Text>

                <Text style={styles.modalFieldLabel}>
                  หมายเหตุ{pendingDecision.kind === "reject" ? " (เหตุผลที่ปฏิเสธ)" : ""}
                </Text>
                <TextInput
                  style={styles.modalInput}
                  value={noteDraft}
                  onChangeText={setNoteDraft}
                  multiline
                  placeholder={
                    pendingDecision.kind === "reject"
                      ? "ระบุเหตุผลที่ปฏิเสธคำร้องนี้..."
                      : "รายละเอียดเพิ่มเติม (ถ้ามี)"
                  }
                  placeholderTextColor="#A79A90"
                />

                <View style={styles.modalButtonRow}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    activeOpacity={0.7}
                    onPress={() => setPendingDecision(null)}
                  >
                    <Text style={styles.modalCancelText}>ยกเลิก</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalConfirmButton,
                      DECISION_META[pendingDecision.kind].destructive &&
                        styles.modalConfirmButtonDestructive,
                    ]}
                    activeOpacity={0.85}
                    disabled={
                      pendingDecision.kind === "reject" && !noteDraft.trim()
                    }
                    onPress={confirmDecision}
                  >
                    <Text style={styles.modalConfirmText}>
                      {DECISION_META[pendingDecision.kind].confirmLabel}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

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

  pageHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
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

  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEC793",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D97706",
  },

  pendingBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#795127",
  },

  statRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8DFD8",
    padding: 12,
  },

  statLabel: {
    fontSize: 10.5,
    color: "#8A7D75",
    marginBottom: 4,
    fontWeight: "600",
  },

  statValue: {
    fontSize: 19,
    fontWeight: "800",
    color: "#3D2619",
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
    borderWidth: 1,
    borderColor: "#D4C3BA",
    backgroundColor: "#FFFFFF",
  },

  filterChipActive: {
    backgroundColor: "#3D2619",
    borderColor: "#3D2619",
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
    borderWidth: 1,
    borderColor: "#E8DFD8",
    padding: 14,
    marginBottom: 12,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 8,
  },

  claimIdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 3,
  },

  claimId: {
    fontSize: 15,
    fontWeight: "800",
    color: "#3D2619",
  },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  statusPillText: {
    fontSize: 10.5,
    fontWeight: "800",
  },

  claimMeta: {
    fontSize: 11.5,
    color: "#8A7D75",
  },

  orderRefText: {
    fontSize: 11.5,
    color: "#8A7D75",
    fontWeight: "600",
  },

  customerBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    backgroundColor: "#F6F3EE",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },

  customerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
  },

  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#EABDA0",
    alignItems: "center",
    justifyContent: "center",
  },

  customerName: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#2B2118",
  },

  customerOrderRef: {
    fontSize: 11,
    color: "#8A7D75",
  },

  viewOrderLink: {
    flexShrink: 0,
  },

  viewOrderLinkText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#3D2619",
  },

  productRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FCFBFA",
    borderWidth: 1,
    borderColor: "#F0EDE9",
    borderRadius: 10,
    padding: 8,
    marginBottom: 10,
  },

  productIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F0EDE9",
    alignItems: "center",
    justifyContent: "center",
  },

  productName: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#2B2118",
  },

  productQty: {
    fontSize: 11.5,
    color: "#8A7D75",
    marginTop: 1,
  },

  issueBox: {
    backgroundColor: "#F6F3EE",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    gap: 6,
  },

  issueHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  issueLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#B45309",
    flex: 1,
  },

  issueQuoteBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 8,
  },

  issueQuoteText: {
    fontSize: 12,
    color: "#4A3B32",
    lineHeight: 18,
  },

  evidenceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },

  evidenceChip: {
    backgroundColor: "#DCE6FB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  evidenceChipText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#1A56C4",
  },

  contactText: {
    fontSize: 11.5,
    color: "#8A7D75",
    fontWeight: "600",
    alignSelf: "center",
  },

  decisionArea: {
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0EDE9",
  },

  primaryDecisionButton: {
    height: 44,
    backgroundColor: "#3D2619",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryDecisionButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  decisionRow: {
    flexDirection: "row",
    gap: 8,
  },

  secondaryDecisionButton: {
    flex: 1,
    height: 38,
    backgroundColor: "#EBE8E3",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryDecisionButtonText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#3D2619",
  },

  rejectDecisionButton: {
    flex: 1,
    height: 38,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E8DFD8",
    alignItems: "center",
    justifyContent: "center",
  },

  rejectDecisionButtonText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#C53030",
  },

  rejectionNoteBox: {
    backgroundColor: "#FBDCDC",
    borderRadius: 10,
    padding: 10,
    marginTop: 2,
  },

  rejectionNoteLabel: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#A82424",
    marginBottom: 3,
  },

  rejectionNoteText: {
    fontSize: 12,
    color: "#50453E",
    lineHeight: 17,
  },

  resultBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    backgroundColor: "#FCF9F4",
    borderRadius: 10,
    padding: 10,
    marginTop: 2,
  },

  resultLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
  },

  resultIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#DCEEE5",
    alignItems: "center",
    justifyContent: "center",
  },

  resultLabel: {
    fontSize: 10.5,
    color: "#8A7D75",
    fontWeight: "600",
  },

  resultText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2B2118",
  },

  completeLink: {
    flexShrink: 0,
  },

  completeLinkText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#3D2619",
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    gap: 6,
  },

  emptyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EBE8E3",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },

  emptyTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2B2118",
    textAlign: "center",
  },

  emptySubtitle: {
    fontSize: 11.5,
    color: "#8A7D75",
    textAlign: "center",
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

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(20, 20, 24, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2B2118",
    marginBottom: 4,
  },

  modalSubtitle: {
    fontSize: 12,
    color: "#8A7D75",
    marginBottom: 16,
  },

  modalFieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4A3B32",
    marginBottom: 6,
  },

  modalInput: {
    borderWidth: 1,
    borderColor: "#E8DFD8",
    borderRadius: 10,
    padding: 10,
    minHeight: 72,
    fontSize: 13,
    color: "#2B2118",
    textAlignVertical: "top",
    marginBottom: 18,
  },

  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },

  modalCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F1F0EC",
  },

  modalCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4A3B32",
  },

  modalConfirmButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#3D2619",
  },

  modalConfirmButtonDestructive: {
    backgroundColor: "#C53030",
  },

  modalConfirmText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
