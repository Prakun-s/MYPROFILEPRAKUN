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
      description, // <-- เพิ่มบรรทัดนี้
    } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    const productStock = Number(stock) || 0;
    const productPrice = Number(price) || 0;
    const productStockText = stock_text || `${productStock} units`;
    const productBadge =
      badge_status || (productStock < 5 ? "Low in stock" : "Available");
    const productLocationCount = Number(location_count) || 0;

    const [result] = await pool.query(
      `
      INSERT INTO Inventory
      (
        name,
        stock,
        price,
        stock_text,
        category,
        description,
        location_count,
        location_text,
        badge_status,
        image_url
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        name.trim(),
        productStock,
        productPrice,
        productStockText,
        category || "Mirrorless Camera",
        description || "", // <-- เพิ่มบรรทัดนี้
        productLocationCount,
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
    console.error("❌ Add product error:", error);
    res.status(500).json({
      success: false,
      message: "Database error",
      error: error.message,
    });
  }
});

/* -------------------- 2) PUT /api/products/:id -------------------- */

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
      description, // <-- เพิ่มบรรทัดนี้
    } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    const productStock = Number(stock) || 0;
    const productPrice = Number(price) || 0;
    const productStockText = stock_text || `${productStock} units`;
    const productBadge =
      badge_status || (productStock < 5 ? "Low in stock" : "Available");
    const productLocationCount = Number(location_count) || 0;

    const [result] = await pool.query(
      `
      UPDATE Inventory
      SET
        name = ?,
        stock = ?,
        price = ?,
        stock_text = ?,
        category = ?,
        description = ?,
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
        description || "", // <-- เพิ่มบรรทัดนี้
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

// สถานะออเดอร์ที่ระบบยอมรับ (ตรงกับ Backend/sql/orders_status_migration.sql)
const ORDER_STATUSES = ["pending", "shipping", "delivered", "cancelled"];

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
      "SELECT id, total_amount, status, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC",
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
// GET All Orders (เฉพาะ admin) — สำหรับหน้าจัดการออเดอร์
// =========================
app.get(
  "/api/admin/orders",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const [orders] = await pool.query(`
        SELECT o.id, o.user_id, o.total_amount, o.status, o.created_at,
               u.username
        FROM orders o
        LEFT JOIN users u ON u.id = o.user_id
        ORDER BY o.created_at DESC
      `);

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
      console.error("❌ Get all orders error:", error);

      res.status(500).json({
        success: false,
        message: "Database error",
        error: error.message,
      });
    }
  }
);

// =========================
// PUT Update Order Status (เฉพาะ admin)
// =========================
app.put(
  "/api/orders/:id/status",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!ORDER_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `status ต้องเป็นหนึ่งใน: ${ORDER_STATUSES.join(", ")}`,
        });
      }

      const [result] = await pool.query(
        "UPDATE orders SET status = ? WHERE id = ?",
        [status, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "ไม่พบออเดอร์นี้",
        });
      }

      res.json({
        success: true,
        message: "อัปเดตสถานะสำเร็จ",
        data: { id: Number(id), status },
      });
    } catch (error) {
      console.error("❌ Update order status error:", error);

      // เผื่อยังไม่ได้รัน migration เพิ่มคอลัมน์ status ใน DB
      if (error.code === "ER_BAD_FIELD_ERROR") {
        return res.status(500).json({
          success: false,
          message:
            "ยังไม่มีคอลัมน์ status ในตาราง orders — กรุณารัน Backend/sql/orders_status_migration.sql ก่อน",
        });
      }

      res.status(500).json({
        success: false,
        message: "Database error",
        error: error.message,
      });
    }
  }
);

// =========================
// GET Admin Dashboard Summary (เฉพาะ admin)
// ยอดขายรวม / วันนี้ / ย้อนหลัง 7 วัน + สินค้าใกล้หมดสต๊อก + สินค้าขายดี
// =========================
app.get(
  "/api/admin/dashboard",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const [[totals]] = await pool.query(
        `SELECT
           COALESCE(SUM(total_amount), 0) AS total_revenue,
           COUNT(*) AS total_orders
         FROM orders`
      );

      const [[todayTotals]] = await pool.query(
        `SELECT
           COALESCE(SUM(total_amount), 0) AS today_revenue,
           COUNT(*) AS today_orders
         FROM orders
         WHERE DATE(created_at) = CURDATE()`
      );

      const [salesByDay] = await pool.query(
        `SELECT
           DATE(created_at) AS day,
           COALESCE(SUM(total_amount), 0) AS revenue,
           COUNT(*) AS orders
         FROM orders
         WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
         GROUP BY DATE(created_at)
         ORDER BY day ASC`
      );

      const [lowStock] = await pool.query(
        `SELECT id, name, stock, category, image_url, badge_status
         FROM Inventory
         WHERE stock < 5
         ORDER BY stock ASC`
      );

      const [[inventoryTotals]] = await pool.query(
        `SELECT
           COUNT(*) AS product_count,
           COALESCE(SUM(stock * price), 0) AS stock_value
         FROM Inventory`
      );

      const [topProducts] = await pool.query(
        `SELECT
           oi.product_id,
           -- ใช้ชื่อสินค้าปัจจุบันจาก Inventory ถ้ายังไม่ถูกลบ ไม่งั้น fallback เป็นชื่อ ณ ตอนสั่งซื้อล่าสุด
           COALESCE(i.name, MAX(oi.product_name)) AS product_name,
           SUM(oi.quantity) AS units_sold,
           SUM(oi.price * oi.quantity) AS revenue
         FROM order_items oi
         LEFT JOIN Inventory i ON i.id = oi.product_id
         GROUP BY oi.product_id, i.name
         ORDER BY units_sold DESC
         LIMIT 5`
      );

      res.json({
        success: true,
        data: {
          total_revenue: Number(totals.total_revenue),
          total_orders: totals.total_orders,
          today_revenue: Number(todayTotals.today_revenue),
          today_orders: todayTotals.today_orders,
          product_count: inventoryTotals.product_count,
          stock_value: Number(inventoryTotals.stock_value),
          sales_by_day: salesByDay.map((row) => ({
            day: row.day,
            revenue: Number(row.revenue),
            orders: row.orders,
          })),
          low_stock: lowStock,
          top_products: topProducts.map((row) => ({
            ...row,
            units_sold: Number(row.units_sold),
            revenue: Number(row.revenue),
          })),
        },
      });
    } catch (error) {
      console.error("❌ Get dashboard error:", error);

      res.status(500).json({
        success: false,
        message: "Database error",
        error: error.message,
      });
    }
  }
);

// =========================
// Start Server
// =========================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 http://119.59.102.161:${PORT}`);
});