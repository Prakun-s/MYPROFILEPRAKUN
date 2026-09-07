const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 3090;

// =========================
// Middleware
// =========================
app.use(cors());
app.use(express.json({ limit: "5mb" }));

// =========================
// MySQL Connection
// =========================
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  timezone: "+07:00",
});

// =========================
// Test MySQL
// =========================
async function testMySQL() {
  try {
    const conn = await pool.getConnection();

    console.log("✅ Connected to MySQL:", process.env.DB_NAME);

    conn.release();
  } catch (error) {
    console.error("❌ MySQL connection failed:", error.message);
  }
}

testMySQL();

// =========================
// Test Server
// =========================
app.get("/", (req, res) => {
  res.json({
    message: "Backend API is running",
  });
});

// =========================
// Test API
// =========================
app.get("/api", (req, res) => {
  res.json({
    message: "API is working",
    status: "success",
  });
});

// =========================
// GET Products
// =========================
app.get("/api/products", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM Inventory ORDER BY id DESC"
    );

    res.json({
      success: true,
      data: rows,
    });

  } catch (error) {
    console.error("❌ Get products error:", error);

    res.status(500).json({
      success: false,
      message: "Database error",
      error: error.message,
    });
  }
});

// =========================
// GET Product By ID
// =========================
app.get("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      "SELECT * FROM Inventory WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      data: rows[0],
    });

  } catch (error) {
    console.error("❌ Get product error:", error);

    res.status(500).json({
      success: false,
      message: "Database error",
      error: error.message,
    });
  }
});

// =========================
// POST Add Product
// =========================
app.post("/api/products", async (req, res) => {
  try {
    const {
      name,
      stock,
      stock_text,
      category,
      location_count,
      location_text,
      badge_status,
      image_url,
    } = req.body;

    // ตรวจสอบชื่อสินค้า
    if (!name || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    // จำนวนสินค้า
    const productStock = Number(stock) || 0;

    // ข้อความ Stock
    const productStockText =
      stock_text || `${productStock} units`;

    // สถานะ Stock
    const productBadge =
      badge_status ||
      (productStock < 5
        ? "Low in stock"
        : "Available");

    // จำนวน Location
    const productLocationCount =
      Number(location_count) || 0;

    // INSERT
    const [result] = await pool.query(
      `
      INSERT INTO Inventory
      (
        name,
        stock,
        stock_text,
        category,
        location_count,
        location_text,
        badge_status,
        image_url
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        name.trim(),
        productStock,
        productStockText,
        category || "Mirrorless Camera",
        productLocationCount,
        location_text || "",
        productBadge,
        image_url || "",
      ]
    );

    // ส่งผลลัพธ์
    res.status(201).json({
      success: true,
      productId: result.insertId,
      message: "Product added successfully",
    });

  } catch (error) {
    console.error("❌ Add product error:", error);

    res.status(500).json({
      success: false,
      message: "Database error",
      error: error.message,
    });
  }
});

// =========================
// DELETE Product
// =========================
app.delete("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      "DELETE FROM Inventory WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      message: "Product deleted successfully",
    });

  } catch (error) {
    console.error("❌ Delete product error:", error);

    res.status(500).json({
      success: false,
      message: "Database error",
      error: error.message,
    });
  }
});

// =========================
// Start Server
// =========================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 http://119.59.102.161:${PORT}`);
});