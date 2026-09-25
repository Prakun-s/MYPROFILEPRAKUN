import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import Icon from "./components/Icon";

interface MenuAction {
  key: string;
  label: string;
  icon: string;
  onPress: () => void;
}

interface Props {
  username?: string;
  roleLabel: string;
  isAdmin: boolean;
  avatarUrl?: string | null;
  onDashboard: () => void;
  onAdminProducts: () => void;
  onAdminOrders: () => void;
  onAdminClaims: () => void;
  onAdminDiscounts: () => void;
  onAdminCoinRewards: () => void;
  onAdminChat: () => void;
  onOrders: () => void;
  onClaims: () => void;
  onChat: () => void;
  onCoins: () => void;
  onCoinShop: () => void;
  onWishlist: () => void;
  onProfile: () => void;
  onLogout: () => void;
}

// หน้าเมนูเต็มหน้าจอ เข้าถึงจากแถบเมนูล่าง (ปุ่ม "เมนู") — รวมทางลัดเดียวกับที่เคยอยู่ในดรอปดาวน์ UserMenu
// จัดวางแบบเรียบ ไอคอนสีเดียว (โทนน้ำตาลเข้ม) ไม่มีวงกลมสีสันแบบเดิม ให้ดูโมเดิร์นคล้ายภาพตัวอย่างเมนูที่ได้รับมา
export default function MenuScreen({
  username,
  roleLabel,
  isAdmin,
  avatarUrl,
  onDashboard,
  onAdminProducts,
  onAdminOrders,
  onAdminClaims,
  onAdminDiscounts,
  onAdminCoinRewards,
  onAdminChat,
  onOrders,
  onClaims,
  onChat,
  onCoins,
  onCoinShop,
  onWishlist,
  onProfile,
  onLogout,
}: Props) {
  const adminActions: MenuAction[] = [
    { key: "dashboard", label: "แดชบอร์ด", icon: "bar_chart", onPress: onDashboard },
    { key: "adminProducts", label: "จัดการสินค้า", icon: "inventory_2", onPress: onAdminProducts },
    { key: "adminOrders", label: "จัดการออเดอร์", icon: "local_shipping", onPress: onAdminOrders },
    { key: "adminClaims", label: "จัดการคำขอเคลม", icon: "build", onPress: onAdminClaims },
    { key: "adminDiscounts", label: "จัดการส่วนลด", icon: "sell", onPress: onAdminDiscounts },
    { key: "adminCoinRewards", label: "จัดการร้านค้าเหรียญ", icon: "redeem", onPress: onAdminCoinRewards },
    { key: "adminChat", label: "ข้อความจากลูกค้า", icon: "forum", onPress: onAdminChat },
  ];

  const accountActions: MenuAction[] = [
    { key: "orders", label: "ประวัติการสั่งซื้อ", icon: "receipt_long", onPress: onOrders },
    { key: "claims", label: "เคลมสินค้า", icon: "assignment_return", onPress: onClaims },
    { key: "chat", label: "แชทกับแอดมิน", icon: "forum", onPress: onChat },
    { key: "coins", label: "เหรียญสะสม", icon: "monetization_on", onPress: onCoins },
    { key: "coinShop", label: "ร้านค้าเหรียญ", icon: "confirmation_number", onPress: onCoinShop },
    { key: "wishlist", label: "สินค้าที่ถูกใจ", icon: "favorite_border", onPress: onWishlist },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* หัวข้อหน้า */}
      <View style={styles.pageHeader}>
        <Icon name="menu" size={22} color="#3D2619" />
        <Text style={styles.pageTitle}>เมนู</Text>
      </View>

      {/* การ์ดโปรไฟล์ย่อ: แตะเพื่อเข้าหน้าโปรไฟล์เต็ม */}
      <TouchableOpacity
        style={styles.profileCard}
        activeOpacity={0.85}
        onPress={onProfile}
      >
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.profileAvatar} />
        ) : (
          <View style={styles.profileAvatarPlaceholder}>
            <Text style={styles.profileAvatarPlaceholderText}>
              {(username || "?").charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.profileTextGroup}>
          <Text style={styles.profileName} numberOfLines={1}>
            {username || "ผู้ใช้งาน"}
          </Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{roleLabel}</Text>
          </View>
        </View>

        <Icon name="chevron_right" size={20} color="rgba(255,255,255,0.55)" />
      </TouchableOpacity>

      {/* กลุ่ม: สำหรับแอดมิน (หัวกลุ่มแบบ pill เข้ม + รายการย่อยมีเส้นเชื่อม เหมือนสไตล์ nested list ในภาพตัวอย่าง) */}
      {isAdmin && (
        <View style={styles.sectionCard}>
          <View style={styles.adminGroupHeader}>
            <Icon name="admin_panel_settings" size={18} color="#FFFFFF" />
            <Text style={styles.adminGroupHeaderText}>สำหรับแอดมิน</Text>
          </View>

          <View style={styles.nestedList}>
            {adminActions.map((action) => (
              <TouchableOpacity
                key={action.key}
                style={styles.nestedItem}
                activeOpacity={0.7}
                onPress={action.onPress}
              >
                <View style={styles.nestedConnector} />
                <Icon name={action.icon} size={19} color="#50453E" />
                <Text style={styles.itemText}>{action.label}</Text>
                <Icon name="chevron_right" size={18} color="#C7BEB4" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* กลุ่ม: บัญชีของฉัน */}
      <View style={styles.sectionCard}>
        <Text style={styles.groupLabel}>บัญชีของฉัน</Text>

        {accountActions.map((action, i) => (
          <TouchableOpacity
            key={action.key}
            style={[
              styles.item,
              i === accountActions.length - 1 && styles.itemNoBorder,
            ]}
            activeOpacity={0.7}
            onPress={action.onPress}
          >
            <Icon name={action.icon} size={20} color="#50453E" />
            <Text style={styles.itemText}>{action.label}</Text>
            <Icon name="chevron_right" size={18} color="#C7BEB4" />
          </TouchableOpacity>
        ))}
      </View>

      {/* ออกจากระบบ */}
      <TouchableOpacity
        style={styles.logoutCard}
        activeOpacity={0.7}
        onPress={onLogout}
      >
        <Icon name="logout" size={19} color="#C53030" />
        <Text style={styles.logoutText}>ออกจากระบบ</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0E9DC",
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },

  pageTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#3D2619",
    letterSpacing: -0.3,
  },

  // ===== การ์ดโปรไฟล์ย่อ =====
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#3D2619",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },

  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#5A4130",
  },

  profileAvatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#5A4130",
    alignItems: "center",
    justifyContent: "center",
  },

  profileAvatarPlaceholderText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  profileTextGroup: {
    flex: 1,
    gap: 5,
  },

  profileName: {
    fontSize: 15.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 2.5,
  },

  roleBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#EABDA0",
    letterSpacing: 0.3,
  },

  // ===== การ์ดกลุ่มรายการ =====
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8DFD8",
    paddingHorizontal: 6,
    paddingVertical: 6,
    marginBottom: 16,
  },

  groupLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#B0AFA9",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },

  // pill หัวกลุ่มแอดมิน สีเข้มเด่น (ให้ความรู้สึกแบบ "โฟลเดอร์ที่กำลังเปิดอยู่" ในดีไซน์ต้นแบบ)
  adminGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "#3D2619",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 6,
  },

  adminGroupHeaderText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // รายการย่อยแอดมิน: เยื้องเข้ามาพร้อมเส้นเชื่อมแนวตั้งทางซ้าย (จำลองสไตล์ nested list จากดีไซน์ต้นแบบ)
  nestedList: {
    marginLeft: 22,
    borderLeftWidth: 1.5,
    borderLeftColor: "#EFE9DF",
    paddingBottom: 4,
  },

  nestedItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    paddingLeft: 14,
    paddingRight: 10,
  },

  nestedConnector: {
    position: "absolute",
    left: 0,
    top: "50%",
    width: 10,
    height: 1.5,
    backgroundColor: "#EFE9DF",
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F1EA",
  },

  itemNoBorder: {
    borderBottomWidth: 0,
  },

  itemText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "600",
    color: "#3D2619",
  },

  // ===== ออกจากระบบ =====
  logoutCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0C4C2",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },

  logoutText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#C53030",
  },
});
