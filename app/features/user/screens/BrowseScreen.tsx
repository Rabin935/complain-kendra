import DashboardScaffold from "../components/DashboardScaffold";

export default function BrowseScreen() {
  return (
    <DashboardScaffold
      badge="Browse Issues"
      title="See what your community is reporting"
      description="Browse the latest complaints, check trending categories, and discover nearby issues before creating a duplicate report."
      sectionTitle="Popular views"
      sectionDescription="These sections help users understand the situation in their ward quickly."
      metrics={[
        {
          label: "Nearby alerts",
          value: "21",
          caption: "Reports discovered around your preferred location.",
        },
        {
          label: "Trending topics",
          value: "06",
          caption: "Categories with the fastest increase in citizen reports.",
        },
      ]}
      shortcuts={[
        {
          title: "Nearby map view",
          description: "Open complaints grouped by distance to avoid reporting the same issue twice.",
          icon: "map-search-outline",
          tone: "neutral",
        },
        {
          title: "Most urgent",
          description: "Filter reports that already crossed escalation thresholds or have safety impact.",
          icon: "alert-decagram-outline",
          tone: "accent",
        },
        {
          title: "Recently resolved",
          description: "Review completed cases to understand how long issues usually take to close.",
          icon: "check-decagram-outline",
          tone: "primary",
        },
      ]}
    />
  );
}
