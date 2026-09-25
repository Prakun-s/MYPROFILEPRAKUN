import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = "ยืนยัน",
  cancelText = "ยกเลิก",
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>

          <Text style={styles.title}>
            {title}
          </Text>

          <Text style={styles.message}>
            {message}
          </Text>

          <View style={styles.buttonRow}>

            <TouchableOpacity
              style={styles.cancelButton}
              activeOpacity={0.7}
              onPress={onCancel}
            >
              <Text style={styles.cancelText}>
                {cancelText}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                destructive && styles.confirmButtonDestructive,
              ]}
              activeOpacity={0.8}
              onPress={onConfirm}
            >
              <Text style={styles.confirmText}>
                {confirmText}
              </Text>
            </TouchableOpacity>

          </View>

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

  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
  },

  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2B2118",
    marginBottom: 8,
  },

  message: {
    fontSize: 14,
    color: "#50453E",
    lineHeight: 20,
    marginBottom: 20,
  },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },

  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F1F0EC",
  },

  cancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4A3B32",
  },

  confirmButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#3D2619",
  },

  confirmButtonDestructive: {
    backgroundColor: "#D2585F",
  },

  confirmText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
