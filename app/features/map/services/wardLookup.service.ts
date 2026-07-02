import type { Coordinates, WardLookupResult } from "../types";

export interface WardLookupService {
  lookupWard: (coordinates: Coordinates) => Promise<WardLookupResult | null>;
}

export const mockWardLookupService: WardLookupService = {
  async lookupWard(coordinates) {
    const isKathmanduArea =
      coordinates.lat > 27.55 &&
      coordinates.lat < 27.85 &&
      coordinates.lng > 85.2 &&
      coordinates.lng < 85.45;

    if (!isKathmanduArea) {
      return null;
    }

    return {
      wardId: "kathmandu-ward-12",
      wardNumber: "12",
      wardName: "Ward 12",
      municipality: "Kathmandu Metropolitan City",
      district: "Kathmandu",
      province: "Bagmati Province",
    };
  },
};
