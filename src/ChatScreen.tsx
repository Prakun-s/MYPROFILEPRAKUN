import { useCallback, useEffect, useRef, useState } from "react";

import { ChatMessage, fetchMyChat, sendMyChatMessage } from "./api";
import ChatThread from "./components/ChatThread";

const POLL_INTERVAL_MS = 5000;

// หน้าแชทฝั่ง user — คุยกับแอดมินโดยตรง (ระบบมีแอดมินเดียว จึงไม่ต้องเลือกคู่สนทนา)
export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setError("");
      const data = await fetchMyChat();
      setMessages(data);
    } catch (err: any) {
      console.error("Load my chat error:", err);
      if (!silent) setError(err.message || "ไม่สามารถโหลดข้อความแชทได้");
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

  const handleSend = async (text: string) => {
    setSending(true);
    try {
      const sent = await sendMyChatMessage(text);
      setMessages((prev) => [...prev, sent]);
    } catch (err: any) {
      console.error("Send chat message error:", err);
      setError(err.message || "ส่งข้อความไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  };

  return (
    <ChatThread
      messages={messages}
      loading={loading}
      error={error}
      sending={sending}
      myRole="user"
      onSend={handleSend}
      placeholder="พิมพ์ข้อความถึงแอดมิน..."
      emptyText="ยังไม่มีข้อความ พิมพ์ทักทายแอดมินได้เลย"
    />
  );
}
