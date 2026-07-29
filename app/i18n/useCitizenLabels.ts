import { categoryMeta as categoryStyles } from "../features/user/data/citizenSampleData";
import type {
  CitizenComplaintCategory,
  CitizenComplaintPriority,
  CitizenComplaintStatus,
} from "../features/user/types/citizen.types";
import { useTranslation } from "./LanguageContext";

export function useCitizenLabels() {
  const { t } = useTranslation("citizen");

  const statusLabels: Record<CitizenComplaintStatus, string> = {
    pending: t("statusPending"),
    accepted: t("statusAccepted"),
    in_progress: t("statusInProgress"),
    resolved: t("statusResolved"),
    rejected: t("statusRejected"),
  };

  const priorityLabels: Record<CitizenComplaintPriority, string> = {
    normal: t("priorityNormal"),
    high: t("priorityHigh"),
    critical: t("priorityCritical"),
  };

  const categoryLabels: Record<CitizenComplaintCategory, string> = {
    road: t("categoryRoad"),
    water: t("categoryWater"),
    power: t("categoryPower"),
    waste: t("categoryWaste"),
    trees: t("categoryTrees"),
    other: t("categoryOther"),
  };

  const categoryMeta = Object.fromEntries(
    (Object.keys(categoryStyles) as CitizenComplaintCategory[]).map((key) => [
      key,
      {
        ...categoryStyles[key],
        label: categoryLabels[key],
      },
    ]),
  ) as typeof categoryStyles;

  function formatRelativeTime(value: string): string {
    const date = new Date(value);
    const diffMs = Date.now() - date.getTime();

    if (Number.isNaN(diffMs) || diffMs < 60_000) {
      return t("justNow");
    }

    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 60) {
      return t("minutesAgo", { count: minutes });
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return t("hoursAgo", { count: hours });
    }

    const days = Math.floor(hours / 24);
    return t("daysAgo", { count: days });
  }

  return {
    statusLabels,
    priorityLabels,
    categoryLabels,
    categoryMeta,
    formatRelativeTime,
    t,
  };
}
