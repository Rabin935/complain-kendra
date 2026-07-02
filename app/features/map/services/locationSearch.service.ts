import type { LocationSearchResult, MapAddress } from "../types";
import { TimedCache } from "../utils/timedCache";

const searchCache = new TimedCache<LocationSearchResult[]>(30, 10 * 60 * 1000);

interface NominatimSearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
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

function normalizeAddress(result: NominatimSearchResult): MapAddress {
  const address = result.address ?? {};
  const city = address.city || address.town || address.village;

  return {
    formattedAddress: result.display_name,
    city,
    municipality: address.municipality || address.county || city,
    ward: address.neighbourhood || address.suburb,
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
