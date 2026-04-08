# Hendrik Energie Dashboard

React + Vite app that shows live Dutch electricity prices from the
ENTSO-E day-ahead market. Sprint 1 of Hendrik's energy commerce platform.

## Stack

- **Vite 8** + **React 19**
- **fast-xml-parser** — ENTSO-E returns XML
- No backend yet — Vite's dev proxy forwards `/api/entsoe` to ENTSO-E

## Get an ENTSO-E API token

ENTSO-E doesn't offer a demo token. To get free API access:

1. Register at https://transparency.entsoe.eu/
2. Confirm your email
3. Email **transparency@entsoe.eu** with subject `Restful API access`
   and body asking them to enable RESTful API access for your account
4. They reply within ~3 working days
5. Once approved: **My Account → Web API Security Token**

## Run locally

```bash
cd dashboard
npm install
cp .env.example .env
# paste your token into VITE_ENTSOE_TOKEN
npm run dev
```

App opens at http://localhost:5173.

## Run tests

```bash
node scripts/test-parser.mjs
```

Smoke test for the XML parser, no network needed.

## Architecture notes

### Why a dev proxy?

ENTSO-E's API does **not** send `Access-Control-Allow-Origin` headers, so a
browser can't call it directly. During local development, `vite.config.js`
configures `server.proxy` to forward `/api/entsoe → https://web-api.tp.entsoe.eu/api`.

### Production deployment

The dev proxy only works under `vite dev`. For production we need either:

- A small backend (Node/Express, Vercel function, Cloudflare Worker) that
  proxies the request server-side, OR
- A scheduled job that fetches prices once per hour and writes them to
  static JSON in `public/` (cheaper, GitHub Pages compatible)

Decision deferred to **Task 1.3 — Make it Public (GitHub Pages)**.

### Units

Hendrik's preference (see `~/.openclaw/workspace/MEMORY.md`): always show prices
in **€/kWh**. We display kWh as the primary value with €/MWh as a smaller
secondary line.

## File layout

```
dashboard/
├── index.html
├── vite.config.js          # dev proxy config
├── package.json
├── .env.example            # token template
├── scripts/
│   └── test-parser.mjs     # parser smoke test
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── App.css
    ├── index.css
    ├── lib/
    │   └── entsoe.js       # API client + XML parser
    └── components/
        ├── PriceCard.jsx   # current NL price display
        └── PriceCard.css
```

## Next sprints (see ../TASKS.md)

- **Task 1.2** — Hendrik's Home Assistant data integration
- **Task 1.3** — Public deploy (GitHub Pages or Vercel)
