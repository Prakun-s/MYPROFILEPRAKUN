import { useEffect, useRef } from "react";
import { Image, ImageStyle, Platform, Text, TextStyle } from "react-native";

// โหลดฟอนต์ไอคอน Material Symbols Outlined ของ Google ผ่านเว็บ (ฟอนต์เดียวกับที่ดีไซน์ต้นแบบ Stitch ใช้)
// ไม่ต้องติดตั้ง npm package เพิ่ม แค่แปะ <link> เข้า <head> ตอนแอปรันบนเว็บเท่านั้น
let fontInjected = false;

function ensureMaterialSymbolsFont() {
  if (Platform.OS !== "web" || fontInjected) return;
  if (typeof document === "undefined") return;

  fontInjected = true;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap";
  document.head.appendChild(link);
}

// ไอคอนบางตัว (ที่ผู้ใช้ส่งรูปมาให้โดยเฉพาะ) ใช้ไฟล์ภาพบิตแมปทึบสีดำแทนฟอนต์
// เพื่อให้ตรงกับดีไซน์ที่ต้องการเป๊ะๆ และไม่ต้องพึ่งฟอนต์เว็บที่อาจโหลดไม่ขึ้นบนเซิร์ฟเวอร์จริง
// ใช้ key เป็นชื่อไอคอนแบบเดียวกับ Material Symbols ligature เดิม จุดเรียกใช้ทุกที่ในแอปไม่ต้องแก้อะไร
// เก็บไฟล์ไว้ที่ assets/icons/ (โฟลเดอร์ assets ที่ root ของโปรเจกต์ ระดับเดียวกับ assets/images/
// ที่แอปนี้ใช้เก็บรูปโลโก้/ไอคอนอื่นอยู่แล้ว ไม่ใช่ src/assets/)
const IMAGE_ICONS: Record<string, number> = {
  home: require("../../assets/icons/home.png"),
  shopping_cart: require("../../assets/icons/cart.png"),
  monetization_on: require("../../assets/icons/coins.png"),
  receipt_long: require("../../assets/icons/orders.png"),
  inventory_2: require("../../assets/icons/box.png"),
};

interface Props {
  // ชื่อไอคอนตาม Material Symbols ligature เช่น "search", "home", "shopping_cart"
  // ดูรายชื่อทั้งหมดได้ที่ https://fonts.google.com/icons
  // (ถ้าชื่อนี้ตรงกับ IMAGE_ICONS ด้านบน จะเรนเดอร์เป็นรูปภาพแทนฟอนต์โดยอัตโนมัติ)
  name: string;
  size?: number;
  color?: string;
  // true = ไอคอนแบบทึบ (FILL 1) เช่นหัวใจที่ถูกกดถูกใจแล้ว (ใช้กับไอคอนฟอนต์เท่านั้น)
  filled?: boolean;
  weight?: number;
  style?: TextStyle;
}

export default function Icon({
  name,
  size = 22,
  color = "#3D2619",
  filled = false,
  weight = 400,
  style,
}: Props) {
  // บน react-native-web, ref ของ <Text> จะชี้ไปที่ node DOM (<span>) ของจริงโดยตรง
  const textRef = useRef<any>(null);
  const imageSource = IMAGE_ICONS[name];

  useEffect(() => {
    if (!imageSource) ensureMaterialSymbolsFont();
  }, [imageSource]);

  // ตั้งค่า font-feature-settings / font-variation-settings ผ่าน DOM ตรงๆ แทนการส่งผ่าน
  // prop "style" ของ RN เพราะ react-native-web บางเวอร์ชันจะตัด property เฉพาะเว็บล้วนๆ แบบนี้
  // ทิ้งตอนแปลง style object เป็น CSS ทำให้ font ไม่ทำ ligature substitution (คำว่า "home"
  // ไม่ถูกแปลงเป็นรูปไอคอน) กลายเป็นกล่อง/ตัวอักษรเปล่าแทน การตั้งค่าตรงกับ node.style
  // แบบนี้รับประกันว่าค่าจะถูกใช้จริงไม่ว่า RN Web เวอร์ชันไหนก็ตาม
  useEffect(() => {
    if (imageSource) return;
    if (Platform.OS !== "web") return;

    const node: HTMLElement | null = textRef.current;
    if (!node || !node.style) return;

    node.style.setProperty("font-feature-settings", "'liga' 1");
    node.style.setProperty("-webkit-font-feature-settings", "'liga' 1");
    node.style.setProperty(
      "font-variation-settings",
      `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' 24`
    );
  });

  if (imageSource) {
    return (
      <Image
        source={imageSource}
        resizeMode="contain"
        style={[
          { width: size, height: size, tintColor: color },
          style as unknown as ImageStyle,
        ]}
      />
    );
  }

  return (
    <Text
      ref={textRef}
      style={[
        {
          fontFamily: "Material Symbols Outlined",
          fontSize: size,
          lineHeight: size * 1.05,
          color,
        },
        style,
      ]}
      selectable={false}
    >
      {name}
    </Text>
  );
}
