import type { ComplaintCategory, ComplaintPriority } from "../types";

type AiSeverityInput = ComplaintPriority | number | undefined;

interface PriorityEngineInput {
  category: ComplaintCategory;
  description: string;
  duplicateCount?: number;
  aiSeverity?: AiSeverityInput;
}

interface PriorityEngineResult {
  priority: ComplaintPriority;
  score: number;
  reasons: string[];
}

const categoryRiskScore: Record<ComplaintCategory, number> = {
  road: 2,
  water: 2,
  power: 3,
  waste: 1,
  trees: 1,
  other: 0,
};

const urgentKeywordRules = [
  { pattern: /\b(emergency|urgent|danger|dangerous|life threatening)\b/i, score: 4, reason: "Urgent safety wording detected" },
  { pattern: /\b(injury|injured|accident|crash|death)\b/i, score: 4, reason: "Injury or accident risk mentioned" },
  { pattern: /\b(fire|spark|electrocution|live wire|fallen wire)\b/i, score: 4, reason: "Electrical or fire hazard mentioned" },
  { pattern: /\b(flood|overflow|contaminated|sewage|sewer)\b/i, score: 3, reason: "Public health or flooding keyword detected" },
  { pattern: /\b(blocked|collapsed|main road|school|hospital|children|elderly)\b/i, score: 2, reason: "High-impact location or blockage mentioned" },
];

function scoreAiSeverity(aiSeverity: AiSeverityInput): { score: number; reason?: string } {
  if (typeof aiSeverity === "number") {
    if (aiSeverity >= 9) {
      return { score: 4, reason: "AI severity is critical" };
    }

    if (aiSeverity >= 7) {
      return { score: 3, reason: "AI severity is high" };
    }

    if (aiSeverity >= 4) {
      return { score: 1, reason: "AI severity is medium" };
    }

    return { score: 0 };
  }

  if (aiSeverity === "critical") {
    return { score: 4, reason: "AI severity is critical" };
  }

  if (aiSeverity === "high") {
    return { score: 3, reason: "AI severity is high" };
  }

  if (aiSeverity === "medium") {
    return { score: 1, reason: "AI severity is medium" };
  }

  return { score: 0 };
}

function priorityFromScore(score: number): ComplaintPriority {
  if (score >= 9) {
    return "critical";
  }

  if (score >= 6) {
    return "high";
  }

  if (score >= 3) {
    return "medium";
  }

  return "low";
}

export function calculateComplaintPriority(input: PriorityEngineInput): PriorityEngineResult {
  const reasons: string[] = [];
  let score = categoryRiskScore[input.category];

  if (score > 0) {
    reasons.push(`${input.category} category has base risk score ${score}`);
  }

  for (const rule of urgentKeywordRules) {
    if (rule.pattern.test(input.description)) {
      score += rule.score;
      reasons.push(rule.reason);
    }
  }

  const duplicateCount = input.duplicateCount ?? 0;
  if (duplicateCount >= 5) {
    score += 3;
    reasons.push("Many similar open complaints exist");
  } else if (duplicateCount >= 2) {
    score += 2;
    reasons.push("Multiple similar open complaints exist");
  } else if (duplicateCount === 1) {
    score += 1;
    reasons.push("One similar open complaint exists");
  }

  const aiSeverityScore = scoreAiSeverity(input.aiSeverity);
  score += aiSeverityScore.score;
  if (aiSeverityScore.reason) {
    reasons.push(aiSeverityScore.reason);
  }

  // A bounded score keeps old data and unusual inputs from creating extreme values.
  const boundedScore = Math.max(0, Math.min(score, 12));

  return {
    priority: priorityFromScore(boundedScore),
    score: boundedScore,
    reasons: reasons.length ? reasons : ["No urgent risk signals detected"],
  };
}

