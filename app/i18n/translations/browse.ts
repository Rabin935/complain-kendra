const en = {
  searchPlaceholder: "Search ward or location",
  filterAll: "All",
  nearbyComplaints: "Nearby Complaints",
  activeWithinKm: "{{count}} active within 2 km",
  distance: "Distance",
  networkError: "Network error. Showing saved public complaints.",
  loading: "Loading nearby complaints...",
  emptyTitle: "No complaints nearby",
  emptyBody: "Try another category or search a wider area.",
  votes: "{{distance}} · {{count}} votes",
} as const;

const ne: Record<keyof typeof en, string> = {
  searchPlaceholder: "वडा वा स्थान खोज्नुहोस्",
  filterAll: "सबै",
  nearbyComplaints: "नजिकका उजुरीहरू",
  activeWithinKm: "२ किमी भित्र {{count}} सक्रिय",
  distance: "दूरी",
  networkError: "नेटवर्क त्रुटि। सुरक्षित सार्वजनिक उजुरी देखाइँदैछ।",
  loading: "नजिकका उजुरी लोड हुँदैछ...",
  emptyTitle: "नजिक कुनै उजुरी छैन",
  emptyBody: "अर्को श्रेणी छान्नुहोस् वा ठूलो क्षेत्र खोज्नुहोस्।",
  votes: "{{distance}} · {{count}} मत",
};

export default { en, ne };
