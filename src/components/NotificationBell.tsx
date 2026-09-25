import { useEffect, useState } from "react";

import { StyleSheet, TouchableOpacity, View } from "react-native";

import { loadNotifications } from "../lib/notifications";
import Icon from "./Icon";

interface Props {
  isAdmin: boolean;
  // กดแล้วพาไปหน้าแจ้งเตือนเต็มหน้าจอ (NotificationsScreen)
  onPress: () => void;
}

// ปุ่มกระดิ่งแจ้งเตือนที่ header ทุกหน้า — กดแล้วพาไปหน้าแจ้งเตือนเต็มหน้าจอ
// จุดสีส้มแสดงเฉพาะตอนมีแจ้งเตือนจริง (ดึงจากข้อมูลออเดอร์/คำขอเคลมจริง ไม่ใช่ข้อมูลปลอม)
export default function NotificationBell({ isAdmin, onPress }: Props) {
  const [hasItems, setHasItems] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadNotifications(isAdmin)
      .then((list) => {
        if (!cancelled) setHasItems(list.length > 0);
      })
      .catch((err) => {
        console.error("Load notifications error:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  return (
    <TouchableOpacity style={styles.iconButtonPlain} activeOpacity={0.6} onPress={onPress}>
      <Icon name="notifications" size={22} color="#4A3B32" />
      {hasItems && <View style={styles.notificationDot} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  iconButtonPlain: {
    position: "relative",
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },

  notificationDot: {
    position: "absolute",
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D97706",
    borderWidth: 1.5,
    borderColor: "#F0E9DC",
  },
});
