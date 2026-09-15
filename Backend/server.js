const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
require("dotenv").config();

const authRouter = require("./src/routes/auth");
const { authenticateToken, requireRole } = require("./src/middleware/auth");

const app = express();

const PORT = process.env.PORT || 3090;

// =========================
// Middleware
// =========================
app.use(cors());
app.use(express.json({ limit: "5mb" }));

// =========================
// Auth routes (login / register / me)
// =========================
app.use("/api/auth", authRouter);

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
// GET Products (ต้อง login แล้ว ไม่ว่าจะเป็น user หรือ admin)
// =========================
app.get("/api/products", authenticateToken, async (req, res) => {
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
// GET Product By ID (ต้อง login แล้ว)
// =========================
app.get("/api/products/:id", authenticateToken, async (req, res) => {
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
// POST Add Product (เฉพาะ admin)
// =========================
app.post("/api/products", authenticateToken, requireRole("admin"), async (req, res) => {
  try {
    const {
      name,
      stock,
      price,
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

    // ราคาสินค้า
    const productPrice = Number(price) || 0;

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
        price,
        stock_text,
        category,
        location_count,
        location_text,
        badge_status,
        image_url
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        name.trim(),
        productStock,
        productPrice,
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
// PUT Update Product (เฉพาะ admin)
// =========================
app.put("/api/products/:id", authenticateToken, requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      stock,
      price,
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

    // ราคาสินค้า
    const productPrice = Number(price) || 0;

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

    // UPDATE
    const [result] = await pool.query(
      `
      UPDATE Inventory
      SET
        name = ?,
        stock = ?,
        price = ?,
        stock_text = ?,
        category = ?,
        location_count = ?,
        location_text = ?,
        badge_status = ?,
        image_url = ?
      WHERE id = ?
      `,
      [
        name.trim(),
        productStock,
        productPrice,
        productStockText,
        category || "Mirrorless Camera",
        productLocationCount,
        location_text || "",
        productBadge,
        image_url || "",
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      message: "Product updated successfully",
    });

  } catch (error) {
    console.error("❌ Update product error:", error);

    res.status(500).json({
      success: false,
      message: "Database error",
      error: error.message,
    });
  }
});

// =========================
// DELETE Product (เฉพาะ admin)
// =========================
app.delete("/api/products/:id", authenticateToken, requireRole("admin"), async (req, res) => {
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
// GET Cart (สินค้าที่อยู่ในตะกร้าของผู้ใช้ที่ login อยู่)
// =========================
app.get("/api/cart", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        ci.id AS cart_item_id,
        ci.quantity,
        i.id AS product_id,
        i.name,
        i.price,
        i.image_url,
        i.stock,
        i.category
      FROM cart_items ci
      JOIN Inventory i ON i.id = ci.product_id
      WHERE ci.user_id = ?
      ORDER BY ci.created_at DESC
      `,
      [req.user.id]
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("❌ Get cart error:", error);

    res.status(500).json({
      success: false,
      message: "Database error",
      error: error.message,
    });
  }
});

// =========================
// POST Add To Cart (เพิ่มสินค้าลงตะกร้า / เพิ่มจำนวนถ้ามีอยู่แล้ว)
// =========================
app.post("/api/cart", authenticateToken, async (req, res) => {
  try {
    const { product_id, quantity } = req.body;
    const qtyToAdd = Number(quantity) || 1;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: "product_id is required",
      });
    }

    const [productRows] = await pool.query(
      "SELECT id, stock FROM Inventory WHERE id = ?",
      [product_id]
    );

    if (productRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const stock = productRows[0].stock;

    const [existing] = await pool.query(
      "SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?",
      [req.user.id, product_id]
    );

    let finalQty;

    if (existing.length > 0) {
      finalQty = Math.min(existing[0].quantity + qtyToAdd, stock);

      await pool.query(
        "UPDATE cart_items SET quantity = ? WHERE id = ?",
        [finalQty, existing[0].id]
      );
    } else {
      finalQty = Math.min(qtyToAdd, stock);

      if (finalQty < 1) {
        return res.status(400).json({
          success: false,
          message: "สินค้าหมด",
        });
      }

      await pool.query(
        "INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)",
        [req.user.id, product_id, finalQty]
      );
    }

    res.status(201).json({
      success: true,
      message: "เพิ่มลงตะกร้าแล้ว",
      quantity: finalQty,
    });
  } catch (error) {
    console.error("❌ Add to cart error:", error);

    res.status(500).json({
      success: false,
      message: "Database error",
      error: error.message,
    });
  }
});

// =========================
// PUT Update Cart Item Quantity
// =========================
app.put("/api/cart/:productId", authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const qty = Number(req.body.quantity);

    // จำนวน <= 0 -> ลบออกจากตะกร้าเลย
    if (!qty || qty < 1) {
      await pool.query(
        "DELETE FROM cart_items WHERE user_id = ? AND product_id = ?",
        [req.user.id, productId]
      );

      return res.json({
        success: true,
        message: "ลบสินค้าออกจากตะกร้าแล้ว",
        quantity: 0,
      });
    }

    const [productRows] = await pool.query(
      "SELECT stock FROM Inventory WHERE id = ?",
      [productId]
    );

    if (productRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // กันไม่ให้ตั้งจำนวนเกินสต็อกที่มีจริง
    const cappedQty = Math.min(qty, productRows[0].stock);

    await pool.query(
      "UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?",
      [cappedQty, req.user.id, productId]
    );

    res.json({
      success: true,
      quantity: cappedQty,
    });
  } catch (error) {
    console.error("❌ Update cart error:", error);

    res.status(500).json({
      success: false,
      message: "Database error",
      error: error.message,
    });
  }
});

// =========================
// DELETE Cart Item
// =========================
app.delete("/api/cart/:productId", authenticateToken, async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM cart_items WHERE user_id = ? AND product_id = ?",
      [req.user.id, req.params.productId]
    );

    res.json({
      success: true,
      message: "ลบสินค้าออกจากตะกร้าแล้ว",
    });
  } catch (error) {
    console.error("❌ Remove cart item error:", error);

    res.status(500).json({
      success: false,
      message: "Database error",
      error: error.message,
    });
  }
});

// =========================
// POST Checkout (จำลองการสั่งซื้อ: ตัดสต็อก + บันทึกประวัติ ไม่มีจ่ายเงินจริง)
// =========================
app.post("/api/checkout", authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // ล็อกแถวสินค้าที่เกี่ยวข้องไว้ระหว่างทำรายการ กันสต็อกชนกันถ้ามีคนซื้อพร้อมกัน
    const [cartRows] = await connection.query(
      `
      SELECT ci.product_id, ci.quantity, i.name, i.price, i.stock
      FROM cart_items ci
      JOIN Inventory i ON i.id = ci.product_id
      WHERE ci.user_id = ?
      FOR UPDATE
      `,
      [req.user.id]
    );

    if (cartRows.length === 0) {
      await connection.rollback();
      connection.release();

      return res.status(400).json({
        success: false,
        message: "ตะกร้าว่างเปล่า",
      });
    }

    // เช็คว่าสต็อกยังพอสำหรับทุกชิ้นไหม (กันกรณีสต็อกเปลี่ยนไปหลังจากเพิ่มลงตะกร้า)
    const insufficient = cartRows.filter((row) => row.quantity > row.stock);

    if (insufficient.length > 0) {
      await connection.rollback();
      connection.release();

      return res.status(409).json({
        success: false,
        message: "สินค้าบางรายการมีไม่พอ กรุณาปรับจำนวนในตะกร้า",
        items: insufficient.map((item) => ({
          product_id: item.product_id,
          name: item.name,
          available: item.stock,
          requested: item.quantity,
        })),
      });
    }

    const totalAmount = cartRows.reduce(
      (sum, row) => sum + Number(row.price) * row.quantity,
      0
    );

    const [orderResult] = await connection.query(
      "INSERT INTO orders (user_id, total_amount) VALUES (?, ?)",
      [req.user.id, totalAmount]
    );

    const orderId = orderResult.insertId;

    for (const item of cartRows) {
      await connection.query(
        `
        INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
        VALUES (?, ?, ?, ?, ?)
        `,
        [orderId, item.product_id, item.name, item.price, item.quantity]
      );

      const newStock = item.stock - item.quantity;
      const newStockText = `${newStock} units`;
      const newBadge = newStock < 5 ? "Low in stock" : "Available";

      await connection.query(
        `
        UPDATE Inventory
        SET stock = ?, stock_text = ?, badge_status = ?
        WHERE id = ?
        `,
        [newStock, newStockText, newBadge, item.product_id]
      );
    }

    await connection.query("DELETE FROM cart_items WHERE user_id = ?", [
      req.user.id,
    ]);

    await connection.commit();
    connection.release();

    res.status(201).json({
      success: true,
      message: "สั่งซื้อสำเร็จ",
      order: {
        id: orderId,
        total_amount: totalAmount,
        item_count: cartRows.length,
      },
    });
  } catch (error) {
    await connection.rollback();
    connection.release();

    console.error("❌ Checkout error:", error);

    res.status(500).json({
      success: false,
      message: "Checkout failed",
      error: error.message,
    });
  }
});

// =========================
// GET My Orders (ประวัติการสั่งซื้อของผู้ใช้ที่ login อยู่)
// =========================
app.get("/api/orders/my", authenticateToken, async (req, res) => {
  try {
    const [orders] = await pool.query(
      "SELECT id, total_amount, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC",
      [req.user.id]
    );

    for (const order of orders) {
      const [items] = await pool.query(
        "SELECT product_id, product_name, price, quantity FROM order_items WHERE order_id = ?",
        [order.id]
      );

      order.items = items;
    }

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("❌ Get orders error:", error);

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