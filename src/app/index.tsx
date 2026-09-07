import { useState } from "react";

import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import AddProductScreen from "../AddProductScreen";
import ProductListScreen from "../ProductListScreen";

export default function HomeScreen() {
  const [screen, setScreen] = useState<"products" | "add">("products");

  if (screen === "add") {
    return (
      <View style={styles.container}>

        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              console.log("BACK CLICKED");
              setScreen("products");
            }}
          >
            <Text style={styles.backText}>
              ← Products
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <AddProductScreen
            onSuccess={() => setScreen("products")}
          />
        </View>

      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.topBar}>

        <Text style={styles.headerTitle}>
          Inventory
        </Text>

        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.5}
          onPress={() => {
            console.log("ADD PRODUCT CLICKED");
            setScreen("add");
          }}
        >
          <Text style={styles.addButtonText}>
            + Add Product
          </Text>
        </TouchableOpacity>

      </View>

      {/* PRODUCT LIST */}
      <View style={styles.content}>
        <ProductListScreen />
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },

  topBar: {
    height: 70,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,

    // สำคัญ
    zIndex: 100,
    elevation: 100,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000000",
  },

  addButton: {
    backgroundColor: "#7c3aed",
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 8,

    // สำคัญ
    zIndex: 101,
    elevation: 101,
  },

  addButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "bold",
  },

  backButton: {
    paddingHorizontal: 10,
    paddingVertical: 10,

    zIndex: 101,
    elevation: 101,
  },

  backText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000000",
  },

  content: {
    flex: 1,
    zIndex: 0,
  },
});