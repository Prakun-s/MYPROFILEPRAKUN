import { useEffect, useRef } from "react";

import { Animated, Pressable, StyleSheet, Text } from "react-native";

import Icon from "./Icon";

interface Props {
  visible: boolean;
  message: string;
  tone?: "warning" | "info";
  duration?: number;
  onHide: () => void;
}

// Toast ลอยล่างจอ ใช้แจ้งเตือนสั้นๆ เช่น "สต๊อกสินค้าใกล้หมด"
// ปิดเองอัตโนมัติตาม duration หรือกดปิดเองก็ได้
export default function Toast({
  visible,
  message,
  tone = "info",
  duration = 4000,
  onHide,
}: Props) {
  const translateY = useRef(new Animated.Value(80)).current;

  useEffect(() => {
    if (!visible) return;

    Animated.spring(translateY, {
      toValue: 0,
      friction: 8,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(translateY, {
        toValue: 80,
        duration: 220,
        useNativeDriver: true,
      }).start(() => onHide());
    }, duration);

    return () => clearTimeout(timer);
  }, [visible, message]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        tone === "warning" && styles.toastWarning,
        { transform: [{ translateY }] },
      ]}
    >
      <Icon name={tone === "warning" ? "warning" : "info"} size={18} color="#FFFFFF" />

      <Text style={styles.text} numberOfLines={2}>
        {message}
      </Text>

      <Pressable onPress={onHide} hitSlop={8}>
        <Icon name="close" size={16} color="#FFFFFF" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 20,
    maxWidth: 420,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#3D2619",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: "#000000",
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    zIndex: 999,
  },

  toastWarning: {
    backgroundColor: "#C53030",
  },

  icon: {
    fontSize: 16,
  },

  text: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },

  close: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    paddingHorizontal: 4,
  },
});
