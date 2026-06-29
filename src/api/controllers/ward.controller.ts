import type { NextFunction, Request, Response } from "express";
import {
  getWardById,
  listWardCities,
  listWards,
  lookupWardByCoordinates,
  toWardPayload,
} from "../services/ward.service";
import { AppError } from "../utils/appError";
import { getNumber, getString } from "../utils/request.utils";

export async function cities(_request: Request, response: Response, next: NextFunction) {
  try {
    const data = await listWardCities();
    response.status(200).json({
      success: true,
      cities: data,
    });
  } catch (error) {
    next(error);
  }
}

export async function list(request: Request, response: Response, next: NextFunction) {
  try {
    const city = getString(request.query.city);
    const wards = await listWards(city);
    response.status(200).json({
      success: true,
      wards,
    });
  } catch (error) {
    next(error);
  }
}

export async function detail(
  request: Request<{ id: string }>,
  response: Response,
  next: NextFunction,
) {
  try {
    const ward = await getWardById(request.params.id);
    response.status(200).json({
      success: true,
      ward: toWardPayload(ward),
    });
  } catch (error) {
    next(error);
  }
}

export async function lookup(request: Request, response: Response, next: NextFunction) {
  try {
    const body = request.body as Record<string, unknown>;
    const lat = getNumber(body.lat ?? body.latitude);
    const lng = getNumber(body.lng ?? body.longitude);

    if (lat === undefined || lng === undefined) {
      throw new AppError("lat and lng are required.", 400);
    }

    const result = await lookupWardByCoordinates(lat, lng);
    response.status(200).json({
      success: true,
      ward: toWardPayload(result.ward),
      distanceKm: result.distanceKm,
    });
  } catch (error) {
    next(error);
  }
}
