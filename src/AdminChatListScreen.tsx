import { useCallback, useEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { ChatConversation, fetchAdminChatConversations } from "./api";
import Icon from "./components/Icon";
import { timeAgo } from "./lib/notifications";

const POLL_INTERVAL_MS = 8000;

interface Props {
  onOpenConversation: (userId: number, displayName: string) => void;
}

// หน้ารายชื่อบทสนทนาทั้งหมด (ฝั่งแอดมิน) — เรียงตามข้อความล่าสุด มีจุดแจ้งเตือนถ้ายังไม่อ่าน
export default function AdminChatListScreen({ onOpenConversation }: Props) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setError("");
      const data = await fetchAdminChatConversations();
      setConversations(data);
    } catch (err: any) {
      console.error("Load chat conversations error:", err);
      if (!silent) setError(err.message || "ไม่สามารถโหลดรายชื่อบทสนทนาได้");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    pollRef.current = setInterval(() => load(true), POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load]);

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
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={conversations}
      keyExtractor={(c) => String(c.user_id)}
      renderItem={({ item }) => {
        const displayName = item.full_name?.trim() || item.username;
        const preview =
          (item.last_sender_role === "admin" ? "คุณ: " : "") + (item.last_message || "");

        return (
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => onOpenConversation(item.user_id, displayName)}
          >
            {item.avatar_url ? (
              <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
              </View>
            )}

            <View style={styles.rowInfo}>
              <View style={styles.rowTopLine}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={styles.rowTime}>{timeAgo(item.last_message_at)}</Text>
              </View>

              <View style={styles.rowBottomLine}>
                <Text
                  style={[styles.rowPreview, item.unread_count > 0 && styles.rowPreviewUnread]}
                  numberOfLines={1}
                >
                  {preview}
                </Text>

                {item.unread_count > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>
                      {item.unread_count > 9 ? "9+" : item.unread_count}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        );
      }}
      ListEmptyComponent={
        <View style={styles.center}>
          <Icon name="forum" size={40} color="#C7BEB4" />
          <Text style={styles.emptyText}>ยังไม่มีบทสนทนาจากลูกค้า</Text>
        </View>
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

  errorText: {
    fontSize: 14,
    color: "#C53030",
    textAlign: "center",
  },

  emptyText: {
    fontSize: 13,
    color: "#8A7D75",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8DFD8",
    padding: 12,
    marginBottom: 10,
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#F0EDE9",
  },

  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3D2619",
  },

  avatarInitial: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  rowInfo: {
    flex: 1,
  },

  rowTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },

  rowName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#3D2619",
    marginRight: 8,
  },

  rowTime: {
    fontSize: 10.5,
    color: "#A69A8F",
  },

  rowBottomLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  rowPreview: {
    flex: 1,
    fontSize: 12,
    color: "#8A7D75",
    marginRight: 8,
  },

  rowPreviewUnread: {
    color: "#3D2619",
    fontWeight: "600",
  },

  unreadBadge: {
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: "#D97706",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },

  unreadBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
