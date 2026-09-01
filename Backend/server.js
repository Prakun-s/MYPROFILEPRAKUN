const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 3090;

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
});

// =========================
// Test API
// =========================
app.get("/", (req, res) => {
  res.json({
    message: "Backend API is running",
  });
});

app.get("/api", (req, res) => {
  res.json({
    message: "API is working",
    status: "success"
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

    res.json(rows);
  } catch (error) {
    console.error("Get products error:", error);

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

    // กำหนดค่า stock
    const productStock = Number(stock) || 0;

    // ถ้า stock น้อยกว่า 5 ให้เป็น Low in stock
    const productBadge =
      badge_status ||
      (productStock < 5 ? "Low in stock" : "Available");

    const productStockText =
      stock_text || `${productStock} units`;

    const [result] = await pool.query(
      `INSERT INTO Inventory
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        productStock,
        productStockText,
        category || "Mirrorless Camera",
        Number(location_count) || 0,
        location_text || "",
        productBadge,
        image_url || "",
      ]
    );

    res.status(201).json({
      success: true,
      productId: result.insertId,
      message: "Product added successfully",
    });

  } catch (error) {
    console.error("Add product error:", error);

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
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});