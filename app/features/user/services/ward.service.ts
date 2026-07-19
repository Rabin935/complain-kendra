import { apiClient, getApiErrorMessage } from "../../../../src/lib/api";

export interface WardOption {
  id: string;
  wardNumber: string;
  wardName: string;
  city: string;
  municipality: string;
  province: string;
  area?: string;
  lat?: number;
  lng?: number;
}

const kathmanduWardAreas: Record<number, string> = {
  1: "Naxal",
  2: "Lazimpat",
  3: "Maharajgunj",
  4: "Baluwatar",
  5: "Hadigaun",
  6: "Boudha",
  7: "Mitra Park",
  8: "JayaBageshowri",
  9: "Gausala",
  10: "Baneshowr",
  11: "Bhag Durbar",
  12: "Teku",
  13: "Kalimati",
  14: "Kalanki",
  15: "Dallu",
  16: "Balaju",
  17: "Chhetrapati",
  18: "Naradevi",
  19: "Damaitol",
  20: "Bhimsensthan",
  21: "Jyawahal",
  22: "Tewahal",
  23: "Ombahal",
  24: "Makhan",
  25: "Masangalli",
  26: "Lainchaur",
  27: "MahaBoudha",
  28: "Old Buspark",
  29: "Anamnagar",
  30: "Gyaneshwor",
  31: "Shantinagar",
  32: "Koteshowr",
};

type WardCityConfig = {
  city: string;
  municipality: string;
  province: string;
  totalWards: number;
  areas?: Record<number, string>;
};

const wardCityConfigs: WardCityConfig[] = [
  {
    city: "Kathmandu",
    municipality: "Kathmandu Metropolitan City",
    province: "Bagmati Province",
    totalWards: 32,
    areas: kathmanduWardAreas,
  },
  {
    city: "Lalitpur",
    municipality: "Lalitpur Metropolitan City",
    province: "Bagmati Province",
    totalWards: 29,
    areas: {
      1: "Pulchowk",
      5: "Jawalakhel",
      10: "Kumaripati",
      15: "Lagankhel",
      26: "Sunakothi",
    },
  },
  {
    city: "Bhaktapur",
    municipality: "Bhaktapur Municipality",
    province: "Bagmati Province",
    totalWards: 17,
    areas: {
      1: "Suryabinayak",
      5: "Dattatreya",
      7: "Sallaghari",
      10: "Kamalbinayak",
      17: "Changunarayan Road",
    },
  },
];

const fallbackCities = wardCityConfigs.map((config) => config.city);

function getFallbackWards(city: string): WardOption[] {
  const config = wardCityConfigs.find(
    (item) => item.city.toLowerCase() === city.trim().toLowerCase(),
  );

  if (!config) {
    return [];
  }

  return Array.from({ length: config.totalWards }, (_, index) => {
    const wardNumber = String(index + 1);

    return {
      id: `${config.city.toLowerCase()}-ward-${wardNumber}`,
      wardNumber,
      wardName: `Ward ${wardNumber}`,
      city: config.city,
      municipality: config.municipality,
      province: config.province,
      area: config.areas?.[index + 1],
    };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringFrom(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numberFrom(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getCanonicalWardArea(city: string, wardNumber: string, fallback?: string): string | undefined {
  const normalizedCity = city.trim().toLowerCase();
  const parsedWardNumber = Number.parseInt(wardNumber, 10);

  if (normalizedCity === "kathmandu" && Number.isFinite(parsedWardNumber)) {
    return kathmanduWardAreas[parsedWardNumber] ?? fallback;
  }

  return fallback;
}

function normalizeWard(value: unknown): WardOption {
  const ward = isRecord(value) ? value : {};
  const wardNumber = stringFrom(ward.wardNumber ?? ward.ward_number);
  const city = stringFrom(ward.city);

  return {
    id: stringFrom(ward.id ?? ward._id),
    wardNumber,
    wardName: stringFrom(ward.wardName ?? ward.name, "Ward"),
    city,
    municipality: stringFrom(ward.municipality),
    province: stringFrom(ward.province),
    area: getCanonicalWardArea(city, wardNumber, stringFrom(ward.area) || undefined),
    lat: numberFrom(ward.lat),
    lng: numberFrom(ward.lng),
  };
}

export async function fetchWardCities(): Promise<string[]> {
  try {
    const response = await apiClient.get("/api/v1/wards/cities");
    const payload = response.data as { cities?: unknown };
    const cities = Array.isArray(payload.cities) ? payload.cities.map((city) => String(city)) : [];

    return cities.length ? cities : fallbackCities;
  } catch {
    return fallbackCities;
  }
}

export async function fetchWardsByCity(city: string): Promise<WardOption[]> {
  const fallbackWards = getFallbackWards(city);

  try {
    const response = await apiClient.get("/api/v1/wards", {
      params: { city },
    });
    const payload = response.data as { wards?: unknown };
    const wards = Array.isArray(payload.wards) ? payload.wards.map(normalizeWard) : [];
    const completeWards = wards.filter((ward) => ward.wardNumber && ward.wardName && ward.city);

    return completeWards.length ? completeWards : fallbackWards;
  } catch {
    return fallbackWards;
  }
}

export async function lookupWardForCoordinates(lat: number, lng: number): Promise<WardOption | null> {
  try {
    const response = await apiClient.post("/api/v1/wards/lookup", { lat, lng });
    const payload = response.data as { ward?: unknown };
    return payload.ward ? normalizeWard(payload.ward) : null;
  } catch (error) {
    console.warn("Ward lookup failed:", getApiErrorMessage(error));
    return null;
  }
}
