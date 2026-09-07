import { useState } from "react";

import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity
} from "react-native";

import { addProduct } from "./api";

interface Props {
  onSuccess: () => void;
}

export default function AddProductScreen({ onSuccess }: Props) {

  const [name, setName] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("Mirrorless Camera");
  const [location, setLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [loading, setLoading] = useState(false);

  const handleAddProduct = async () => {

    if (!name.trim()) {
      Alert.alert("Error", "กรุณากรอกชื่อสินค้า");
      return;
    }

    try {
  setLoading(true);

  await addProduct({
  name: name.trim(),
  stock: Number(stock) || 0,
  category,
  location_text: location,
  image_url: imageUrl,
});

// กลับหน้า Inventory ทันที
onSuccess();

} catch (error: any) {

  console.error(error);

  Alert.alert(
    "Error",
    error.message || "ไม่สามารถเพิ่มสินค้าได้"
  );

} finally {
  setLoading(false);
}
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >

      <Text style={styles.title}>
        Add New Product
      </Text>

      {/* Product Name */}
      <Text style={styles.label}>
        Product Name
      </Text>

      <TextInput
        style={styles.input}
        placeholder="เช่น Canon EOS R50"
        value={name}
        onChangeText={setName}
      />

      {/* Stock */}
      <Text style={styles.label}>
        Stock
      </Text>

      <TextInput
        style={styles.input}
        placeholder="จำนวนสินค้า"
        keyboardType="numeric"
        value={stock}
        onChangeText={setStock}
      />

      {/* Category */}
      <Text style={styles.label}>
        Category
      </Text>

      <TextInput
        style={styles.input}
        placeholder="เช่น Mirrorless Camera"
        value={category}
        onChangeText={setCategory}
      />

      {/* Location */}
      <Text style={styles.label}>
        Location
      </Text>

      <TextInput
        style={styles.input}
        placeholder="เช่น Shelf A1"
        value={location}
        onChangeText={setLocation}
      />

      {/* Image URL */}
      <Text style={styles.label}>
        Image URL
      </Text>

      <TextInput
        style={styles.input}
        placeholder="https://..."
        value={imageUrl}
        onChangeText={setImageUrl}
        autoCapitalize="none"
      />

      {/* Add Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={handleAddProduct}
        disabled={loading}
      >

        <Text style={styles.buttonText}>
          {loading ? "Adding..." : "Add Product"}
        </Text>

      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },

  content: {
    padding: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 25,
  },

  label: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 7,
    marginTop: 12,
  },

  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dddddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },

  button: {
    backgroundColor: "#7c3aed",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 30,
  },

  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },

});