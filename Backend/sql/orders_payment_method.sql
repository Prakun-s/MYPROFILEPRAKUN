-- Run this once against your MySQL database to record how each order was paid for.
-- Example: mysql -u <user> -p <database> < sql/orders_payment_method.sql

ALTER TABLE orders
  ADD COLUMN payment_method VARCHAR(30) NOT NULL DEFAULT 'cod';
