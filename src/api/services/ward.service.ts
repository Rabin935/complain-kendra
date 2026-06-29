import { AppError } from "../utils/appError";

type Coordinates = {
  lat: number;
  lng: number;
};

export type WardMatch = {
  wardId: string;
  wardName: string;
};

type WardPolygon = WardMatch & {
  polygon: Coordinates[];
};

const MOCK_WARD_BOUNDARIES: WardPolygon[] = [
  {
    wardId: "ward-10",
    wardName: "Ward 10",
    polygon: [
      { lat: 27.695, lng: 85.305 },
      { lat: 27.695, lng: 85.33 },
      { lat: 27.71, lng: 85.33 },
      { lat: 27.71, lng: 85.305 },
    ],
  },
  {
    wardId: "ward-11",
    wardName: "Ward 11",
    polygon: [
      { lat: 27.695, lng: 85.33 },
      { lat: 27.695, lng: 85.355 },
      { lat: 27.71, lng: 85.355 },
      { lat: 27.71, lng: 85.33 },
    ],
  },
  {
    wardId: "ward-12",
    wardName: "Ward 12",
    polygon: [
      { lat: 27.71, lng: 85.305 },
      { lat: 27.71, lng: 85.335 },
      { lat: 27.73, lng: 85.335 },
      { lat: 27.73, lng: 85.305 },
    ],
  },
  {
    wardId: "ward-13",
    wardName: "Ward 13",
    polygon: [
      { lat: 27.71, lng: 85.335 },
      { lat: 27.71, lng: 85.365 },
      { lat: 27.73, lng: 85.365 },
      { lat: 27.73, lng: 85.335 },
    ],
  },
];

function isValidCoordinate(value: number, fieldName: string): void {
  if (!Number.isFinite(value)) {
    throw new AppError(`${fieldName} must be a valid number.`, 400);
  }
}

function isPointInsidePolygon(point: Coordinates, polygon: Coordinates[]): boolean {
  let isInside = false;

  for (let currentIndex = 0, previousIndex = polygon.length - 1;
    currentIndex < polygon.length;
    previousIndex = currentIndex++) {
    const currentPoint = polygon[currentIndex];
    const previousPoint = polygon[previousIndex];

    const intersects =
      currentPoint.lng > point.lng !== previousPoint.lng > point.lng &&
      point.lat <
        ((previousPoint.lat - currentPoint.lat) * (point.lng - currentPoint.lng)) /
          (previousPoint.lng - currentPoint.lng) +
          currentPoint.lat;

    if (intersects) {
      isInside = !isInside;
    }
  }

  return isInside;
}

export function resolveWardFromCoordinates(
  latitude: number,
  longitude: number,
): WardMatch | undefined {
  isValidCoordinate(latitude, "Latitude");
  isValidCoordinate(longitude, "Longitude");

  return MOCK_WARD_BOUNDARIES.find((ward) =>
    isPointInsidePolygon({ lat: latitude, lng: longitude }, ward.polygon),
  );
}
