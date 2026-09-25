import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { UserProfile, changePassword, fetchProfile, updateProfile, uploadAvatar } from "./api";
import Icon from "./components/Icon";
import Toast from "./components/Toast";

// หน้าตั้งค่า: แก้ไขข้อมูลส่วนตัว, เปลี่ยนรหัสผ่าน, การตั้งค่าทั่วไป
// แยกออกมาจากหน้าโปรไฟล์หลัก (ProfileScreen) ที่ตอนนี้แสดงแค่ภาพรวม/สถิติเท่านั้น
export default function SettingsScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [notifyEnabled, setNotifyEnabled] = useState(true);

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

  // backend เขียนทับข้อมูลโปรไฟล์ทั้งหมดทุกครั้งที่บันทึก จึงต้องส่ง avatar_url เดิมไปด้วยเสมอ
  // (แม้หน้านี้จะไม่ได้แก้รูปโปรไฟล์เอง) ไม่งั้นรูปโปรไฟล์จะถูกล้างเป็นค่าว่าง
  const handleSaveProfile = async () => {
    setProfileError("");
    setSavingProfile(true);

    try {
      await updateProfile({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        avatar_url: profile?.avatar_url || "",
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

  // เลือกรูปโปรไฟล์จากเครื่องผู้ใช้จริง แล้วอัปโหลดขึ้น backend ทันที (เหมือนหน้าโปรไฟล์หลัก)
  // ตอนนี้รองรับเฉพาะเว็บ (ใช้ input file ของเบราว์เซอร์)
  // backend เขียนทับข้อมูลโปรไฟล์ทั้งหมดทุกครั้งที่บันทึก จึงต้องส่งฟิลด์อื่นเดิมไปด้วยเสมอ
  const pickAvatarFromDevice = () => {
    if (Platform.OS !== "web") {
      notify("ฟีเจอร์เลือกรูปจากเครื่องตอนนี้รองรับเฉพาะเว็บ", "warning");
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        notify("ไฟล์รูปใหญ่เกินไป (จำกัดไม่เกิน 5MB)", "warning");
        return;
      }

      setAvatarUploading(true);

      try {
        const result = await uploadAvatar(file, file.name);

        await updateProfile({
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          address: address.trim(),
          avatar_url: result.url,
        });

        setProfile((prev) => (prev ? { ...prev, avatar_url: result.url } : prev));
        notify("อัปเดตรูปโปรไฟล์สำเร็จ");
      } catch (err: any) {
        console.error("Upload avatar error:", err);
        notify(err.message || "อัปโหลดรูปไม่สำเร็จ ลองใหม่อีกครั้ง", "warning");
      } finally {
        setAvatarUploading(false);
      }
    };

    input.click();
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
        <ActivityIndicator size="large" color="#3D2619" />
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
      {/* แก้ไขข้อมูลส่วนตัว */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardHeaderIconBadge}>
            <Icon name="person" size={16} color="#7F562B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>ข้อมูลส่วนตัว</Text>
            <Text style={styles.cardSubtitle}>
              อัปเดตข้อมูลรายละเอียดสำหรับการสั่งซื้อ
            </Text>
          </View>
        </View>

        {/* รูปโปรไฟล์ */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>
                  {profile.username.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            {avatarUploading && (
              <View style={styles.avatarUploadingOverlay}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            )}

            <TouchableOpacity
              style={styles.cameraBadge}
              activeOpacity={0.8}
              onPress={pickAvatarFromDevice}
              disabled={avatarUploading}
            >
              <Icon name="photo_camera" size={13} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.avatarHint}>แตะไอคอนกล้องเพื่อเปลี่ยนรูปโปรไฟล์</Text>
        </View>

        <Text style={styles.label}>ชื่อ-นามสกุล</Text>
        <View style={styles.inputRow}>
          <Icon name="person" size={16} color="#8A7D75" />
          <TextInput
            style={styles.inputText}
            placeholder="ชื่อที่ใช้แสดง"
            value={fullName}
            onChangeText={setFullName}
          />
        </View>

        <Text style={styles.label}>เบอร์โทรศัพท์</Text>
        <View style={styles.inputRow}>
          <Icon name="smartphone" size={16} color="#8A7D75" />
          <TextInput
            style={styles.inputText}
            placeholder="เช่น 08x-xxx-xxxx"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        <Text style={styles.label}>อีเมล</Text>
        <View style={styles.inputRow}>
          <Icon name="mail" size={16} color="#8A7D75" />
          <TextInput
            style={styles.inputText}
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <Text style={styles.label}>ที่อยู่สำหรับจัดส่งเริ่มต้น</Text>
        <View style={[styles.inputRow, styles.inputRowArea]}>
          <Icon name="location_on" size={16} color="#8A7D75" style={styles.inputIconArea} />
          <TextInput
            style={[styles.inputText, styles.textArea]}
            placeholder="บ้านเลขที่ ถนน ตำบล/แขวง อำเภอ/เขต จังหวัด รหัสไปรษณีย์"
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

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
            <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
              <Icon name="save" size={15} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>บันทึกการเปลี่ยนแปลง</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* เปลี่ยนรหัสผ่าน */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardHeaderIconBadge}>
            <Icon name="lock" size={16} color="#7F562B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>เปลี่ยนรหัสผ่าน</Text>
            <Text style={styles.cardSubtitle}>เพื่อความปลอดภัยในการเข้าใช้งานบัญชี</Text>
          </View>
        </View>

        <Text style={styles.label}>รหัสผ่านปัจจุบัน</Text>
        <View style={styles.inputRow}>
          <Icon name="key" size={16} color="#8A7D75" />
          <TextInput
            style={styles.inputText}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry={!showCurrentPassword}
          />
          <TouchableOpacity
            onPress={() => setShowCurrentPassword((v) => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name={showCurrentPassword ? "visibility_off" : "visibility"} size={17} color="#8A7D75" />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>รหัสผ่านใหม่</Text>
        <View style={styles.inputRow}>
          <Icon name="lock" size={16} color="#8A7D75" />
          <TextInput
            style={styles.inputText}
            placeholder="อย่างน้อย 6 ตัวอักษร"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showNewPassword}
          />
          <TouchableOpacity
            onPress={() => setShowNewPassword((v) => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name={showNewPassword ? "visibility_off" : "visibility"} size={17} color="#8A7D75" />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>ยืนยันรหัสผ่านใหม่</Text>
        <View style={styles.inputRow}>
          <Icon name="check_circle" size={16} color="#8A7D75" />
          <TextInput
            style={styles.inputText}
            placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity
            onPress={() => setShowConfirmPassword((v) => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name={showConfirmPassword ? "visibility_off" : "visibility"} size={17} color="#8A7D75" />
          </TouchableOpacity>
        </View>

        {passwordError ? <Text style={styles.errorInline}>{passwordError}</Text> : null}

        <TouchableOpacity
          style={[styles.outlineButton, changingPassword && styles.saveButtonDisabled]}
          activeOpacity={0.8}
          disabled={changingPassword}
          onPress={handleChangePassword}
        >
          {changingPassword ? (
            <ActivityIndicator size="small" color="#3D2619" />
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
              <Icon name="sync" size={15} color="#3D2619" />
              <Text style={styles.outlineButtonText}>อัปเดตรหัสผ่าน</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* การตั้งค่าทั่วไป */}
      <Text style={styles.sectionLabel}>การตั้งค่าทั่วไป</Text>

      <View style={styles.settingsCard}>
        <View style={styles.settingRow}>
          <View style={[styles.settingIconBadge, { backgroundColor: "#DFF3F1" }]}>
            <Icon name="local_shipping" size={17} color="#0F766E" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>จัดการที่อยู่จัดส่ง</Text>
            <Text style={styles.settingSubtitle}>
              {address ? "บันทึกแล้ว 1 ที่อยู่" : "ยังไม่ได้บันทึกที่อยู่"}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </View>

        <View style={styles.settingDivider} />

        <View style={styles.settingRow}>
          <View style={[styles.settingIconBadge, { backgroundColor: "#FEF3C7" }]}>
            <Icon name="notifications" size={17} color="#D97706" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>การแจ้งเตือนแอป</Text>
            <Text style={styles.settingSubtitle}>สถานะคำสั่งซื้อ & ดีลพิเศษ</Text>
          </View>
          <Switch
            value={notifyEnabled}
            onValueChange={setNotifyEnabled}
            trackColor={{ false: "#E8DFD8", true: "#3D2619" }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.settingDivider} />

        <TouchableOpacity
          style={styles.settingRow}
          activeOpacity={0.6}
          onPress={() => notify("นโยบายความเป็นส่วนตัวจะเปิดให้อ่านเร็วๆ นี้")}
        >
          <View style={[styles.settingIconBadge, { backgroundColor: "#EDE4FB" }]}>
            <Icon name="shield" size={17} color="#6D28D9" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>นโยบายความเป็นส่วนตัว</Text>
            <Text style={styles.settingSubtitle}>ข้อกำหนดและสิทธิ์ข้อมูลส่วนบุคคล (PDPA)</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <View style={styles.settingDivider} />

        <TouchableOpacity
          style={styles.settingRow}
          activeOpacity={0.6}
          onPress={() => notify("ทีมงานพร้อมช่วยเหลือ ติดต่อได้ทางไลน์หรืออีเมลร้าน")}
        >
          <View style={[styles.settingIconBadge, { backgroundColor: "#E4ECFB" }]}>
            <Icon name="support_agent" size={17} color="#1A56C4" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>ศูนย์ช่วยเหลือ & ติดต่อ</Text>
            <Text style={styles.settingSubtitle}>แชทคุยกับทีมซัพพอร์ต</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
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
    backgroundColor: "#F0E9DC",
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
    backgroundColor: "#F0E9DC",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8DFD8",
    padding: 18,
    marginBottom: 16,
  },

  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },

  cardHeaderIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F0EDE9",
    alignItems: "center",
    justifyContent: "center",
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#3D2619",
    marginBottom: 2,
  },

  cardSubtitle: {
    fontSize: 11.5,
    color: "#8A7D75",
  },

  avatarSection: {
    alignItems: "center",
    marginBottom: 6,
  },

  avatarWrap: {
    position: "relative",
    marginBottom: 8,
  },

  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#F0EDE9",
  },

  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3D2619",
  },

  avatarInitial: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  cameraBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#3D2619",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  avatarUploadingOverlay: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(45,30,20,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarHint: {
    fontSize: 11,
    color: "#8A7D75",
  },

  label: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#3D2619",
    marginBottom: 6,
    marginTop: 10,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0E9DC",
    borderWidth: 1,
    borderColor: "#E8DFD8",
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 10,
  },

  inputRowArea: {
    alignItems: "flex-start",
    paddingVertical: 10,
  },

  inputIconArea: {
    marginTop: 2,
  },

  inputText: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13.5,
    color: "#2B2118",
  },

  textArea: {
    minHeight: 64,
    paddingTop: 2,
  },

  errorInline: {
    fontSize: 12.5,
    color: "#C53030",
    marginTop: 12,
  },

  saveButton: {
    backgroundColor: "#3D2619",
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

  outlineButton: {
    backgroundColor: "#F0EDE9",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 18,
  },

  outlineButtonText: {
    color: "#3D2619",
    fontSize: 14,
    fontWeight: "700",
  },

  sectionLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#8A7D75",
    marginBottom: 10,
    marginLeft: 4,
  },

  settingsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8DFD8",
    marginBottom: 20,
    overflow: "hidden",
  },

  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  settingDivider: {
    height: 1,
    backgroundColor: "#F0EDE9",
    marginLeft: 16,
  },

  settingIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  settingTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#3D2619",
    marginBottom: 2,
  },

  settingSubtitle: {
    fontSize: 11,
    color: "#8A7D75",
  },

  chevron: {
    fontSize: 20,
    color: "#C7BCB2",
  },

  errorText: {
    fontSize: 14,
    color: "#C53030",
    textAlign: "center",
    marginBottom: 12,
  },

  retryButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#3D2619",
  },

  retryText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
});
