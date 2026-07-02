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
  Browse: undefined;
  Profile: undefined;
};

export type UserStackParamList = {
  MainTabs: undefined;
  Report: { category?: CitizenComplaintCategory } | undefined;
  ComplaintDetail: {
    complaintId: string;
  };
};
