import DashboardScaffold from "../components/DashboardScaffold";

export default function ReportScreen() {
  return (
    <DashboardScaffold
      badge="Report Center"
      title="Create a complaint with the right details"
      description="A clear report is easier to verify, assign, and resolve, so this section is designed to guide the user through the best next steps."
      sectionTitle="Before you submit"
      sectionDescription="Small prompts like these improve report quality and help the municipality act faster."
      metrics={[
        {
          label: "Best time",
          value: "< 2m",
          caption: "Average time to file a complaint with photo, category, and location.",
        },
        {
          label: "Required fields",
          value: "04",
          caption: "Issue type, title, location, and supporting details.",
        },
      ]}
      shortcuts={[
        {
          title: "Choose the right category",
          description: "Roads, sanitation, water, electricity, streetlights, and public safety.",
          icon: "shape-outline",
          tone: "primary",
        },
        {
          title: "Attach useful evidence",
          description: "Photos, short notes, and landmarks help teams verify the complaint much faster.",
          icon: "camera-plus-outline",
          tone: "accent",
        },
        {
          title: "Add an exact location",
          description: "A precise pin reduces delays and makes assignments more accurate.",
          icon: "crosshairs-gps",
          tone: "neutral",
        },
      ]}
    />
  );
}
