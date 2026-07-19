import type { NextFunction, Request, Response } from "express";
import BadgeModel from "../models/Badge";
import PointEventModel from "../models/PointEvent";
import UserModel from "../models/User";
import { AppError } from "../utils/appError";

export async function leaderboard(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const requestedPeriod = String(request.query.period ?? "all");
    const period = ["weekly", "monthly", "all"].includes(requestedPeriod)
      ? requestedPeriod
      : "all";

    if (period !== "all") {
      const now = new Date();
      const start =
        period === "weekly"
          ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          : new Date(now.getFullYear(), now.getMonth(), 1);
      const pointTotals = await PointEventModel.aggregate<{
        _id: unknown;
        points: number;
      }>([
        { $match: { createdAt: { $gte: start } } },
        { $group: { _id: "$userId", points: { $sum: "$points" } } },
        { $sort: { points: -1 } },
        { $limit: 50 },
      ]);
      const users = await UserModel.find({
        _id: { $in: pointTotals.map((entry) => entry._id) },
        isBanned: false,
      });
      const usersById = new Map(users.map((user) => [user._id.toString(), user]));
      const rankedUsers = pointTotals
        .map((entry) => ({
          user: usersById.get(String(entry._id)),
          points: entry.points,
        }))
        .filter((entry): entry is { user: NonNullable<typeof entry.user>; points: number } =>
          Boolean(entry.user),
        );

      response.status(200).json({
        success: true,
        period,
        leaderboard: rankedUsers.map(({ user, points }, index) => ({
          rank: index + 1,
          id: user._id.toString(),
          name: user.isPublic ? user.name : "Private citizen",
          ward: user.ward,
          points,
          level: user.level,
          levelTitle: user.levelTitle,
          avatarUrl: user.isPublic ? user.avatarUrl : undefined,
        })),
      });
      return;
    }

    const users = await UserModel.find({ isBanned: false })
      .sort({ points: -1, createdAt: 1 })
      .limit(50);

    response.status(200).json({
      success: true,
      period,
      leaderboard: users.map((user, index) => ({
        rank: index + 1,
        id: user._id.toString(),
        name: user.isPublic ? user.name : "Private citizen",
        ward: user.ward,
        points: user.points,
        level: user.level,
        levelTitle: user.levelTitle,
        avatarUrl: user.isPublic ? user.avatarUrl : undefined,
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function leaderboardMe(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.user || request.user.type !== "citizen") {
      throw new AppError("Citizen authentication is required.", 401);
    }

    const users = await UserModel.find({ isBanned: false }).sort({ points: -1, createdAt: 1 });
    const index = users.findIndex((user) => user._id.toString() === request.user?.subjectId);
    const me = index >= 0 ? users[index] : null;
    const history = await PointEventModel.find({ userId: request.user.subjectId })
      .sort({ createdAt: -1 })
      .limit(20);

    response.status(200).json({
      success: true,
      rank: index >= 0 ? index + 1 : null,
      user: me
        ? {
            id: me._id.toString(),
            name: me.name,
            points: me.points,
            level: me.level,
            levelTitle: me.levelTitle,
          }
        : null,
      history,
    });
  } catch (error) {
    next(error);
  }
}

export async function badges(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const badgeList = await BadgeModel.find().sort({ pointsRequired: 1 });

    response.status(200).json({
      success: true,
      badges: badgeList,
    });
  } catch (error) {
    next(error);
  }
}
