export default function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor="search-todos" className="text-sm" style={{ color: "var(--text-secondary)" }}>Search todos</label>
      <input
        id="search-todos"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by title or description"
        className="rounded-2xl px-4 py-3 outline-none transition placeholder:opacity-40"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
      />
    </div>
  );
}
