import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { UserProfile, changePassword, fetchProfile, updateProfile } from "./api";
import Toast from "./components/Toast";

// หน้าตั้งค่าโปรไฟล์: แก้ไขข้อมูลส่วนตัว (ชื่อ, อีเมล, เบอร์, ที่อยู่, รูปโปรไฟล์) + เปลี่ยนรหัสผ่าน
export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastTone, setToastTone] = useState<"info" | "warning">("info");

  const notify = (message: string, tone: "info" | "warning" = "info") => {
    setToastMessage(message);
    setToastTone(tone);
    setToastVisible(true);
  };

  const load = async () => {
    try {
      setError("");
      const data = await fetchProfile();
      setProfile(data);
      setFullName(data.full_name || "");
      setEmail(data.email || "");
      setPhone(data.phone || "");
      setAddress(data.address || "");
      setAvatarUrl(data.avatar_url || "");
    } catch (err: any) {
      console.error("Load profile error:", err);
      setError(err.message || "ไม่สามารถโหลดโปรไฟล์ได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSaveProfile = async () => {
    setProfileError("");
    setSavingProfile(true);

    try {
      await updateProfile({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        avatar_url: avatarUrl.trim(),
      });

      notify("บันทึกโปรไฟล์สำเร็จ");
      load();
    } catch (err: any) {
      console.error("Save profile error:", err);
      setProfileError(err.message || "บันทึกโปรไฟล์ไม่สำเร็จ");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      setPasswordError("กรุณากรอกรหัสผ่านเดิมและรหัสผ่านใหม่");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน");
      return;
    }

    setPasswordError("");
    setChangingPassword(true);

    try {
      await changePassword(currentPassword, newPassword);
      notify("เปลี่ยนรหัสผ่านสำเร็จ");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error("Change password error:", err);
      setPasswordError(err.message || "เปลี่ยนรหัสผ่านไม่สำเร็จ");
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111111" />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>

        <TouchableOpacity style={styles.retryButton} onPress={load}>
          <Text style={styles.retryText}>ลองใหม่</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* รูปโปรไฟล์ + ข้อมูลบัญชี (อ่านอย่างเดียว) */}
      <View style={styles.headerCard}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>
              {profile.username.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text style={styles.username}>{profile.username}</Text>
          <Text style={styles.roleText}>
            {profile.role === "admin" ? "แอดมิน" : "สมาชิกทั่วไป"} · เป็นสมาชิกตั้งแต่{" "}
            {new Date(profile.created_at).toLocaleDateString("th-TH", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Text>
        </View>
      </View>

      {/* แก้ไขข้อมูลส่วนตัว */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>ข้อมูลส่วนตัว</Text>

        <Text style={styles.label}>ลิงก์รูปโปรไฟล์</Text>
        <TextInput
          style={styles.input}
          placeholder="https://..."
          value={avatarUrl}
          onChangeText={setAvatarUrl}
          autoCapitalize="none"
        />

        <Text style={styles.label}>ชื่อ-นามสกุล</Text>
        <TextInput
          style={styles.input}
          placeholder="ชื่อที่ใช้แสดง"
          value={fullName}
          onChangeText={setFullName}
        />

        <Text style={styles.label}>อีเมล</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>เบอร์โทรศัพท์</Text>
        <TextInput
          style={styles.input}
          placeholder="เช่น 08x-xxx-xxxx"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>ที่อยู่จัดส่ง</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="บ้านเลขที่ ถนน ตำบล/แขวง อำเภอ/เขต จังหวัด รหัสไปรษณีย์"
          value={address}
          onChangeText={setAddress}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {profileError ? <Text style={styles.errorInline}>{profileError}</Text> : null}

        <TouchableOpacity
          style={[styles.saveButton, savingProfile && styles.saveButtonDisabled]}
          activeOpacity={0.8}
          disabled={savingProfile}
          onPress={handleSaveProfile}
        >
          {savingProfile ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>บันทึกโปรไฟล์</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* เปลี่ยนรหัสผ่าน */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>เปลี่ยนรหัสผ่าน</Text>

        <Text style={styles.label}>รหัสผ่านเดิม</Text>
        <TextInput
          style={styles.input}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
        />

        <Text style={styles.label}>รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)</Text>
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />

        <Text style={styles.label}>ยืนยันรหัสผ่านใหม่</Text>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        {passwordError ? <Text style={styles.errorInline}>{passwordError}</Text> : null}

        <TouchableOpacity
          style={[styles.saveButton, changingPassword && styles.saveButtonDisabled]}
          activeOpacity={0.8}
          disabled={changingPassword}
          onPress={handleChangePassword}
        >
          {changingPassword ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>เปลี่ยนรหัสผ่าน</Text>
          )}
        </TouchableOpacity>
      </View>

      <Toast
        visible={toastVisible}
        message={toastMessage}
        tone={toastTone}
        onHide={() => setToastVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },

  content: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 560,
    width: "100%",
    alignSelf: "center",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#FAFAFA",
  },

  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EDEDED",
    padding: 16,
    marginBottom: 16,
  },

  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F1F1F1",
    marginRight: 14,
  },

  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111111",
  },

  avatarInitial: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  username: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 4,
  },

  roleText: {
    fontSize: 12,
    color: "#8A8A8A",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EDEDED",
    padding: 18,
    marginBottom: 16,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 14,
  },

  label: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 6,
    marginTop: 10,
  },

  input: {
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#E5E3DC",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: "#2B2B31",
  },

  textArea: {
    minHeight: 80,
    paddingTop: 10,
  },

  errorInline: {
    fontSize: 12.5,
    color: "#B3413E",
    marginTop: 12,
  },

  saveButton: {
    backgroundColor: "#111111",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 18,
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  errorText: {
    fontSize: 14,
    color: "#B3413E",
    textAlign: "center",
    marginBottom: 12,
  },

  retryButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#111111",
  },

  retryText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
});
