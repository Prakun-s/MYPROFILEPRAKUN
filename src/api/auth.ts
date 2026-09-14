import { API_URL } from "../lib/apiConfig";
import type { AuthUser } from "../types/auth";

interface AuthResponse {
  success: boolean;
  token: string;
  user: AuthUser;
  message?: string;
}

export async function loginRequest(
  username: string,
  password: string
): Promise<{ token: string; user: AuthUser }> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  const result: AuthResponse = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Login failed");
  }

  return { token: result.token, user: result.user };
}

export async function registerRequest(
  username: string,
  password: string
): Promise<{ token: string; user: AuthUser }> {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  const result: AuthResponse = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Registration failed");
  }

  return { token: result.token, user: result.user };
}
