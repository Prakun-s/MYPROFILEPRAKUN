import { useRef, useState } from "react";

import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface MenuAction {
  key: string;
  label: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  onPress: () => void;
  danger?: boolean;
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
  onOrders: () => void;
  onCoins: () => void;
  onCoinShop: () => void;
  onWishlist: () => void;
  onProfile: () => void;
  onLogout: () => void;
}

// เมนูดรอปดาวน์รวมปุ่ม "สำคัญแต่ไม่ได้กดบ่อย" ไว้ที่เดียว แยกจากปุ่มช้อปปิ้งหลัก (ถูกใจ/ตะกร้า)
// กดที่รูปโปรไฟล์ (avatar) มุมขวาบนเพื่อเปิด/ปิด
export default function UserMenu({
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
  onOrders,
  onCoins,
  onCoinShop,
  onWishlist,
  onProfile,
  onLogout,
}: Props) {
  const [open, setOpen] = useState(false);
  // ตำแหน่งจริงของปุ่ม วัดสดๆ ตอนกด แทนการเดา margin คงที่
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const triggerRef = useRef<View>(null);

  const adminActions: MenuAction[] = isAdmin
    ? [
        {
          key: "dashboard",
          label: "แดชบอร์ด",
          icon: "📊",
          iconBg: "#E4ECFB",
          iconColor: "#1A56C4",
          onPress: onDashboard,
        },
        {
          key: "adminProducts",
          label: "จัดการสินค้า",
          icon: "📋",
          iconBg: "#E9DFD3",
          iconColor: "#7F562B",
          onPress: onAdminProducts,
        },
        {
          key: "adminOrders",
          label: "จัดการออเดอร์",
          icon: "📦",
          iconBg: "#DFF3F1",
          iconColor: "#0F766E",
          onPress: onAdminOrders,
        },
        {
          key: "adminClaims",
          label: "จัดการคำขอเคลม",
          icon: "🛠️",
          iconBg: "#FDECD8",
          iconColor: "#C2660A",
          onPress: onAdminClaims,
        },
        {
          key: "adminDiscounts",
          label: "จัดการส่วนลด",
          icon: "🏷️",
          iconBg: "#FEF3C7",
          iconColor: "#D97706",
          onPress: onAdminDiscounts,
        },
        {
          key: "adminCoinRewards",
          label: "จัดการร้านค้าเหรียญ",
          icon: "🎁",
          iconBg: "#FBE2E1",
          iconColor: "#C0392B",
          onPress: onAdminCoinRewards,
        },
      ]
    : [];

  const accountActions: MenuAction[] = [
    {
      key: "profile",
      label: "ตั้งค่าโปรไฟล์",
      icon: "👤",
      iconBg: "#EDE4FB",
      iconColor: "#6D28D9",
      onPress: onProfile,
    },
    {
      key: "orders",
      label: "ประวัติการสั่งซื้อ",
      icon: "🧾",
      iconBg: "#E4ECFB",
      iconColor: "#1A56C4",
      onPress: onOrders,
    },
    {
      key: "coins",
      label: "เหรียญสะสม",
      icon: "🪙",
      iconBg: "#FEF3C7",
      iconColor: "#D97706",
      onPress: onCoins,
    },
    {
      key: "coinShop",
      label: "ร้านค้าเหรียญ",
      icon: "🎟️",
      iconBg: "#FCE4EC",
      iconColor: "#C2185B",
      onPress: onCoinShop,
    },
    {
      key: "wishlist",
      label: "สินค้าที่ถูกใจ",
      icon: "♡",
      iconBg: "#FBE2E1",
      iconColor: "#C0392B",
      onPress: onWishlist,
    },
    {
      key: "logout",
      label: "ออกจากระบบ",
      icon: "🚪",
      iconBg: "#F0EDE9",
      iconColor: "#4A3B32",
      onPress: onLogout,
      danger: true,
    },
  ];

  const runAction = (action: MenuAction) => {
    setOpen(false);
    action.onPress();
  };

  const openMenu = () => {
    // วัดตำแหน่งปุ่มบนหน้าจอ (x, y, width, height) แล้วค่อยคำนวณว่าเมนูควรอยู่ตรงไหน
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      const windowWidth = Dimensions.get("window").width;
      setMenuPos({
        top: y + height + 8, // ใต้ปุ่ม เว้นระยะนิดหน่อย
        right: Math.max(windowWidth - (x + width), 8), // ชิดขอบขวาของปุ่ม
      });
      setOpen(true);
    });
  };

  return (
    <View style={styles.wrapper}>
      <Pressable
        ref={triggerRef}
        style={styles.trigger}
        onPress={openMenu}
      >
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarPlaceholderText}>
              {(username || "?").charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </Pressable>

      {/* ใช้ Modal แทนการ absolute-position ลอยเอง เพื่อให้ทำงานเหมือนกันทั้งบนเว็บและแอปมือถือจริง (iOS/Android) */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          {/* กันไม่ให้กดทะลุลงไปโดนพื้นหลังตอนกดในกล่องเมนู */}
          <Pressable
            style={[styles.menu, { top: menuPos.top, right: menuPos.right }]}
            onPress={() => {}}
          >
            {adminActions.length > 0 && (
              <>
                <Text style={styles.groupLabel}>สำหรับแอดมิน</Text>

                {adminActions.map((action) => (
                  <Pressable
                    key={action.key}
                    style={styles.item}
                    onPress={() => runAction(action)}
                  >
                    <View style={[styles.itemIconBadge, { backgroundColor: action.iconBg }]}>
                      <Text style={[styles.itemIcon, { color: action.iconColor }]}>
                        {action.icon}
                      </Text>
                    </View>
                    <Text style={styles.itemText}>{action.label}</Text>
                  </Pressable>
                ))}

                <View style={styles.divider} />
              </>
            )}

            <Text style={styles.groupLabel}>บัญชีของฉัน</Text>

            {accountActions.map((action) => (
              <Pressable
                key={action.key}
                style={styles.item}
                onPress={() => runAction(action)}
              >
                <View style={[styles.itemIconBadge, { backgroundColor: action.iconBg }]}>
                  <Text style={[styles.itemIcon, { color: action.iconColor }]}>
                    {action.icon}
                  </Text>
                </View>
                <Text
                  style={[styles.itemText, action.danger && styles.itemTextDanger]}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },

  trigger: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: "hidden",
  },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E8DFD8",
  },

  avatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#3D2619",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarPlaceholderText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(17,17,17,0.15)",
  },

  menu: {
    position: "absolute",
    minWidth: 210,
    maxWidth: 260,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8DFD8",
    paddingVertical: 8,
    shadowColor: "#3D2619",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },

  groupLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#B0AFA9",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 4,
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  itemIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  itemIcon: {
    fontSize: 14,
  },

  itemText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3D2619",
  },

  itemTextDanger: {
    color: "#C53030",
  },

  divider: {
    height: 1,
    backgroundColor: "#F0EDE9",
    marginVertical: 6,
    marginHorizontal: 14,
  },
});
