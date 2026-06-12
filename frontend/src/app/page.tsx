"use client";

import type { FormEvent, InputHTMLAttributes, ReactNode } from "react";
import { useReducer, useMemo, useState, useCallback, useDeferredValue } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthMode = "login" | "register";
type TodoStatus = "all" | "pending" | "completed";
type Priority = "Low" | "Medium" | "High";

interface Todo {
  id: number;
  title: string;
  description: string;
  priority: Priority;
  completed: boolean;
  createdAt: string;
}

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  username: string | null;
  error: string | null;
  isLoading: boolean;
}

type AuthAction =
  | { type: "LOGIN_START" }
  | { type: "LOGIN_SUCCESS"; token: string; username: string }
  | { type: "LOGIN_ERROR"; error: string }
  | { type: "LOGOUT" }
  | { type: "CLEAR_ERROR" };

// ─── Validation ───────────────────────────────────────────────────────────────

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

// ─── Auth reducer ─────────────────────────────────────────────────────────────

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "LOGIN_START":   return { ...state, isLoading: true, error: null };
    case "LOGIN_SUCCESS": return { isAuthenticated: true, token: action.token, username: action.username, error: null, isLoading: false };
    case "LOGIN_ERROR":   return { ...state, isLoading: false, error: action.error };
    case "LOGOUT":
      if (typeof sessionStorage !== "undefined") sessionStorage.removeItem("auth_token");
      return { isAuthenticated: false, token: null, username: null, error: null, isLoading: false };
    case "CLEAR_ERROR":   return { ...state, error: null };
    default:              return state;
  }
}

// ─── Mock auth service ────────────────────────────────────────────────────────

const MOCK_USERS: Record<string, { password: string; name: string }> = {};

function mockLogin(email: string, password: string): { token: string; name: string } | null {
  const user = MOCK_USERS[email.toLowerCase()];
  if (!user || user.password !== password) return null;
  return { token: btoa(`${email}:${Date.now()}`), name: user.name };
}

function mockRegister(name: string, email: string, password: string): boolean {
  const key = email.toLowerCase();
  if (MOCK_USERS[key]) return false;
  MOCK_USERS[key] = { password, name };
  return true;
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const seedTodos: Todo[] = [
  { id: 1, title: "Design the onboarding flow", description: "Map out the registration, login, and logout experience.", priority: "High", completed: false, createdAt: "Today" },
  { id: 2, title: "Build protected task routes", description: "Keep unauthenticated users out of the todo dashboard.", priority: "Medium", completed: true, createdAt: "Yesterday" },
  { id: 3, title: "Refine empty states", description: "Show helpful guidance when there are no active todos.", priority: "Low", completed: false, createdAt: "2 days ago" },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function Home() {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [auth, dispatch] = useReducer(authReducer, {
    isAuthenticated: false, token: null, username: null, error: null, isLoading: false,
  });

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TodoStatus>("all");
  const [nextId, setNextId] = useState(4);
  const [todos, setTodos] = useState<Todo[]>(seedTodos);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [todoForm, setTodoForm] = useState({ title: "", description: "", priority: "Medium" as Priority });
  const [todoErrors, setTodoErrors] = useState<Record<string, string>>({});
  const deferredQuery = useDeferredValue(query);

  const stats = useMemo(() => {
    const completed = todos.filter((t) => t.completed).length;
    return { total: todos.length, completed, pending: todos.length - completed };
  }, [todos]);

  const visibleTodos = todos;

  const handleAuthSubmit = useCallback(async (
    event: FormEvent<HTMLFormElement>,
    fields: { name?: string; email: string; password: string }
  ) => {
    event.preventDefault();
    const errors = validateAuth(authMode, fields);
    if (Object.keys(errors).length) return errors;
    dispatch({ type: "LOGIN_START" });
    await new Promise((r) => setTimeout(r, 600));
    if (authMode === "register") {
      const ok = mockRegister(fields.name!, fields.email, fields.password);
      if (!ok) { dispatch({ type: "LOGIN_ERROR", error: "An account with that email already exists." }); return {}; }
    }
    const result = mockLogin(fields.email, fields.password);
    if (!result) { dispatch({ type: "LOGIN_ERROR", error: authMode === "login" ? "Invalid email or password." : "Registration failed. Please try again." }); return {}; }
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem("auth_token", result.token);
    dispatch({ type: "LOGIN_SUCCESS", token: result.token, username: result.name });
    return {};
  }, [authMode]);

  const handleCreateTodo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateTodo(todoForm.title);
    if (Object.keys(errors).length) { setTodoErrors(errors); return; }
    setTodos((c) => [{ id: nextId, title: todoForm.title.trim(), description: todoForm.description.trim(), priority: todoForm.priority, completed: false, createdAt: "Just now" }, ...c]);
    setNextId((c) => c + 1);
    setTodoForm({ title: "", description: "", priority: "Medium" });
    setTodoErrors({});
  };

  const updateTodo = (id: number, changes: Partial<Todo>) =>
    setTodos((c) => c.map((t) => (t.id === id ? { ...t, ...changes } : t)));

  const deleteTodo = (id: number) => setTodos((c) => c.filter((t) => t.id !== id));

  const handleSaveEdit = (updated: Todo) => {
    const errors = validateTodo(updated.title);
    if (Object.keys(errors).length) return errors;
    updateTodo(updated.id, updated);
    setEditingTodo(null);
    return {};
  };

  return (
    <div className="flex min-h-screen flex-col transition-colors duration-200" style={{ background: "var(--gradient)" }}>

      <Header
        isAuthenticated={auth.isAuthenticated}
        username={auth.username}
        onLogout={() => dispatch({ type: "LOGOUT" })}
      />

      <main className="flex-1">
        <section className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-8 lg:px-10">

          {/* Hero — #dashboard anchor */}
          <div id="dashboard" className="flex flex-col gap-4 rounded-[2rem] p-6 shadow-xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="space-y-1">
              <span className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em]"
                style={{ borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)", background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent)" }}>
                TaskFlow
              </span>
              <h1 className="text-2xl font-semibold tracking-tight md:text-4xl" style={{ color: "var(--text-primary)" }}>
                TaskFlow — Your tasks, under control.
              </h1>
              <p className="text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                Secure authentication, smart task management, and a clean responsive interface — all in one place.
              </p>
            </div>
            <div className="grid shrink-0 grid-cols-3 gap-3 text-center">
              <StatCard label="Tasks" value={stats.total} />
              <StatCard label="Done" value={stats.completed} />
              <StatCard label="Pending" value={stats.pending} />
            </div>
          </div>

          {/* My Tasks — #my-tasks anchor */}
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
                todos={visibleTodos}
                totalCount={todos.length}
                query={query}
                filter={filter}
                todoForm={todoForm}
                todoErrors={todoErrors}
                onQueryChange={setQuery}
                onFilterChange={setFilter}
                onTodoFormChange={(field, value) => {
                  setTodoForm((c) => ({ ...c, [field]: value }));
                  if (todoErrors[field]) setTodoErrors((c) => { const n = { ...c }; delete n[field]; return n; });
                }}
                onCreateTodo={handleCreateTodo}
                onToggle={(id, completed) => updateTodo(id, { completed })}
                onEdit={setEditingTodo}
                onDelete={deleteTodo}
                onLogout={() => dispatch({ type: "LOGOUT" })}
              />
            )}
          </div>

          {/* Analytics — #analytics anchor */}
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
        {/* Completion ring */}
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
    else {
      setFields({ name: "", email: "", password: "" });
      setShowPassword(false);
    }
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
                onClick={() => setShowPassword((current) => !current)}
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
        <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>What this frontend includes</h2>
        <ul className="mt-5 space-y-4 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
          <li>Registration and login with client-side and server-level validation.</li>
          <li>Secure token stored in <code className="rounded px-1" style={{ background: "color-mix(in srgb, var(--text-primary) 10%, transparent)" }}>sessionStorage</code> (cleared on tab close).</li>
          <li>A protected dashboard that requires authentication.</li>
          <li>Create, edit, delete, and complete todos with inline validation.</li>
          <li>Search and filter controls for quick task organisation.</li>
          <li>Light and dark mode with system preference detection.</li>
        </ul>
        <div className="mt-8 rounded-3xl p-5 text-sm"
          style={{ border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)", background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent)" }}>
          Built for a smooth candidate demo with secure sign-in, task tracking, and a polished responsive experience.
        </div>
      </aside>
    </section>
  );
}

// ─── Dashboard section ────────────────────────────────────────────────────────

function DashboardSection({ username, todos, totalCount, query, filter, todoForm, todoErrors, onQueryChange, onFilterChange, onTodoFormChange, onCreateTodo, onToggle, onEdit, onDelete, onLogout }: {
  username: string; todos: Todo[]; totalCount: number; query: string; filter: TodoStatus;
  todoForm: { title: string; description: string; priority: Priority }; todoErrors: Record<string, string>;
  onQueryChange: (v: string) => void; onFilterChange: (v: TodoStatus) => void;
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
          <SearchBar value={query} onChange={onQueryChange} />
          <div className="flex flex-wrap gap-2">
            {(["all", "pending", "completed"] as TodoStatus[]).map((item) => (
              <FilterChip key={item} active={filter === item} onClick={() => onFilterChange(item)}>{item}</FilterChip>
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
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{todos.length} of {totalCount} tasks shown</p>
        </div>

        <div className="grid gap-4">
          {todos.length === 0 ? (
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
  onSave: (updated: Todo) => Record<string, string>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState({ ...todo });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errs = onSave(draft);
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
            <button type="submit" className="flex-1 rounded-2xl px-5 py-3 font-semibold transition hover:opacity-90"
              style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
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

// ─── Shared primitives ────────────────────────────────────────────────────────

function Field({ label, helperText, error, value, onChange, rightElement, ...props }: {
  label: string; helperText?: string; error?: string; value?: string; onChange?: (value: string) => void; rightElement?: ReactNode;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</label>
      <div className="relative">
        <input
          id={id}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
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

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor="search-todos" className="text-sm" style={{ color: "var(--text-secondary)" }}>Search todos</label>
      <input id="search-todos" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder="Search by title or description"
        className="rounded-2xl px-4 py-3 outline-none transition placeholder:opacity-40"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
      />
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
