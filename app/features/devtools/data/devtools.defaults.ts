import type {
  CitizenLoginForm,
  CitizenRegisterForm,
  ComplaintForm,
  DevConsoleSessionState,
  OfficerActionForm,
  OfficerLoginForm,
  PasswordResetForm,
  ProfileForm,
} from "../types/devtools.types";

export const devConsoleSessionDefaults: DevConsoleSessionState = {
  citizenToken: "",
  citizenRefreshToken: "",
  officerToken: "",
  officerRefreshToken: "",
};

export const citizenLoginDefaults: CitizenLoginForm = {
  email: "rahul.sharma@example.com",
  password: "password123",
};

export const citizenRegisterDefaults: CitizenRegisterForm = {
  name: "New Citizen",
  email: "new.citizen@example.com",
  password: "password123",
  phone: "+9779800000020",
};

export const passwordResetDefaults: PasswordResetForm = {
  email: "rahul.sharma@example.com",
  token: "",
  password: "newpassword123",
};

export const complaintDefaults: ComplaintForm = {
  title: "Street light outage near Koteshwor",
  category: "power",
  description: "Street light has been out for three nights and the area feels unsafe.",
  ward: "12",
  address: "Koteshwor, Kathmandu",
  complaintId: "",
  comment: "I can confirm this issue is still present.",
};

export const profileDefaults: ProfileForm = {
  name: "Rahul Sharma",
  phone: "+9779800000001",
  language: "English",
  avatarUrl: "",
  isPublic: true,
};

export const officerLoginDefaults: OfficerLoginForm = {
  email: "ward12.officer@example.com",
  password: "officer123",
};

export const officerActionDefaults: OfficerActionForm = {
  complaintId: "",
  status: "in_progress",
  priority: "high",
  note: "Reviewed by Ward 12 office.",
};
