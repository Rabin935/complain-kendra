const en = {
  errorTitle: "Something went wrong",
  errorMessage: "The app hit an unexpected screen error. Your session is still available.",
  tryAgain: "Try again",
  offlineMessage: "You are offline. Some actions will be unavailable until the connection returns.",
  checkingSession: "Checking your saved session...",
  openingDashboard: "Opening your complaint dashboard...",
} as const;

const ne: Record<keyof typeof en, string> = {
  errorTitle: "केही गडबड भयो",
  errorMessage: "एपमा अनपेक्षित त्रुटि देखियो। तपाईंको सत्र अझै पनि उपलब्ध छ।",
  tryAgain: "फेरि प्रयास गर्नुहोस्",
  offlineMessage: "तपाईं अफलाइन हुनुहुन्छ। जडान नफर्ने सम्म केही कार्यहरू उपलब्ध हुनेछैनन्।",
  checkingSession: "तपाईंको सुरक्षित सत्र जाँच गर्दै...",
  openingDashboard: "तपाईंको उजुरी ड्यासबोर्ड खोल्दै...",
};

export default { en, ne };
