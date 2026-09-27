import { StyleSheet, TouchableOpacity } from "react-native";

import Icon from "./Icon";

interface Props {
  onPress: () => void;
}

// ปุ่มย้อนกลับ (ลูกศรซ้าย) — ใช้ในหน้าที่ไม่ใช่แท็บหลักของ BottomTabBar
// (หน้าที่ต้องกดเข้ามาจากที่อื่น เช่น จากเมนู/แดชบอร์ด/รายการสินค้า) วางไว้ซ้ายสุด
// ของ topBar ก่อนโลโก้ร้าน ให้เห็นชัดว่ากดแล้วย้อนกลับได้ ไม่ต้องเดาจากการแตะโลโก้เอง
export default function BackButton({ onPress }: Props) {
  return (
    <TouchableOpacity
      style={styles.button}
      activeOpacity={0.6}
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Icon name="arrow_back" size={20} color="#3D2619" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
});
