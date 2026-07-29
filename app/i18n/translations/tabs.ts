const en = {
  home: "Home",
  notifications: "Notifications",
  mine: "Mine",
  browse: "Browse",
  profile: "Profile",
  createReport: "Create report",
} as const;

const ne: Record<keyof typeof en, string> = {
  home: "गृहपृष्ठ",
  notifications: "सूचनाहरू",
  mine: "मेरो",
  browse: "ब्राउज",
  profile: "प्रोफाइल",
  createReport: "उजुरी दर्ता गर्नुहोस्",
};

export default { en, ne };
