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
    case "LOGOUT":        return { ...initialAuthState };
    case "CLEAR_ERROR":   return { ...state, error: null };
    default:              return state;
  }
}
