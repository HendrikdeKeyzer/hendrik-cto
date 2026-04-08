# Consultancy Intake Form — Task 2.1

Solar potential calculator + PDF proposal generator + Stripe payment.

## Architecture

```
consultancy/
  api/
    main.py          FastAPI backend (Python)
    pvwatts.py       NREL PVWatts v8 client
    geocode.py       Postal code → lat/lon (Nominatim)
    pdf_gen.py       PDF proposal generator (ReportLab)
    email_sender.py  SMTP email (preview + full report)
    requirements.txt
    .env.example
```

Frontend lives in `dashboard/src/pages/ConsultancyPage.jsx` (React, added to existing Vite app).

## Quick Start

### 1. Backend

```bash
cd consultancy/api
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env with your API keys

uvicorn main:app --reload --port 8000
```

API will be at: http://localhost:8000

Try it: http://localhost:8000/api/report/DEMO/pdf (demo preview PDF)

### 2. Frontend

```bash
cd dashboard
# Add to .env:
echo "VITE_CONSULTANCY_API=http://localhost:8000" >> .env
npm run dev
```

Visit: http://localhost:5173/consultancy

## API Keys Required

| Key | Where to get | Cost |
|-----|-------------|------|
| `PVWATTS_API_KEY` | https://developer.nrel.gov/signup/ | Free |
| `STRIPE_SECRET_KEY` | https://dashboard.stripe.com/apikeys | Free (test) |
| `STRIPE_PUBLISHABLE_KEY` | Same | Free (test) |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks | Free |
| `SMTP_USER` / `SMTP_PASS` | Gmail App Password | Free |

## Flow

1. User fills 5-field form (name, email, postal code, roof area, consumption)
2. Backend geocodes postal code → calls PVWATTS → calculates savings
3. Preview PDF generated (monthly data partially redacted)
4. PDF emailed to client, lead notification to Hendrik
5. Client sees savings estimate + Stripe €500 CTA
6. On payment: Stripe webhook fires → Hendrik notified to deliver full report

## Stripe Setup

1. Create a webhook in Stripe Dashboard pointing to: `https://your-api.com/api/webhook`
2. Listen for: `checkout.session.completed`
3. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

For local testing: `stripe listen --forward-to localhost:8000/api/webhook`

## Production Deployment

The backend needs to run somewhere (not GitHub Pages — that's static only).

Options:
- **Railway** (easiest): Connect repo, set env vars, done. ~$5/mo
- **Render**: Free tier available for hobby use
- **VPS / Mac mini**: Run with systemd/launchd, expose via nginx + Let's Encrypt

Update `CORS_ORIGIN` in `.env` to your frontend URL.
Update `VITE_CONSULTANCY_API` in dashboard `.env` to your backend URL.

## Acceptance Criteria (Task 2.1)

- [x] Web form: roof area, annual consumption, location (postal code)
- [x] Backend: PVWATTS API → solar potential estimate
- [x] Generate PDF: "Your Home Can Save €X/Year"
- [x] Stripe payment integration: €500 for full audit
- [x] Preview PDF emailed within 30 seconds of form submission
- [x] Stripe webhook → notifies Hendrik on payment
- [x] iDEAL support (NL clients)
