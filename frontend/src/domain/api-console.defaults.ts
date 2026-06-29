import type {
  CitizenLoginForm,
  CitizenRegisterForm,
  OfficerLoginForm,
  PasswordResetForm,
  ProfileForm,
  SessionState,
} from "./api-console.types";

export const defaultApiBase = "http://localhost:5000/api/v1";

export const defaultSession: SessionState = {
  citizenToken: "",
  citizenRefreshToken: "",
  officerToken: "",
  officerRefreshToken: "",
};

export const defaultCitizenLogin: CitizenLoginForm = {
  email: "rahul.sharma@example.com",
  password: "password123",
};

export const defaultCitizenRegister: CitizenRegisterForm = {
  name: "New Citizen",
  email: "new.citizen@example.com",
  password: "password123",
  phone: "+9779800000020",
};

export const defaultPasswordReset: PasswordResetForm = {
  email: "rahul.sharma@example.com",
  token: "",
  password: "newpassword123",
};

export const defaultProfile: ProfileForm = {
  name: "Rahul Sharma",
  phone: "+9779800000001",
  avatarUrl: "",
  isPublic: true,
  language: "English",
  currentPassword: "password123",
  newPassword: "newpassword123",
};

export const defaultOfficerLogin: OfficerLoginForm = {
  email: "ward12.officer@example.com",
  password: "officer123",
};
