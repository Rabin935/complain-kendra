import { JsonOutput } from "../components/JsonOutput";
import { Panel } from "../components/Panel";

interface OutputScreenProps {
  value: unknown;
}

export function OutputScreen({ value }: OutputScreenProps) {
  return (
    <Panel title="Last Response">
      <JsonOutput value={value} />
    </Panel>
  );
}
