
import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  FlatList,

  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

 

// 1. Define the TypeScript interface based on our JSON structure

// Note: Ensure these properties exactly match the keys inside your sn_product.json file!

interface Product {

  id: string;

  name: string;

  stock: number;

  stock_text: string;

  category: string;

  location_count: number;

  location_text: string;

  badge_status: string;

  image_url: string;

}

 

export default function ProductListScreen() {

  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState<boolean>(true);

  const [error, setError] = useState<string | null>(null);

 

  // 2. Using your specific GitHub Raw URL

const GITHUB_JSON_URL =
  "https://raw.githubusercontent.com/Prakun-s/Product01/main/sn_produc01t.json";

useEffect(() => {

    fetchProducts();

  }, []);

 

  const fetchProducts = async () => {

    try {

      const response = await fetch(GITHUB_JSON_URL);

      if (!response.ok) {

        throw new Error('Failed to fetch data');

      }

      const data = await response.json();

      setProducts(data);

      setLoading(false);

    } catch (err) {

      setError((err as Error).message);

      setLoading(false);

    }

  };
 

  // 3. Render individual product cards

  const renderItem = ({ item }: { item: Product }) => {

    const isLowStock = item.badge_status === 'Low in stock';

    

    return (

      <View style={styles.cardContainer}>

        <View style={styles.imageContainer}>

          <Image

            source={{ uri: item.image_url }}

            style={styles.productImage}

            resizeMode="cover"

          />

          <Text style={styles.productTitle}>{item.name}</Text>

        </View>

 

        <View style={styles.detailsContainer}>

          <Text style={styles.detailText}>

            <Text style={styles.boldText}>Stock: </Text> {item.stock_text}

          </Text>

          <Text style={styles.detailText}>

            <Text style={styles.boldText}>Category: </Text> {item.category}

          </Text>

          <Text style={styles.detailText}>

            <Text style={styles.boldText}>Location: </Text> {item.location_text}

          </Text>

          

          <View style={styles.badgeRow}>

            <View

              style={[

                styles.badge,

                isLowStock ? styles.badgeLowStock : styles.badgeActive,

              ]}

            >

              <Text style={styles.badgeText}>{item.badge_status}</Text>

            </View>

            <TouchableOpacity style={styles.arrowButton}>

              <Text style={styles.arrowText}>›</Text>

            </TouchableOpacity>

          </View>

        </View>

      </View>

    );

  };

 

  // 4. Handle Loading and Error States

  if (loading) {

    return (

      <View style={styles.centerContainer}>

        <ActivityIndicator size="large" color="#7B42F6" />

        <Text style={styles.loadingText}>Loading products...</Text>

      </View>

    );

  }

 

  if (error) {

    return (

      <View style={styles.centerContainer}>

        <Text style={styles.errorText}>Error: {error}</Text>

      </View>

    );

  }

 

  // 5. Main UI Render

  return (

    <SafeAreaView style={styles.safeArea}>

      <View style={styles.header}>

        <Text style={styles.headerTitle}>Prakun Product</Text>

      </View>

      

      <FlatList

        data={products}

        keyExtractor={(item) => item.id.toString()}

        renderItem={renderItem}

        contentContainerStyle={styles.listContainer}

        ItemSeparatorComponent={() => <View style={styles.separator} />}

      />

    </SafeAreaView>

  );

}

 

// --- STYLES ---

const styles = StyleSheet.create({

  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },

  header: { padding: 20, alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },

  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#000' },

  listContainer: { padding: 16 },

  cardContainer: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, justifyContent: 'space-between' },

  imageContainer: { flex: 1, alignItems: 'center', marginRight: 16 },

  productImage: { width: 100, height: 100, borderRadius: 12, backgroundColor: '#EEEEEE', marginBottom: 8 },

  productTitle: { fontSize: 14, fontWeight: '600', textAlign: 'center', color: '#333' },

  detailsContainer: { flex: 1.5, justifyContent: 'center' },

  detailText: { fontSize: 13, color: '#666', marginBottom: 4 },

  boldText: { fontWeight: 'bold', color: '#333' },

  badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },

  badge: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, marginRight: 10 },

  badgeActive: { backgroundColor: '#A855F7' },

  badgeLowStock: { backgroundColor: '#7E22CE' },

  badgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },

  arrowButton: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center' },

  arrowText: { color: '#A855F7', fontWeight: 'bold', fontSize: 16, lineHeight: 18 },

  separator: { height: 16 },

  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },

  loadingText: { marginTop: 10, color: '#666' },

  errorText: { color: 'red', fontSize: 16 },

});