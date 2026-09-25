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
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Mirrorless Camera");
  const [description, setDescription] = useState("");
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
  price: Number(price) || 0,
  category,
  description: description.trim(),
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

      {/* Price */}
      <Text style={styles.label}>
        Price (บาท)
      </Text>

      <TextInput
        style={styles.input}
        placeholder="เช่น 990"
        keyboardType="numeric"
        value={price}
        onChangeText={setPrice}
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

      {/* Description */}
      <Text style={styles.label}>
        รายละเอียดสินค้า (Description)
      </Text>

      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="อธิบายจุดเด่นของสินค้า เช่น สเปค การใช้งาน จุดขาย..."
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={5}
        textAlignVertical="top"
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
        style={[styles.button, loading && styles.buttonDisabled]}
        activeOpacity={0.8}
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
    backgroundColor: "#FDFBF7",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  title: {
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: -0.3,
    color: "#2B2118",
    marginBottom: 22,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#50453E",
    marginBottom: 6,
    marginTop: 14,
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8DFD8",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#2B2118",
  },

  textArea: {
    minHeight: 110,
    paddingTop: 12,
  },

  button: {
    backgroundColor: "#3D2619",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 28,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },

});
