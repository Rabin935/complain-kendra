import { defaultSession } from "../domain/api-console.defaults";
import type { SessionState } from "../domain/api-console.types";

const keys = {
  citizenToken: "ckCitizenToken",
  citizenRefreshToken: "ckCitizenRefresh",
  officerToken: "ckOfficerToken",
  officerRefreshToken: "ckOfficerRefresh",
} as const;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function loadSession(): SessionState {
  if (!canUseStorage()) {
    return defaultSession;
  }

  return {
    citizenToken: window.localStorage.getItem(keys.citizenToken) ?? "",
    citizenRefreshToken: window.localStorage.getItem(keys.citizenRefreshToken) ?? "",
    officerToken: window.localStorage.getItem(keys.officerToken) ?? "",
    officerRefreshToken: window.localStorage.getItem(keys.officerRefreshToken) ?? "",
  };
}

export function saveSession(session: SessionState): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(keys.citizenToken, session.citizenToken);
  window.localStorage.setItem(keys.citizenRefreshToken, session.citizenRefreshToken);
  window.localStorage.setItem(keys.officerToken, session.officerToken);
  window.localStorage.setItem(keys.officerRefreshToken, session.officerRefreshToken);
}
