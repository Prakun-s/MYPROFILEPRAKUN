import { useState } from "react";

import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import { addToCart } from "./api";
import ProductReviews from "./components/ProductReviews";
import { useCart } from "./context/CartContext";
import { useWishlist } from "./context/WishlistContext";

interface Product {
  id: number;
  name: string;
  stock: number;
  price: number;
  stock_text?: string;
  category: string;
  location_count?: number;
  location_text?: string;
  badge_status: string;
  image_url: string;
  // ยังไม่มีคอลัมน์นี้ใน DB ตอนนี้ — เผื่อไว้ล่วงหน้า ถ้าเพิ่มคอลัมน์ description
  // ใน Inventory ทีหลัง หน้านี้จะเอามาโชว์ให้อัตโนมัติทันที
  description?: string;
}

interface Props {
  product: Product;
  onBack: () => void;
}

export default function ProductDetailScreen({ product, onBack }: Props) {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const { refreshCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();

  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");

  const wishlisted = isWishlisted(product.id);
  const outOfStock = product.stock < 1;

  // ยังไม่มีคอลัมน์ description จริงใน DB เลยปั้นคำอธิบายจากข้อมูลที่มีอยู่แทน
  const description =
    product.description && product.description.trim().length > 0
      ? product.description
      : `${product.name} เป็น${product.category}คุณภาพดี พร้อมจัดส่งจาก${
          product.location_text ? ` "${product.location_text}"` : "คลังสินค้า"
        } ขณะนี้มีสินค้าพร้อมส่ง ${product.stock} ชิ้น เหมาะสำหรับผู้ที่กำลังมองหา${
          product.category
        }คุ้มราคา ใช้งานได้จริงทั้งงานอดิเรกและงานมืออาชีพ`;

  const specs = [
    { label: "หมวดหมู่", value: product.category || "-" },
    { label: "ราคา", value: `฿${Number(product.price).toLocaleString("th-TH")}` },
    { label: "สต๊อกคงเหลือ", value: product.stock_text || `${product.stock} ชิ้น` },
    { label: "สถานะ", value: product.badge_status || "-" },
    { label: "ตำแหน่งจัดเก็บ", value: product.location_text || "-" },
  ];

  const handleAddToCart = async () => {
    setError("");
    setAdding(true);

    try {
      await addToCart(product.id, quantity);
      await refreshCart();

      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    } catch (err: any) {
      console.error("Add to cart error:", err);
      setError(err.message || "เพิ่มลงตะกร้าไม่สำเร็จ");
    } finally {
      setAdding(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <TouchableOpacity
        style={styles.backLink}
        activeOpacity={0.7}
        onPress={onBack}
      >
        <Text style={styles.backLinkText}>← กลับไปหน้าสินค้า</Text>
      </TouchableOpacity>

      <View style={[styles.layout, isWide && styles.layoutWide]}>
        <View style={[styles.imageWrap, isWide && styles.imageWrapWide]}>
          {product.image_url ? (
            <Image
              source={{ uri: product.image_url }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.image, { backgroundColor: "#EDEDED" }]} />
          )}

          <TouchableOpacity
            style={styles.wishlistButton}
            activeOpacity={0.7}
            onPress={() =>
              toggleWishlist({
                id: product.id,
                name: product.name,
                price: product.price,
                image_url: product.image_url,
                category: product.category,
                stock: product.stock,
                badge_status: product.badge_status,
              })
            }
          >
            <Text
              style={[
                styles.wishlistIcon,
                wishlisted && styles.wishlistIconActive,
              ]}
            >
              {wishlisted ? "♥" : "♡"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.info, isWide && styles.infoWide]}>
          <Text style={styles.category} numberOfLines={1}>
            {product.category}
          </Text>

          <Text style={styles.name}>{product.name}</Text>

          <Text style={styles.price}>
            ฿{Number(product.price).toLocaleString("th-TH")}
          </Text>
          <Text style={styles.vatNote}>
            ราคานี้รวม VAT 7% แล้ว (ราคาก่อน VAT ฿
            {(Number(product.price) / 1.07).toLocaleString("th-TH", {
              maximumFractionDigits: 2,
            })}
            )
          </Text>

          <View style={styles.badgeGroup}>
            <Text
              style={[
                styles.badge,
                product.stock < 5 ? styles.badgeStrong : styles.badgeOutline,
              ]}
            >
              {product.badge_status}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>รายละเอียดสินค้า</Text>
          <Text style={styles.description}>{description}</Text>

          <Text style={styles.sectionTitle}>สเปค</Text>
          <View style={styles.specTable}>
            {specs.map((spec, index) => (
              <View
                key={spec.label}
                style={[
                  styles.specRow,
                  index === specs.length - 1 && styles.specRowLast,
                ]}
              >
                <Text style={styles.specLabel}>{spec.label}</Text>
                <Text style={styles.specValue}>{spec.value}</Text>
              </View>
            ))}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actionsRow}>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={styles.stepButton}
                activeOpacity={0.7}
                disabled={quantity <= 1}
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <Text style={styles.stepButtonText}>−</Text>
              </TouchableOpacity>

              <Text style={styles.stepValue}>{quantity}</Text>

              <TouchableOpacity
                style={styles.stepButton}
                activeOpacity={0.7}
                disabled={quantity >= product.stock}
                onPress={() =>
                  setQuantity((q) => Math.min(product.stock, q + 1))
                }
              >
                <Text style={styles.stepButtonText}>+</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.cartButton,
                (outOfStock || adding) && styles.cartButtonDisabled,
              ]}
              activeOpacity={0.8}
              disabled={outOfStock || adding}
              onPress={handleAddToCart}
            >
              {adding ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.cartButtonText}>
                  {outOfStock
                    ? "สินค้าหมด"
                    : added
                    ? "✓ เพิ่มลงตะกร้าแล้ว"
                    : "หยิบใส่ตะกร้า"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ProductReviews productId={product.id} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },

  content: {
    padding: 20,
    paddingBottom: 60,
  },

  backLink: {
    marginBottom: 16,
    alignSelf: "flex-start",
  },

  backLinkText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111111",
  },

  layout: {
    flexDirection: "column",
    gap: 24,
  },

  layoutWide: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  imageWrap: {
    position: "relative",
  },

  imageWrapWide: {
    flex: 1,
    maxWidth: 560,
  },

  image: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 18,
    backgroundColor: "#F1F1F1",
  },

  wishlistButton: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },

  wishlistIcon: {
    fontSize: 22,
    color: "#111111",
  },

  wishlistIconActive: {
    color: "#D2585F",
  },

  info: {
    flex: 1,
  },

  infoWide: {
    paddingLeft: 8,
    maxWidth: 480,
  },

  category: {
    fontSize: 12,
    color: "#9A9A9A",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 6,
  },

  name: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111111",
    marginBottom: 10,
    letterSpacing: -0.3,
  },

  price: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 2,
  },

  vatNote: {
    fontSize: 12,
    color: "#8A8A8A",
    marginBottom: 12,
  },

  badgeGroup: {
    flexDirection: "row",
    marginBottom: 22,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "600",
    overflow: "hidden",
  },

  badgeOutline: {
    borderWidth: 1,
    borderColor: "#D8D8D8",
    color: "#4A4A4A",
    backgroundColor: "transparent",
  },

  badgeStrong: {
    backgroundColor: "#111111",
    color: "#FFFFFF",
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 8,
    marginTop: 6,
  },

  description: {
    fontSize: 14,
    color: "#5A5A5A",
    lineHeight: 22,
    marginBottom: 20,
  },

  specTable: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EDEDED",
    backgroundColor: "#FFFFFF",
    marginBottom: 24,
    overflow: "hidden",
  },

  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F1",
  },

  specRowLast: {
    borderBottomWidth: 0,
  },

  specLabel: {
    fontSize: 13,
    color: "#8A8A8A",
  },

  specValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111111",
  },

  error: {
    fontSize: 13,
    color: "#B3413E",
    marginBottom: 12,
  },

  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  stepButton: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  stepButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111111",
  },

  stepValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111111",
    minWidth: 20,
    textAlign: "center",
  },

  cartButton: {
    flex: 1,
    backgroundColor: "#111111",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },

  cartButtonDisabled: {
    opacity: 0.5,
  },

  cartButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
