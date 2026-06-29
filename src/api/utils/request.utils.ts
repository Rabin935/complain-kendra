import { isValidObjectId } from "mongoose";
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_PRIORITIES,
  COMPLAINT_STATUSES,
  type ComplaintCategory,
  type ComplaintPriority,
  type ComplaintStatus,
} from "../types";
import { AppError } from "./appError";

export interface Pagination {
  page: number;
  limit: number;
  skip: number;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized || undefined;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return getString(value[0]);
  }

  return undefined;
}

export function requireString(value: unknown, fieldName: string): string {
  const normalized = getString(value);

  if (!normalized) {
    throw new AppError(`${fieldName} is required.`, 400);
  }

  return normalized;
}

export function getNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

export function requireObjectId(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (!isValidObjectId(normalized)) {
    throw new AppError(`Invalid ${fieldName}.`, 400);
  }

  return normalized;
}

export function parsePagination(query: Record<string, unknown>): Pagination {
  const rawPage = getNumber(query.page) ?? 1;
  const rawLimit = getNumber(query.limit) ?? 20;
  const page = Math.max(1, Math.floor(rawPage));
  const limit = Math.min(100, Math.max(1, Math.floor(rawLimit)));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

export function normalizeCategory(value: unknown, required = false): ComplaintCategory | undefined {
  const text = getString(value);

  if (!text) {
    if (required) {
      throw new AppError("Category is required.", 400);
    }

    return undefined;
  }

  const normalized = text.toLowerCase().replace(/[\s_-]+/g, "");
  const aliases: Record<string, ComplaintCategory> = {
    road: "road",
    roaddamage: "road",
    pothole: "road",
    infrastructure: "road",
    water: "water",
    watersupply: "water",
    sewage: "water",
    drainage: "water",
    drain: "water",
    power: "power",
    electricity: "power",
    electric: "power",
    outage: "power",
    waste: "waste",
    garbage: "waste",
    sanitation: "waste",
    trash: "waste",
    trees: "trees",
    tree: "trees",
    fallentree: "trees",
    other: "other",
  };

  const category = aliases[normalized];

  if (!category || !COMPLAINT_CATEGORIES.includes(category)) {
    throw new AppError(`Category must be one of: ${COMPLAINT_CATEGORIES.join(", ")}.`, 400);
  }

  return category;
}

export function normalizeStatus(value: unknown, required = false): ComplaintStatus | undefined {
  const text = getString(value);

  if (!text) {
    if (required) {
      throw new AppError("Status is required.", 400);
    }

    return undefined;
  }

  const normalized = text.toLowerCase().replace(/[\s-]+/g, "_");

  if (!COMPLAINT_STATUSES.includes(normalized as ComplaintStatus)) {
    throw new AppError(`Status must be one of: ${COMPLAINT_STATUSES.join(", ")}.`, 400);
  }

  return normalized as ComplaintStatus;
}

export function normalizePriority(value: unknown, required = false): ComplaintPriority | undefined {
  const text = getString(value);

  if (!text) {
    if (required) {
      throw new AppError("Priority is required.", 400);
    }

    return undefined;
  }

  const normalized = text.toLowerCase();
  const mapped = normalized === "normal" ? "medium" : normalized;

  if (!COMPLAINT_PRIORITIES.includes(mapped as ComplaintPriority)) {
    throw new AppError(`Priority must be one of: ${COMPLAINT_PRIORITIES.join(", ")}.`, 400);
  }

  return mapped as ComplaintPriority;
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
