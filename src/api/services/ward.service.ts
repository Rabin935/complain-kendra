import { Types } from "mongoose";
import WardModel from "../models/Ward";
import type { WardLocation } from "../types";
import { AppError } from "../utils/appError";
import { getNumber, getString, isRecord } from "../utils/request.utils";

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineDistanceKm(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
): number {
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(end.lat - start.lat);
  const deltaLng = toRadians(end.lng - start.lng);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(start.lat)) *
      Math.cos(toRadians(end.lat)) *
      Math.sin(deltaLng / 2) ** 2;

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function toWardPayload(ward: {
  _id: { toString(): string };
  wardNumber: string;
  name: string;
  city: string;
  municipality: string;
  province: string;
  area?: string;
  lat?: number;
  lng?: number;
}) {
  return {
    id: ward._id.toString(),
    wardNumber: ward.wardNumber,
    wardName: ward.name,
    name: ward.name,
    city: ward.city,
    municipality: ward.municipality,
    province: ward.province,
    area: ward.area,
    lat: ward.lat,
    lng: ward.lng,
  };
}

export function buildWardLocation(
  ward: {
    _id: { toString(): string };
    wardNumber: string;
    name: string;
    city: string;
    municipality: string;
    province: string;
    area?: string;
    lat?: number;
    lng?: number;
  },
  partial: Partial<WardLocation> = {},
): WardLocation {
  return {
    lat: partial.lat ?? ward.lat,
    lng: partial.lng ?? ward.lng,
    address: partial.address,
    area: partial.area ?? ward.area,
    ward: partial.ward ?? ward.name,
    wardId: ward._id.toString(),
    wardName: ward.name,
    wardNumber: ward.wardNumber,
    city: partial.city ?? ward.city,
    municipality: partial.municipality ?? ward.municipality,
    province: partial.province ?? ward.province,
  };
}

export async function listWardCities() {
  const cities = await WardModel.distinct("city");
  return cities.sort((left, right) => left.localeCompare(right));
}

export async function listWards(city?: string) {
  const filter = city ? { city: new RegExp(`^${city.trim()}$`, "i") } : {};
  const wards = await WardModel.find(filter).sort({ city: 1 });
  return wards
    .map(toWardPayload)
    .sort(
      (left, right) =>
        left.city.localeCompare(right.city) ||
        Number(left.wardNumber) - Number(right.wardNumber),
    );
}

export async function getWardById(id: string) {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid ward id.", 400);
  }

  const ward = await WardModel.findById(id);

  if (!ward) {
    throw new AppError("Ward not found.", 404);
  }

  return ward;
}

export async function findWardBySelection(input: {
  wardId?: string;
  wardNumber?: string;
  city?: string;
}) {
  if (input.wardId && Types.ObjectId.isValid(input.wardId)) {
    return WardModel.findById(input.wardId);
  }

  if (!input.wardNumber) {
    return null;
  }

  const filter: Record<string, unknown> = {
    wardNumber: input.wardNumber.replace(/^Ward\s+/i, "").trim(),
  };

  if (input.city) {
    filter.city = new RegExp(`^${input.city.trim()}$`, "i");
  }

  return WardModel.findOne(filter);
}

export async function lookupWardByCoordinates(lat: number, lng: number) {
  const wards = await WardModel.find({
    lat: { $ne: undefined },
    lng: { $ne: undefined },
  });

  if (!wards.length) {
    throw new AppError("No ward data is available for location lookup.", 503);
  }

  let closest = wards[0];
  let smallestDistance = haversineDistanceKm(
    { lat, lng },
    { lat: wards[0].lat ?? lat, lng: wards[0].lng ?? lng },
  );

  for (const ward of wards.slice(1)) {
    if (ward.lat === undefined || ward.lng === undefined) {
      continue;
    }

    const distance = haversineDistanceKm({ lat, lng }, { lat: ward.lat, lng: ward.lng });

    if (distance < smallestDistance) {
      smallestDistance = distance;
      closest = ward;
    }
  }

  return {
    ward: closest,
    distanceKm: smallestDistance,
  };
}

export async function resolveWardFromPayload(
  payload: Record<string, unknown>,
  options: {
    fallbackCity?: string;
  } = {},
) {
  const rawLocation = isRecord(payload.location) ? payload.location : payload;
  const wardId = getString(rawLocation.wardId ?? rawLocation.ward_id ?? payload.wardId ?? payload.ward_id);
  const wardNumber = getString(
    rawLocation.wardNumber ??
      rawLocation.ward_number ??
      rawLocation.ward ??
      payload.wardNumber ??
      payload.ward_number ??
      payload.ward,
  );
  const city = getString(rawLocation.city ?? payload.city) ?? options.fallbackCity;
  const lat = getNumber(rawLocation.lat ?? rawLocation.latitude ?? payload.lat ?? payload.latitude);
  const lng = getNumber(rawLocation.lng ?? rawLocation.longitude ?? payload.lng ?? payload.longitude);

  const selectedWard = await findWardBySelection({ wardId, wardNumber, city });

  if (selectedWard) {
    return selectedWard;
  }

  if (lat !== undefined && lng !== undefined) {
    return (await lookupWardByCoordinates(lat, lng)).ward;
  }

  return null;
}
