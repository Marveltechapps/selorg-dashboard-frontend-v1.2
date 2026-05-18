# Dashboard smoke testing — plan & runbook

Single source of truth for **fullstack operational QA** across all eight dashboards: UI, API, persistence, and realtime behavior must work together as a **live q-commerce** system—not UI-only smoke.  
**Do not commit real passwords.** Use `.dashboard-smoke.env` (gitignored) populated from `.dashboard-smoke.env.example`.

**Section rule:** A dashboard section is **done** only when:
1. Every screen passes **§6.2** (fullstack per screen),
2. **§4.1** operational gates pass,
3. Every **§4.2 user flow** for that dashboard is completed start-to-finish (multi-step, as a real operator would),
4. **§6.3** sign-off is recorded.

**Screens vs user flows:** A screen check proves a page loads and actions work in isolation. A **user flow** proves the **task/operation** is achievable across **multiple screens, modals, and API calls** in order (navigation, context, success path, and error path).

**Agent rule — never say “complete” without all four angles:**

| Angle | Required before DONE |
|-------|----------------------|
| **Screens** | Every route in §5.x visited; §6.2 actions exercised (not load-only); no P0 error boundaries / 5xx on primary paths |
| **User flows** | Every §4.2 flow for that dashboard in a **real browser**, start-to-finish (mutations + refresh confirms state) |
| **Operational** | §4.1 gate for that dashboard proven with seed/API/UI evidence |
| **UI** | Known breakages fixed; modals/forms usable (no clipped CTAs, wrong env labels, dead buttons) |

Do **not** mark §11 `DONE (100%)` because a script exited 0, rows are visible, or a subagent reported success. Run `node scripts/{dashboard}-100-percent.mjs` (or equivalent) and be able to answer “yes” to every row above. If any angle is partial, status stays **In progress** with % and gaps listed.

---

## 1. Repo layout (where work happens)

| Area | Path |
|------|------|
| Frontend app | `selorg-dashboard-frontend-v1.1/` |
| Routes / dashboard shells | `src/App.tsx`, `src/components/*Management.tsx` |
| URL pattern | `/{dashboardId}/{screen?}` — `screen` drives `useDashboardNavigation` |
| Admin shell | `src/components/AdminManagement.tsx`, `src/components/admin/AdminSidebar.tsx` |
| Backend APIs | `selorg-dashboard-backend-v1.1/` — **required running** for every section; fix backend when UI failures trace to API/DB |
| Customer / picker / rider apps | `selorg-dashboard-backend-v1.1/src/customer-backend/`, `picker/`, `hhd/`, `rider/` — verify cross-surface impact when admin/ops changes affect live orders |
| Playwright | `playwright.config.ts` → `testDir: ./tests` (currently **no specs** in repo); **`tests/` is gitignored** — resolve before adding committed E2E |

---

## 2. Prerequisites (each session — fullstack)

1. **Backend** up (`selorg-dashboard-backend-v1.1`), health check OK, MongoDB (or configured DB) connected with **realistic seed data** for orders, inventory, riders, vendors—not empty mocks unless the screen is genuinely empty.
2. **Frontend** up (`npm run dev`, typically `http://localhost:5173`; align Playwright `baseURL` if automating).
3. **API path** matches env: `VITE_API_BASE_URL` or dev proxy → `/api/v1`; no silent 404/CORS on dashboard load.
4. Copy `.dashboard-smoke.env.example` → `.dashboard-smoke.env` and fill secrets locally.
5. DevTools **Console**, **Network** (filter XHR/fetch), and **Application → sessionStorage** (`selorg_auth_token`) open for every section.
6. **Realtime** (where screen uses it): WebSocket/Socket.io or polling connected; note `VITE_WS_URL` / proxy if live boards stay stale.

---

## 3. Credentials matrix (reference only — secrets in `.dashboard-smoke.env`)

**Login flow:** `/login` → pick **department tile** matching dashboard → enter email/password.

| Order | Dashboard (URL prefix) | Department tile | Email | Password source |
|------|-------------------------|-----------------|-------|------------------|
| 1 | `admin` | Admin Operations | `superadmin@selorg.com` | `SUPERADMIN_PASSWORD` in `.dashboard-smoke.env` |
| 2 | `darkstore` | Darkstore Ops | `darkstore@selorg.com` | `ROLE_ACCOUNT_PASSWORD` |
| 3 | `production` | Production | `production@selorg.com` | `ROLE_ACCOUNT_PASSWORD` |
| 4 | `warehouse` | Warehouse Ops | `warehouse@selorg.com` | `ROLE_ACCOUNT_PASSWORD` |
| 5 | `rider` | Rider Fleet | `rider@selorg.com` | `ROLE_ACCOUNT_PASSWORD` |
| 6 | `vendor` | Vendor & Supplier | `vendor@selorg.com` | `ROLE_ACCOUNT_PASSWORD` |
| 7 | `finance` | Finance | `finance@selorg.com` | `ROLE_ACCOUNT_PASSWORD` |
| 8 | `merch` | Merch & Promo | `merch@selorg.com` | `ROLE_ACCOUNT_PASSWORD` |

**Super admin:** JWT role `super_admin` / `admin` can select **any** department tile and still reach that dashboard’s routes when allowed by `DashboardRoute` (`vendor` also allows admin roles).

---

## 4. Iteration order (one dashboard per wave)

Recommended **q-commerce critical path first** (store ops → supply → fulfillment → finance):

1. **Admin** — platform, picker ops, catalog/users (governance).
2. **Darkstore** — live orders, pick/pack, inventory (core q-commerce).
3. **Warehouse** — inbound/outbound/transfers (supply chain).
4. **Rider** — dispatch, fleet (last mile).
5. **Vendor** — PO, inbound, QC (supplier loop).
6. **Production** — work orders, raw materials (if used in your rollout).
7. **Finance** — payouts, reconciliation (money trail).
8. **Merch** — pricing, allocation, replenishment (commercial).

Reorder if your rollout prioritizes production or merch earlier.

Each section must also satisfy **§4.1 Section operational gates** before moving to the next dashboard.

### 4.1 Section operational gates (q-commerce — per dashboard)

| Section | Must be operationally true before sign-off |
|---------|---------------------------------------------|
| **Admin** | Master data (stores/SKUs/users) readable **and** writable where UI exposes CRUD; picker OT/shift approvals **approve/reject** persist; catalog/coupon changes visible on reload |
| **Darkstore** | Live orders reflect API; pick/pack actions change order/task state; inventory adjustments reconcile; exceptions/SLA data from API |
| **Warehouse** | Inbound receipt, stock view, outbound/transfer actions hit API and survive refresh |
| **Rider** | Dispatch assigns/updates riders; fleet/HR docs load; shift/approval flows persist |
| **Vendor** | PO create/list, inbound status, QC/approval paths hit vendor APIs |
| **Production** | Work orders / raw materials CRUD or status transitions persist |
| **Finance** | Payments, payouts, reconciliation lists from API; approval/status updates persist |
| **Merch** | Pricing/promo/allocation/replenishment mutations persist; no mock-only fallbacks on primary screens |

### 4.2 User flows (required per section)

Walk each flow **as the role would in production**—no skipping steps by deep-linking mid-flow unless testing recovery. Mark **Pass / Fail / Blocked**; fix before section sign-off.

#### Admin

| Flow ID | Task / operation | Steps (happy path) |
|---------|------------------|-------------------|
| A1 | Platform login & navigation | `/login` → Admin tile → credentials → land `citywide` → open 3+ sidebar areas via nav (not URL only) → logout works |
| A2 | Onboard operator | `users` → Add user → fill required fields → save → user in list → open edit → change field → save → persists after refresh |
| A3 | Govern master data | `master-data` → open store/warehouse/SKU entity → create or update → save → confirm in list/detail after refresh |
| A4 | Manage catalog | `catalog` → create or edit product/SKU → save → search/filter finds it → open detail again |
| A5 | Approve picker OT | `ot-approvals` → select pending (or seed one) → Approve → item leaves pending / status updated → refresh confirms |
| A6 | Reject picker OT | Same screen → Reject (with reason if required) → status updated → persists |
| A7 | Shift change approval | `shift-change-approvals` → approve or reject one request → persists |
| A8 | Picker attendance export | `attendance-export` → set filters → Export → file downloads and contains expected columns |
| A9 | Coupon / pricing rule | `pricing` → create or activate coupon → appears in list → deactivate/edit if supported |
| A10 | CMS publish path | `content-hub` → child screen (e.g. `home-config` or `faq-management`) → edit → save → reload → content persisted |

#### Darkstore

| Flow ID | Task / operation | Steps (happy path) |
|---------|------------------|-------------------|
| D1 | Store ops login | Login as darkstore → `overview` loads with store context → navigate to `liveorders` via sidebar |
| D2 | Manage live order | `liveorders` → open order → view details → perform allowed status/action (assign/cancel/hold per UI) → confirm list/detail updates → refresh |
| D3 | Pick & pack task | `pickpack` or `pickpackops` → open task → start/complete pick step → pack step if separate → task state advances |
| D4 | Handle exception | `exceptionqueue` → open exception → resolve/escalate/action → item state changes in queue |
| D5 | Inventory adjustment | `inventory` → locate SKU → adjust qty or bin → save → qty reflects after refresh |
| D6 | Inbound at store | `inbound` → receive or confirm inbound line → stock/line status updates |
| D7 | Outbound handoff | `outbound` → process shipment/order handoff step → status moves forward |
| D8 | Staff shift | `staff` → view roster → create/edit shift or assignment if exposed → persists |
| D9 | SLA / missing item | `slamonitor` or `missingitems` → open item → action (ack/resolve) → updates |

#### Warehouse

| Flow ID | Task / operation | Steps |
|---------|------------------|--------|
| W1 | Receive inbound | `inbound` → open ASN/PO → receive qty → confirm → line/status updated → `inventory` shows stock change |
| W2 | Stock lookup & adjust | `inventory` → search SKU → open → adjust (if allowed) → refresh confirms |
| W3 | Transfer stock | `transfers` → create transfer → submit → approve/receive on other side if two-step → both locations reconcile |
| W4 | Outbound ship | `outbound` → pick/pack/ship workflow step → order/shipment status updated |
| W5 | Shift roster | `shift-roster` or `workforce` → assign shift → persists |

#### Rider

| Flow ID | Task / operation | Steps |
|---------|------------------|--------|
| R1 | Dispatch order | `dispatch` → find unassigned → assign rider → confirm → order/rider linkage visible after refresh |
| R2 | Fleet record | `fleet` → open vehicle/rider → update status or assignment → persists |
| R3 | HR document flow | `hr` → open rider → doc approve/reject or upload if exposed → status updates |
| R4 | Task approval | `approvals` → approve/reject item → leaves queue |
| R5 | Group delivery | `group-delivery` → create or manage batch → save → visible in list/map |

#### Vendor

| Flow ID | Task / operation | Steps |
|---------|------------------|--------|
| V1 | Vendor onboarding | `onboarding` or `vendor-list` → add vendor → complete steps → vendor active in list |
| V2 | Create PO | `po` → create PO → add lines → submit → PO in list with correct status |
| V3 | Inbound against PO | `inbound` → link to PO → receive → line qty/status updated |
| V4 | QC hold/release | `qc` → open check → pass/fail/hold → status updates |
| V5 | Vendor approval | `approvals` → approve/reject task → persists |

#### Production

| Flow ID | Task / operation | Steps |
|---------|------------------|--------|
| P1 | Raw material | `raw_materials` → create or update material → list after refresh |
| P2 | Work order lifecycle | `work_orders` → create WO → start → complete (or status transitions UI offers) → status persisted |
| P3 | QC on production | `qc` → record result on batch/order → persists |

#### Finance

| Flow ID | Task / operation | Steps |
|---------|------------------|--------|
| F1 | Customer payment review | `customer-payments` → open payment → action (reconcile/refund flag per UI) → status updates |
| F2 | Picker payout | `picker-payouts` → open batch → approve/mark paid → persists |
| F3 | Reconciliation | `reconciliation` → run or open mismatch → resolve/mark matched → persists |
| F4 | Finance approval | `approvals` → approve/reject → queue updates |

#### Merch

| Flow ID | Task / operation | Steps |
|---------|------------------|--------|
| M1 | Price change | `pricing` or `pricing-engine` → update price rule → save → visible in list/detail after refresh |
| M2 | Promotion | `promotions` or `promo-campaigns` → create/activate campaign → status in list |
| M3 | Allocation / replenishment | `allocation` or `replenishment` → create or trigger replenishment → record appears / status advances |
| M4 | Transfer order (merch) | `transfer-orders` → create → submit → status flow |

#### Cross-dashboard (run when sections on both sides are done)

| Flow ID | Task | Steps |
|---------|------|--------|
| X1 | Catalog → store ops | Admin `catalog` SKU change → Darkstore `inventory` or order line reflects availability/pricing (or document lag) |
| X2 | Order → dispatch | Darkstore order reaches dispatch-ready state → Rider `dispatch` shows assignable order |
| X3 | PO → warehouse stock | Vendor `po` + receive → Warehouse `inventory` qty increases |

---

## 5. Screen inventory (deep-link smoke)

Pattern: `http://localhost:5173/{dashboard}/{screen}`  
Default redirect: `/{dashboard}` → `/{dashboard}/overview` (except **admin** → `citywide`).

### 5.1 Admin (`/admin/...`)

Source: `AdminSidebar.tsx` + CMS children in `AdminManagement.tsx`.

**Control room:** `citywide`  

**Picker ops:** `picker-management`, `agencies`, `ot-approvals`, `shift-change-approvals`, `attendance-export`  

**Platform:** `master-data`, `users`, `customers`, `catalog`, `pricing`, `legal-policies`  

**Engines:** `logistics-providers`, `support`, `fraud`, `analytics`, `notifications`, `geofence`, `compliance` — **Legal Documents** uses external `/legal`, not `/admin/...`.  

**System & app:** `content-hub`, `audit`, `platform-config`, `system-tools`  

**CMS children (via hub):** `applications`, `customer-app-home`, `onboarding`, `app-settings`, `app-cms`, `cms-pages`, `faq-management`, `home-config`, `products-introduction`, `content-hub-categories`, `collections`

### 5.2 Darkstore (`/darkstore/...`)

Source: `DarkstoreManagement.tsx` + `Sidebar.tsx`.

`overview`, `liveorders`, `cancelledorders`, `pickpack`, `pickpackops`, `livepickingmonitor`, `slamonitor`, `missingitems`, `exceptionqueue`, `livepickerboard`, `pickerperformance`, `issues`, `inventory`, `inbound`, `outbound`, `qc`, `staff`, `health`, `escalations`, `alerts`, `ops-alerts`, `reports`, `hsd`, `utilities`, `replenishment`, `replenishment-tracking`

### 5.3 Warehouse (`/warehouse/...`)

Source: `WarehouseSidebar.tsx`.

`overview`, `inbound`, `inventory`, `outbound`, `transfers`, `qc`, `workforce`, `shift-master`, `shift-roster`, `equipment`, `devices`, `exceptions`, `analytics`, `utilities`, `logistics`, `logistics-tracking`, `logistics-estimate`

### 5.4 Rider (`/rider/...`)

Source: `RiderSidebar.tsx`.

`overview`, `hr`, `dispatch`, `fleet`, `escalations`, `alerts`, `analytics`, `rider-shifts`, `shifts`, `communication`, `health`, `approvals`, `training-kit`, `group-delivery`

### 5.5 Vendor (`/vendor/...`)

Source: `VendorManagement.tsx` (screens wired).

`overview`, `vendor-list`, `onboarding`, `po`, `inbound`, `inventory`, `qc`, `approvals`, `alerts`, `communication`, `analytics`, `system`, `finance`, `utilities`

### 5.6 Production (`/production/...`)

Source: `ProductionSidebar.tsx`.

`overview`, `raw_materials`, `planning`, `work_orders`, `qc`, `maintenance`, `workforce`, `alerts`, `reports`, `utilities`

### 5.7 Finance (`/finance/...`)

Source: `FinanceSidebar.tsx`.

`overview`, `customer-payments`, `vendor-payments`, `rider-cash`, `refunds`, `picker-payouts`, `reconciliation`, `ledger`, `billing`, `alerts`, `analytics`, `approvals`, `monitoring`, `communication`, `utilities`

### 5.8 Merch (`/merch/...`)

Source: `MerchSidebar.tsx` (`MerchManagement.tsx` must render matching `activeTab` values — verify during smoke; sidebar lists duplicate `analytics` IDs — **flag if navigation breaks**).

Declared ids include: `overview`, `catalog`, `pricing`, `promotions`, `allocation`, `geofence`, `inventory-overview`, `transactions`, `replenishment`, `expiry`, `warehouses`, `allocations`, `transfer-orders`, `vendors`, `analytics`, `alerts`, `compliance`, `pricing-engine`, `promo-campaigns`, `markdown-mgmt`, `competitor-analysis`, `forecasting`

---

## 6. Checklists (apply to every section)

### 6.1 Section start (once per dashboard wave)

```
Section (dashboard):
Date / tester:
Backend health: [ ] GET /api/v1/health (or project health) 2xx
DB / seed: [ ] Data exists for primary flows (orders, SKUs, riders, etc.)
Login: [ ] Correct department tile + role account
JWT: [ ] Token in sessionStorage; API calls send Authorization
Store/context: [ ] activeStoreId / hub / factory context set if screen requires it
```

### 6.2 Per-screen checklist (fullstack + UI)

Copy one block per screen.

```
Dashboard:
Screen (URL slug):
Date / tester:

UI / shell
[ ] Loads < 15s; no error boundary
[ ] Breadcrumbs / title match route
[ ] Layout matches shared dashboard shell (sidebar, top bar, content card)

API / data (fullstack)
[ ] Primary GET returns 2xx (note endpoint in Network tab)
[ ] Response shape matches UI (no blank table when API has rows)
[ ] Empty state only when API returns empty — not masked mock/fallback data
[ ] 401/403/5xx show user-visible error, not infinite loading
[ ] Refresh page: data still correct (proves persistence, not client-only state)

Operational actions (q-commerce — do all that apply on this screen)
[ ] Read: open detail / drawer / modal with real record id from API
[ ] Create: submit form → 2xx → new row appears in list (or documented sandbox skip)
[ ] Update: edit/save/status change → 2xx → change visible after refresh
[ ] Delete/archive: only if safe in dev; confirm removed or soft-deleted in list/API
[ ] Workflow: approve/reject, assign, dispatch, receive, pack, pay, etc. → state change persists
[ ] Export/download: file generates or API returns expected payload
[ ] Search/filter/pagination: changes query/API params and results update

Realtime (if screen is live ops)
[ ] WS/polling connected OR documented why disabled
[ ] Timestamps/counts update on refresh or push without full page reload

Cross-check (when this screen affects other surfaces)
[ ] Change visible in related dashboard or DB (e.g. admin catalog → darkstore SKU; order status → rider dispatch)

Fix tracking
[ ] Frontend-only / Backend-only / Both
Notes / screenshots:
Blockers:
```

**Safety:** Use dev/sandbox tenants. Prefer reversible updates. Avoid mass deletes on shared DB.

### 6.4 User flow checklist (one block per flow in §4.2)

```
Flow ID: (e.g. D2)
Dashboard:
Task / operation:
Date / tester:

Path
[ ] Started from realistic entry (login → nav), not only mid-flow URL
[ ] Each step UI reachable; back/forward/breadcrumb sane
[ ] Required context present (store, hub, date range, permissions)

Execution
[ ] Happy path completed without workaround
[ ] Each step triggers expected API (note key endpoints)
[ ] Success toasts/messages match outcome
[ ] Final state correct in UI after refresh
[ ] Optional: error path (invalid input / cancel) shows clear message, no corrupt state

Outcome
[ ] Task fulfilled — operator could finish the job
[ ] Pass / Fail / Blocked
Blockers (FE/BE):
Retest after fix: [ ]
```

### 6.3 Section sign-off (required to close a dashboard wave)

```
Section:
[ ] Every screen in §5 inventory visited (or marked N/A with reason)
[ ] Every user flow in §4.2 for this dashboard: Pass (or Blocked with ticket)
[ ] §4.1 operational gate for this dashboard passed
[ ] Cross-dashboard flows in §4.2 (X*) run if dependent sections complete
[ ] No P0: broken login, 5xx on primary list, CRUD silently fails, mock data on production path, broken user flows for primary ops
[ ] P1/P2 issues logged with owner (FE/BE) and retest note
[ ] Fixes merged or ticketed before starting next section
```

---

## 7. Q-commerce primary operations (fullstack — mapped to user flows)

§4.2 user flows are the **executable** version of these themes. If a theme applies to a section, its matching flow IDs must **Pass**.

| Theme | Flow IDs | Fullstack proof |
|-------|----------|-----------------|
| Order → fulfill | D2, D3, D4, D9 | Order/task/exception state changes via API; survives refresh |
| Inventory truth | D5, W2, W3, V4 | Stock qty/location updates persist; transfers reconcile |
| Inbound supply | D6, W1, V2, V3 | PO/receipt → inventory reflects receipt |
| Outbound / dispatch | D7, W4, R1, X2 | Handoff/dispatch assigns rider or shipment state |
| Workforce | D8, W5, A5–A8, R3, R4 | Shifts/OT/approvals/export complete end-to-end |
| Money | F1–F4 | Payment/payout/reconciliation status saved |
| Platform governance | A2–A4, A9, A10 | Master entities + config persist and feed ops |
| Cross-surface | X1–X3 | Change in one dashboard visible in the next |

---

## 8. Known tooling gaps (fix during execution phase)

| Item | Action |
|------|--------|
| Playwright `baseURL` is `3000`, Vite dev is often `5173` | Harmonize env or document “run static on 3000” |
| `.gitignore` has `tests/` | Blocks committing `./tests/**/*.spec.ts`; narrow ignore to artifacts (`test-results`, reports) |
| No Playwright specs yet | Add minimal `login + land home` per dashboard after gitignore fix |
| `MerchSidebar` duplicate `analytics` keys | Confirm React reconciliation / navigation bug |

---

## 9. Execution phases (fullstack fixes per section)

For each phase: run **§6.1 → every screen §6.2 → every user flow §4.2 + §6.4 → §4.1 gate → §6.3 sign-off**; fix **frontend and backend** until operational.

**Phase A — Admin:** All `/admin/...` routes + §4.1 Admin gate.  
**Phase B — Darkstore:** All routes + order/pick/inventory operational flows.  
**Phase C — Warehouse → Rider → Vendor → Production → Finance → Merch:** Same pattern per §4 iteration order.  
**Phase D (optional):** Playwright fullstack smoke (login + API assert + one mutation per dashboard); gitignore/playwright URL cleanup.

---

## 10. Plugins / installs

**None required** for manual smoke + fixes. Optional: Playwright browsers (`npx playwright install`) **only when** adding automated specs.

---

## 11. Execution log (dashboard-by-dashboard)

| Dashboard | Status | Screens | Flows | Report | Notes |
|-----------|--------|---------|-------|--------|-------|
| **Admin** | **DONE (100%)** | 34/34 | A1–A10 | `admin-flows-full-*` + `admin-complete-*` | `node scripts/admin-100-percent.mjs` |
| **Darkstore** | **In progress (~85%)** | 26/26 load | D1–D9 shallow pass | `darkstore-flows-full-2026-05-16T07-40` | Not §4.2-deep (pick/resolve/adjust CRUD); finish before Warehouse |
| Warehouse | Pending | — | — | — | |
| Rider | Pending | — | — | — | |
| Vendor | Pending | — | — | — | |
| Production | Pending | — | — | — | |
| Finance | Pending | — | — | — | |
| Merch | Pending | — | — | — | |

**Admin §6.3 sign-off:** 2026-05-16 — `node scripts/admin-100-percent.mjs` (flows + screens).  
**Darkstore §6.3 sign-off:** 2026-05-16 — `node scripts/darkstore-flows-full.mjs` (D1–D9 pass); screens via `darkstore-smoke-phase-b.mjs` (26 routes). Seed: `node scripts/darkstore-seed-flows.js`.
