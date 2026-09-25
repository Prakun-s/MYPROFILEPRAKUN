const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const authRouter = require("./src/routes/auth");
const { authenticateToken, requireRole } = require("./src/middleware/auth");
const { calculateCoinsWithAI } = require("./src/coinCalculator");
const { validateDiscountCode, generateVoucherCode } = require("./src/discountEngine");

const app = express();

const PORT = process.env.PORT || 3090;

// =========================
// Middleware
// =========================
app.use(cors());
app.use(express.json({ limit: "5mb" }));
// =========================
// อัปโหลดรูปโปรไฟล์ (avatar) — เก็บไฟล์จริงไว้ในเครื่อง server แล้ว serve ผ่าน /uploads
// =========================
const AVATAR_UPLOAD_DIR = path.join(__dirname, "uploads", "avatars");
fs.mkdirSync(AVATAR_UPLOAD_DIR, { recursive: true });

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AVATAR_UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    const safeExt = [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext) ? ext : ".jpg";
    cb(null, `avatar-${req.user.id}-${Date.now()}${safeExt}`);
  },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("รองรับเฉพาะไฟล์รูปภาพเท่านั้น"));
    }
    cb(null, true);
  },
});

app.post(
  "/api/upload/avatar",
  authenticateToken,
  (req, res, next) => {
    uploadAvatar.single("avatar")(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || "อัปโหลดรูปไม่สำเร็จ",
        });
      }
      next();
    });
  },
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "ไม่พบไฟล์รูปภาพที่อัปโหลด",
      });
    }

    const url = `${req.protocol}://${req.get("host")}/uploads/avatars/${req.file.filename}`;

    res.json({
      success: true,
      url,
    });
  }
);

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
// Product Reviews (คะแนน + รีวิวสินค้า)
// =========================

// GET รีวิวทั้งหมดของสินค้าชิ้นนี้ + สรุปคะแนนเฉลี่ย + รีวิวของผู้ใช้ที่ login อยู่ (ถ้ามี)
app.get("/api/products/:id/reviews", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [reviews] = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.user_id, r.created_at, r.updated_at, u.username
       FROM product_reviews r
       LEFT JOIN users u ON u.id = r.user_id
       WHERE r.product_id = ?
       ORDER BY r.created_at DESC`,
      [id]
    );

    const reviewCount = reviews.length;
    const averageRating =
      reviewCount > 0
        ? reviews.reduce((sum, r) => sum + Number(r.rating), 0) / reviewCount
        : 0;

    const myReview = reviews.find((r) => r.user_id === req.user.id) || null;

    res.json({
      success: true,
      data: {
        reviews,
        review_count: reviewCount,
        average_rating: Math.round(averageRating * 10) / 10,
        my_review: myReview,
      },
    });
  } catch (error) {
    console.error("❌ Get product reviews error:", error);

    if (error.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({
        success: false,
        message: "ยังไม่มีระบบรีวิวในฐานข้อมูล — กรุณารัน Backend/sql/product_reviews.sql ก่อน",
      });
    }

    res.status(500).json({ success: false, message: "Database error", error: error.message });
  }
});

// POST ให้คะแนน+เขียนรีวิวสินค้า (รีวิวซ้ำ = แก้ไขรีวิวเดิมของตัวเองแทน)
app.post("/api/products/:id/reviews", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    const ratingNum = Number(rating);

    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ success: false, message: "คะแนนต้องเป็นจำนวนเต็ม 1-5" });
    }

    const [[product]] = await pool.query("SELECT id FROM Inventory WHERE id = ?", [id]);

    if (!product) {
      return res.status(404).json({ success: false, message: "ไม่พบสินค้านี้" });
    }

    await pool.query(
      `
      INSERT INTO product_reviews (product_id, user_id, rating, comment)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment)
      `,
      [id, req.user.id, ratingNum, comment ? String(comment).trim().slice(0, 2000) : null]
    );

    res.status(201).json({ success: true, message: "บันทึกรีวิวสำเร็จ" });
  } catch (error) {
    console.error("❌ Create/update product review error:", error);

    if (error.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({
        success: false,
        message: "ยังไม่มีระบบรีวิวในฐานข้อมูล — กรุณารัน Backend/sql/product_reviews.sql ก่อน",
      });
    }

    res.status(500).json({ success: false, message: "Database error", error: error.message });
  }
});

// DELETE ลบรีวิวของตัวเอง
app.delete("/api/products/:id/reviews", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      "DELETE FROM product_reviews WHERE product_id = ? AND user_id = ?",
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "ไม่พบรีวิวของคุณสำหรับสินค้านี้" });
    }

    res.json({ success: true, message: "ลบรีวิวแล้ว" });
  } catch (error) {
    console.error("❌ Delete product review error:", error);
    res.status(500).json({ success: false, message: "Database error", error: error.message });
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

// วิธีชำระเงินที่ระบบยอมรับ (ตรงกับ Backend/sql/orders_payment_method.sql)
// เป็นการจำลองเท่านั้น ไม่มีการเชื่อมต่อ payment gateway จริง
const PAYMENT_METHODS = ["cod", "bank_transfer", "promptpay", "credit_card"];

// =========================
// POST Checkout (จำลองการสั่งซื้อ: ตัดสต็อก + บันทึกประวัติ ไม่มีจ่ายเงินจริง)
// =========================
app.post("/api/checkout", authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();

  const paymentMethod = PAYMENT_METHODS.includes(req.body.payment_method)
    ? req.body.payment_method
    : "cod";

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

    // ถ้ามีโค้ดส่วนลดแนบมา ตรวจสอบซ้ำฝั่ง server เสมอ (ห้ามเชื่อตัวเลขที่ฝั่งแอปคำนวณมา)
    let discountAmount = 0;
    let appliedDiscountCode = null;
    let discountRow = null;

    if (req.body.discount_code) {
      const result = await validateDiscountCode(
        connection,
        req.body.discount_code,
        totalAmount,
        req.user.id
      );

      if (!result.valid) {
        await connection.rollback();
        connection.release();

        return res.status(400).json({
          success: false,
          message: result.message,
        });
      }

      discountAmount = result.discountAmount;
      appliedDiscountCode = result.row.code;
      discountRow = result.row;
    }

    const finalAmount = Math.max(0, totalAmount - discountAmount);

    const [orderResult] = await connection.query(
      "INSERT INTO orders (user_id, total_amount, payment_method, discount_code, discount_amount) VALUES (?, ?, ?, ?, ?)",
      [req.user.id, finalAmount, paymentMethod, appliedDiscountCode, discountAmount]
    );

    const orderId = orderResult.insertId;

    // บันทึกว่าใช้โค้ดส่วนลดนี้ไปแล้ว (โค้ดแอดมิน: นับจำนวนครั้ง / โค้ดที่แลกด้วยเหรียญ: ใช้ได้ครั้งเดียว)
    if (discountRow) {
      if (discountRow.source === "coin_redeem" || discountRow.source === "collected") {
        await connection.query(
          "UPDATE discount_codes SET used_count = used_count + 1, used_at = NOW() WHERE id = ?",
          [discountRow.id]
        );
      } else {
        await connection.query(
          "UPDATE discount_codes SET used_count = used_count + 1 WHERE id = ?",
          [discountRow.id]
        );
      }
    }

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

    // คำนวณเหรียญสะสมด้วย AI (อยู่นอก transaction ของออเดอร์แล้ว เพื่อไม่ถือ lock ระหว่างรอ AI ตอบ)
    // ถ้าขั้นตอนนี้พลาดไป ออเดอร์ก็ยังถือว่าสำเร็จอยู่ดี แค่ไม่ได้เหรียญรอบนี้
    let coinsEarned = 0;

    try {
      const coinResult = await calculateCoinsWithAI(finalAmount);
      coinsEarned = coinResult.coins;

      await pool.query(
        `
        INSERT INTO coin_transactions (user_id, order_id, coins, order_total, reasoning, calc_source)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          req.user.id,
          orderId,
          coinResult.coins,
          finalAmount,
          coinResult.reasoning,
          coinResult.source,
        ]
      );

      await pool.query(
        "UPDATE users SET coin_balance = coin_balance + ? WHERE id = ?",
        [coinResult.coins, req.user.id]
      );
    } catch (coinError) {
      console.error("⚠️ Award coins error (order still succeeded):", coinError);
      coinsEarned = 0;
    }

    res.status(201).json({
      success: true,
      message: "สั่งซื้อสำเร็จ",
      order: {
        id: orderId,
        total_amount: finalAmount,
        subtotal_amount: totalAmount,
        discount_code: appliedDiscountCode,
        discount_amount: discountAmount,
        item_count: cartRows.length,
        coins_earned: coinsEarned,
        payment_method: paymentMethod,
      },
    });
  } catch (error) {
    await connection.rollback();
    connection.release();

    console.error("❌ Checkout error:", error);

    if (error.code === "ER_BAD_FIELD_ERROR") {
      return res.status(500).json({
        success: false,
        message:
          "ฐานข้อมูลยังไม่ครบ (payment_method หรือ discount_code) — กรุณารัน Backend/sql/orders_payment_method.sql และ Backend/sql/orders_discount.sql ก่อน",
      });
    }

    if (error.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({
        success: false,
        message:
          "ยังไม่มีตาราง discount_codes — กรุณารัน Backend/sql/discounts.sql ก่อน",
      });
    }

    res.status(500).json({
      success: false,
      message: "Checkout failed",
      error: error.message,
    });
  }
});

// =========================
// Discount Codes (ส่วนลดตามฤดูกาล/เทศกาล + โค้ดที่แลกด้วยเหรียญ)
// =========================

// POST ตรวจสอบโค้ดส่วนลดก่อนสั่งซื้อจริง (ใช้ตอนกรอกโค้ดในหน้ายืนยันคำสั่งซื้อ)
app.post("/api/discount-codes/validate", authenticateToken, async (req, res) => {
  try {
    const { code, order_amount } = req.body;

    const result = await validateDiscountCode(pool, code, order_amount || 0, req.user.id);

    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.message });
    }

    res.json({
      success: true,
      data: {
        code: result.row.code,
        label: result.row.label,
        discount_amount: result.discountAmount,
      },
    });
  } catch (error) {
    console.error("❌ Validate discount code error:", error);

    if (error.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({
        success: false,
        message: "ยังไม่มีตาราง discount_codes — กรุณารัน Backend/sql/discounts.sql ก่อน",
      });
    }

    res.status(500).json({ success: false, message: "Database error", error: error.message });
  }
});

// GET โค้ดส่วนลดส่วนตัวของผู้ใช้ (ที่แลกด้วยเหรียญ หรือเก็บมาจากโค้ดสาธารณะ)
app.get("/api/discount-codes/my", authenticateToken, async (req, res) => {
  try {
    const [codes] = await pool.query(
      `SELECT id, code, label, discount_type, discount_value, max_discount_amount,
              min_order_amount, end_date, used_at, source, source_code_id, created_at
       FROM discount_codes
       WHERE owner_user_id = ?
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({ success: true, data: codes });
  } catch (error) {
    console.error("❌ Get my discount codes error:", error);
    res.status(500).json({ success: false, message: "Database error", error: error.message });
  }
});

// GET โค้ดส่วนลดสาธารณะที่แอดมินสร้างและยังใช้งานได้อยู่ตอนนี้ (ให้ผู้ใช้ทุกคนเรียกดู/กด "เก็บโค้ด" ได้)
app.get("/api/discount-codes/public", authenticateToken, async (req, res) => {
  try {
    const [codes] = await pool.query(
      `SELECT id, code, label, season, discount_type, discount_value, max_discount_amount,
              min_order_amount, start_date, end_date, usage_limit, used_count, created_at
       FROM discount_codes
       WHERE source = 'admin'
         AND is_active = 1
         AND (start_date IS NULL OR start_date <= CURDATE())
         AND (end_date IS NULL OR end_date >= CURDATE())
         AND (usage_limit IS NULL OR used_count < usage_limit)
       ORDER BY created_at DESC`
    );

    res.json({ success: true, data: codes });
  } catch (error) {
    console.error("❌ Get public discount codes error:", error);

    if (error.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({
        success: false,
        message: "ยังไม่มีตาราง discount_codes — กรุณารัน Backend/sql/discounts.sql ก่อน",
      });
    }

    res.status(500).json({ success: false, message: "Database error", error: error.message });
  }
});

// POST เก็บโค้ดส่วนลดสาธารณะ (ของแอดมิน) มาเป็นสำเนาส่วนตัว ใช้ได้ครั้งเดียว ไม่ถูกคนอื่นแย่งใช้จนหมดสิทธิ์
app.post("/api/discount-codes/:id/collect", authenticateToken, async (req, res) => {
  try {
    const [[source]] = await pool.query(
      "SELECT * FROM discount_codes WHERE id = ? AND source = 'admin'",
      [req.params.id]
    );

    if (!source) {
      return res.status(404).json({ success: false, message: "ไม่พบโค้ดนี้" });
    }

    if (!source.is_active) {
      return res.status(400).json({ success: false, message: "โค้ดนี้ถูกปิดใช้งานแล้ว" });
    }

    const today = new Date();
    if (source.end_date && new Date(source.end_date) < today) {
      return res.status(400).json({ success: false, message: "โค้ดนี้หมดอายุแล้ว" });
    }

    if (source.usage_limit !== null && source.used_count >= source.usage_limit) {
      return res.status(409).json({ success: false, message: "โค้ดนี้ถูกใช้ครบจำนวนสิทธิ์แล้ว" });
    }

    const [[already]] = await pool.query(
      "SELECT id FROM discount_codes WHERE owner_user_id = ? AND source_code_id = ?",
      [req.user.id, source.id]
    );

    if (already) {
      return res.status(409).json({ success: false, message: "คุณเก็บโค้ดนี้ไปแล้ว" });
    }

    const personalCode = `${source.code}-${req.user.id}`;

    await pool.query(
      `
      INSERT INTO discount_codes
        (code, label, season, discount_type, discount_value, max_discount_amount,
         min_order_amount, end_date, usage_limit, is_active, owner_user_id, source, source_code_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, 'collected', ?)
      `,
      [
        personalCode,
        source.label,
        source.season,
        source.discount_type,
        source.discount_value,
        source.max_discount_amount,
        source.min_order_amount,
        source.end_date,
        req.user.id,
        source.id,
      ]
    );

    res.status(201).json({
      success: true,
      message: "เก็บโค้ดสำเร็จ",
      data: { code: personalCode, label: source.label },
    });
  } catch (error) {
    console.error("❌ Collect discount code error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "คุณเก็บโค้ดนี้ไปแล้ว" });
    }

    res.status(500).json({ success: false, message: "Database error", error: error.message });
  }
});

// GET รายการโค้ดส่วนลดทั้งหมดที่แอดมินสร้าง (เฉพาะ admin)
app.get(
  "/api/admin/discount-codes",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const [codes] = await pool.query(
        "SELECT * FROM discount_codes WHERE source = 'admin' ORDER BY created_at DESC"
      );

      res.json({ success: true, data: codes });
    } catch (error) {
      console.error("❌ Get admin discount codes error:", error);

      if (error.code === "ER_NO_SUCH_TABLE") {
        return res.status(500).json({
          success: false,
          message: "ยังไม่มีตาราง discount_codes — กรุณารัน Backend/sql/discounts.sql ก่อน",
        });
      }

      res.status(500).json({ success: false, message: "Database error", error: error.message });
    }
  }
);

// POST สร้างโค้ดส่วนลดใหม่ (เฉพาะ admin) — เลือกจากพรีเซ็ตฤดูกาล/เทศกาล หรือกำหนดเองก็ได้
app.post(
  "/api/admin/discount-codes",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const {
        code,
        label,
        season,
        discount_type,
        discount_value,
        max_discount_amount,
        min_order_amount,
        start_date,
        end_date,
        usage_limit,
      } = req.body;

      if (!code || !label) {
        return res.status(400).json({ success: false, message: "กรุณาระบุโค้ดและชื่อโปรโมชัน" });
      }

      if (!["percent", "fixed"].includes(discount_type)) {
        return res.status(400).json({ success: false, message: "discount_type ต้องเป็น percent หรือ fixed" });
      }

      if (!discount_value || Number(discount_value) <= 0) {
        return res.status(400).json({ success: false, message: "กรุณาระบุมูลค่าส่วนลด" });
      }

      const [result] = await pool.query(
        `
        INSERT INTO discount_codes
          (code, label, season, discount_type, discount_value, max_discount_amount,
           min_order_amount, start_date, end_date, usage_limit, is_active, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'admin')
        `,
        [
          String(code).trim().toUpperCase(),
          label,
          season || null,
          discount_type,
          discount_value,
          max_discount_amount || null,
          min_order_amount || 0,
          start_date || null,
          end_date || null,
          usage_limit || null,
        ]
      );

      res.status(201).json({
        success: true,
        message: "สร้างโค้ดส่วนลดสำเร็จ",
        data: { id: result.insertId },
      });
    } catch (error) {
      console.error("❌ Create discount code error:", error);

      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ success: false, message: "มีโค้ดนี้อยู่แล้ว กรุณาใช้โค้ดอื่น" });
      }

      res.status(500).json({ success: false, message: "Database error", error: error.message });
    }
  }
);

// PUT เปิด/ปิดใช้งานโค้ดส่วนลด (เฉพาะ admin)
app.put(
  "/api/admin/discount-codes/:id/toggle",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { is_active } = req.body;

      const [result] = await pool.query(
        "UPDATE discount_codes SET is_active = ? WHERE id = ? AND source = 'admin'",
        [is_active ? 1 : 0, req.params.id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "ไม่พบโค้ดนี้" });
      }

      res.json({ success: true, message: "อัปเดตสถานะโค้ดสำเร็จ" });
    } catch (error) {
      console.error("❌ Toggle discount code error:", error);
      res.status(500).json({ success: false, message: "Database error", error: error.message });
    }
  }
);

// DELETE ลบโค้ดส่วนลด (เฉพาะ admin)
app.delete(
  "/api/admin/discount-codes/:id",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const [result] = await pool.query(
        "DELETE FROM discount_codes WHERE id = ? AND source = 'admin'",
        [req.params.id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "ไม่พบโค้ดนี้" });
      }

      res.json({ success: true, message: "ลบโค้ดส่วนลดสำเร็จ" });
    } catch (error) {
      console.error("❌ Delete discount code error:", error);
      res.status(500).json({ success: false, message: "Database error", error: error.message });
    }
  }
);

// =========================
// Coin Rewards (ร้านค้าเหรียญ: แลกเหรียญสะสมเป็นโค้ดส่วนลดส่วนตัว)
// =========================

// GET รายการรางวัลที่แลกได้ตอนนี้ (ทุกคนที่ login แล้วดูได้)
app.get("/api/coin-rewards", authenticateToken, async (req, res) => {
  try {
    const [rewards] = await pool.query(
      "SELECT * FROM coin_rewards WHERE is_active = 1 ORDER BY coin_cost ASC"
    );

    res.json({ success: true, data: rewards });
  } catch (error) {
    console.error("❌ Get coin rewards error:", error);

    if (error.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({
        success: false,
        message: "ยังไม่มีตาราง coin_rewards — กรุณารัน Backend/sql/discounts.sql ก่อน",
      });
    }

    res.status(500).json({ success: false, message: "Database error", error: error.message });
  }
});

// POST แลกเหรียญเป็นโค้ดส่วนลดส่วนตัว
app.post("/api/coin-rewards/:id/redeem", authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[reward]] = await connection.query(
      "SELECT * FROM coin_rewards WHERE id = ? FOR UPDATE",
      [req.params.id]
    );

    if (!reward || !reward.is_active) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, message: "ไม่พบรางวัลนี้" });
    }

    if (reward.stock !== null && reward.redeemed_count >= reward.stock) {
      await connection.rollback();
      connection.release();
      return res.status(409).json({ success: false, message: "รางวัลนี้ถูกแลกหมดแล้ว" });
    }

    const [[user]] = await connection.query(
      "SELECT coin_balance FROM users WHERE id = ? FOR UPDATE",
      [req.user.id]
    );

    if (!user || user.coin_balance < reward.coin_cost) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ success: false, message: "เหรียญสะสมไม่พอสำหรับแลกรางวัลนี้" });
    }

    const code = generateVoucherCode();
    const endDate = new Date(Date.now() + reward.valid_days * 24 * 60 * 60 * 1000);
    const endDateStr = endDate.toISOString().slice(0, 10);

    const [codeResult] = await connection.query(
      `
      INSERT INTO discount_codes
        (code, label, season, discount_type, discount_value, max_discount_amount,
         min_order_amount, end_date, usage_limit, is_active, owner_user_id, source)
      VALUES (?, ?, 'coin_redeem', ?, ?, ?, ?, ?, 1, 1, ?, 'coin_redeem')
      `,
      [
        code,
        reward.name,
        reward.discount_type,
        reward.discount_value,
        reward.max_discount_amount,
        reward.min_order_amount,
        endDateStr,
        req.user.id,
      ]
    );

    await connection.query(
      "UPDATE users SET coin_balance = coin_balance - ? WHERE id = ?",
      [reward.coin_cost, req.user.id]
    );

    await connection.query(
      "UPDATE coin_rewards SET redeemed_count = redeemed_count + 1 WHERE id = ?",
      [reward.id]
    );

    await connection.query(
      "INSERT INTO coin_redemptions (user_id, reward_id, coins_spent, discount_code_id) VALUES (?, ?, ?, ?)",
      [req.user.id, reward.id, reward.coin_cost, codeResult.insertId]
    );

    await connection.commit();
    connection.release();

    res.status(201).json({
      success: true,
      message: "แลกรางวัลสำเร็จ",
      data: { code, label: reward.name, end_date: endDateStr },
    });
  } catch (error) {
    await connection.rollback();
    connection.release();

    console.error("❌ Redeem coin reward error:", error);
    res.status(500).json({ success: false, message: "Database error", error: error.message });
  }
});

// GET รายการรางวัลทั้งหมด รวมที่ปิดใช้งานแล้ว (เฉพาะ admin)
app.get(
  "/api/admin/coin-rewards",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const [rewards] = await pool.query("SELECT * FROM coin_rewards ORDER BY created_at DESC");
      res.json({ success: true, data: rewards });
    } catch (error) {
      console.error("❌ Get admin coin rewards error:", error);
      res.status(500).json({ success: false, message: "Database error", error: error.message });
    }
  }
);

// POST สร้างรางวัลใหม่ในร้านค้าเหรียญ (เฉพาะ admin)
app.post(
  "/api/admin/coin-rewards",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const {
        name,
        description,
        coin_cost,
        discount_type,
        discount_value,
        max_discount_amount,
        min_order_amount,
        valid_days,
        stock,
      } = req.body;

      if (!name || !coin_cost || !discount_value) {
        return res.status(400).json({
          success: false,
          message: "กรุณาระบุชื่อรางวัล จำนวนเหรียญ และมูลค่าส่วนลด",
        });
      }

      if (!["percent", "fixed"].includes(discount_type)) {
        return res.status(400).json({ success: false, message: "discount_type ต้องเป็น percent หรือ fixed" });
      }

      const [result] = await pool.query(
        `
        INSERT INTO coin_rewards
          (name, description, coin_cost, discount_type, discount_value, max_discount_amount,
           min_order_amount, valid_days, stock, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `,
        [
          name,
          description || null,
          coin_cost,
          discount_type,
          discount_value,
          max_discount_amount || null,
          min_order_amount || 0,
          valid_days || 30,
          stock || null,
        ]
      );

      res.status(201).json({
        success: true,
        message: "สร้างรางวัลสำเร็จ",
        data: { id: result.insertId },
      });
    } catch (error) {
      console.error("❌ Create coin reward error:", error);
      res.status(500).json({ success: false, message: "Database error", error: error.message });
    }
  }
);

// PUT เปิด/ปิดใช้งานรางวัล (เฉพาะ admin)
app.put(
  "/api/admin/coin-rewards/:id/toggle",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { is_active } = req.body;

      const [result] = await pool.query(
        "UPDATE coin_rewards SET is_active = ? WHERE id = ?",
        [is_active ? 1 : 0, req.params.id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "ไม่พบรางวัลนี้" });
      }

      res.json({ success: true, message: "อัปเดตสถานะรางวัลสำเร็จ" });
    } catch (error) {
      console.error("❌ Toggle coin reward error:", error);
      res.status(500).json({ success: false, message: "Database error", error: error.message });
    }
  }
);

// DELETE ลบรางวัล (เฉพาะ admin)
app.delete(
  "/api/admin/coin-rewards/:id",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const [result] = await pool.query("DELETE FROM coin_rewards WHERE id = ?", [
        req.params.id,
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "ไม่พบรางวัลนี้" });
      }

      res.json({ success: true, message: "ลบรางวัลสำเร็จ" });
    } catch (error) {
      console.error("❌ Delete coin reward error:", error);
      res.status(500).json({ success: false, message: "Database error", error: error.message });
    }
  }
);

// =========================
// GET My Orders (ประวัติการสั่งซื้อของผู้ใช้ที่ login อยู่)
// =========================
app.get("/api/orders/my", authenticateToken, async (req, res) => {
  try {
    const [orders] = await pool.query(
      "SELECT id, total_amount, status, payment_method, discount_code, discount_amount, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC",
      [req.user.id]
    );

    for (const order of orders) {
      const [items] = await pool.query(
        "SELECT oi.product_id, oi.product_name, oi.price, oi.quantity, i.image_url FROM order_items oi LEFT JOIN Inventory i ON i.id = oi.product_id WHERE oi.order_id = ?",
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
        SELECT o.id, o.user_id, o.total_amount, o.status, o.payment_method,
               o.discount_code, o.discount_amount, o.created_at,
               u.username
        FROM orders o
        LEFT JOIN users u ON u.id = o.user_id
        ORDER BY o.created_at DESC
      `);

      for (const order of orders) {
        const [items] = await pool.query(
          "SELECT oi.product_id, oi.product_name, oi.price, oi.quantity, i.image_url FROM order_items oi LEFT JOIN Inventory i ON i.id = oi.product_id WHERE oi.order_id = ?",
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
// Claims (เคลมสินค้า)
// =========================
const CLAIM_REASONS = [
  "damaged",
  "wrong_item",
  "missing_item",
  "not_as_described",
  "fake",
  "other",
];

const CLAIM_STATUSES = ["pending", "approved", "rejected", "completed"];

// POST สร้างคำขอเคลมใหม่ (ต้อง login)
app.post("/api/claims", authenticateToken, async (req, res) => {
  try {
    const {
      order_id,
      product_id,
      product_name,
      quantity,
      reason,
      description,
      image_url,
      contact_phone,
    } = req.body;

    if (!order_id || !product_id || !product_name) {
      return res.status(400).json({
        success: false,
        message: "ข้อมูลสินค้า/คำสั่งซื้อไม่ครบถ้วน",
      });
    }

    if (!CLAIM_REASONS.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: `reason ต้องเป็นหนึ่งใน: ${CLAIM_REASONS.join(", ")}`,
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: "กรุณาระบุรายละเอียดปัญหาที่พบ",
      });
    }

    // ต้องเป็นออเดอร์ของผู้ใช้ที่ login อยู่จริงเท่านั้น
    const [orderRows] = await pool.query(
      "SELECT id FROM orders WHERE id = ? AND user_id = ?",
      [order_id, req.user.id]
    );

    if (orderRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบคำสั่งซื้อนี้ในบัญชีของคุณ",
      });
    }

    const [result] = await pool.query(
      `
      INSERT INTO claims
        (user_id, order_id, product_id, product_name, quantity, reason, description, image_url, contact_phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        req.user.id,
        order_id,
        product_id,
        product_name,
        quantity || 1,
        reason,
        description.trim(),
        image_url || null,
        contact_phone || null,
      ]
    );

    res.status(201).json({
      success: true,
      message: "ส่งคำขอเคลมสำเร็จ",
      data: { id: result.insertId, status: "pending" },
    });
  } catch (error) {
    console.error("❌ Create claim error:", error);

    if (error.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({
        success: false,
        message:
          "ยังไม่มีตาราง claims — กรุณารัน Backend/sql/claims.sql ก่อน",
      });
    }

    res.status(500).json({
      success: false,
      message: "Database error",
      error: error.message,
    });
  }
});

// GET ประวัติการเคลมของผู้ใช้ที่ login อยู่
app.get("/api/claims/my", authenticateToken, async (req, res) => {
  try {
    const [claims] = await pool.query(
      `SELECT id, order_id, product_id, product_name, quantity, reason,
              description, image_url, contact_phone, status, admin_note, created_at
       FROM claims
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: claims,
    });
  } catch (error) {
    console.error("❌ Get my claims error:", error);

    res.status(500).json({
      success: false,
      message: "Database error",
      error: error.message,
    });
  }
});

// GET รายการเคลมทั้งหมด (เฉพาะ admin)
app.get(
  "/api/admin/claims",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const [claims] = await pool.query(
        `SELECT c.id, c.order_id, c.product_id, c.product_name, c.quantity, c.reason,
                c.description, c.image_url, c.contact_phone, c.status, c.admin_note,
                c.created_at, c.updated_at, u.username
         FROM claims c
         LEFT JOIN users u ON u.id = c.user_id
         ORDER BY c.created_at DESC`
      );

      res.json({
        success: true,
        data: claims,
      });
    } catch (error) {
      console.error("❌ Get all claims error:", error);

      res.status(500).json({
        success: false,
        message: "Database error",
        error: error.message,
      });
    }
  }
);

// PUT อัปเดตสถานะคำขอเคลม (เฉพาะ admin)
app.put(
  "/api/admin/claims/:id/status",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, admin_note } = req.body;

      if (!CLAIM_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `status ต้องเป็นหนึ่งใน: ${CLAIM_STATUSES.join(", ")}`,
        });
      }

      const [result] = await pool.query(
        "UPDATE claims SET status = ?, admin_note = ? WHERE id = ?",
        [status, admin_note || null, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "ไม่พบคำขอเคลมนี้",
        });
      }

      res.json({
        success: true,
        message: "อัปเดตสถานะการเคลมสำเร็จ",
        data: { id: Number(id), status },
      });
    } catch (error) {
      console.error("❌ Update claim status error:", error);

      res.status(500).json({
        success: false,
        message: "Database error",
        error: error.message,
      });
    }
  }
);

// =========================
// GET เหรียญสะสมของผู้ใช้ที่ login อยู่ (ยอดคงเหลือ + ประวัติการได้เหรียญ)
// =========================
app.get("/api/coins/my", authenticateToken, async (req, res) => {
  try {
    const [[user]] = await pool.query(
      "SELECT coin_balance FROM users WHERE id = ?",
      [req.user.id]
    );

    const [transactions] = await pool.query(
      `SELECT id, order_id, coins, order_total, reasoning, calc_source AS source, created_at
       FROM coin_transactions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        coin_balance: user ? user.coin_balance : 0,
        transactions,
      },
    });
  } catch (error) {
    console.error("❌ Get my coins error:", error);

    if (error.code === "ER_BAD_FIELD_ERROR" || error.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({
        success: false,
        message:
          "ยังไม่มีระบบเหรียญสะสมในฐานข้อมูล — กรุณารัน Backend/sql/coins.sql ก่อน",
      });
    }

    res.status(500).json({
      success: false,
      message: "Database error",
      error: error.message,
    });
  }
});

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