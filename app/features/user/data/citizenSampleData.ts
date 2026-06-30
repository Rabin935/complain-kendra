import type {
  AiAnalysisResult,
  CitizenBadge,
  CitizenComplaintCategory,
  CitizenLocation,
  CitizenNotification,
  CitizenProfile,
  CitizenStats,
} from "../types/citizen.types";

export const categoryMeta: Record<
  CitizenComplaintCategory,
  { label: string; icon: string; color: string; softColor: string }
> = {
  road: {
    label: "Road",
    icon: "road-variant",
    color: "#6038B0",
    softColor: "#EEE7FA",
  },
  water: {
    label: "Water",
    icon: "water-outline",
    color: "#0EA5E9",
    softColor: "#E0F2FE",
  },
  power: {
    label: "Power",
    icon: "lightning-bolt-outline",
    color: "#F59E0B",
    softColor: "#FEF3C7",
  },
  waste: {
    label: "Waste",
    icon: "trash-can-outline",
    color: "#16A34A",
    softColor: "#DCFCE7",
  },
  trees: {
    label: "Trees",
    icon: "tree-outline",
    color: "#15803D",
    softColor: "#DFF7E8",
  },
  other: {
    label: "Other",
    icon: "dots-horizontal-circle-outline",
    color: "#64748B",
    softColor: "#F1F5F9",
  },
};

export const sampleLocation: CitizenLocation = {
  address: "Koteshwor Chowk, near Ring Road",
  area: "Koteshwor",
  ward: "Ward 12",
  wardId: "ward-12-kathmandu",
  wardName: "Ward 12",
  wardNumber: "12",
  city: "Kathmandu",
  municipality: "Kathmandu Metropolitan City",
  province: "Bagmati Province",
  lat: 27.6783,
  lng: 85.349,
};

export const sampleProfile: CitizenProfile = {
  id: "current-user",
  name: "Citizen",
  email: "citizen@example.com",
  phone: "+977 98 0000 0000",
  initials: "CT",
  location: sampleLocation,
  level: 1,
  levelTitle: "Citizen Reporter",
  points: 0,
  language: "English",
  isPublic: true,
};

export const sampleStats: CitizenStats = {
  pending: 0,
  inProgress: 0,
  resolved: 0,
  wardTotal: 0,
  reportsSubmitted: 0,
  upvotesReceived: 0,
  badgesEarned: 0,
};

export const sampleNotifications: CitizenNotification[] = [];

export const sampleBadges: CitizenBadge[] = [
  {
    id: "first-report",
    title: "First Report",
    description: "Submitted the first verified complaint.",
    icon: "flag-checkered",
    earned: false,
    progress: 0,
  },
  {
    id: "civic-hero",
    title: "Civic Hero",
    description: "Helped resolve multiple ward-level issues.",
    icon: "shield-star-outline",
    earned: false,
    progress: 0,
  },
  {
    id: "ward-champion",
    title: "Ward Champion",
    description: "Reached 250 useful upvotes in your ward.",
    icon: "medal-outline",
    earned: false,
    progress: 0,
  },
  {
    id: "rapid-reporter",
    title: "Rapid Reporter",
    description: "Report urgent problems within one hour.",
    icon: "timer-sand",
    earned: false,
    progress: 0,
  },
];

export const sampleAiAnalysis: AiAnalysisResult = {
  verified: false,
  confidence: 0,
  detectedCategory: "other",
  severityLabel: "Manual review",
  sizeEstimate: "",
  priority: "normal",
  department: "Ward Review Desk",
  etaDays: 3,
  summary: "AI analysis is pending.",
  keywords: [],
  duplicateCheck: {
    isDuplicate: false,
    complaintNo: "",
    title: "",
    distanceMeters: 0,
  },
};
