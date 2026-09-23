export interface SeasonPreset {
  id: string;
  icon: string;
  label: string;
  suggestedCode: string;
}

// พรีเซ็ตฤดูกาล/เทศกาลให้แอดมินเลือกเร็วๆ ตอนสร้างโค้ดส่วนลด
// เลือกแล้วจะช่วย auto-fill ชื่อโปรโมชันกับโค้ดแนะนำให้ แก้ต่อได้ก่อนบันทึก
export const SEASON_PRESETS: SeasonPreset[] = [
  { id: "songkran", icon: "💦", label: "สงกรานต์", suggestedCode: "SONGKRAN10" },
  { id: "newyear", icon: "🎆", label: "ปีใหม่", suggestedCode: "NEWYEAR10" },
  { id: "christmas", icon: "🎄", label: "คริสต์มาส", suggestedCode: "XMAS10" },
  { id: "valentine", icon: "💝", label: "วาเลนไทน์", suggestedCode: "LOVE10" },
  { id: "loykrathong", icon: "🏮", label: "ลอยกระทง", suggestedCode: "KRATHONG10" },
  { id: "chinese_newyear", icon: "🧧", label: "ตรุษจีน", suggestedCode: "CNY10" },
  { id: "midyear", icon: "☀️", label: "กลางปีลดราคา", suggestedCode: "MIDYEAR10" },
  { id: "blackfriday", icon: "🛍️", label: "Black Friday", suggestedCode: "BLACKFRIDAY" },
  { id: "custom", icon: "✏️", label: "กำหนดเอง", suggestedCode: "" },
];
