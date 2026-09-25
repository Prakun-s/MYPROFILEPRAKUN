import { useCallback, useEffect, useRef, useState } from "react";

import { ChatMessage, fetchAdminChatThread, sendAdminChatMessage } from "./api";
import ChatThread from "./components/ChatThread";

const POLL_INTERVAL_MS = 5000;

interface Props {
  userId: number;
}

// หน้าแชทฝั่งแอดมิน — คุยกับ user คนใดคนหนึ่ง (เลือกจาก AdminChatListScreen)
export default function AdminChatScreen({ userId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setError("");
        const data = await fetchAdminChatThread(userId);
        setMessages(data);
      } catch (err: any) {
        console.error("Load admin chat thread error:", err);
        if (!silent) setError(err.message || "ไม่สามารถโหลดข้อความแชทได้");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    setLoading(true);
    load();

    pollRef.current = setInterval(() => load(true), POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load]);

  const handleSend = async (text: string) => {
    setSending(true);
    try {
      const sent = await sendAdminChatMessage(userId, text);
      setMessages((prev) => [...prev, sent]);
    } catch (err: any) {
      console.error("Admin send chat message error:", err);
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
      myRole="admin"
      onSend={handleSend}
      placeholder="พิมพ์ข้อความตอบลูกค้า..."
      emptyText="ยังไม่มีข้อความในบทสนทนานี้"
    />
  );
}
