import type { Coordinates, MapAddress, WardLookupResult } from "../types";
import { apiClient, getApiErrorMessage } from "../../../../src/lib/api";

export interface WardLookupService {
  lookupWard: (coordinates: Coordinates, address?: MapAddress) => Promise<WardLookupResult | null>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringFrom(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function normalizeWard(value: unknown): WardLookupResult | null {
  if (!isRecord(value)) {
    return null;
  }

  const wardNumber = stringFrom(value.wardNumber ?? value.ward_number);
  const wardName = stringFrom(value.wardName ?? value.name, wardNumber ? `Ward ${wardNumber}` : "");
  const wardId = stringFrom(value.id ?? value._id);
  const municipality = stringFrom(value.municipality);
  const district = stringFrom(value.district ?? value.city);
  const province = stringFrom(value.province);

  if (!wardNumber || !wardName) {
    return null;
  }

  return {
    wardId: wardId || `${district.toLowerCase()}-ward-${wardNumber}`,
    wardNumber,
    wardName,
    municipality,
    district,
    province,
  };
}

function municipalityForCity(city: string | undefined): string | undefined {
  const normalized = city?.trim().toLowerCase();

  if (normalized === "kathmandu") {
    return "Kathmandu Metropolitan City";
  }

  if (normalized === "lalitpur") {
    return "Lalitpur Metropolitan City";
  }

  if (normalized === "bhaktapur") {
    return "Bhaktapur Municipality";
  }

  return undefined;
}

export const wardLookupService: WardLookupService = {
  async lookupWard(coordinates, address) {
    if (address?.wardNumber || address?.ward) {
      const wardNumber = address.wardNumber ?? address.ward?.match(/\d+/)?.[0];

      if (wardNumber) {
        return {
          wardId: `${(address.district ?? address.city ?? "ward").toLowerCase()}-ward-${wardNumber}`,
          wardNumber,
          wardName: `Ward ${wardNumber}`,
          municipality: municipalityForCity(address.district ?? address.city) ?? address.municipality ?? address.city ?? "",
          district: address.district ?? address.city ?? "",
          province: address.province ?? "",
        };
      }
    }

    try {
      const response = await apiClient.post("/api/v1/wards/lookup", {
        lat: coordinates.lat,
        lng: coordinates.lng,
      });
      const payload = response.data as { ward?: unknown };
      return normalizeWard(payload.ward);
    } catch (error) {
      console.warn("Ward lookup failed:", getApiErrorMessage(error));
      return null;
    }
  },
};
