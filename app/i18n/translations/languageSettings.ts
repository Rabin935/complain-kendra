const en = {
  headerTitle: "Language",
  loadingLanguage: "Loading language...",
  currentLanguageLabel: "Current Language",
  availableLanguagesLabel: "Available Languages",
  englishLabel: "English",
  englishCaption: "Use English across ComplainKendra.",
  nepaliLabel: "नेपाली",
  nepaliCaption: "Save Nepali as your preferred language.",
  infoText: "Changing your language updates the app immediately and is saved to your account.",
  saveButton: "Save",
  cancelButton: "Cancel",
  saveSuccess: "Language preference saved.",
  loadError: "Unable to load language settings.",
  saveError: "Unable to save language.",
} as const;

const ne: Record<keyof typeof en, string> = {
  headerTitle: "भाषा",
  loadingLanguage: "भाषा लोड हुँदैछ...",
  currentLanguageLabel: "हालको भाषा",
  availableLanguagesLabel: "उपलब्ध भाषाहरू",
  englishLabel: "English",
  englishCaption: "ComplainKendra भरि अंग्रेजी प्रयोग गर्नुहोस्।",
  nepaliLabel: "नेपाली",
  nepaliCaption: "नेपालीलाई आफ्नो रोजाइको भाषाको रूपमा सुरक्षित गर्नुहोस्।",
  infoText: "भाषा परिवर्तन गर्दा एप तुरुन्तै अपडेट हुन्छ र तपाईंको खातामा सुरक्षित हुन्छ।",
  saveButton: "सुरक्षित गर्नुहोस्",
  cancelButton: "रद्द गर्नुहोस्",
  saveSuccess: "भाषा प्राथमिकता सुरक्षित भयो।",
  loadError: "भाषा सेटिङ लोड गर्न सकिएन।",
  saveError: "भाषा सुरक्षित गर्न सकिएन।",
};

export default { en, ne };
