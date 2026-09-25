import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { loadNotifications, NotificationItem, timeAgo } from "./lib/notifications";
import Icon from "./components/Icon";

interface Props {
  isAdmin: boolean;
}

// หน้าแจ้งเตือนเต็มหน้าจอ เข้าถึงจากปุ่มกระดิ่งที่ header ทุกหน้า
// รายการมาจากสถานะออเดอร์/คำขอเคลมจริงที่ดึงจาก backend (ไม่มีตาราง "แจ้งเตือน" แยกต่างหาก)
export default function NotificationsScreen({ isAdmin }: Props) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const list = await loadNotifications(isAdmin);
        setItems(list);
      } catch (err: any) {
        console.error("Load notifications error:", err);
        setError(err.message || "ไม่สามารถโหลดการแจ้งเตือนได้");
      } finally {
        setLoading(false);
      }
    })();
  }, [isAdmin]);

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={items}
      keyExtractor={(it) => it.id}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: `${item.iconColor}1A` }]}>
            <Icon name={item.icon} size={19} color={item.iconColor} />
          </View>

          <View style={styles.rowTextGroup}>
            <Text style={styles.rowText}>{item.text}</Text>
            <Text style={styles.rowDate}>{timeAgo(item.date)}</Text>
          </View>
        </View>
      )}
      ListEmptyComponent={
        loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#3D2619" />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : (
          <View style={styles.center}>
            <Icon name="notifications" size={40} color="#C7BEB4" />
            <Text style={styles.emptyText}>ยังไม่มีการแจ้งเตือน</Text>
          </View>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0E9DC",
  },

  list: {
    padding: 16,
    flexGrow: 1,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 10,
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

  row: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8DFD8",
    padding: 14,
    marginBottom: 10,
  },

  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  rowTextGroup: {
    flex: 1,
    justifyContent: "center",
  },

  rowText: {
    fontSize: 13.5,
    color: "#2B2118",
    lineHeight: 19,
    fontWeight: "600",
  },

  rowDate: {
    fontSize: 11.5,
    color: "#8A7D75",
    marginTop: 3,
  },
});
