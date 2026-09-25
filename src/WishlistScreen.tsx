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
import ConfirmDialog from "./components/ConfirmDialog";
import Icon from "./components/Icon";
import { useCart } from "./context/CartContext";
import { useWishlist, WishlistProduct } from "./context/WishlistContext";

interface Props {
  onOpenProduct: (product: WishlistProduct) => void;
}

function getStockMeta(stock: number): { label: string; icon: string; color: string } {
  if (stock < 1) return { label: "สินค้าหมด", icon: "close", color: "#C53030" };
  if (stock < 5) return { label: `เหลือน้อย เหลือ ${stock} ชิ้น`, icon: "warning", color: "#D97706" };
  return { label: "พร้อมส่ง", icon: "check_circle", color: "#2D6A4F" };
}

export default function WishlistScreen({ onOpenProduct }: Props) {
  const { items, removeFromWishlist, clearWishlist } = useWishlist();
  const { refreshCart } = useCart();

  const [addingId, setAddingId] = useState<number | null>(null);
  const [addedId, setAddedId] = useState<number | null>(null);
  const [clearDialogVisible, setClearDialogVisible] = useState(false);

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
    <>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          items.length > 0 ? (
            <View style={styles.headerRow}>
              <View style={styles.headerTitleRow}>
                <Text style={styles.headerTitle}>สินค้าที่ถูกใจ</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{items.length} รายการ</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.clearButton}
                activeOpacity={0.7}
                onPress={() => setClearDialogVisible(true)}
              >
                <Icon name="delete" size={13} color="#C53030" />
                <Text style={styles.clearButtonText}>ล้างที่ไม่ต้องการ</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const stockMeta = getStockMeta(item.stock);

          return (
            <View style={styles.card}>
              <TouchableOpacity activeOpacity={0.9} onPress={() => onOpenProduct(item)}>
                <View style={styles.imageWrap}>
                  <Image
                    source={{ uri: item.image_url }}
                    style={styles.image}
                    resizeMode="cover"
                  />

                  {item.badge_status ? (
                    <View style={styles.statusPill}>
                      <Text style={styles.statusPillText}>{item.badge_status}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={styles.heartButton}
                    activeOpacity={0.7}
                    onPress={() => removeFromWishlist(item.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Icon name="favorite" filled size={16} color="#D2585F" />
                  </TouchableOpacity>
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.category} numberOfLines={1}>
                    {item.category}
                  </Text>

                  <Text style={styles.name} numberOfLines={2}>
                    {item.name}
                  </Text>

                  <Text style={styles.price}>
                    ฿{Number(item.price).toLocaleString("th-TH")}
                  </Text>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Icon name={stockMeta.icon} size={12} color={stockMeta.color} />
                    <Text style={[styles.stockHint, { color: stockMeta.color }]}>
                      {stockMeta.label}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              <View style={styles.cardFooter}>
                <TouchableOpacity
                  style={styles.removeLink}
                  activeOpacity={0.7}
                  onPress={() => removeFromWishlist(item.id)}
                >
                  <Text style={styles.removeLinkText}>ลบออกจากรายการโปรด</Text>
                </TouchableOpacity>

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
                  ) : item.stock < 1 ? (
                    <Text style={styles.cartButtonText}>สินค้าหมด</Text>
                  ) : (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <Icon
                        name={addedId === item.id ? "check" : "shopping_cart"}
                        size={13}
                        color="#FFFFFF"
                        weight={700}
                      />
                      <Text style={styles.cartButtonText}>
                        {addedId === item.id ? "เพิ่มแล้ว" : "เพิ่มลงตะกร้า"}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="favorite_border" size={42} color="#C7BEB4" />
            <Text style={styles.emptyTitle}>ยังไม่มีสินค้าที่ถูกใจ</Text>
            <Text style={styles.emptyText}>
              กดไอคอนหัวใจที่การ์ดสินค้า เพื่อเก็บไว้ดูทีหลังได้ที่นี่
            </Text>
          </View>
        }
      />

      <ConfirmDialog
        visible={clearDialogVisible}
        title="ล้างรายการที่ถูกใจ"
        message="ต้องการลบสินค้าที่ถูกใจทั้งหมดออกจากรายการใช่หรือไม่?"
        confirmText="ล้างทั้งหมด"
        cancelText="ยกเลิก"
        destructive
        onConfirm={() => {
          clearWishlist();
          setClearDialogVisible(false);
        }}
        onCancel={() => setClearDialogVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    flexGrow: 1,
    backgroundColor: "#F0E9DC",
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  headerTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#3D2619",
  },

  countBadge: {
    backgroundColor: "#F0DCC9",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },

  countBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8A5A34",
  },

  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },

  clearButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#C53030",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8DFD8",
    marginBottom: 16,
    overflow: "hidden",
  },

  imageWrap: {
    position: "relative",
    width: "100%",
    height: 170,
    backgroundColor: "#F0EDE9",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  statusPill: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "#3D2619",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  statusPillText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  heartButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },

  heartIcon: {
    fontSize: 15,
    color: "#C0392B",
  },

  cardBody: {
    padding: 14,
    paddingBottom: 10,
  },

  category: {
    fontSize: 11,
    color: "#8A7D75",
    marginBottom: 3,
    textTransform: "uppercase",
  },

  name: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#3D2619",
    marginBottom: 6,
  },

  price: {
    fontSize: 17,
    fontWeight: "800",
    color: "#3D2619",
    marginBottom: 6,
  },

  stockHint: {
    fontSize: 11.5,
    fontWeight: "700",
  },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 4,
    gap: 10,
  },

  removeLink: {
    paddingVertical: 6,
    flexShrink: 1,
  },

  removeLinkText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#8A7D75",
  },

  cartButton: {
    backgroundColor: "#3D2619",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },

  cartButtonDisabled: {
    opacity: 0.5,
  },

  cartButtonText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },

  emptyState: {
    alignItems: "center",
    paddingTop: 70,
    paddingHorizontal: 30,
  },

  emptyIcon: {
    fontSize: 36,
    color: "#D4C3BA",
    marginBottom: 10,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3D2619",
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 13,
    color: "#8A7D75",
    textAlign: "center",
  },
});
