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
  Dashboard: undefined;
  Complaints: undefined;
  Report: undefined;
  Profile: undefined;
};
