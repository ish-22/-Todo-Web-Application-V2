export type AuthMode = "login" | "register";
export type TodoStatus = "all" | "pending" | "completed";
export type Priority = "Low" | "Medium" | "High";

export interface Todo {
  id: number;
  title: string;
  description: string;
  priority: Priority;
  completed: boolean;
  createdAt: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  username: string | null;
  error: string | null;
  isLoading: boolean;
}

export type AuthAction =
  | { type: "LOGIN_START" }
  | { type: "LOGIN_SUCCESS"; token: string; username: string }
  | { type: "LOGIN_ERROR"; error: string }
  | { type: "LOGOUT" }
  | { type: "CLEAR_ERROR" };
