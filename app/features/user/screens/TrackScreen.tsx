import DashboardScaffold from "../components/DashboardScaffold";

export default function TrackScreen() {
  return (
    <DashboardScaffold
      badge="Track Updates"
      title="Follow every step of your complaint"
      description="From submission to closure, users should always know where their case is standing and what is expected next."
      sectionTitle="Status checkpoints"
      sectionDescription="These views explain the complaint journey in a way that feels transparent and easy to scan."
      metrics={[
        {
          label: "Pending review",
          value: "05",
          caption: "Reports waiting for validation or assignment right now.",
        },
        {
          label: "On the move",
          value: "03",
          caption: "Complaints already assigned to a field or operations team.",
        },
      ]}
      shortcuts={[
        {
          title: "Acknowledged by staff",
          description: "Your report has been accepted and recorded by the responsible office.",
          icon: "clipboard-check-outline",
          tone: "primary",
        },
        {
          title: "Assigned to a team",
          description: "The complaint is routed to the department or worker who can take action.",
          icon: "account-hard-hat-outline",
          tone: "neutral",
        },
        {
          title: "Resolved or re-opened",
          description: "Users can verify the outcome and re-open a case if the issue still exists.",
          icon: "progress-check",
          tone: "accent",
        },
      ]}
    />
  );
}
