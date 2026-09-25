import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface Props {
  isMobile?: boolean;
  onPress?: () => void;
  subtitle?: string;
}

// โลโก้ร้าน: ใช้ไฟล์โลโก้จริงของร้าน (assets/images/shop-logo.png) แทนตัวอักษรย่อเดิม
// อัตราส่วนภาพต้นฉบับ ~2062x490 (กว้าง:สูง ≈ 4.2:1) จึงกำหนดความกว้างตามสัดส่วนนี้
// กดที่โลโก้/ชื่อร้านแล้วกลับไปหน้าแสดงสินค้าได้ (ถ้ามี onPress ส่งเข้ามา)
const LOGO_ASPECT_RATIO = 2062 / 490;
const LOGO_HEIGHT = 34;
const LOGO_HEIGHT_MOBILE = 28;

export default function ShopLogo({ isMobile, onPress, subtitle }: Props) {
  const logoHeight = isMobile ? LOGO_HEIGHT_MOBILE : LOGO_HEIGHT;
  const logoWidth = logoHeight * LOGO_ASPECT_RATIO;

  const content = (
    <>
      <Image
        source={require("../../assets/images/shop-logo.png")}
        style={{ width: logoWidth, height: logoHeight }}
        resizeMode="contain"
        accessibilityLabel="โลโก้ร้าน"
      />

      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={styles.wrapper}
        activeOpacity={0.7}
        onPress={onPress}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.wrapper}>{content}</View>;
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  subtitle: {
    fontSize: 11,
    color: "#8A7D75",
    marginTop: 1,
  },
});
