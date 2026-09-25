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
import Icon from "./components/Icon";
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

function getStatusMeta(stock: number): { label: string; icon: string; color: string } {
  if (stock < 1) return { label: "สินค้าหมด", icon: "close", color: "#C53030" };
  if (stock < 5) return { label: "เหลือน้อย รีบสั่งเลย", icon: "warning", color: "#D97706" };
  return { label: "พร้อมส่งด่วน", icon: "check_circle", color: "#2D6A4F" };
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
  const statusMeta = getStatusMeta(product.stock);

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
    { label: "สต๊อกคงเหลือ", value: product.stock_text || `${product.stock} ชิ้น` },
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
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <View style={[styles.layout, isWide && styles.layoutWide]}>
          <View style={[styles.imageWrap, isWide && styles.imageWrapWide]}>
            {product.image_url ? (
              <Image
                source={{ uri: product.image_url }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.image, { backgroundColor: "#E8DFD8" }]} />
            )}

            <TouchableOpacity
              style={styles.backOverlayButton}
              activeOpacity={0.7}
              onPress={onBack}
            >
              <Icon name="arrow_back" size={20} color="#3D2619" />
            </TouchableOpacity>

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
              <Icon
                name="favorite"
                filled={wishlisted}
                size={19}
                color={wishlisted ? "#D2585F" : "#3D2619"}
              />
            </TouchableOpacity>
          </View>

          <View style={[styles.info, isWide && styles.infoWide]}>
            <Text style={styles.category} numberOfLines={1}>
              {product.category}
            </Text>

            <Text style={styles.name}>{product.name}</Text>

            <View style={styles.priceRow}>
              <Text style={styles.price}>
                ฿{Number(product.price).toLocaleString("th-TH")}
              </Text>

              <View style={[styles.statusPill, { backgroundColor: statusMeta.color + "1A" }]}>
                <Icon name={statusMeta.icon} size={13} color={statusMeta.color} />
                <Text style={[styles.statusPillText, { color: statusMeta.color }]}>
                  {statusMeta.label}
                </Text>
              </View>
            </View>
            <Text style={styles.vatNote}>
              ราคานี้รวม VAT 7% แล้ว (ก่อน VAT ฿
              {(Number(product.price) / 1.07).toLocaleString("th-TH", {
                maximumFractionDigits: 2,
              })}
              )
            </Text>

            <Text style={styles.sectionTitle}>รายละเอียดสินค้า</Text>
            <Text style={styles.description}>{description}</Text>

            <Text style={styles.sectionTitle}>ข้อมูลสินค้า</Text>
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

            <Text style={styles.sectionTitle}>จำนวน</Text>
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

              <Text style={styles.stepperHint}>
                {outOfStock ? "สินค้าหมดชั่วคราว" : `มีสินค้า ${product.stock} ชิ้น`}
              </Text>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        </View>

        <ProductReviews productId={product.id} />
      </ScrollView>

      {/* แถบปุ่มลอยด้านล่าง: หัวใจ + หยิบใส่ตะกร้า (พร้อมราคา) */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.bottomWishlistButton}
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
          <Icon
            name="favorite"
            filled={wishlisted}
            size={20}
            color={wishlisted ? "#D2585F" : "#3D2619"}
          />
        </TouchableOpacity>

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
          ) : outOfStock ? (
            <Text style={styles.cartButtonText}>สินค้าหมด</Text>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Icon name={added ? "check" : "shopping_cart"} size={16} color="#FFFFFF" weight={700} />
              <Text style={styles.cartButtonText}>
                {added
                  ? "เพิ่มลงตะกร้าแล้ว"
                  : `เพิ่มลงตะกร้า · ฿${Number(product.price * quantity).toLocaleString("th-TH")}`}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F0E9DC",
  },

  container: {
    flex: 1,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
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
    backgroundColor: "#F0EDE9",
  },

  backOverlayButton: {
    position: "absolute",
    top: 14,
    left: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },

  backOverlayIcon: {
    fontSize: 18,
    fontWeight: "700",
    color: "#3D2619",
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
    color: "#3D2619",
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
    color: "#8A7D75",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 6,
  },

  name: {
    fontSize: 26,
    fontWeight: "800",
    color: "#3D2619",
    marginBottom: 10,
    letterSpacing: -0.3,
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },

  price: {
    fontSize: 24,
    fontWeight: "700",
    color: "#3D2619",
  },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },

  statusPillText: {
    fontSize: 11.5,
    fontWeight: "700",
  },

  vatNote: {
    fontSize: 12,
    color: "#8A7D75",
    marginTop: 6,
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#3D2619",
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
    borderColor: "#E8DFD8",
    backgroundColor: "#FFFFFF",
    marginBottom: 22,
    overflow: "hidden",
  },

  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EDE9",
  },

  specRowLast: {
    borderBottomWidth: 0,
  },

  specLabel: {
    fontSize: 13,
    color: "#8A7D75",
  },

  specValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3D2619",
  },

  error: {
    fontSize: 13,
    color: "#C53030",
    marginTop: 4,
  },

  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#E8DFD8",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignSelf: "flex-start",
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
    color: "#3D2619",
  },

  stepValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#3D2619",
    minWidth: 20,
    textAlign: "center",
  },

  stepperHint: {
    fontSize: 11.5,
    color: "#8A7D75",
    marginLeft: 6,
  },

  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E8DFD8",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  bottomWishlistButton: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#3D2619",
    alignItems: "center",
    justifyContent: "center",
  },

  bottomWishlistIcon: {
    fontSize: 20,
    color: "#3D2619",
  },

  cartButton: {
    flex: 1,
    backgroundColor: "#3D2619",
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
