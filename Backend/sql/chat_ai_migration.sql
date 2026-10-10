-- Run this once to let the AI chatbot post replies into chat_messages.
-- Example: mysql -u <user> -p <database> < sql/chat_ai_migration.sql
-- (ต้องรัน chat_messages.sql ก่อน) — ถ้ายังไม่รัน AI จะไม่ตอบ แต่แชทปกติยังใช้ได้

ALTER TABLE chat_messages
  MODIFY sender_role ENUM('user', 'admin', 'ai') NOT NULL;
