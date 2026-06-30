import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationProp, RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  type DimensionValue,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../../constants/colors";
import { categoryMeta, sampleLocation } from "../../user/data/citizenSampleData";
import {
  analyzeReportDraft,
  followComplaint,
  submitCitizenComplaint,
} from "../../user/services/citizen.service";
import { lookupWardForCoordinates } from "../../user/services/ward.service";
import type {
  AiAnalysisResult,
  CitizenComplaint,
  CitizenComplaintCategory,
  CitizenLocation,
  CreateReportPayload,
  ReportPhoto,
} from "../../user/types/citizen.types";
import type { UserTabParamList } from "../../user/types/user.types";
import { priorityColors, priorityLabels } from "../../user/utils/citizenUi";

type ReportNavigation = NavigationProp<UserTabParamList>;
type ReportRoute = RouteProp<UserTabParamList, "Report">;
type Step = 1 | 2 | 3;
type ReportErrors = Partial<Record<"category" | "title" | "description" | "location" | "photos", string>>;

const categoryOrder: CitizenComplaintCategory[] = [
  "road",
  "water",
  "power",
  "waste",
  "trees",
  "other",
];

const photoCriticalCategories = new Set<CitizenComplaintCategory>(["road", "water", "waste", "trees"]);
const maxDescriptionLength = 500;
const maxPhotos = 4;
const maxPhotoSize = 10 * 1024 * 1024;
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/heic", "image/heif"]);
const pinStep = 0.0005;

interface GeolocationPositionLike {
  coords: {
    latitude: number;
    longitude: number;
  };
}

interface ReverseGeocodeAddress {
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
}

interface ReverseGeocodeResult {
  display_name?: string;
  address?: ReverseGeocodeAddress;
}

function hasNavigatorGeolocation(): boolean {
  return Boolean(
    typeof navigator !== "undefined" &&
      "geolocation" in navigator &&
      navigator.geolocation,
  );
}

function getCurrentCoordinates(): Promise<{ lat: number; lng: number }> {
  if (!hasNavigatorGeolocation()) {
    return Promise.reject(new Error("Device geolocation is unavailable on this platform."));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position: GeolocationPositionLike) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => reject(new Error("Location permission was denied or timed out.")),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      },
    );
  });
}

function getWardFromAddress(address: ReverseGeocodeAddress | undefined, displayName: string): {
  ward: string;
  wardId: string;
  wardNumber: string;
} {
  const wardMatch = displayName.match(/ward\s*(?:no\.?\s*)?(\d+)/i);

  if (wardMatch?.[1]) {
    return {
      ward: `Ward ${wardMatch[1]}`,
      wardId: wardMatch[1],
      wardNumber: wardMatch[1],
    };
  }

  const countyMatch = address?.county?.match(/\d+/);

  if (countyMatch?.[0]) {
    return {
      ward: `Ward ${countyMatch[0]}`,
      wardId: countyMatch[0],
      wardNumber: countyMatch[0],
    };
  }

  return {
    ward: sampleLocation.ward,
    wardId: sampleLocation.wardId,
    wardNumber: sampleLocation.wardNumber ?? "12",
  };
}

async function reverseGeocodeCoordinates(lat: number, lng: number): Promise<CitizenLocation> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
  );

  if (!response.ok) {
    throw new Error("Reverse geocoding failed.");
  }

  const result = (await response.json()) as ReverseGeocodeResult;
  const address = result.address;
  const displayName = result.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  const derivedWard = getWardFromAddress(address, displayName);
  const wardRecord = await lookupWardForCoordinates(lat, lng);
  const area = address?.neighbourhood ?? address?.suburb ?? address?.road ?? sampleLocation.area;
  const city =
    address?.city ??
    address?.town ??
    address?.village ??
    address?.municipality ??
    sampleLocation.city;

  return {
    address: displayName,
    area,
    ward: wardRecord?.wardName ?? derivedWard.ward,
    wardId: wardRecord?.id ?? derivedWard.wardId,
    wardName: wardRecord?.wardName ?? derivedWard.ward,
    wardNumber: wardRecord?.wardNumber ?? derivedWard.wardNumber,
    city: wardRecord?.city ?? city,
    municipality: wardRecord?.municipality ?? sampleLocation.municipality,
    province: wardRecord?.province ?? sampleLocation.province,
    lat,
    lng,
  };
}

function buildFallbackLocation(lat: number, lng: number, currentLocation: CitizenLocation): CitizenLocation {
  return {
    ...currentLocation,
    address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    lat,
    lng,
  };
}

function getMapTileUrl(lat: number, lng: number, zoom = 16): string {
  const latitudeRad = (lat * Math.PI) / 180;
  const tileCount = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * tileCount);
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latitudeRad) + 1 / Math.cos(latitudeRad)) / Math.PI) / 2) *
      tileCount,
  );

  return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
}

export default function CreateComplaintScreen() {
  const navigation = useNavigation<ReportNavigation>();
  const route = useRoute<ReportRoute>();
  const [step, setStep] = useState<Step>(1);
  const [category, setCategory] = useState<CitizenComplaintCategory | null>(route.params?.category ?? null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(sampleLocation);
  const [gpsLocked, setGpsLocked] = useState(true);
  const [locationHint, setLocationHint] = useState("Detecting your current location...");
  const [photos, setPhotos] = useState<ReportPhoto[]>([]);
  const [errors, setErrors] = useState<ReportErrors>({});
  const [aiResult, setAiResult] = useState<AiAnalysisResult | null>(null);
  const [aiWarning, setAiWarning] = useState<string | null>(null);
  const [duplicateChoice, setDuplicateChoice] = useState<"followed" | "new" | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [slowNetwork, setSlowNetwork] = useState<string | null>(null);
  const [successComplaint, setSuccessComplaint] = useState<CitizenComplaint | null>(null);
  const selectedMeta = category ? categoryMeta[category] : null;

  const progressWidth = useMemo<DimensionValue>(() => `${(step / 3) * 100}%` as DimensionValue, [step]);

  useEffect(() => {
    if (route.params?.category) {
      setCategory(route.params.category);
    }
  }, [route.params?.category]);

  useEffect(() => {
    void redetectLocation();
  }, []);

  useEffect(() => {
    if (!analyzing && !submitting) {
      setSlowNetwork(null);
      return undefined;
    }

    const timeout = setTimeout(() => {
      setSlowNetwork("Slow network detected. We will keep trying in the background.");
    }, 3500);

    return () => clearTimeout(timeout);
  }, [analyzing, submitting]);

  function updateDescription(value: string) {
    setErrors((current) => ({ ...current, description: undefined }));
    setDescription(value.slice(0, maxDescriptionLength));
  }

  function validateStepOne(): boolean {
    const nextErrors: ReportErrors = {};

    if (!category) {
      nextErrors.category = "Category is required.";
    }

    if (!title.trim()) {
      nextErrors.title = "Title is required.";
    }

    if (!description.trim()) {
      nextErrors.description = "Description is required.";
    }

    if (description.length > maxDescriptionLength) {
      nextErrors.description = "Description must be 500 characters or fewer.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateStepTwo(): boolean {
    const nextErrors: ReportErrors = {};

    if (!location.lat || !location.lng) {
      nextErrors.location = "Location is required.";
    }

    if (category && photoCriticalCategories.has(category) && photos.length === 0) {
      nextErrors.photos = "Add at least one photo for this category.";
    }

    const oversized = photos.find((photo) => photo.size && photo.size > maxPhotoSize);

    if (oversized) {
      nextErrors.photos = "Each photo must be under 10MB.";
    }

    const unsupported = photos.find((photo) => photo.type && !allowedMimeTypes.has(photo.type));

    if (unsupported) {
      nextErrors.photos = "Supported formats: JPEG, PNG, HEIC.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function goBack() {
    if (successComplaint) {
      setSuccessComplaint(null);
      setStep(1);
      return;
    }

    if (step > 1) {
      setStep((current) => (current - 1) as Step);
      return;
    }

    navigation.navigate("Home");
  }

  function continueFromStepOne() {
    if (validateStepOne()) {
      setStep(2);
    }
  }

  async function continueFromStepTwo() {
    if (!category || !validateStepTwo()) {
      return;
    }

    setAnalyzing(true);
    setAiWarning(null);
    setDuplicateChoice(null);

    const payload = buildPayload(category);
    const result = await analyzeReportDraft(payload);
    setAiResult(result.data);

    if (result.error) {
      setAiWarning("AI failed to reach the live service. Manual submit is still allowed.");
    }

    setAnalyzing(false);
    setStep(3);
  }

  function buildPayload(nextCategory: CitizenComplaintCategory): CreateReportPayload {
    return {
      category: nextCategory,
      title: title.trim(),
      description: description.trim(),
      lat: location.lat,
      lng: location.lng,
      address: location.address,
      area: location.area,
      ward: location.ward,
      wardId: location.wardId,
      wardNumber: location.wardNumber,
      city: location.city,
      municipality: location.municipality,
      province: location.province,
      photos,
    };
  }

  async function pickFromGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission needed", "Gallery permission is required to upload report photos.");
      return;
    }

    const remaining = maxPhotos - photos.length;

    if (remaining <= 0) {
      setErrors((current) => ({ ...current, photos: "Maximum 4 photos allowed." }));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.82,
    });

    if (!result.canceled) {
      addPhotos(result.assets.map(normalizeAsset));
    }
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission needed", "Camera permission is required to capture report photos.");
      return;
    }

    if (photos.length >= maxPhotos) {
      setErrors((current) => ({ ...current, photos: "Maximum 4 photos allowed." }));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.82,
    });

    if (!result.canceled && result.assets[0]) {
      addPhotos([normalizeAsset(result.assets[0])]);
    }
  }

  function addPhotos(nextPhotos: ReportPhoto[]) {
    const allowed = [...photos, ...nextPhotos].slice(0, maxPhotos);
    setPhotos(allowed);
    setErrors((current) => ({ ...current, photos: undefined }));
  }

  function removePhoto(uri: string) {
    setPhotos((current) => current.filter((photo) => photo.uri !== uri));
  }

  async function applyCoordinates(lat: number, lng: number, mode: "gps" | "manual") {
    setGpsLocked(false);
    setLocationHint(mode === "gps" ? "Detecting your GPS position..." : "Updating selected pin...");

    try {
      const resolvedLocation = await reverseGeocodeCoordinates(lat, lng);
      setLocation(resolvedLocation);
      setLocationHint(
        mode === "gps"
          ? "GPS locked and address detected."
          : "Manual pin adjusted and address refreshed.",
      );
      setGpsLocked(true);
      setErrors((current) => ({ ...current, location: undefined }));
    } catch {
      setLocation((current) => buildFallbackLocation(lat, lng, current));
      setLocationHint("Coordinates saved. Address lookup is temporarily unavailable.");
      setGpsLocked(true);
      setErrors((current) => ({ ...current, location: undefined }));
    }
  }

  async function redetectLocation() {
    setGpsLocked(false);
    setLocationHint("Requesting location permission...");

    try {
      const coordinates = await getCurrentCoordinates();
      await applyCoordinates(coordinates.lat, coordinates.lng, "gps");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to detect your current location.";
      setGpsLocked(true);
      setLocationHint(message);
      setErrors((current) => ({
        ...current,
        location: `${message} You can adjust the pin manually.`,
      }));
    }
  }

  function adjustPin(deltaLat: number, deltaLng: number) {
    const nextLat = Number((location.lat + deltaLat).toFixed(6));
    const nextLng = Number((location.lng + deltaLng).toFixed(6));
    void applyCoordinates(nextLat, nextLng, "manual");
  }

  async function followDuplicate() {
    const duplicateId = aiResult?.duplicateCheck.complaintId;

    if (!duplicateId) {
      setErrors((current) => ({
        ...current,
        photos: "Could not find the existing complaint to follow.",
      }));
      return;
    }

    await followComplaint(duplicateId, true);
    setDuplicateChoice("followed");
  }

  async function submitComplaint() {
    if (!category || !validateStepOne() || !validateStepTwo()) {
      setStep(!category || !title.trim() || !description.trim() ? 1 : 2);
      return;
    }

    if (aiResult?.duplicateCheck.isDuplicate && duplicateChoice !== "new") {
      setErrors((current) => ({
        ...current,
        photos: "Choose whether to follow the existing complaint or continue as new.",
      }));
      return;
    }

    setSubmitting(true);

    try {
      const result = await submitCitizenComplaint({
        ...buildPayload(category),
        continueAsNew: duplicateChoice === "new",
      });
      setSuccessComplaint(result.data);
      setAiWarning(null);
      setErrors({});
    } catch (error) {
      const message = error instanceof Error ? error.message : "Submission failed. Please retry.";
      Alert.alert("Submission Failed", message);
    } finally {
      setSubmitting(false);
    }
  }

  function resetAndHome() {
    resetForm();
    navigation.navigate("Home");
  }

  function trackComplaint() {
    resetForm();
    navigation.navigate("Mine");
  }

  function resetForm() {
    setStep(1);
    setCategory(route.params?.category ?? null);
    setTitle("");
    setDescription("");
    setPhotos([]);
    setAiResult(null);
    setDuplicateChoice(null);
    setSuccessComplaint(null);
    setErrors({});
  }

  if (successComplaint) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.successContent} showsVerticalScrollIndicator={false}>
          <View style={styles.successIcon}>
            <MaterialCommunityIcons name="check-circle-outline" size={54} color={colors.success} />
          </View>
          <Text style={styles.successTitle}>Your complaint has been submitted</Text>
          <Text style={styles.successId}>{successComplaint.complaintNo}</Text>
          <Text style={styles.successText}>SMS and email confirmation sent to your account.</Text>

          <View style={styles.checklist}>
            {[
              "SMS & email confirmation sent",
              "Ward officer review",
              "Status updates will appear in My Complaints",
            ].map((item) => (
              <View key={item} style={styles.checklistRow}>
                <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={20} color={colors.success} />
                <Text style={styles.checklistText}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={styles.successPoints}>
            <MaterialCommunityIcons name="star-circle-outline" size={22} color={colors.warning} />
            <Text style={styles.successPointsText}>+50 points awarded for verified civic reporting</Text>
          </View>

          <Pressable style={styles.submitButton} onPress={trackComplaint}>
            <Text style={styles.submitButtonText}>Track My Complaint</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={resetAndHome}>
            <Text style={styles.secondaryButtonText}>Back to Home</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={goBack}>
              <MaterialCommunityIcons name="arrow-left" size={22} color={colors.primary} />
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={styles.stepText}>Step {step}/3</Text>
              <Text style={styles.title}>
                {step === 1 ? "Report an Issue" : step === 2 ? "Location & Photos" : "AI Analysis"}
              </Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: progressWidth }]} />
          </View>

          {step === 1 ? (
            <StepOne
              category={category}
              title={title}
              description={description}
              errors={errors}
              onCategoryChange={(nextCategory) => {
                setCategory(nextCategory);
                setErrors((current) => ({ ...current, category: undefined }));
              }}
              onTitleChange={(value) => {
                setTitle(value);
                setErrors((current) => ({ ...current, title: undefined }));
              }}
              onDescriptionChange={updateDescription}
              onContinue={continueFromStepOne}
            />
          ) : null}

          {step === 2 ? (
            <StepTwo
              category={category}
              photos={photos}
              gpsLocked={gpsLocked}
              location={location}
              locationHint={locationHint}
              errors={errors}
              onPickGallery={() => void pickFromGallery()}
              onTakePhoto={() => void takePhoto()}
              onRemovePhoto={removePhoto}
              onRedetect={redetectLocation}
              onAdjustPin={adjustPin}
              onAnalyze={() => void continueFromStepTwo()}
              analyzing={analyzing}
              slowNetwork={slowNetwork}
            />
          ) : null}

          {step === 3 && category ? (
            <StepThree
              category={category}
              selectedMeta={selectedMeta}
              title={title}
              locationText={`${location.area} - ${location.ward} - ${location.city}`}
              photoCount={photos.length}
              aiResult={aiResult}
              aiWarning={aiWarning}
              duplicateChoice={duplicateChoice}
              submitting={submitting}
              slowNetwork={slowNetwork}
              duplicateError={errors.photos}
              onEdit={() => setStep(1)}
              onFollowDuplicate={() => void followDuplicate()}
              onContinueNew={() => {
                setDuplicateChoice("new");
                setErrors((current) => ({ ...current, photos: undefined }));
              }}
              onSubmit={() => void submitComplaint()}
            />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StepOne({
  category,
  title,
  description,
  errors,
  onCategoryChange,
  onTitleChange,
  onDescriptionChange,
  onContinue,
}: {
  category: CitizenComplaintCategory | null;
  title: string;
  description: string;
  errors: ReportErrors;
  onCategoryChange: (category: CitizenComplaintCategory) => void;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onContinue: () => void;
}) {
  return (
    <View style={styles.stepPanel}>
      <Text style={styles.sectionTitle}>Category</Text>
      <View style={styles.categoryGrid}>
        {categoryOrder.map((item) => {
          const meta = categoryMeta[item];
          const active = category === item;

          return (
            <Pressable
              key={item}
              style={[styles.categoryCard, active ? styles.categoryCardActive : null]}
              onPress={() => onCategoryChange(item)}
            >
              <View style={[styles.categoryIcon, { backgroundColor: active ? colors.surface : meta.softColor }]}>
                <MaterialCommunityIcons
                  name={meta.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                  size={22}
                  color={active ? colors.primary : meta.color}
                />
              </View>
              <Text style={[styles.categoryLabel, active ? styles.categoryLabelActive : null]}>
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {errors.category ? <Text style={styles.errorText}>{errors.category}</Text> : null}

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          value={title}
          onChangeText={onTitleChange}
          placeholder="Example: Large pothole on Ring Road"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, errors.title ? styles.inputError : null]}
          maxLength={90}
        />
        {errors.title ? <Text style={styles.errorText}>{errors.title}</Text> : null}
      </View>

      <View style={styles.fieldGroup}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Description</Text>
          <Text style={styles.charCount}>{description.length}/{maxDescriptionLength}</Text>
        </View>
        <TextInput
          value={description}
          onChangeText={onDescriptionChange}
          placeholder="Describe what happened, where it is, and why it needs action."
          placeholderTextColor={colors.textMuted}
          style={[styles.input, styles.textArea, errors.description ? styles.inputError : null]}
          multiline
          textAlignVertical="top"
          maxLength={maxDescriptionLength}
        />
        {errors.description ? <Text style={styles.errorText}>{errors.description}</Text> : null}
      </View>

      <Pressable style={styles.submitButton} onPress={onContinue}>
        <Text style={styles.submitButtonText}>Continue</Text>
        <MaterialCommunityIcons name="arrow-right" size={20} color={colors.surface} />
      </Pressable>
    </View>
  );
}

function StepTwo({
  category,
  photos,
  gpsLocked,
  location,
  locationHint,
  errors,
  analyzing,
  slowNetwork,
  onPickGallery,
  onTakePhoto,
  onRemovePhoto,
  onRedetect,
  onAdjustPin,
  onAnalyze,
}: {
  category: CitizenComplaintCategory | null;
  photos: ReportPhoto[];
  gpsLocked: boolean;
  location: CitizenLocation;
  locationHint: string;
  errors: ReportErrors;
  analyzing: boolean;
  slowNetwork: string | null;
  onPickGallery: () => void;
  onTakePhoto: () => void;
  onRemovePhoto: (uri: string) => void;
  onRedetect: () => void;
  onAdjustPin: (deltaLat: number, deltaLng: number) => void;
  onAnalyze: () => void;
}) {
  const photoRequired = Boolean(category && photoCriticalCategories.has(category));
  const mapTileUrl = getMapTileUrl(location.lat, location.lng);

  return (
    <View style={styles.stepPanel}>
      <View style={styles.locationCard}>
        <View style={styles.locationIcon}>
          <MaterialCommunityIcons
            name={gpsLocked ? "map-marker-check-outline" : "crosshairs-gps"}
            size={26}
            color={colors.primary}
          />
        </View>
        <View style={styles.locationBody}>
          <Text style={styles.locationTitle}>{location.address}</Text>
          <Text style={styles.locationSubtitle}>
            {location.ward} - {location.area} - GPS {gpsLocked ? "locked" : "detecting"}
          </Text>
          <Text style={styles.locationHint}>{locationHint}</Text>
        </View>
        <Pressable style={styles.smallButton} onPress={onRedetect}>
          <Text style={styles.smallButtonText}>Re-detect</Text>
        </Pressable>
      </View>
      {errors.location ? <Text style={styles.errorText}>{errors.location}</Text> : null}

      <View style={styles.mapPreviewCard}>
        <Image source={{ uri: mapTileUrl }} style={styles.mapTile} resizeMode="cover" />
        <View style={styles.mapOverlay} />
        <View style={styles.pinMarker}>
          <MaterialCommunityIcons name="map-marker" size={34} color={colors.error} />
        </View>
        <View style={styles.coordinateBadge}>
          <Text style={styles.coordinateText}>
            {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
          </Text>
        </View>
      </View>

      <View style={styles.pinControls}>
        <Pressable style={styles.pinButton} onPress={() => onAdjustPin(pinStep, 0)}>
          <MaterialCommunityIcons name="arrow-up" size={18} color={colors.primary} />
        </Pressable>
        <View style={styles.pinMiddleRow}>
          <Pressable style={styles.pinButton} onPress={() => onAdjustPin(0, -pinStep)}>
            <MaterialCommunityIcons name="arrow-left" size={18} color={colors.primary} />
          </Pressable>
          <View style={styles.pinCenter}>
            <MaterialCommunityIcons name="crosshairs-gps" size={18} color={colors.primary} />
          </View>
          <Pressable style={styles.pinButton} onPress={() => onAdjustPin(0, pinStep)}>
            <MaterialCommunityIcons name="arrow-right" size={18} color={colors.primary} />
          </Pressable>
        </View>
        <Pressable style={styles.pinButton} onPress={() => onAdjustPin(-pinStep, 0)}>
          <MaterialCommunityIcons name="arrow-down" size={18} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Photos</Text>
          <Text style={styles.sectionHint}>
            {photoRequired ? "At least 1 photo required" : "Recommended, up to 4 photos"}
          </Text>
        </View>
        <Text style={styles.photoCount}>{photos.length}/{maxPhotos}</Text>
      </View>

      <View style={styles.photoActions}>
        <Pressable style={styles.photoAction} onPress={onTakePhoto}>
          <MaterialCommunityIcons name="camera-plus-outline" size={22} color={colors.primary} />
          <Text style={styles.photoActionText}>Camera</Text>
        </Pressable>
        <Pressable style={styles.photoAction} onPress={onPickGallery}>
          <MaterialCommunityIcons name="image-plus" size={22} color={colors.primary} />
          <Text style={styles.photoActionText}>Gallery</Text>
        </Pressable>
      </View>

      {photos.length ? (
        <View style={styles.photoGrid}>
          {photos.map((photo, index) => (
            <View key={photo.uri} style={styles.photoPreview}>
              <MaterialCommunityIcons name="image-outline" size={24} color={colors.primary} />
              <Text style={styles.photoPreviewText}>Photo {index + 1}</Text>
              <Pressable style={styles.removePhoto} onPress={() => onRemovePhoto(photo.uri)}>
                <MaterialCommunityIcons name="close" size={14} color={colors.surface} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.photoEmpty}>
          <MaterialCommunityIcons name="image-multiple-outline" size={30} color={colors.textMuted} />
          <Text style={styles.photoEmptyText}>JPEG, PNG, or HEIC under 10MB each.</Text>
        </View>
      )}

      {errors.photos ? <Text style={styles.errorText}>{errors.photos}</Text> : null}
      {slowNetwork ? <Text style={styles.warningText}>{slowNetwork}</Text> : null}

      <Pressable
        style={[styles.submitButton, analyzing ? styles.buttonDisabled : null]}
        onPress={onAnalyze}
        disabled={analyzing}
      >
        {analyzing ? (
          <ActivityIndicator color={colors.surface} />
        ) : (
          <MaterialCommunityIcons name="auto-fix" size={20} color={colors.surface} />
        )}
        <Text style={styles.submitButtonText}>{analyzing ? "AI analyzing..." : "Analyze with AI"}</Text>
      </Pressable>
    </View>
  );
}

function StepThree({
  category,
  selectedMeta,
  title,
  locationText,
  photoCount,
  aiResult,
  aiWarning,
  duplicateChoice,
  submitting,
  slowNetwork,
  duplicateError,
  onEdit,
  onFollowDuplicate,
  onContinueNew,
  onSubmit,
}: {
  category: CitizenComplaintCategory;
  selectedMeta: (typeof categoryMeta)[CitizenComplaintCategory] | null;
  title: string;
  locationText: string;
  photoCount: number;
  aiResult: AiAnalysisResult | null;
  aiWarning: string | null;
  duplicateChoice: "followed" | "new" | null;
  submitting: boolean;
  slowNetwork: string | null;
  duplicateError?: string;
  onEdit: () => void;
  onFollowDuplicate: () => void;
  onContinueNew: () => void;
  onSubmit: () => void;
}) {
  const meta = selectedMeta ?? categoryMeta[category];

  return (
    <View style={styles.stepPanel}>
      <View style={styles.aiCard}>
        <View style={styles.aiHeader}>
          <View style={styles.aiIcon}>
            <MaterialCommunityIcons name="auto-fix" size={24} color={colors.surface} />
          </View>
          <View>
            <Text style={styles.aiTitle}>AI verification</Text>
            <Text style={styles.aiSubtitle}>
              {aiResult?.verified ? "Verified complaint signal" : "Manual review available"}
            </Text>
          </View>
        </View>

        {aiWarning ? <Text style={styles.warningText}>{aiWarning}</Text> : null}

        {aiResult ? (
          <View style={styles.aiGrid}>
            <AiMetric label="Detected" value={categoryMeta[aiResult.detectedCategory].label} />
            <AiMetric label="Confidence" value={`${aiResult.confidence}%`} />
            <AiMetric label="Severity" value={aiResult.severityLabel} />
            <AiMetric label="Priority" value={priorityLabels[aiResult.priority]} color={priorityColors[aiResult.priority]} />
            <AiMetric label="Department" value={aiResult.department} wide />
            <AiMetric label="ETA" value={`${aiResult.etaDays} days`} />
            {aiResult.sizeEstimate ? <AiMetric label="Size" value={aiResult.sizeEstimate} wide /> : null}
          </View>
        ) : (
          <Text style={styles.aiSubtitle}>AI failed but manual submit is allowed.</Text>
        )}
      </View>

      {aiResult?.duplicateCheck.isDuplicate ? (
        <View style={styles.duplicateCard}>
          <MaterialCommunityIcons name="alert-outline" size={22} color={colors.warning} />
          <View style={styles.duplicateBody}>
            <Text style={styles.duplicateTitle}>Similar complaint already exists nearby</Text>
            <Text style={styles.duplicateText}>
              {aiResult.duplicateCheck.complaintNo} · {aiResult.duplicateCheck.title} · {aiResult.duplicateCheck.distanceMeters}m away · {Math.round((aiResult.duplicateCheck.similarityScore ?? 0) * 100)}% similar
            </Text>
            <View style={styles.duplicateActions}>
              <Pressable
                style={[styles.duplicateButton, duplicateChoice === "followed" ? styles.duplicateButtonActive : null]}
                onPress={onFollowDuplicate}
              >
                <Text
                  style={[
                    styles.duplicateButtonText,
                    duplicateChoice === "followed" ? styles.duplicateButtonTextActive : null,
                  ]}
                >
                  Follow existing complaint
                </Text>
              </Pressable>
              <Pressable
                style={[styles.duplicateButton, duplicateChoice === "new" ? styles.duplicateButtonActive : null]}
                onPress={onContinueNew}
              >
                <Text
                  style={[
                    styles.duplicateButtonText,
                    duplicateChoice === "new" ? styles.duplicateButtonTextActive : null,
                  ]}
                >
                  Continue as new report
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {duplicateError ? <Text style={styles.errorText}>{duplicateError}</Text> : null}

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Confirmation summary</Text>
        <View style={styles.summaryRow}>
          <MaterialCommunityIcons
            name={meta.icon as keyof typeof MaterialCommunityIcons.glyphMap}
            size={18}
            color={meta.color}
          />
          <Text style={styles.summaryText}>{title}</Text>
        </View>
        <View style={styles.summaryRow}>
          <MaterialCommunityIcons name="tag-outline" size={18} color={colors.primary} />
          <Text style={styles.summaryText}>{meta.label}</Text>
        </View>
        <View style={styles.summaryRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={18} color={colors.primary} />
          <Text style={styles.summaryText}>{locationText}</Text>
        </View>
        <View style={styles.summaryRow}>
          <MaterialCommunityIcons name="image-outline" size={18} color={colors.primary} />
          <Text style={styles.summaryText}>{photoCount} photo{photoCount === 1 ? "" : "s"}</Text>
        </View>
      </View>

      {slowNetwork ? <Text style={styles.warningText}>{slowNetwork}</Text> : null}

      <View style={styles.finalActions}>
        <Pressable style={styles.secondaryButton} onPress={onEdit}>
          <Text style={styles.secondaryButtonText}>Edit Report</Text>
        </Pressable>
        <Pressable
          style={[styles.submitButton, submitting ? styles.buttonDisabled : null]}
          onPress={onSubmit}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color={colors.surface} /> : null}
          <Text style={styles.submitButtonText}>
            {submitting ? "Submitting..." : "Submit Complaint"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function AiMetric({
  label,
  value,
  color,
  wide,
}: {
  label: string;
  value: string;
  color?: string;
  wide?: boolean;
}) {
  return (
    <View style={[styles.aiMetric, wide ? styles.aiMetricWide : null]}>
      <Text style={styles.aiMetricLabel}>{label}</Text>
      <Text style={[styles.aiMetricValue, color ? { color } : null]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function normalizeAsset(asset: ImagePicker.ImagePickerAsset): ReportPhoto {
  const name = asset.fileName ?? asset.uri.split("/").pop() ?? "complaint-photo.jpg";
  const lowerName = name.toLowerCase();
  const type =
    asset.mimeType ??
    (lowerName.endsWith(".png")
      ? "image/png"
      : lowerName.endsWith(".heic") || lowerName.endsWith(".heif")
        ? "image/heic"
        : "image/jpeg");

  return {
    uri: asset.uri,
    name,
    type,
    size: asset.fileSize,
  };
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboard: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 118,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerCopy: {
    flex: 1,
  },
  stepText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900",
    marginTop: 3,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  stepPanel: {
    paddingTop: 18,
    gap: 16,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  sectionHint: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryCard: {
    width: "31.4%",
    minHeight: 98,
    borderRadius: 20,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryCardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  categoryLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  categoryLabelActive: {
    color: colors.surface,
  },
  fieldGroup: {
    gap: 7,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  charCount: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
  },
  input: {
    minHeight: 52,
    borderRadius: 17,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  textArea: {
    minHeight: 136,
    lineHeight: 20,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: "#FFF7F7",
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: "800",
  },
  warningText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
  submitButton: {
    minHeight: 54,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  submitButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "900",
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "900",
  },
  buttonDisabled: {
    opacity: 0.68,
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEE7FA",
  },
  locationBody: {
    flex: 1,
    gap: 4,
  },
  locationTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  locationSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  locationHint: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
  },
  smallButton: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  smallButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  mapAdjustCard: {
    minHeight: 48,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 14,
    backgroundColor: "#EEE7FA",
    borderWidth: 1,
    borderColor: "#DED2F2",
  },
  mapAdjustText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "900",
  },
  mapPreviewCard: {
    height: 178,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapTile: {
    width: "100%",
    height: "100%",
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(96,56,176,0.06)",
  },
  pinMarker: {
    position: "absolute",
    left: "50%",
    top: "50%",
    marginLeft: -17,
    marginTop: -32,
  },
  coordinateBadge: {
    position: "absolute",
    left: 12,
    bottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  coordinateText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "900",
  },
  pinControls: {
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pinMiddleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pinButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEE7FA",
    borderWidth: 1,
    borderColor: "#DED2F2",
  },
  pinCenter: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  photoCount: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900",
  },
  photoActions: {
    flexDirection: "row",
    gap: 10,
  },
  photoAction: {
    flex: 1,
    minHeight: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoActionText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900",
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  photoPreview: {
    width: "48.5%",
    minHeight: 92,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoPreviewText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 6,
  },
  removePhoto: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.error,
  },
  photoEmpty: {
    minHeight: 96,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.surface,
  },
  photoEmptyText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
  },
  aiCard: {
    padding: 16,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  aiIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  aiTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  aiSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  aiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  aiMetric: {
    width: "48.3%",
    padding: 12,
    borderRadius: 17,
    backgroundColor: colors.surfaceMuted,
  },
  aiMetricWide: {
    width: "100%",
  },
  aiMetricLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  aiMetricValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 5,
    lineHeight: 18,
  },
  duplicateCard: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 22,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  duplicateBody: {
    flex: 1,
  },
  duplicateTitle: {
    color: "#92400E",
    fontSize: 14,
    fontWeight: "900",
  },
  duplicateText: {
    color: "#A16207",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 4,
  },
  duplicateActions: {
    gap: 8,
    marginTop: 12,
  },
  duplicateButton: {
    minHeight: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  duplicateButtonActive: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
  },
  duplicateButtonText: {
    color: "#92400E",
    fontSize: 12,
    fontWeight: "900",
  },
  duplicateButtonTextActive: {
    color: colors.surface,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  summaryTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  summaryText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "800",
  },
  finalActions: {
    gap: 10,
  },
  successContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 118,
    alignItems: "center",
  },
  successIcon: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DCFCE7",
    marginBottom: 18,
  },
  successTitle: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
    textAlign: "center",
  },
  successId: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 10,
  },
  successText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
  },
  checklist: {
    alignSelf: "stretch",
    gap: 12,
    marginTop: 24,
    padding: 16,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checklistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checklistText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "800",
  },
  successPoints: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
    marginBottom: 20,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  successPointsText: {
    flex: 1,
    color: "#92400E",
    fontSize: 12,
    fontWeight: "900",
  },
});
