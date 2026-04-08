# Hendrik Energie Dashboard

React + Vite app showing live Dutch electricity prices (ENTSO-E day-ahead),
Hendrik's solar production / consumption / battery state (Home Assistant),
and live revenue rate. Sprints 1.1 + 1.2 of Hendrik's energy commerce platform.

## Stack

- **Vite 8** + **React 19**
- **fast-xml-parser** — ENTSO-E returns XML
- **Home Assistant REST API** — for Enphase Envoy data
- No backend yet — Vite's dev proxy forwards `/api/entsoe` and `/api/ha`

## Components

| Component | Source | Acceptance criterion |
|---|---|---|
| `PriceCard` | ENTSO-E day-ahead (NL) | Task 1.1 |
| `DataFeed` | HA Enphase Envoy entities | Task 1.2 — production, consumption, battery, net flow |
| `RevenueCard` | HA Envoy + EnergyZero price | Task 1.2 — daily revenue tracking |

## Get tokens

### ENTSO-E (free, ~3 working days)

1. Register at https://transparency.entsoe.eu/
2. Confirm email
3. Email **transparency@entsoe.eu** with subject `Restful API access`,
   body asking for RESTful API access for your account
4. Wait ~3 working days for approval
5. Token is at **My Account → Web API Security Token**

### Home Assistant (instant)

In your HA UI:
1. Click your profile (bottom-left avatar)
2. Scroll to **Long-Lived Access Tokens** at the bottom
3. **Create Token**, name it (e.g. `hendrik-dashboard`)
4. Copy the JWT — you only see it once

## Run locally

```bash
cd dashboard
npm install
cp .env.example .env
# fill in VITE_ENTSOE_TOKEN, VITE_HA_TOKEN
npm run dev
```

App opens at http://localhost:5173.

## Run tests

```bash
node scripts/test-parser.mjs    # ENTSO-E XML parser
node scripts/test-revenue.mjs   # Revenue calculations
```

Both run offline, no network or tokens needed.

## Architecture notes

### Why dev proxies?

Both ENTSO-E and Home Assistant block direct browser access (no CORS headers).
`vite.config.js` configures two `server.proxy` rules:

| Browser path | Proxy target |
|---|---|
| `/api/entsoe/...` | `https://web-api.tp.entsoe.eu/api/...` |
| `/api/ha/...` | `$VITE_HA_BASE/...` (defaults to `https://ha.richardheesen.nl`) |

### Token security warning

Vite bundles every `import.meta.env.VITE_*` value into the public JS at build
time. **A built artifact contains your tokens in plain text** — anyone who
views the source can read them.

This is fine for local dev. For Task 1.3 (public deploy) we'll need either:

- A backend proxy that adds tokens server-side (Express, Vercel function,
  Cloudflare Worker)
- A scheduled job that pre-fetches data and publishes redacted JSON to
  `public/` (cheapest option, works on GitHub Pages)

### Units

Hendrik's preference (see `~/.openclaw/workspace/MEMORY.md`): always denominate
in **€/kWh**, never €/MWh. PriceCard shows kWh primary + MWh secondary;
RevenueCard and DataFeed are kWh / W only.

### Data flow

```
ENTSO-E ──┐
          └─→ /api/entsoe ──→ PriceCard
HA Envoy ─┐
HA Energy ┴─→ /api/ha ─────┬─→ DataFeed
                           └─→ RevenueCard
```

### Refresh cadence

- **PriceCard**: every 60 min (day-ahead prices don't change intraday)
- **DataFeed**, **RevenueCard**: every 5 min (acceptance criterion 1.2)

## File layout

```
dashboard/
├── index.html
├── vite.config.js              # dev proxy config (entsoe + ha)
├── package.json
├── .env.example                # token + entity ID template
├── scripts/
│   ├── test-parser.mjs         # ENTSO-E parser smoke test
│   └── test-revenue.mjs        # revenue lib smoke test
└── src/
    ├── main.jsx
    ├── App.jsx                 # 3-card grid layout
    ├── App.css
    ├── index.css
    ├── lib/
    │   ├── entsoe.js           # ENTSO-E client + XML parser
    │   ├── homeassistant.js    # HA REST client
    │   └── revenue.js          # pure revenue calculations
    └── components/
        ├── PriceCard.jsx       # current NL price (ENTSO-E)
        ├── PriceCard.css
        ├── DataFeed.jsx        # live solar/consumption/battery
        ├── DataFeed.css
        ├── RevenueCard.jsx     # live revenue rate + today estimate
        └── RevenueCard.css
```

## What's not in this sprint

- **InfluxDB historical storage**: deferred. The acceptance criteria don't
  strictly require it, and the live data + today's totals from HA cover the
  visible requirements. Will be needed for proper time-integrated revenue
  and for the CFO's revenue dashboard. See TASKS.md.
- **Hourly revenue integration**: today's revenue is currently estimated as
  `(production - consumption) × today's average price`, which is rough.
  Proper computation needs hourly data → InfluxDB.

## Next sprints (see ../TASKS.md)

- **Task 1.3** — Public deploy (GitHub Pages or Vercel) + CORS-safe data fetching
- **Sprint 2** — Consultancy intake automation
- **Sprint 3** — Tennet Home Assistant integration
