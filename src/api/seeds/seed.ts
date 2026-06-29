import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import BadgeModel from "../models/Badge";
import CategoryModel from "../models/Category";
import ComplaintModel from "../models/Complaint";
import ComplaintTimelineModel from "../models/ComplaintTimeline";
import NotificationModel from "../models/Notification";
import OfficerModel from "../models/Officer";
import UserModel from "../models/User";
import WardModel from "../models/Ward";

dotenv.config();

async function seed() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is required to run seed data.");
  }

  await mongoose.connect(mongoUri);

  const [citizenPassword, officerPassword] = await Promise.all([
    bcrypt.hash("password123", 10),
    bcrypt.hash("officer123", 10),
  ]);

  const rahul = await UserModel.findOneAndUpdate(
    { email: "rahul.sharma@example.com" },
    {
      $set: {
        name: "Rahul Sharma",
        email: "rahul.sharma@example.com",
        password: citizenPassword,
        phone: "+9779800000001",
        role: "user",
        avatarUrl: undefined,
        isPublic: true,
        language: "English",
      },
    },
    { new: true, upsert: true, runValidators: true },
  );

  const officer = await OfficerModel.findOneAndUpdate(
    { email: "ward12.officer@example.com" },
    {
      $set: {
        name: "Sita Adhikari",
        email: "ward12.officer@example.com",
        password: officerPassword,
        phone: "+9779800000012",
        role: "officer",
        ward: "12",
        department: "Ward 12 Office",
        isActive: true,
      },
    },
    { new: true, upsert: true, runValidators: true },
  );

  await WardModel.findOneAndUpdate(
    { wardNumber: "12" },
    {
      $set: {
        wardNumber: "12",
        name: "Kathmandu Metropolitan City Ward 12",
        city: "Kathmandu",
        area: "Koteshwor",
        contactEmail: "ward12@example.com",
        contactPhone: "+977-01-4440000",
      },
    },
    { upsert: true, runValidators: true },
  );

  await CategoryModel.bulkWrite(
    [
      ["road", "Roads", "Road damage, potholes, and traffic infrastructure.", "Roads"],
      ["water", "Water", "Leaks, supply, drainage, and water quality.", "Water Supply"],
      ["waste", "Waste", "Garbage collection and sanitation complaints.", "Sanitation"],
      ["power", "Electricity", "Street lights and power infrastructure.", "Electricity"],
    ].map(([code, label, description, department]) => ({
      updateOne: {
        filter: { code },
        update: { $set: { code, label, description, department } },
        upsert: true,
      },
    })),
  );

  const roadComplaint = await ComplaintModel.findOneAndUpdate(
    { complaintNo: "CK-2026-0001" },
    {
      $set: {
        userId: rahul._id,
        complaintNo: "CK-2026-0001",
        title: "Large pothole near Koteshwor chowk",
        description: "A large pothole is making the road unsafe for bikes at night.",
        category: "road",
        status: "in_progress",
        priority: "high",
        location: {
          ward: "Ward 12",
          wardId: "12",
          area: "Koteshwor",
          city: "Kathmandu",
          address: "Koteshwor chowk, Kathmandu",
          lat: 27.6788,
          lng: 85.3497,
        },
        photos: [],
        assignedOfficerId: officer._id,
      },
    },
    { new: true, upsert: true, runValidators: true },
  );

  const wasteComplaint = await ComplaintModel.findOneAndUpdate(
    { complaintNo: "CK-2026-0002" },
    {
      $set: {
        userId: rahul._id,
        complaintNo: "CK-2026-0002",
        title: "Garbage pile beside school gate",
        description: "Garbage has not been collected for several days near the school.",
        category: "waste",
        status: "pending",
        priority: "medium",
        location: {
          ward: "Ward 12",
          wardId: "12",
          area: "Koteshwor",
          city: "Kathmandu",
          address: "Koteshwor school road",
          lat: 27.6768,
          lng: 85.3511,
        },
        photos: [],
      },
    },
    { new: true, upsert: true, runValidators: true },
  );

  const badges = [
    {
      code: "first_report",
      title: "First Report",
      description: "Submitted the first civic complaint.",
      pointsRequired: 10,
    },
    {
      code: "ward_helper",
      title: "Ward Helper",
      description: "Helped improve your ward with reports.",
      pointsRequired: 40,
    },
    {
      code: "civic_champion",
      title: "Civic Champion",
      description: "Consistently contributed to civic fixes.",
      pointsRequired: 250,
    },
  ];

  await BadgeModel.bulkWrite(
    badges.map((badge) => ({
      updateOne: {
        filter: { code: badge.code },
        update: { $set: badge },
        upsert: true,
      },
    })),
  );

  await NotificationModel.deleteMany({ userId: rahul._id });
  await NotificationModel.insertMany([
    {
      userId: rahul._id,
      title: "Complaint submitted",
      body: "CK-2026-0001 has been submitted and assigned to Ward 12.",
      type: "complaint_submitted",
    },
    {
      userId: rahul._id,
      title: "Status updated",
      body: "CK-2026-0001 is now in progress.",
      type: "status_changed",
    },
  ]);

  await ComplaintTimelineModel.deleteMany({
    complaintId: { $in: [roadComplaint._id, wasteComplaint._id] },
  });
  await ComplaintTimelineModel.insertMany([
    {
      complaintId: roadComplaint._id,
      type: "submitted",
      title: "Complaint submitted",
      actorType: "citizen",
      actorId: rahul._id,
    },
    {
      complaintId: roadComplaint._id,
      type: "assigned",
      title: "Assigned to Ward 12 Office",
      message: "Sita Adhikari is reviewing this complaint.",
      actorType: "officer",
      actorId: officer._id,
    },
    {
      complaintId: wasteComplaint._id,
      type: "submitted",
      title: "Complaint submitted",
      actorType: "citizen",
      actorId: rahul._id,
    },
  ]);

  console.log("Development seed data complete.");
  console.log("Citizen: rahul.sharma@example.com / password123");
  console.log("Officer: ward12.officer@example.com / officer123");
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
