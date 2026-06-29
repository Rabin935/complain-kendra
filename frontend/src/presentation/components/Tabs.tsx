import type { ConsoleTab } from "../../domain/api-console.types";
import { Button } from "./Button";

const tabs: Array<{ label: string; value: ConsoleTab }> = [
  { label: "Citizen", value: "citizen" },
  { label: "Profile", value: "profile" },
  { label: "Officer", value: "officer" },
  { label: "Output", value: "output" },
];

interface TabsProps {
  activeTab: ConsoleTab;
  onChange: (tab: ConsoleTab) => void;
}

export function Tabs({ activeTab, onChange }: TabsProps) {
  return (
    <>
      {tabs.map((tab) => (
        <Button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          tone={activeTab === tab.value ? "primary" : "secondary"}
        >
          {tab.label}
        </Button>
      ))}
    </>
  );
}
