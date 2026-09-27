// สร้างไฟล์ .xlsx (Excel) จริงๆ ด้วยมือ ไม่พึ่งไลบรารีภายนอก (เช่น SheetJS/exceljs)
// เพราะ registry ของ npm ถูกบล็อกใน environment นี้ (ตรวจสอบแล้ว: ทุกแพ็กเกจโดนปฏิเสธ
// ไม่ใช่แค่แพ็กเกจ excel) จึงประกอบไฟล์ .xlsx (ซึ่งจริงๆ คือไฟล์ ZIP ที่บรรจุ XML ตามสเปก
// OOXML SpreadsheetML) ขึ้นเองแบบ minimal แต่ใช้งานได้จริงกับ Excel/Numbers/Google Sheets
//
// โครงสร้างไฟล์ที่ประกอบ: [Content_Types].xml, _rels/.rels, xl/workbook.xml,
// xl/_rels/workbook.xml.rels, xl/styles.xml (หัวตารางตัวหนา+พื้นหลังสีน้ำตาล),
// xl/worksheets/sheet1.xml (freeze แถวหัวตาราง + กำหนดความกว้างคอลัมน์อัตโนมัติ)

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

// ===== CRC32 (ตามสเปก ZIP มาตรฐาน) =====
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ===== ตัวช่วยเขียนไบต์แบบ little-endian ลงอาร์เรย์ธรรมดา =====
function pushU16(arr: number[], v: number) {
  arr.push(v & 0xff, (v >>> 8) & 0xff);
}

function pushU32(arr: number[], v: number) {
  arr.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);
}

// ===== ประกอบไฟล์ ZIP (ไม่บีบอัด — method "stored") จากรายการไฟล์ที่ให้มา =====
function buildZip(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const localParts: number[] = [];
  const centralParts: number[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const data = entry.data;
    const crc = crc32(data);
    const localHeaderOffset = offset;

    // Local file header
    const local: number[] = [];
    pushU32(local, 0x04034b50);
    pushU16(local, 20); // version needed
    pushU16(local, 0); // flags
    pushU16(local, 0); // compression: stored
    pushU16(local, 0); // mod time
    pushU16(local, 0x21); // mod date (1980-01-01)
    pushU32(local, crc);
    pushU32(local, data.length); // compressed size
    pushU32(local, data.length); // uncompressed size
    pushU16(local, nameBytes.length);
    pushU16(local, 0); // extra field length
    for (const b of nameBytes) local.push(b);

    localParts.push(...local);
    for (const b of data) localParts.push(b);

    offset += local.length + data.length;

    // Central directory header
    const central: number[] = [];
    pushU32(central, 0x02014b50);
    pushU16(central, 20); // version made by
    pushU16(central, 20); // version needed
    pushU16(central, 0); // flags
    pushU16(central, 0); // compression: stored
    pushU16(central, 0); // mod time
    pushU16(central, 0x21); // mod date
    pushU32(central, crc);
    pushU32(central, data.length);
    pushU32(central, data.length);
    pushU16(central, nameBytes.length);
    pushU16(central, 0); // extra field length
    pushU16(central, 0); // comment length
    pushU16(central, 0); // disk number start
    pushU16(central, 0); // internal attrs
    pushU32(central, 0); // external attrs
    pushU32(central, localHeaderOffset);
    for (const b of nameBytes) central.push(b);

    centralParts.push(...central);
  }

  const centralDirOffset = offset;
  const centralDirSize = centralParts.length;

  const end: number[] = [];
  pushU32(end, 0x06054b50);
  pushU16(end, 0); // disk number
  pushU16(end, 0); // disk with central dir
  pushU16(end, entries.length); // entries on this disk
  pushU16(end, entries.length); // total entries
  pushU32(end, centralDirSize);
  pushU32(end, centralDirOffset);
  pushU16(end, 0); // comment length

  return Uint8Array.from([...localParts, ...centralParts, ...end]);
}

// ===== ตัวช่วย XML =====
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function columnLetter(index: number): string {
  // index เริ่มที่ 0 → A, 1 → B, ..., 25 → Z, 26 → AA ...
  let n = index + 1;
  let letters = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

export type XlsxCellValue = string | number | null | undefined;

// สร้างไฟล์ .xlsx เป็น Blob จากหัวตาราง + แถวข้อมูล (แถวหัวตารางจะตัวหนา พื้นหลังน้ำตาล + freeze ไว้)
export function buildXlsxBlob(
  sheetName: string,
  headers: string[],
  rows: XlsxCellValue[][]
): Blob {
  const encoder = new TextEncoder();
  const safeSheetName = sheetName.replace(/[\\/*?:[\]]/g, " ").slice(0, 31) || "Sheet1";

  // ความกว้างคอลัมน์: ประมาณจากความยาวข้อความที่ยาวที่สุดในคอลัมน์นั้น (หัว + ข้อมูล)
  const colWidths = headers.map((h, colIndex) => {
    let maxLen = h.length;
    for (const row of rows) {
      const cell = row[colIndex];
      const len = cell === null || cell === undefined ? 0 : String(cell).length;
      if (len > maxLen) maxLen = len;
    }
    return Math.min(50, Math.max(10, maxLen + 3));
  });

  const colsXml = colWidths
    .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
    .join("");

  const headerRowXml =
    `<row r="1">` +
    headers
      .map((h, i) => {
        const ref = `${columnLetter(i)}1`;
        return `<c r="${ref}" t="inlineStr" s="1"><is><t xml:space="preserve">${escapeXml(h)}</t></is></c>`;
      })
      .join("") +
    `</row>`;

  const dataRowsXml = rows
    .map((row, rowIndex) => {
      const r = rowIndex + 2;
      const cellsXml = row
        .map((cell, colIndex) => {
          const ref = `${columnLetter(colIndex)}${r}`;
          if (cell === null || cell === undefined || cell === "") {
            return `<c r="${ref}"/>`;
          }
          if (typeof cell === "number" && Number.isFinite(cell)) {
            return `<c r="${ref}"><v>${cell}</v></c>`;
          }
          return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(String(cell))}</t></is></c>`;
        })
        .join("");
      return `<row r="${r}">${cellsXml}</row>`;
    })
    .join("");

  const sheetXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<cols>${colsXml}</cols>` +
    `<sheetData>${headerRowXml}${dataRowsXml}</sheetData>` +
    `</worksheet>`;

  const stylesXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<fonts count="2">` +
    `<font><sz val="11"/><name val="Calibri"/></font>` +
    `<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>` +
    `</fonts>` +
    `<fills count="3">` +
    `<fill><patternFill patternType="none"/></fill>` +
    `<fill><patternFill patternType="gray125"/></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FF3D2619"/><bgColor indexed="64"/></patternFill></fill>` +
    `</fills>` +
    `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="2">` +
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
    `<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>` +
    `</cellXfs>` +
    `</styleSheet>`;

  const workbookXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets><sheet name="${escapeXml(safeSheetName)}" sheetId="1" r:id="rId1"/></sheets>` +
    `</workbook>`;

  const workbookRelsXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `</Relationships>`;

  const rootRelsXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `</Relationships>`;

  const contentTypesXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    `</Types>`;

  const entries: ZipEntry[] = [
    { name: "[Content_Types].xml", data: encoder.encode(contentTypesXml) },
    { name: "_rels/.rels", data: encoder.encode(rootRelsXml) },
    { name: "xl/workbook.xml", data: encoder.encode(workbookXml) },
    { name: "xl/_rels/workbook.xml.rels", data: encoder.encode(workbookRelsXml) },
    { name: "xl/styles.xml", data: encoder.encode(stylesXml) },
    { name: "xl/worksheets/sheet1.xml", data: encoder.encode(sheetXml) },
  ];

  const zipBytes = buildZip(entries);
  return new Blob([zipBytes.buffer as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
