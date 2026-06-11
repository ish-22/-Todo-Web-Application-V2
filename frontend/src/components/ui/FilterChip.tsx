import type { ReactNode } from "react";

export default function FilterChip({ active, children, onClick }: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-4 py-2 text-sm font-medium capitalize transition hover:opacity-80"
      style={active
        ? { background: "var(--accent)", color: "var(--accent-text)" }
        : { border: "1px solid var(--border)", color: "var(--text-secondary)" }}
    >
      {children}
    </button>
  );
}
