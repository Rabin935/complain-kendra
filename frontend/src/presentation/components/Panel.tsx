import type { PropsWithChildren } from "react";
import { styles } from "../styles";

interface PanelProps extends PropsWithChildren {
  title: string;
  description?: string;
}

export function Panel({ children, description, title }: PanelProps) {
  return (
    <section style={styles.panel}>
      <h2 style={{ margin: "0 0 10px", color: "#321a70", fontSize: 17 }}>{title}</h2>
      {description ? <p style={styles.hint}>{description}</p> : null}
      {children}
    </section>
  );
}
