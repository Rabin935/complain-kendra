import assert from "node:assert/strict";
import { sanitizeRequest } from "../src/api/middlewares/security.middleware";
import {
  normalizeCategory,
  normalizePriority,
  normalizeStatus,
  parsePagination,
} from "../src/api/utils/request.utils";

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
  const request = {
    body: {
      title: "Complaint",
      $where: "malicious",
      nested: {
        "profile.email": "x@example.com",
        safe: "kept",
      },
    },
    query: {
      search: "road",
      $ne: "bad",
    },
    params: {},
  };
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
  assert.equal("$ne" in request.query, false);
}

function run() {
  testRequestNormalization();
  testRequestSanitization();
  console.log("All lightweight tests passed.");
}

run();
