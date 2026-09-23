-- Run this once against your MySQL database to enable the user profile screen.
-- Example: mysql -u <user> -p <database> < sql/user_profile.sql

  ALTER TABLE users
    ADD COLUMN full_name VARCHAR(100),
    ADD COLUMN email VARCHAR(100),
    ADD COLUMN phone VARCHAR(20),
    ADD COLUMN address TEXT,
    ADD COLUMN avatar_url VARCHAR(500);
