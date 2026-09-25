export interface SeasonPreset {
  id: string;
  // ชื่อไอคอนตาม Material Symbols ligature (เดิมเป็นอีโมจิ เปลี่ยนให้เข้าธีมเดียวกับทั้งแอป)
  icon: string;
  label: string;
  suggestedCode: string;
}

// พรีเซ็ตฤดูกาล/เทศกาลให้แอดมินเลือกเร็วๆ ตอนสร้างโค้ดส่วนลด
// เลือกแล้วจะช่วย auto-fill ชื่อโปรโมชันกับโค้ดแนะนำให้ แก้ต่อได้ก่อนบันทึก
export const SEASON_PRESETS: SeasonPreset[] = [
  { id: "songkran", icon: "water_drop", label: "สงกรานต์", suggestedCode: "SONGKRAN10" },
  { id: "newyear", icon: "celebration", label: "ปีใหม่", suggestedCode: "NEWYEAR10" },
  { id: "christmas", icon: "park", label: "คริสต์มาส", suggestedCode: "XMAS10" },
  { id: "valentine", icon: "favorite", label: "วาเลนไทน์", suggestedCode: "LOVE10" },
  { id: "loykrathong", icon: "nights_stay", label: "ลอยกระทง", suggestedCode: "KRATHONG10" },
  { id: "chinese_newyear", icon: "redeem", label: "ตรุษจีน", suggestedCode: "CNY10" },
  { id: "midyear", icon: "wb_sunny", label: "กลางปีลดราคา", suggestedCode: "MIDYEAR10" },
  { id: "blackfriday", icon: "shopping_bag", label: "Black Friday", suggestedCode: "BLACKFRIDAY" },
  { id: "custom", icon: "edit", label: "กำหนดเอง", suggestedCode: "" },
];
