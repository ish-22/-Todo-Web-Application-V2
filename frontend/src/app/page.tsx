"use client";

import type { FormEvent, InputHTMLAttributes, ReactNode } from "react";
import { useReducer, useMemo, useState, useCallback, useEffect } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { authReducer, initialAuthState } from "@/lib/auth";
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  fetchTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  ApiError,
} from "@/lib/api";
import type { Todo, AuthMode, TodoStatus, Priority } from "@/types";

// ─── Validation ────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateAuth(mode: AuthMode, fields: { name?: string; email: string; password: string }): Record<string, string> {
  const errors: Record<string, string> = {};
  if (mode === "register" && !fields.name?.trim()) errors.name = "Full name is required.";
  if (!fields.email.trim()) errors.email = "Email address is required.";
  else if (!EMAIL_RE.test(fields.email)) errors.email = "Enter a valid email address.";
  if (!fields.password) errors.password = "Password is required.";
  else if (fields.password.length < 8) errors.password = "Password must be at least 8 characters.";
  return errors;
}

function validateTodo(title: string): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!title.trim()) errors.title = "Title is required.";
  else if (title.trim().length > 100) errors.title = "Title must be under 100 characters.";
  return errors;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Home() {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [auth, dispatch] = useReducer(authReducer, initialAuthState);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TodoStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<Todo["priority"] | "all">("all");
  const [todos, setTodos] = useState<Todo[]>([]);
  const [todosLoading, setTodosLoading] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [todoForm, setTodoForm] = useState({ title: "", description: "", priority: "Medium" as Priority });
  const [todoErrors, setTodoErrors] = useState<Record<string, string>>({});

  // Restore token from sessionStorage on mount
  useEffect(() => {
    const token = sessionStorage.getItem("auth_token");
    const username = sessionStorage.getItem("auth_username");
    if (token && username) {
      dispatch({ type: "LOGIN_SUCCESS", token, username });
    }
  }, []);

  // Load todos whenever auth token changes
  useEffect(() => {
    if (!auth.token) { setTodos([]); return; }
    setTodosLoading(true);
    fetchTodos(auth.token, { search: query, status: filter, priority: priorityFilter })
      .then(setTodos)
      .catch(() => setTodos([]))
      .finally(() => setTodosLoading(false));
  }, [auth.token, query, filter, priorityFilter]);

  const stats = useMemo(() => {
    const completed = todos.filter((t) => t.completed).length;
    return { total: todos.length, completed, pending: todos.length - completed };
  }, [todos]);

  const handleAuthSubmit = useCallback(async (
    event: FormEvent<HTMLFormElement>,
    fields: { name?: string; email: string; password: string }
  ) => {
    event.preventDefault();
    const errors = validateAuth(authMode, fields);
    if (Object.keys(errors).length) return errors;
    dispatch({ type: "LOGIN_START" });
    try {
      let result;
      if (authMode === "register") {
        result = await apiRegister(fields.name!, fields.email, fields.password);
      } else {
        result = await apiLogin(fields.email, fields.password);
      }
      sessionStorage.setItem("auth_token", result.token);
      sessionStorage.setItem("auth_username", result.user.name);
      dispatch({ type: "LOGIN_SUCCESS", token: result.token, username: result.user.name });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Something went wrong.";
      dispatch({ type: "LOGIN_ERROR", error: msg });
    }
    return {};
  }, [authMode]);

  const handleLogout = useCallback(async () => {
    if (auth.token) {
      try { await apiLogout(auth.token); } catch { /* ignore */ }
    }
    sessionStorage.removeItem("auth_token");
    sessionStorage.removeItem("auth_username");
    dispatch({ type: "LOGOUT" });
  }, [auth.token]);

  const handleCreateTodo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateTodo(todoForm.title);
    if (Object.keys(errors).length) { setTodoErrors(errors); return; }
    if (!auth.token) return;
    try {
      const newTodo = await createTodo(auth.token, {
        title: todoForm.title.trim(),
        description: todoForm.description.trim(),
        priority: todoForm.priority,
      });
      setTodos((c) => [newTodo, ...c]);
      setTodoForm({ title: "", description: "", priority: "Medium" });
      setTodoErrors({});
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create todo.";
      setTodoErrors({ title: msg });
    }
  };

  const handleToggle = async (id: number, completed: boolean) => {
    if (!auth.token) return;
    try {
      const updated = await updateTodo(auth.token, id, { completed });
      setTodos((c) => c.map((t) => (t.id === id ? updated : t)));
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: number) => {
    if (!auth.token) return;
    try {
      await deleteTodo(auth.token, id);
      setTodos((c) => c.filter((t) => t.id !== id));
    } catch { /* ignore */ }
  };

  const handleSaveEdit = async (updated: Todo): Promise<Record<string, string>> => {
    const errors = validateTodo(updated.title);
    if (Object.keys(errors).length) return errors;
    if (!auth.token) return {};
    try {
      const saved = await updateTodo(auth.token, updated.id, {
        title: updated.title,
        description: updated.description,
        priority: updated.priority,
        completed: updated.completed,
      });
      setTodos((c) => c.map((t) => (t.id === updated.id ? saved : t)));
      setEditingTodo(null);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to update todo.";
      return { title: msg };
    }
    return {};
  };

  return (
    <div className="flex min-h-screen flex-col transition-colors duration-200" style={{ background: "var(--gradient)" }}>
      <Header
        isAuthenticated={auth.isAuthenticated}
        username={auth.username}
        onLogout={handleLogout}
      />

      <main className="flex-1">
        <section className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-8 lg:px-10">

          {/* Hero */}
          {auth.isAuthenticated ? (
            <div id="dashboard" className="flex flex-col gap-4 rounded-[2rem] p-6 shadow-xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="space-y-1">
                <span className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em]"
                  style={{ borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)", background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent)" }}>
                  TaskFlow
                </span>
                <h1 className="text-2xl font-semibold tracking-tight md:text-4xl" style={{ color: "var(--text-primary)" }}>
                  Welcome back, {auth.username}!
                </h1>
                <p className="text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                  Here's a snapshot of your tasks today.
                </p>
              </div>
              <div className="grid shrink-0 grid-cols-3 gap-3 text-center">
                <StatCard label="Tasks" value={stats.total} />
                <StatCard label="Done" value={stats.completed} />
                <StatCard label="Pending" value={stats.pending} />
              </div>
            </div>
          ) : (
            <div id="dashboard" className="rounded-[2rem] p-8 shadow-xl backdrop-blur-xl"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="mb-6 space-y-2">
                <span className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em]"
                  style={{ borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)", background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent)" }}>
                  TaskFlow
                </span>
                <h1 className="text-2xl font-semibold tracking-tight md:text-4xl" style={{ color: "var(--text-primary)" }}>
                  Stay organised, stay ahead.
                </h1>
                <p className="text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                  A simple, fast task manager built for getting things done.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {([
                  { icon: "📝", title: "Create tasks", desc: "Add todos with title, description and priority in seconds." },
                  { icon: "✅", title: "Track progress", desc: "Mark tasks complete and watch your progress grow." },
                  { icon: "🔍", title: "Search & filter", desc: "Find any task instantly by keyword, status or priority." },
                  { icon: "📊", title: "Analytics", desc: "See your completion rate and task breakdown at a glance." },
                ] as const).map(({ icon, title, desc }) => (
                  <div key={title} className="rounded-2xl p-4"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                    <div className="mb-2 text-2xl">{icon}</div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{title}</p>
                    <p className="mt-1 text-xs leading-5" style={{ color: "var(--text-muted)" }}>{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* My Tasks */}
          <div id="my-tasks">
            {!auth.isAuthenticated ? (
              <AuthSection
                mode={authMode}
                onModeChange={(m) => { setAuthMode(m); dispatch({ type: "CLEAR_ERROR" }); }}
                onSubmit={handleAuthSubmit}
                serverError={auth.error}
                isLoading={auth.isLoading}
              />
            ) : (
              <DashboardSection
                username={auth.username!}
                todos={todos}
                isLoading={todosLoading}
                query={query}
                filter={filter}
                priorityFilter={priorityFilter}
                todoForm={todoForm}
                todoErrors={todoErrors}
                onQueryChange={setQuery}
                onFilterChange={setFilter}
                onPriorityFilterChange={setPriorityFilter}
                onTodoFormChange={(field, value) => {
                  setTodoForm((c) => ({ ...c, [field]: value }));
                  if (todoErrors[field]) setTodoErrors((c) => { const n = { ...c }; delete n[field]; return n; });
                }}
                onCreateTodo={handleCreateTodo}
                onToggle={handleToggle}
                onEdit={setEditingTodo}
                onDelete={handleDelete}
                onLogout={handleLogout}
              />
            )}
          </div>

          {auth.isAuthenticated && <AnalyticsSection todos={todos} />}

        </section>
      </main>

      <Footer />

      {editingTodo && (
        <EditModal todo={editingTodo} onSave={handleSaveEdit} onClose={() => setEditingTodo(null)} />
      )}
    </div>
  );
}

// ─── Analytics section ────────────────────────────────────────────────────────

function AnalyticsSection({ todos }: { todos: Todo[] }) {
  const total = todos.length;
  const completed = todos.filter((t) => t.completed).length;
  const pending = total - completed;
  const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

  const byPriority = (["High", "Medium", "Low"] as Priority[]).map((p) => ({
    label: p,
    count: todos.filter((t) => t.priority === p).length,
    color: p === "High" ? "#fda4af" : p === "Medium" ? "#fcd34d" : "#6ee7b7",
    bg: p === "High" ? "color-mix(in srgb, #f43f5e 15%, transparent)" : p === "Medium" ? "color-mix(in srgb, #f59e0b 15%, transparent)" : "color-mix(in srgb, #10b981 15%, transparent)",
  }));

  return (
    <div id="analytics" className="rounded-[2rem] p-6 shadow-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <p className="text-sm uppercase tracking-[0.2em]" style={{ color: "var(--accent)" }}>Overview</p>
      <h2 className="mb-6 text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>Analytics</h2>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col items-center justify-center rounded-2xl p-5 text-center"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" stroke="var(--border)" strokeWidth="3" />
            <circle cx="18" cy="18" r="15" fill="none" stroke="var(--accent)" strokeWidth="3"
              strokeDasharray={`${(completionRate / 100) * 94} 94`} strokeLinecap="round" />
          </svg>
          <p className="-mt-14 text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{completionRate}%</p>
          <p className="mt-10 text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Completion</p>
        </div>

        {[
          { label: "Total tasks", value: total,     accent: "var(--accent)" },
          { label: "Completed",   value: completed, accent: "#6ee7b7" },
          { label: "Pending",     value: pending,   accent: "#fcd34d" },
        ].map(({ label, value, accent }) => (
          <div key={label} className="flex flex-col justify-between rounded-2xl p-5"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{label}</p>
            <p className="mt-2 text-4xl font-bold" style={{ color: accent }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <p className="mb-4 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Tasks by priority</p>
        <div className="grid gap-3">
          {byPriority.map(({ label, count, color, bg }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="w-14 rounded-full px-2 py-0.5 text-center text-xs font-semibold" style={{ background: bg, color }}>{label}</span>
              <div className="flex-1 overflow-hidden rounded-full" style={{ background: "var(--border)", height: 8 }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: total === 0 ? "0%" : `${(count / total) * 100}%`, background: color }} />
              </div>
              <span className="w-6 text-right text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Auth section ─────────────────────────────────────────────────────────────

function AuthSection({ mode, onModeChange, onSubmit, serverError, isLoading }: {
  mode: AuthMode;
  onModeChange: (m: AuthMode) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>, fields: { name?: string; email: string; password: string }) => Promise<Record<string, string>>;
  serverError: string | null;
  isLoading: boolean;
}) {
  const [fields, setFields] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  const set = (key: string, value: string) => {
    setFields((c) => ({ ...c, [key]: value }));
    if (errors[key]) setErrors((c) => { const n = { ...c }; delete n[key]; return n; });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    const fieldErrors = validateAuth(mode, fields);
    if (Object.keys(fieldErrors).length) { e.preventDefault(); setErrors(fieldErrors); return; }
    const serverErrors = await onSubmit(e, fields);
    if (Object.keys(serverErrors).length) setErrors(serverErrors);
    else { setFields({ name: "", email: "", password: "" }); setShowPassword(false); }
  };

  return (
    <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="rounded-[2rem] p-8 shadow-2xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="mb-6 flex gap-2 rounded-full p-1" style={{ background: "color-mix(in srgb, var(--text-primary) 5%, transparent)" }}>
          {(["login", "register"] as AuthMode[]).map((m) => (
            <button key={m} type="button"
              onClick={() => { onModeChange(m); setFields({ name: "", email: "", password: "" }); setErrors({}); setShowPassword(false); }}
              className="flex-1 rounded-full px-4 py-3 text-sm font-medium transition"
              style={mode === m ? { background: "var(--accent)", color: "var(--accent-text)" } : { color: "var(--text-secondary)" }}>
              {m === "login" ? "Login" : "Register"}
            </button>
          ))}
        </div>

        {serverError && (
          <div role="alert" className="mb-4 rounded-2xl px-4 py-3 text-sm"
            style={{ background: "color-mix(in srgb, #f43f5e 10%, transparent)", border: "1px solid color-mix(in srgb, #f43f5e 30%, transparent)", color: "#fda4af" }}>
            {serverError}
          </div>
        )}

        <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
          {mode === "register" && (
            <Field label="Full name" placeholder="Ayesha Perera" value={fields.name} onChange={(v) => set("name", v)} error={errors.name} autoComplete="name" />
          )}
          <Field label="Email address" placeholder={mode === "register" ? "ayesha@example.com" : "you@example.com"} type="email" value={fields.email} onChange={(v) => set("email", v)} error={errors.email} autoComplete="email" />
          <Field
            label="Password"
            placeholder={showPassword ? "Enter your password" : "Password"}
            type={showPassword ? "text" : "password"}
            value={fields.password}
            onChange={(v) => set("password", v)}
            error={errors.password}
            helperText={mode === "register" ? "Minimum 8 characters." : undefined}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            rightElement={(
              <button
                type="button"
                onClick={() => setShowPassword((c) => !c)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 transition hover:opacity-80"
                style={{ background: "color-mix(in srgb, var(--text-primary) 6%, transparent)", color: "var(--text-muted)" }}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            )}
          />
          <button type="submit" disabled={isLoading}
            className="mt-2 flex items-center justify-center gap-2 rounded-2xl px-5 py-4 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
            {isLoading && <Spinner />}
            {isLoading ? "Please wait…" : mode === "login" ? "Login to dashboard" : "Create account"}
          </button>
        </form>
      </div>

      <aside className="rounded-[2rem] p-8 shadow-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>Why TaskFlow?</h2>
        <ul className="mt-5 space-y-4 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
          <li>📝 Add tasks with a title, description, and priority — keep every detail in one place.</li>
          <li>✅ Mark tasks complete or pending with a single click, and track progress at a glance.</li>
          <li>🔍 Search by keyword and filter by status or priority to find exactly what you need.</li>
          <li>📊 Built-in analytics show your completion rate and task breakdown by priority.</li>
          <li>🌙 Automatically adapts to your system's light or dark mode preference.</li>
          <li>🔒 Your tasks are private — sign in to access your personal workspace.</li>
        </ul>
        <div className="mt-8 rounded-3xl p-5 text-sm"
          style={{ border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)", background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent)" }}>
          Sign up for free and start organising your day in seconds.
        </div>
      </aside>
    </section>
  );
}

// ─── Dashboard section ────────────────────────────────────────────────────────

function DashboardSection({ username, todos, isLoading, query, filter, priorityFilter, todoForm, todoErrors, onQueryChange, onFilterChange, onPriorityFilterChange, onTodoFormChange, onCreateTodo, onToggle, onEdit, onDelete, onLogout }: {
  username: string; todos: Todo[]; isLoading: boolean; query: string; filter: TodoStatus; priorityFilter: Todo["priority"] | "all";
  todoForm: { title: string; description: string; priority: Priority }; todoErrors: Record<string, string>;
  onQueryChange: (v: string) => void; onFilterChange: (v: TodoStatus) => void; onPriorityFilterChange: (v: Todo["priority"] | "all") => void;
  onTodoFormChange: (field: string, value: string) => void; onCreateTodo: (e: FormEvent<HTMLFormElement>) => void;
  onToggle: (id: number, completed: boolean) => void; onEdit: (todo: Todo) => void;
  onDelete: (id: number) => void; onLogout: () => void;
}) {
  return (
    <section className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
      <aside className="rounded-[2rem] p-6 shadow-2xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Signed in as</p>
            <h2 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>{username}</h2>
          </div>
          <button type="button" onClick={onLogout}
            className="rounded-full px-4 py-2 text-sm transition hover:opacity-80 sm:hidden"
            style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            Logout
          </button>
        </div>

        <div className="mt-6 grid gap-3">
          <div className="grid gap-1.5">
            <label htmlFor="search-todos" className="text-sm" style={{ color: "var(--text-secondary)" }}>Search todos</label>
            <input id="search-todos" value={query} onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search by title or description"
              className="rounded-2xl px-4 py-3 outline-none transition placeholder:opacity-40"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "pending", "completed"] as TodoStatus[]).map((item) => (
              <FilterChip key={item} active={filter === item} onClick={() => onFilterChange(item)}>{item}</FilterChip>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "Low", "Medium", "High"] as const).map((p) => (
              <FilterChip key={p} active={priorityFilter === p} onClick={() => onPriorityFilterChange(p)}>{p}</FilterChip>
            ))}
          </div>
        </div>

        <form className="mt-6 grid gap-4" onSubmit={onCreateTodo} noValidate>
          <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Create todo</h3>
          <Field label="Title" value={todoForm.title} onChange={(v) => onTodoFormChange("title", v)} placeholder="Prepare project summary" error={todoErrors.title} />
          <Field label="Description" value={todoForm.description} onChange={(v) => onTodoFormChange("description", v)} placeholder="Add short task details" />
          <label className="grid gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            Priority
            <select value={todoForm.priority} onChange={(e) => onTodoFormChange("priority", e.target.value)}
              className="rounded-2xl px-4 py-3 outline-none transition"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </label>
          <button className="rounded-2xl px-5 py-4 font-semibold transition hover:opacity-90"
            style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
            Add todo
          </button>
        </form>
      </aside>

      <div className="rounded-[2rem] p-6 shadow-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em]" style={{ color: "var(--accent)" }}>Protected workspace</p>
            <h2 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>Your tasks</h2>
          </div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{todos.length} tasks</p>
        </div>

        <div className="grid gap-4">
          {isLoading ? (
            <div className="rounded-3xl p-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
              <Spinner /> Loading…
            </div>
          ) : todos.length === 0 ? (
            <div className="rounded-3xl border-dashed p-10 text-center text-sm"
              style={{ border: "2px dashed var(--border)", color: "var(--text-muted)" }}>
              No todos match the current search or filter.
            </div>
          ) : (
            todos.map((todo) => (
              <TodoCard key={todo.id} todo={todo} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Todo card ────────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<Priority, { bg: string; color: string }> = {
  High:   { bg: "color-mix(in srgb, #f43f5e 15%, transparent)", color: "#fda4af" },
  Medium: { bg: "color-mix(in srgb, #f59e0b 15%, transparent)", color: "#fcd34d" },
  Low:    { bg: "color-mix(in srgb, #10b981 15%, transparent)", color: "#6ee7b7" },
};

function TodoCard({ todo, onToggle, onEdit, onDelete }: {
  todo: Todo;
  onToggle: (id: number, completed: boolean) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: number) => void;
}) {
  const p = PRIORITY_STYLES[todo.priority];
  return (
    <article className="rounded-3xl p-5 transition" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full px-3 py-1 text-xs font-semibold"
              style={todo.completed
                ? { background: "color-mix(in srgb, #10b981 15%, transparent)", color: "#6ee7b7" }
                : { background: "color-mix(in srgb, #f59e0b 15%, transparent)", color: "#fcd34d" }}>
              {todo.completed ? "Completed" : "Pending"}
            </span>
            <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: p.bg, color: p.color }}>
              {todo.priority}
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{todo.createdAt}</span>
          </div>
          <h3 className="text-xl font-semibold"
            style={{ color: "var(--text-primary)", textDecoration: todo.completed ? "line-through" : "none", opacity: todo.completed ? 0.6 : 1 }}>
            {todo.title}
          </h3>
          {todo.description && <p className="max-w-2xl text-sm leading-6" style={{ color: "var(--text-secondary)" }}>{todo.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onToggle(todo.id, !todo.completed)}
            className="rounded-full px-4 py-2 text-sm transition hover:opacity-80"
            style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            {todo.completed ? "Mark pending" : "Mark completed"}
          </button>
          <button type="button" onClick={() => onEdit(todo)}
            className="rounded-full px-4 py-2 text-sm transition hover:opacity-80"
            style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            Edit
          </button>
          <button type="button" onClick={() => onDelete(todo.id)}
            className="rounded-full px-4 py-2 text-sm transition hover:opacity-80"
            style={{ background: "color-mix(in srgb, #f43f5e 10%, transparent)", border: "1px solid color-mix(in srgb, #f43f5e 20%, transparent)", color: "#fda4af" }}>
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

// ─── Edit modal ───────────────────────────────────────────────────────────────

function EditModal({ todo, onSave, onClose }: {
  todo: Todo;
  onSave: (updated: Todo) => Promise<Record<string, string>>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState({ ...todo });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const errs = await onSave(draft);
    setSaving(false);
    if (Object.keys(errs).length) setErrors(errs);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-sm"
      style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-[2rem] p-8 shadow-2xl"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-6 text-xl font-semibold" style={{ color: "var(--text-primary)" }}>Edit todo</h2>
        <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
          <Field label="Title" value={draft.title}
            onChange={(v) => { setDraft((c) => ({ ...c, title: v })); if (errors.title) setErrors((c) => { const n = { ...c }; delete n.title; return n; }); }}
            error={errors.title} />
          <Field label="Description" value={draft.description} onChange={(v) => setDraft((c) => ({ ...c, description: v }))} />
          <label className="grid gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            Priority
            <select value={draft.priority} onChange={(e) => setDraft((c) => ({ ...c, priority: e.target.value as Priority }))}
              className="rounded-2xl px-4 py-3 outline-none transition"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </label>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-semibold transition hover:opacity-90 disabled:opacity-60"
              style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
              {saving && <Spinner />}
              Save changes
            </button>
            <button type="button" onClick={onClose} className="flex-1 rounded-2xl px-5 py-3 text-sm transition hover:opacity-80"
              style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Field({ label, helperText, error, value, onChange, rightElement, ...props }: {
  label: string; helperText?: string; error?: string; value?: string; onChange?: (value: string) => void; rightElement?: ReactNode;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</label>
      <div className="relative">
        <input id={id} value={value} onChange={(e) => onChange?.(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : helperText ? `${id}-hint` : undefined}
          {...props}
          className="w-full rounded-2xl px-4 py-3 pr-14 outline-none transition placeholder:opacity-40"
          style={{ background: "var(--bg-card)", border: `1px solid ${error ? "#f43f5e80" : "var(--border)"}`, color: "var(--text-primary)" }}
        />
        {rightElement}
      </div>
      {error && <span id={`${id}-error`} role="alert" className="text-xs" style={{ color: "#fda4af" }}>{error}</span>}
      {!error && helperText && <span id={`${id}-hint`} className="text-xs" style={{ color: "var(--text-muted)" }}>{helperText}</span>}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.58 10.58A3 3 0 0 0 12 15a3 3 0 0 0 2.42-4.42" />
      <path d="M9.88 5.09A9.94 9.94 0 0 1 12 5c6.5 0 10 7 10 7a18.1 18.1 0 0 1-3.37 4.4" />
      <path d="M6.11 6.11C3.91 7.71 2 12 2 12s3.5 7 10 7a10.5 10.5 0 0 0 5.3-1.42" />
    </svg>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-24 rounded-2xl px-4 py-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <div className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>{value}</div>
      <div className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}

function FilterChip({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="rounded-full px-4 py-2 text-sm font-medium capitalize transition hover:opacity-80"
      style={active
        ? { background: "var(--accent)", color: "var(--accent-text)" }
        : { border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
    </svg>
  );
}
