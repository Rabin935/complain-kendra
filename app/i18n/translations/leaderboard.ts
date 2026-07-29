const en = {
  heroesLabel: "CIVIC HEROES",
  title: "Leaderboard",
  weekly: "Weekly",
  monthly: "Monthly",
  allTime: "All time",
  rank: "RANK",
  pointsShort: "pts",
  climbing: "You're climbing!",
  yourPoints: "{{points}} pts · {{levelTitle}}",
  community: "{{period}} · Community",
  allWards: "All wards",
  you: "YOU",
  points: "points",
  unavailable: "Leaderboard unavailable",
  emptyTitle: "No rankings yet",
  emptyBody: "Citizens will appear here after earning points in this period.",
} as const;

const ne: Record<keyof typeof en, string> = {
  heroesLabel: "नागरिक नायकहरू",
  title: "लिडरबोर्ड",
  weekly: "साप्ताहिक",
  monthly: "मासिक",
  allTime: "सबै समय",
  rank: "स्थान",
  pointsShort: "अंक",
  climbing: "तपाईं माथि उठ्दै हुनुहुन्छ!",
  yourPoints: "{{points}} अंक · {{levelTitle}}",
  community: "{{period}} · समुदाय",
  allWards: "सबै वडा",
  you: "तपाईं",
  points: "अंक",
  unavailable: "लिडरबोर्ड उपलब्ध छैन",
  emptyTitle: "अहिलेसम्म कुनै स्थान छैन",
  emptyBody: "यो अवधिमा अंक कमाएपछि नागरिकहरू यहाँ देखिनेछन्।",
};

export default { en, ne };
