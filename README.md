# Hendrik CTO — Energy Commerce Platform

AI-powered smart home making money from energy trading, consultancy, and data products.

## Quick Start

```bash
cd hendrik-cto
npm install
npm run dev
```

## Project Structure

```
/
├── dashboard/       # Hendrik's energy dashboard (React)
├── consultancy/     # Intake form → PDF proposal automation
├── integrations/    # ENTSO-E, Tennet, Stripe APIs
├── ha-addons/       # Home Assistant custom integrations
├── utils/           # Shared utilities (logging, KPIs, etc.)
└── scripts/         # Deployment, monitoring
```

## Current Sprints

- [ ] Sprint 1: Energy dashboard (ENTSO-E integration)
- [ ] Sprint 2: Consultancy automation (Stripe + PDF generation)
- [ ] Sprint 3: Tennet Home Assistant integration

## How We Work

**Hendrik briefs via git commits/issues.** Claude Code reads, builds, commits back.

**Workflow:**
1. Hendrik writes task → `TASKS.md` or GitHub Issues
2. Claude Code reads, implements, commits
3. Hendrik reviews, auto-deploys or sends feedback
4. Loop

## Tech Stack

- **Dashboard:** Node.js + React + InfluxDB
- **Automation:** Python + Zapier/Make
- **Home Assistant:** Custom Python components
- **Deployment:** GitHub Actions → Vercel / Docker

## Team

- **Richard** — Owner, product decisions
- **Hendrik** — Operations, task briefs, integrations
- **Claude Code** — Engineering, builds everything

---

**Status:** Pre-MVP. Building Sprint 1.
