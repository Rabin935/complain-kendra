import { useEffect, useState } from "react";
import {
  citizenLoginDefaults,
  citizenRegisterDefaults,
  complaintDefaults,
  devConsoleSessionDefaults,
  officerActionDefaults,
  officerLoginDefaults,
  passwordResetDefaults,
  profileDefaults,
} from "../data/devtools.defaults";
import {
  loadDevConsoleSession,
  requestDevConsole,
  saveDevConsoleSession,
} from "../services/devtools.service";
import type {
  CitizenLoginForm,
  CitizenRegisterForm,
  ComplaintForm,
  DevConsoleResponse,
  DevConsoleSessionState,
  DevConsoleStatusState,
  OfficerActionForm,
  OfficerLoginForm,
  PasswordResetForm,
  ProfileForm,
} from "../types/devtools.types";

export function useDevConsole() {
  const [activeTab, setActiveTab] = useState<
    "citizen" | "complaints" | "profile" | "officer" | "output"
  >("citizen");
  const [status, setStatus] = useState<DevConsoleStatusState>({
    message: "Ready.",
    tone: "idle",
  });
  const [response, setResponse] = useState<unknown>({});
  const [session, setSession] = useState<DevConsoleSessionState>(devConsoleSessionDefaults);
  const [citizenLogin, setCitizenLogin] = useState<CitizenLoginForm>(citizenLoginDefaults);
  const [citizenRegister, setCitizenRegister] =
    useState<CitizenRegisterForm>(citizenRegisterDefaults);
  const [passwordReset, setPasswordReset] =
    useState<PasswordResetForm>(passwordResetDefaults);
  const [complaint, setComplaint] = useState<ComplaintForm>(complaintDefaults);
  const [profile, setProfile] = useState<ProfileForm>(profileDefaults);
  const [officerLogin, setOfficerLogin] = useState<OfficerLoginForm>(officerLoginDefaults);
  const [officerAction, setOfficerAction] =
    useState<OfficerActionForm>(officerActionDefaults);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      try {
        const storedSession = await loadDevConsoleSession();
        setSession(storedSession);
      } finally {
        setLoadingSession(false);
      }
    }

    void restoreSession();
  }, []);

  async function updateSession(nextSession: DevConsoleSessionState) {
    setSession(nextSession);
    await saveDevConsoleSession(nextSession);
  }

  async function run(label: string, action: () => Promise<DevConsoleResponse>) {
    try {
      setStatus({ message: `${label}...`, tone: "idle" });
      const nextResponse = await action();
      setResponse(nextResponse);
      setStatus({ message: `${label} complete.`, tone: "success" });
      setActiveTab("output");
      return nextResponse;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed.";
      setResponse({ success: false, message });
      setStatus({ message, tone: "error" });
      setActiveTab("output");
      throw error;
    }
  }

  function complaintPayload() {
    return {
      title: complaint.title,
      category: complaint.category,
      description: complaint.description,
      location: {
        ward: complaint.ward,
        wardId: complaint.ward,
        address: complaint.address,
        area: "Koteshwor",
        city: "Kathmandu",
        lat: 27.678,
        lng: 85.349,
      },
    };
  }

  async function citizenLoginAction() {
    await run("Citizen login", async () => {
      const nextResponse = await requestDevConsole("/api/v1/auth/login", {
        method: "POST",
        body: citizenLogin,
      });
      await updateSession({
        ...session,
        citizenToken: nextResponse.accessToken ?? nextResponse.token ?? "",
        citizenRefreshToken: nextResponse.refreshToken ?? "",
      });
      return nextResponse;
    });
  }

  async function citizenLogoutAction() {
    await run("Citizen logout", async () => {
      const nextResponse = await requestDevConsole("/api/v1/auth/logout", {
        method: "POST",
        token: session.citizenToken,
        body: { refreshToken: session.citizenRefreshToken },
      });
      await updateSession({
        ...session,
        citizenToken: "",
        citizenRefreshToken: "",
      });
      return nextResponse;
    });
  }

  async function citizenRegisterAction() {
    await run("Citizen register", () =>
      requestDevConsole("/api/v1/auth/register", {
        method: "POST",
        body: {
          ...citizenRegister,
          ward: "12",
        },
      }),
    );
  }

  async function citizenRefreshAction() {
    await run("Refresh token", async () => {
      const nextResponse = await requestDevConsole("/api/v1/auth/refresh", {
        method: "POST",
        body: { refreshToken: session.citizenRefreshToken },
      });
      await updateSession({
        ...session,
        citizenToken: nextResponse.accessToken ?? nextResponse.token ?? "",
        citizenRefreshToken: nextResponse.refreshToken ?? "",
      });
      return nextResponse;
    });
  }

  async function forgotPasswordAction() {
    await run("Forgot password", () =>
      requestDevConsole("/api/v1/auth/forgot-password", {
        method: "POST",
        body: { email: passwordReset.email },
      }),
    );
  }

  async function resetPasswordAction() {
    await run("Reset password", () =>
      requestDevConsole("/api/v1/auth/reset-password", {
        method: "POST",
        body: {
          token: passwordReset.token,
          password: passwordReset.password,
        },
      }),
    );
  }

  async function analyzeComplaintAction() {
    await run("Analyze complaint", () =>
      requestDevConsole("/api/v1/complaints/analyze", {
        method: "POST",
        token: session.citizenToken,
        body: complaintPayload(),
      }),
    );
  }

  async function createComplaintAction() {
    await run("Create complaint", async () => {
      const nextResponse = await requestDevConsole("/api/v1/complaints", {
        method: "POST",
        token: session.citizenToken,
        body: complaintPayload(),
      });
      const complaintId =
        nextResponse.complaint?.id ?? nextResponse.complaint?._id ?? "";
      if (complaintId) {
        setComplaint((current) => ({ ...current, complaintId }));
        setOfficerAction((current) => ({ ...current, complaintId }));
      }
      return nextResponse;
    });
  }

  async function listPublicComplaintsAction() {
    await run("Public complaints", () => requestDevConsole("/api/v1/complaints"));
  }

  async function listMyComplaintsAction() {
    await run("My complaints", () =>
      requestDevConsole("/api/v1/complaints/mine", {
        token: session.citizenToken,
      }),
    );
  }

  async function nearbyComplaintsAction() {
    await run("Nearby complaints", () =>
      requestDevConsole("/api/v1/complaints/nearby", {
        params: {
          lat: 27.678,
          lng: 85.349,
          radius_km: 3,
        },
      }),
    );
  }

  async function complaintDetailAction() {
    await run("Complaint detail", () =>
      requestDevConsole(`/api/v1/complaints/${complaint.complaintId}`),
    );
  }

  async function complaintTimelineAction() {
    await run("Complaint timeline", () =>
      requestDevConsole(`/api/v1/complaints/${complaint.complaintId}/timeline`),
    );
  }

  async function complaintUpvoteAction() {
    await run("Upvote complaint", () =>
      requestDevConsole(`/api/v1/complaints/${complaint.complaintId}/upvote`, {
        method: "POST",
        token: session.citizenToken,
      }),
    );
  }

  async function complaintFollowAction() {
    await run("Follow complaint", () =>
      requestDevConsole(`/api/v1/complaints/${complaint.complaintId}/follow`, {
        method: "POST",
        token: session.citizenToken,
      }),
    );
  }

  async function complaintUnfollowAction() {
    await run("Unfollow complaint", () =>
      requestDevConsole(`/api/v1/complaints/${complaint.complaintId}/follow`, {
        method: "DELETE",
        token: session.citizenToken,
      }),
    );
  }

  async function complaintCommentAction() {
    await run("Post comment", () =>
      requestDevConsole(`/api/v1/complaints/${complaint.complaintId}/comments`, {
        method: "POST",
        token: session.citizenToken,
        body: { body: complaint.comment },
      }),
    );
  }

  async function getProfileAction() {
    await run("Get profile", () =>
      requestDevConsole("/api/v1/users/me", {
        token: session.citizenToken,
      }),
    );
  }

  async function updateProfileAction() {
    await run("Update profile", () =>
      requestDevConsole("/api/v1/users/me", {
        method: "PATCH",
        token: session.citizenToken,
        body: {
          name: profile.name,
          phone: profile.phone,
          avatarUrl: profile.avatarUrl || undefined,
          is_public: profile.isPublic,
        },
      }),
    );
  }

  async function updateLanguageAction() {
    await run("Set language", () =>
      requestDevConsole("/api/v1/users/me/language", {
        method: "PATCH",
        token: session.citizenToken,
        body: {
          language: profile.language,
        },
      }),
    );
  }

  async function officerLoginAction() {
    await run("Officer login", async () => {
      const nextResponse = await requestDevConsole("/api/v1/officer/auth/login", {
        method: "POST",
        body: officerLogin,
      });
      await updateSession({
        ...session,
        officerToken: nextResponse.accessToken ?? nextResponse.token ?? "",
        officerRefreshToken: nextResponse.refreshToken ?? "",
      });
      return nextResponse;
    });
  }

  async function officerLogoutAction() {
    await run("Officer logout", async () => {
      const nextResponse = await requestDevConsole("/api/v1/officer/auth/logout", {
        method: "POST",
        token: session.officerToken,
        body: {
          refreshToken: session.officerRefreshToken,
        },
      });
      await updateSession({
        ...session,
        officerToken: "",
        officerRefreshToken: "",
      });
      return nextResponse;
    });
  }

  async function officerSessionsAction() {
    await run("Officer sessions", () =>
      requestDevConsole("/api/v1/officer/auth/sessions", {
        token: session.officerToken,
      }),
    );
  }

  async function officerDashboardAction() {
    await run("Officer dashboard", () =>
      requestDevConsole("/api/v1/officer/dashboard", {
        token: session.officerToken,
      }),
    );
  }

  async function officerQueueAction() {
    await run("Officer queue", () =>
      requestDevConsole("/api/v1/officer/complaints", {
        token: session.officerToken,
      }),
    );
  }

  async function officerDetailAction() {
    await run("Officer complaint detail", () =>
      requestDevConsole(`/api/v1/officer/complaints/${officerAction.complaintId}`, {
        token: session.officerToken,
      }),
    );
  }

  async function officerStatusAction() {
    await run("Update status", () =>
      requestDevConsole(
        `/api/v1/officer/complaints/${officerAction.complaintId}/status`,
        {
          method: "PATCH",
          token: session.officerToken,
          body: {
            status: officerAction.status,
            reason: officerAction.note,
          },
        },
      ),
    );
  }

  async function officerPriorityAction() {
    await run("Update priority", () =>
      requestDevConsole(
        `/api/v1/officer/complaints/${officerAction.complaintId}/priority`,
        {
          method: "PATCH",
          token: session.officerToken,
          body: {
            priority: officerAction.priority,
          },
        },
      ),
    );
  }

  async function officerNoteAction() {
    await run("Add note", () =>
      requestDevConsole(`/api/v1/officer/complaints/${officerAction.complaintId}/notes`, {
        method: "POST",
        token: session.officerToken,
        body: {
          note: officerAction.note,
        },
      }),
    );
  }

  async function officerCommentAction() {
    await run("Official response", () =>
      requestDevConsole(
        `/api/v1/officer/complaints/${officerAction.complaintId}/comments`,
        {
          method: "POST",
          token: session.officerToken,
          body: {
            body: officerAction.note,
          },
        },
      ),
    );
  }

  async function officerAnalyticsAction() {
    await run("Officer analytics", () =>
      requestDevConsole("/api/v1/officer/analytics", {
        token: session.officerToken,
      }),
    );
  }

  async function officerAlertsAction() {
    await run("Officer alerts", () =>
      requestDevConsole("/api/v1/officer/alerts", {
        token: session.officerToken,
      }),
    );
  }

  async function officerUsersAction() {
    await run("Officer users", () =>
      requestDevConsole("/api/v1/officer/users", {
        token: session.officerToken,
      }),
    );
  }

  async function officerSettingsAction() {
    await run("Officer settings", () =>
      requestDevConsole("/api/v1/officer/settings", {
        token: session.officerToken,
      }),
    );
  }

  return {
    activeTab,
    citizenLogin,
    citizenRegister,
    complaint,
    loadingSession,
    officerAction,
    officerLogin,
    passwordReset,
    profile,
    response,
    session,
    status,
    setActiveTab,
    setCitizenLogin,
    setCitizenRegister,
    setComplaint,
    setOfficerAction,
    setOfficerLogin,
    setPasswordReset,
    setProfile,
    actions: {
      analyzeComplaintAction,
      citizenLoginAction,
      citizenLogoutAction,
      citizenRefreshAction,
      citizenRegisterAction,
      complaintCommentAction,
      complaintDetailAction,
      complaintFollowAction,
      complaintTimelineAction,
      complaintUnfollowAction,
      complaintUpvoteAction,
      createComplaintAction,
      forgotPasswordAction,
      getProfileAction,
      listMyComplaintsAction,
      listPublicComplaintsAction,
      nearbyComplaintsAction,
      officerAlertsAction,
      officerAnalyticsAction,
      officerCommentAction,
      officerDashboardAction,
      officerDetailAction,
      officerLoginAction,
      officerLogoutAction,
      officerNoteAction,
      officerPriorityAction,
      officerQueueAction,
      officerSessionsAction,
      officerSettingsAction,
      officerStatusAction,
      officerUsersAction,
      resetPasswordAction,
      updateLanguageAction,
      updateProfileAction,
    },
  };
}
