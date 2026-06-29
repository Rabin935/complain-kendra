import assert from "node:assert/strict";
import test from "node:test";
import {
  createComplaintNumberAllocator,
  formatComplaintNumber,
} from "../services/complaint-number.service";

test("formatComplaintNumber returns CK-YYYY-0001 format", () => {
  assert.equal(formatComplaintNumber(2026, 1), "CK-2026-0001");
  assert.equal(formatComplaintNumber(2026, 42), "CK-2026-0042");
  assert.equal(formatComplaintNumber(2026, 1234), "CK-2026-1234");
});

test("allocator produces sequential unique complaint numbers for concurrent requests", async () => {
  const sequences = new Map<string, number>();
  const allocateComplaintNumber = createComplaintNumberAllocator({
    async findOneAndUpdate(filter, update) {
      const currentValue = sequences.get(filter.key) ?? 0;
      const nextValue = currentValue + update.$inc.sequence;
      sequences.set(filter.key, nextValue);

      return { sequence: nextValue };
    },
  });

  const results = await Promise.all(
    Array.from({ length: 12 }, () =>
      allocateComplaintNumber(new Date("2026-08-10T10:00:00.000Z")),
    ),
  );

  assert.deepEqual(results, [
    "CK-2026-0001",
    "CK-2026-0002",
    "CK-2026-0003",
    "CK-2026-0004",
    "CK-2026-0005",
    "CK-2026-0006",
    "CK-2026-0007",
    "CK-2026-0008",
    "CK-2026-0009",
    "CK-2026-0010",
    "CK-2026-0011",
    "CK-2026-0012",
  ]);
});
