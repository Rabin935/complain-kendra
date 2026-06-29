import { styles } from "../styles";

interface JsonOutputProps {
  value: unknown;
}

export function JsonOutput({ value }: JsonOutputProps) {
  return <pre style={styles.output}>{JSON.stringify(value, null, 2)}</pre>;
}
