import DashboardScaffold from "../components/DashboardScaffold";
import { useAuth } from "../../auth/context/AuthContext";

export default function HomeScreen() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "Citizen";

  return (
    <DashboardScaffold
      badge="User Dashboard"
      title={`Welcome back, ${firstName}`}
      description="You can browse reported issues, file a new complaint, and follow every status update from one place."
      sectionTitle="Your shortcuts"
      sectionDescription="Everything below is arranged so citizens can reach the next action in one tap."
      metrics={[
        {
          label: "Active cases",
          value: "12",
          caption: "Open neighborhood issues still waiting for action.",
        },
        {
          label: "Resolved",
          value: "08",
          caption: "Complaints completed or verified this week.",
        },
      ]}
      shortcuts={[
        {
          title: "Submit a fresh report",
          description: "Capture road damage, sanitation issues, water supply problems, or safety concerns.",
          icon: "file-document-edit-outline",
          tone: "primary",
        },
        {
          title: "Follow local movement",
          description: "See which complaints near you are getting attention and which ones need escalation.",
          icon: "map-marker-radius-outline",
          tone: "neutral",
        },
        {
          title: "Stay notified",
          description: "Track acknowledgement, review, assignment, and resolution without leaving the app.",
          icon: "bell-badge-outline",
          tone: "accent",
        },
      ]}
    />
  );
}
