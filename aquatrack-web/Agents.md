# Instructions for the coding agent

Read `ARCHITECTURE.md` first. It is the source of truth.

## Ground rules
1. Do not rename or move pages, and do not change paths, without updating `src/config/routes.js` and `ARCHITECTURE.md` in the same change.
2. Never write a path string in a page. Import `ROUTES`.
3. `pages/admin` and `pages/agent` must never import from each other. Shared code goes in `pages/shared`, `components/`, `hooks/`, `api/` or `lib/`.
4. Both login pages must check the signed-in user's role against their own area and sign out on mismatch.
5. Fetch data only through `src/api/*` modules. Do not call `fetch` or Supabase table queries inline in a page.
6. Follow the domain rules in section 6 of `ARCHITECTURE.md` exactly (duplicate flagging, zero-floor consumption, approved-only billing).
7. Keep pages thin. Extract reusable UI into `components/`.

## Build order
1. `GatewayPage`, `AdminLoginPage`, `AgentLoginPage`, plus `AdminLayout` and `AgentLayout`
2. Admin: `HouseholdsPage` + `HouseholdFormPage`
3. Admin: `MeterReadingsPage` + `ReadingReviewPage`
4. Admin: `BillingPage` + `BillDetailPage`
5. Admin: `DashboardPage`, `ReportsPage`, then `UserManagementPage`, `SettingsPage`
6. Agent: `AgentHomePage` → `CaptureReadingPage` → `SyncQueuePage` (with offline queue) → `AgentProfilePage`

Work one step at a time and stop for review after each.
