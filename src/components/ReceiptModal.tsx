import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import Receipt, { ReceiptItem } from "./Receipt";

interface Props {
  visible: boolean;
  orderId: number;
  createdAt?: string;
  items: ReceiptItem[];
  totalAmount: number;
  coinsEarned?: number;
  paymentMethod?: string;
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
  onClose,
}: Props) {
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
            />
          </ScrollView>

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
    marginTop: 12,
    backgroundColor: "#111111",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },

  closeText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
