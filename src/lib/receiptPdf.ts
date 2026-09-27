import { PAYMENT_METHOD_LABELS, PaymentMethod, ReceiptItem } from "../components/Receipt";

const VAT_RATE = 0.07;

export interface ReceiptPdfData {
  orderId: number;
  createdAt?: string;
  items: ReceiptItem[];
  totalAmount: number;
  coinsEarned?: number;
  paymentMethod?: string;
  discountCode?: string | null;
  discountAmount?: number;
}

// เลขทั่วไป (ยอดรวมต่อรายการ/ยอดชำระทั้งสิ้น) — รูปแบบเดียวกับ Receipt.tsx เป๊ะๆ
function formatMoney(value: number): string {
  return `฿${value.toLocaleString("th-TH")}`;
}

// เลขที่ปัดทศนิยม 2 ตำแหน่ง (ราคาก่อน VAT / ภาษี) — รูปแบบเดียวกับ Receipt.tsx เป๊ะๆ
function formatMoneyPrecise(value: number): string {
  return `฿${value.toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;
}

// ตัดข้อความยาวๆ (เช่นชื่อสินค้า) เป็นหลายบรรทัด ไม่เกิน maxLines บรรทัด ตามความกว้างที่กำหนด
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    } else {
      current = candidate;
    }
  }
  if (lines.length < maxLines && current) lines.push(current);

  return lines.slice(0, maxLines);
}

// วาดใบเสร็จทั้งใบลงบน canvas (ความกว้างคงที่ ความสูงยืดตามเนื้อหาจริง) แล้วคืนค่าเป็น
// canvas สำเร็จรูปพร้อมแปลงเป็นรูปภาพ — ใช้ฟอนต์ของระบบตามปกติ (เบราว์เซอร์จะเลือกฟอนต์ไทย
// ที่มีอยู่ในเครื่องให้เอง เหมือนที่แอปแสดงผลภาษาไทยบนหน้าจอปกติอยู่แล้ว)
function renderReceiptCanvas(data: ReceiptPdfData): HTMLCanvasElement {
  const hasDiscount = !!data.discountCode && Number(data.discountAmount) > 0;
  const subtotalBeforeDiscount = Number(data.totalAmount) + Number(data.discountAmount || 0);
  const amountExVat = Number(data.totalAmount) / (1 + VAT_RATE);
  const vatAmount = Number(data.totalAmount) - amountExVat;
  const paymentLabel =
    data.paymentMethod && data.paymentMethod in PAYMENT_METHOD_LABELS
      ? PAYMENT_METHOD_LABELS[data.paymentMethod as PaymentMethod]
      : null;

  const dateText = data.createdAt
    ? new Date(data.createdAt).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const SCALE = 2; // เรนเดอร์ที่ความละเอียดสูงกว่าเพื่อให้ภาพในไฟล์ PDF คมชัด
  const CARD_WIDTH = 380;
  const PADDING = 22;
  const CONTENT_WIDTH = CARD_WIDTH - PADDING * 2;
  const BROWN = "#3D2619";
  const GRAY = "#8A7D75";
  const TEXT = "#50453E";
  const GREEN = "#2D6A4F";
  const DIVIDER = "#D4C3BA";

  // วาดครั้งแรกบน canvas สูงเผื่อไว้มากๆ เพื่อวัดความสูงเนื้อหาจริงจากตำแหน่ง cursor สุดท้าย
  const work = document.createElement("canvas");
  work.width = CARD_WIDTH * SCALE;
  work.height = 2400 * SCALE;
  const ctx = work.getContext("2d")!;
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, CARD_WIDTH, 2400);
  ctx.textBaseline = "top";

  let y = PADDING;

  const drawDivider = () => {
    y += 12;
    ctx.strokeStyle = DIVIDER;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(PADDING, y);
    ctx.lineTo(CARD_WIDTH - PADDING, y);
    ctx.stroke();
    ctx.setLineDash([]);
    y += 12;
  };

  const drawRow = (left: string, right: string, opts?: { color?: string; bold?: boolean }) => {
    ctx.font = `${opts?.bold ? "700" : "400"} 12.5px Sarabun, "Noto Sans Thai", sans-serif`;
    ctx.fillStyle = opts?.color || TEXT;
    ctx.textAlign = "left";
    ctx.fillText(left, PADDING, y);
    ctx.textAlign = "right";
    ctx.fillText(right, CARD_WIDTH - PADDING, y);
    ctx.textAlign = "left";
    y += 18;
  };

  // ชื่อร้าน + หัวใบเสร็จ
  ctx.font = '800 18px Sarabun, "Noto Sans Thai", sans-serif';
  ctx.fillStyle = BROWN;
  ctx.textAlign = "center";
  ctx.fillText("PRAKUN SHOP", CARD_WIDTH / 2, y);
  y += 24;

  ctx.font = '400 12.5px Sarabun, "Noto Sans Thai", sans-serif';
  ctx.fillStyle = GRAY;
  ctx.fillText("ใบเสร็จรับเงิน / ใบกำกับภาษีอย่างย่อ", CARD_WIDTH / 2, y);
  ctx.textAlign = "left";
  y += 26;

  // แถวเลขคำสั่งซื้อ / วันที่
  ctx.font = '700 13px Sarabun, "Noto Sans Thai", sans-serif';
  ctx.fillStyle = BROWN;
  ctx.textAlign = "left";
  ctx.fillText(`คำสั่งซื้อ #${data.orderId}`, PADDING, y);
  if (dateText) {
    ctx.textAlign = "right";
    ctx.fillText(dateText, CARD_WIDTH - PADDING, y);
    ctx.textAlign = "left";
  }
  y += 20;

  if (paymentLabel) {
    ctx.font = '400 12px Sarabun, "Noto Sans Thai", sans-serif';
    ctx.fillStyle = GRAY;
    ctx.fillText(`ชำระโดย: ${paymentLabel}`, PADDING, y);
    y += 18;
  }

  drawDivider();

  // รายการสินค้า
  data.items.forEach((item) => {
    const lineTotal = Number(item.price) * item.quantity;

    ctx.font = '600 13.5px Sarabun, "Noto Sans Thai", sans-serif';
    const nameLines = wrapText(ctx, item.product_name, CONTENT_WIDTH - 90, 2);

    ctx.fillStyle = BROWN;
    ctx.textAlign = "left";
    nameLines.forEach((line, i) => {
      ctx.fillText(line, PADDING, y + i * 17);
    });

    ctx.font = '600 13.5px Sarabun, "Noto Sans Thai", sans-serif';
    ctx.textAlign = "right";
    ctx.fillText(formatMoney(lineTotal), CARD_WIDTH - PADDING, y);
    ctx.textAlign = "left";

    y += nameLines.length * 17;

    ctx.font = '400 12px Sarabun, "Noto Sans Thai", sans-serif';
    ctx.fillStyle = GRAY;
    ctx.fillText(
      `${item.quantity} × ${formatMoney(Number(item.price))}`,
      PADDING,
      y
    );
    y += 24;
  });

  drawDivider();

  if (hasDiscount) {
    drawRow("ราคาสินค้ารวม", formatMoney(subtotalBeforeDiscount));
    drawRow(`ส่วนลด (${data.discountCode})`, `-${formatMoney(Number(data.discountAmount))}`, {
      color: GREEN,
      bold: true,
    });
  }

  drawRow("ราคาสินค้า (ก่อน VAT)", formatMoneyPrecise(amountExVat));
  drawRow("ภาษีมูลค่าเพิ่ม (VAT 7%)", formatMoneyPrecise(vatAmount));

  drawDivider();

  // ยอดชำระทั้งสิ้น
  ctx.font = '700 15px Sarabun, "Noto Sans Thai", sans-serif';
  ctx.fillStyle = BROWN;
  ctx.textAlign = "left";
  ctx.fillText("ยอดชำระทั้งสิ้น", PADDING, y + 3);
  ctx.font = '800 22px Sarabun, "Noto Sans Thai", sans-serif';
  ctx.textAlign = "right";
  ctx.fillText(formatMoney(Number(data.totalAmount)), CARD_WIDTH - PADDING, y - 3);
  ctx.textAlign = "left";
  y += 30;

  if (data.coinsEarned && data.coinsEarned > 0) {
    y += 12;
    const boxHeight = 32;
    ctx.fillStyle = "#FFF6E0";
    ctx.strokeStyle = "#F0DFAE";
    ctx.lineWidth = 1;
    const boxX = PADDING;
    const boxW = CONTENT_WIDTH;
    const radius = 10;
    ctx.beginPath();
    ctx.moveTo(boxX + radius, y);
    ctx.arcTo(boxX + boxW, y, boxX + boxW, y + boxHeight, radius);
    ctx.arcTo(boxX + boxW, y + boxHeight, boxX, y + boxHeight, radius);
    ctx.arcTo(boxX, y + boxHeight, boxX, y, radius);
    ctx.arcTo(boxX, y, boxX + boxW, y, radius);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.font = '700 12.5px Sarabun, "Noto Sans Thai", sans-serif';
    ctx.fillStyle = "#8A6A00";
    ctx.textAlign = "center";
    ctx.fillText(`ได้รับเหรียญสะสม +${data.coinsEarned} เหรียญ`, CARD_WIDTH / 2, y + 10);
    ctx.textAlign = "left";
    y += boxHeight;
  }

  y += 18;
  ctx.font = '400 11.5px Sarabun, "Noto Sans Thai", sans-serif';
  ctx.fillStyle = GRAY;
  ctx.textAlign = "center";
  ctx.fillText("ขอบคุณที่อุดหนุนค่ะ/ครับ", CARD_WIDTH / 2, y);
  ctx.textAlign = "left";
  y += 24;

  const finalHeight = Math.ceil(y + PADDING);

  // ตัด canvas ให้เหลือแค่ความสูงเนื้อหาจริง (ไม่เอาพื้นที่ว่างด้านล่างที่เผื่อไว้)
  const final = document.createElement("canvas");
  final.width = CARD_WIDTH * SCALE;
  final.height = finalHeight * SCALE;
  const finalCtx = final.getContext("2d")!;
  finalCtx.fillStyle = "#FFFFFF";
  finalCtx.fillRect(0, 0, final.width, final.height);
  finalCtx.drawImage(
    work,
    0,
    0,
    final.width,
    final.height,
    0,
    0,
    final.width,
    final.height
  );

  return final;
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] || "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function asciiBytes(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i) & 0xff;
  return bytes;
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

// ประกอบไฟล์ .pdf จริงๆ เองจาก JPEG ของใบเสร็จ (ไฟล์ PDF ที่มีแค่หน้าเดียว เป็นรูปภาพเต็มหน้า)
// เขียนตามสเปก PDF แบบพื้นฐานที่สุด (ไม่มีไลบรารีภายนอก เพราะ npm registry ถูกบล็อกใน
// environment นี้ — แนวทางเดียวกับ src/lib/xlsx.ts ที่ประกอบไฟล์ .xlsx เองมาก่อนหน้านี้)
function buildReceiptPdfBytes(
  jpegBytes: Uint8Array,
  pixelWidth: number,
  pixelHeight: number,
  pagePtWidth: number,
  pagePtHeight: number
): Uint8Array {
  const w = pagePtWidth.toFixed(2);
  const h = pagePtHeight.toFixed(2);

  const objects: string[] = [];
  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objects[2] = `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`;
  objects[3] =
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] ` +
    `/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`;

  const contentStream = `q\n${w} 0 0 ${h} 0 0 cm\n/Im0 Do\nQ`;

  const header = asciiBytes("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

  const parts: Uint8Array[] = [header];
  const offsets: number[] = [];
  let pos = header.length;

  const pushObj = (index: number, bytes: Uint8Array) => {
    offsets[index] = pos;
    parts.push(bytes);
    pos += bytes.length;
  };

  pushObj(1, asciiBytes(`1 0 obj\n${objects[1]}\nendobj\n`));
  pushObj(2, asciiBytes(`2 0 obj\n${objects[2]}\nendobj\n`));
  pushObj(3, asciiBytes(`3 0 obj\n${objects[3]}\nendobj\n`));

  const imgHeader = asciiBytes(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${Math.round(
      pixelWidth
    )} /Height ${Math.round(pixelHeight)} /ColorSpace /DeviceRGB /BitsPerComponent 8 ` +
      `/Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
  );
  const imgFooter = asciiBytes("\nendstream\nendobj\n");
  offsets[4] = pos;
  parts.push(imgHeader, jpegBytes, imgFooter);
  pos += imgHeader.length + jpegBytes.length + imgFooter.length;

  pushObj(
    5,
    asciiBytes(`5 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`)
  );

  const xrefStart = pos;
  let xref = "xref\n0 6\n0000000000 65535 f \n";
  for (let i = 1; i <= 5; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  parts.push(asciiBytes(xref + trailer));

  return concatBytes(parts);
}

// สร้างไฟล์ .pdf ของใบเสร็จแล้วสั่งดาวน์โหลดทันที (แนวทางเดียวกับปุ่ม "ส่งออกรายงาน .xlsx"
// ของหน้าแอดมิน: ประกอบไฟล์เองเป็น Blob แล้วกดดาวน์โหลดผ่าน <a download> — ไม่ต้องพึ่งหน้าต่าง
// พิมพ์/ป๊อปอัพของเบราว์เซอร์ ซึ่งมักถูกบล็อกเวลารันอยู่ในหน้าต่างตัวอย่าง)
export function downloadReceiptPdf(data: ReceiptPdfData) {
  if (typeof document === "undefined") return;

  const canvas = renderReceiptCanvas(data);
  const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const jpegBytes = dataUrlToBytes(jpegDataUrl);

  // แปลงจากพิกเซล canvas (ที่วาดด้วย scale 2 เท่า) กลับมาเป็นหน่วย "จุด" ของหน้า PDF
  const SCALE = 2;
  const widthPt = canvas.width / SCALE;
  const heightPt = canvas.height / SCALE;

  const pdfBytes = buildReceiptPdfBytes(jpegBytes, canvas.width, canvas.height, widthPt, heightPt);
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `prakun-receipt-${data.orderId}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
