-- Run this once against your MySQL database to enable admin<->user chat.
-- Example: mysql -u <user> -p <database> < sql/chat_messages.sql

-- ข้อความแชทระหว่างผู้ใช้แต่ละคนกับแอดมิน (1 คู่สนทนาต่อ user_id หนึ่งคน — ระบบมีแอดมินเดียว)
-- ไม่ใส่ FOREIGN KEY เพราะบัญชี DB บางโฮสต์ไม่มีสิทธิ์ REFERENCES
CREATE TABLE IF NOT EXISTS chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  sender_role ENUM('user', 'admin') NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_chat_user (user_id),
  INDEX idx_chat_user_created (user_id, created_at)
);
