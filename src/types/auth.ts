export type UserRole = "user" | "admin";

export interface AuthUser {
  id: number;
  username: string;
  role: UserRole;
}
