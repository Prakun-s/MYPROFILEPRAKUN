import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface Props {
  isMobile?: boolean;
  onPress?: () => void;
}

// โลโก้ร้าน: วงกลมสีเทาเข้ม ใส่ตัวอักษรย่อ ("P") ไว้ข้างหน้าชื่อร้าน
// ให้ดูเป็นแบรนด์มากขึ้น แยกออกมาเป็นไฟล์เดี่ยว จะได้ปรับแก้ทีหลังง่ายๆ
// กดที่โลโก้/ชื่อร้านแล้วกลับไปหน้าแสดงสินค้าได้ (ถ้ามี onPress ส่งเข้ามา)
export default function ShopLogo({ isMobile, onPress }: Props) {
  const content = (
    <>
      <View style={[styles.badge, isMobile && styles.badgeMobile]}>
        <Text style={[styles.badgeText, isMobile && styles.badgeTextMobile]}>
          P
        </Text>
      </View>

      <Text style={styles.title}>
        {isMobile ? "PRAKUN" : "PRAKUN SHOP"}
      </Text>
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

  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EDEBE4",
    alignItems: "center",
    justifyContent: "center",
  },

  badgeMobile: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },

  badgeText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#2B2B31",
  },

  badgeTextMobile: {
    fontSize: 13,
  },

  title: {
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: -0.3,
    color: "#2B2B31",
  },
});
