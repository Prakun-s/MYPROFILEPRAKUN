import { useState } from "react";

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "./context/AuthContext";
import Icon from "./components/Icon";
import ShopLogo from "./components/ShopLogo";
import Toast from "./components/Toast";

interface Props {
  initialTab: "login" | "register";
}

// เกณฑ์ความรัดกุมรหัสผ่านแบบง่าย คำนวณจากสิ่งที่ผู้ใช้พิมพ์จริง ไม่ได้ฟันธงความปลอดภัยจริง
// แค่ให้ฟีดแบ็กเบื้องต้นตามความยาว/ความหลากหลายของตัวอักษร
function getPasswordStrength(password: string): { label: string; color: string } | null {
  if (!password) return null;

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  const variety = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;

  if (password.length < 6) {
    return { label: "สั้นเกินไป", color: "#C53030" };
  }
  if (password.length >= 10 && variety >= 3) {
    return { label: "รัดกุมสูง", color: "#2D6A4F" };
  }
  if (password.length >= 6 && variety >= 2) {
    return { label: "รัดกุมปานกลาง", color: "#D97706" };
  }
  return { label: "ควรเพิ่มความรัดกุม", color: "#D97706" };
}

// หน้าเข้าสู่ระบบ/สมัครสมาชิกรวมในหน้าเดียว สลับแท็บได้แบบในดีไซน์
// ฟีเจอร์จริงที่ผูกกับหลังบ้านจริง: login/register, จำฉันไว้ในระบบ (session อยู่ได้ตลอด session
// ปัจจุบันแม้ไม่ติ๊ก แต่จะไม่ถูกจำข้ามการเปิดแอปใหม่), บันทึกชื่อ-ชื่อร้านลงโปรไฟล์ตอนสมัคร
// ส่วน Google/LINE login และ "ลืมรหัสผ่าน" ยังไม่มีระบบหลังบ้านรองรับจริง ปุ่มจึงแจ้งสถานะตามจริงแทน
export default function AuthScreen({ initialTab }: Props) {
  const { login, register } = useAuth();

  const [tab, setTab] = useState<"login" | "register">(initialTab);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const notify = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
  };

  const switchTab = (next: "login" | "register") => {
    setTab(next);
    setError("");
  };

  const strength = tab === "register" ? getPasswordStrength(password) : null;

  const onSubmit = async () => {
    if (tab === "login") {
      if (!username.trim() || !password) {
        setError("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");
        return;
      }

      try {
        setError("");
        setSubmitting(true);
        await login(username.trim(), password, rememberMe);
      } catch (err: any) {
        setError(err.message || "เข้าสู่ระบบไม่สำเร็จ");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // สมัครสมาชิก
    if (!username.trim() || !password) {
      setError("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");
      return;
    }

    if (password.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    if (password !== confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }

    if (!acceptTerms) {
      setError("กรุณายอมรับเงื่อนไขการใช้บริการก่อนสมัครสมาชิก");
      return;
    }

    try {
      setError("");
      setSubmitting(true);
      // สมัครผ่านหน้านี้จะได้สิทธิ์ role "user" เสมอ
      // การสร้างบัญชี admin ทำโดยผู้ดูแลระบบเท่านั้น (ดู Backend/scripts/create-admin.js)
      await register(username.trim(), password, fullName);
    } catch (err: any) {
      setError(err.message || "สมัครสมาชิกไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* หัวหน้าจอ: โลโก้ร้านเท่านั้น (ยังไม่ login จึงไม่มีค้นหา/แจ้งเตือน/รูปโปรไฟล์) */}
          <View style={styles.header}>
            <ShopLogo />
          </View>

          {/* แถบตกแต่งธีมร้านกาแฟ */}
          <View style={styles.heroBanner}>
            <View style={styles.heroBadgeWrap}>
              <View style={styles.heroBadge}>
                <Icon name="local_cafe" size={24} color="#3D2619" />
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeaderCenter}>
              <View style={styles.securityPill}>
                <Icon name="shield" size={12} color="#7F562B" />
                <Text style={styles.securityPillText}>ระบบความปลอดภัยสมาชิก</Text>
              </View>

              <Text style={styles.title}>
                {tab === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิกใหม่"}
              </Text>
              <Text style={styles.subtitle}>
                {tab === "login"
                  ? "เข้าสู่ระบบเพื่อจัดการคลังสินค้าและสั่งซื้อ"
                  : "สร้างบัญชีผู้ใช้ทั่วไปสำหรับดูข้อมูลคลังสินค้าและสั่งซื้อ"}
              </Text>
            </View>

            {/* แท็บสลับ เข้าสู่ระบบ / สมัครสมาชิก */}
            <View style={styles.tabSwitcher}>
              <TouchableOpacity
                style={[styles.tabButton, tab === "login" && styles.tabButtonActive]}
                activeOpacity={0.8}
                onPress={() => switchTab("login")}
              >
                <Text style={[styles.tabButtonText, tab === "login" && styles.tabButtonTextActive]}>
                  เข้าสู่ระบบ
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, tab === "register" && styles.tabButtonActive]}
                activeOpacity={0.8}
                onPress={() => switchTab("register")}
              >
                <Text
                  style={[styles.tabButtonText, tab === "register" && styles.tabButtonTextActive]}
                >
                  สมัครสมาชิก
                </Text>
              </TouchableOpacity>
            </View>

            {/* ชื่อ-นามสกุล/ชื่อร้าน (สมัครสมาชิกเท่านั้น) */}
            {tab === "register" && (
              <View style={styles.field}>
                <Text style={styles.label}>ชื่อ-นามสกุล หรือชื่อร้านค้า</Text>
                <View style={styles.inputWrap}>
                  <Icon name="storefront" size={16} color="#8A7D75" />
                  <TextInput
                    style={styles.input}
                    placeholder="เช่น รุ่งเรือง คาเฟ่"
                    placeholderTextColor="#A79A90"
                    value={fullName}
                    onChangeText={setFullName}
                  />
                </View>
              </View>
            )}

            {/* ชื่อผู้ใช้ */}
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>ชื่อผู้ใช้ หรือ อีเมล</Text>
                <Text style={styles.requiredText}>บังคับ</Text>
              </View>
              <View style={styles.inputWrap}>
                <Icon name="person" size={16} color="#8A7D75" />
                <TextInput
                  style={styles.input}
                  placeholder="username หรือ example@email.com"
                  placeholderTextColor="#A79A90"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={username}
                  onChangeText={setUsername}
                />
              </View>
            </View>

            {/* รหัสผ่าน */}
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>รหัสผ่าน</Text>
                {strength && (
                  <Text style={[styles.strengthText, { color: strength.color }]}>
                    {strength.label}
                  </Text>
                )}
              </View>
              <View style={styles.inputWrap}>
                <Icon name="lock" size={16} color="#8A7D75" />
                <TextInput
                  style={styles.input}
                  placeholder={
                    tab === "register" ? "อย่างน้อย 6 ตัวอักษร" : "ระบุรหัสผ่านของคุณ"
                  }
                  placeholderTextColor="#A79A90"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon
                    name={showPassword ? "visibility_off" : "visibility"}
                    size={17}
                    color="#8A7D75"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* ยืนยันรหัสผ่าน (สมัครสมาชิกเท่านั้น) */}
            {tab === "register" && (
              <View style={styles.field}>
                <Text style={styles.label}>ยืนยันรหัสผ่าน</Text>
                <View style={styles.inputWrap}>
                  <Icon name="password" size={16} color="#8A7D75" />
                  <TextInput
                    style={styles.input}
                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                    placeholderTextColor="#A79A90"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                </View>
              </View>
            )}

            {/* จำฉันไว้ในระบบ / ลืมรหัสผ่าน (เข้าสู่ระบบเท่านั้น) */}
            {tab === "login" ? (
              <View style={styles.auxRow}>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  activeOpacity={0.7}
                  onPress={() => setRememberMe((v) => !v)}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                    {rememberMe && <Icon name="check" size={11} color="#FFFFFF" />}
                  </View>
                  <Text style={styles.auxText}>จำฉันไว้ในระบบ</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    notify("ฟีเจอร์รีเซ็ตรหัสผ่านยังไม่เปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบร้าน")
                  }
                >
                  <Text style={styles.forgotLink}>ลืมรหัสผ่าน?</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.termsRow}
                activeOpacity={0.7}
                onPress={() => setAcceptTerms((v) => !v)}
              >
                <View style={[styles.checkbox, styles.checkboxTerms, acceptTerms && styles.checkboxChecked]}>
                  {acceptTerms && <Icon name="check" size={11} color="#FFFFFF" />}
                </View>
                <Text style={styles.termsText}>
                  ฉันยอมรับเงื่อนไขการใช้บริการและนโยบายความเป็นส่วนตัวของ PRAKUN SHOP
                </Text>
              </TouchableOpacity>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={styles.submitButton}
              activeOpacity={0.85}
              onPress={onSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>
                    {tab === "login" ? "เข้าสู่ระบบ" : "สร้างบัญชีผู้ใช้"}
                  </Text>
                  <Icon
                    name={tab === "login" ? "arrow_forward" : "person_add"}
                    size={16}
                    color="#FFFFFF"
                  />
                </>
              )}
            </TouchableOpacity>

            {/* ตัวคั่น + ปุ่ม social (ยังไม่มีระบบหลังบ้านรองรับจริง) */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>หรือดำเนินการต่อด้วย</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity
                style={styles.socialButton}
                activeOpacity={0.75}
                onPress={() => notify("ยังไม่รองรับการเข้าสู่ระบบด้วย Google ในตอนนี้")}
              >
                <Text style={styles.socialLetterIcon}>G</Text>
                <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialButton}
                activeOpacity={0.75}
                onPress={() => notify("ยังไม่รองรับการเข้าสู่ระบบด้วย LINE ในตอนนี้")}
              >
                <Icon name="chat" size={15} color="#3D2619" />
                <Text style={styles.socialButtonText}>LINE ID</Text>
              </TouchableOpacity>
            </View>

            {/* กล่องช่วยเหลือ */}
            <View style={styles.helpBox}>
              <View style={styles.helpIconCircle}>
                <Icon name="support_agent" size={16} color="#7F562B" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.helpTitle}>ต้องการความช่วยเหลือสำหรับร้านค้า?</Text>
                <Text style={styles.helpSubtitle} numberOfLines={1}>
                  ติดต่อผู้ดูแลระบบร้าน PRAKUN SHOP โดยตรง
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.footerRow}>
            <Icon name="lock" size={12} color="#8A7D75" />
            <Text style={styles.footerText}>
              การเชื่อมต่อผ่านการเข้ารหัส 256-bit SSL มาตรฐานพาณิชย์
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Toast visible={toastVisible} message={toastMessage} tone="info" onHide={() => setToastVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0E9DC",
  },

  flex: {
    flex: 1,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  header: {
    marginBottom: 14,
  },

  heroBanner: {
    height: 96,
    borderRadius: 16,
    backgroundColor: "#6B4F40",
    marginBottom: 16,
    overflow: "visible",
    alignItems: "center",
    justifyContent: "center",
  },

  heroBadgeWrap: {
    position: "absolute",
    bottom: -20,
    alignItems: "center",
    justifyContent: "center",
  },

  heroBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    paddingTop: 32,
    marginTop: 4,
  },

  cardHeaderCenter: {
    alignItems: "center",
    marginBottom: 20,
  },

  securityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F6F3EE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 10,
  },

  securityPillText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#7F562B",
  },

  title: {
    fontSize: 21,
    fontWeight: "800",
    color: "#2B2118",
    marginBottom: 4,
  },

  subtitle: {
    fontSize: 12.5,
    color: "#8A7D75",
    textAlign: "center",
  },

  tabSwitcher: {
    flexDirection: "row",
    backgroundColor: "#F6F3EE",
    borderRadius: 12,
    padding: 3,
    marginBottom: 18,
  },

  tabButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: "center",
  },

  tabButtonActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },

  tabButtonText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#8A7D75",
  },

  tabButtonTextActive: {
    color: "#553722",
  },

  field: {
    marginBottom: 16,
  },

  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  label: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#4A3B32",
  },

  requiredText: {
    fontSize: 11,
    color: "#8A7D75",
  },

  strengthText: {
    fontSize: 11,
    fontWeight: "700",
  },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F6F3EE",
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 8,
  },

  inputIcon: {
    fontSize: 15,
  },

  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 14,
    color: "#2B2118",
  },

  eyeButton: {
    padding: 4,
  },

  eyeIcon: {
    fontSize: 16,
  },

  auxRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#D4C3BA",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6F3EE",
  },

  checkboxTerms: {
    marginTop: 1,
  },

  checkboxChecked: {
    backgroundColor: "#3D2619",
    borderColor: "#3D2619",
  },

  checkboxMark: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  auxText: {
    fontSize: 12.5,
    color: "#4A3B32",
  },

  forgotLink: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#7F562B",
  },

  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 4,
  },

  termsText: {
    flex: 1,
    fontSize: 11.5,
    color: "#8A7D75",
    lineHeight: 16,
  },

  error: {
    color: "#C53030",
    fontSize: 12.5,
    marginTop: 10,
    marginBottom: 2,
    textAlign: "center",
  },

  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#553722",
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 18,
  },

  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  submitButtonIcon: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 22,
    marginBottom: 16,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E2DD",
  },

  dividerText: {
    fontSize: 11.5,
    color: "#8A7D75",
  },

  socialRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },

  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#F6F3EE",
    borderRadius: 12,
    paddingVertical: 12,
  },

  socialButtonText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#2B2118",
  },

  socialLetterIcon: {
    fontSize: 14,
    fontWeight: "800",
    color: "#3D2619",
  },

  helpBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F6F3EE",
    borderRadius: 12,
    padding: 10,
  },

  helpIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#EBE8E3",
    alignItems: "center",
    justifyContent: "center",
  },

  helpTitle: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#2B2118",
  },

  helpSubtitle: {
    fontSize: 11,
    color: "#8A7D75",
    marginTop: 1,
  },

  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
  },

  footerText: {
    fontSize: 11,
    color: "#8A7D75",
  },
});
