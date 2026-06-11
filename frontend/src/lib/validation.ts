import type { AuthMode } from "@/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateAuth(
  mode: AuthMode,
  fields: { name?: string; email: string; password: string }
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (mode === "register" && !fields.name?.trim()) errors.name = "Full name is required.";
  if (!fields.email.trim()) errors.email = "Email address is required.";
  else if (!EMAIL_RE.test(fields.email)) errors.email = "Enter a valid email address.";
  if (!fields.password) errors.password = "Password is required.";
  else if (fields.password.length < 8) errors.password = "Password must be at least 8 characters.";
  return errors;
}

export function validateTodo(title: string): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!title.trim()) errors.title = "Title is required.";
  else if (title.trim().length > 100) errors.title = "Title must be under 100 characters.";
  return errors;
}
