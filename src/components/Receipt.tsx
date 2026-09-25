import { StyleSheet, Text, View } from "react-native";

import Icon from "./Icon";

export interface ReceiptItem {
  product_name: string;
  price: number;
  quantity: number;
}

export type PaymentMethod = "cod" | "bank_transfer" | "promptpay" | "credit_card";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cod: "เก็บเงินปลายทาง (COD)",
  bank_transfer: "โอนเงินผ่านธนาคาร",
  promptpay: "พร้อมเพย์",
  credit_card: "บัตรเครดิต/เดบิต",
};

const VAT_RATE = 0.07;

interface Props {
  orderId: number;
  createdAt?: string;
  items: ReceiptItem[];
  totalAmount: number;
  coinsEarned?: number;
  paymentMethod?: string;
  discountCode?: string | null;
  discountAmount?: number;
}

// ใบเสร็จ/บิลสำหรับแสดงหลังสั่งซื้อสำเร็จ หรือดูย้อนหลังจากประวัติการสั่งซื้อ
// ราคาสินค้าที่ลูกค้าเห็น (totalAmount) ถือเป็นราคารวม VAT แล้วตามกฎหมาย (และเป็นยอดหลังหักส่วนลดแล้ว)
// จึงแยกยอดก่อนภาษี/VAT ให้ดูเฉยๆ โดยไม่ได้บวกเพิ่มจากยอดที่เรียกเก็บจริง
export default function Receipt({
  orderId,
  createdAt,
  items,
  totalAmount,
  coinsEarned,
  paymentMethod,
  discountCode,
  discountAmount,
}: Props) {
  const hasDiscount = !!discountCode && Number(discountAmount) > 0;
  const subtotalBeforeDiscount = Number(totalAmount) + Number(discountAmount || 0);
  const amountExVat = Number(totalAmount) / (1 + VAT_RATE);
  const vatAmount = Number(totalAmount) - amountExVat;

  const paymentLabel =
    paymentMethod && paymentMethod in PAYMENT_METHOD_LABELS
      ? PAYMENT_METHOD_LABELS[paymentMethod as PaymentMethod]
      : null;

  return (
    <View style={styles.card}>
      <Text style={styles.shopName}>PRAKUN SHOP</Text>
      <Text style={styles.receiptLabel}>ใบเสร็จรับเงิน / ใบกำกับภาษีอย่างย่อ</Text>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>คำสั่งซื้อ #{orderId}</Text>

        {createdAt ? (
          <Text style={styles.metaText}>
            {new Date(createdAt).toLocaleDateString("th-TH", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        ) : null}
      </View>

      {paymentLabel ? (
        <Text style={styles.paymentMeta}>ชำระโดย: {paymentLabel}</Text>
      ) : null}

      <View style={styles.dashedDivider} />

      {items.map((item, index) => {
        const lineTotal = Number(item.price) * item.quantity;

        return (
          <View key={index} style={styles.itemRow}>
            <View style={styles.itemLeft}>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.product_name}
              </Text>
              <Text style={styles.itemQty}>
                {item.quantity} × ฿{Number(item.price).toLocaleString("th-TH")}
              </Text>
            </View>

            <Text style={styles.itemTotal}>
              ฿{lineTotal.toLocaleString("th-TH")}
            </Text>
          </View>
        );
      })}

      <View style={styles.dashedDivider} />

      {hasDiscount && (
        <>
          <View style={styles.vatRow}>
            <Text style={styles.vatLabel}>ราคาสินค้ารวม</Text>
            <Text style={styles.vatValue}>
              ฿{subtotalBeforeDiscount.toLocaleString("th-TH")}
            </Text>
          </View>

          <View style={styles.vatRow}>
            <Text style={styles.vatLabel}>ส่วนลด ({discountCode})</Text>
            <Text style={styles.discountText}>
              -฿{Number(discountAmount).toLocaleString("th-TH")}
            </Text>
          </View>
        </>
      )}

      <View style={styles.vatRow}>
        <Text style={styles.vatLabel}>ราคาสินค้า (ก่อน VAT)</Text>
        <Text style={styles.vatValue}>
          ฿{amountExVat.toLocaleString("th-TH", { maximumFractionDigits: 2 })}
        </Text>
      </View>

      <View style={styles.vatRow}>
        <Text style={styles.vatLabel}>ภาษีมูลค่าเพิ่ม (VAT 7%)</Text>
        <Text style={styles.vatValue}>
          ฿{vatAmount.toLocaleString("th-TH", { maximumFractionDigits: 2 })}
        </Text>
      </View>

      <View style={styles.dashedDivider} />

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>ยอดชำระทั้งสิ้น</Text>
        <Text style={styles.totalValue}>
          ฿{Number(totalAmount).toLocaleString("th-TH")}
        </Text>
      </View>

      {!!coinsEarned && coinsEarned > 0 && (
        <View style={[styles.coinsRow, styles.coinsRowInline]}>
          <Icon name="monetization_on" size={14} color="#8A6A00" />
          <Text style={styles.coinsText}>
            ได้รับเหรียญสะสม +{coinsEarned} เหรียญ
          </Text>
        </View>
      )}

      <Text style={styles.footer}>ขอบคุณที่อุดหนุนค่ะ/ครับ</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8DFD8",
    padding: 20,
  },

  shopName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#3D2619",
    textAlign: "center",
    letterSpacing: 0.5,
  },

  receiptLabel: {
    fontSize: 12,
    color: "#8A7D75",
    textAlign: "center",
    marginTop: 2,
    marginBottom: 14,
  },

  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  metaText: {
    fontSize: 12,
    color: "#4A3B32",
    fontWeight: "600",
  },

  paymentMeta: {
    fontSize: 12,
    color: "#8A7D75",
    marginBottom: 4,
  },

  dashedDivider: {
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: "#D4C3BA",
    marginVertical: 12,
  },

  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },

  itemLeft: {
    flex: 1,
    paddingRight: 10,
  },

  itemName: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#3D2619",
    marginBottom: 2,
  },

  itemQty: {
    fontSize: 12,
    color: "#8A7D75",
  },

  itemTotal: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#3D2619",
  },

  vatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  vatLabel: {
    fontSize: 12.5,
    color: "#50453E",
  },

  vatValue: {
    fontSize: 12.5,
    color: "#50453E",
  },

  discountText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#2D6A4F",
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  totalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#3D2619",
  },

  totalValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#3D2619",
  },

  coinsRow: {
    marginTop: 14,
    backgroundColor: "#FFF6E0",
    borderWidth: 1,
    borderColor: "#F0DFAE",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
  },

  coinsRowInline: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },

  coinsText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#8A6A00",
  },

  footer: {
    fontSize: 11,
    color: "#8A7D75",
    textAlign: "center",
    marginTop: 16,
  },
});
