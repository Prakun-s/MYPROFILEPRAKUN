const jwt = require("jsonwebtoken");

// ตรวจสอบว่า request มี JWT token ที่ถูกต้องหรือไม่
// ถ้าผ่าน จะแนบข้อมูลผู้ใช้ไว้ที่ req.user = { id, username, role }
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access token is required",
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    req.user = payload;
    next();
  });
}

// ใช้ต่อจาก authenticateToken เพื่อจำกัดสิทธิ์เฉพาะ role ที่กำหนด
// ตัวอย่าง: requireRole("admin")
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }

    next();
  };
}

module.exports = { authenticateToken, requireRole };
