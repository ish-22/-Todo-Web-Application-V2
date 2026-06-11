export default function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-24 rounded-2xl px-4 py-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <div className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>{value}</div>
      <div className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}
