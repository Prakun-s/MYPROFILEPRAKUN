import { StyleSheet, Text, View } from "react-native";

interface Props {
  isMobile?: boolean;
}

// โลโก้ร้าน: วงกลมสีเทาเข้ม ใส่ตัวอักษรย่อ ("P") ไว้ข้างหน้าชื่อร้าน
// ให้ดูเป็นแบรนด์มากขึ้น แยกออกมาเป็นไฟล์เดี่ยว จะได้ปรับแก้ทีหลังง่ายๆ
export default function ShopLogo({ isMobile }: Props) {
  return (
    <View style={styles.wrapper}>
      <View style={[styles.badge, isMobile && styles.badgeMobile]}>
        <Text style={[styles.badgeText, isMobile && styles.badgeTextMobile]}>
          P
        </Text>
      </View>

      <Text style={styles.title}>
        {isMobile ? "PRAKUN" : "PRAKUN SHOP"}
      </Text>
    </View>
  );
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
