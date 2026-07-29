const en = {
  loading: "Loading notifications...",
  title: "Notifications",
  saving: "Saving...",
  markAllRead: "Mark all read",
  filterAll: "All",
  filterUnread: "Unread",
  filterMentions: "Mentions",
  emptyTitle: "No notifications",
  emptyBody: "New complaint updates will appear here.",
  today: "Today",
  earlier: "Earlier",
  fallbackTitle: "Notification",
  fallbackBody: "Complaint update",
} as const;

const ne: Record<keyof typeof en, string> = {
  loading: "सूचनाहरू लोड हुँदैछ...",
  title: "सूचनाहरू",
  saving: "सुरक्षित गर्दै...",
  markAllRead: "सबै पढिएको चिन्ह लगाउनुहोस्",
  filterAll: "सबै",
  filterUnread: "नपढिएको",
  filterMentions: "उल्लेख",
  emptyTitle: "कुनै सूचना छैन",
  emptyBody: "नयाँ उजुरी अपडेट यहाँ देखिनेछ।",
  today: "आज",
  earlier: "अघिल्लो",
  fallbackTitle: "सूचना",
  fallbackBody: "उजुरी अपडेट",
};

export default { en, ne };
