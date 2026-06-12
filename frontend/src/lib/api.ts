import type { Todo } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export type TodoFilters = {
  search?: string;
  status?: "all" | "pending" | "completed";
  priority?: Todo["priority"] | "all";
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string>) },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message =
      data.errors?.email?.[0] ??
      data.errors?.name?.[0] ??
      data.message ??
      "Request failed";
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export async function register(
  name: string,
  email: string,
  password: string
): Promise<{ token: string; user: { name: string; email: string } }> {
  return request("/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export async function login(
  email: string,
  password: string
): Promise<{ token: string; user: { name: string; email: string } }> {
  return request("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function logout(token: string): Promise<void> {
  await request("/logout", { method: "POST" }, token);
}

export async function getCurrentUser(
  token: string
): Promise<{ name: string; email: string }> {
  return request("/me", {}, token);
}

export async function fetchTodos(token: string, filters: TodoFilters = {}): Promise<Todo[]> {
  const params = new URLSearchParams();

  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }

  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }

  if (filters.priority && filters.priority !== "all") {
    params.set("priority", filters.priority);
  }

  const path = params.toString() ? `/todos?${params.toString()}` : "/todos";

  return request<Todo[]>(path, {}, token);
}

export async function createTodo(
  token: string,
  data: { title: string; description: string; priority: Todo["priority"] }
): Promise<Todo> {
  return request(
    "/todos",
    { method: "POST", body: JSON.stringify(data) },
    token
  );
}

export async function updateTodo(
  token: string,
  id: number,
  data: Partial<Pick<Todo, "title" | "description" | "priority" | "completed">>
): Promise<Todo> {
  return request(
    `/todos/${id}`,
    { method: "PUT", body: JSON.stringify(data) },
    token
  );
}

export async function deleteTodo(token: string, id: number): Promise<void> {
  await request(`/todos/${id}`, { method: "DELETE" }, token);
}
