"use client";

import { useState, useEffect, useCallback } from "react";

type NavSection = "dashboard" | "my-tasks" | "analytics";

const NAV_LINKS: { label: string; id: NavSection }[] = [
  { label: "Dashboard", id: "dashboard" },
  { label: "My Tasks",  id: "my-tasks"  },
  { label: "Analytics", id: "analytics" },
];

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function useActiveSection(): NavSection {
  const [active, setActive] = useState<NavSection>("dashboard");

  useEffect(() => {
    const ids: NavSection[] = ["dashboard", "my-tasks", "analytics"];
    const observers = ids.map((id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActive(id); },
        { threshold: 0.3 }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach((o) => o?.disconnect());
  }, []);

  return active;
}

function useTheme() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored ? stored === "dark" : prefersDark;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggle = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  }, []);

  return { dark, toggle };
}

export default function Header({
  isAuthenticated,
  username,
  onLogout,
}: {
  isAuthenticated: boolean;
  username: string | null;
  onLogout: () => void;
}) {
  const { dark, toggle } = useTheme();
  const activeSection = useActiveSection();

  return (
    <nav
      className="sticky top-0 z-40 w-full backdrop-blur-md"
      style={{
        background: "color-mix(in srgb, var(--bg-surface) 85%, transparent)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-10">

        {/* Logo */}
        <button
          type="button"
          onClick={() => scrollTo("dashboard")}
          className="flex items-center gap-2.5 transition hover:opacity-80"
        >
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-950"
            style={{ background: "var(--accent)" }}
          >
            <CheckIcon />
          </div>
          <span className="text-lg font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            TaskFlow
          </span>
        </button>

        {/* Nav links */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map(({ label, id }) => {
            const isActive = activeSection === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => scrollTo(id)}
                className="relative rounded-full px-4 py-2 text-sm font-medium transition"
                style={{
                  color: isActive ? "var(--accent)" : "var(--text-secondary)",
                  opacity: isActive ? 1 : 0.75,
                }}
              >
                {label}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full"
                    style={{ background: "var(--accent)" }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {isAuthenticated && username && (
            <div className="hidden items-center gap-2 sm:flex">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-slate-950"
                style={{ background: "var(--accent)" }}
              >
                {username.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {username}
              </span>
            </div>
          )}

          {isAuthenticated && (
            <button
              type="button"
              onClick={onLogout}
              className="hidden rounded-full px-4 py-1.5 text-sm transition hover:opacity-80 sm:block"
              style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            >
              Logout
            </button>
          )}

          <button
            type="button"
            onClick={toggle}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            className="flex h-9 w-9 items-center justify-center rounded-full transition hover:opacity-80"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>
    </nav>
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

function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
