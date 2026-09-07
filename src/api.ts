const API_URL = "http://119.59.102.161:3090";

export async function fetchProducts() {
  const response = await fetch(`${API_URL}/api/products`);

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to fetch products");
  }

  return result.data;
}

export async function addProduct(product: {
  name: string;
  stock: number;
  category: string;
  location_text: string;
  image_url: string;
}) {
  const response = await fetch(`${API_URL}/api/products`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      name: product.name,
      stock: product.stock,
      stock_text: `${product.stock} units`,
      category: product.category,
      location_count: product.location_text ? 1 : 0,
      location_text: product.location_text,
      badge_status:
        product.stock < 5
          ? "Low in stock"
          : "Available",
      image_url: product.image_url,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to add product");
  }

  return result;
}