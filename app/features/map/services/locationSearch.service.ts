import type { LocationSearchResult, MapAddress } from "../types";
import { TimedCache } from "../utils/timedCache";

const searchCache = new TimedCache<LocationSearchResult[]>(30, 10 * 60 * 1000);

interface NominatimSearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city_district?: string;
    locality?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    postcode?: string;
    neighbourhood?: string;
    suburb?: string;
    road?: string;
  };
}

function extractWard(value: string | undefined): string | undefined {
  const wardMatch = value?.match(/ward\s*(?:no\.?\s*)?[-\s]?(\d{1,2})/i);

  if (wardMatch?.[1]) {
    return `Ward ${wardMatch[1]}`;
  }

  const districtMatch = value?.match(/\b[A-Za-z][A-Za-z\s]*-(\d{1,2})\b/);
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

function normalizeAddress(result: NominatimSearchResult): MapAddress {
  const address = result.address ?? {};
  const cityDistrict = extractCityDistrict(address.city_district || result.display_name);
  const city = cityDistrict.city || address.city || address.town || address.village;
  const ward = cityDistrict.ward || extractWard(address.city_district) || extractWard(result.display_name);

  return {
    formattedAddress: result.display_name,
    area: address.locality || address.neighbourhood || address.suburb || address.road,
    city,
    district: cityDistrict.city || address.town || address.city,
    municipality: municipalityForCity(cityDistrict.city) || address.municipality || address.city || address.county || city,
    ward,
    wardNumber: cityDistrict.wardNumber || ward?.match(/\d+/)?.[0],
    province: address.state,
    postalCode: address.postcode,
  };
}

export async function searchLocations(query: string): Promise<LocationSearchResult[]> {
  const trimmed = query.trim();

  if (trimmed.length < 2) {
    return [];
  }

  const cacheKey = trimmed.toLowerCase();
  const cached = searchCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const params = new URLSearchParams({
    format: "jsonv2",
    q: trimmed,
    countrycodes: "np",
    addressdetails: "1",
    limit: "6",
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Location search failed.");
  }

  const data = (await response.json()) as NominatimSearchResult[];
  const results = data
    .map((item) => ({
      id: String(item.place_id),
      label: item.display_name,
      coordinates: {
        lat: Number(item.lat),
        lng: Number(item.lon),
      },
      address: normalizeAddress(item),
    }))
    .filter((item) => Number.isFinite(item.coordinates.lat) && Number.isFinite(item.coordinates.lng));

  searchCache.set(cacheKey, results);
  return results;
}
