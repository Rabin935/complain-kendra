import bcrypt from "bcryptjs";
import BadgeModel from "../models/Badge";
import ComplaintModel from "../models/Complaint";
import ComplaintUpvoteModel from "../models/ComplaintUpvote";
import RefreshTokenModel from "../models/RefreshToken";
import UserBadgeModel from "../models/UserBadge";
import UserModel from "../models/User";
import { AppError } from "../utils/appError";
import { getString, isRecord, requireObjectId, requireString } from "../utils/request.utils";
import { saveUploadedImage } from "../utils/upload.utils";
import { buildWardLocation, resolveWardFromPayload } from "./ward.service";

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
  wardId?: string;
  address?: string;
  homeArea?: string;
  bio?: string;
  city?: string;
  municipality?: string;
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
    wardId: user.wardId,
    address: user.address,
    homeArea: user.homeArea,
    bio: user.bio,
    city: user.city,
    municipality: user.municipality,
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
  const address = getString(payload.address);
  const homeArea = getString(payload.homeArea ?? payload.area);
  const bio = getString(payload.bio);
  const isPublic = payload.is_public ?? payload.isPublic;

  if (name) {
    if (name.length < 2 || name.length > 80) {
      throw new AppError("Name must be between 2 and 80 characters.", 400);
    }

    user.name = name;
  }

  if (phone !== undefined) {
    user.phone = phone;
  }

  if (address) {
    user.address = address;
    user.location = {
      ...(isRecord(user.location) ? user.location : {}),
      address,
    };
  }

  if (homeArea !== undefined) {
    user.homeArea = homeArea;
    user.location = {
      ...(isRecord(user.location) ? user.location : {}),
      area: homeArea,
    };
  }

  if (bio !== undefined) {
    if (bio.length > 250) {
      throw new AppError("Bio must be 250 characters or fewer.", 400);
    }

    user.bio = bio;
  } else if (Object.prototype.hasOwnProperty.call(payload, "bio")) {
    user.bio = undefined;
  }

  const selectedWard = await resolveWardFromPayload(payload, {
    fallbackCity: getString(payload.city) ?? user.city,
  });

  if (selectedWard) {
    const location = buildWardLocation(selectedWard, {
      ...(isRecord(user.location) ? user.location : {}),
      address: address ?? user.address,
      area: homeArea ?? user.homeArea,
    });
    user.ward = location.ward;
    user.wardId = location.wardId;
    user.city = location.city;
    user.municipality = location.municipality;
    user.location = location;
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

  if (newPassword === currentPassword) {
    throw new AppError("New password must be different from your current password.", 400);
  }

  if (!isStrongPassword(newPassword)) {
    throw new AppError(
      "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
      400,
    );
  }

  const passwordMatches = await bcrypt.compare(currentPassword, user.password);

  if (!passwordMatches) {
    throw new AppError("Current password is incorrect.", 400);
  }

  user.password = newPassword;
  await user.save();

  await RefreshTokenModel.updateMany(
    { subjectId: user._id.toString(), subjectType: "citizen", revokedAt: undefined },
    { $set: { revokedAt: new Date() } },
  );
}

function isStrongPassword(value: string): boolean {
  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
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
      ComplaintModel.find({ userId: normalizedUserId }).select("_id location.wardId"),
    ]);

  const upvotesReceived = await ComplaintUpvoteModel.countDocuments({
    complaintId: { $in: ownedComplaints.map((complaint) => complaint._id.toString()) },
  });
  const wardId = ownedComplaints[0]?.location?.wardId;
  const wardTotal = wardId
    ? await ComplaintModel.countDocuments({ "location.wardId": wardId })
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
    wardId: user.wardId,
    avatarUrl: user.avatarUrl,
    points: user.points,
    level: user.level,
    levelTitle: user.levelTitle,
    createdAt: user.createdAt,
  };
}

export async function deleteCurrentUser(input: {
  userId: string;
  password?: string;
  confirmation?: string;
}) {
  const user = await UserModel.findById(requireObjectId(input.userId, "user id"));

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  if (input.confirmation !== "DELETE") {
    throw new AppError("Type DELETE to confirm account deletion.", 400);
  }

  const password = requireString(input.password, "Password");
  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    throw new AppError("Password confirmation is incorrect.", 400);
  }

  await Promise.all([
    RefreshTokenModel.updateMany(
      { subjectId: user._id.toString(), subjectType: "citizen", revokedAt: undefined },
      { $set: { revokedAt: new Date() } },
    ),
    UserModel.deleteOne({ _id: user._id }),
  ]);
}

export async function submitSupportRequest(
  userId: string,
  payload: Record<string, unknown>,
  screenshot?: AvatarFile,
) {
  await getCurrentUser(userId);

  const category = requireString(payload.category, "Support category");
  const subject = requireString(payload.subject, "Subject");
  const description = requireString(payload.description, "Description");
  const allowedCategories = new Set([
    "Account",
    "Complaint",
    "Technical Issue",
    "Officer Misconduct",
    "General Inquiry",
    "Feedback",
  ]);

  if (!allowedCategories.has(category)) {
    throw new AppError("Invalid support category.", 400);
  }

  if (subject.length < 3 || subject.length > 120) {
    throw new AppError("Subject must be between 3 and 120 characters.", 400);
  }

  if (description.length < 10 || description.length > 1000) {
    throw new AppError("Description must be between 10 and 1000 characters.", 400);
  }

  let screenshotUrl: string | undefined;

  if (screenshot) {
    screenshotUrl = await saveUploadedImage({
      buffer: screenshot.buffer,
      mimeType: screenshot.mimetype,
      originalName: screenshot.originalname,
      folder: "support",
    });
  }

  return {
    id: `support-${Date.now()}`,
    category,
    subject,
    description,
    screenshotUrl,
    status: "submitted",
    createdAt: new Date().toISOString(),
  };
}
