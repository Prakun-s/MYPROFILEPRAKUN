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
  description?: string;
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
      description: product.description || "",
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
    description?: string;
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
      description: product.description || "",
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

// ===== Cart =====

export async function fetchCart() {
  const response = await fetch(`${API_URL}/api/cart`, {
    headers: await authHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to fetch cart");
  }

  return result.data;
}

export async function addToCart(productId: number, quantity: number = 1) {
  const response = await fetch(`${API_URL}/api/cart`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ product_id: productId, quantity }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to add to cart");
  }

  return result;
}

export async function updateCartItem(productId: number, quantity: number) {
  const response = await fetch(`${API_URL}/api/cart/${productId}`, {
    method: "PUT",
    headers: await authHeaders(),
    body: JSON.stringify({ quantity }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to update cart");
  }

  return result;
}

export async function removeFromCart(productId: number) {
  const response = await fetch(`${API_URL}/api/cart/${productId}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to remove item");
  }

  return result;
}

// ===== Checkout / Orders =====

export async function checkout(paymentMethod: string = "cod") {
  const response = await fetch(`${API_URL}/api/checkout`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ payment_method: paymentMethod }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Checkout failed");
  }

  return result;
}

export async function fetchMyOrders() {
  const response = await fetch(`${API_URL}/api/orders/my`, {
    headers: await authHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to fetch orders");
  }

  return result.data;
}

// ===== Admin Order Management =====

export async function fetchAllOrders() {
  const response = await fetch(`${API_URL}/api/admin/orders`, {
    headers: await authHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to fetch orders");
  }

  return result.data;
}

export async function updateOrderStatus(orderId: number, status: string) {
  const response = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
    method: "PUT",
    headers: await authHeaders(),
    body: JSON.stringify({ status }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to update order status");
  }

  return result;
}

// ===== Claims (เคลมสินค้า) =====

export type ClaimReason =
  | "damaged"
  | "wrong_item"
  | "missing_item"
  | "not_as_described"
  | "fake"
  | "other";

export type ClaimStatus = "pending" | "approved" | "rejected" | "completed";

export interface ClaimRecord {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  reason: ClaimReason;
  description: string;
  image_url?: string | null;
  contact_phone?: string | null;
  status: ClaimStatus;
  admin_note?: string | null;
  created_at: string;
  updated_at?: string;
  username?: string;
}

export async function submitClaim(claim: {
  order_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  reason: ClaimReason;
  description: string;
  image_url?: string;
  contact_phone?: string;
}) {
  const response = await fetch(`${API_URL}/api/claims`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(claim),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "ส่งคำขอเคลมไม่สำเร็จ");
  }

  return result;
}

export async function fetchMyClaims(): Promise<ClaimRecord[]> {
  const response = await fetch(`${API_URL}/api/claims/my`, {
    headers: await authHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "ไม่สามารถโหลดประวัติการเคลมได้");
  }

  return result.data;
}

export async function fetchAllClaims(): Promise<ClaimRecord[]> {
  const response = await fetch(`${API_URL}/api/admin/claims`, {
    headers: await authHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "ไม่สามารถโหลดรายการเคลมได้");
  }

  return result.data;
}

export async function updateClaimStatus(
  claimId: number,
  status: ClaimStatus,
  adminNote?: string
) {
  const response = await fetch(`${API_URL}/api/admin/claims/${claimId}/status`, {
    method: "PUT",
    headers: await authHeaders(),
    body: JSON.stringify({ status, admin_note: adminNote }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "ไม่สามารถอัปเดตสถานะการเคลมได้");
  }

  return result;
}

// ===== เหรียญสะสม (Coins) =====

export interface CoinTransaction {
  id: number;
  order_id: number;
  coins: number;
  order_total: number;
  reasoning?: string | null;
  source: "ai" | "fallback";
  created_at: string;
}

export async function fetchMyCoins(): Promise<{
  coin_balance: number;
  transactions: CoinTransaction[];
}> {
  const response = await fetch(`${API_URL}/api/coins/my`, {
    headers: await authHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "ไม่สามารถโหลดข้อมูลเหรียญสะสมได้");
  }

  return result.data;
}

// ===== Admin Dashboard =====

export async function fetchDashboardSummary() {
  const response = await fetch(`${API_URL}/api/admin/dashboard`, {
    headers: await authHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to fetch dashboard summary");
  }

  return result.data;
}
