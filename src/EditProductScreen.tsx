import { useState } from "react";

import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity
} from "react-native";

import { updateProduct } from "./api";

interface Product {
  id: number;
  name: string;
  stock: number;
  price: number;
  stock_text: string;
  category: string;
  location_count: number;
  location_text: string;
  badge_status: string;
  image_url: string;
}

interface Props {
  product: Product;
  onSuccess: () => void;
}

export default function EditProductScreen({ product, onSuccess }: Props) {

  const [name, setName] = useState(product.name);
  const [stock, setStock] = useState(String(product.stock));
  const [price, setPrice] = useState(String(product.price ?? 0));
  const [category, setCategory] = useState(product.category);
  const [location, setLocation] = useState(product.location_text);
  const [imageUrl, setImageUrl] = useState(product.image_url);

  const [loading, setLoading] = useState(false);

  const handleUpdateProduct = async () => {

    if (!name.trim()) {
      Alert.alert("Error", "กรุณากรอกชื่อสินค้า");
      return;
    }

    try {
      setLoading(true);

      await updateProduct(product.id, {
        name: name.trim(),
        stock: Number(stock) || 0,
        price: Number(price) || 0,
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
        error.message || "ไม่สามารถแก้ไขสินค้าได้"
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
        Edit Product
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

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        activeOpacity={0.8}
        onPress={handleUpdateProduct}
        disabled={loading}
      >

        <Text style={styles.buttonText}>
          {loading ? "Saving..." : "Save Changes"}
        </Text>

      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#F7F6F3",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  title: {
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: -0.3,
    color: "#2B2B31",
    marginBottom: 22,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B6B74",
    marginBottom: 6,
    marginTop: 14,
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E3DC",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#2B2B31",
  },

  button: {
    backgroundColor: "#5B5FEF",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 28,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },

});
