import { styles } from "../styles";

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "email" | "password" | "text" | "url";
}

export function FormField({ label, value, onChange, type = "text" }: FormFieldProps) {
  return (
    <label style={styles.label}>
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        style={styles.input}
      />
    </label>
  );
}
