-- รันไฟล์นี้เฉพาะถ้าคุณเคยรัน Backend/sql/discounts.sql ไปแล้วก่อนหน้านี้
-- (ถ้ายังไม่เคยรัน ให้รัน Backend/sql/discounts.sql เวอร์ชันล่าสุดแทน ไม่ต้องรันไฟล์นี้)
-- เพิ่มความสามารถ "เก็บโค้ดส่วนลด" จากโค้ดสาธารณะของแอดมินมาเป็นโค้ดส่วนตัว

ALTER TABLE discount_codes
  ADD COLUMN source_code_id INT NULL,
  MODIFY COLUMN source ENUM('admin', 'coin_redeem', 'collected') NOT NULL DEFAULT 'admin';
