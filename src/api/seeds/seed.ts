import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { WARD_SEED_DATA } from "../data/wardSeedData";
import BadgeModel from "../models/Badge";
import CommentModel from "../models/Comment";
import ComplaintModel from "../models/Complaint";
import ComplaintTimelineModel from "../models/ComplaintTimeline";
import EscalationRuleModel from "../models/EscalationRule";
import NotificationModel from "../models/Notification";
import NotificationPreferenceModel from "../models/NotificationPreference";
import OfficerModel from "../models/Officer";
import PointEventModel from "../models/PointEvent";
import UserModel from "../models/User";
import UserBadgeModel from "../models/UserBadge";
import WardModel from "../models/Ward";

dotenv.config();

async function seed() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is required to run the seed script.");
  }

  await mongoose.connect(mongoUri);
  await WardModel.syncIndexes();

  await WardModel.bulkWrite(
    WARD_SEED_DATA.map((ward) => ({
      updateOne: {
        filter: { city: ward.city, wardNumber: ward.wardNumber },
        update: {
          $set: {
            ...ward,
            contactEmail:
              ward.city === "Kathmandu" && ward.wardNumber === "12"
                ? "ward12@example.com"
                : undefined,
            contactPhone:
              ward.city === "Kathmandu" && ward.wardNumber === "12"
                ? "+977-01-4440000"
                : undefined,
          },
        },
        upsert: true,
      },
    })),
  );

  const ward12Kathmandu = await WardModel.findOne({
    city: "Kathmandu",
    wardNumber: "12",
  });
  const ward10Kathmandu = await WardModel.findOne({
    city: "Kathmandu",
    wardNumber: "10",
  });

  if (!ward12Kathmandu || !ward10Kathmandu) {
    throw new Error("Required ward seed data was not created.");
  }

  const rahul = await UserModel.findOneAndUpdate(
    { email: "rahul.sharma@example.com" },
    {
      $set: {
        name: "Rahul Sharma",
        email: "rahul.sharma@example.com",
        phone: "+9779800000001",
        ward: ward12Kathmandu.name,
        wardId: ward12Kathmandu._id.toString(),
        homeArea: "Koteshwor",
        address: "Koteshwor, Kathmandu",
        city: ward12Kathmandu.city,
        municipality: ward12Kathmandu.municipality,
        location: {
          ward: ward12Kathmandu.name,
          wardId: ward12Kathmandu._id.toString(),
          wardName: ward12Kathmandu.name,
          wardNumber: ward12Kathmandu.wardNumber,
          area: "Koteshwor",
          city: ward12Kathmandu.city,
          municipality: ward12Kathmandu.municipality,
          province: ward12Kathmandu.province,
          address: "Koteshwor, Kathmandu",
          lat: 27.678,
          lng: 85.349,
        },
        language: "English",
        isPublic: true,
        points: 42,
        level: 2,
        levelTitle: "Active Reporter",
      },
      $setOnInsert: {
        password: "password123",
        isGoogleUser: false,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const officer = await OfficerModel.findOneAndUpdate(
    { email: "ward12.officer@example.com" },
    {
      $set: {
        name: "Sita Adhikari",
        email: "ward12.officer@example.com",
        phone: "+9779800000012",
        role: "officer",
        ward: ward12Kathmandu.name,
        wardId: ward12Kathmandu._id.toString(),
        wardNumber: ward12Kathmandu.wardNumber,
        city: ward12Kathmandu.city,
        municipality: ward12Kathmandu.municipality,
        department: "Ward 12 Office",
        isActive: true,
      },
      $setOnInsert: {
        password: "officer123",
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  rahul.password = await bcrypt.hash("password123", 10);
  await rahul.save();
  officer.password = await bcrypt.hash("officer123", 10);
  await officer.save();

  const badges = await BadgeModel.bulkWrite([
    {
      updateOne: {
        filter: { code: "first_report" },
        update: {
          $set: {
            code: "first_report",
            title: "First Report",
            description: "Submitted the first verified civic complaint.",
            icon: "clipboard-check-outline",
            pointsRequired: 10,
          },
        },
        upsert: true,
      },
    },
    {
      updateOne: {
        filter: { code: "ward_helper" },
        update: {
          $set: {
            code: "ward_helper",
            title: "Ward Helper",
            description: "Reached 40 civic points.",
            icon: "shield-star-outline",
            pointsRequired: 40,
          },
        },
        upsert: true,
      },
    },
    {
      updateOne: {
        filter: { code: "civic_champion" },
        update: {
          $set: {
            code: "civic_champion",
            title: "Civic Champion",
            description: "Reached 250 civic points.",
            icon: "medal-outline",
            pointsRequired: 250,
          },
        },
        upsert: true,
      },
    },
  ]);

  const roadComplaint = await ComplaintModel.findOneAndUpdate(
    { complaintNo: "CK-2026-0001" },
    {
      $set: {
        userId: rahul._id,
        complaintNo: "CK-2026-0001",
        title: "Large pothole near Koteshwor chowk",
        description:
          "A large pothole on the main road is causing bikes to swerve, especially at night.",
        category: "road",
        status: "in_progress",
        priority: "high",
        location: {
          ward: ward12Kathmandu.name,
          wardId: ward12Kathmandu._id.toString(),
          wardName: ward12Kathmandu.name,
          wardNumber: ward12Kathmandu.wardNumber,
          area: "Koteshwor",
          city: ward12Kathmandu.city,
          municipality: ward12Kathmandu.municipality,
          province: ward12Kathmandu.province,
          address: "Koteshwor chowk, Kathmandu",
          lat: 27.6788,
          lng: 85.3497,
        },
        photos: [],
        aiVerified: true,
        aiSuggestedCategory: "road",
        aiSeverity: 8,
        aiSummary: "Roads and Infrastructure should review this high priority complaint.",
        aiKeywords: ["road", "pothole", "night", "bike"],
        aiAnalysis: {
          detectedCategory: "road",
          confidence: 91,
          severityLabel: "high",
          sizeEstimate: "Large reported impact area",
          priority: "high",
          department: "Roads and Infrastructure",
          etaDays: 3,
          duplicateCheck: { isDuplicate: false },
          verified: true,
          summary: "Roads and Infrastructure should review this high priority complaint.",
          keywords: ["road", "pothole", "night", "bike"],
          analyzedAt: new Date(),
        },
        assignedOfficerId: officer._id,
        assignedOfficerName: officer.name,
        upvoteCount: 4,
        commentCount: 1,
        followerCount: 2,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const wasteComplaint = await ComplaintModel.findOneAndUpdate(
    { complaintNo: "CK-2026-0002" },
    {
      $set: {
        userId: rahul._id,
        complaintNo: "CK-2026-0002",
        title: "Garbage pile beside school gate",
        description:
          "Garbage has not been collected for several days beside the school gate.",
        category: "waste",
        status: "pending",
        priority: "medium",
        location: {
          ward: ward12Kathmandu.name,
          wardId: ward12Kathmandu._id.toString(),
          wardName: ward12Kathmandu.name,
          wardNumber: ward12Kathmandu.wardNumber,
          area: "Koteshwor",
          city: ward12Kathmandu.city,
          municipality: ward12Kathmandu.municipality,
          province: ward12Kathmandu.province,
          address: "Koteshwor school road",
          lat: 27.6768,
          lng: 85.3511,
        },
        photos: [],
        aiVerified: false,
        upvoteCount: 1,
        commentCount: 0,
        followerCount: 1,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await CommentModel.findOneAndUpdate(
    {
      complaintId: roadComplaint._id.toString(),
      body: "Ward team has inspected the road section.",
    },
    {
      $set: {
        complaintId: roadComplaint._id.toString(),
        authorType: "officer",
        authorId: officer._id.toString(),
        authorName: officer.name,
        body: "Ward team has inspected the road section.",
        official: true,
        upvoteCount: 0,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await ComplaintTimelineModel.deleteMany({
    complaintId: { $in: [roadComplaint._id.toString(), wasteComplaint._id.toString()] },
  });
  await ComplaintTimelineModel.insertMany([
    {
      complaintId: roadComplaint._id.toString(),
      type: "submitted",
      title: "Complaint submitted",
      actorType: "citizen",
      actorId: rahul._id.toString(),
      actorName: rahul.name,
      isInternal: false,
    },
    {
      complaintId: roadComplaint._id.toString(),
      type: "ai_verified",
      title: "AI analysis completed",
      message: "Roads and Infrastructure routed with high priority.",
      actorType: "system",
      isInternal: false,
    },
    {
      complaintId: roadComplaint._id.toString(),
      type: "assigned",
      title: "Officer assigned",
      message: `${officer.name} assigned to this complaint.`,
      actorType: "officer",
      actorId: officer._id.toString(),
      actorName: officer.name,
      isInternal: true,
    },
    {
      complaintId: wasteComplaint._id.toString(),
      type: "submitted",
      title: "Complaint submitted",
      actorType: "citizen",
      actorId: rahul._id.toString(),
      actorName: rahul.name,
      isInternal: false,
    },
  ]);

  await NotificationPreferenceModel.findOneAndUpdate(
    { userId: rahul._id.toString() },
    { $setOnInsert: { userId: rahul._id.toString() } },
    { upsert: true, new: true },
  );
  await NotificationModel.deleteMany({ userId: rahul._id.toString() });
  await NotificationModel.insertMany([
    {
      userId: rahul._id.toString(),
      title: "AI analysis completed",
      body: "CK-2026-0001 was routed to Roads and Infrastructure.",
      type: "ai_analysis_completed",
      data: { complaintId: roadComplaint._id.toString() },
    },
    {
      userId: rahul._id.toString(),
      title: "Complaint submitted",
      body: "CK-2026-0002 has been submitted.",
      type: "complaint_submitted",
      data: { complaintId: wasteComplaint._id.toString() },
    },
  ]);

  const firstReportBadge = await BadgeModel.findOne({ code: "first_report" });
  const wardHelperBadge = await BadgeModel.findOne({ code: "ward_helper" });

  if (firstReportBadge) {
    await UserBadgeModel.updateOne(
      { userId: rahul._id.toString(), badgeId: firstReportBadge._id.toString() },
      {
        $setOnInsert: {
          userId: rahul._id.toString(),
          badgeId: firstReportBadge._id.toString(),
          earnedAt: new Date(),
        },
      },
      { upsert: true },
    );
  }

  if (wardHelperBadge) {
    await UserBadgeModel.updateOne(
      { userId: rahul._id.toString(), badgeId: wardHelperBadge._id.toString() },
      {
        $setOnInsert: {
          userId: rahul._id.toString(),
          badgeId: wardHelperBadge._id.toString(),
          earnedAt: new Date(),
        },
      },
      { upsert: true },
    );
  }

  await PointEventModel.deleteMany({ userId: rahul._id.toString() });
  await PointEventModel.insertMany([
    {
      userId: rahul._id.toString(),
      complaintId: roadComplaint._id.toString(),
      type: "submit_verified_complaint",
      points: 10,
      reason: "Submit verified complaint",
    },
    {
      userId: rahul._id.toString(),
      complaintId: roadComplaint._id.toString(),
      type: "receive_upvote",
      points: 4,
      reason: "Received upvotes",
    },
  ]);

  await EscalationRuleModel.findOneAndUpdate(
    { name: "Critical complaints escalate after 4 hours" },
    {
      $set: {
        name: "Critical complaints escalate after 4 hours",
        ward: ward12Kathmandu.name,
        priority: "critical",
        triggerAfterHours: 4,
        assignToRole: "supervisor",
        active: true,
      },
    },
    { upsert: true, new: true },
  );

  console.log("ComplainKendra seed complete.");
  console.log("Citizen: rahul.sharma@example.com / password123");
  console.log("Officer: ward12.officer@example.com / officer123");
  console.log(`Badge bulk result: ${badges.modifiedCount + badges.upsertedCount} changed`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
