import { API_URL } from "./lib/apiConfig";
import { getToken } from "./lib/authStorage";

async function authHeaders() {
  const token = await getToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// อัปโหลดรูปโปรไฟล์จริงจากเครื่องผู้ใช้ (ไม่ใช่แค่วาง URL) — ส่งเป็น multipart/form-data
// ต้องไม่ตั้ง Content-Type เอง ปล่อยให้ browser ใส่ boundary ให้อัตโนมัติ
export async function uploadAvatar(file: Blob, filename?: string) {
  const token = await getToken();

  const formData = new FormData();
  formData.append("avatar", file, filename || "avatar.jpg");

  const response = await fetch(`${API_URL}/api/upload/avatar`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "อัปโหลดรูปไม่สำเร็จ");
  }

  return result as { success: boolean; url: string };
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

// ===== รีวิว/คะแนนสินค้า (Product Reviews) =====

export interface ProductReview {
  id: number;
  rating: number;
  comment?: string | null;
  user_id: number;
  username?: string;
  created_at: string;
  updated_at?: string;
}

export interface ProductReviewsSummary {
  reviews: ProductReview[];
  review_count: number;
  average_rating: number;
  my_review: ProductReview | null;
}

export async function fetchProductReviews(productId: number): Promise<ProductReviewsSummary> {
  const response = await fetch(`${API_URL}/api/products/${productId}/reviews`, {
    headers: await authHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "ไม่สามารถโหลดรีวิวได้");
  }

  return result.data;
}

export async function submitProductReview(
  productId: number,
  rating: number,
  comment?: string
) {
  const response = await fetch(`${API_URL}/api/products/${productId}/reviews`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ rating, comment }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "บันทึกรีวิวไม่สำเร็จ");
  }

  return result;
}

export async function deleteProductReview(productId: number) {
  const response = await fetch(`${API_URL}/api/products/${productId}/reviews`, {
    method: "DELETE",
    headers: await authHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "ลบรีวิวไม่สำเร็จ");
  }

  return result;
}

// ===== โปรไฟล์ผู้ใช้ =====

export interface UserProfile {
  id: number;
  username: string;
  role: "user" | "admin";
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  avatar_url?: string | null;
  created_at: string;
}

export async function fetchProfile(): Promise<UserProfile> {
  const response = await fetch(`${API_URL}/api/auth/profile`, {
    headers: await authHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "ไม่สามารถโหลดโปรไฟล์ได้");
  }

  return result.data;
}

export async function updateProfile(payload: {
  full_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  avatar_url?: string;
}) {
  const response = await fetch(`${API_URL}/api/auth/profile`, {
    method: "PUT",
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "บันทึกโปรไฟล์ไม่สำเร็จ");
  }

  return result;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const response = await fetch(`${API_URL}/api/auth/password`, {
    method: "PUT",
    headers: await authHeaders(),
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "เปลี่ยนรหัสผ่านไม่สำเร็จ");
  }

  return result;
}

// ===== Checkout / Orders =====

export async function checkout(paymentMethod: string = "cod", discountCode?: string) {
  const response = await fetch(`${API_URL}/api/checkout`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      payment_method: paymentMethod,
      discount_code: discountCode || undefined,
    }),
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

// ===== โค้ดส่วนลด (Discount Codes) =====

export type DiscountType = "percent" | "fixed";

export interface DiscountCode {
  id: number;
  code: string;
  label: string;
  season?: string | null;
  discount_type: DiscountType;
  discount_value: number;
  max_discount_amount?: number | null;
  min_order_amount: number;
  start_date?: string | null;
  end_date?: string | null;
  usage_limit?: number | null;
  used_count: number;
  is_active: boolean | number;
  used_at?: string | null;
  source?: "admin" | "coin_redeem" | "collected";
  source_code_id?: number | null;
  created_at: string;
}

export async function validateDiscountCode(code: string, orderAmount: number) {
  const response = await fetch(`${API_URL}/api/discount-codes/validate`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ code, order_amount: orderAmount }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "โค้ดส่วนลดไม่ถูกต้อง");
  }

  return result.data as { code: string; label: string; discount_amount: number };
}

export async function fetchMyDiscountCodes(): Promise<DiscountCode[]> {
  const response = await fetch(`${API_URL}/api/discount-codes/my`, {
    headers: await authHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "ไม่สามารถโหลดโค้ดส่วนลดของคุณได้");
  }

  return result.data;
}

export async function fetchPublicDiscountCodes(): Promise<DiscountCode[]> {
  const response = await fetch(`${API_URL}/api/discount-codes/public`, {
    headers: await authHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "ไม่สามารถโหลดโค้ดส่วนลดได้");
  }

  return result.data;
}

export async function collectDiscountCode(id: number) {
  const response = await fetch(`${API_URL}/api/discount-codes/${id}/collect`, {
    method: "POST",
    headers: await authHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "เก็บโค้ดไม่สำเร็จ");
  }

  return result.data as { code: string; label: string };
}

export async function fetchAdminDiscountCodes(): Promise<DiscountCode[]> {
  const response = await fetch(`${API_URL}/api/admin/discount-codes`, {
    headers: await authHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "ไม่สามารถโหลดโค้ดส่วนลดได้");
  }

  return result.data;
}

export async function createDiscountCode(payload: {
  code: string;
  label: string;
  season?: string;
  discount_type: DiscountType;
  discount_value: number;
  max_discount_amount?: number;
  min_order_amount?: number;
  start_date?: string;
  end_date?: string;
  usage_limit?: number;
}) {
  const response = await fetch(`${API_URL}/api/admin/discount-codes`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "สร้างโค้ดส่วนลดไม่สำเร็จ");
  }

  return result;
}

export async function toggleDiscountCode(id: number, isActive: boolean) {
  const response = await fetch(`${API_URL}/api/admin/discount-codes/${id}/toggle`, {
    method: "PUT",
    headers: await authHeaders(),
    body: JSON.stringify({ is_active: isActive }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "อัปเดตสถานะโค้ดไม่สำเร็จ");
  }

  return result;
}

export async function deleteDiscountCode(id: number) {
  const response = await fetch(`${API_URL}/api/admin/discount-codes/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "ลบโค้ดส่วนลดไม่สำเร็จ");
  }

  return result;
}

// ===== ร้านค้าเหรียญ (Coin Rewards) =====

export interface CoinReward {
  id: number;
  name: string;
  description?: string | null;
  coin_cost: number;
  discount_type: DiscountType;
  discount_value: number;
  max_discount_amount?: number | null;
  min_order_amount: number;
  valid_days: number;
  stock?: number | null;
  redeemed_count: number;
  is_active: boolean | number;
  created_at: string;
}

export async function fetchCoinRewards(): Promise<CoinReward[]> {
  const response = await fetch(`${API_URL}/api/coin-rewards`, {
    headers: await authHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "ไม่สามารถโหลดร้านค้าเหรียญได้");
  }

  return result.data;
}

export async function redeemCoinReward(id: number) {
  const response = await fetch(`${API_URL}/api/coin-rewards/${id}/redeem`, {
    method: "POST",
    headers: await authHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "แลกรางวัลไม่สำเร็จ");
  }

  return result.data as { code: string; label: string; end_date: string };
}

export async function fetchAdminCoinRewards(): Promise<CoinReward[]> {
  const response = await fetch(`${API_URL}/api/admin/coin-rewards`, {
    headers: await authHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "ไม่สามารถโหลดรางวัลได้");
  }

  return result.data;
}

export async function createCoinReward(payload: {
  name: string;
  description?: string;
  coin_cost: number;
  discount_type: DiscountType;
  discount_value: number;
  max_discount_amount?: number;
  min_order_amount?: number;
  valid_days?: number;
  stock?: number;
}) {
  const response = await fetch(`${API_URL}/api/admin/coin-rewards`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "สร้างรางวัลไม่สำเร็จ");
  }

  return result;
}

export async function toggleCoinReward(id: number, isActive: boolean) {
  const response = await fetch(`${API_URL}/api/admin/coin-rewards/${id}/toggle`, {
    method: "PUT",
    headers: await authHeaders(),
    body: JSON.stringify({ is_active: isActive }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "อัปเดตสถานะรางวัลไม่สำเร็จ");
  }

  return result;
}

export async function deleteCoinReward(id: number) {
  const response = await fetch(`${API_URL}/api/admin/coin-rewards/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "ลบรางวัลไม่สำเร็จ");
  }

  return result;
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

// ===== แชทระหว่าง user กับ admin =====

export interface ChatMessage {
  id: number;
  user_id: number;
  sender_role: "user" | "admin";
  message: string;
  is_read: boolean | number;
  created_at: string;
}

export interface ChatConversation {
  user_id: number;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
  last_message: string;
  last_sender_role: "user" | "admin";
  last_message_at: string;
  unread_count: number;
}

// ฝั่ง user: โหลดข้อความแชทของตัวเอง (เรียกแล้วข้อความจากแอดมินจะถูก mark ว่าอ่านแล้วอัตโนมัติ)
export async function fetchMyChat(): Promise<ChatMessage[]> {
  const response = await fetch(`${API_URL}/api/chat/my`, {
    headers: await authHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "ไม่สามารถโหลดข้อความแชทได้");
  }

  return result.data;
}

// ฝั่ง user: ส่งข้อความหาแอดมิน
export async function sendMyChatMessage(message: string) {
  const response = await fetch(`${API_URL}/api/chat/my/send`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ message }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "ส่งข้อความไม่สำเร็จ");
  }

  return result.data as ChatMessage;
}

// ฝั่ง user: จำนวนข้อความที่ยังไม่อ่านจากแอดมิน (ใช้แสดงจุดแจ้งเตือน)
export async function fetchMyChatUnreadCount(): Promise<number> {
  const response = await fetch(`${API_URL}/api/chat/my/unread-count`, {
    headers: await authHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "ไม่สามารถโหลดจำนวนแจ้งเตือนได้");
  }

  return result.data.count;
}

// ฝั่ง admin: รายชื่อบทสนทนาทั้งหมด เรียงตามข้อความล่าสุด
export async function fetchAdminChatConversations(): Promise<ChatConversation[]> {
  const response = await fetch(`${API_URL}/api/admin/chat/conversations`, {
    headers: await authHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "ไม่สามารถโหลดรายชื่อบทสนทนาได้");
  }

  return result.data;
}

// ฝั่ง admin: โหลดข้อความแชทของ user คนใดคนหนึ่ง (เรียกแล้วข้อความจาก user จะถูก mark ว่าอ่านแล้วอัตโนมัติ)
export async function fetchAdminChatThread(userId: number): Promise<ChatMessage[]> {
  const response = await fetch(`${API_URL}/api/admin/chat/${userId}`, {
    headers: await authHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "ไม่สามารถโหลดข้อความแชทได้");
  }

  return result.data;
}

// ฝั่ง admin: ส่งข้อความตอบกลับ user คนใดคนหนึ่ง
export async function sendAdminChatMessage(userId: number, message: string) {
  const response = await fetch(`${API_URL}/api/admin/chat/${userId}/send`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ message }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "ส่งข้อความไม่สำเร็จ");
  }

  return result.data as ChatMessage;
}
