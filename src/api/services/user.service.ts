import bcrypt from "bcryptjs";
import BadgeModel from "../models/Badge";
import ComplaintModel from "../models/Complaint";
import ComplaintUpvoteModel from "../models/ComplaintUpvote";
import UserBadgeModel from "../models/UserBadge";
import UserModel from "../models/User";
import { AppError } from "../utils/appError";
import { getString, isRecord, requireObjectId, requireString } from "../utils/request.utils";
import { saveUploadedImage } from "../utils/upload.utils";

type AvatarFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname?: string;
};

export function toPublicUser(user: {
  _id: { toString(): string };
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  ward?: string;
  address?: string;
  location?: unknown;
  language?: string;
  isPublic?: boolean;
  points?: number;
  level?: number;
  levelTitle?: string;
  avatarUrl?: string;
  createdAt?: Date;
}) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    ward: user.ward,
    address: user.address,
    location: user.location,
    language: user.language,
    isPublic: user.isPublic,
    points: user.points,
    level: user.level,
    levelTitle: user.levelTitle,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}

export async function getCurrentUser(userId: string) {
  const user = await UserModel.findById(requireObjectId(userId, "user id"));

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  return toPublicUser(user);
}

export async function updateCurrentUser(userId: string, payload: Record<string, unknown>) {
  const user = await UserModel.findById(requireObjectId(userId, "user id"));

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  const name = getString(payload.name);
  const phone = getString(payload.phone);
  const ward = getString(payload.ward);
  const address = getString(payload.address);
  const isPublic = payload.is_public ?? payload.isPublic;

  if (name) {
    user.name = name;
  }

  if (phone !== undefined) {
    user.phone = phone;
  }

  if (ward) {
    user.ward = ward;
    user.location = {
      ...(isRecord(user.location) ? user.location : {}),
      ward: ward.startsWith("Ward") ? ward : `Ward ${ward}`,
      wardId: ward.replace(/^Ward\s+/i, ""),
    };
  }

  if (address) {
    user.address = address;
    user.location = {
      ...(isRecord(user.location) ? user.location : {}),
      address,
    };
  }

  if (typeof isPublic === "boolean") {
    user.isPublic = isPublic;
  }

  await user.save();
  return toPublicUser(user);
}

export async function uploadAvatar(userId: string, file: AvatarFile) {
  if (file.size <= 0) {
    throw new AppError("Avatar file is required.", 400);
  }

  const avatarUrl = await saveUploadedImage({
    buffer: file.buffer,
    mimeType: file.mimetype,
    originalName: file.originalname,
    folder: "avatars",
  });
  const user = await UserModel.findByIdAndUpdate(
    requireObjectId(userId, "user id"),
    { avatarUrl },
    { new: true },
  );

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  return toPublicUser(user);
}

export async function changePassword(input: {
  userId: string;
  currentPassword?: string;
  newPassword?: string;
}) {
  const user = await UserModel.findById(requireObjectId(input.userId, "user id"));

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  const currentPassword = requireString(input.currentPassword, "Current password");
  const newPassword = requireString(input.newPassword, "New password");

  if (newPassword.length < 6) {
    throw new AppError("New password must be at least 6 characters.", 400);
  }

  const passwordMatches = await bcrypt.compare(currentPassword, user.password);

  if (!passwordMatches) {
    throw new AppError("Current password is incorrect.", 400);
  }

  user.password = newPassword;
  await user.save();
}

export async function updateLanguage(userId: string, language?: string) {
  const normalized = language === "Nepali" || language === "English" ? language : undefined;

  if (!normalized) {
    throw new AppError("Language must be English or Nepali.", 400);
  }

  const user = await UserModel.findByIdAndUpdate(
    requireObjectId(userId, "user id"),
    { language: normalized },
    { new: true },
  );

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  return toPublicUser(user);
}

export async function getUserStats(userId: string) {
  const normalizedUserId = requireObjectId(userId, "user id");
  const [pending, inProgress, resolved, submitted, badgesEarned, ownedComplaints] =
    await Promise.all([
      ComplaintModel.countDocuments({ userId: normalizedUserId, status: "pending" }),
      ComplaintModel.countDocuments({ userId: normalizedUserId, status: "in_progress" }),
      ComplaintModel.countDocuments({ userId: normalizedUserId, status: "resolved" }),
      ComplaintModel.countDocuments({ userId: normalizedUserId }),
      UserBadgeModel.countDocuments({ userId: normalizedUserId }),
      ComplaintModel.find({ userId: normalizedUserId }).select("_id location.ward"),
    ]);

  const upvotesReceived = await ComplaintUpvoteModel.countDocuments({
    complaintId: { $in: ownedComplaints.map((complaint) => complaint._id.toString()) },
  });
  const ward = ownedComplaints[0]?.location?.ward;
  const wardTotal = ward
    ? await ComplaintModel.countDocuments({ "location.ward": ward })
    : submitted;

  return {
    pending,
    in_progress: inProgress,
    inProgress,
    resolved,
    ward_total: wardTotal,
    wardTotal,
    reports_submitted: submitted,
    reportsSubmitted: submitted,
    upvotes_received: upvotesReceived,
    upvotesReceived,
    badges_earned: badgesEarned,
    badgesEarned,
  };
}

export async function getUserBadges(userId: string) {
  const normalizedUserId = requireObjectId(userId, "user id");
  const [badges, earned] = await Promise.all([
    BadgeModel.find().sort({ pointsRequired: 1 }),
    UserBadgeModel.find({ userId: normalizedUserId }),
  ]);
  const earnedIds = new Set(earned.map((item) => item.badgeId.toString()));
  const user = await UserModel.findById(normalizedUserId);
  const points = user?.points ?? 0;

  return badges.map((badge) => ({
    id: badge._id.toString(),
    code: badge.code,
    title: badge.title,
    description: badge.description,
    icon: badge.icon,
    earned: earnedIds.has(badge._id.toString()),
    progress:
      badge.pointsRequired === 0
        ? 100
        : Math.min(100, Math.round((points / badge.pointsRequired) * 100)),
    earnedAt: earned.find((item) => item.badgeId.toString() === badge._id.toString())?.earnedAt,
  }));
}

export async function getPublicUser(userId: string) {
  const user = await UserModel.findById(requireObjectId(userId, "user id"));

  if (!user || !user.isPublic) {
    throw new AppError("Public profile not found.", 404);
  }

  return {
    id: user._id.toString(),
    name: user.name,
    ward: user.ward,
    avatarUrl: user.avatarUrl,
    points: user.points,
    level: user.level,
    levelTitle: user.levelTitle,
    createdAt: user.createdAt,
  };
}
