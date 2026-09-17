import { useEffect, useRef } from "react";

import { Animated, StyleSheet, View } from "react-native";

// การ์ดโครงเทาๆ (shimmer เบาๆ) โชว์ตอนกำลังโหลดสินค้าครั้งแรก
// แทนสปินเนอร์กลมตัวเดียวกลางจอ ให้ความรู้สึกพรีเมียมและ "รู้เลย์เอาต์ล่วงหน้า" มากกว่า
export default function SkeletonCard({ width }: { width: number }) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();

    return () => loop.stop();
  }, [opacity]);

  return (
    <View style={[styles.card, { width }]}>
      <Animated.View style={[styles.image, { height: width, opacity }]} />

      <View style={styles.body}>
        <Animated.View style={[styles.line, styles.lineTiny, { opacity }]} />
        <Animated.View style={[styles.line, styles.lineLong, { opacity }]} />
        <Animated.View style={[styles.line, styles.lineMid, { opacity }]} />
        <Animated.View style={[styles.button, { opacity }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EDEDED",
    overflow: "hidden",
  },

  image: {
    width: "100%",
    backgroundColor: "#E7E7E7",
  },

  body: {
    padding: 10,
    gap: 8,
  },

  line: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E7E7E7",
  },

  lineTiny: {
    width: "35%",
    height: 8,
  },

  lineLong: {
    width: "90%",
  },

  lineMid: {
    width: "55%",
  },

  button: {
    marginTop: 6,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#E7E7E7",
  },
});
