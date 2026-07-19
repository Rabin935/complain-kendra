import type { Content } from "@google/generative-ai";
import { geminiModel } from "../config/gemini";
import {
  COMPLAINT_CATEGORIES,
  type ComplaintAiAnalysis,
  type ComplaintCategory,
  type ComplaintPriority,
} from "../types";
import { AppError } from "../utils/appError";
import { normalizeCategory } from "../utils/request.utils";
import { getDepartmentForCategory } from "./department-routing.service";
import { detectDuplicateComplaint } from "./duplicate-detection.service";

export type AnalysisResult = ComplaintAiAnalysis;

interface AnalyzeInput {
  title?: string;
  description: string;
  category?: ComplaintCategory;
  lat?: number;
  lng?: number;
  photoCount?: number;
  photoUrl?: string;
  photo?: {
    data: string;
    mimeType: string;
  };
}

// Every AI provider must implement this small contract. Controllers call analyzeComplaint()
// only, so a real model can replace the mock without controller changes.
interface ComplaintAnalyzer {
  analyze(input: AnalyzeInput): Promise<AnalysisResult>;
}

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

function improveDescription(input: AnalyzeInput, category: ComplaintCategory, sizeEstimate?: string): string {
  const cleanDescription = input.description.trim().replace(/\s+/g, " ");
  const hasPhoto = Boolean(input.photoCount || input.photo || input.photoUrl);

  if (category === "waste") {
    return "A large amount of garbage is piled up along the roadside, creating a strong smell and making the area unpleasant and unsafe for people passing by. Please arrange cleanup as soon as possible and prevent further dumping at this location.";
  }

  if (category === "road") {
    return "The road surface is damaged and is causing difficulty for vehicles and pedestrians using this route. Please inspect the location and repair the affected section as soon as possible to reduce safety risks.";
  }

  if (category === "water") {
    return "There is a water or drainage issue at this location that is affecting nearby residents and pedestrians. Please inspect the problem, stop the leakage or blockage, and restore normal service as soon as possible.";
  }

  if (category === "power") {
    return "There is an electrical issue at this location that may affect public safety and nearby households. Please send the responsible team to inspect and repair it as soon as possible.";
  }

  if (category === "trees") {
    return "Tree branches or greenery at this location are creating an obstruction or safety concern for people nearby. Please inspect the area and clear or trim the affected section as soon as possible.";
  }

  const photoContext = hasPhoto ? " The attached photo provides additional evidence of the issue." : "";
  const sizeContext = sizeEstimate && !/medium issue/i.test(sizeEstimate) ? ` The problem appears to be ${sizeEstimate.toLowerCase()}.` : "";

  return `${cleanDescription}${sizeContext}${photoContext} Please inspect this location and take action as soon as possible.`.slice(0, 500);
}

function buildAnalysisResult(input: {
  detectedCategory: ComplaintCategory;
  confidence: number;
  severityLabel: AnalysisResult["severityLabel"];
  sizeEstimate?: string;
  priority: ComplaintPriority;
  department: string;
  etaDays: number;
  duplicateCheck: AnalysisResult["duplicateCheck"];
  verified: boolean;
  summary: string;
  improvedDescription: string;
  keywords: string[];
}): AnalysisResult {
  // The snake-case fields mirror the exact values used by the app-facing camel-case fields.
  // Keeping both lets the database satisfy the complaint_ai shape without breaking current UI code.
  return {
    detected_category: input.detectedCategory,
    confidence_score: input.confidence,
    severity: input.severityLabel,
    estimated_resolution_days: input.etaDays,
    duplicate_probability: input.duplicateCheck.probability ?? 0,
    detectedCategory: input.detectedCategory,
    confidence: input.confidence,
    severityLabel: input.severityLabel,
    sizeEstimate: input.sizeEstimate,
    priority: input.priority,
    department: input.department,
    etaDays: input.etaDays,
    duplicateCheck: input.duplicateCheck,
    verified: input.verified,
    summary: input.summary,
    improvedDescription: input.improvedDescription,
    keywords: input.keywords,
    analyzedAt: new Date(),
  };
}

async function findDuplicate(input: AnalyzeInput, category: ComplaintCategory) {
  const duplicate = await detectDuplicateComplaint({
    category,
    description: input.description,
    lat: input.lat,
    lng: input.lng,
  });

  if (!duplicate.duplicate_found) {
    return {
      isDuplicate: false,
      complaintId: duplicate.duplicate_complaint_id,
      complaintNo: duplicate.duplicate_complaint_no,
      title: duplicate.duplicate_title,
      distanceMeters: duplicate.distance_meters,
      probability: duplicate.similarity_score,
    };
  }

  return {
    isDuplicate: true,
    complaintId: duplicate.duplicate_complaint_id,
    complaintNo: duplicate.duplicate_complaint_no,
    title: duplicate.duplicate_title,
    distanceMeters: duplicate.distance_meters,
    probability: duplicate.similarity_score,
  };
}

const mockAnalyzer: ComplaintAnalyzer = {
  analyze: mockAnalyzeComplaint,
};

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

  const sizeEstimate = estimateSize(input.description, input.photoCount);
  const duplicateCheck = await findDuplicate(input, category);

  return buildAnalysisResult({
    detectedCategory: category,
    confidence,
    severityLabel,
    sizeEstimate,
    priority,
    department: getDepartmentForCategory(category),
    etaDays: priorityEtaMap[priority],
    duplicateCheck,
    verified: confidence >= 70,
    summary: `${getDepartmentForCategory(category)} should review this ${severityLabel} priority complaint. The report suggests ${sizeEstimate.toLowerCase()}.`,
    improvedDescription: improveDescription(input, category, sizeEstimate),
    keywords: extractKeywords(input.description, category),
  });
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
  const systemPrompt = `Analyze a Nepal ward-level civic complaint using the text and any attached image. Return JSON only with keys detected_category, confidence_score, severity, priority, department, estimated_resolution_days, duplicate_probability, summary, improved_description, sizeEstimate, keywords. The improved_description must be a polished citizen complaint under 500 characters, written in natural first-person/community-report style. It should describe the visible problem, impact on people nearby, and request action. Do not include labels or analysis phrases such as "Observed impact", "This appears to be", "photo evidence", category names, confidence, department, or metadata. Use categories ${categories}. Use priorities low, medium, high, critical.`;
  const text = `Title: ${input.title ?? ""}\nCategory hint: ${input.category ?? ""}\nUser description: ${input.description}`;
  const parts: Content["parts"] = [{ text }];

  if (input.photo) {
    parts.push({
      inlineData: {
        mimeType: input.photo.mimeType,
        data: input.photo.data,
      },
    });
  } else
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
    normalizeCategory(parsed.detected_category ?? parsed.detectedCategory, false) ??
    input.category ??
    "other";
  const priority = (parsed.priority && ["low", "medium", "high", "critical"].includes(parsed.priority)
    ? parsed.priority
    : inferPriority(input.description, detectedCategory)) as ComplaintPriority;
  const duplicateCheck = await findDuplicate(input, detectedCategory);
  const duplicateProbability =
    typeof parsed.duplicate_probability === "number"
      ? clamp(parsed.duplicate_probability, 0, 1)
      : duplicateCheck.probability;
  const etaDays = clamp(
    Number(parsed.estimated_resolution_days ?? parsed.etaDays ?? priorityEtaMap[priority]),
    1,
    30,
  );

  return buildAnalysisResult({
    detectedCategory,
    confidence: clamp(Number(parsed.confidence_score ?? parsed.confidence ?? 75), 0, 100),
    severityLabel:
      parsed.severity && ["low", "medium", "high", "critical"].includes(parsed.severity)
        ? parsed.severity
        : severityFromPriority(priority),
    sizeEstimate: parsed.sizeEstimate || estimateSize(input.description, input.photoCount),
    priority,
    department: parsed.department || getDepartmentForCategory(detectedCategory),
    etaDays,
    duplicateCheck: {
      ...duplicateCheck,
      probability: duplicateProbability,
    },
    verified: Boolean(parsed.verified ?? true),
    summary: parsed.summary || `${getDepartmentForCategory(detectedCategory)} should review this complaint.`,
    improvedDescription:
      typeof (parsed as { improved_description?: unknown }).improved_description === "string"
        ? (parsed as { improved_description: string }).improved_description.slice(0, 500)
        : typeof (parsed as { improvedDescription?: unknown }).improvedDescription === "string"
          ? (parsed as { improvedDescription: string }).improvedDescription.slice(0, 500)
          : improveDescription(input, detectedCategory, parsed.sizeEstimate || estimateSize(input.description, input.photoCount)),
    keywords: Array.isArray(parsed.keywords)
      ? parsed.keywords.map(String).slice(0, 5)
      : extractKeywords(input.description, detectedCategory),
  });
}

const geminiAnalyzer: ComplaintAnalyzer = {
  analyze: geminiAnalyzeComplaint,
};

export async function analyzeComplaint(inputOrDescription: AnalyzeInput | string, photoUrl?: string): Promise<AnalysisResult> {
  const input =
    typeof inputOrDescription === "string"
      ? { description: inputOrDescription, photoUrl }
      : inputOrDescription;

  if (!input.description?.trim()) {
    throw new AppError("Complaint description is required for analysis.", 400);
  }

  if (!geminiModel || process.env.AI_PROVIDER?.toLowerCase() === "mock") {
    return mockAnalyzer.analyze(input);
  }

  try {
    return await geminiAnalyzer.analyze(input);
  } catch (error) {
    console.warn("AI provider failed; using mock complaint analysis.", error);
    return mockAnalyzer.analyze(input);
  }
}
