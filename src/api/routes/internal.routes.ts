import { Router } from "express";
import { analyzeComplaint } from "../services/ai.service";
import { AppError } from "../utils/appError";
import { getNumber, getString, normalizeCategory } from "../utils/request.utils";

const internalRouter = Router();

internalRouter.post("/ai/analyze", async (request, response, next) => {
  try {
    const body = request.body as Record<string, unknown>;
    const description = getString(body.description);

    if (!description) {
      throw new AppError("Description is required for analysis.", 400);
    }

    const analysis = await analyzeComplaint({
      title: getString(body.title),
      description,
      category: normalizeCategory(body.category),
      lat: getNumber(body.lat),
      lng: getNumber(body.lng),
      photoCount: getNumber(body.photo_count ?? body.photoCount),
      photoUrl: getString(body.photoUrl ?? body.photo_url),
    });

    response.status(200).json({
      success: true,
      analysis,
      data: analysis,
      ...analysis,
    });
  } catch (error) {
    next(error);
  }
});

export default internalRouter;
