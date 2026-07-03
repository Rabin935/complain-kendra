import { coordinatesKey, isValidCoordinates } from "../utils/coordinate.utils";
import { TimedCache } from "../utils/timedCache";
import type { Coordinates, MapAddress } from "../types";

const reverseGeocodeCache = new TimedCache<MapAddress>(40, 10 * 60 * 1000);

interface NominatimAddress {
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  postcode?: string;
}

interface NominatimReverseResponse {
  display_name?: string;
  address?: NominatimAddress;
}

function extractWard(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const match = value.match(/ward\s*[-\s]?\d+/i);
  return match?.[0];
}

function normalizeAddress(data: NominatimReverseResponse): MapAddress {
  const address = data.address ?? {};
  const city = address.city || address.town || address.village;
  const municipality = address.municipality || address.county || city;
  const area = address.neighbourhood || address.suburb || address.road;
  const ward =
    extractWard(address.neighbourhood) ||
    extractWard(address.suburb) ||
    extractWard(address.road) ||
    extractWard(data.display_name);

  return {
    formattedAddress: data.display_name || "Unknown location",
    area,
    city,
    municipality,
    ward,
    province: address.state,
    postalCode: address.postcode,
  };
}

export async function reverseGeocode(coordinates: Coordinates): Promise<MapAddress> {
  if (!isValidCoordinates(coordinates)) {
    throw new Error("Invalid coordinates.");
  }

  const cacheKey = coordinatesKey(coordinates);
  const cached = reverseGeocodeCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(coordinates.lat),
    lon: String(coordinates.lng),
    addressdetails: "1",
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Reverse geocoding failed.");
  }

  const data = (await response.json()) as NominatimReverseResponse;
  const normalized = normalizeAddress(data);
  reverseGeocodeCache.set(cacheKey, normalized);
  return normalized;
}
