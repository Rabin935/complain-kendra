import assert from "node:assert/strict";
import { sanitizeRequest } from "../src/api/middlewares/security.middleware";
import {
  normalizeCategory,
  normalizePriority,
  normalizeStatus,
  parsePagination,
} from "../src/api/utils/request.utils";
import { cachedRequest, getCachedValue, invalidateCache } from "../src/lib/requestCache";

function testRequestNormalization() {
  assert.equal(normalizeStatus("In Progress"), "in_progress");
  assert.equal(normalizeCategory("Road Damage"), "road");
  assert.equal(normalizePriority("normal"), "medium");
  assert.deepEqual(parsePagination({ page: "2", limit: "500" }), {
    page: 2,
    limit: 100,
    skip: 100,
  });
}

function testRequestSanitization() {
  const query = {
    search: "road",
    $ne: "bad",
  };
  const request = {
    body: {
      title: "Complaint",
      $where: "malicious",
      nested: {
        "profile.email": "x@example.com",
        safe: "kept",
      },
    },
    params: {},
  };
  Object.defineProperty(request, "query", {
    configurable: true,
    enumerable: true,
    get: () => query,
  });
  let nextCalled = false;

  sanitizeRequest(
    request as never,
    {} as never,
    () => {
      nextCalled = true;
    },
  );

  assert.equal(nextCalled, true);
  assert.equal("$where" in request.body, false);
  assert.equal("profile.email" in request.body.nested, false);
  assert.equal(request.body.nested.safe, "kept");
  assert.equal("$ne" in query, false);
  assert.equal(query.search, "road");
}

async function testRequestCache() {
  invalidateCache();
  let calls = 0;
  const first = await cachedRequest("test:key", 10_000, async () => {
    calls += 1;
    return { value: "fresh" };
  });
  const second = await cachedRequest("test:key", 10_000, async () => {
    calls += 1;
    return { value: "stale" };
  });

  assert.deepEqual(first, { value: "fresh" });
  assert.deepEqual(second, { value: "fresh" });
  assert.equal(calls, 1);
  assert.deepEqual(getCachedValue("test:key"), { value: "fresh" });
  invalidateCache("test:");
  assert.equal(getCachedValue("test:key"), null);
}

async function run() {
  testRequestNormalization();
  testRequestSanitization();
  await testRequestCache();
  console.log("All lightweight tests passed.");
}

void run();
