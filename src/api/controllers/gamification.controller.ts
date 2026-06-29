import type { NextFunction, Request, Response } from "express";
import BadgeModel from "../models/Badge";
import PointEventModel from "../models/PointEvent";
import UserModel from "../models/User";
import { AppError } from "../utils/appError";

export async function leaderboard(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const users = await UserModel.find({ isBanned: false })
      .sort({ points: -1, createdAt: 1 })
      .limit(50);

    response.status(200).json({
      success: true,
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
