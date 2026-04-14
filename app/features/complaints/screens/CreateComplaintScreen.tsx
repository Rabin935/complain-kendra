import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors } from "../../../constants/colors";
import { useAuth } from "../../auth/context/AuthContext";
import {
  analyzeComplaint,
  createComplaint,
  uploadPhoto,
} from "../services/complaint.service";
import type { ComplaintCategory, CreateComplaintData } from "../types/complaint.types";

const CATEGORIES: ComplaintCategory[] = [
  "Road Damage",
  "Garbage",
  "Water Supply",
  "Electricity",
  "Drainage",
  "Other",
];

interface FormState {
  title: string;
  description: string;
  category: ComplaintCategory;
  location: string;
  photo?: {
    uri: string;
    name?: string;
    type?: string;
  };
}

const initialFormState: FormState = {
  title: "",
  description: "",
  category: "Other",
  location: "",
};

export default function CreateComplaintScreen() {
  const { token } = useAuth();
  const [form, setForm] = useState<FormState>(initialFormState);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);

  useEffect(() => {
    void getImagePermissions();
  }, []);

  async function getImagePermissions() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission denied", "Camera roll permission is required to upload photos.");
    }
  }

  async function pickImage() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 2],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setForm((prev) => ({
          ...prev,
          photo: {
            uri: asset.uri,
            name: asset.fileName || "complaint-photo.jpg",
            type: asset.type === "image" ? "image/jpeg" : "image/png",
          },
        }));
        setError(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to pick image.";
      Alert.alert("Error", message);
    }
  }

  async function handleAnalyze() {
    if (!form.description.trim()) {
      setError("Description is required for analysis.");
      return;
    }

    if (!token) {
      setError("Authentication token not available.");
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      // Upload photo if selected
      let photoUrl: string | undefined;
      if (form.photo) {
        photoUrl = await uploadPhoto({
          photo: form.photo,
          authToken: token,
        });
      }

      // Analyze complaint
      const result = await analyzeComplaint(form.description, photoUrl, token);

      if (result.analysis) {
        setForm((prev) => ({
          ...prev,
          title: result.analysis!.suggestedTitle,
          category: (result.analysis!.category as ComplaintCategory) || prev.category,
        }));
        Alert.alert(
          "AI Analysis Complete",
          `Title: ${result.analysis.suggestedTitle}\nCategory: ${result.analysis.category}\nSeverity: ${result.analysis.severity}/10`,
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to analyze complaint.";
      setError(message);
      Alert.alert("Analysis Failed", message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSubmit() {
    // Validation
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!form.description.trim()) {
      setError("Description is required.");
      return;
    }
    if (!form.location.trim()) {
      setError("Location is required.");
      return;
    }

    if (!token) {
      setError("Authentication token not available.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Upload photo if selected
      let photoUrl: string | undefined;
      if (form.photo) {
        photoUrl = await uploadPhoto({
          photo: form.photo,
          authToken: token,
        });
      }

      // Create complaint
      const data: CreateComplaintData = {
        title: form.title,
        description: form.description,
        category: form.category,
        photo: photoUrl,
        location: {
          address: form.location,
        },
      };

      const result = await createComplaint(data, token);

      if (result.success) {
        Alert.alert("Success", "Complaint submitted successfully!", [
          {
            text: "OK",
            onPress: () => {
              setForm(initialFormState);
              setError(null);
            },
          },
        ]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit complaint.";
      setError(message);
      Alert.alert("Submission Failed", message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.badge}>Report Center</Text>
            <Text style={styles.title}>Create Complaint</Text>
            <Text style={styles.subtitle}>Help us improve your city by providing details</Text>
          </View>

          {/* Error Alert */}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Photo Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Photo (Optional)</Text>
            {form.photo ? (
              <View style={styles.photoContainer}>
                <MaterialCommunityIcons name="check-circle" size={40} color={colors.success} />
                <Text style={styles.photoName}>{form.photo.name || "Photo selected"}</Text>
                <Pressable
                  style={styles.removePhotoButton}
                  onPress={() =>
                    setForm((prev) => ({
                      ...prev,
                      photo: undefined,
                    }))
                  }
                >
                  <Text style={styles.removePhotoText}>Remove</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.photoButton} onPress={pickImage}>
                <MaterialCommunityIcons name="camera-plus-outline" size={28} color={colors.primary} />
                <Text style={styles.photoButtonText}>Pick a photo</Text>
              </Pressable>
            )}
          </View>

          {/* Title */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              value={form.title}
              onChangeText={(value) => {
                setForm((prev) => ({ ...prev, title: value }));
                setError(null);
              }}
              placeholder="Brief title of the issue"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              maxLength={100}
            />
            <Text style={styles.charCount}>{form.title.length}/100</Text>
          </View>

          {/* Description */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              value={form.description}
              onChangeText={(value) => {
                setForm((prev) => ({ ...prev, description: value }));
                setError(null);
              }}
              placeholder="Provide detailed information about the issue"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.textArea]}
              multiline
              maxLength={1000}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{form.description.length}/1000</Text>
          </View>

          {/* Category Dropdown */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Category</Text>
            <Pressable
              style={styles.dropdown}
              onPress={() => setCategoryOpen(!categoryOpen)}
            >
              <Text style={styles.dropdownValue}>{form.category}</Text>
              <MaterialCommunityIcons
                name={categoryOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.text}
              />
            </Pressable>

            {categoryOpen ? (
              <View style={styles.dropdownMenu}>
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    style={[
                      styles.dropdownItem,
                      form.category === cat && styles.dropdownItemActive,
                    ]}
                    onPress={() => {
                      setForm((prev) => ({ ...prev, category: cat }));
                      setCategoryOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        form.category === cat && styles.dropdownItemActiveText,
                      ]}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>

          {/* Location */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Location</Text>
            <TextInput
              value={form.location}
              onChangeText={(value) => {
                setForm((prev) => ({ ...prev, location: value }));
                setError(null);
              }}
              placeholder="Enter location or address"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>

          {/* AI Analysis Button */}
          <Pressable
            style={[styles.analyzeButton, analyzing && styles.buttonDisabled]}
            onPress={handleAnalyze}
            disabled={analyzing}
          >
            {analyzing ? (
              <>
                <ActivityIndicator size="small" color={colors.surface} style={styles.buttonLoader} />
                <Text style={styles.analyzeButtonText}>Analyzing...</Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons name="wand-outline" size={18} color={colors.surface} />
                <Text style={styles.analyzeButtonText}>Analyze with AI ✨</Text>
              </>
            )}
          </Pressable>

          {/* Submit Button */}
          <Pressable
            style={[styles.submitButton, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <ActivityIndicator size="small" color={colors.surface} style={styles.buttonLoader} />
                <Text style={styles.submitButtonText}>Submitting...</Text>
              </>
            ) : (
              <Text style={styles.submitButtonText}>Submit Complaint</Text>
            )}
          </Pressable>

          <View style={styles.spacer} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 12,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 24,
    marginTop: 8,
  },
  badge: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  photoButton: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    borderStyle: "dashed",
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  photoButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
    marginTop: 8,
  },
  photoContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  photoName: {
    marginTop: 8,
    fontSize: 13,
    color: colors.text,
    fontWeight: "500",
  },
  removePhotoButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.error,
    borderRadius: 6,
  },
  removePhotoText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "600",
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.text,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  textArea: {
    minHeight: 100,
    paddingTop: 10,
  },
  charCount: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: "right",
  },
  dropdown: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
  },
  dropdownMenu: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginTop: 4,
    overflow: "hidden",
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemActive: {
    backgroundColor: colors.primaryLight,
  },
  dropdownItemText: {
    fontSize: 14,
    color: colors.text,
  },
  dropdownItemActiveText: {
    color: colors.primary,
    fontWeight: "600",
  },
  analyzeButton: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginVertical: 12,
    gap: 8,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 12,
    gap: 8,
  },
  analyzeButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "600",
  },
  submitButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "600",
  },
  errorText: {
    backgroundColor: "#FEE",
    color: colors.error,
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
    fontSize: 13,
    overflow: "hidden",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonLoader: {
    marginRight: 4,
  },
  spacer: {
    height: 20,
  },
});
