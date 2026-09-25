import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import Icon from "./Icon";

export type TabKey = "products" | "cart" | "coins" | "orders" | "menu";

interface Props {
  active: TabKey;
  cartCount: number;
  onNavigate: (tab: TabKey) => void;
}

// ชื่อไอคอนตาม Material Symbols (ฟอนต์เดียวกับดีไซน์ต้นแบบ) แทนอีโมจิเดิม
const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "products", label: "หน้าแรก", icon: "home" },
  { key: "cart", label: "ตะกร้า", icon: "shopping_cart" },
  { key: "coins", label: "เหรียญสะสม", icon: "monetization_on" },
  { key: "orders", label: "ออเดอร์", icon: "receipt_long" },
  { key: "menu", label: "เมนู", icon: "menu" },
];

// แถบเมนูล่าง 5 ปุ่มหลัก อยู่ตลอดเวลาในทุกหน้าหลักของฝั่งลูกค้า (ไม่โชว์ในหน้าย่อย/แอดมิน)
export default function BottomTabBar({ active, cartCount, onNavigate }: Props) {
  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            activeOpacity={0.7}
            onPress={() => onNavigate(tab.key)}
          >
            <View style={styles.iconWrap}>
              <Icon
                name={tab.icon}
                size={22}
                color={isActive ? "#6F4E37" : "#8A7D75"}
                weight={isActive ? 600 : 400}
              />

              {tab.key === "cart" && cartCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{cartCount > 99 ? "99+" : cartCount}</Text>
                </View>
              )}
            </View>

            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E8DFD8",
    paddingTop: 8,
    paddingBottom: 10,
  },

  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },

  iconWrap: {
    position: "relative",
  },

  icon: {
    fontSize: 20,
    opacity: 0.55,
  },

  iconActive: {
    opacity: 1,
  },

  label: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#8A7D75",
  },

  labelActive: {
    color: "#6F4E37",
    fontWeight: "700",
  },

  badge: {
    position: "absolute",
    top: -4,
    right: -10,
    backgroundColor: "#C53030",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
  },

  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
});
