export interface WardSeedRecord {
  wardNumber: string;
  name: string;
  city: string;
  municipality: string;
  province: string;
  area?: string;
  lat: number;
  lng: number;
}

type CitySeedConfig = {
  city: string;
  municipality: string;
  province: string;
  totalWards: number;
  center: {
    lat: number;
    lng: number;
  };
  areas?: Record<number, string>;
};

const CITY_SEED_CONFIGS: CitySeedConfig[] = [
  {
    city: "Kathmandu",
    municipality: "Kathmandu Metropolitan City",
    province: "Bagmati Province",
    totalWards: 32,
    center: { lat: 27.7172, lng: 85.324 },
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
    center: { lat: 27.6644, lng: 85.3188 },
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
    center: { lat: 27.671, lng: 85.4298 },
    areas: {
      1: "Suryabinayak",
      5: "Dattatreya",
      7: "Sallaghari",
      10: "Kamalbinayak",
      17: "Changunarayan Road",
    },
  },
];

function roundCoordinate(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function buildWardLatLng(center: { lat: number; lng: number }, index: number) {
  const row = Math.floor(index / 6);
  const column = index % 6;
  const latOffset = (row - 2) * 0.0048;
  const lngOffset = (column - 2.5) * 0.0056;

  return {
    lat: roundCoordinate(center.lat + latOffset),
    lng: roundCoordinate(center.lng + lngOffset),
  };
}

export const WARD_SEED_DATA: WardSeedRecord[] = CITY_SEED_CONFIGS.flatMap((config) =>
  Array.from({ length: config.totalWards }, (_, index) => {
    const wardNumber = String(index + 1);
    const coordinates = buildWardLatLng(config.center, index);
    const area = config.areas?.[index + 1];

    return {
      wardNumber,
      name: `Ward ${wardNumber}`,
      city: config.city,
      municipality: config.municipality,
      province: config.province,
      area,
      lat: coordinates.lat,
      lng: coordinates.lng,
    };
  }),
);
