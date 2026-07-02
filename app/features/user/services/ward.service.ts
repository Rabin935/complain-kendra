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
    areas: {
      10: "Baneshwor",
      12: "Koteshwor",
      16: "Naxal",
      22: "New Road",
      31: "Shantinagar",
    },
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

function normalizeWard(value: unknown): WardOption {
  const ward = isRecord(value) ? value : {};

  return {
    id: stringFrom(ward.id ?? ward._id),
    wardNumber: stringFrom(ward.wardNumber ?? ward.ward_number),
    wardName: stringFrom(ward.wardName ?? ward.name, "Ward"),
    city: stringFrom(ward.city),
    municipality: stringFrom(ward.municipality),
    province: stringFrom(ward.province),
    area: stringFrom(ward.area) || undefined,
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
