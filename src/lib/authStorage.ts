import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AuthUser } from "../types/auth";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

// เก็บ session ไว้ในหน่วยความจำด้วยเสมอ (นอกจาก AsyncStorage) เพื่อรองรับ
// "จำฉันไว้ในระบบ" แบบที่ใช้งานได้จริง: ถ้าผู้ใช้ไม่ติ๊กจำฉันไว้ในระบบ
// จะ login ใช้งานต่อได้ตลอด session นี้ (ยังเรียก API ได้) แต่พอปิด/เปิดแอปใหม่
// (ไม่มีอะไรอยู่ใน AsyncStorage) ก็จะต้อง login ใหม่ ตรงตามความหมายจริงของ checkbox นี้
let memoryToken: string | null = null;
let memoryUser: AuthUser | null = null;

export async function saveSession(
  token: string,
  user: AuthUser,
  persist: boolean = true
) {
  memoryToken = token;
  memoryUser = user;

  if (persist) {
    await AsyncStorage.multiSet([
      [TOKEN_KEY, token],
      [USER_KEY, JSON.stringify(user)],
    ]);
  } else {
    // เผื่อมี session เก่าที่เคยติ๊กจำไว้ค้างอยู่ ให้เคลียร์ทิ้งด้วย
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  }
}

export async function loadSession(): Promise<{
  token: string;
  user: AuthUser;
} | null> {
  const [[, token], [, userRaw]] = await AsyncStorage.multiGet([
    TOKEN_KEY,
    USER_KEY,
  ]);

  if (!token || !userRaw) {
    return null;
  }

  try {
    const user = JSON.parse(userRaw) as AuthUser;
    memoryToken = token;
    memoryUser = user;
    return { token, user };
  } catch {
    return null;
  }
}

export async function clearSession() {
  memoryToken = null;
  memoryUser = null;
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}

export async function getToken(): Promise<string | null> {
  if (memoryToken) return memoryToken;
  return AsyncStorage.getItem(TOKEN_KEY);
}
