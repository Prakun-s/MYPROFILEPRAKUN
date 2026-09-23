const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const pool = require("../db");
const { authenticateToken, requireRole } = require("../middleware/auth");

const JWT_EXPIRES_IN = "7d";

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// =========================
// POST /api/auth/register
// สมัครสมาชิกสาธารณะ -> ได้ role "user" เสมอ
// (การสร้างบัญชี admin ทำผ่าน register-admin หรือ scripts/create-admin.js เท่านั้น)
// =========================
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !username.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const cleanUsername = username.trim();

    const [existing] = await pool.query(
      "SELECT id FROM users WHERE username = ?",
      [cleanUsername]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Username already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      "INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'user')",
      [cleanUsername, passwordHash]
    );

    const user = {
      id: result.insertId,
      username: cleanUsername,
      role: "user",
    };

    const token = signToken(user);

    res.status(201).json({
      success: true,
      token,
      user,
    });
  } catch (error) {
    console.error("❌ Register error:", error);

    res.status(500).json({
      success: false,
      message: "Database error",
      error: error.message,
    });
  }
});

// =========================
// POST /api/auth/login
// =========================
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    const [rows] = await pool.query(
      "SELECT * FROM users WHERE username = ?",
      [username.trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    const dbUser = rows[0];
    const passwordMatches = await bcrypt.compare(password, dbUser.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    const user = {
      id: dbUser.id,
      username: dbUser.username,
      role: dbUser.role,
    };

    const token = signToken(user);

    res.json({
      success: true,
      token,
      user,
    });
  } catch (error) {
    console.error("❌ Login error:", error);

    res.status(500).json({
      success: false,
      message: "Database error",
      error: error.message,
    });
  }
});

// =========================
// GET /api/auth/me
// ใช้ตอนเปิดแอปเพื่อตรวจว่า token ที่เก็บไว้ยังใช้ได้อยู่ไหม
// =========================
router.get("/me", authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

// =========================
// POST /api/auth/register-admin
// สร้างบัญชี admin เพิ่ม -> ต้อง login เป็น admin อยู่แล้วเท่านั้นถึงจะเรียกได้
// =========================
router.post(
  "/register-admin",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !username.trim() || !password) {
        return res.status(400).json({
          success: false,
          message: "Username and password are required",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters",
        });
      }

      const cleanUsername = username.trim();

      const [existing] = await pool.query(
        "SELECT id FROM users WHERE username = ?",
        [cleanUsername]
      );

      if (existing.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Username already exists",
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const [result] = await pool.query(
        "INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')",
        [cleanUsername, passwordHash]
      );

      res.status(201).json({
        success: true,
        user: {
          id: result.insertId,
          username: cleanUsername,
          role: "admin",
        },
      });
    } catch (error) {
      console.error("❌ Register admin error:", error);

      res.status(500).json({
        success: false,
        message: "Database error",
        error: error.message,
      });
    }
  }
);

// =========================
// GET /api/auth/profile
// ข้อมูลโปรไฟล์แบบเต็ม (username, role ใน token มีอยู่แล้ว แต่ข้อมูลโปรไฟล์ต้องดึงจาก DB สดๆ)
// =========================
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const [[user]] = await pool.query(
      `SELECT id, username, role, full_name, email, phone, address, avatar_url, created_at
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "ไม่พบผู้ใช้นี้" });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error("❌ Get profile error:", error);

    if (error.code === "ER_BAD_FIELD_ERROR") {
      return res.status(500).json({
        success: false,
        message: "ยังไม่มีคอลัมน์โปรไฟล์ในตาราง users — กรุณารัน Backend/sql/user_profile.sql ก่อน",
      });
    }

    res.status(500).json({ success: false, message: "Database error", error: error.message });
  }
});

// =========================
// PUT /api/auth/profile
// แก้ไขข้อมูลโปรไฟล์ (ไม่รวมรหัสผ่าน/username/role)
// =========================
router.put("/profile", authenticateToken, async (req, res) => {
  try {
    const { full_name, email, phone, address, avatar_url } = req.body;

    await pool.query(
      `UPDATE users
       SET full_name = ?, email = ?, phone = ?, address = ?, avatar_url = ?
       WHERE id = ?`,
      [
        full_name?.trim() || null,
        email?.trim() || null,
        phone?.trim() || null,
        address?.trim() || null,
        avatar_url?.trim() || null,
        req.user.id,
      ]
    );

    res.json({ success: true, message: "บันทึกโปรไฟล์สำเร็จ" });
  } catch (error) {
    console.error("❌ Update profile error:", error);

    if (error.code === "ER_BAD_FIELD_ERROR") {
      return res.status(500).json({
        success: false,
        message: "ยังไม่มีคอลัมน์โปรไฟล์ในตาราง users — กรุณารัน Backend/sql/user_profile.sql ก่อน",
      });
    }

    res.status(500).json({ success: false, message: "Database error", error: error.message });
  }
});

// =========================
// PUT /api/auth/password
// เปลี่ยนรหัสผ่าน (ต้องยืนยันรหัสผ่านเดิมก่อน)
// =========================
router.put("/password", authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกรหัสผ่านเดิมและรหัสผ่านใหม่",
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร",
      });
    }

    const [[dbUser]] = await pool.query("SELECT password_hash FROM users WHERE id = ?", [
      req.user.id,
    ]);

    if (!dbUser) {
      return res.status(404).json({ success: false, message: "ไม่พบผู้ใช้นี้" });
    }

    const matches = await bcrypt.compare(current_password, dbUser.password_hash);

    if (!matches) {
      return res.status(401).json({ success: false, message: "รหัสผ่านเดิมไม่ถูกต้อง" });
    }

    const newHash = await bcrypt.hash(new_password, 10);

    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [
      newHash,
      req.user.id,
    ]);

    res.json({ success: true, message: "เปลี่ยนรหัสผ่านสำเร็จ" });
  } catch (error) {
    console.error("❌ Change password error:", error);
    res.status(500).json({ success: false, message: "Database error", error: error.message });
  }
});

module.exports = router;
