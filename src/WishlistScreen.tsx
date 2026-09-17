import { useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { addToCart } from "./api";
import { useCart } from "./context/CartContext";
import { useWishlist, WishlistProduct } from "./context/WishlistContext";

interface Props {
  onOpenProduct: (product: WishlistProduct) => void;
}

export default function WishlistScreen({ onOpenProduct }: Props) {
  const { items, removeFromWishlist } = useWishlist();
  const { refreshCart } = useCart();

  const [addingId, setAddingId] = useState<number | null>(null);
  const [addedId, setAddedId] = useState<number | null>(null);

  const handleAddToCart = async (item: WishlistProduct) => {
    setAddingId(item.id);

    try {
      await addToCart(item.id, 1);
      await refreshCart();

      setAddedId(item.id);
      setTimeout(() => setAddedId(null), 1200);
    } catch (err) {
      console.error("Add to cart error:", err);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <TouchableOpacity
            style={styles.rowPress}
            activeOpacity={0.8}
            onPress={() => onOpenProduct(item)}
          >
            <Image
              source={{ uri: item.image_url }}
              style={styles.image}
              resizeMode="cover"
            />

            <View style={styles.rowInfo}>
              <Text style={styles.category} numberOfLines={1}>
                {item.category}
              </Text>

              <Text style={styles.name} numberOfLines={2}>
                {item.name}
              </Text>

              <Text style={styles.price}>
                ฿{Number(item.price).toLocaleString("th-TH")}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.cartButton,
                (item.stock < 1 || addingId === item.id) &&
                  styles.cartButtonDisabled,
              ]}
              activeOpacity={0.8}
              disabled={item.stock < 1 || addingId === item.id}
              onPress={() => handleAddToCart(item)}
            >
              {addingId === item.id ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.cartButtonText}>
                  {item.stock < 1
                    ? "สินค้าหมด"
                    : addedId === item.id
                    ? "✓ เพิ่มแล้ว"
                    : "หยิบใส่ตะกร้า"}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.removeLink}
              activeOpacity={0.7}
              onPress={() => removeFromWishlist(item.id)}
            >
              <Text style={styles.removeLinkText}>ลบออกจากรายการโปรด</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>♡</Text>
          <Text style={styles.emptyTitle}>ยังไม่มีสินค้าที่ถูกใจ</Text>
          <Text style={styles.emptyText}>
            กดไอคอนหัวใจที่การ์ดสินค้า เพื่อเก็บไว้ดูทีหลังได้ที่นี่
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    flexGrow: 1,
    backgroundColor: "#FAFAFA",
  },

  row: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EDEDED",
    padding: 12,
    marginBottom: 10,
  },

  rowPress: {
    flexDirection: "row",
  },

  image: {
    width: 76,
    height: 76,
    borderRadius: 10,
    backgroundColor: "#F1F1F1",
  },

  rowInfo: {
    flex: 1,
    marginLeft: 12,
  },

  category: {
    fontSize: 11,
    color: "#9A9A9A",
    marginBottom: 2,
    textTransform: "uppercase",
  },

  name: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111111",
    marginBottom: 4,
  },

  price: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111111",
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F1F1",
  },

  cartButton: {
    backgroundColor: "#111111",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },

  cartButtonDisabled: {
    opacity: 0.5,
  },

  cartButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  removeLink: {
    paddingVertical: 6,
  },

  removeLinkText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#B3413E",
  },

  emptyState: {
    alignItems: "center",
    paddingTop: 70,
    paddingHorizontal: 30,
  },

  emptyIcon: {
    fontSize: 36,
    color: "#C9C9C9",
    marginBottom: 10,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 13,
    color: "#8A8A8A",
    textAlign: "center",
  },
});
