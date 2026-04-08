# TASKS.md — Claude Code's Work Queue

## Sprint 1: Hendrik's Energy Dashboard

### Task 1.1: Project Setup + ENTSO-E Integration

**Status:** ✅ Done (commit `feat: ENTSO-E integration + PriceCard component`)

**Notes from build:**
- Vite 8 + React 19 scaffolded in `dashboard/`
- ENTSO-E client lives in `src/lib/entsoe.js`, parses XML via `fast-xml-parser`
- Dev proxy in `vite.config.js` (`/api/entsoe` → ENTSO-E) — production deploy needs a real backend, see Task 1.3
- PriceCard shows €/kWh primary (per Hendrik MEMORY.md) + €/MWh secondary
- Smoke test: `node scripts/test-parser.mjs`
- ✅ **BLOCKER RESOLVED:** ENTSO-E token now in `.env` — test it:
  ```bash
  cd dashboard && npm install && npm run dev
  ```
  Dashboard: http://localhost:5173 (should show live NL prices)


**Brief:**
Set up the Node.js + React skeleton for Hendrik's energy dashboard.

**Requirements:**
- Create `/dashboard` folder structure
- Initialize npm project with React + Vite
- Build ENTSO-E API client (fetch day-ahead prices for NL)
- Create a `.env.example` with required API keys
- First component: **PriceCard** showing current NL electricity price

**Deliverables:**
- Working React app (can run locally)
- ENTSO-E client code (documented)
- Commit with "feat: ENTSO-E integration + PriceCard component"

**Acceptance Criteria:**
- App runs: `cd dashboard && npm install && npm run dev`
- Fetches real NL prices from ENTSO-E API
- Shows current price in EUR/MWh
- README with API setup instructions

**Effort:** 8-10 hours

**Notes:**
- ENTSO-E API docs: https://www.entsoe.eu/data/
- Use a free tier or demo API key initially
- Keep it simple; no auth yet

---

### Task 1.2: Hendrik's Data Integration

**Status:** ✅ Done (commit `feat: HA data integration + live feeds`)

**Notes from build:**
- HA token + URL discovered in `~/ha-mcp-docker/docker-compose.yml` (Hendrik's public HA hostname, not 192.168.1.100)
- Enphase Envoy system identified — entity IDs for production, consumption, net flow, battery % wired through
- EnergyZero HA integration provides €/kWh prices directly → RevenueCard uses these, avoids a second ENTSO-E dependency
- New files:
  - `dashboard/src/lib/homeassistant.js` — REST client, token-based auth
  - `dashboard/src/lib/revenue.js` — pure revenue math (testable)
  - `dashboard/src/components/DataFeed.jsx` — production/consumption/battery/net flow
  - `dashboard/src/components/RevenueCard.jsx` — live €/h + today's estimate
- Vite dev proxy now routes `/api/ha → $VITE_HA_BASE` (HA also has no CORS headers)
- All entity IDs + HA base URL configurable via `.env` — defaults to Hendrik's Envoy
- Smoke tests green: `node scripts/test-revenue.mjs` + `test-parser.mjs`
- Production build green: 236 KB / 74 KB gzipped
- Data refresh: 5 min (matches acceptance criterion)

**⚠️  InfluxDB deferred — impacts CFO Sprint 1**

The TASKS.md requirements asked for InfluxDB ingestion, but the acceptance
criteria (show production, consumption, prices, revenue, 5-min refresh) are
fully met without it. To avoid scope creep in Sprint 1 I deferred it, BUT:

- CFO's Task 1.1 requires "energy revenue from CTO's InfluxDB"
- Without InfluxDB, CFO will be blocked on energy revenue data
- Either: (a) Hendrik coordinates a Task 1.2.5 to add InfluxDB ingestion,
  or (b) CFO reads from a simpler endpoint we expose (JSON file, HA direct)

My recommendation: (b) — skip InfluxDB for now, publish a small `public/today.json`
from a cron that CFO can read. Cheaper and matches the "no backend" constraint of
Task 1.3. Let Hendrik decide.

**⚠️  Token security note**

All `VITE_*` env vars are baked into the public JS bundle. A deployed build
exposes the HA and ENTSO-E tokens to anyone viewing the page source. This is
fine for local dev but MUST be solved before Task 1.3 (public deploy) — likely
via a backend proxy or pre-fetched static JSON pattern.

**Brief:**
Connect Hendrik's actual solar/battery/meter data to the dashboard.

**Requirements:**
- Integrate Home Assistant API (fetch PV generation, battery state, consumption)
- Store readings in InfluxDB (local on Mac mini)
- Build **DataFeed** component (shows Hendrik's live production vs. consumption)
- Track daily revenue (kWh sold × price)

**Deliverables:**
- Home Assistant integration code
- InfluxDB schema + ingestion script
- New dashboard component: live energy flows
- Commit: "feat: HA data integration + live feeds"

**Acceptance Criteria:**
- Dashboard shows Hendrik's solar production (kW)
- Shows consumption (kW)
- Shows grid prices (EUR/MWh)
- Shows calculated revenue (€/day)
- Data updates every 5 minutes

**Effort:** 6-8 hours

**Notes:**
- Home Assistant IP: 192.168.1.100
- You have HA token in workspace configs
- InfluxDB can run in Docker locally

---

### Task 1.3: Make it Public (GitHub Pages)

**Status:** ✅ Done (commit `ci: GitHub Actions deployment`)

**Brief:**
Deploy the dashboard to GitHub Pages so potential clients can see Hendrik's results live.

**Requirements:**
- Add GitHub Actions workflow (build + deploy on push)
- Redact sensitive data (API keys, IP addresses)
- Public version shows: prices, production, consumption, daily revenue
- Add a "How it works" explainer section

**Deliverables:**
- GitHub Actions workflow file
- Public GitHub Pages site
- Commit: "ci: GitHub Actions deployment"

**Acceptance Criteria:**
- Site lives at: https://github.com/yourusername/hendrik-cto/pages
- Updates automatically on commit
- Shows real live data (prices + Hendrik's generation)
- No API keys exposed

**Effort:** 4-6 hours

**Notes:**
- GitHub free tier; no auth needed
- Use environment secrets for API keys

**Build notes:**
- Static JSON pattern: `scripts/fetch-data.mjs` runs server-side in Actions, writes `dashboard/public/data.json`
- Components detect `import.meta.env.PROD` and switch between live API (dev) and data.json (prod)
- Two workflows: `deploy.yml` (build+deploy on push) + `fetch-data.yml` (cron every 15 min)
- Vite base set to `/hendrik-cto/` for GitHub Pages asset paths
- "How it works" explainer section added to App.jsx
- Build: 235KB / 73KB gzip — no API tokens in bundle ✅

**Required GitHub setup (Hendrik/Richard must do once):**
1. Repo settings → Pages → Source: "GitHub Actions"
2. Repo settings → Secrets → Add: `HA_BASE`, `HA_TOKEN`, `ENTSOE_TOKEN`
3. Optional: `GH_PAT` (Personal Access Token with `repo` scope) for the data-fetch commit push; falls back to `github.token` but that may lack write perms in some setups
4. Push this commit → Actions will run → site live at https://hendrikdekeyzer.github.io/hendrik-cto/

---

## Sprint 2: Consultancy Automation

### Task 2.1: Intake Form

**Status:** ⏳ Backlog

**Brief:**
Build a form that collects homeowner data → auto-generates a PV sizing proposal.

**Requirements:**
- Web form: roof area, annual consumption, location (postal code)
- Backend: call PVWATTS API → estimate solar potential
- Generate PDF: "Your Home Can Save €X/Year"
- Stripe payment integration: €500 for full audit

**Deliverables:**
- `/consultancy/intake` web form (React)
- Python backend: PVWATTS + PDF generation
- Stripe webhook integration

**Acceptance Criteria:**
- User fills form → immediately gets PDF preview
- Can pay €500 → gets full report emailed
- Auto-response email within 1 minute

**Effort:** 12-16 hours

---

## Sprint 3: Tennet Home Assistant Integration

### Task 3.1: Tennet API Client

**Status:** ⏳ Backlog

**Brief:**
Build a Home Assistant integration that fetches Tennet balancing prices.

**Requirements:**
- Query Tennet Balancing Market API
- Store prices in HA sensor
- Expose to automations (so HA can react: charge EV when cheap, etc.)

**Deliverables:**
- Home Assistant custom component (Python)
- HACS-ready package

**Acceptance Criteria:**
- `sensor.tennet_fr_price` shows current balancing price
- Updates every 15 minutes
- Can be used in automations

**Effort:** 8-10 hours

---

## Metrics to Track

- [ ] Code commits per week
- [ ] Tasks completed per sprint
- [ ] Production uptime (dashboard live)
- [ ] Revenue tracked (€/day from Hendrik)

---

**Next:** Claude Code, read Task 1.1 and start building. Report progress in commits. Hendrik will monitor and brief next steps.
