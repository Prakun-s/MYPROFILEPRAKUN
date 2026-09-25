import { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { UserProfile, fetchMyOrders, fetchProfile, updateProfile, uploadAvatar } from "./api";
import Icon from "./components/Icon";
import Toast from "./components/Toast";
import { useCoins } from "./context/CoinContext";
import { useWishlist } from "./context/WishlistContext";

interface ProfileScreenProps {
  isAdmin?: boolean;
  onDashboard?: () => void;
  onOrders?: () => void;
  onWishlist?: () => void;
  // ไปหน้าตั้งค่า (แก้ไขข้อมูลส่วนตัว, เปลี่ยนรหัสผ่าน, การตั้งค่าทั่วไป) ที่แยกออกมาต่างหาก
  onSettings?: () => void;
  onLogout?: () => void;
  onAvatarChange?: (avatarUrl: string) => void;
}

// แปลงวันที่สมัครสมาชิก (created_at จาก backend) เป็นรูปแบบ "สมาชิกตั้งแต่ ..." ภาษาไทย
function formatJoinDate(iso?: string | null) {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
}

// เกณฑ์ระดับสมาชิกตามจำนวนคำสั่งซื้อ (ธีมร้านกล้อง/อุปกรณ์ถ่ายภาพ ตรงกับสินค้าจริงในร้าน)
function getMemberTier(orderCount: number) {
  if (orderCount >= 15) {
    return { label: "GOLD PRO SHOOTER", bg: "#FBE7C6", color: "#8A5A17" };
  }
  if (orderCount >= 5) {
    return { label: "SILVER LENS EXPERT", bg: "#E7E7EA", color: "#54565C" };
  }
  if (orderCount >= 1) {
    return { label: "BRONZE PHOTO ENTHUSIAST", bg: "#F0DCC9", color: "#8A5A34" };
  }
  return { label: "สมาชิกใหม่", bg: "#EFE8E0", color: "#8A7D75" };
}

// หน้าโปรไฟล์หลัก: แสดงรายละเอียดภาพรวม (รูป, ชื่อ, ระดับสมาชิก, สถิติ) เท่านั้น
// การแก้ไขข้อมูลส่วนตัว/เปลี่ยนรหัสผ่าน/การตั้งค่าทั่วไป ย้ายไปอยู่หน้า SettingsScreen แยกต่างหาก
// (เข้าถึงผ่านปุ่ม "แก้ไขโปรไฟล์และตั้งค่า" ด้านล่าง) ยกเว้นรูปโปรไฟล์ที่ยังแก้ไขด่วนได้จากหน้านี้เลย
export default function ProfileScreen({
  isAdmin,
  onDashboard,
  onOrders,
  onWishlist,
  onSettings,
  onLogout,
  onAvatarChange,
}: ProfileScreenProps) {
  const { coinBalance } = useCoins();
  const { items: wishlistItems } = useWishlist();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orderCount, setOrderCount] = useState(0);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastTone, setToastTone] = useState<"info" | "warning">("info");

  const notify = (message: string, tone: "info" | "warning" = "info") => {
    setToastMessage(message);
    setToastTone(tone);
    setToastVisible(true);
  };

  const load = async () => {
    try {
      setError("");
      const data = await fetchProfile();
      setProfile(data);
    } catch (err: any) {
      console.error("Load profile error:", err);
      setError(err.message || "ไม่สามารถโหลดโปรไฟล์ได้");
    } finally {
      setLoading(false);
    }
  };

  const loadOrderCount = async () => {
    try {
      const data = await fetchMyOrders();
      setOrderCount(Array.isArray(data) ? data.length : 0);
    } catch (err) {
      console.error("Load order count error:", err);
    }
  };

  useEffect(() => {
    load();
    loadOrderCount();
  }, []);

  const tier = useMemo(() => getMemberTier(orderCount), [orderCount]);

  // เลือกรูปโปรไฟล์จากเครื่องผู้ใช้จริง แล้วอัปโหลดขึ้น backend ทันที
  // ตอนนี้รองรับเฉพาะเว็บ (ใช้ input file ของเบราว์เซอร์) เพราะยังไม่ได้เพิ่มไลบรารีเลือกรูปสำหรับแอปมือถือ
  // หมายเหตุ: backend เขียนทับข้อมูลโปรไฟล์ทั้งหมดทุกครั้งที่บันทึก จึงต้องส่ง full_name/email/phone/address
  // เดิมไปด้วยเสมอ ไม่ใช่แค่ avatar_url ไม่งั้นข้อมูลอื่นจะถูกล้างเป็นค่าว่าง
  const pickAvatarFromDevice = () => {
    if (Platform.OS !== "web") {
      notify("ฟีเจอร์เลือกรูปจากเครื่องตอนนี้รองรับเฉพาะเว็บ", "warning");
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        notify("ไฟล์รูปใหญ่เกินไป (จำกัดไม่เกิน 5MB)", "warning");
        return;
      }

      setAvatarUploading(true);

      try {
        const result = await uploadAvatar(file, file.name);

        await updateProfile({
          full_name: profile?.full_name || "",
          email: profile?.email || "",
          phone: profile?.phone || "",
          address: profile?.address || "",
          avatar_url: result.url,
        });

        setProfile((prev) => (prev ? { ...prev, avatar_url: result.url } : prev));
        onAvatarChange?.(result.url);
        notify("อัปเดตรูปโปรไฟล์สำเร็จ");
      } catch (err: any) {
        console.error("Upload avatar error:", err);
        notify(err.message || "อัปโหลดรูปไม่สำเร็จ ลองใหม่อีกครั้ง", "warning");
      } finally {
        setAvatarUploading(false);
      }
    };

    input.click();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3D2619" />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>

        <TouchableOpacity style={styles.retryButton} onPress={load}>
          <Text style={styles.retryText}>ลองใหม่</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* การ์ดโปรไฟล์หลัก: รูป + ชื่อ + ระดับสมาชิก + สถิติ */}
      <View style={styles.heroCard}>
        <View style={styles.avatarWrap}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>
                {profile.username.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          {avatarUploading && (
            <View style={styles.avatarUploadingOverlay}>
              <ActivityIndicator size="small" color="#FFFFFF" />
            </View>
          )}

          <TouchableOpacity
            style={styles.cameraBadge}
            activeOpacity={0.8}
            onPress={pickAvatarFromDevice}
            disabled={avatarUploading}
          >
            <Icon name="photo_camera" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <Text style={styles.avatarHint}>แตะไอคอนกล้องเพื่อเลือกรูปจากเครื่องของคุณ</Text>

        <Text style={styles.displayName}>
          {profile.full_name?.trim() || profile.username}
        </Text>
        <Text style={styles.emailText}>{profile.email || "-"}</Text>

        <View style={[styles.tierBadge, { backgroundColor: tier.bg }]}>
          <View style={[styles.tierDot, { backgroundColor: tier.color }]} />
          <Text style={[styles.tierText, { color: tier.color }]}>{tier.label}</Text>
        </View>

        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statItem}
            activeOpacity={onOrders ? 0.6 : 1}
            onPress={onOrders}
            disabled={!onOrders}
          >
            <Text style={styles.statValue}>{orderCount}</Text>
            <Text style={styles.statLabel}>คำสั่งซื้อ</Text>
          </TouchableOpacity>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <Icon name="monetization_on" size={14} color="#D97706" />
              <Text style={[styles.statValue, styles.statValueCoin]}>{coinBalance}</Text>
            </View>
            <Text style={styles.statLabel}>เหรียญสะสม</Text>
          </View>

          <View style={styles.statDivider} />

          <TouchableOpacity
            style={styles.statItem}
            activeOpacity={onWishlist ? 0.6 : 1}
            onPress={onWishlist}
            disabled={!onWishlist}
          >
            <Text style={styles.statValue}>{wishlistItems.length}</Text>
            <Text style={styles.statLabel}>รายการที่ถูกใจ</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ข้อมูลส่วนตัวแบบอ่านอย่างเดียว: เบอร์โทร, ที่อยู่, วันที่สมัครสมาชิก */}
      {/* การแก้ไขข้อมูลเหล่านี้ทำได้ที่หน้าตั้งค่าเท่านั้น (ปุ่มด้านล่าง) */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <View style={styles.infoIconBadge}>
            <Icon name="call" size={17} color="#7F562B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>เบอร์โทรศัพท์</Text>
            <Text style={styles.infoValue}>{profile.phone?.trim() || "-"}</Text>
          </View>
        </View>

        <View style={styles.infoDivider} />

        <View style={styles.infoRow}>
          <View style={styles.infoIconBadge}>
            <Icon name="location_on" size={17} color="#7F562B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>ที่อยู่จัดส่ง</Text>
            <Text style={styles.infoValue}>{profile.address?.trim() || "-"}</Text>
          </View>
        </View>

        <View style={styles.infoDivider} />

        <View style={styles.infoRow}>
          <View style={styles.infoIconBadge}>
            <Icon name="event" size={17} color="#7F562B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>สมาชิกตั้งแต่</Text>
            <Text style={styles.infoValue}>{formatJoinDate(profile.created_at)}</Text>
          </View>
        </View>
      </View>

      {/* ทางลัดไปหน้าตั้งค่า: แก้ไขข้อมูลส่วนตัว, เปลี่ยนรหัสผ่าน, การตั้งค่าทั่วไป */}
      <TouchableOpacity
        style={styles.settingsEntryCard}
        activeOpacity={0.85}
        onPress={onSettings}
      >
        <View style={styles.settingsEntryIconBadge}>
          <Icon name="settings" size={19} color="#7F562B" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.settingsEntryTitle}>แก้ไขโปรไฟล์และตั้งค่า</Text>
          <Text style={styles.settingsEntrySubtitle}>
            ข้อมูลส่วนตัว, รหัสผ่าน, การแจ้งเตือน
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      {/* ระบบจัดการหลังร้าน (เฉพาะแอดมิน) */}
      {isAdmin && (
        <TouchableOpacity
          style={styles.adminCard}
          activeOpacity={0.85}
          onPress={onDashboard}
        >
          <View style={styles.adminIconBadge}>
            <Icon name="settings" size={20} color="#7F562B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.adminTitle}>ระบบจัดการหลังร้าน</Text>
            <Text style={styles.adminSubtitle}>จัดการคลังสินค้า ออเดอร์ และยอดขาย</Text>
          </View>
          <View style={styles.adminButton}>
            <Text style={styles.adminButtonText}>เข้าสู่ระบบ</Text>
          </View>
        </TouchableOpacity>
      )}

      {onLogout && (
        <TouchableOpacity style={styles.logoutButton} activeOpacity={0.8} onPress={onLogout}>
          <View style={styles.buttonInlineRow}>
            <Icon name="logout" size={15} color="#C0392B" />
            <Text style={styles.logoutButtonText}>ออกจากระบบ</Text>
          </View>
        </TouchableOpacity>
      )}

      <Toast
        visible={toastVisible}
        message={toastMessage}
        tone={toastTone}
        onHide={() => setToastVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0E9DC",
  },

  buttonInlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  content: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 560,
    width: "100%",
    alignSelf: "center",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F0E9DC",
  },

  heroCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8DFD8",
    padding: 20,
    marginBottom: 16,
  },

  avatarWrap: {
    position: "relative",
    marginBottom: 12,
  },

  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#F0EDE9",
  },

  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3D2619",
  },

  avatarInitial: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  cameraBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#3D2619",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  avatarUploadingOverlay: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "rgba(45,30,20,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarHint: {
    fontSize: 11,
    color: "#8A7D75",
    marginBottom: 12,
  },

  displayName: {
    fontSize: 19,
    fontWeight: "800",
    color: "#3D2619",
    marginBottom: 3,
    textAlign: "center",
  },

  emailText: {
    fontSize: 13,
    color: "#8A7D75",
    marginBottom: 12,
  },

  tierBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    marginBottom: 18,
  },

  tierDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  tierText: {
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 0.4,
  },

  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "#F0EDE9",
    paddingTop: 16,
  },

  statItem: {
    flex: 1,
    alignItems: "center",
  },

  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#E8DFD8",
  },

  statValue: {
    fontSize: 17,
    fontWeight: "800",
    color: "#3D2619",
    marginBottom: 2,
  },

  statValueCoin: {
    color: "#D97706",
  },

  statLabel: {
    fontSize: 11,
    color: "#8A7D75",
    textAlign: "center",
  },

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8DFD8",
    padding: 16,
    marginBottom: 16,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  infoIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F0EDE9",
    alignItems: "center",
    justifyContent: "center",
  },

  infoLabel: {
    fontSize: 11,
    color: "#8A7D75",
    marginBottom: 2,
  },

  infoValue: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#3D2619",
  },

  infoDivider: {
    height: 1,
    backgroundColor: "#F0EDE9",
    marginVertical: 12,
  },

  settingsEntryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8DFD8",
    padding: 16,
    marginBottom: 16,
  },

  settingsEntryIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#F0EDE9",
    alignItems: "center",
    justifyContent: "center",
  },

  settingsEntryTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#3D2619",
    marginBottom: 2,
  },

  settingsEntrySubtitle: {
    fontSize: 11.5,
    color: "#8A7D75",
  },

  chevron: {
    fontSize: 20,
    color: "#C7BCB2",
  },

  adminCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#3D2619",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },

  adminIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  adminTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 2,
  },

  adminSubtitle: {
    fontSize: 11.5,
    color: "rgba(255,255,255,0.75)",
  },

  adminButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },

  adminButtonText: {
    color: "#3D2619",
    fontSize: 12.5,
    fontWeight: "800",
  },

  logoutButton: {
    backgroundColor: "#FBE2E1",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 8,
  },

  logoutButtonText: {
    color: "#C0392B",
    fontSize: 14,
    fontWeight: "800",
  },

  errorText: {
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
});
