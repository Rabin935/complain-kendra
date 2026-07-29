import app from "./app";
import auth from "./auth";
import browse from "./browse";
import changePassword from "./changePassword";
import citizen from "./citizen";
import common from "./common";
import complaintDetail from "./complaintDetail";
import createComplaint from "./createComplaint";
import editProfile from "./editProfile";
import help from "./help";
import home from "./home";
import languageSettings from "./languageSettings";
import leaderboard from "./leaderboard";
import myComplaints from "./myComplaints";
import notifications from "./notifications";
import profile from "./profile";
import rateResolution from "./rateResolution";
import savedIssues from "./savedIssues";
import settings from "./settings";
import shell from "./shell";
import tabs from "./tabs";

export const translations = {
  English: {
    common: common.en,
    tabs: tabs.en,
    shell: shell.en,
    app: app.en,
    citizen: citizen.en,
    languageSettings: languageSettings.en,
    home: home.en,
    profile: profile.en,
    settings: settings.en,
    auth: auth.en,
    notifications: notifications.en,
    browse: browse.en,
    myComplaints: myComplaints.en,
    complaintDetail: complaintDetail.en,
    createComplaint: createComplaint.en,
    rateResolution: rateResolution.en,
    savedIssues: savedIssues.en,
    leaderboard: leaderboard.en,
    editProfile: editProfile.en,
    changePassword: changePassword.en,
    help: help.en,
  },
  Nepali: {
    common: common.ne,
    tabs: tabs.ne,
    shell: shell.ne,
    app: app.ne,
    citizen: citizen.ne,
    languageSettings: languageSettings.ne,
    home: home.ne,
    profile: profile.ne,
    settings: settings.ne,
    auth: auth.ne,
    notifications: notifications.ne,
    browse: browse.ne,
    myComplaints: myComplaints.ne,
    complaintDetail: complaintDetail.ne,
    createComplaint: createComplaint.ne,
    rateResolution: rateResolution.ne,
    savedIssues: savedIssues.ne,
    leaderboard: leaderboard.ne,
    editProfile: editProfile.ne,
    changePassword: changePassword.ne,
    help: help.ne,
  },
} as const;

export type Language = keyof typeof translations;
export type TranslationNamespaces = typeof translations["English"];
