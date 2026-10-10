-- Run this once to enable the "I AUAN" AI chatbot (separate from admin <-> user chat).
-- Example: mysql -u <user> -p <database> < sql/bot_messages.sql
-- หรือเปิดแท็บ SQL ใน phpMyAdmin แล้ววางคำสั่งนี้

-- ประวัติแชทระหว่างลูกค้าแต่ละคนกับบอท I AUAN (คนละตารางกับ chat_messages ที่คุยกับแอดมิน)
-- ไม่ใส่ FOREIGN KEY เพราะบัญชี DB บางโฮสต์ไม่มีสิทธิ์ REFERENCES
CREATE TABLE IF NOT EXISTS bot_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  role ENUM('user', 'bot') NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_bot_user (user_id, id)
);
