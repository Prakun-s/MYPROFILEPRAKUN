import { useCallback, useEffect, useRef, useState } from "react";

import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import {
  BotSendError,
  ChatMessage,
  clearBotChat,
  fetchBotChat,
  sendBotMessage,
} from "./api";
import ChatThread from "./components/ChatThread";
import ConfirmDialog from "./components/ConfirmDialog";

const BOT_NAME = "I AUAN";

// หน้าแชทกับบอท AI "I AUAN" — แยกจากแชทกับแอดมิน (คนละตาราง คนละเส้นทาง API)
// ไม่มีการโพล: ส่งข้อความแล้วรอบอทตอบในคำขอเดียวกัน
export default function BotChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [clearDialogVisible, setClearDialogVisible] = useState(false);
  const tempIdRef = useRef(-1);

  const nextTempId = () => {
    tempIdRef.current -= 1;
    return tempIdRef.current;
  };

  const load = useCallback(async () => {
    try {
      setError("");
      setMessages(await fetchBotChat());
    } catch (err: any) {
      console.error("Load bot chat error:", err);
      setError(err.message || "ไม่สามารถโหลดแชทกับ I AUAN ได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSend = async (text: string) => {
    const tempUser: ChatMessage = {
      id: nextTempId(),
      user_id: 0,
      sender_role: "user",
      message: text,
      is_read: 1,
      created_at: new Date().toISOString(),
    };

    // แสดงข้อความของลูกค้าทันที ระหว่างรอบอทตอบ
    setMessages((prev) => [...prev, tempUser]);
    setSending(true);

    try {
      const { user_message, bot_message } = await sendBotMessage(text);

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUser.id),
        user_message,
        bot_message,
      ]);
    } catch (err: any) {
      // ใช้ warn ไม่ใช่ error: บอทตอบไม่ได้เป็นเรื่องที่คาดไว้และหน้าจอแสดงข้อความแจ้งเองแล้ว (กันไม่ให้ขึ้นกล่องแดงตอนพัฒนา)
      console.warn("Send bot message failed:", err?.message);

      // บอทตอบไม่ได้: แสดงเป็นข้อความแจ้งจากบอท (เฉพาะในหน้าจอ ไม่ได้บันทึกลงฐานข้อมูล)
      const notice: ChatMessage = {
        id: nextTempId(),
        user_id: 0,
        sender_role: "ai",
        message: err.message || "ส่งข้อความไม่สำเร็จ",
        is_read: 1,
        created_at: new Date().toISOString(),
      };

      const saved = err instanceof BotSendError ? err.savedUserMessage : null;

      setMessages((prev) => [
        ...prev.map((m) => (saved && m.id === tempUser.id ? saved : m)),
        notice,
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleConfirmClear = async () => {
    setClearDialogVisible(false);

    try {
      await clearBotChat();
      setMessages([]);
    } catch (err: any) {
      console.error("Clear bot chat error:", err);
      setError(err.message || "ล้างประวัติแชทไม่สำเร็จ");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.infoBar}>
        <Text style={styles.infoText} numberOfLines={2}>
          {BOT_NAME} เป็นบอทตอบอัตโนมัติจากข้อมูลในระบบ เรื่องที่ไม่อยู่ในขอบเขตให้คุยกับแอดมิน
        </Text>

        {messages.length > 0 && (
          <TouchableOpacity activeOpacity={0.7} onPress={() => setClearDialogVisible(true)}>
            <Text style={styles.clearText}>ล้างแชท</Text>
          </TouchableOpacity>
        )}
      </View>

      <ChatThread
        messages={messages}
        loading={loading}
        error={error}
        sending={sending}
        myRole="user"
        onSend={handleSend}
        botName={BOT_NAME}
        placeholder={`ถาม ${BOT_NAME} เช่น "ออเดอร์ล่าสุดของฉัน"`}
        emptyText={`สวัสดี ฉันคือ ${BOT_NAME} ถามเรื่องสถานะออเดอร์ เคลม เหรียญสะสม โค้ดส่วนลด ราคา/สต็อกสินค้า ใบเสร็จ หรือวิธีชำระเงินได้เลย`}
      />

      <ConfirmDialog
        visible={clearDialogVisible}
        title="ล้างแชท"
        message={`ต้องการล้างประวัติการคุยกับ ${BOT_NAME} ทั้งหมดใช่หรือไม่?`}
        confirmText="ล้างแชท"
        cancelText="ยกเลิก"
        destructive
        onConfirm={handleConfirmClear}
        onCancel={() => setClearDialogVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0E9DC",
  },

  infoBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FBF3E4",
    borderBottomWidth: 1,
    borderBottomColor: "#E8DFD8",
  },

  infoText: {
    flex: 1,
    fontSize: 11.5,
    color: "#8A5416",
  },

  clearText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#C53030",
  },
});
