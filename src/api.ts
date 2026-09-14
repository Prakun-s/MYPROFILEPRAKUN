import { API_URL } from "./lib/apiConfig";
import { getToken } from "./lib/authStorage";

async function authHeaders() {
  const token = await getToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchProducts() {
  const response = await fetch(`${API_URL}/api/products`, {
    headers: await authHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to fetch products");
  }

  return result.data;
}

export async function addProduct(product: {
  name: string;
  stock: number;
  price: number;
  category: string;
  location_text: string;
  image_url: string;
}) {
  const response = await fetch(`${API_URL}/api/products`, {
    method: "POST",

    headers: await authHeaders(),

    body: JSON.stringify({
      name: product.name,
      stock: product.stock,
      price: product.price,
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

export async function updateProduct(
  id: number,
  product: {
    name: string;
    stock: number;
    price: number;
    category: string;
    location_text: string;
    image_url: string;
  }
) {
  const response = await fetch(`${API_URL}/api/products/${id}`, {
    method: "PUT",

    headers: await authHeaders(),

    body: JSON.stringify({
      name: product.name,
      stock: product.stock,
      price: product.price,
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
    throw new Error(result.message || "Failed to update product");
  }

  return result;
}

export async function deleteProduct(id: number) {
  const response = await fetch(`${API_URL}/api/products/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to delete product");
  }

  return result;
}