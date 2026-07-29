const en = {
  collectionLabel: "YOUR COLLECTION",
  title: "Saved Issues",
  summaryOne: "{{count}} saved issue",
  summaryMany: "{{count}} saved issues",
  summaryCaption: "Follow important reports and receive their updates.",
  loading: "Loading saved issues...",
  loadError: "Unable to load saved issues",
  removeError: "Unable to remove this saved issue.",
  emptyTitle: "No saved issues yet",
  emptyBody: "Open a complaint and follow it to save it here.",
  browseIssues: "Browse Issues",
} as const;

const ne: Record<keyof typeof en, string> = {
  collectionLabel: "तपाईंको संग्रह",
  title: "सुरक्षित मुद्दाहरू",
  summaryOne: "{{count}} सुरक्षित मुद्दा",
  summaryMany: "{{count}} सुरक्षित मुद्दाहरू",
  summaryCaption: "महत्त्वपूर्ण रिपोर्ट फलो गर्नुहोस् र अपडेट प्राप्त गर्नुहोस्।",
  loading: "सुरक्षित मुद्दा लोड हुँदैछ...",
  loadError: "सुरक्षित मुद्दा लोड गर्न सकिएन",
  removeError: "यो सुरक्षित मुद्दा हटाउन सकिएन।",
  emptyTitle: "अहिलेसम्म कुनै सुरक्षित मुद्दा छैन",
  emptyBody: "उजुरी खोल्नुहोस् र यहाँ सुरक्षित गर्न फलो गर्नुहोस्।",
  browseIssues: "मुद्दाहरू हेर्नुहोस्",
};

export default { en, ne };
