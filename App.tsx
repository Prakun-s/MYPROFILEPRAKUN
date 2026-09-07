import { useState } from "react";

import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import AddProductScreen from "./src/AddProductScreen";
import ProductListScreen from "./src/ProductListScreen";

export default function App() {
  const [screen, setScreen] = useState<"products" | "add">("products");

  return (
    <SafeAreaView style={styles.container}>

      {screen === "products" ? (
        <>
          {/* Header */}
          <View style={styles.topBar}>
            <Text style={styles.headerTitle}>
              Inventory
            </Text>

            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setScreen("add")}
            >
              <Text style={styles.addButtonText}>
                + Add Product
              </Text>
            </TouchableOpacity>
          </View>

          {/* Product List */}
          <View style={styles.content}>
            <ProductListScreen />
          </View>
        </>
      ) : (
        <>
          {/* Back */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => setScreen("products")}
            >
              <Text style={styles.backText}>
                ← Products
              </Text>
            </TouchableOpacity>
          </View>

          {/* Add Product */}
          <AddProductScreen
            onSuccess={() => setScreen("products")}
          />
        </>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },

  topBar: {
    height: 60,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
  },

  addButton: {
    backgroundColor: "#7c3aed",
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 8,
  },

  addButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
  },

  backText: {
    fontSize: 17,
    fontWeight: "600",
  },

  content: {
    flex: 1,
  },
});