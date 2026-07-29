import { Text, TextInput } from "@/src/theme/typography";
import {
  MaterialCommunityIcons
} from "@expo/vector-icons";
import {
  CommonActions,
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute
} from "@react-navigation/native";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import {
  useEffect,
  useState
} from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getApiErrorMessage } from "../../../../src/lib/api";
import { colors } from "../../../constants/colors";
import { useTranslation } from "../../../i18n/LanguageContext";
import { useCitizenLabels } from "../../../i18n/useCitizenLabels";
import InteractiveMap from "../../map/components/InteractiveMap";
import type { SelectedMapLocation } from "../../map/types";
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
import type { UserStackParamList, UserTabParamList } from "../../user/types/user.types";
import { priorityColors, priorityLabels } from "../../user/utils/citizenUi";

type ReportNavigation = NavigationProp<UserStackParamList & UserTabParamList>;
type ReportRoute = RouteProp<UserStackParamList, "Report">;
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
const categoryEmojis: Record<CitizenComplaintCategory, string> = {
  road: "🚧",
  water: "💧",
  power: "⚡",
  waste: "🗑",
  trees: "🌿",
  other: "•••",
};

const photoCriticalCategories = new Set<CitizenComplaintCategory>(["road", "water", "waste", "trees"]);
const maxDescriptionLength = 500;
const maxPhotos = 4;
const maxPhotoSize = 10 * 1024 * 1024;
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const pinStep = 0.0005;

interface GeolocationPositionLike {
  coords: {
    latitude: number;
    longitude: number;
  };
}

interface ReverseGeocodeAddress {
  road?: string;
  locality?: string;
  neighbourhood?: string;
  suburb?: string;
  city_district?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
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
  ward?: string;
  wardId?: string;
  wardNumber?: string;
  city?: string;
} {
  const cityDistrictMatch = (address?.city_district ?? displayName).match(/\b([A-Za-z][A-Za-z\s]*)-(\d{1,2})\b/);

  if (cityDistrictMatch?.[1] && cityDistrictMatch[2]) {
    return {
      ward: `Ward ${cityDistrictMatch[2]}`,
      wardId: cityDistrictMatch[2],
      wardNumber: cityDistrictMatch[2],
      city: cityDistrictMatch[1].trim(),
    };
  }

  const wardMatch = displayName.match(/ward\s*(?:no\.?\s*)?[-\s]?(\d{1,2})/i);

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

  return {};
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
  const area = address?.locality ?? address?.neighbourhood ?? address?.suburb ?? address?.road ?? sampleLocation.area;
  const city =
    derivedWard.city ??
    address?.city ??
    address?.town ??
    address?.village ??
    address?.municipality ??
    sampleLocation.city;
  const resolvedWardName = derivedWard.ward ?? wardRecord?.wardName;
  const resolvedWardNumber = derivedWard.wardNumber ?? wardRecord?.wardNumber;

  return {
    address: displayName,
    area,
    ward: resolvedWardName ?? "Ward unavailable",
    wardId: derivedWard.wardId ?? wardRecord?.id ?? "",
    wardName: resolvedWardName,
    wardNumber: resolvedWardNumber,
    city,
    municipality: address?.municipality ?? address?.city ?? wardRecord?.municipality ?? sampleLocation.municipality,
    province: address?.state ?? wardRecord?.province ?? sampleLocation.province,
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

function buildLocationFromMapSelection(
  selection: SelectedMapLocation,
  currentLocation: CitizenLocation,
): CitizenLocation {
  const address = selection.address;
  const ward = selection.ward;
  const resolvedWard = address?.ward ?? ward?.wardName;
  const resolvedWardNumber = address?.wardNumber ?? ward?.wardNumber ?? address?.ward?.match(/\d+/)?.[0];

  return {
    ...currentLocation,
    address: address?.formattedAddress ?? currentLocation.address,
    area:
      address?.area ??
      address?.city ??
      address?.municipality ??
      currentLocation.area,
    ward: resolvedWard ?? "Ward unavailable",
    wardId: address?.wardNumber ?? ward?.wardId ?? "",
    wardName: resolvedWard,
    wardNumber: resolvedWardNumber,
    city: address?.city ?? ward?.district ?? currentLocation.city,
    municipality: address?.municipality ?? ward?.municipality ?? currentLocation.municipality,
    province: address?.province ?? ward?.province ?? currentLocation.province,
    lat: selection.coordinates.lat,
    lng: selection.coordinates.lng,
  };
}

function formatLocationTitle(location: CitizenLocation): string {
  return [location.area, location.city].filter(Boolean).join(", ") || location.address;
}

function formatLocationSubtitle(location: CitizenLocation, gpsLocked: boolean): string {
  return [location.ward, location.municipality ?? location.city, `GPS ${gpsLocked ? "locked" : "detecting"}`]
    .filter(Boolean)
    .join(" - ");
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
  const { t } = useTranslation("createComplaint");
  const { t: tc } = useTranslation("common");
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
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [pendingMapLocation, setPendingMapLocation] = useState<SelectedMapLocation | null>(null);
  const selectedMeta = category ? categoryMeta[category] : null;

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

    openMainTab("Home");
  }

  function continueFromStepOne() {
    if (validateStepOne()) {
      setStep(2);
    }
  }

  async function analyzeFromDraft() {
    if (!validateStepOne()) {
      return;
    }

    await continueFromStepTwo();
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
    const improvedDescription = result.data.improvedDescription?.trim();

    if (improvedDescription) {
      setDescription(improvedDescription.slice(0, maxDescriptionLength));
    }

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
      Alert.alert(t("permissionNeeded"), t("permissionNeeded"));
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
      Alert.alert(t("permissionNeeded"), t("permissionNeeded"));
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

  function openLocationPicker() {
    setPendingMapLocation({
      coordinates: {
        lat: location.lat,
        lng: location.lng,
      },
      source: "reset",
    });
    setLocationPickerOpen(true);
  }

  function closeLocationPicker() {
    setPendingMapLocation(null);
    setLocationPickerOpen(false);
  }

  function confirmLocationSelection() {
    const selectedLocation =
      pendingMapLocation ??
      {
        coordinates: {
          lat: location.lat,
          lng: location.lng,
        },
        source: "reset" as const,
      };

    setLocation((current) => buildLocationFromMapSelection(selectedLocation, current));
    setGpsLocked(true);
    setLocationHint("Location selected from map.");
    setErrors((current) => ({ ...current, location: undefined }));
    setLocationPickerOpen(false);
    setPendingMapLocation(null);
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

  async function submitComplaint(forceNew = false) {
    if (!category || !validateStepOne() || !validateStepTwo()) {
      setStep(!category || !title.trim() || !description.trim() ? 1 : 2);
      return;
    }

    if (!forceNew && aiResult?.duplicateCheck.isDuplicate && duplicateChoice !== "new") {
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
        continueAsNew: forceNew || duplicateChoice === "new",
      });
      setSuccessComplaint(result.data);
      setAiWarning(null);
      setErrors({});
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        const duplicate = (error.response.data as { duplicate?: {
          duplicate_complaint_no?: string;
          duplicate_title?: string;
        } })?.duplicate;
        const duplicateLabel = duplicate?.duplicate_complaint_no
          ? `${duplicate.duplicate_complaint_no} (${duplicate.duplicate_title ?? "nearby report"})`
          : "a nearby report";

        Alert.alert(
          "Similar complaint found",
          `This looks like it may match ${duplicateLabel} that's already open. Submit it as a new report anyway, or go back to follow the existing one instead.`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Submit as new", onPress: () => void submitComplaint(true) },
          ],
        );
        return;
      }

      Alert.alert(t("submissionFailed"), getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  function resetAndHome() {
    resetForm();
    openMainTab("Home");
  }

  function trackComplaint() {
    resetForm();
    openMainTab("Mine");
  }

  function openMainTab(screen: keyof UserTabParamList) {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: "MainTabs",
            params: { screen },
          },
        ],
      }),
    );
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
    const successAnalysis = successComplaint.aiAnalysis ?? aiResult;
    const successConfidence = successAnalysis?.confidence ?? aiResult?.confidence ?? 0;
    const successDepartment = successAnalysis?.department ?? aiResult?.department ?? "Ward Review Desk";
    const assignedWard = successComplaint.location.ward || location.ward || "your ward";

    return (
      <SafeAreaView edges={["top"]} style={styles.successSafeArea}>
        <ScrollView contentContainerStyle={styles.successContent} showsVerticalScrollIndicator={false}>
          <View style={styles.successHero}>
            <View style={styles.successMarkWrap}>
              <View style={styles.successRingInner} />
              <View style={styles.successRingOuter} />
              <View style={styles.successIcon}>
                <MaterialCommunityIcons name="check" size={68} color={colors.surface} />
              </View>
            </View>

            <Text style={styles.successTitle}>Report Submitted!</Text>
            <Text style={styles.successText}>
              Your complaint is now in the queue. We'll keep you posted as it moves forward.
            </Text>

            <View style={styles.successIdBadge}>
              <Text style={styles.successIdLabel}>Complaint ID</Text>
              <View style={styles.successIdDivider} />
              <Text style={styles.successId}>{successComplaint.complaintNo}</Text>
              <MaterialCommunityIcons name="content-copy" size={16} color={colors.textMuted} />
            </View>
          </View>

          <View style={styles.checklist}>
            <SuccessChecklistRow
              complete
              title="AI analysis completed"
              subtitle={successConfidence ? `${successConfidence}% confidence` : "Analysis saved"}
            />
            <SuccessChecklistRow
              complete
              title={`Assigned to ${assignedWard} Office`}
              subtitle={successDepartment}
            />
            <SuccessChecklistRow
              complete
              title="SMS & Email confirmation sent"
              subtitle="Just now"
            />
            <SuccessChecklistRow
              title="Awaiting ward officer review"
              subtitle="Within 24 hrs"
              last
            />
          </View>

          <Pressable style={styles.successPrimaryButton} onPress={trackComplaint}>
            <Text style={styles.successPrimaryText}>Track My Complaint</Text>
            <MaterialCommunityIcons name="arrow-right" size={18} color={colors.surface} />
          </Pressable>
          <Pressable style={styles.successHomeButton} onPress={resetAndHome}>
            <Text style={styles.successHomeText}>Back to Home</Text>
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
              <MaterialCommunityIcons name="arrow-left" size={20} color={colors.text} />
            </Pressable>
            <Text style={styles.title}>
              {step === 1 ? t("stepReport") : step === 2 ? t("stepLocation") : t("stepAi")}
            </Text>
            <Text style={styles.stepCount}>{step}/3</Text>
          </View>

          <View style={styles.progressSegments}>
            {[1, 2, 3].map((item) => (
              <View
                key={item}
                style={[styles.progressSegment, item <= step ? styles.progressSegmentActive : null]}
              />
            ))}
          </View>

          {step === 1 ? (
            <CreateDraftStep
              category={category}
              title={title}
              description={description}
              location={location}
              gpsLocked={gpsLocked}
              photos={photos}
              errors={errors}
              analyzing={analyzing}
              slowNetwork={slowNetwork}
              onCategoryChange={(nextCategory) => {
                setCategory(nextCategory);
                setErrors((current) => ({ ...current, category: undefined }));
              }}
              onTitleChange={(value) => {
                setTitle(value);
                setErrors((current) => ({ ...current, title: undefined }));
              }}
              onDescriptionChange={updateDescription}
              onPickGallery={() => void pickFromGallery()}
              onTakePhoto={() => void takePhoto()}
              onRemovePhoto={removePhoto}
              onOpenLocationPicker={openLocationPicker}
              onAnalyze={() => void analyzeFromDraft()}
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
              onOpenLocationPicker={openLocationPicker}
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

        <LocationPickerPopup
          visible={locationPickerOpen}
          location={location}
          pendingLocation={pendingMapLocation}
          onChange={setPendingMapLocation}
          onCancel={closeLocationPicker}
          onConfirm={confirmLocationSelection}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SuccessChecklistRow({
  complete,
  title,
  subtitle,
  last,
}: {
  complete?: boolean;
  title: string;
  subtitle: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.successChecklistRow, last ? styles.successChecklistRowLast : null]}>
      <View style={[styles.successChecklistIcon, complete ? styles.successChecklistIconComplete : null]}>
        <MaterialCommunityIcons
          name={complete ? "check" : "dots-horizontal"}
          size={complete ? 15 : 16}
          color={complete ? colors.surface : colors.textMuted}
        />
      </View>
      <View style={styles.successChecklistCopy}>
        <Text style={[styles.successChecklistTitle, !complete ? styles.successChecklistTitlePending : null]}>
          {title}
        </Text>
        <Text style={styles.successChecklistSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function CreateDraftStep({
  category,
  title,
  description,
  location,
  gpsLocked,
  photos,
  errors,
  analyzing,
  slowNetwork,
  onCategoryChange,
  onTitleChange,
  onDescriptionChange,
  onPickGallery,
  onTakePhoto,
  onRemovePhoto,
  onOpenLocationPicker,
  onAnalyze,
}: {
  category: CitizenComplaintCategory | null;
  title: string;
  description: string;
  location: CitizenLocation;
  gpsLocked: boolean;
  photos: ReportPhoto[];
  errors: ReportErrors;
  analyzing: boolean;
  slowNetwork: string | null;
  onCategoryChange: (category: CitizenComplaintCategory) => void;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onPickGallery: () => void;
  onTakePhoto: () => void;
  onRemovePhoto: (uri: string) => void;
  onOpenLocationPicker: () => void;
  onAnalyze: () => void;
}) {
  const { t } = useTranslation("createComplaint");
  const { categoryMeta } = useCitizenLabels();
  const { width } = useWindowDimensions();
  const photoSlots = Array.from({ length: maxPhotos });
  const categoryCardWidth = Math.floor((width - 64) / 3);

  return (
    <View style={styles.draftPanel}>
      <Text style={styles.formSectionLabel}>{t("chooseCategory")}</Text>
      <View style={styles.categoryGrid}>
        {categoryOrder.map((item) => {
          const meta = categoryMeta[item];
          const active = category === item;

          return (
            <Pressable
              key={item}
              style={[
                styles.categoryCard,
                { width: categoryCardWidth },
                active ? styles.categoryCardActive : null,
              ]}
              onPress={() => onCategoryChange(item)}
            >
              <View style={[styles.categoryIcon, { backgroundColor: active ? colors.surface : "#EEE8FA20" }]}>
                <Text style={styles.categoryEmoji}>{categoryEmojis[item]}</Text>
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
        <View style={[styles.iconInput, errors.title ? styles.inputError : null]}>
          <MaterialCommunityIcons name="note-text-outline" size={18} color={colors.textMuted} />
          <TextInput
            value={title}
            onChangeText={onTitleChange}
            placeholder={t("titlePlaceholder")}
            placeholderTextColor={colors.textMuted}
            style={styles.inlineInput}
            maxLength={90}
          />
        </View>
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
          placeholder={t("descriptionPlaceholder")}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, styles.textArea, errors.description ? styles.inputError : null]}
          multiline
          textAlignVertical="top"
          maxLength={maxDescriptionLength}
        />
        <View style={styles.fieldHintRow}>
          <Text style={styles.fieldHint}>Be specific - helps faster resolution</Text>
          <Text style={styles.fieldHint}>{description.length}/{maxDescriptionLength}</Text>
        </View>
        {errors.description ? <Text style={styles.errorText}>{errors.description}</Text> : null}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Location</Text>
        <Pressable style={styles.locationCardCompact} onPress={onOpenLocationPicker}>
          <View style={styles.locationIconCompact}>
            <MaterialCommunityIcons name="map-marker" size={18} color={colors.primary} />
          </View>
          <View style={styles.locationBody}>
            <Text style={styles.locationTitle} numberOfLines={1}>
              {formatLocationTitle(location)}
            </Text>
            <Text style={styles.locationSubtitle} numberOfLines={1}>
              {formatLocationSubtitle(location, gpsLocked)}
            </Text>
          </View>
          <MaterialCommunityIcons name="target" size={18} color={colors.primary} />
        </Pressable>
        {errors.location ? <Text style={styles.errorText}>{errors.location}</Text> : null}
      </View>

      <View style={styles.photoHeaderCompact}>
        <Text style={styles.label}>Add Photos <Text style={styles.labelMuted}>(up to 4)</Text></Text>
      </View>
      <View style={styles.photoStrip}>
        {photoSlots.map((_, index) => {
          const photo = photos[index];

          if (photo) {
            return (
              <View key={photo.uri} style={styles.photoTile}>
                <Image source={{ uri: photo.uri }} style={styles.photoTileImage} resizeMode="cover" />
                <Pressable style={styles.removePhotoCompact} onPress={() => onRemovePhoto(photo.uri)}>
                  <MaterialCommunityIcons name="close" size={12} color={colors.surface} />
                </Pressable>
              </View>
            );
          }

          if (index === photos.length) {
            return (
              <Pressable key={`camera-${index}`} style={styles.photoActionTilePrimary} onPress={onTakePhoto}>
                <MaterialCommunityIcons name="camera-outline" size={22} color={colors.primary} />
                <Text style={styles.photoActionTileTextPrimary}>Camera</Text>
              </Pressable>
            );
          }

          if (index === photos.length + 1) {
            return (
              <Pressable key={`gallery-${index}`} style={styles.photoActionTile} onPress={onPickGallery}>
                <MaterialCommunityIcons name="image-outline" size={22} color={colors.textSecondary} />
                <Text style={styles.photoActionTileText}>Gallery</Text>
              </Pressable>
            );
          }

          return <View key={`empty-${index}`} style={styles.photoPlaceholder} />;
        })}
      </View>
      {errors.photos ? <Text style={styles.errorText}>{errors.photos}</Text> : null}
      {slowNetwork ? <Text style={styles.warningText}>{slowNetwork}</Text> : null}

      <Pressable
        style={[styles.aiSubmitButtonShell, analyzing ? styles.buttonDisabled : null]}
        onPress={onAnalyze}
        disabled={analyzing}
      >
        <LinearGradient
          colors={["#7B4FC8", "#6038B0"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.aiSubmitButton}
        >
          {analyzing ? <ActivityIndicator color={colors.surface} /> : null}
          {analyzing ? null : (
            <MaterialCommunityIcons name="flash" size={18} color={colors.surface} />
          )}
          <Text style={styles.submitButtonText}>
            {analyzing ? t("analyzing") : t("analyzeWithAi")}
          </Text>
          {analyzing ? null : (
            <MaterialCommunityIcons name="arrow-right" size={18} color={colors.surface} />
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );
}

function LocationPickerPopup({
  visible,
  location,
  pendingLocation,
  onChange,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  location: CitizenLocation;
  pendingLocation: SelectedMapLocation | null;
  onChange: (location: SelectedMapLocation) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!visible) {
    return null;
  }

  const selectedAddress =
    pendingLocation?.address?.formattedAddress ??
    location.address;
  const selectedCoordinates = pendingLocation?.coordinates ?? {
    lat: location.lat,
    lng: location.lng,
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={styles.locationPickerCard}>
          <View style={styles.locationPickerHeader}>
            <View>
              <Text style={styles.locationPickerTitle}>Choose location</Text>
              <Text style={styles.locationPickerSubtitle}>Search, tap, or drag the marker.</Text>
            </View>
            <Pressable style={styles.locationPickerClose} onPress={onCancel}>
              <MaterialCommunityIcons name="close" size={18} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.locationPickerMap}>
            <InteractiveMap
              height={330}
              selectedLocation={selectedCoordinates}
              searchPlaceholder="Search area, ward, landmark..."
              showInfoPanel
              autoLocate={false}
              onLocationChange={onChange}
            />
          </View>

          <View style={styles.locationPickerSummary}>
            <MaterialCommunityIcons name="map-marker-check-outline" size={21} color={colors.primary} />
            <View style={styles.locationBody}>
              <Text style={styles.locationPickerAddress} numberOfLines={2}>
                {selectedAddress}
              </Text>
              <Text style={styles.locationPickerCoords}>
                {selectedCoordinates.lat.toFixed(6)}, {selectedCoordinates.lng.toFixed(6)}
              </Text>
            </View>
          </View>

          <View style={styles.locationPickerActions}>
            <Pressable style={styles.locationCancelButton} onPress={onCancel}>
              <Text style={styles.locationCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={styles.locationUseButton}
              onPress={onConfirm}
            >
              <Text style={styles.locationUseText}>Use Location</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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
  onOpenLocationPicker,
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
  onOpenLocationPicker: () => void;
  onAdjustPin: (deltaLat: number, deltaLng: number) => void;
  onAnalyze: () => void;
}) {
  const { t } = useTranslation("createComplaint");
  const photoRequired = Boolean(category && photoCriticalCategories.has(category));
  const mapTileUrl = getMapTileUrl(location.lat, location.lng);

  return (
    <View style={styles.stepPanel}>
      <Pressable style={styles.locationCard} onPress={onOpenLocationPicker}>
        <View style={styles.locationIcon}>
          <MaterialCommunityIcons
            name={gpsLocked ? "map-marker-check-outline" : "crosshairs-gps"}
            size={26}
            color={colors.primary}
          />
        </View>
        <View style={styles.locationBody}>
          <Text style={styles.locationTitle}>{formatLocationTitle(location)}</Text>
          <Text style={styles.locationSubtitle}>
            {formatLocationSubtitle(location, gpsLocked)}
          </Text>
          <Text style={styles.locationHint}>{locationHint}</Text>
        </View>
        <Pressable style={styles.smallButton} onPress={onRedetect}>
          <Text style={styles.smallButtonText}>Re-detect</Text>
        </Pressable>
      </Pressable>
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
        <Text style={styles.submitButtonText}>{analyzing ? t("analyzing") : t("analyzeWithAi")}</Text>
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
  const { t } = useTranslation("createComplaint");
  const meta = selectedMeta ?? categoryMeta[category];
  const detectedMeta = aiResult ? categoryMeta[aiResult.detectedCategory] : meta;
  const confidence = aiResult?.confidence ?? 0;
  const duplicatePercent = Math.round((aiResult?.duplicateCheck.similarityScore ?? 0) * 100);
  const duplicateLabel = aiResult?.duplicateCheck.isDuplicate ? `${duplicatePercent}%` : "None";
  const estimatedResolution = aiResult ? `${aiResult.etaDays}-${aiResult.etaDays + 2} days` : "Manual review";

  return (
    <View style={styles.analysisPanel}>
      <View style={styles.analysisHero}>
        <View style={styles.analysisGridOverlay} />
        <View style={styles.analysisGlow} />
        <View style={styles.analysisHeroContent}>
          <View style={styles.analysisHeroHeader}>
            <View style={styles.analysisHeroIcon}>
              <MaterialCommunityIcons name="lightning-bolt" size={18} color={colors.surface} />
            </View>
            <View style={styles.analysisHeroCopy}>
              <Text style={styles.analysisEyebrow}>
                {aiResult?.verified ? "AI Verified" : "AI Review"}
              </Text>
              <Text style={styles.analysisHeroStatus}>
                {aiResult ? "Analysis Complete" : "Manual Submit Available"}
              </Text>
            </View>
            <View style={styles.analysisMatchBadge}>
              <Text style={styles.analysisMatchText}>
                {aiResult ? `${confidence}% match` : "Review"}
              </Text>
            </View>
          </View>

          <Text style={styles.analysisHeroTitle} numberOfLines={2}>
            {aiResult ? `${detectedMeta.label} Detected` : title}
          </Text>
          <Text style={styles.analysisHeroDescription} numberOfLines={3}>
            {aiResult?.improvedDescription ??
              aiResult?.summary ??
              aiResult?.sizeEstimate ??
              "AI could not complete the automated review, but the report can still be submitted for manual assessment."}
          </Text>

          <View style={styles.analysisStatRow}>
            <AnalysisStat label="Confidence" value={aiResult ? `${confidence}%` : "-"} />
            <AnalysisStat label="Photos" value={`${photoCount} of ${maxPhotos}`} />
            <AnalysisStat label="Duplicate?" value={duplicateLabel} />
          </View>
        </View>
      </View>

      {aiWarning ? <Text style={styles.warningText}>{aiWarning}</Text> : null}

      <View style={styles.analysisInfoGrid}>
        <AnalysisInfoCard
          icon="tag-outline"
          label="Category"
          value={aiResult ? detectedMeta.label : meta.label}
          color={colors.primary}
        />
        <AnalysisInfoCard
          icon="alert-outline"
          label="Priority"
          value={aiResult ? priorityLabels[aiResult.priority] : "Manual"}
          color={aiResult ? priorityColors[aiResult.priority] : colors.warning}
        />
        <AnalysisInfoCard
          icon="bank-outline"
          label="Department"
          value={aiResult?.department ?? "Ward Office"}
          color={colors.primary}
        />
        <AnalysisInfoCard
          icon="clock-outline"
          label="Est. Resolution"
          value={estimatedResolution}
          color={colors.info}
        />
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
      ) : (
        <View style={styles.analysisDuplicateCard}>
          <View style={styles.analysisDuplicateTop}>
            <View style={styles.analysisDuplicateIcon}>
              <MaterialCommunityIcons name="radar" size={20} color={colors.primary} />
            </View>
            <View style={styles.analysisDuplicateCopy}>
              <Text style={styles.analysisDuplicateTitle}>No duplicates found</Text>
              <Text style={styles.analysisDuplicateText}>Scanned nearby reports in your ward</Text>
            </View>
            <MaterialCommunityIcons name="check-circle" size={23} color={colors.success} />
          </View>
        </View>
      )}

      {duplicateError ? <Text style={styles.errorText}>{duplicateError}</Text> : null}

      {slowNetwork ? <Text style={styles.warningText}>{slowNetwork}</Text> : null}

      <View style={styles.analysisActions}>
        <Pressable
          style={[styles.analysisSubmitButton, submitting ? styles.buttonDisabled : null]}
          onPress={onSubmit}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color={colors.surface} /> : null}
          <Text style={styles.analysisSubmitText}>
            {submitting ? t("submitting") : t("submitReport")}
          </Text>
          {!submitting ? <MaterialCommunityIcons name="arrow-right" size={18} color={colors.surface} /> : null}
        </Pressable>
        <Pressable style={styles.analysisEditButton} onPress={onEdit}>
          <MaterialCommunityIcons name="pencil-outline" size={15} color={colors.textMuted} />
          <Text style={styles.analysisEditText}>Edit details</Text>
        </Pressable>
      </View>
    </View>
  );
}

function AnalysisStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.analysisStat}>
      <Text style={styles.analysisStatLabel}>{label}</Text>
      <Text style={styles.analysisStatValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function AnalysisInfoCard({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.analysisInfoCard}>
      <View style={styles.analysisInfoHeader}>
        <MaterialCommunityIcons name={icon} size={15} color={color} />
        <Text style={styles.analysisInfoLabel}>{label}</Text>
      </View>
      <Text style={[styles.analysisInfoValue, { color }]} numberOfLines={2}>{value}</Text>
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
    backgroundColor: colors.surface,
  },
  keyboard: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 22,
    paddingBottom: 118,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingTop: 8,
    paddingBottom: 18,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 19,
    fontWeight: "900",
  },
  stepCount: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
  },
  progressSegments: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 20,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.border,
  },
  progressSegmentActive: {
    backgroundColor: colors.primary,
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
  draftPanel: {
    gap: 12,
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
  formSectionLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "800",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryCard: {
    minHeight: 88,
    borderRadius: 16,
    paddingHorizontal: 6,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 2,
    borderColor: colors.border,
  },
  categoryCardActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.16,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  categoryIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryEmoji: {
    fontSize: 20,
    color: colors.text,
    fontWeight: "800",
  },
  categoryLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "900",
  },
  categoryLabelActive: {
    color: colors.primaryDeep,
  },
  fieldGroup: {
    gap: 6,
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
  },
  labelMuted: {
    color: colors.textMuted,
    fontWeight: "600",
  },
  charCount: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
  },
  input: {
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  textArea: {
    minHeight: 88,
    lineHeight: 21,
  },
  iconInput: {
    minHeight: 50,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  inlineInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  fieldHintRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  fieldHint: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
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
  aiSubmitButtonShell: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: colors.primary,
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    marginTop: 2,
  },
  aiSubmitButton: {
    minHeight: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
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
  locationCardCompact: {
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1.5,
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
  locationIconCompact: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEE8FA",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 18,
    backgroundColor: "rgba(21,18,31,0.42)",
  },
  locationPickerCard: {
    maxHeight: "90%",
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: colors.surface,
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.24,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 14,
  },
  locationPickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  locationPickerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  locationPickerSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  locationPickerClose: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationPickerMap: {
    height: 330,
    backgroundColor: "#DCD3F0",
  },
  locationPickerSummary: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  locationPickerAddress: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
  },
  locationPickerCoords: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3,
  },
  locationPickerActions: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    paddingTop: 4,
  },
  locationCancelButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationCancelText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "900",
  },
  locationUseButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  locationUseText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "900",
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
  photoHeaderCompact: {
    marginTop: 2,
  },
  photoStrip: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  photoTile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#FEF3C7",
  },
  photoTileImage: {
    width: "100%",
    height: "100%",
  },
  removePhotoCompact: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  photoActionTilePrimary: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    backgroundColor: colors.primaryLight,
  },
  photoActionTile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    backgroundColor: colors.surfaceMuted,
  },
  photoPlaceholder: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
  },
  photoActionTileTextPrimary: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: "900",
  },
  photoActionTileText: {
    color: colors.textMuted,
    fontSize: 9,
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
  analysisPanel: {
    paddingTop: 4,
    gap: 18,
  },
  analysisHero: {
    minHeight: 224,
    borderRadius: 24,
    padding: 20,
    overflow: "hidden",
    backgroundColor: colors.primaryDeep,
  },
  analysisGridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  analysisGlow: {
    position: "absolute",
    top: -46,
    right: -42,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(196,181,253,0.24)",
  },
  analysisHeroContent: {
    position: "relative",
    gap: 13,
  },
  analysisHeroHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  analysisHeroIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
  },
  analysisHeroCopy: {
    flex: 1,
  },
  analysisEyebrow: {
    color: "rgba(255,255,255,0.66)",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  analysisHeroStatus: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 1,
  },
  analysisMatchBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(34,197,94,0.22)",
    borderWidth: 1,
    borderColor: "rgba(134,239,172,0.42)",
  },
  analysisMatchText: {
    color: "#86EFAC",
    fontSize: 11,
    fontWeight: "900",
  },
  analysisHeroTitle: {
    color: colors.surface,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 27,
  },
  analysisHeroDescription: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 20,
  },
  analysisStatRow: {
    flexDirection: "row",
    gap: 8,
  },
  analysisStat: {
    flex: 1,
    minHeight: 58,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  analysisStatLabel: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 10,
    fontWeight: "800",
  },
  analysisStatValue: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 3,
  },
  analysisInfoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  analysisInfoCard: {
    width: "48.3%",
    minHeight: 88,
    borderRadius: 16,
    padding: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  analysisInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 7,
  },
  analysisInfoLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  analysisInfoValue: {
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20,
  },
  analysisDuplicateCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  analysisDuplicateTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  analysisDuplicateIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEE8FA",
  },
  analysisDuplicateIconWarning: {
    backgroundColor: "#FFFBEB",
  },
  analysisDuplicateCopy: {
    flex: 1,
  },
  analysisDuplicateTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  analysisDuplicateText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
    marginTop: 2,
  },
  analysisActions: {
    gap: 10,
  },
  analysisSubmitButton: {
    minHeight: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  analysisSubmitText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "900",
  },
  analysisEditButton: {
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  analysisEditText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "900",
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
  successSafeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  successContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
    backgroundColor: colors.surface,
  },
  successHero: {
    flexGrow: 1,
    minHeight: 388,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 12,
  },
  successMarkWrap: {
    position: "relative",
    width: 180,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  successRingInner: {
    position: "absolute",
    width: 154,
    height: 154,
    borderRadius: 77,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#EEE8FA",
  },
  successRingOuter: {
    position: "absolute",
    width: 206,
    height: 206,
    borderRadius: 103,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(96,56,176,0.12)",
  },
  successIcon: {
    width: 116,
    height: 116,
    borderRadius: 58,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16A34A",
    shadowColor: "#16A34A",
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 10,
  },
  successTitle: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 10,
  },
  successText: {
    maxWidth: 300,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "600",
    textAlign: "center",
  },
  successIdBadge: {
    marginTop: 22,
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "#EEE8FA",
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  successIdLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  successIdDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.border,
  },
  successId: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  checklist: {
    alignSelf: "stretch",
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 4,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  successChecklistRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  successChecklistRowLast: {
    borderBottomWidth: 0,
  },
  successChecklistIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.border,
  },
  successChecklistIconComplete: {
    backgroundColor: colors.success,
    borderWidth: 0,
    borderStyle: "solid",
  },
  successChecklistCopy: {
    flex: 1,
  },
  successChecklistTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  successChecklistTitlePending: {
    color: colors.textSecondary,
  },
  successChecklistSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  successPrimaryButton: {
    minHeight: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    marginBottom: 10,
  },
  successPrimaryText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "900",
  },
  successHomeButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  successHomeText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "900",
  },
});
