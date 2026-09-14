// สร้าง/รีเซ็ตบัญชี admin คนแรกจาก command line
// วิธีใช้:  node scripts/create-admin.js <username> <password>
require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("../src/db");

async function main() {
  const [, , username, password] = process.argv;

  if (!username || !password) {
    console.log("Usage: node scripts/create-admin.js <username> <password>");
    process.exit(1);
  }

  if (password.length < 6) {
    console.log("Password must be at least 6 characters");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await pool.query(
    `INSERT INTO users (username, password_hash, role)
     VALUES (?, ?, 'admin')
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'admin'`,
    [username, passwordHash]
  );

  console.log(`✅ Admin user "${username}" is ready.`);
  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Failed to create admin:", error);
  process.exit(1);
});
