import type { InputHTMLAttributes } from "react";

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  label: string;
  helperText?: string;
  error?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export default function Field({ label, helperText, error, value, onChange, ...props }: FieldProps) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : helperText ? `${id}-hint` : undefined}
        {...props}
        className="rounded-2xl px-4 py-3 outline-none transition placeholder:opacity-40"
        style={{ background: "var(--bg-card)", border: `1px solid ${error ? "#f43f5e80" : "var(--border)"}`, color: "var(--text-primary)" }}
      />
      {error && <span id={`${id}-error`} role="alert" className="text-xs" style={{ color: "#fda4af" }}>{error}</span>}
      {!error && helperText && <span id={`${id}-hint`} className="text-xs" style={{ color: "var(--text-muted)" }}>{helperText}</span>}
    </div>
  );
}
