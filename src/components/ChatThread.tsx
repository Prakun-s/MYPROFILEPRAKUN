import { useEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ChatMessage } from "../api";
import Icon from "./Icon";

interface Props {
  messages: ChatMessage[];
  loading: boolean;
  error: string;
  sending: boolean;
  // ฝั่งของ "ฉัน" ในหน้าจอนี้ — ใช้กำหนดว่าข้อความไหนชิดขวา (ของฉัน) ข้อความไหนชิดซ้าย (อีกฝ่าย)
  myRole: "user" | "admin";
  onSend: (text: string) => Promise<void> | void;
  placeholder?: string;
  emptyText?: string;
}

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

// UI กล่องแชทแบบฟองข้อความ ใช้ร่วมกันทั้งฝั่ง user (คุยกับแอดมิน) และฝั่ง admin (คุยกับ user แต่ละคน)
export default function ChatThread({
  messages,
  loading,
  error,
  sending,
  myRole,
  onSend,
  placeholder = "พิมพ์ข้อความ...",
  emptyText = "ยังไม่มีข้อความ เริ่มพิมพ์ทักทายได้เลย",
}: Props) {
  const [text, setText] = useState("");
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setText("");
    await onSend(trimmed);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3D2619" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.center}>
              <Icon name="forum" size={40} color="#C7BEB4" />
              <Text style={styles.emptyText}>{emptyText}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMine = item.sender_role === myRole;

            return (
              <View
                style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}
              >
                <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>
                    {item.message}
                  </Text>
                </View>
                <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>
                  {formatTime(item.created_at)}
                </Text>
              </View>
            );
          }}
        />
      )}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#A69A8F"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={2000}
        />

        <TouchableOpacity
          style={[styles.sendButton, (!text.trim() || sending) && styles.sendButtonDisabled]}
          activeOpacity={0.8}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Icon name="send" size={17} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0E9DC",
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
    paddingHorizontal: 24,
  },

  emptyText: {
    fontSize: 13,
    color: "#8A7D75",
    textAlign: "center",
    paddingHorizontal: 30,
  },

  list: {
    flex: 1,
  },

  listContent: {
    padding: 16,
    flexGrow: 1,
  },

  bubbleRow: {
    marginBottom: 12,
    maxWidth: "80%",
  },

  bubbleRowMine: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },

  bubbleRowTheirs: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },

  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  bubbleMine: {
    backgroundColor: "#3D2619",
    borderBottomRightRadius: 4,
  },

  bubbleTheirs: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8DFD8",
    borderBottomLeftRadius: 4,
  },

  bubbleText: {
    fontSize: 13.5,
    lineHeight: 19,
    color: "#2B2118",
  },

  bubbleTextMine: {
    color: "#FFFFFF",
  },

  bubbleTime: {
    fontSize: 10,
    color: "#A69A8F",
    marginTop: 3,
    marginHorizontal: 4,
  },

  bubbleTimeMine: {
    color: "#A69A8F",
  },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E8DFD8",
  },

  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: "#F0E9DC",
    borderWidth: 1,
    borderColor: "#E8DFD8",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 13.5,
    color: "#2B2118",
  },

  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3D2619",
    alignItems: "center",
    justifyContent: "center",
  },

  sendButtonDisabled: {
    opacity: 0.4,
  },
});
