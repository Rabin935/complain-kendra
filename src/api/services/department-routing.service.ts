import type { ComplaintCategory } from "../types";

const categoryDepartmentMap: Record<ComplaintCategory, string> = {
  road: "Road Department",
  water: "Water Supply",
  power: "Electricity Authority",
  waste: "Sanitation",
  trees: "Parks & Environment",
  other: "General Administration",
};

export function getDepartmentForCategory(category: ComplaintCategory): string {
  // This is the central routing table for automatic department assignment.
  return categoryDepartmentMap[category] ?? categoryDepartmentMap.other;
}

