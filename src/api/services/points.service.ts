import BadgeModel from "../models/Badge";
import PointEventModel from "../models/PointEvent";
import UserBadgeModel from "../models/UserBadge";
import UserModel from "../models/User";
import { createNotification } from "./notification.service";

type PointEventType =
  | "submit_verified_complaint"
  | "complaint_resolved"
  | "receive_upvote"
  | "comment"
  | "rate_resolved_complaint"
  | "manual_adjustment";

const pointValues: Record<PointEventType, number> = {
  submit_verified_complaint: 10,
  complaint_resolved: 20,
  receive_upvote: 1,
  comment: 2,
  rate_resolved_complaint: 5,
  manual_adjustment: 0,
};

function getLevel(points: number): { level: number; levelTitle: string } {
  if (points >= 250) {
    return { level: 5, levelTitle: "Civic Champion" };
  }

  if (points >= 120) {
    return { level: 4, levelTitle: "Ward Guardian" };
  }

  if (points >= 60) {
    return { level: 3, levelTitle: "Community Helper" };
  }

  if (points >= 20) {
    return { level: 2, levelTitle: "Active Reporter" };
  }

  return { level: 1, levelTitle: "Community Starter" };
}

export async function awardPoints(input: {
  userId: string;
  type: PointEventType;
  complaintId?: string;
  reason: string;
  points?: number;
}) {
  const points = input.points ?? pointValues[input.type];

  if (points === 0) {
    return null;
  }

  await PointEventModel.create({
    userId: input.userId,
    complaintId: input.complaintId,
    type: input.type,
    points,
    reason: input.reason,
  });

  const user = await UserModel.findById(input.userId);

  if (!user) {
    return null;
  }

  user.points = Math.max(0, (user.points ?? 0) + points);
  const level = getLevel(user.points);
  user.level = level.level;
  user.levelTitle = level.levelTitle;
  await user.save();
  await syncBadges(user._id.toString(), user.points);

  return user;
}

export async function syncBadges(userId: string, points: number) {
  const badges = await BadgeModel.find({ pointsRequired: { $lte: points } });

  for (const badge of badges) {
    const result = await UserBadgeModel.updateOne(
      { userId, badgeId: badge._id.toString() },
      { $setOnInsert: { userId, badgeId: badge._id.toString(), earnedAt: new Date() } },
      { upsert: true },
    );

    if (result.upsertedCount > 0) {
      await createNotification({
        userId,
        type: "badge_earned",
        title: "Badge earned",
        body: `You earned the ${badge.title} badge.`,
        data: { badgeId: badge._id.toString(), badgeCode: badge.code },
      });
    }
  }
}
