import type { Content } from "@google/generative-ai";
import ComplaintModel from "../models/Complaint";
import { geminiModel } from "../config/gemini";
import {
  COMPLAINT_CATEGORIES,
  type ComplaintAiAnalysis,
  type ComplaintCategory,
  type ComplaintPriority,
} from "../types";
import { AppError } from "../utils/appError";
import { normalizeCategory } from "../utils/request.utils";

export type AnalysisResult = ComplaintAiAnalysis;

interface AnalyzeInput {
  title?: string;
  description: string;
  category?: ComplaintCategory;
  lat?: number;
  lng?: number;
  photoCount?: number;
  photoUrl?: string;
}

const categoryDepartmentMap: Record<ComplaintCategory, string> = {
  road: "Roads and Infrastructure",
  water: "Water Supply and Drainage",
  power: "Electricity Coordination Desk",
  waste: "Waste Management",
  trees: "Parks and Urban Forestry",
  other: "Ward Office Review Desk",
};

const priorityEtaMap: Record<ComplaintPriority, number> = {
  low: 10,
  medium: 5,
  high: 3,
  critical: 1,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function inferCategory(description: string, fallback?: ComplaintCategory): ComplaintCategory {
  const text = description.toLowerCase();

  if (/(pothole|road|asphalt|sidewalk|footpath|bridge|traffic|street)/.test(text)) {
    return "road";
  }

  if (/(water|sewage|sewer|drain|pipe|flood|tap|leak)/.test(text)) {
    return "water";
  }

  if (/(power|electric|wire|pole|transformer|outage|light)/.test(text)) {
    return "power";
  }

  if (/(garbage|waste|trash|dump|sanitation|rubbish)/.test(text)) {
    return "waste";
  }

  if (/(tree|branch|fallen|park)/.test(text)) {
    return "trees";
  }

  return fallback ?? "other";
}

function inferPriority(description: string, category: ComplaintCategory): ComplaintPriority {
  const text = description.toLowerCase();
  let score = 2;

  if (/(danger|accident|injury|blocked|emergency|fire|collapsed|electrocution)/.test(text)) {
    score += 2;
  }

  if (/(school|hospital|main road|ring road|children|elderly|night)/.test(text)) {
    score += 1;
  }

  if (category === "power" && /(wire|spark|transformer|pole)/.test(text)) {
    score += 2;
  }

  if (category === "water" && /(sewage|flood|contaminated)/.test(text)) {
    score += 1;
  }

  if (score >= 5) {
    return "critical";
  }

  if (score >= 4) {
    return "high";
  }

  if (score >= 2) {
    return "medium";
  }

  return "low";
}

function severityFromPriority(priority: ComplaintPriority): AnalysisResult["severityLabel"] {
  if (priority === "critical") {
    return "critical";
  }

  if (priority === "high") {
    return "high";
  }

  if (priority === "medium") {
    return "medium";
  }

  return "low";
}

function estimateSize(description: string, photoCount = 0): string {
  const text = description.toLowerCase();

  if (/(large|huge|big|many|multiple|several|blocked|overflow)/.test(text)) {
    return photoCount > 0 ? "Large visible impact area" : "Large reported impact area";
  }

  if (/(small|minor|single|one)/.test(text)) {
    return "Small localized issue";
  }

  return photoCount > 0 ? "Medium issue with photo evidence" : "Medium reported issue";
}

function extractKeywords(description: string, category: ComplaintCategory): string[] {
  const words = description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3);
  const unique = Array.from(new Set([category, ...words]));

  return unique.slice(0, 5);
}

async function findDuplicate(input: AnalyzeInput, category: ComplaintCategory) {
  const titleText = input.title?.trim();
  const keyword = titleText || input.description.split(/\s+/).slice(0, 5).join(" ");
  const candidate = await ComplaintModel.findOne({
    category,
    status: { $ne: "resolved" },
    $text: keyword ? { $search: keyword } : undefined,
  }).sort({ createdAt: -1 });

  if (!candidate) {
    return {
      isDuplicate: false,
    };
  }

  return {
    isDuplicate: true,
    complaintId: candidate._id.toString(),
    complaintNo: candidate.complaintNo,
    title: candidate.title,
    distanceMeters: input.lat && input.lng ? 280 : undefined,
  };
}

async function mockAnalyzeComplaint(input: AnalyzeInput): Promise<AnalysisResult> {
  const category = input.category ?? inferCategory(input.description);
  const priority = inferPriority(input.description, category);
  const severityLabel = severityFromPriority(priority);
  const confidence = clamp(
    72 +
      (input.category === category ? 10 : 0) +
      (input.photoCount || input.photoUrl ? 8 : 0) +
      (priority === "critical" ? 5 : 0),
    55,
    98,
  );

  return {
    detectedCategory: category,
    confidence,
    severityLabel,
    sizeEstimate: estimateSize(input.description, input.photoCount),
    priority,
    department: categoryDepartmentMap[category],
    etaDays: priorityEtaMap[priority],
    duplicateCheck: await findDuplicate(input, category),
    verified: confidence >= 70,
    summary: `${categoryDepartmentMap[category]} should review this ${severityLabel} priority complaint. The report suggests ${estimateSize(input.description, input.photoCount).toLowerCase()}.`,
    keywords: extractKeywords(input.description, category),
    analyzedAt: new Date(),
  };
}

async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

async function geminiAnalyzeComplaint(input: AnalyzeInput): Promise<AnalysisResult> {
  if (!geminiModel) {
    return mockAnalyzeComplaint(input);
  }

  const categories = COMPLAINT_CATEGORIES.join(", ");
  const systemPrompt = `Analyze a Nepal ward-level civic complaint. Return JSON only with keys detectedCategory, confidence, severityLabel, sizeEstimate, priority, department, etaDays, verified, summary, keywords. Use categories ${categories}. Use priorities low, medium, high, critical.`;
  const text = `Title: ${input.title ?? ""}\nCategory hint: ${input.category ?? ""}\nDescription: ${input.description}`;
  const parts: Content["parts"] = [{ text }];

  if (input.photoUrl) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: await fetchImageAsBase64(input.photoUrl),
      },
    });
  }

  const response = await geminiModel.generateContent({
    contents: [{ role: "user", parts }],
    systemInstruction: systemPrompt,
  });
  const raw = response.response.text();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new AppError("Invalid AI response format.", 502);
  }

  const parsed = JSON.parse(jsonMatch[0]) as Partial<AnalysisResult>;
  const detectedCategory =
    normalizeCategory(parsed.detectedCategory, false) ?? input.category ?? "other";
  const priority = (parsed.priority && ["low", "medium", "high", "critical"].includes(parsed.priority)
    ? parsed.priority
    : inferPriority(input.description, detectedCategory)) as ComplaintPriority;

  return {
    detectedCategory,
    confidence: clamp(Number(parsed.confidence ?? 75), 0, 100),
    severityLabel: severityFromPriority(priority),
    sizeEstimate: parsed.sizeEstimate || estimateSize(input.description, input.photoCount),
    priority,
    department: parsed.department || categoryDepartmentMap[detectedCategory],
    etaDays: clamp(Number(parsed.etaDays ?? priorityEtaMap[priority]), 1, 30),
    duplicateCheck: await findDuplicate(input, detectedCategory),
    verified: Boolean(parsed.verified ?? true),
    summary: parsed.summary || `${categoryDepartmentMap[detectedCategory]} should review this complaint.`,
    keywords: Array.isArray(parsed.keywords)
      ? parsed.keywords.map(String).slice(0, 5)
      : extractKeywords(input.description, detectedCategory),
    analyzedAt: new Date(),
  };
}

export async function analyzeComplaint(inputOrDescription: AnalyzeInput | string, photoUrl?: string): Promise<AnalysisResult> {
  const input =
    typeof inputOrDescription === "string"
      ? { description: inputOrDescription, photoUrl }
      : inputOrDescription;

  if (!input.description?.trim()) {
    throw new AppError("Complaint description is required for analysis.", 400);
  }

  if (!geminiModel || process.env.AI_PROVIDER?.toLowerCase() === "mock") {
    return mockAnalyzeComplaint(input);
  }

  try {
    return await geminiAnalyzeComplaint(input);
  } catch (error) {
    console.warn("AI provider failed; using mock complaint analysis.", error);
    return mockAnalyzeComplaint(input);
  }
}
