import ComplaintCounterModel from "../models/ComplaintCounter";
import { AppError } from "../utils/appError";

const COMPLAINT_NUMBER_PREFIX = "CK";
const COMPLAINT_NUMBER_PADDING = 4;

type CounterRecord = {
  sequence: number;
};

type ComplaintCounterStore = {
  findOneAndUpdate(
    filter: { key: string },
    update: { $inc: { sequence: number } },
    options: Record<string, unknown>,
  ): Promise<CounterRecord | null>;
};

export function getComplaintCounterKey(year: number): string {
  return `complaint:${year}`;
}

export function formatComplaintNumber(year: number, sequence: number): string {
  return `${COMPLAINT_NUMBER_PREFIX}-${year}-${sequence
    .toString()
    .padStart(COMPLAINT_NUMBER_PADDING, "0")}`;
}

export function createComplaintNumberAllocator(
  counterStore: ComplaintCounterStore,
): (now?: Date) => Promise<string> {
  return async function allocateComplaintNumber(now = new Date()): Promise<string> {
    const year = now.getFullYear();
    const counterKey = getComplaintCounterKey(year);
    const counter = await counterStore.findOneAndUpdate(
      { key: counterKey },
      { $inc: { sequence: 1 } },
      {
        returnDocument: "after",
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    if (!counter || !Number.isInteger(counter.sequence) || counter.sequence <= 0) {
      throw new AppError("Failed to generate complaint number.", 500);
    }

    return formatComplaintNumber(year, counter.sequence);
  };
}

export const allocateComplaintNumber = createComplaintNumberAllocator(
  ComplaintCounterModel,
);
