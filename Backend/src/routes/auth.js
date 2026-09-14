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

module.exports = router;
