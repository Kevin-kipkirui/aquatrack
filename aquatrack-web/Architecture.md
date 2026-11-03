# AquaTrack Web — Frontend Architecture

Smart Water Usage Tracking and Billing System (Nakuru Residents Association).
One React (Vite) app, two audiences, one codebase.

## 1. Stack
- React 18 + Vite, `react-router-dom` v6 (declarative routes, lazy pages)
- Supabase Auth (JWT) for sign-in; Node/Express REST API for business logic
- Plain JavaScript (JSX)

## 2. Two audiences, one gateway
`/` is the **Gateway**. The user picks a direction and is sent to that area's own login:

| Audience     | Login           | Area       | Role value (`user_metadata.role`) |
|--------------|-----------------|------------|-----------------------------------|
| Administrator| `/admin/login`  | `/admin/*` | `admin`                           |
| Field agent  | `/agent/login`  | `/agent/*` | `field_officer`                   |

Rules:
1. Each login page signs in, then **verifies the role matches its area**. If not, sign out and show an inline error ("This account is not an administrator account").
2. Each area is wrapped in `RequireRole` (in `App.jsx`). No session → that area's login. Wrong role → `/unauthorized`.
3. The two areas never import from each other. Anything both need goes in `shared/`.
4. The backend is the real security boundary (`requireAuth` + `requireRole`, Supabase RLS). Frontend guards are UX only.

## 3. Folder structure
```
src/
  main.jsx                  Router + AuthProvider bootstrap
  App.jsx                   Route table + RequireRole guard
  config/
    routes.js               ROUTES constants — the only place paths are written
    roles.js                ROLES constants
  auth/
    AuthProvider.jsx        Session, role, signIn/signOut, useAuth()
  lib/
    supabase.js             Supabase client
  pages/
    gateway/GatewayPage.jsx
    auth/                   AdminLoginPage, AgentLoginPage
    admin/                  DashboardPage, MeterReadingsPage, ReadingReviewPage,
                            HouseholdsPage, HouseholdFormPage, BillingPage,
                            BillDetailPage, ReportsPage, UserManagementPage, SettingsPage
    agent/                  AgentHomePage, CaptureReadingPage, SyncQueuePage, AgentProfilePage
    shared/                 UnauthorizedPage, NotFoundPage
```
Added later (not scaffolded yet): `components/`, `layouts/` (AdminLayout with sidebar, AgentLayout with bottom tab bar), `api/` (one module per resource), `hooks/`, `offline/` (agent sync queue).

## 4. Route map
**Public:** `/` gateway · `/admin/login` · `/agent/login` · `/unauthorized` · `*` not found

**Admin** (`admin`): `/admin/dashboard` · `/admin/readings` · `/admin/readings/:readingId` · `/admin/households` · `/admin/households/new` · `/admin/households/:householdId/edit` · `/admin/billing` · `/admin/billing/:billId` · `/admin/reports` · `/admin/users` · `/admin/settings`

**Agent** (`field_officer`): `/agent/households` · `/agent/capture/:householdId` · `/agent/queue` · `/agent/profile`

`/admin` redirects to the dashboard, `/agent` redirects to the household list.

## 5. Page responsibilities
| Page | Job | Backend |
|------|-----|---------|
| GatewayPage | Two clear entry points: Administrator / Field agent | none |
| AdminLoginPage | Email + password; reject non-admins | Supabase Auth |
| AgentLoginPage | Phone + password; reject non-agents; inline error banner separating auth failure from network failure | Supabase Auth |
| DashboardPage | Summary cards (households, readings this month, flagged duplicates, unpaid bills), consumption trend, recent readings | `GET /api/dashboard/summary` |
| MeterReadingsPage | Filterable list by status / billing period / household | `GET /api/readings` |
| ReadingReviewPage | Compare a flagged reading with the existing one; approve or reject (approval triggers bill generation) | `GET/PATCH /api/readings/:id` |
| HouseholdsPage | Searchable household list | `GET /api/households` |
| HouseholdFormPage | Create/edit household (owner, phone, meter no., section, rate category). Same page for `/new` and `/:id/edit`; meter number must be unique | `POST/PATCH /api/households` |
| BillingPage | Revenue / bills generated / outstanding, bills table filterable by payment status | `GET /api/bills` |
| BillDetailPage | One bill: reading, consumption, rate, amount, payment status | `GET /api/bills/:id` |
| ReportsPage | Monthly revenue trend, consumption by section, export | `GET /api/reports` |
| UserManagementPage | Create/disable admin and field agent accounts | `/api/users` |
| SettingsPage | Billing rate, billing period configuration | `/api/settings` |
| AgentHomePage | Pick/search a household to read; shows sync status summary | `GET /api/households` (cached) |
| CaptureReadingPage | Previous reading shown, enter current, auto-consumption, local duplicate check, offline indicator | `POST /api/readings` or local queue |
| SyncQueuePage | Synced / pending / flagged / failed readings, "Sync now" | local queue + API |
| AgentProfilePage | Agent details, sign out | Supabase Auth |

## 6. Domain rules the UI must respect
- Reading statuses: `pending_review`, `flagged_duplicate`, `approved` (queue-only: `synced`, `pending`, `failed`).
- A duplicate = same `household_id` + `billing_period`. It is **stored and flagged, never discarded**.
- Consumption = current − previous reading, **floored at 0** for billing.
- Bills are created only from `approved` readings; start as `unpaid`.
- Agent area is offline-first: capture writes to the local queue first, sync happens in the background.

## 7. Conventions
- Page files: `PascalCase` + `Page` suffix, default export, one page per file.
- Never hardcode a path — use `ROUTES`.
- Pages fetch via `src/api/*` modules (never `fetch` inline); the API client attaches the Supabase JWT as `Authorization: Bearer`.
- Pages stay thin: layout + data wiring. Reusable UI goes in `components/`.
- Agent pages are mobile-first (phone width); admin pages are desktop-first and responsive.
- Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
