import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { downloadReceiptPdf } from "../lib/receiptPdf";
import Icon from "./Icon";
import Receipt, { ReceiptItem } from "./Receipt";

interface Props {
  visible: boolean;
  orderId: number;
  createdAt?: string;
  items: ReceiptItem[];
  totalAmount: number;
  coinsEarned?: number;
  paymentMethod?: string;
  discountCode?: string | null;
  discountAmount?: number;
  onClose: () => void;
}

export default function ReceiptModal({
  visible,
  orderId,
  createdAt,
  items,
  totalAmount,
  coinsEarned,
  paymentMethod,
  discountCode,
  discountAmount,
  onClose,
}: Props) {
  const handleDownloadPdf = () => {
    downloadReceiptPdf({
      orderId,
      createdAt,
      items,
      totalAmount,
      coinsEarned,
      paymentMethod,
      discountCode,
      discountAmount,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Receipt
              orderId={orderId}
              createdAt={createdAt}
              items={items}
              totalAmount={totalAmount}
              coinsEarned={coinsEarned}
              paymentMethod={paymentMethod}
              discountCode={discountCode}
              discountAmount={discountAmount}
            />
          </ScrollView>

          {Platform.OS === "web" && (
            <TouchableOpacity
              style={styles.downloadButton}
              activeOpacity={0.8}
              onPress={handleDownloadPdf}
            >
              <Icon name="download" size={16} color="#3D2619" />
              <Text style={styles.downloadText}>ดาวน์โหลด PDF</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.closeButton}
            activeOpacity={0.8}
            onPress={onClose}
          >
            <Text style={styles.closeText}>ปิด</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(20, 20, 24, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  sheet: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "85%",
  },

  scrollContent: {
    paddingBottom: 4,
  },

  closeButton: {
    marginTop: 8,
    backgroundColor: "#3D2619",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },

  closeText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  downloadButton: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#3D2619",
    borderRadius: 10,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  downloadText: {
    color: "#3D2619",
    fontSize: 14,
    fontWeight: "700",
  },
});
