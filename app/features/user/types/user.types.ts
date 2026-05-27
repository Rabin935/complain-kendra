import type { CitizenComplaintCategory } from "./citizen.types";

export interface DashboardMetric {
  label: string;
  value: string;
  caption: string;
}

export interface DashboardShortcut {
  title: string;
  description: string;
  icon: string;
  tone: "primary" | "accent" | "neutral";
}

export type UserTabParamList = {
  Home: undefined;
  Mine: undefined;
  Report: { category?: CitizenComplaintCategory } | undefined;
  Browse: undefined;
  Profile: undefined;
};
