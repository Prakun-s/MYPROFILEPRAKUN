import { useState } from "react";
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import Icon from "./Icon";

export type AdminTabKey = "dashboard" | "products" | "orders" | "claims" | "discounts";

interface Props {
  active: AdminTabKey;
  onNavigate: (tab: AdminTabKey) => void;
  ordersCount?: number;
  claimsCount?: number;
}

const TABS: { key: AdminTabKey; label: string; icon: string }[] = [
  { key: "dashboard", label: "แดชบอร์ด", icon: "bar_chart" },
  { key: "products", label: "จัดการสินค้า", icon: "inventory_2" },
  { key: "orders", label: "ออเดอร์", icon: "receipt_long" },
  { key: "claims", label: "เคลม", icon: "build" },
  { key: "discounts", label: "ส่วนลด", icon: "sell" },
];

// แถบสลับหน้าแอดมินแบบย่อ ใช้ร่วมกันได้ทุกหน้าฝั่งผู้ดูแล (แดชบอร์ด/สินค้า/ออเดอร์/เคลม/ส่วนลด)
// ขนาดเล็กลง + มีลูกศรบอกใบ้ทางขวาแทนการให้แท็บถัดไปโผล่ครึ่งเดียว
export default function AdminNavTabs({ active, onNavigate, ordersCount, claimsCount }: Props) {
  const [canScrollMore, setCanScrollMore] = useState(true);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromEnd =
      contentSize.width - layoutMeasurement.width - contentOffset.x;
    setCanScrollMore(distanceFromEnd > 8);
  };

  const handleContentSize = (contentWidth: number) => {
    // ตั้งค่าเริ่มต้นตอนยังไม่ได้เลื่อน (ยังมีเนื้อหาเกินขอบจอไหม)
    setCanScrollMore(contentWidth > 0);
  };

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.row}
        onScroll={handleScroll}
        scrollEventThrottle={32}
        onContentSizeChange={handleContentSize}
      >
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          const badgeCount =
            tab.key === "orders" ? ordersCount : tab.key === "claims" ? claimsCount : undefined;

          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              activeOpacity={0.75}
              onPress={() => onNavigate(tab.key)}
            >
              <Icon name={tab.icon} size={13} color={isActive ? "#FFFFFF" : "#4A3B32"} />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>

              {!!badgeCount && (
                <View style={[styles.badge, isActive && styles.badgeActive]}>
                  <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
                    {badgeCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {canScrollMore && (
        <View style={styles.edgeHint} pointerEvents="none">
          <View style={styles.edgeArrow}>
            <Text style={styles.edgeArrowText}>›</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8DFD8",
    position: "relative",
  },

  scroll: {
    backgroundColor: "#FFFFFF",
  },

  row: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
  },

  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#F0EDE9",
  },

  tabActive: {
    backgroundColor: "#3D2619",
  },

  tabIcon: {
    fontSize: 11,
  },

  tabLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4A3B32",
  },

  tabLabelActive: {
    color: "#FFFFFF",
  },

  badge: {
    backgroundColor: "#E8DFD8",
    borderRadius: 999,
    minWidth: 15,
    height: 15,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },

  badgeActive: {
    backgroundColor: "rgba(255,255,255,0.22)",
  },

  badgeText: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#3D2619",
  },

  badgeTextActive: {
    color: "#FFFFFF",
  },

  edgeHint: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.85)",
  },

  edgeArrow: {
    width: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: "#E8DFD8",
    alignItems: "center",
    justifyContent: "center",
  },

  edgeArrowText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#3D2619",
    marginTop: -1,
  },
});
