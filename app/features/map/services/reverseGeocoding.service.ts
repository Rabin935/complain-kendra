import { coordinatesKey, isValidCoordinates } from "../utils/coordinate.utils";
import { TimedCache } from "../utils/timedCache";
import type { Coordinates, MapAddress } from "../types";

const reverseGeocodeCache = new TimedCache<MapAddress>(40, 10 * 60 * 1000);

interface NominatimAddress {
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

  const wardMatch = value.match(/ward\s*(?:no\.?\s*)?[-\s]?(\d{1,2})/i);

  if (wardMatch?.[1]) {
    return `Ward ${wardMatch[1]}`;
  }

  const districtMatch = value.match(/\b[A-Za-z][A-Za-z\s]*-(\d{1,2})\b/);
  return districtMatch?.[1] ? `Ward ${districtMatch[1]}` : undefined;
}

function extractCityDistrict(value: string | undefined): { city?: string; ward?: string; wardNumber?: string } {
  const match = value?.match(/\b([A-Za-z][A-Za-z\s]*)-(\d{1,2})\b/);

  if (!match?.[1] || !match[2]) {
    return {};
  }

  return {
    city: match[1].trim(),
    ward: `Ward ${match[2]}`,
    wardNumber: match[2],
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

function normalizeAddress(data: NominatimReverseResponse): MapAddress {
  const address = data.address ?? {};
  const cityDistrict = extractCityDistrict(address.city_district || data.display_name);
  const city = cityDistrict.city || address.city || address.town || address.village;
  const municipality = municipalityForCity(cityDistrict.city) || address.municipality || address.city || address.county || city;
  const area = address.locality || address.neighbourhood || address.suburb || address.road;
  const ward =
    cityDistrict.ward ||
    extractWard(address.city_district) ||
    extractWard(address.neighbourhood) ||
    extractWard(address.suburb) ||
    extractWard(address.road) ||
    extractWard(data.display_name);

  return {
    formattedAddress: data.display_name || "Unknown location",
    area,
    city,
    district: cityDistrict.city || address.town || address.city,
    municipality,
    ward,
    wardNumber: cityDistrict.wardNumber || ward?.match(/\d+/)?.[0],
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
