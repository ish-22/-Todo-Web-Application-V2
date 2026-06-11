import type { AuthState, AuthAction } from "@/types";

export const initialAuthState: AuthState = {
  isAuthenticated: false,
  token: null,
  username: null,
  error: null,
  isLoading: false,
};

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "LOGIN_START":   return { ...state, isLoading: true, error: null };
    case "LOGIN_SUCCESS": return { isAuthenticated: true, token: action.token, username: action.username, error: null, isLoading: false };
    case "LOGIN_ERROR":   return { ...state, isLoading: false, error: action.error };
    case "LOGOUT":
      if (typeof sessionStorage !== "undefined") sessionStorage.removeItem("auth_token");
      return { ...initialAuthState };
    case "CLEAR_ERROR":   return { ...state, error: null };
    default:              return state;
  }
}

// ── Mock auth service (replace with real API calls) ───────────────────────────

const MOCK_USERS: Record<string, { password: string; name: string }> = {};

export function mockLogin(email: string, password: string): { token: string; name: string } | null {
  const user = MOCK_USERS[email.toLowerCase()];
  if (!user || user.password !== password) return null;
  return { token: btoa(`${email}:${Date.now()}`), name: user.name };
}

export function mockRegister(name: string, email: string, password: string): boolean {
  const key = email.toLowerCase();
  if (MOCK_USERS[key]) return false;
  MOCK_USERS[key] = { password, name };
  return true;
}

export const seedTodos = [
  { id: 1, title: "Design the onboarding flow", description: "Map out the registration, login, and logout experience.", priority: "High" as const, completed: false, createdAt: "Today" },
  { id: 2, title: "Build protected task routes", description: "Keep unauthenticated users out of the todo dashboard.", priority: "Medium" as const, completed: true, createdAt: "Yesterday" },
  { id: 3, title: "Refine empty states", description: "Show helpful guidance when there are no active todos.", priority: "Low" as const, completed: false, createdAt: "2 days ago" },
];
