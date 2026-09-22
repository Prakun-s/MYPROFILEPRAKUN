import { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { ClaimReason, ClaimRecord, ClaimStatus, fetchAllClaims, updateClaimStatus } from "./api";
import Toast from "./components/Toast";

const REASON_LABELS: Record<ClaimReason, string> = {
  damaged: "สินค้าชำรุด / เสียหาย",
  wrong_item: "ได้รับสินค้าผิดรายการ",
  missing_item: "สินค้าไม่ครบ / ขาดอุปกรณ์",
  not_as_described: "สินค้าไม่ตรงตามที่สั่ง",
  fake: "สงสัยว่าเป็นสินค้าปลอม",
  other: "อื่นๆ",
};

const STATUS_OPTIONS: { value: ClaimStatus; label: string }[] = [
  { value: "pending", label: "รอตรวจสอบ" },
  { value: "approved", label: "อนุมัติ" },
  { value: "rejected", label: "ปฏิเสธ" },
  { value: "completed", label: "เสร็จสิ้น" },
];

const FILTER_OPTIONS: { value: ClaimStatus | "all"; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  ...STATUS_OPTIONS,
];

// หน้าจัดการคำขอเคลมสำหรับ admin: ดูคำขอเคลมทั้งร้าน + เปลี่ยนสถานะได้จริง
// (บันทึกผ่าน PUT /api/admin/claims/:id/status)
export default function AdminClaimsScreen() {
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<ClaimStatus | "all">("all");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

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

  const handleChangeStatus = async (claim: ClaimRecord, status: ClaimStatus) => {
    if (claim.status === status) return;

    const previous = claim.status;

    // อัปเดตหน้าจอทันที (optimistic) แล้วค่อยยืนยันกับ backend
    setClaims((prev) =>
      prev.map((c) => (c.id === claim.id ? { ...c, status } : c))
    );
    setUpdatingId(claim.id);

    try {
      await updateClaimStatus(claim.id, status);

      const label = STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
      notify(`อัปเดตคำขอเคลม #${claim.id} เป็น "${label}" แล้ว`);
    } catch (err: any) {
      console.error("Update claim status error:", err);

      setClaims((prev) =>
        prev.map((c) => (c.id === claim.id ? { ...c, status: previous } : c))
      );

      notify(err.message || "อัปเดตสถานะไม่สำเร็จ", "warning");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredClaims = useMemo(() => {
    if (filter === "all") return claims;
    return claims.filter((c) => c.status === filter);
  }, [claims, filter]);

  const countByStatus = useMemo(() => {
    const counts: Record<string, number> = { all: claims.length };
    for (const status of STATUS_OPTIONS) {
      counts[status.value] = claims.filter((c) => c.status === status.value).length;
    }
    return counts;
  }, [claims]);

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
    <View style={{ flex: 1 }}>
      <FlatList
        data={filteredClaims}
        keyExtractor={(claim) => String(claim.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
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
        }
        renderItem={({ item: claim }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.claimId}>
                  เคลม #{claim.id} · คำสั่งซื้อ #{claim.order_id}
                </Text>
                <Text style={styles.claimMeta}>
                  {claim.username || "ไม่ทราบชื่อผู้ใช้"} ·{" "}
                  {new Date(claim.created_at).toLocaleDateString("th-TH", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>

            <Text style={styles.itemLine} numberOfLines={1}>
              {claim.product_name} × {claim.quantity}
            </Text>

            <Text style={styles.reasonLine}>
              เหตุผล: {REASON_LABELS[claim.reason] ?? claim.reason}
            </Text>

            <Text style={styles.descLine}>{claim.description}</Text>

            {claim.image_url ? (
              <Text style={styles.linkLine} numberOfLines={1}>
                รูปภาพ: {claim.image_url}
              </Text>
            ) : null}

            {claim.contact_phone ? (
              <Text style={styles.linkLine}>ติดต่อกลับ: {claim.contact_phone}</Text>
            ) : null}

            <View style={styles.statusRow}>
              {STATUS_OPTIONS.map((option) => {
                const active = claim.status === option.value;
                const disabled = updatingId === claim.id;

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.statusChip,
                      active && styles.statusChipActive,
                      option.value === "rejected" &&
                        active &&
                        styles.statusChipRejected,
                      option.value === "completed" &&
                        active &&
                        styles.statusChipCompleted,
                    ]}
                    activeOpacity={0.7}
                    disabled={disabled}
                    onPress={() => handleChangeStatus(claim, option.value)}
                  >
                    {disabled && active ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text
                        style={[
                          styles.statusChipText,
                          active && styles.statusChipTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>ไม่มีคำขอเคลมในหมวดนี้</Text>
          </View>
        }
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
    borderColor: "#D8D8D8",
    backgroundColor: "#FFFFFF",
  },

  filterChipActive: {
    backgroundColor: "#111111",
    borderColor: "#111111",
  },

  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4A4A4A",
  },

  filterChipTextActive: {
    color: "#FFFFFF",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EDEDED",
    padding: 14,
    marginBottom: 12,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },

  claimId: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111111",
  },

  claimMeta: {
    fontSize: 12,
    color: "#8A8A8A",
    marginTop: 2,
  },

  itemLine: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#2B2B31",
    marginBottom: 4,
  },

  reasonLine: {
    fontSize: 12,
    color: "#4A4A4A",
    fontWeight: "600",
    marginBottom: 2,
  },

  descLine: {
    fontSize: 12,
    color: "#6B6B6B",
    lineHeight: 17,
    marginBottom: 4,
  },

  linkLine: {
    fontSize: 11.5,
    color: "#8A8A8A",
    marginBottom: 2,
  },

  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },

  statusChip: {
    minWidth: 76,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D8D8D8",
  },

  statusChipActive: {
    backgroundColor: "#111111",
    borderColor: "#111111",
  },

  statusChipRejected: {
    backgroundColor: "#B3413E",
    borderColor: "#B3413E",
  },

  statusChipCompleted: {
    backgroundColor: "#1E8E3E",
    borderColor: "#1E8E3E",
  },

  statusChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4A4A4A",
  },

  statusChipTextActive: {
    color: "#FFFFFF",
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
