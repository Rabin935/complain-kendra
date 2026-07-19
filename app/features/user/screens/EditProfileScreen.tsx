import { Text, TextInput } from "@/src/theme/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../../constants/colors";
import { useAuth } from "../../auth/context/AuthContext";
import {
  deleteCitizenAccount,
  fetchCitizenProfile,
  updateCitizenProfile,
  type ProfileImageUpload,
} from "../services/citizen.service";
import type { CitizenProfile } from "../types/citizen.types";
import type { UserStackParamList } from "../types/user.types";

type EditProfileNavigation = NavigationProp<UserStackParamList>;

const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const SUPPORTED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png"]);

export default function EditProfileScreen() {
  const navigation = useNavigation<EditProfileNavigation>();
  const { logout } = useAuth();
  const [profile, setProfile] = useState<CitizenProfile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState<ProfileImageUpload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");

  const memberSince = useMemo(() => {
    if (!profile?.createdAt) {
      return "Not available";
    }

    return new Date(profile.createdAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [profile?.createdAt]);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await fetchCitizenProfile();

    if (result.source !== "api" || !result.data.id) {
      setError(result.error ?? "Unable to load profile.");
      setLoading(false);
      return;
    }

    const [first, ...rest] = result.data.name.trim().split(/\s+/);
    setProfile(result.data);
    setFirstName(first ?? "");
    setLastName(rest.join(" "));
    setBio(result.data.bio ?? "");
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2400);
  }

  function validateImage(asset: ImagePicker.ImagePickerAsset): ProfileImageUpload | null {
    const type = asset.mimeType ?? (asset.uri.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg");

    if (!SUPPORTED_TYPES.has(type.toLowerCase())) {
      setError("Profile picture must be JPG, JPEG, or PNG.");
      return null;
    }

    if (asset.fileSize && asset.fileSize > MAX_PHOTO_SIZE) {
      setError("Profile picture must be 5 MB or smaller.");
      return null;
    }

    return {
      uri: asset.uri,
      name: asset.fileName ?? "profile-photo.jpg",
      type,
    };
  }

  async function chooseAvatar() {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setError("Photo library permission is required to choose a profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.86,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    if (!result.canceled && result.assets[0]) {
      const selected = validateImage(result.assets[0]);

      if (selected) {
        setAvatar(selected);
      }
    }
  }

  function validateForm(): string | null {
    const first = firstName.trim();
    const last = lastName.trim();

    if (first.length < 2 || first.length > 40) {
      return "First name must be between 2 and 40 characters.";
    }

    if (last.length < 2 || last.length > 40) {
      return "Last name must be between 2 and 40 characters.";
    }

    if (bio.length > 250) {
      return "Bio must be 250 characters or fewer.";
    }

    return null;
  }

  async function saveChanges() {
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updated = await updateCitizenProfile({
        firstName,
        lastName,
        bio,
        avatar: avatar ?? undefined,
      });
      setProfile(updated);
      setAvatar(null);
      showToast("Profile updated successfully.");
      setTimeout(() => navigation.goBack(), 900);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (deleteText !== "DELETE") {
      setError("Type DELETE before confirming account deletion.");
      return;
    }

    if (!deletePassword.trim()) {
      setError("Password confirmation is required.");
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await deleteCitizenAccount({
        confirmation: deleteText,
        password: deletePassword,
      });
      setDeleteVisible(false);
      await logout();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete account.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.centerText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const avatarUri = avatar?.uri ?? profile?.avatarUrl;

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Edit Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {error ? (
          <View style={styles.errorBanner}>
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {toast ? (
          <View style={styles.successBanner}>
            <MaterialCommunityIcons name="check-circle-outline" size={18} color={colors.success} />
            <Text style={styles.successText}>{toast}</Text>
          </View>
        ) : null}

        <View style={styles.photoSection}>
          <Pressable style={styles.avatarShell} onPress={() => void chooseAvatar()}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{profile?.initials ?? "CK"}</Text>
            )}
            <View style={styles.cameraBadge}>
              <MaterialCommunityIcons name="camera-outline" size={18} color={colors.surface} />
            </View>
          </Pressable>
          <Text style={styles.photoHelp}>JPG, JPEG, or PNG. Maximum 5 MB.</Text>
        </View>

        <View style={styles.card}>
          <Field label="First Name" value={firstName} onChangeText={setFirstName} />
          <Field label="Last Name" value={lastName} onChangeText={setLastName} />
          <ReadonlyField
            label="Mobile Number"
            value={profile?.phone || "Not available"}
            helper="Mobile number can only be changed by a Ward Officer or Administrator."
          />
          <ReadonlyField
            label="Email Address"
            value={profile?.email || "Not available"}
            helper="Email address can only be changed by a Ward Officer or Administrator."
          />
          <View style={styles.fieldBlock}>
            <View style={styles.fieldHeader}>
              <Text style={styles.label}>Bio</Text>
              <Text style={styles.counter}>{bio.length}/250</Text>
            </View>
            <TextInput
              value={bio}
              onChangeText={(value) => setBio(value.slice(0, 250))}
              placeholder="Tell ward officers anything useful about you."
              placeholderTextColor={colors.textMuted}
              multiline
              style={[styles.input, styles.bioInput]}
            />
          </View>
          <ReadonlyField label="Ward" value={profile?.location.ward || "Not assigned"} />
          <ReadonlyField label="City" value={profile?.location.city || "Not assigned"} />
          <ReadonlyField label="Member Since" value={memberSince} />
        </View>

        <Pressable
          disabled={saving}
          style={[styles.primaryButton, saving ? styles.disabledButton : null]}
          onPress={() => void saveChanges()}
        >
          {saving ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryText}>Save Changes</Text>}
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryText}>Cancel</Text>
        </Pressable>

        <View style={styles.dangerSection}>
          <Text style={styles.dangerTitle}>Danger Zone</Text>
          <Text style={styles.dangerCopy}>Deleting your account is permanent and cannot be undone.</Text>
          <Pressable style={styles.dangerButton} onPress={() => setDeleteVisible(true)}>
            <MaterialCommunityIcons name="delete-outline" size={18} color={colors.error} />
            <Text style={styles.dangerButtonText}>Delete Account</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={deleteVisible} transparent animationType="fade" onRequestClose={() => setDeleteVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete account permanently?</Text>
            <Text style={styles.modalBody}>
              This will remove your account access and sign you out. Type DELETE and enter your password to continue.
            </Text>
            <TextInput
              value={deleteText}
              onChangeText={setDeleteText}
              placeholder="Type DELETE"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              autoCapitalize="characters"
            />
            <TextInput
              value={deletePassword}
              onChangeText={setDeletePassword}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              style={styles.input}
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setDeleteVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={deleting}
                style={[styles.modalDanger, deleting ? styles.disabledButton : null]}
                onPress={() => void confirmDelete()}
              >
                {deleting ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.modalDangerText}>Delete</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} style={styles.input} />
    </View>
  );
}

function ReadonlyField({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.readonlyBox}>
        <Text style={styles.readonlyText}>{value}</Text>
      </View>
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    minHeight: 66,
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  title: { flex: 1, color: colors.text, fontSize: 19, fontWeight: "900" },
  content: { paddingHorizontal: 18, paddingBottom: 34 },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  centerText: { color: colors.textMuted, fontSize: 13, fontWeight: "800" },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
    marginBottom: 12,
  },
  errorText: { flex: 1, color: colors.error, fontSize: 12, fontWeight: "800" },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#DCFCE7",
    marginBottom: 12,
  },
  successText: { flex: 1, color: "#166534", fontSize: 12, fontWeight: "900" },
  photoSection: { alignItems: "center", marginBottom: 18 },
  avatarShell: {
    width: 104,
    height: 104,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarImage: { width: "100%", height: "100%", borderRadius: 29 },
  avatarText: { color: colors.primary, fontSize: 34, fontWeight: "900" },
  cameraBadge: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.background,
  },
  photoHelp: { marginTop: 10, color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 14,
  },
  fieldBlock: { gap: 7 },
  fieldHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { color: colors.text, fontSize: 13, fontWeight: "900" },
  counter: { color: colors.textMuted, fontSize: 11, fontWeight: "800" },
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    color: colors.text,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: "700",
  },
  bioInput: { minHeight: 104, paddingTop: 12, textAlignVertical: "top" },
  readonlyBox: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#F8F6FC",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  readonlyText: { color: colors.textSecondary, fontSize: 14, fontWeight: "800" },
  helper: { color: colors.textMuted, fontSize: 11, fontWeight: "700", lineHeight: 16 },
  primaryButton: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    marginTop: 18,
  },
  primaryText: { color: colors.surface, fontSize: 15, fontWeight: "900" },
  secondaryButton: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: colors.primary, fontSize: 14, fontWeight: "900" },
  disabledButton: { opacity: 0.7 },
  dangerSection: {
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FFF7F7",
    padding: 16,
  },
  dangerTitle: { color: colors.error, fontSize: 14, fontWeight: "900" },
  dangerCopy: { color: colors.textSecondary, fontSize: 12, fontWeight: "700", lineHeight: 18, marginTop: 4 },
  dangerButton: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 },
  dangerButtonText: { color: colors.error, fontSize: 14, fontWeight: "900" },
  modalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(21,18,31,0.42)",
    padding: 20,
  },
  modalCard: { width: "100%", borderRadius: 18, backgroundColor: colors.surface, padding: 18, gap: 12 },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  modalBody: { color: colors.textMuted, fontSize: 13, fontWeight: "700", lineHeight: 19 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  modalCancel: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  modalCancelText: { color: colors.text, fontSize: 14, fontWeight: "900" },
  modalDanger: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.error,
  },
  modalDangerText: { color: colors.surface, fontSize: 14, fontWeight: "900" },
});
