import { useMemo, useState } from "react";
import {
  defaultApiBase,
  defaultCitizenLogin,
  defaultCitizenRegister,
  defaultOfficerLogin,
  defaultPasswordReset,
  defaultProfile,
} from "../domain/api-console.defaults";
import type {
  ApiEnvelope,
  CitizenLoginForm,
  CitizenRegisterForm,
  ConsoleTab,
  OfficerLoginForm,
  PasswordResetForm,
  ProfileForm,
  SessionState,
  StatusState,
} from "../domain/api-console.types";
import { ApiClient } from "../infrastructure/apiClient";
import { loadSession, saveSession } from "../infrastructure/browserStorage";

type AsyncAction = () => Promise<ApiEnvelope | void>;

export function useApiConsole() {
  const [activeTab, setActiveTab] = useState<ConsoleTab>("citizen");
  const [apiBase, setApiBase] = useState(defaultApiBase);
  const [session, setSession] = useState<SessionState>(() => loadSession());
  const [citizenLogin, setCitizenLogin] = useState<CitizenLoginForm>(defaultCitizenLogin);
  const [citizenRegister, setCitizenRegister] =
    useState<CitizenRegisterForm>(defaultCitizenRegister);
  const [passwordReset, setPasswordReset] =
    useState<PasswordResetForm>(defaultPasswordReset);
  const [profile, setProfile] = useState<ProfileForm>(defaultProfile);
  const [officerLogin, setOfficerLogin] = useState<OfficerLoginForm>(defaultOfficerLogin);
  const [status, setStatus] = useState<StatusState>({
    message: "Ready.",
    tone: "idle",
  });
  const [lastResponse, setLastResponse] = useState<unknown>({});

  const client = useMemo(
    () => new ApiClient(() => apiBase.replace(/\/+$/, "")),
    [apiBase],
  );

  function updateSession(nextSession: SessionState): void {
    setSession(nextSession);
    saveSession(nextSession);
  }

  async function run(label: string, action: AsyncAction): Promise<void> {
    try {
      setStatus({ message: `${label}...`, tone: "idle" });
      const result = await action();
      setLastResponse(result ?? { success: true });
      setStatus({ message: `${label} complete.`, tone: "success" });
      setActiveTab("output");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed.";
      setLastResponse({ success: false, message });
      setStatus({ message, tone: "error" });
      setActiveTab("output");
    }
  }

  async function loginCitizen(): Promise<void> {
    await run("Citizen login", async () => {
      const result = await client.request("/auth/login", {
        method: "POST",
        body: citizenLogin,
      });
      updateSession({
        ...session,
        citizenToken: result.accessToken || result.token || "",
        citizenRefreshToken: result.refreshToken || "",
      });
      return result;
    });
  }

  async function registerCitizen(): Promise<void> {
    await run("Citizen register", () =>
      client.request("/auth/register", {
        method: "POST",
        body: citizenRegister,
      }),
    );
  }

  async function refreshCitizen(): Promise<void> {
    await run("Refresh citizen token", async () => {
      const result = await client.request("/auth/refresh", {
        method: "POST",
        body: { refreshToken: session.citizenRefreshToken },
      });
      updateSession({
        ...session,
        citizenToken: result.accessToken || result.token || "",
        citizenRefreshToken: result.refreshToken || "",
      });
      return result;
    });
  }

  async function logoutCitizen(): Promise<void> {
    await run("Citizen logout", async () => {
      const result = await client.request("/auth/logout", {
        method: "POST",
        token: session.citizenToken,
        body: { refreshToken: session.citizenRefreshToken },
      });
      updateSession({ ...session, citizenToken: "", citizenRefreshToken: "" });
      return result;
    });
  }

  async function forgotPassword(): Promise<void> {
    await run("Forgot password", () =>
      client.request("/auth/forgot-password", {
        method: "POST",
        body: { email: passwordReset.email },
      }),
    );
  }

  async function resetPassword(): Promise<void> {
    await run("Reset password", () =>
      client.request("/auth/reset-password", {
        method: "POST",
        body: {
          token: passwordReset.token,
          password: passwordReset.password,
        },
      }),
    );
  }

  async function getProfile(): Promise<void> {
    await run("Get profile", () =>
      client.request("/users/me", {
        token: session.citizenToken,
      }),
    );
  }

  async function updateProfile(): Promise<void> {
    await run("Update profile", () =>
      client.request("/users/me", {
        method: "PATCH",
        token: session.citizenToken,
        body: {
          name: profile.name,
          phone: profile.phone,
          avatarUrl: profile.avatarUrl || undefined,
          isPublic: profile.isPublic,
        },
      }),
    );
  }

  async function changePassword(): Promise<void> {
    await run("Change password", () =>
      client.request("/users/me/password", {
        method: "PATCH",
        token: session.citizenToken,
        body: {
          currentPassword: profile.currentPassword,
          newPassword: profile.newPassword,
        },
      }),
    );
  }

  async function updateLanguage(): Promise<void> {
    await run("Update language", () =>
      client.request("/users/me/language", {
        method: "PATCH",
        token: session.citizenToken,
        body: { language: profile.language },
      }),
    );
  }

  async function loginOfficer(): Promise<void> {
    await run("Officer login", async () => {
      const result = await client.request("/officer/auth/login", {
        method: "POST",
        body: officerLogin,
      });
      updateSession({
        ...session,
        officerToken: result.accessToken || result.token || "",
        officerRefreshToken: result.refreshToken || "",
      });
      return result;
    });
  }

  async function getOfficerSessions(): Promise<void> {
    await run("Officer sessions", () =>
      client.request("/officer/auth/sessions", {
        token: session.officerToken,
      }),
    );
  }

  async function logoutOfficer(): Promise<void> {
    await run("Officer logout", async () => {
      const result = await client.request("/officer/auth/logout", {
        method: "POST",
        token: session.officerToken,
        body: { refreshToken: session.officerRefreshToken },
      });
      updateSession({ ...session, officerToken: "", officerRefreshToken: "" });
      return result;
    });
  }

  async function logoutAllOfficerSessions(): Promise<void> {
    await run("Officer logout all", async () => {
      const result = await client.request("/officer/auth/logout-all", {
        method: "POST",
        token: session.officerToken,
      });
      updateSession({ ...session, officerToken: "", officerRefreshToken: "" });
      return result;
    });
  }

  return {
    activeTab,
    apiBase,
    citizenLogin,
    citizenRegister,
    lastResponse,
    officerLogin,
    passwordReset,
    profile,
    session,
    status,
    actions: {
      changePassword,
      forgotPassword,
      getOfficerSessions,
      getProfile,
      loginCitizen,
      loginOfficer,
      logoutAllOfficerSessions,
      logoutCitizen,
      logoutOfficer,
      refreshCitizen,
      registerCitizen,
      resetPassword,
      setActiveTab,
      setApiBase,
      setCitizenLogin,
      setCitizenRegister,
      setOfficerLogin,
      setPasswordReset,
      setProfile,
      updateLanguage,
      updateProfile,
    },
  };
}
