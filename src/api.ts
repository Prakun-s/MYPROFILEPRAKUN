const API_BASE_URL = "http://119.59.102.161:3090/api";

export async function apiCall(
  endpoint: string,
  options: RequestInit = {}
) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP Error ${response.status}`);
  }

  return response.json();
}

export async function fetchProducts() {
  return apiCall("/products");
}

export const addProduct = async (product: any) => {
  const data = await apiCall("/products", {
    method: "POST",
    body: JSON.stringify(product),
  });

  return data;
};