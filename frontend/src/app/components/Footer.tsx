export default function Footer() {
  return (
    <footer className="mt-10 w-full" style={{ borderTop: "1px solid var(--border)" }}>
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <div className="grid gap-8 sm:grid-cols-3">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-950"
                style={{ background: "var(--accent)" }}
              >
                <CheckIcon size={14} />
              </div>
              <span className="font-bold" style={{ color: "var(--text-primary)" }}>TaskFlow</span>
            </div>
            <p className="text-sm leading-6" style={{ color: "var(--text-muted)" }}>
              A focused task management app with secure sign-in, todo tracking, and a responsive dashboard.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              Features
            </h4>
            <ul className="space-y-2 text-sm" style={{ color: "var(--text-muted)" }}>
              <li>Secure authentication</li>
              <li>Task creation and editing</li>
              <li>Priority management</li>
              <li>Search and filtering</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              Built with
            </h4>
            <ul className="space-y-2 text-sm" style={{ color: "var(--text-muted)" }}>
              <li>Secure user authentication</li>
              <li>Task creation and management</li>
              <li>Search and filter controls</li>
              <li>Responsive dashboard interface</li>
            </ul>
          </div>
        </div>

        <div
          className="mt-8 flex flex-col items-center justify-between gap-3 border-t pt-6 text-xs sm:flex-row"
          style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
        >
          <span>Copyright {new Date().getFullYear()} TaskFlow. All rights reserved.</span>
          <span>Designed for secure sign-in and smooth task management</span>
        </div>
      </div>
    </footer>
  );
}

function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
