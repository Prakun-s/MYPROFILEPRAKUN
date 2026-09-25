import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { DiscountCode, checkout, fetchMyDiscountCodes, validateDiscountCode } from "./api";
import Icon from "./components/Icon";
import { PaymentMethod, PAYMENT_METHOD_LABELS } from "./components/Receipt";

interface ConfirmItem {
  name: string;
  price: number;
  quantity: number;
}

interface Props {
  items: ConfirmItem[];
  totalAmount: number;
  onBack: () => void;
  onConfirmed: (order: {
    id: number;
    total_amount: number;
    subtotal_amount?: number;
    discount_code?: string | null;
    discount_amount?: number;
    item_count: number;
    coins_earned?: number;
    payment_method?: string;
  }) => void;
}

const VAT_RATE = 0.07;

const PAYMENT_OPTIONS: { value: PaymentMethod; icon: string; subtitle: string; badge?: string }[] = [
  {
    value: "promptpay",
    icon: "qr_code_2",
    subtitle: "สแกนจ่ายสะดวกรวดเร็ว ไม่มีค่าธรรมเนียม",
    badge: "แนะนำ",
  },
  { value: "credit_card", icon: "credit_card", subtitle: "Visa, Mastercard, JCB" },
  { value: "bank_transfer", icon: "account_balance", subtitle: "โอนผ่านแอปธนาคารของคุณ" },
  { value: "cod", icon: "payments", subtitle: "ชำระเงินสดกับเจ้าหน้าที่จัดส่งสินค้า" },
];

// หน้ายืนยันคำสั่งซื้อ: สรุปรายการ, ใส่โค้ดส่วนลด, แยกยอด VAT 7%, เลือกวิธีชำระเงิน แล้วค่อยยิง checkout จริง
export default function OrderConfirmScreen({
  items,
  totalAmount,
  onBack,
  onConfirmed,
}: Props) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [discountInput, setDiscountInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    label: string;
    discount_amount: number;
  } | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);
  const [discountError, setDiscountError] = useState("");

  const [myCodes, setMyCodes] = useState<DiscountCode[]>([]);
  const [myCodesLoading, setMyCodesLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchMyDiscountCodes();
        setMyCodes(data);
      } catch (err) {
        console.error("Load my discount codes error:", err);
      } finally {
        setMyCodesLoading(false);
      }
    })();
  }, []);

  const usableCodes = myCodes.filter((c) => {
    if (c.used_at) return false;
    if (c.end_date && new Date(c.end_date) < new Date()) return false;
    if (Number(c.min_order_amount) > totalAmount) return false;
    return true;
  });

  const grandTotal = Math.max(0, totalAmount - (appliedDiscount?.discount_amount || 0));
  const amountExVat = grandTotal / (1 + VAT_RATE);
  const vatAmount = grandTotal - amountExVat;

  const handleApplyDiscount = async (codeOverride?: string) => {
    const codeToApply = (codeOverride ?? discountInput).trim();
    if (!codeToApply) return;

    setDiscountError("");
    setCheckingCode(true);

    try {
      const result = await validateDiscountCode(codeToApply, totalAmount);
      setAppliedDiscount(result);
      setDiscountInput(codeToApply);
    } catch (err: any) {
      console.error("Validate discount code error:", err);
      setAppliedDiscount(null);
      setDiscountError(err.message || "โค้ดส่วนลดไม่ถูกต้อง");
    } finally {
      setCheckingCode(false);
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountInput("");
    setDiscountError("");
  };

  const handleConfirm = async () => {
    setError("");
    setSubmitting(true);

    try {
      const result = await checkout(paymentMethod, appliedDiscount?.code);
      onConfirmed(result.order);
    } catch (err: any) {
      console.error("Checkout error:", err);
      setError(err.message || "สั่งซื้อไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>ยืนยันคำสั่งซื้อ</Text>

      {/* สรุปรายการสินค้า */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>สรุปรายการสินค้า</Text>

        {items.map((item, index) => (
          <View key={index} style={styles.itemRow}>
            <Text style={styles.itemName} numberOfLines={2}>
              {item.name} × {item.quantity}
            </Text>
            <Text style={styles.itemTotal}>
              ฿{(item.price * item.quantity).toLocaleString("th-TH")}
            </Text>
          </View>
        ))}
      </View>

      {/* โค้ดส่วนลด */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>โค้ดส่วนลด</Text>

        {appliedDiscount ? (
          <View style={styles.appliedDiscountRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.appliedDiscountCode}>{appliedDiscount.code}</Text>
              <Text style={styles.appliedDiscountLabel}>{appliedDiscount.label}</Text>
            </View>

            <Text style={styles.appliedDiscountAmount}>
              -฿{appliedDiscount.discount_amount.toLocaleString("th-TH")}
            </Text>

            <TouchableOpacity
              style={styles.removeDiscountButton}
              activeOpacity={0.7}
              onPress={handleRemoveDiscount}
            >
              <Text style={styles.removeDiscountText}>ลบ</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <View style={styles.discountInputRow}>
              <TextInput
                style={styles.discountInput}
                placeholder="กรอกโค้ดส่วนลด"
                value={discountInput}
                onChangeText={setDiscountInput}
                autoCapitalize="characters"
              />

              <TouchableOpacity
                style={styles.applyButton}
                activeOpacity={0.7}
                disabled={checkingCode || !discountInput.trim()}
                onPress={() => handleApplyDiscount()}
              >
                {checkingCode ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.applyButtonText}>ใช้โค้ด</Text>
                )}
              </TouchableOpacity>
            </View>

            {!myCodesLoading && usableCodes.length > 0 && (
              <View style={styles.savedCodesSection}>
                <Text style={styles.savedCodesLabel}>โค้ดที่เก็บไว้</Text>

                <View style={styles.savedCodesGrid}>
                  {usableCodes.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={styles.savedCodeChip}
                      activeOpacity={0.7}
                      disabled={checkingCode}
                      onPress={() => handleApplyDiscount(c.code)}
                    >
                      <Text style={styles.savedCodeChipCode}>{c.code}</Text>
                      <Text style={styles.savedCodeChipValue}>
                        {c.discount_type === "percent"
                          ? `-${c.discount_value}%`
                          : `-฿${Number(c.discount_value).toLocaleString("th-TH")}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {discountError ? <Text style={styles.discountErrorText}>{discountError}</Text> : null}
      </View>

      {/* สรุปยอดเงิน + VAT */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>สรุปยอดชำระ</Text>

        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>ราคาสินค้ารวม</Text>
          <Text style={styles.priceValue}>
            ฿{totalAmount.toLocaleString("th-TH")}
          </Text>
        </View>

        {appliedDiscount && (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>ส่วนลด ({appliedDiscount.code})</Text>
            <Text style={styles.discountValueText}>
              -฿{appliedDiscount.discount_amount.toLocaleString("th-TH")}
            </Text>
          </View>
        )}

        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>ราคาสินค้า (ก่อน VAT)</Text>
          <Text style={styles.priceValue}>
            ฿{amountExVat.toLocaleString("th-TH", { maximumFractionDigits: 2 })}
          </Text>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>ภาษีมูลค่าเพิ่ม (VAT 7%)</Text>
          <Text style={styles.priceValue}>
            ฿{vatAmount.toLocaleString("th-TH", { maximumFractionDigits: 2 })}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.priceRow}>
          <Text style={styles.grandTotalLabel}>ยอดชำระทั้งสิ้น</Text>
          <Text style={styles.grandTotalValue}>
            ฿{grandTotal.toLocaleString("th-TH")}
          </Text>
        </View>
      </View>

      {/* เลือกวิธีชำระเงิน */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>ช่องทางการชำระเงิน</Text>

        {PAYMENT_OPTIONS.map((option) => {
          const selected = paymentMethod === option.value;

          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.paymentOption, selected && styles.paymentOptionSelected]}
              activeOpacity={0.7}
              onPress={() => setPaymentMethod(option.value)}
            >
              <View style={styles.paymentIconCircle}>
                <Icon name={option.icon} size={19} color="#3D2619" />
              </View>

              <View style={{ flex: 1 }}>
                <View style={styles.paymentLabelRow}>
                  <Text
                    style={[
                      styles.paymentLabel,
                      selected && styles.paymentLabelSelected,
                    ]}
                  >
                    {PAYMENT_METHOD_LABELS[option.value]}
                  </Text>

                  {option.badge && (
                    <View style={styles.paymentBadge}>
                      <Text style={styles.paymentBadgeText}>{option.badge}</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.paymentSubtitle}>{option.subtitle}</Text>
              </View>

              <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                {selected && <Icon name="check" size={12} color="#FFFFFF" weight={700} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.disclaimer}>
        นี่เป็นการจำลองการสั่งซื้อ ไม่มีการเชื่อมต่อระบบชำระเงินจริง
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={styles.backLink}
        activeOpacity={0.7}
        onPress={onBack}
        disabled={submitting}
      >
        <Text style={styles.backLinkText}>‹ กลับไปที่ตะกร้า</Text>
      </TouchableOpacity>
      </ScrollView>

      {/* แถบสรุปยอด + ปุ่มยืนยันลอยด้านล่าง */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomBarLabel}>ยอดชำระสุทธิ</Text>
          <Text style={styles.bottomBarValue}>฿{grandTotal.toLocaleString("th-TH")}</Text>
        </View>

        <TouchableOpacity
          style={[styles.confirmButton, submitting && styles.confirmButtonDisabled]}
          activeOpacity={0.8}
          disabled={submitting}
          onPress={handleConfirm}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={styles.confirmButtonText}>ยืนยันคำสั่งซื้อ</Text>
              <Icon name="arrow_forward" size={16} color="#FFFFFF" weight={700} />
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
    padding: 16,
    paddingBottom: 24,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#3D2619",
    marginBottom: 16,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8DFD8",
    padding: 16,
    marginBottom: 14,
  },

  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#3D2619",
    marginBottom: 12,
  },

  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  itemName: {
    fontSize: 13,
    color: "#4A3B32",
    flex: 1,
    paddingRight: 8,
  },

  itemTotal: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3D2619",
  },

  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  priceLabel: {
    fontSize: 13,
    color: "#50453E",
  },

  priceValue: {
    fontSize: 13,
    color: "#50453E",
  },

  discountValueText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2D6A4F",
  },

  discountInputRow: {
    flexDirection: "row",
    gap: 8,
  },

  discountInput: {
    flex: 1,
    backgroundColor: "#F0E9DC",
    borderWidth: 1,
    borderColor: "#E8DFD8",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: "#2B2118",
  },

  applyButton: {
    backgroundColor: "#3D2619",
    borderRadius: 10,
    paddingHorizontal: 18,
    justifyContent: "center",
    alignItems: "center",
  },

  applyButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  discountErrorText: {
    fontSize: 12,
    color: "#C53030",
    marginTop: 8,
  },

  savedCodesSection: {
    marginTop: 14,
  },

  savedCodesLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#8A7D75",
    marginBottom: 8,
  },

  savedCodesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  savedCodeChip: {
    borderWidth: 1,
    borderColor: "#E8DFD8",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F0E9DC",
  },

  savedCodeChipCode: {
    fontSize: 12,
    fontWeight: "800",
    color: "#3D2619",
  },

  savedCodeChipValue: {
    fontSize: 11,
    color: "#2D6A4F",
    fontWeight: "700",
    marginTop: 1,
  },

  appliedDiscountRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F3E7",
    borderRadius: 10,
    padding: 12,
  },

  appliedDiscountCode: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#3D2619",
  },

  appliedDiscountLabel: {
    fontSize: 11.5,
    color: "#4A3B32",
    marginTop: 1,
  },

  appliedDiscountAmount: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2D6A4F",
    marginRight: 12,
  },

  removeDiscountButton: {
    paddingHorizontal: 4,
  },

  removeDiscountText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#C53030",
  },

  divider: {
    height: 1,
    backgroundColor: "#E8DFD8",
    marginVertical: 8,
  },

  grandTotalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#3D2619",
  },

  grandTotalValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#3D2619",
  },

  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8DFD8",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },

  paymentOptionSelected: {
    borderColor: "#3D2619",
    backgroundColor: "#F6F3EE",
  },

  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#D4C3BA",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  radioOuterSelected: {
    backgroundColor: "#3D2619",
    borderColor: "#3D2619",
  },

  radioCheck: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  paymentIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F0EDE9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  paymentIcon: {
    fontSize: 17,
  },

  paymentLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  paymentLabel: {
    fontSize: 13.5,
    color: "#4A3B32",
    fontWeight: "600",
  },

  paymentLabelSelected: {
    color: "#3D2619",
  },

  paymentBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
  },

  paymentBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#D97706",
  },

  paymentSubtitle: {
    fontSize: 11.5,
    color: "#8A7D75",
    marginTop: 2,
  },

  disclaimer: {
    fontSize: 11.5,
    color: "#8A7D75",
    textAlign: "center",
    marginBottom: 16,
  },

  error: {
    fontSize: 13,
    color: "#C53030",
    textAlign: "center",
    marginBottom: 12,
  },

  confirmButton: {
    backgroundColor: "#3D2619",
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  confirmButtonDisabled: {
    opacity: 0.6,
  },

  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E8DFD8",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  bottomBarLabel: {
    fontSize: 11.5,
    color: "#8A7D75",
  },

  bottomBarValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#3D2619",
  },

  backLink: {
    alignItems: "center",
    paddingVertical: 8,
  },

  backLinkText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4A3B32",
  },
});
