import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";
process.env.GEMINI_API_KEY = "test-gemini-key";
process.env.MOCK_CLOUDINARY_UPLOADS = "true";
process.env.MOCK_GEMINI_ANALYSIS = "true";

let mongoServer: MongoMemoryServer;
let app: import("express").Express;
let connectDatabase: typeof import("../config/database").connectDatabase;
let UserModel: typeof import("../models/User").default;

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongoServer.getUri();

  ({ app } = await import("../app"));
  ({ connectDatabase } = await import("../config/database"));
  ({ default: UserModel } = await import("../models/User"));

  await connectDatabase();
});

afterEach(async () => {
  const collections = Object.values(mongoose.connection.collections);

  for (const collection of collections) {
    await collection.deleteMany({});
  }
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

async function registerAndLogin(input: {
  name: string;
  email: string;
  password: string;
  role?: "user" | "admin";
}) {
  await request(app).post("/api/auth/register").send({
    name: input.name,
    email: input.email,
    password: input.password,
  }).expect(201);

  if (input.role === "admin") {
    await UserModel.updateOne(
      { email: input.email.toLowerCase() },
      { $set: { role: "admin" } },
    );
  }

  const loginResponse = await request(app).post("/api/auth/login").send({
    email: input.email,
    password: input.password,
  }).expect(200);

  assert.equal(loginResponse.body.success, true);
  assert.ok(loginResponse.body.token);
  assert.ok(loginResponse.body.refreshToken);

  return {
    token: loginResponse.body.token as string,
    refreshToken: loginResponse.body.refreshToken as string,
    user: loginResponse.body.user as { id: string; role: "user" | "admin" },
  };
}

test("register, login, refresh, complaint creation, upload, timeline, listing, and status update", async () => {
  const citizen = await registerAndLogin({
    name: "Citizen One",
    email: "citizen@example.com",
    password: "Password123",
  });
  const admin = await registerAndLogin({
    name: "Admin Officer",
    email: "admin@example.com",
    password: "Password123",
    role: "admin",
  });

  const refreshResponse = await request(app).post("/api/auth/refresh").send({
    refreshToken: citizen.refreshToken,
  }).expect(200);

  assert.equal(refreshResponse.body.success, true);
  assert.ok(refreshResponse.body.token);
  assert.ok(refreshResponse.body.refreshToken);

  const uploadResponse = await request(app)
    .post("/api/complaints/upload-photo")
    .set("Authorization", `Bearer ${citizen.token}`)
    .attach("photo", Buffer.from("fake-image-data"), {
      filename: "Road Repair!!.png",
      contentType: "image/png",
    })
    .expect(200);

  assert.equal(uploadResponse.body.success, true);
  assert.ok(uploadResponse.body.photoUrl);
  assert.equal(uploadResponse.body.uploads.length, 1);
  assert.match(uploadResponse.body.uploads[0].sanitizedName, /^road-repair-/);

  const createResponse = await request(app)
    .post("/api/complaints")
    .set("Authorization", `Bearer ${citizen.token}`)
    .send({
      title: "Broken road near school",
      description: "There is a large pothole near the school gate.",
      category: "Road Damage",
      photo: uploadResponse.body.photoUrl,
      location: {
        lat: 27.715,
        lng: 85.32,
        address: "Ward office road",
      },
    })
    .expect(201);

  assert.equal(createResponse.body.success, true);
  assert.match(createResponse.body.complaint.complaintNumber, /^CK-\d{4}-\d{4}$/);
  assert.equal(createResponse.body.complaint.location.wardId, "ward-12");
  assert.equal(createResponse.body.complaint.location.wardName, "Ward 12");

  const complaintId = createResponse.body.complaint.id as string;

  const detailResponse = await request(app)
    .get(`/api/complaints/${complaintId}`)
    .set("Authorization", `Bearer ${citizen.token}`)
    .expect(200);

  assert.equal(detailResponse.body.complaint.id, complaintId);

  const initialTimelineResponse = await request(app)
    .get(`/api/complaints/${complaintId}/timeline`)
    .set("Authorization", `Bearer ${citizen.token}`)
    .expect(200);

  assert.equal(initialTimelineResponse.body.success, true);
  assert.ok(
    initialTimelineResponse.body.timeline.some(
      (event: { type: string }) => event.type === "complaint_created",
    ),
  );

  const myComplaintsResponse = await request(app)
    .get("/api/complaints/my")
    .set("Authorization", `Bearer ${citizen.token}`)
    .expect(200);

  assert.equal(myComplaintsResponse.body.complaints.length, 1);
  assert.equal(myComplaintsResponse.body.complaints[0].id, complaintId);

  await request(app)
    .patch(`/api/complaints/${complaintId}/status`)
    .set("Authorization", `Bearer ${admin.token}`)
    .send({
      status: "In Progress",
      note: "Assigned to the road maintenance team.",
    })
    .expect(200);

  const resolvedResponse = await request(app)
    .patch(`/api/complaints/${complaintId}/status`)
    .set("Authorization", `Bearer ${admin.token}`)
    .send({
      status: "Resolved",
      note: "Repair completed.",
    })
    .expect(200);

  assert.equal(resolvedResponse.body.complaint.status, "Resolved");

  const finalTimelineResponse = await request(app)
    .get(`/api/complaints/${complaintId}/timeline`)
    .set("Authorization", `Bearer ${citizen.token}`)
    .expect(200);

  assert.ok(
    finalTimelineResponse.body.timeline.some(
      (event: { type: string }) => event.type === "status_changed",
    ),
  );
  assert.ok(
    finalTimelineResponse.body.timeline.some(
      (event: { type: string }) => event.type === "resolved",
    ),
  );
});

test("status workflow prevents invalid transitions", async () => {
  const citizen = await registerAndLogin({
    name: "Citizen Two",
    email: "citizen-two@example.com",
    password: "Password123",
  });
  const admin = await registerAndLogin({
    name: "Admin Two",
    email: "admin-two@example.com",
    password: "Password123",
    role: "admin",
  });

  const createResponse = await request(app)
    .post("/api/complaints")
    .set("Authorization", `Bearer ${citizen.token}`)
    .send({
      title: "Blocked drain",
      description: "The drain is blocked after the rain.",
      category: "Drainage",
      location: {
        lat: 27.716,
        lng: 85.321,
        address: "Main chowk",
      },
    })
    .expect(201);

  const complaintId = createResponse.body.complaint.id as string;
  const invalidStatusResponse = await request(app)
    .patch(`/api/complaints/${complaintId}/status`)
    .set("Authorization", `Bearer ${admin.token}`)
    .send({
      status: "Resolved",
      note: "Trying to skip the workflow.",
    })
    .expect(400);

  assert.equal(invalidStatusResponse.body.success, false);
  assert.match(
    invalidStatusResponse.body.message,
    /Invalid complaint status transition/,
  );
});
