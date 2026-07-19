import { colors } from "./colors";

/**
 * Design tokens ported from the Complain-Kendra hi-fi prototype.
 * Colours live in ./colors — this file covers the shape of things:
 * corner radii, elevation, and the status-badge palette.
 */

export const radii = {
  chip: 10,
  tile: 12,
  field: 14,
  button: 16,
  sheet: 22,
  card: 28,
  hero: 32,
  pill: 999,
} as const;

/**
 * The prototype leans on layered CSS box-shadows. React Native only renders a
 * single shadow per view, so each of these keeps the dominant (outer) layer and
 * drops the inner highlight.
 */
export const shadows = {
  /** Card lifted over a hero — `0 24px 50px -20px rgba(42,21,80,0.22)` */
  card: {
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.22,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 18 },
    elevation: 10,
  },
  /** Primary CTA — `0 12px 24px -8px #6038B0` */
  button: {
    shadowColor: colors.primary,
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  /** Focus ring stand-in for `0 0 0 4px #EEE8FA` */
  focusRing: {
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  /** Floating logo mark — `0 18px 38px rgba(42,21,80,0.35)` */
  logo: {
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.35,
    shadowRadius: 19,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
} as const;

/**
 * Officer console palette. The prototype deliberately gives the officer side a
 * dark "console" chrome so it reads as a different surface from the citizen
 * app, which stays light.
 */
export const officerColors = {
  background: "#0F0A1F",
  surface: "#1A1430",
  surfaceRaised: "#251C42",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.14)",
  text: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.7)",
  textMuted: "rgba(255,255,255,0.45)",
  accent: "#C4B5FD",
} as const;

export type BadgeKind = "pending" | "progress" | "resolved" | "high";

/** Status pills — background / foreground / MaterialCommunityIcons glyph. */
export const badgeTokens: Record<
  BadgeKind,
  { background: string; foreground: string; icon: string }
> = {
  pending: { background: "#FEF3C7", foreground: "#92400E", icon: "clock-outline" },
  progress: { background: "#DBEAFE", foreground: "#1E40AF", icon: "loading" },
  resolved: { background: "#DCFCE7", foreground: "#166534", icon: "check-circle" },
  high: { background: "#FEE2E2", foreground: "#991B1B", icon: "alert-outline" },
};
