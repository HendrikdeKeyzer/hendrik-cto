"""
Hendrik De Keyzer — Consultancy API
FastAPI backend for the solar intake form.

Routes:
  POST /api/quote       — geocode + PVWATTS + savings calc → preview PDF
  POST /api/checkout    — create Stripe checkout session (€500)
  POST /api/webhook     — Stripe webhook (fulfill full report on payment)
  GET  /api/health      — health check
"""

import os
import uuid
import logging
from contextlib import asynccontextmanager

import stripe
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

from geocode import postal_to_latlon
from pvwatts import estimate_solar, estimate_system_capacity, estimate_savings
from pdf_gen import generate_proposal_pdf
from email_sender import send_report_email, notify_hendrik

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("consultancy-api")

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
CORS_ORIGIN = os.getenv("CORS_ORIGIN", "http://localhost:5173")


# ── Pydantic models ──────────────────────────────────────────────────────────

class IntakeForm(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    postal_code: str = Field(..., min_length=4, max_length=8, description="Dutch postal code")
    roof_area_m2: float = Field(..., gt=5, lt=2000, description="Available roof area in m²")
    annual_consumption_kwh: float = Field(..., gt=100, lt=100000, description="Annual consumption in kWh")
    roof_tilt_deg: float = Field(default=30.0, ge=0, le=60)
    azimuth_deg: float = Field(default=180.0, ge=0, le=360, description="180=south, 90=east, 270=west")


class QuoteResponse(BaseModel):
    report_id: str
    annual_savings_eur: float
    annual_production_kwh: float
    system_capacity_kw: float
    payback_years: float | str
    monthly_kwh: list[float]
    stripe_publishable_key: str


# ── App setup ────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Consultancy API starting up")
    yield
    logger.info("Consultancy API shutting down")


app = FastAPI(
    title="Hendrik De Keyzer — Consultancy API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[CORS_ORIGIN, "https://hendrikdekeyzer.github.io"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "hendrik-consultancy"}


@app.post("/api/quote", response_model=QuoteResponse)
async def generate_quote(form: IntakeForm):
    """
    Main intake endpoint:
    1. Geocode postal code → lat/lon
    2. Calculate system capacity from roof area
    3. Call PVWATTS → annual/monthly production
    4. Calculate savings
    5. Generate preview PDF
    6. Email PDF to client
    7. Notify Hendrik
    """
    report_id = str(uuid.uuid4())[:8].upper()
    logger.info(f"New quote request: {form.name} <{form.email}>, report {report_id}")

    # 1. Geocode
    try:
        lat, lon = await postal_to_latlon(form.postal_code)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not find location for postal code '{form.postal_code}': {e}")

    # 2. System capacity
    system_kw = estimate_system_capacity(form.roof_area_m2)
    if system_kw < 0.5:
        raise HTTPException(status_code=422, detail="Roof area too small for a viable solar system (minimum ~7 m²)")

    # 3. PVWATTS
    try:
        pvwatts = await estimate_solar(
            lat=lat,
            lon=lon,
            system_capacity_kw=system_kw,
            roof_tilt_deg=form.roof_tilt_deg,
            azimuth_deg=form.azimuth_deg,
        )
    except Exception as e:
        logger.error(f"PVWATTS error for {form.postal_code}: {e}")
        raise HTTPException(status_code=502, detail=f"Solar estimation service error: {e}")

    # 4. Savings
    savings = estimate_savings(pvwatts["annual_kwh"])
    annual_savings = savings["total_annual_savings_eur"]

    payback_years = round((system_kw * 1200) / annual_savings, 1) if annual_savings > 0 else "N/A"

    # 5. Preview PDF
    try:
        pdf_bytes = generate_proposal_pdf(
            client_name=form.name,
            client_email=form.email,
            address=f"{form.postal_code}, Netherlands",
            roof_area_m2=form.roof_area_m2,
            annual_consumption_kwh=form.annual_consumption_kwh,
            system_capacity_kw=system_kw,
            pvwatts=pvwatts,
            savings=savings,
            report_id=report_id,
            is_preview=True,
        )
    except Exception as e:
        logger.error(f"PDF generation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate report PDF")

    # 6. Email PDF
    smtp_configured = bool(os.getenv("SMTP_USER") and os.getenv("SMTP_PASS"))
    if smtp_configured:
        try:
            send_report_email(
                to_email=form.email,
                to_name=form.name,
                pdf_bytes=pdf_bytes,
                report_id=report_id,
                annual_savings=annual_savings,
                is_preview=True,
            )
            notify_hendrik(
                client_name=form.name,
                client_email=form.email,
                address=f"{form.postal_code}, Netherlands",
                annual_savings=annual_savings,
                system_kw=system_kw,
                report_id=report_id,
                paid=False,
            )
            logger.info(f"Emails sent for report {report_id}")
        except Exception as e:
            # Don't fail the request if email doesn't work
            logger.warning(f"Email send failed for {report_id}: {e}")
    else:
        logger.warning("SMTP not configured — skipping email")

    return QuoteResponse(
        report_id=report_id,
        annual_savings_eur=annual_savings,
        annual_production_kwh=pvwatts["annual_kwh"],
        system_capacity_kw=system_kw,
        payback_years=payback_years,
        monthly_kwh=pvwatts["monthly_kwh"][:3],  # Preview: first 3 months only
        stripe_publishable_key=os.getenv("STRIPE_PUBLISHABLE_KEY", ""),
    )


@app.post("/api/checkout")
async def create_checkout(request: Request):
    """Create a Stripe checkout session for €500 full report."""
    body = await request.json()
    report_id = body.get("report_id", "")
    client_email = body.get("email", "")

    if not stripe.api_key:
        raise HTTPException(status_code=503, detail="Payment not configured")

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card", "ideal"],  # iDEAL for NL clients
            line_items=[{
                "price_data": {
                    "currency": "eur",
                    "product_data": {
                        "name": "Full Solar Audit Report",
                        "description": (
                            "Complete solar potential analysis including battery sizing, "
                            "installer quotes, subsidy check, and 30-min consultation with Hendrik."
                        ),
                    },
                    "unit_amount": 50000,  # €500.00 in cents
                },
                "quantity": 1,
            }],
            mode="payment",
            customer_email=client_email or None,
            success_url=f"https://hendrikdekeyzer.github.io/hendrik-cto/consultancy?success=1&report={report_id}",
            cancel_url=f"https://hendrikdekeyzer.github.io/hendrik-cto/consultancy?cancelled=1&report={report_id}",
            metadata={"report_id": report_id, "client_email": client_email},
        )
    except stripe.StripeError as e:
        logger.error(f"Stripe error: {e}")
        raise HTTPException(status_code=502, detail=f"Payment error: {e.user_message}")

    return {"checkout_url": session.url}


@app.post("/api/webhook")
async def stripe_webhook(request: Request):
    """
    Stripe webhook handler.
    On successful payment: generate + email full (unlocked) report.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except stripe.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        metadata = session.get("metadata", {})
        report_id = metadata.get("report_id", "UNKNOWN")
        client_email = metadata.get("client_email") or session.get("customer_email", "")

        logger.info(f"Payment completed for report {report_id}, email: {client_email}")

        # In a real system we'd fetch the original form data from a DB.
        # For now, notify Hendrik to generate the full report manually.
        smtp_configured = bool(os.getenv("SMTP_USER") and os.getenv("SMTP_PASS"))
        if smtp_configured and client_email:
            try:
                notify_hendrik(
                    client_name=client_email.split("@")[0],
                    client_email=client_email,
                    address="(see original report)",
                    annual_savings=0,
                    system_kw=0,
                    report_id=report_id,
                    paid=True,
                )
            except Exception as e:
                logger.warning(f"Webhook notification email failed: {e}")

    return {"received": True}


@app.get("/api/report/{report_id}/pdf")
async def download_preview_pdf(report_id: str):
    """
    Demo endpoint: returns a sample preview PDF.
    In production, PDFs would be stored in S3/R2 and retrieved here.
    """
    # Demo data
    pvwatts_demo = {
        "annual_kwh": 4200.0,
        "monthly_kwh": [180, 220, 340, 420, 490, 510, 500, 460, 370, 280, 190, 160],
        "capacity_factor_pct": 11.5,
        "station_info": {},
        "raw_outputs": {},
    }
    savings_demo = {
        "self_consumed_kwh": 1680.0,
        "exported_kwh": 2520.0,
        "savings_self_eur": 504.0,
        "savings_export_eur": 201.6,
        "total_annual_savings_eur": 705.6,
    }

    pdf = generate_proposal_pdf(
        client_name="Demo Client",
        client_email="demo@example.com",
        address="1234AB, Netherlands",
        roof_area_m2=40.0,
        annual_consumption_kwh=3500.0,
        system_capacity_kw=6.0,
        pvwatts=pvwatts_demo,
        savings=savings_demo,
        report_id=report_id,
        is_preview=True,
    )

    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="preview-{report_id}.pdf"'},
    )
