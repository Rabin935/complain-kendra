import { colors } from "../../../constants/colors";
import type {
  CitizenComplaintPriority,
  CitizenComplaintStatus,
} from "../types/citizen.types";

export const statusLabels: Record<CitizenComplaintStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  resolved: "Resolved",
  rejected: "Rejected",
};

export const statusColors: Record<CitizenComplaintStatus, string> = {
  pending: colors.warning,
  in_progress: colors.info,
  resolved: colors.success,
  rejected: colors.error,
};

export const priorityLabels: Record<CitizenComplaintPriority, string> = {
  normal: "Normal",
  high: "High Priority",
  critical: "Critical",
};

export const priorityColors: Record<CitizenComplaintPriority, string> = {
  normal: colors.textMuted,
  high: colors.error,
  critical: colors.error,
};

export function formatCompactDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
  });
}

export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }

  return `${distanceKm.toFixed(1)}km`;
}
