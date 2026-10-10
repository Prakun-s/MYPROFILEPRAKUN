// "I AUAN" — แชทบอทตอบลูกค้าอัตโนมัติแบบ "จับคำสำคัญ" (rule-based) ไม่ใช้ AI/ไม่ต้องมี API key
// แยกจากแชทกับแอดมิน (คนละตาราง bot_messages คนละหน้าจอ)
//
// วิธีทำงาน:
// 1. ดูข้อความล่าสุดของลูกค้า แล้วให้คะแนนแต่ละ "เจตนา" (intent) จากคำสำคัญที่พบ
// 2. เลือกเจตนาที่คะแนนสูงสุด แล้วดึงข้อมูลจริงของ "ลูกค้าคนนี้เท่านั้น" จากฐานข้อมูล (อ่านอย่างเดียว)
// 3. ตอบด้วยแม่แบบประโยค ถ้าไม่เข้าใจ จะบอกหัวข้อที่ช่วยได้ และแนะนำให้คุยกับแอดมิน
//
// ข้อจำกัด: ตอบได้เฉพาะหัวข้อที่เตรียมไว้ ไม่เข้าใจประโยคอิสระ และไม่รู้นโยบายร้านที่ไม่มีในระบบ
// (เช่น เวลาจัดส่ง การคืนเงิน) จะบอกตรงๆ ว่าไม่มีข้อมูลและให้ถามแอดมิน

const BOT_NAME = "I AUAN";

const ORDER_STATUS_TH = {
  pending: "รอดำเนินการ",
  shipping: "กำลังจัดส่ง",
  delivered: "ส่งสำเร็จ",
  cancelled: "ยกเลิก",
};

// ป้ายสถานะเคลมให้ตรงกับที่แสดงในแอป (ClaimScreen)
const CLAIM_STATUS_TH = {
  pending: "รอตรวจสอบ",
  approved: "อนุมัติแล้ว",
  rejected: "ถูกปฏิเสธ",
  completed: "ดำเนินการเสร็จสิ้น",
};

// เหตุผลการเคลมให้ตรงกับตัวเลือกในแอป
const CLAIM_REASON_TH = {
  damaged: "สินค้าชำรุด/เสียหาย",
  wrong_item: "ส่งผิดรายการ",
  missing_item: "สินค้าไม่ครบ",
  not_as_described: "ไม่ตรงตามที่สั่ง",
  fake: "สงสัยสินค้าปลอม",
  other: "อื่นๆ",
};

// ===== เจตนา + คำสำคัญ =====
// ลำดับในอาร์เรย์นี้ = ลำดับความสำคัญเมื่อคะแนนเท่ากัน
const INTENTS = [
  {
    name: "admin",
    keywords: ["แอดมิน", "admin", "เจ้าหน้าที่", "พนักงาน", "คุยกับคน", "ขอคุยกับ", "ติดต่อร้าน", "ติดต่อ"],
  },
  {
    name: "claim",
    keywords: [
      "เคลม", "claim", "คืนสินค้า", "คืนของ", "ส่งคืน", "แจ้งปัญหา", "ร้องเรียน",
      "ชำรุด", "เสียหาย", "ของเสีย", "สินค้าเสีย", "ของแตก", "แตก", "พัง",
      "ส่งผิด", "ของผิด", "ผิดรุ่น", "ผิดสี", "ผิดไซส์", "ผิดรายการ",
      "ไม่ครบ", "ของไม่ครบ", "สินค้าไม่ครบ", "ไม่ตรงปก", "ไม่ตรงตามที่สั่ง", "ได้ของไม่ตรง",
      "ของปลอม", "สินค้าปลอม", "สงสัยของปลอม",
      "รอตรวจสอบ", "อนุมัติ", "ปฏิเสธ", "ดำเนินการเสร็จสิ้น",
    ],
    weight: 2.5,
  },
  {
    name: "order",
    keywords: [
      "ออเดอร์", "order", "คำสั่งซื้อ", "สั่งซื้อ", "ของถึงไหน", "ถึงไหน", "พัสดุ", "จัดส่ง",
      "ส่งของ", "ติดตาม", "tracking", "ยังไม่ได้รับ", "ของยังไม่มา", "ประวัติการสั่ง",
    ],
  },
  { name: "coins", keywords: ["เหรียญ", "แต้ม", "coin", "สะสม", "คะแนน"] },
  { name: "discount", keywords: ["ส่วนลด", "โค้ด", "คูปอง", "โปรโมชัน", "โปรโมชั่น", "โปร", "discount", "coupon", "ลดราคา"] },
  { name: "receipt", keywords: ["ใบเสร็จ", "receipt", "ใบกำกับ", "pdf"] },
  {
    name: "payment",
    keywords: ["วิธีชำระ", "ชำระเงิน", "ชำระ", "จ่ายเงิน", "จ่าย", "โอนเงิน", "ปลายทาง", "cod", "พร้อมเพย์", "promptpay", "บัตรเครดิต"],
  },
  {
    // เรื่องที่ "ไม่มีข้อมูลในระบบ" — ต้องตอบตรงๆ ว่าไม่ทราบ ไม่เดา
    name: "policy",
    keywords: [
      "คืนเงิน", "refund", "นโยบาย", "รับประกัน", "ประกัน", "เปลี่ยนสินค้า", "ค่าส่ง", "ค่าจัดส่ง",
      "ส่งกี่วัน", "กี่วัน", "เมื่อไหร่จะถึง", "ส่งฟรี", "เวลาทำการ", "เปิดกี่โมง",
    ],
  },
  {
    name: "product",
    keywords: ["ราคา", "เท่าไหร่", "เท่าไร", "สต็อก", "สต๊อก", "stock", "มีของ", "มีไหม", "มีมั้ย", "เหลือ", "หมด", "สินค้า", "รุ่น"],
  },
  { name: "greeting", keywords: ["สวัสดี", "หวัดดี", "hello", "hi", "hey", "ดีครับ", "ดีค่ะ", "ดีจ้า"], weight: 0.5 },
  { name: "thanks", keywords: ["ขอบคุณ", "ขอบใจ", "thanks", "thank"], weight: 0.5 },
];

function normalize(text) {
  return String(text || "").toLowerCase().trim();
}

const isAscii = (s) => /^[\x00-\x7F]+$/.test(s);

function keywordHit(text, keyword) {
  if (isAscii(keyword)) {
    // คำภาษาอังกฤษต้องเป็นคำเต็ม (กัน "hi" ไปชนกับคำอื่น)
    return new RegExp(`(^|[^a-z0-9])${keyword}([^a-z0-9]|$)`, "i").test(text);
  }
  return text.includes(keyword);
}

// คืน { intent, score } ของเจตนาที่คะแนนสูงสุด (null ถ้าไม่เจอคำสำคัญเลย)
function detectIntent(rawText) {
  const text = normalize(rawText);
  let best = null;

  for (const intent of INTENTS) {
    let score = 0;
    for (const kw of intent.keywords) {
      if (keywordHit(text, kw)) score += kw.length;
    }
    score *= intent.weight || 1;

    // ใช้ > (ไม่ใช่ >=) เพื่อให้เจตนาที่อยู่ก่อนในลิสต์ชนะเมื่อคะแนนเท่ากัน
    if (score > 0 && (!best || score > best.score)) {
      best = { intent: intent.name, score };
    }
  }

  // ลูกค้าพิมพ์คำว่า "เคลม" ตรงๆ = ตั้งใจถามเรื่องเคลม (กันไปชนกับ "ถึงไหน"/"ออเดอร์"/"เงื่อนไข" ของเจตนาอื่น)
  if (best && best.intent !== "claim" && /เคลม|claim/.test(text)) {
    best = { intent: "claim", score: best.score };
  }

  return best;
}

// เลขออเดอร์ที่ลูกค้าระบุ เช่น "ออเดอร์ 7", "order #12", "#5"
function extractOrderId(rawText) {
  const m = normalize(rawText).match(/(?:ออเดอร์|คำสั่งซื้อ|order|เลขที่|#)\s*#?\s*(\d{1,10})/);
  return m ? Number(m[1]) : null;
}

function formatDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

const baht = (n) => `฿${Number(n).toLocaleString("th-TH")}`;

const TOPICS_TEXT =
  'ฉันช่วยได้เรื่อง: สถานะออเดอร์ · เคลมสินค้า · เหรียญสะสม · โค้ดส่วนลด · ราคา/สต็อกสินค้า · ใบเสร็จ · วิธีชำระเงิน\nลองพิมพ์ เช่น "ออเดอร์ล่าสุดของฉัน", "ฉันมีกี่เหรียญ", "มีโค้ดส่วนลดอะไรบ้าง" หรือพิมพ์ชื่อสินค้า';

const ADMIN_HINT = 'ถ้าต้องการคุยกับแอดมิน ไปที่เมนู "แชทกับแอดมิน" ได้เลย';

// ===== ตัวตอบของแต่ละเจตนา (อ่านข้อมูลจริงอย่างเดียว) =====

async function replyOrder(db, userId, text) {
  const orderId = extractOrderId(text);

  const loadItems = async (ids) => {
    if (ids.length === 0) return {};
    const [items] = await db.query(
      "SELECT order_id, product_name, quantity FROM order_items WHERE order_id IN (?)",
      [ids]
    );
    const map = {};
    for (const it of items) {
      (map[it.order_id] = map[it.order_id] || []).push(`${it.product_name} x${it.quantity}`);
    }
    return map;
  };

  const describe = (o, items) => {
    const status = ORDER_STATUS_TH[o.status] || o.status;
    let line = `ออเดอร์ #${o.id} (${formatDate(o.created_at)}) ยอด ${baht(o.total_amount)} สถานะ: ${status}`;
    if (items && items.length) line += `\nสินค้า: ${items.join(", ")}`;
    return line;
  };

  if (orderId !== null) {
    const [rows] = await db.query(
      "SELECT id, total_amount, status, created_at FROM orders WHERE id = ? AND user_id = ?",
      [orderId, userId]
    );

    if (rows.length === 0) {
      return `ไม่พบออเดอร์ #${orderId} ในบัญชีของคุณ ลองตรวจเลขออเดอร์อีกครั้ง หรือพิมพ์ "ออเดอร์ล่าสุด" เพื่อดูรายการล่าสุด`;
    }

    const items = await loadItems([rows[0].id]);
    return describeWithNote(describe(rows[0], items[rows[0].id]), rows[0].status);
  }

  const [orders] = await db.query(
    "SELECT id, total_amount, status, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 5",
    [userId]
  );

  if (orders.length === 0) {
    return "ยังไม่พบคำสั่งซื้อในบัญชีของคุณ";
  }

  const wantsList = /ทั้งหมด|ประวัติ|หลายรายการ|ทุกออเดอร์/.test(normalize(text));
  const items = await loadItems(orders.map((o) => o.id));

  if (wantsList && orders.length > 1) {
    const lines = orders.map(
      (o) => `- #${o.id} (${formatDate(o.created_at)}) ${baht(o.total_amount)} · ${ORDER_STATUS_TH[o.status] || o.status}`
    );
    return `คำสั่งซื้อล่าสุดของคุณ ${orders.length} รายการ:\n${lines.join("\n")}\nพิมพ์ เช่น "ออเดอร์ ${orders[0].id}" เพื่อดูรายละเอียด`;
  }

  const latest = orders[0];
  let reply = `คำสั่งซื้อล่าสุดของคุณ\n${describeWithNote(describe(latest, items[latest.id]), latest.status)}`;
  if (orders.length > 1) {
    reply += `\n\nถ้าอยากดูออเดอร์อื่น พิมพ์ เช่น "ออเดอร์ ${orders[1].id}" หรือ "ออเดอร์ทั้งหมด"`;
  }
  return reply;
}

// ข้อความเสริมตามสถานะ — ไม่ระบุวันที่จะถึง เพราะระบบไม่มีข้อมูลนั้น
function describeWithNote(base, status) {
  if (status === "pending" || status === "shipping") {
    return `${base}\n(ระบบยังไม่มีข้อมูลวันที่จะถึง ถ้าต้องการทราบ ถามแอดมินได้ที่เมนู "แชทกับแอดมิน")`;
  }
  return base;
}

// ===== ระบบเคลม =====
// ข้อเท็จจริงจากแอปจริง: เคลมผ่านเมนู "เคลมสินค้า" หรือปุ่ม "เคลมสินค้านี้" ในประวัติการสั่งซื้อ
// เคลมได้เฉพาะออเดอร์ที่ "จัดส่งสำเร็จ" ฟอร์มมี เหตุผล (บังคับ) รายละเอียด (บังคับ) ลิงก์รูป/เบอร์ติดต่อ (ไม่บังคับ)

const CLAIM_POLICY_RE = /กี่วัน|ภายใน|ระยะเวลา|เงื่อนไข|นานไหม|นานแค่ไหน|นานเท่าไหร่|คืนเงิน|ได้เงิน|เปลี่ยนสินค้า|เปลี่ยนของ|ซ่อม|ค่าใช้จ่าย|ค่าส่งคืน|ส่งคืน|หมดอายุ|ได้อะไร/;
const CLAIM_REASONS_RE = /เพราะอะไร|เหตุผล|กรณีไหน|กรณีใด|ประเภท|เคลมได้ไหม|เคลมได้เมื่อ|เคลมได้ถ้า|เคลมได้อะไร|เคลมอะไรได้|เคลมได้แบบไหน/;
const CLAIM_MEANING_RE = /หมายความ|หมายถึง|แปลว่า|คืออะไร|ต่างกัน/;
const CLAIM_HOWTO_RE = /ยังไง|อย่างไร|วิธี|ขั้นตอน|ต้องทำ|ต้องใช้|ต้องกรอก|แจ้งเคลม|ขอเคลม|ยื่นเคลม|จะเคลม|อยากเคลม|ที่ไหน|ปุ่ม|ส่งเคลม|เริ่มเคลม|ชำรุด|เสียหาย|ของเสีย|สินค้าเสีย|แตก|พัง|ไม่ครบ|ผิดรุ่น|ผิดสี|ผิดไซส์|ส่งผิด|ผิดรายการ|ของผิด|ปลอม|ไม่ตรง/;
const CLAIM_STATUS_RE = /ถึงไหน|สถานะ|ความคืบหน้า|ของฉัน|ของผม|ของหนู|ล่าสุด|ทั้งหมด|ประวัติ|แล้วหรือยัง|อนุมัติหรือยัง|ผ่านไหม/;

function extractClaimId(text) {
  const m = normalize(text).match(/เคลม\s*(?:หมายเลข|เลขที่)?\s*#?\s*(\d{1,10})/);
  return m ? Number(m[1]) : null;
}

// เลขออเดอร์ในประโยคเคลม (ต้องมีคำว่า ออเดอร์/คำสั่งซื้อ/order นำหน้า — ไม่ใช้ # เดี่ยวๆ เพราะ "เคลม #3" คือเลขเคลม)
function extractOrderIdForClaim(text) {
  const m = normalize(text).match(/(?:ออเดอร์|คำสั่งซื้อ|order)\s*#?\s*(\d{1,10})/);
  return m ? Number(m[1]) : null;
}

const CLAIM_HOWTO_TEXT =
  'วิธีแจ้งเคลมในแอป\n' +
  '1) เปิดเมนู "เคลมสินค้า" แล้วเลือกออเดอร์และสินค้าที่มีปัญหา (หรือกดปุ่ม "เคลมสินค้านี้" ที่ออเดอร์ในหน้า "ประวัติการสั่งซื้อ")\n' +
  `2) เลือกเหตุผล: ${Object.values(CLAIM_REASON_TH).join(" · ")}\n` +
  "3) เขียนรายละเอียดปัญหา (จำเป็น) และใส่ลิงก์รูปภาพ/เบอร์ติดต่อกลับได้ (ไม่บังคับ)\n" +
  "4) กดส่ง แล้วติดตามสถานะได้ในหน้าเคลม หรือพิมพ์ถามฉันว่า \"สถานะเคลม\"\n" +
  'ในแอป เคลมได้เฉพาะออเดอร์ของบัญชีคุณที่สถานะ "จัดส่งสำเร็จ"';

const CLAIM_REASONS_TEXT = `เหตุผลที่เลือกได้ตอนแจ้งเคลม:\n${Object.values(CLAIM_REASON_TH)
  .map((r) => `- ${r}`)
  .join("\n")}\nเคลมได้เฉพาะออเดอร์ที่สถานะ "จัดส่งสำเร็จ"`;

const CLAIM_MEANING_TEXT =
  "ความหมายของสถานะเคลม:\n" +
  "- รอตรวจสอบ: ส่งคำขอแล้ว รอแอดมินตรวจสอบ\n" +
  "- อนุมัติแล้ว: แอดมินอนุมัติคำขอแล้ว\n" +
  "- ถูกปฏิเสธ: แอดมินไม่อนุมัติ ดูเหตุผลได้ที่หมายเหตุจากแอดมิน\n" +
  "- ดำเนินการเสร็จสิ้น: แอดมินปิดเรื่องแล้ว\n" +
  `ขั้นตอนหลังอนุมัติ (เช่น ส่งสินค้าใหม่ คืนเงิน) ระบบยังไม่มีข้อมูล ให้ดูหมายเหตุจากแอดมินหรือถามแอดมิน\n${ADMIN_HINT}`;

const CLAIM_POLICY_TEXT =
  "เรื่องระยะเวลา เงื่อนไข และผลของการเคลม (เช่น คืนเงิน เปลี่ยนสินค้า ค่าส่งคืน) ระบบยังไม่มีข้อมูล ฉันไม่อยากตอบผิด\n" +
  'สิ่งที่ฉันดูให้ได้คือสถานะคำขอและหมายเหตุจากแอดมิน พิมพ์ "สถานะเคลม" ได้เลย\n' +
  ADMIN_HINT;

function describeClaimLine(c) {
  const reason = CLAIM_REASON_TH[c.reason] || c.reason;
  const status = CLAIM_STATUS_TH[c.status] || c.status;
  return (
    `- เคลม #${c.id} (ออเดอร์ #${c.order_id}) ${c.product_name}${c.quantity ? ` x${c.quantity}` : ""}` +
    `\n  เหตุผล: ${reason} · สถานะ: ${status}` +
    (c.admin_note ? `\n  หมายเหตุจากแอดมิน: ${c.admin_note}` : "")
  );
}

async function replyClaimHowTo(db, userId, text) {
  const orderId = extractOrderIdForClaim(text);
  if (orderId === null) return CLAIM_HOWTO_TEXT;

  // ถามเจาะจงออเดอร์: ตรวจเฉพาะออเดอร์ของลูกค้าคนนี้
  const [orders] = await db.query(
    "SELECT id, status FROM orders WHERE id = ? AND user_id = ?",
    [orderId, userId]
  );

  if (orders.length === 0) {
    return `ไม่พบออเดอร์ #${orderId} ในบัญชีของคุณ ลองตรวจเลขออเดอร์อีกครั้ง`;
  }

  const order = orders[0];

  if (order.status !== "delivered") {
    return `ออเดอร์ #${orderId} สถานะ "${ORDER_STATUS_TH[order.status] || order.status}" ตอนนี้ยังแจ้งเคลมในแอปไม่ได้ (เคลมได้เมื่อสถานะเป็น "ส่งสำเร็จ")`;
  }

  const [items] = await db.query(
    "SELECT product_name, quantity FROM order_items WHERE order_id = ?",
    [orderId]
  );
  const [existing] = await db.query(
    "SELECT id, status FROM claims WHERE user_id = ? AND order_id = ? ORDER BY id DESC",
    [userId, orderId]
  );

  let reply = `ออเดอร์ #${orderId} เคลมได้ สินค้าในออเดอร์: ${items.map((i) => `${i.product_name} x${i.quantity}`).join(", ")}`;
  if (existing.length > 0) {
    reply += `\nออเดอร์นี้มีคำขอเคลมแล้ว: ${existing
      .map((c) => `#${c.id} (${CLAIM_STATUS_TH[c.status] || c.status})`)
      .join(", ")}`;
  }
  return `${reply}\n\n${CLAIM_HOWTO_TEXT}`;
}

async function replyClaimDetail(db, userId, claimId) {
  const [rows] = await db.query(
    `SELECT id, order_id, product_name, quantity, reason, description, contact_phone, status, admin_note, created_at
     FROM claims WHERE id = ? AND user_id = ?`,
    [claimId, userId]
  );

  if (rows.length === 0) {
    return `ไม่พบเคลม #${claimId} ในบัญชีของคุณ พิมพ์ "สถานะเคลม" เพื่อดูรายการเคลมทั้งหมดของคุณ`;
  }

  const c = rows[0];
  const lines = [
    `เคลม #${c.id} (ออเดอร์ #${c.order_id})`,
    `สินค้า: ${c.product_name}${c.quantity ? ` x${c.quantity}` : ""}`,
    `เหตุผล: ${CLAIM_REASON_TH[c.reason] || c.reason}`,
    `สถานะ: ${CLAIM_STATUS_TH[c.status] || c.status}`,
  ];
  if (c.created_at) lines.push(`แจ้งเมื่อ: ${formatDate(c.created_at)}`);
  if (c.description) {
    const d = String(c.description);
    lines.push(`รายละเอียดที่คุณแจ้ง: ${d.length > 120 ? `${d.slice(0, 120)}…` : d}`);
  }
  lines.push(c.admin_note ? `หมายเหตุจากแอดมิน: ${c.admin_note}` : "หมายเหตุจากแอดมิน: ยังไม่มี");
  return lines.join("\n");
}

async function replyClaim(db, userId, text) {
  const t = normalize(text);

  const claimId = extractClaimId(t);
  if (claimId !== null) return replyClaimDetail(db, userId, claimId);

  let reply;

  if (CLAIM_POLICY_RE.test(t)) {
    reply = CLAIM_POLICY_TEXT;
  } else if (CLAIM_REASONS_RE.test(t)) {
    reply = CLAIM_REASONS_TEXT;
  } else if (CLAIM_MEANING_RE.test(t)) {
    reply = CLAIM_MEANING_TEXT;
  } else if ((CLAIM_HOWTO_RE.test(t) || extractOrderIdForClaim(t) !== null) && !CLAIM_STATUS_RE.test(t)) {
    reply = await replyClaimHowTo(db, userId, t);
  } else {
    // ถามสถานะ (หรือพิมพ์คำว่า "เคลม" เฉยๆ): แสดงรายการเคลมของลูกค้า ถ้ายังไม่มีเลยก็สอนวิธีแจ้ง
    const [claims] = await db.query(
      `SELECT id, order_id, product_name, quantity, reason, status, admin_note
       FROM claims WHERE user_id = ? ORDER BY id DESC LIMIT 5`,
      [userId]
    );

    if (claims.length === 0) {
      reply = `คุณยังไม่มีคำขอเคลม\n\n${CLAIM_HOWTO_TEXT}`;
    } else {
      reply =
        `คำขอเคลมล่าสุดของคุณ:\n${claims.map(describeClaimLine).join("\n")}\n\n` +
        'พิมพ์ เช่น "เคลม #' + claims[0].id + '" เพื่อดูรายละเอียด · ถามต่อได้ เช่น "เคลมยังไง", "สถานะเคลมหมายความว่าอะไร"';
    }
  }

  // ถ้าลูกค้าเอ่ยถึงแอดมินด้วย ให้บอกทางไปแชทแอดมินท้ายคำตอบ
  if (/แอดมิน|admin|คุยกับ/.test(t) && !reply.includes(ADMIN_HINT)) {
    reply += `\n${ADMIN_HINT}`;
  }

  return reply;
}

async function replyCoins(db, userId) {
  const [[user]] = await db.query("SELECT coin_balance FROM users WHERE id = ?", [userId]);
  const balance = user ? Number(user.coin_balance) : 0;

  const [txs] = await db.query(
    "SELECT order_id, coins FROM coin_transactions WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 3",
    [userId]
  );

  let reply = `เหรียญสะสมคงเหลือของคุณ: ${balance} เหรียญ`;
  if (txs.length > 0) {
    reply += `\nล่าสุดได้รับ: ${txs.map((t) => `${t.coins} เหรียญ (ออเดอร์ #${t.order_id})`).join(", ")}`;
  }
  reply += '\nได้เหรียญหลังสั่งซื้อสำเร็จ จำนวนขึ้นกับยอดซื้อ และนำไปแลกเป็นโค้ดส่วนลดได้ที่เมนู "ร้านค้าเหรียญ"';
  return reply;
}

function describeDiscount(c) {
  const value =
    c.discount_type === "percent" ? `ลด ${Number(c.discount_value)}%` : `ลด ${baht(c.discount_value)}`;
  const parts = [value];
  if (c.max_discount_amount) parts.push(`สูงสุด ${baht(c.max_discount_amount)}`);
  if (Number(c.min_order_amount) > 0) parts.push(`ขั้นต่ำ ${baht(c.min_order_amount)}`);
  if (c.end_date) parts.push(`ถึง ${formatDate(c.end_date)}`);
  return parts.join(" · ");
}

async function replyDiscount(db, userId) {
  const [publicCodes] = await db.query(
    `SELECT code, label, discount_type, discount_value, max_discount_amount, min_order_amount, end_date
     FROM discount_codes
     WHERE source = 'admin' AND is_active = 1
       AND (start_date IS NULL OR start_date <= CURDATE())
       AND (end_date IS NULL OR end_date >= CURDATE())
       AND (usage_limit IS NULL OR used_count < usage_limit)
     ORDER BY created_at DESC LIMIT 5`
  );

  const [myCodes] = await db.query(
    `SELECT code, label, discount_type, discount_value, max_discount_amount, min_order_amount, end_date
     FROM discount_codes
     WHERE owner_user_id = ? AND is_active = 1 AND used_at IS NULL
       AND (end_date IS NULL OR end_date >= CURDATE())
     ORDER BY id DESC LIMIT 5`,
    [userId]
  );

  const sections = [];

  if (myCodes.length > 0) {
    sections.push(
      `โค้ดของคุณ (ใช้ได้ครั้งเดียว):\n${myCodes
        .map((c) => `- ${c.code} ${c.label ? `(${c.label}) ` : ""}${describeDiscount(c)}`)
        .join("\n")}`
    );
  }

  if (publicCodes.length > 0) {
    sections.push(
      `โค้ดส่วนลดที่ใช้ได้ตอนนี้:\n${publicCodes
        .map((c) => `- ${c.code} ${c.label ? `(${c.label}) ` : ""}${describeDiscount(c)}`)
        .join("\n")}`
    );
  }

  if (sections.length === 0) {
    return 'ตอนนี้ยังไม่มีโค้ดส่วนลดที่ใช้ได้ คุณนำเหรียญสะสมไปแลกเป็นโค้ดส่วนลดได้ที่เมนู "ร้านค้าเหรียญ"';
  }

  return `${sections.join("\n\n")}\n\nกรอกโค้ดได้ในหน้ายืนยันคำสั่งซื้อ`;
}

// ค้นสินค้าจากชื่อที่ปรากฏในข้อความ (ชื่อเต็ม หรือคำย่อยในชื่อที่ยาว >= 3 ตัวอักษร)
function matchProducts(products, rawText) {
  const text = normalize(rawText);
  const scored = [];

  for (const p of products) {
    const name = normalize(p.name);
    if (!name) continue;

    let score = 0;
    if (text.includes(name)) {
      score = name.length + 100;
    } else {
      for (const word of name.split(/\s+/)) {
        if (word.length >= 3 && text.includes(word)) score = Math.max(score, word.length);
      }
    }

    if (score > 0) scored.push({ p, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map((s) => s.p);
}

function describeProduct(p) {
  const stock = Number(p.stock);
  const stockText = stock > 0 ? `เหลือ ${stock}${stock < 5 ? " (ใกล้หมด)" : ""}` : "หมดชั่วคราว";
  return `- ${p.name} · ${baht(p.price)} · ${stockText}`;
}

let productCache = { at: 0, rows: [] };

async function loadProducts(db) {
  // แคช 60 วินาที ลดการยิงฐานข้อมูลซ้ำ
  if (Date.now() - productCache.at < 60000 && productCache.rows.length > 0) return productCache.rows;

  const [rows] = await db.query("SELECT name, price, stock FROM Inventory ORDER BY id DESC LIMIT 200");
  productCache = { at: Date.now(), rows };
  return rows;
}

function replyProductList(products) {
  const sample = products.slice(0, 5).map((p) => `- ${p.name}`).join("\n");
  return `บอกชื่อสินค้าที่สนใจได้เลย เดี๋ยวบอกราคาและสต็อกให้${sample ? `\nตัวอย่างสินค้าในร้าน:\n${sample}` : ""}`;
}

const REPLIES_STATIC = {
  receipt:
    'ดาวน์โหลดใบเสร็จเป็นไฟล์ PDF ได้จากหน้าสั่งซื้อสำเร็จ และจากหน้า "ประวัติการสั่งซื้อ" ของแต่ละออเดอร์',
  payment:
    "ในหน้ายืนยันคำสั่งซื้อ เลือกวิธีชำระได้ 4 แบบ: พร้อมเพย์ (QR), บัตรเครดิต, โอนผ่านแอปธนาคาร และเก็บเงินปลายทาง",
  policy: `เรื่องนี้ (เช่น เวลาจัดส่ง การคืนเงิน ค่าจัดส่ง การรับประกัน) ระบบยังไม่มีข้อมูล ฉันไม่อยากตอบผิด\n${ADMIN_HINT}`,
  admin: `${ADMIN_HINT} แอดมินจะตอบเมื่อออนไลน์`,
  greeting: `สวัสดี ฉันคือ ${BOT_NAME} บอทตอบอัตโนมัติของร้าน\n${TOPICS_TEXT}`,
  thanks: "ยินดีค่ะ/ครับ มีอะไรให้ช่วยอีกพิมพ์ถามได้เลย",
};

// ตอบข้อความหนึ่งข้อความ (ฟังก์ชันหลักที่ทดสอบได้ — ไม่ผูกกับตาราง bot_messages)
async function replyTo(db, userId, text) {
  const detected = detectIntent(text);
  let intent = detected ? detected.intent : null;

  // ถ้าไม่เจอเจตนา หรือเป็นเรื่องสินค้า ลองจับชื่อสินค้าจากข้อความ
  if (intent === null || intent === "product") {
    const products = await loadProducts(db);
    const matched = matchProducts(products, text);

    if (matched.length > 0) {
      return `ข้อมูลสินค้า:\n${matched.map(describeProduct).join("\n")}`;
    }

    if (intent === "product") return replyProductList(products);
  }

  switch (intent) {
    case "order":
      return replyOrder(db, userId, text);
    case "claim":
      return replyClaim(db, userId, text);
    case "coins":
      return replyCoins(db, userId);
    case "discount":
      return replyDiscount(db, userId);
    case "receipt":
    case "payment":
    case "policy":
    case "admin":
    case "greeting":
    case "thanks":
      return REPLIES_STATIC[intent];
    default:
      return `ขออภัย ฉันยังไม่เข้าใจคำถามนี้\n${TOPICS_TEXT}\n${ADMIN_HINT}`;
  }
}

// บอทนี้ไม่ใช้ API key — เปิดใช้เสมอ ปิดได้ด้วย CHAT_AI_ENABLED=false (ชื่อตัวแปรคงไว้เพื่อความเข้ากันได้)
function isBotConfigured() {
  return process.env.CHAT_AI_ENABLED !== "false";
}

// ตอบข้อความล่าสุดของลูกค้าใน bot_messages (ข้อความต้องถูกบันทึกก่อนเรียก) คืนข้อความคำตอบ
async function answerBot(db, userId) {
  const [rows] = await db.query(
    "SELECT message FROM bot_messages WHERE user_id = ? AND role = 'user' ORDER BY id DESC LIMIT 1",
    [userId]
  );

  if (rows.length === 0) {
    throw new Error("No user message to answer");
  }

  return replyTo(db, userId, rows[0].message);
}

module.exports = { BOT_NAME, answerBot, isBotConfigured, replyTo, detectIntent, extractOrderId, matchProducts };
