import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface Props {
  username?: string;
  avatarUrl?: string | null;
  onPress: () => void;
}

// ปุ่มรูปโปรไฟล์มุมขวาบน (เดิมกดแล้วเปิดดรอปดาวน์ UserMenu)
// ตอนนี้สลับระบบกับปุ่ม "เมนู" ที่แถบล่างแล้ว: กดปุ่มนี้พาไปหน้าโปรไฟล์โดยตรง
// ส่วนรายการลัดอื่นๆ (แดชบอร์ด/จัดการสินค้า/ออกจากระบบ ฯลฯ) ย้ายไปอยู่ในหน้าเมนูเต็มแทน
export default function HeaderAvatarButton({ username, avatarUrl, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.trigger} activeOpacity={0.75} onPress={onPress}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarPlaceholderText}>
            {(username || "?").charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: "hidden",
  },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E8DFD8",
  },

  avatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#3D2619",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarPlaceholderText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
