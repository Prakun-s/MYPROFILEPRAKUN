-- Run this once against your MySQL database to enable seasonal discount codes
-- and the coin-redemption shop.
-- Example: mysql -u <user> -p <database> < sql/discounts.sql

-- โค้ดส่วนลด: ใช้ร่วมกัน 3 แบบ
--   source = 'admin'       -> โค้ดสาธารณะที่แอดมินสร้างเอง (เช่นตามเทศกาล) ใช้ได้หลายคน/หลายครั้งตาม usage_limit
--   source = 'collected'   -> สำเนาส่วนตัวที่ผู้ใช้กด "เก็บโค้ด" มาจากโค้ดสาธารณะของแอดมิน ใช้ได้ครั้งเดียว
--   source = 'coin_redeem' -> โค้ดส่วนตัวที่ผู้ใช้แลกด้วยเหรียญสะสม ผูกกับ owner_user_id คนเดียว ใช้ได้ครั้งเดียว
CREATE TABLE IF NOT EXISTS discount_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) NOT NULL,
  label VARCHAR(255) NOT NULL,
  season VARCHAR(50),
  discount_type ENUM('percent', 'fixed') NOT NULL DEFAULT 'percent',
  discount_value DECIMAL(10, 2) NOT NULL,
  max_discount_amount DECIMAL(10, 2),
  min_order_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  start_date DATE,
  end_date DATE,
  usage_limit INT,
  used_count INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  owner_user_id INT,
  source ENUM('admin', 'coin_redeem', 'collected') NOT NULL DEFAULT 'admin',
  source_code_id INT,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uniq_discount_code (code),
  INDEX idx_discount_owner (owner_user_id)
);

-- แคตตาล็อก "ร้านค้าเหรียญ": รางวัล/ป้ายส่วนลดที่แลกได้ด้วยเหรียญสะสม
CREATE TABLE IF NOT EXISTS coin_rewards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(255),
  coin_cost INT NOT NULL,
  discount_type ENUM('percent', 'fixed') NOT NULL DEFAULT 'fixed',
  discount_value DECIMAL(10, 2) NOT NULL,
  max_discount_amount DECIMAL(10, 2),
  min_order_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  valid_days INT NOT NULL DEFAULT 30,
  stock INT,
  redeemed_count INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ประวัติการแลกเหรียญเป็นโค้ดส่วนลด
CREATE TABLE IF NOT EXISTS coin_redemptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  reward_id INT NOT NULL,
  coins_spent INT NOT NULL,
  discount_code_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_redeem_user (user_id)
);
