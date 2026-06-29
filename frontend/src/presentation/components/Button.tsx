import { colors } from "../styles";

interface ButtonProps {
  children: string;
  onClick: () => void | Promise<void>;
  tone?: "primary" | "secondary" | "danger";
}

export function Button({ children, onClick, tone = "primary" }: ButtonProps) {
  const isPrimary = tone === "primary";
  const isDanger = tone === "danger";

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      style={{
        minHeight: 36,
        border: `1px solid ${isDanger ? colors.danger : colors.primary}`,
        borderRadius: 6,
        padding: "8px 12px",
        background: isPrimary ? colors.primary : isDanger ? colors.danger : colors.surface,
        color: isPrimary || isDanger ? colors.surface : colors.primary,
        cursor: "pointer",
        fontWeight: 700,
      }}
    >
      {children}
    </button>
  );
}
