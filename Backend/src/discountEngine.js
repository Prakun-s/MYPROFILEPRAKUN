// ตรรกะกลางของ "โค้ดส่วนลด" ใช้ร่วมกันทั้งตอนเช็คโค้ดก่อนสั่งซื้อ, ตอนเช็คเอาท์จริง,
// และตอนแลกเหรียญเป็นโค้ดส่วนตัว เพื่อไม่ให้กฎการคำนวณเพี้ยนไปคนละที่คนละทาง

const VOUCHER_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // ตัด 0/O, 1/I ที่สับสนง่ายออก

function generateVoucherCode() {
  let code = "RW-";
  for (let i = 0; i < 8; i++) {
    code += VOUCHER_CODE_CHARS[Math.floor(Math.random() * VOUCHER_CODE_CHARS.length)];
  }
  return code;
}

// db คือ pool หรือ connection ที่มี .query() (เผื่อเรียกจากใน transaction)
async function validateDiscountCode(db, rawCode, orderAmount, userId) {
  const code = String(rawCode || "").trim().toUpperCase();

  if (!code) {
    return { valid: false, message: "กรุณาระบุโค้ดส่วนลด" };
  }

  const [[row]] = await db.query("SELECT * FROM discount_codes WHERE code = ?", [code]);

  if (!row) {
    return { valid: false, message: "ไม่พบโค้ดส่วนลดนี้" };
  }

  if (!row.is_active) {
    return { valid: false, message: "โค้ดนี้ถูกปิดใช้งานแล้ว" };
  }

  if (row.owner_user_id && row.owner_user_id !== userId) {
    return { valid: false, message: "โค้ดนี้ใช้ได้เฉพาะเจ้าของโค้ดเท่านั้น" };
  }

  const now = new Date();

  if (row.start_date && now < new Date(row.start_date)) {
    return { valid: false, message: "ยังไม่ถึงช่วงเวลาที่ใช้โค้ดนี้ได้" };
  }

  if (row.end_date) {
    const endOfDay = new Date(row.end_date);
    endOfDay.setHours(23, 59, 59, 999);
    if (now > endOfDay) {
      return { valid: false, message: "โค้ดนี้หมดอายุแล้ว" };
    }
  }

  if (Number(orderAmount) < Number(row.min_order_amount)) {
    return {
      valid: false,
      message: `ยอดสั่งซื้อต้องถึง ฿${Number(row.min_order_amount).toLocaleString("th-TH")} จึงใช้โค้ดนี้ได้`,
    };
  }

  if (row.source === "coin_redeem" || row.source === "collected") {
    if (row.used_at) {
      return { valid: false, message: "โค้ดนี้ถูกใช้ไปแล้ว" };
    }
  } else if (row.usage_limit !== null && row.used_count >= row.usage_limit) {
    return { valid: false, message: "โค้ดนี้ถูกใช้ครบจำนวนสิทธิ์แล้ว" };
  }

  let discountAmount =
    row.discount_type === "percent"
      ? Number(orderAmount) * (Number(row.discount_value) / 100)
      : Number(row.discount_value);

  if (row.max_discount_amount) {
    discountAmount = Math.min(discountAmount, Number(row.max_discount_amount));
  }

  // กันไม่ให้ส่วนลดเกินยอดสั่งซื้อจริง (ยอดชำระติดลบไม่ได้)
  discountAmount = Math.min(discountAmount, Number(orderAmount));
  discountAmount = Math.round(discountAmount * 100) / 100;

  return { valid: true, discountAmount, row };
}

module.exports = { validateDiscountCode, generateVoucherCode };
