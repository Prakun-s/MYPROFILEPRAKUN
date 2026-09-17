import { useRef, useState } from "react";

import {
  Dimensions,
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
  onPress: () => void;
  danger?: boolean;
}

interface Props {
  username?: string;
  roleLabel: string;
  isAdmin: boolean;
  onDashboard: () => void;
  onAdminOrders: () => void;
  onOrders: () => void;
  onLogout: () => void;
}

// เมนูดรอปดาวน์รวมปุ่ม "สำคัญแต่ไม่ได้กดบ่อย" ไว้ที่เดียว แยกจากปุ่มช้อปปิ้งหลัก (ถูกใจ/ตะกร้า)
// กดที่ป้ายชื่อผู้ใช้เพื่อเปิด/ปิด
export default function UserMenu({
  username,
  roleLabel,
  isAdmin,
  onDashboard,
  onAdminOrders,
  onOrders,
  onLogout,
}: Props) {
  const [open, setOpen] = useState(false);
  // ตำแหน่งจริงของปุ่ม วัดสดๆ ตอนกด แทนการเดา margin คงที่
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const triggerRef = useRef<View>(null);

  const adminActions: MenuAction[] = isAdmin
    ? [
        { key: "dashboard", label: "แดชบอร์ด", icon: "📊", onPress: onDashboard },
        {
          key: "adminOrders",
          label: "จัดการออเดอร์",
          icon: "📦",
          onPress: onAdminOrders,
        },
      ]
    : [];

  const accountActions: MenuAction[] = [
    { key: "orders", label: "ประวัติการสั่งซื้อ", icon: "🧾", onPress: onOrders },
    {
      key: "logout",
      label: "ออกจากระบบ",
      icon: "🚪",
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
        style={[styles.trigger, open && styles.triggerActive]}
        onPress={openMenu}
      >
        <Text style={styles.triggerText} numberOfLines={1}>
          {username} · {roleLabel}
        </Text>
        <Text style={styles.chevron}>{open ? "▲" : "▼"}</Text>
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
                    <Text style={styles.itemIcon}>{action.icon}</Text>
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
                <Text style={styles.itemIcon}>{action.icon}</Text>
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
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F1F1EE",
    borderWidth: 1,
    borderColor: "transparent",
    maxWidth: 220,
  },

  triggerActive: {
    borderColor: "#111111",
    backgroundColor: "#FFFFFF",
  },

  triggerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111111",
    flexShrink: 1,
  },

  chevron: {
    fontSize: 8,
    color: "#8A8A8A",
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
    borderColor: "#EDEDED",
    paddingVertical: 8,
    shadowColor: "#111111",
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

  itemIcon: {
    fontSize: 15,
    width: 18,
    textAlign: "center",
  },

  itemText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111111",
  },

  itemTextDanger: {
    color: "#B3413E",
  },

  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginVertical: 6,
    marginHorizontal: 14,
  },
});
