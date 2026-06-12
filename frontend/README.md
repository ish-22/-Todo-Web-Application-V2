# TaskFlow — Frontend

Next.js frontend for the TaskFlow todo application, connected to a Laravel + PostgreSQL REST API.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth | Bearer token via Laravel Sanctum |
| State | React `useReducer` + `useState` |
| HTTP | Native `fetch` (no extra libraries) |

## Features

- **Authentication** — Register and login with client-side and server-side validation. Errors from the API are displayed inline.
- **Session persistence** — Bearer token is stored in `sessionStorage` and restored on page reload. Automatically cleared when the tab is closed.
- **Todo management** — Create, edit, delete, and toggle todos. All actions are synced to the backend in real time.
- **Search & filter** — Filter todos by keyword (title/description), status (all / pending / completed), and priority (Low / Medium / High).
- **Analytics** — Completion rate ring chart and priority breakdown bars, calculated from live data.
- **Responsive design** — Works on mobile, tablet, and desktop.
- **Light / dark mode** — Automatically matches system preference. Toggle persisted in `localStorage`.

---

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── Header.tsx         # nav bar with auth state + theme toggle
│   │   └── Footer.tsx
│   ├── globals.css            # CSS variables for theming
│   ├── layout.tsx
│   └── page.tsx               # entire app UI (auth, dashboard, analytics)
├── lib/
│   ├── api.ts                 # all fetch calls to the Laravel API
│   ├── auth.ts                # authReducer + initialAuthState
│   ├── hooks.ts               # useTheme, useActiveSection
│   └── validation.ts
└── types/
    └── index.ts               # shared TypeScript types
```

### Key files

**`src/lib/api.ts`** — All HTTP calls to the backend. Every function accepts a `token` and calls the relevant endpoint.

```
register()     POST /api/register
login()        POST /api/login
logout()       POST /api/logout
getCurrentUser() GET /api/me
fetchTodos()   GET /api/todos   (with optional search / status / priority params)
createTodo()   POST /api/todos
updateTodo()   PUT  /api/todos/{id}
deleteTodo()   DELETE /api/todos/{id}
```

**`src/lib/auth.ts`** — `authReducer` handles LOGIN_START, LOGIN_SUCCESS, LOGIN_ERROR, LOGOUT, and CLEAR_ERROR actions.

**`src/types/index.ts`** — Shared types: `Todo`, `AuthState`, `AuthAction`, `Priority`, `TodoStatus`, `AuthMode`.

---

## Setup

### Prerequisites

- Node.js 18+
- The backend API running at `http://localhost:8000` (see backend README)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create `.env.local` (already present):

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

Change this if your backend runs on a different port.

### 3. Run the dev server

```bash
npm run dev
```

App runs at: `http://localhost:3000`

---

## How It Connects to the Backend

1. User registers or logs in → the API returns a `token` and `user` object.
2. The token is saved to `sessionStorage` and attached to every subsequent request as `Authorization: Bearer <token>`.
3. On page load, the token is read from `sessionStorage` to restore the session without re-logging in.
4. On logout, the token is revoked via `POST /api/logout` and removed from `sessionStorage`.
5. Todos are fetched immediately after login and re-fetched whenever the search, status, or priority filter changes.

---

## Pages & UI Sections

### Unauthenticated view
- **Hero** — App name, tagline, and 4 feature highlight cards (Create tasks, Track progress, Search & filter, Analytics).
- **Auth section** — Login / Register form with toggle. Validation runs client-side first, then server errors are shown inline.
- **Aside panel** — "Why TaskFlow?" list of benefits.

### Authenticated view
- **Hero** — Personalised welcome with live stats: total tasks, completed, pending.
- **Dashboard** — Two-column layout:
  - Left: signed-in user name, search input, status filter chips, priority filter chips, create todo form.
  - Right: scrollable todo list with status, priority badges, and action buttons (Mark completed, Edit, Delete).
- **Edit modal** — Opens over the page to edit title, description, and priority of an existing todo.
- **Analytics** — Completion rate ring, total/completed/pending counters, priority breakdown bar chart.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api` | Base URL of the Laravel API |

---

## Running Both Together

```bash
# Terminal 1 — backend
cd Todo-Web-Application-api-v2
php artisan serve

# Terminal 2 — frontend
cd -Todo-Web-Application-V2/frontend
npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000/api |
