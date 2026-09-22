import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { fetchCart, removeFromCart, updateCartItem } from "./api";
import ConfirmDialog from "./components/ConfirmDialog";
import Receipt, { ReceiptItem } from "./components/Receipt";
import { useCart } from "./context/CartContext";
import { useCoins } from "./context/CoinContext";
import OrderConfirmScreen from "./OrderConfirmScreen";

interface CartItem {
  cart_item_id: number;
  quantity: number;
  product_id: number;
  name: string;
  price: number;
  image_url: string;
  stock: number;
  category: string;
}

interface Props {
  onBack: () => void;
  onViewOrders?: () => void;
}

// เปิดให้หน้าหลัก (ปุ่ม "← กลับ" บน top bar) เรียก goBack() ก่อนออกจากหน้านี้
// คืนค่า true = จัดการ "ย้อนกลับ" ภายในหน้านี้แล้ว (เช่น จากหน้ายืนยันคำสั่งซื้อ กลับไปตะกร้า)
// คืนค่า false = ให้หน้าหลักจัดการออกจากหน้านี้เอง
export interface CartScreenHandle {
  goBack: () => boolean;
}

const CartScreen = forwardRef<CartScreenHandle, Props>(function CartScreen(
  { onBack, onViewOrders },
  ref
) {
  const { refreshCart } = useCart();
  const { refreshCoins } = useCoins();

  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [removeTarget, setRemoveTarget] = useState<CartItem | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [successOrder, setSuccessOrder] = useState<{
    id: number;
    total_amount: number;
    item_count: number;
    coins_earned?: number;
    payment_method?: string;
    created_at: string;
    items: ReceiptItem[];
  } | null>(null);

  const loadCart = async () => {
    try {
      setError("");
      const data = await fetchCart();
      setItems(data);
    } catch (err: any) {
      console.error("Load cart error:", err);
      setError(err.message || "ไม่สามารถโหลดตะกร้าสินค้าได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  const changeQuantity = async (item: CartItem, nextQty: number) => {
    if (nextQty < 1) {
      setRemoveTarget(item);
      return;
    }

    if (nextQty > item.stock) {
      return;
    }

    setUpdatingId(item.product_id);

    // อัปเดตหน้าจอทันที (optimistic) แล้วค่อยยืนยันกับ backend
    setItems((prev) =>
      prev.map((i) =>
        i.product_id === item.product_id ? { ...i, quantity: nextQty } : i
      )
    );

    try {
      await updateCartItem(item.product_id, nextQty);
      refreshCart();
    } catch (err) {
      console.error("Update quantity error:", err);
      loadCart();
    } finally {
      setUpdatingId(null);
    }
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;

    const target = removeTarget;
    setRemoveTarget(null);
    setUpdatingId(target.product_id);

    try {
      await removeFromCart(target.product_id);
      setItems((prev) => prev.filter((i) => i.product_id !== target.product_id));
      refreshCart();
    } catch (err) {
      console.error("Remove item error:", err);
      loadCart();
    } finally {
      setUpdatingId(null);
    }
  };

  const total = items.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  // เรียกตอน OrderConfirmScreen เช็คเอาท์สำเร็จแล้ว (payment method เลือกไว้แล้วในนั้น)
  const handleConfirmed = (order: {
    id: number;
    total_amount: number;
    item_count: number;
    coins_earned?: number;
    payment_method?: string;
  }) => {
    // เก็บ snapshot รายการสินค้าในตะกร้าไว้ก่อน เพราะพอเช็คเอาท์สำเร็จ items จะถูกเคลียร์เป็น []
    // ใบเสร็จหลังสั่งซื้อสำเร็จจะได้มีรายการสินค้าให้แสดงครบ
    const itemsSnapshot: ReceiptItem[] = items.map((item) => ({
      product_name: item.name,
      price: item.price,
      quantity: item.quantity,
    }));

    setSuccessOrder({
      ...order,
      created_at: new Date().toISOString(),
      items: itemsSnapshot,
    });
    setShowConfirm(false);
    setItems([]);
    refreshCart();
    refreshCoins();
  };

  // เปิดให้หน้าหลักเรียก goBack() ก่อน: จากหน้ายืนยันคำสั่งซื้อ ให้กลับมาตะกร้าก่อน
  // ไม่ใช่ออกจากตะกร้าไปเลย ส่วนหน้าตะกร้าปกติ/หน้าสำเร็จ ให้หน้าหลักจัดการเอง
  useImperativeHandle(ref, () => ({
    goBack: () => {
      if (showConfirm) {
        setShowConfirm(false);
        return true;
      }

      return false;
    },
  }));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111111" />
      </View>
    );
  }

  if (successOrder) {
    return (
      <ScrollView
        style={styles.successScroll}
        contentContainerStyle={styles.successContent}
      >
        <View style={styles.successHeader}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successTitle}>สั่งซื้อสำเร็จ</Text>
        </View>

        <Receipt
          orderId={successOrder.id}
          createdAt={successOrder.created_at}
          items={successOrder.items}
          totalAmount={successOrder.total_amount}
          coinsEarned={successOrder.coins_earned}
          paymentMethod={successOrder.payment_method}
        />

        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.8}
          onPress={onBack}
        >
          <Text style={styles.primaryButtonText}>เลือกซื้อสินค้าต่อ</Text>
        </TouchableOpacity>

        {onViewOrders && (
          <TouchableOpacity activeOpacity={0.7} onPress={onViewOrders}>
            <Text style={styles.linkText}>ดูประวัติการสั่งซื้อ</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  }

  if (showConfirm) {
    return (
      <OrderConfirmScreen
        items={items.map((item) => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        }))}
        totalAmount={total}
        onBack={() => setShowConfirm(false)}
        onConfirmed={handleConfirmed}
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.cart_item_id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Image
              source={{ uri: item.image_url }}
              style={styles.image}
              resizeMode="cover"
            />

            <View style={styles.rowInfo}>
              <Text style={styles.name} numberOfLines={2}>
                {item.name}
              </Text>

              <Text style={styles.price}>
                ฿{Number(item.price).toLocaleString("th-TH")}
              </Text>

              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepButton}
                  activeOpacity={0.7}
                  disabled={updatingId === item.product_id}
                  onPress={() => changeQuantity(item, item.quantity - 1)}
                >
                  <Text style={styles.stepButtonText}>−</Text>
                </TouchableOpacity>

                <Text style={styles.stepValue}>{item.quantity}</Text>

                <TouchableOpacity
                  style={styles.stepButton}
                  activeOpacity={0.7}
                  disabled={
                    updatingId === item.product_id ||
                    item.quantity >= item.stock
                  }
                  onPress={() => changeQuantity(item, item.quantity + 1)}
                >
                  <Text style={styles.stepButtonText}>+</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.removeLink}
                  activeOpacity={0.7}
                  onPress={() => setRemoveTarget(item)}
                >
                  <Text style={styles.removeLinkText}>ลบ</Text>
                </TouchableOpacity>
              </View>

              {item.quantity >= item.stock && (
                <Text style={styles.stockWarning}>
                  มีสินค้าเหลือสูงสุด {item.stock} ชิ้น
                </Text>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>ตะกร้าว่างเปล่า</Text>
            <Text style={styles.emptyText}>
              ยังไม่มีสินค้าในตะกร้า ลองเลือกซื้อสินค้าดูก่อนนะ
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.8}
              onPress={onBack}
            >
              <Text style={styles.primaryButtonText}>ไปเลือกซื้อสินค้า</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {items.length > 0 && (
        <View style={styles.summaryBar}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>ยอดรวม</Text>
            <Text style={styles.summaryTotal}>
              ฿{total.toLocaleString("th-TH")}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.checkoutButton}
            activeOpacity={0.8}
            onPress={() => setShowConfirm(true)}
          >
            <Text style={styles.checkoutButtonText}>ดำเนินการสั่งซื้อ</Text>
          </TouchableOpacity>
        </View>
      )}

      <ConfirmDialog
        visible={!!removeTarget}
        title="ลบสินค้าออกจากตะกร้า"
        message={
          removeTarget ? `ต้องการลบ "${removeTarget.name}" ออกจากตะกร้าใช่หรือไม่?` : ""
        }
        confirmText="ลบ"
        cancelText="ยกเลิก"
        destructive
        onCancel={() => setRemoveTarget(null)}
        onConfirm={confirmRemove}
      />
    </View>
  );
});

export default CartScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#FAFAFA",
  },

  list: {
    padding: 16,
    paddingBottom: 140,
  },

  row: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EDEDED",
    padding: 12,
    marginBottom: 10,
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
    marginBottom: 8,
  },

  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  stepButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D8D8D8",
    alignItems: "center",
    justifyContent: "center",
  },

  stepButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111111",
  },

  stepValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111111",
    minWidth: 18,
    textAlign: "center",
  },

  removeLink: {
    marginLeft: "auto",
  },

  removeLinkText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#B3413E",
  },

  stockWarning: {
    fontSize: 11,
    color: "#B3413E",
    marginTop: 6,
  },

  emptyState: {
    alignItems: "center",
    paddingTop: 60,
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
    marginBottom: 20,
    paddingHorizontal: 30,
  },

  summaryBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EDEDED",
    padding: 16,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  summaryLabel: {
    fontSize: 14,
    color: "#6B6B6B",
  },

  summaryTotal: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111111",
  },

  checkoutButton: {
    backgroundColor: "#111111",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  checkoutButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  successIcon: {
    fontSize: 40,
    color: "#111111",
    marginBottom: 12,
  },

  successScroll: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },

  successContent: {
    padding: 20,
    paddingBottom: 40,
  },

  successHeader: {
    alignItems: "center",
    marginBottom: 20,
  },

  successTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 6,
  },

  successText: {
    fontSize: 13,
    color: "#6B6B6B",
    marginBottom: 4,
  },

  successTotal: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 24,
  },

  coinsEarnedBadge: {
    backgroundColor: "#FFF6E0",
    borderWidth: 1,
    borderColor: "#F0DFAE",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 24,
    marginTop: -12,
  },

  coinsEarnedText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8A6A00",
  },

  primaryButton: {
    backgroundColor: "#111111",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 12,
    alignItems: "center",
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  linkText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111111",
    textDecorationLine: "underline",
    textAlign: "center",
  },
});
