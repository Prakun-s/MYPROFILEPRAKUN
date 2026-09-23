-- Run this once against your MySQL database to enable product ratings/reviews.
-- Example: mysql -u <user> -p <database> < sql/product_reviews.sql

-- รีวิว 1 รายการต่อผู้ใช้ 1 คนต่อสินค้า 1 ชิ้น (รีวิวซ้ำ = แก้ไขรีวิวเดิมแทน)
-- ไม่ใส่ FOREIGN KEY เพราะบัญชี DB บางโฮสต์ไม่มีสิทธิ์ REFERENCES
CREATE TABLE IF NOT EXISTS product_reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  user_id INT NOT NULL,
  rating TINYINT NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uniq_review_user_product (product_id, user_id),
  INDEX idx_review_product (product_id)
);
