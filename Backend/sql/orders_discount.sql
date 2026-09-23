-- Run this once against your MySQL database to record discounts applied to orders.
-- Example: mysql -u <user> -p <database> < sql/orders_discount.sql

ALTER TABLE orders
  ADD COLUMN discount_code VARCHAR(40),
  ADD COLUMN discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0;
