"""
PDF report generator using ReportLab.
Produces a professional "Your Home Can Save €X/Year" proposal.
"""

import io
from datetime import date
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT


# Brand colours (Hendrik's energy consultancy)
GREEN = colors.HexColor("#2E7D32")
LIGHT_GREEN = colors.HexColor("#E8F5E9")
DARK = colors.HexColor("#1A1A2E")
ACCENT = colors.HexColor("#F9A825")
GRAY = colors.HexColor("#757575")
LIGHT_GRAY = colors.HexColor("#F5F5F5")


def generate_proposal_pdf(
    *,
    client_name: str,
    client_email: str,
    address: str,
    roof_area_m2: float,
    annual_consumption_kwh: float,
    system_capacity_kw: float,
    pvwatts: dict,
    savings: dict,
    report_id: str,
    is_preview: bool = True,
) -> bytes:
    """Generate a PDF proposal and return as bytes."""

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "HTitle",
        parent=styles["Title"],
        fontSize=26,
        textColor=GREEN,
        spaceAfter=4,
        fontName="Helvetica-Bold",
    )
    subtitle_style = ParagraphStyle(
        "HSubtitle",
        parent=styles["Normal"],
        fontSize=12,
        textColor=GRAY,
        spaceAfter=2,
        fontName="Helvetica",
    )
    section_heading = ParagraphStyle(
        "SectionHead",
        parent=styles["Heading2"],
        fontSize=14,
        textColor=GREEN,
        fontName="Helvetica-Bold",
        spaceBefore=14,
        spaceAfter=6,
    )
    body = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontSize=10,
        textColor=DARK,
        fontName="Helvetica",
        spaceAfter=4,
        leading=16,
    )
    big_number = ParagraphStyle(
        "BigNum",
        parent=styles["Normal"],
        fontSize=36,
        textColor=GREEN,
        fontName="Helvetica-Bold",
        alignment=TA_CENTER,
        spaceAfter=2,
    )
    big_label = ParagraphStyle(
        "BigLabel",
        parent=styles["Normal"],
        fontSize=11,
        textColor=GRAY,
        fontName="Helvetica",
        alignment=TA_CENTER,
        spaceAfter=8,
    )
    watermark_style = ParagraphStyle(
        "Watermark",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.red,
        fontName="Helvetica-Bold",
        alignment=TA_CENTER,
    )

    annual_savings = savings["total_annual_savings_eur"]
    annual_kwh = pvwatts["annual_kwh"]
    payback_years = round((system_capacity_kw * 1200) / annual_savings, 1) if annual_savings > 0 else "N/A"

    story = []

    # ── Header ──────────────────────────────────────────────────────────────
    story.append(Paragraph("☀️  Solar Potential Report", title_style))
    story.append(Paragraph(
        f"Prepared for: <b>{client_name}</b> · {address}",
        subtitle_style,
    ))
    story.append(Paragraph(
        f"Report ID: {report_id} · Generated: {date.today().strftime('%d %B %Y')}",
        subtitle_style,
    ))
    story.append(HRFlowable(width="100%", thickness=2, color=GREEN, spaceAfter=12))

    # ── Preview watermark ────────────────────────────────────────────────────
    if is_preview:
        story.append(Paragraph(
            "⚠️  PREVIEW — Full report unlocked after payment",
            watermark_style,
        ))
        story.append(Spacer(1, 6))

    # ── Hero savings number ──────────────────────────────────────────────────
    story.append(Paragraph(f"€{annual_savings:,.0f}", big_number))
    story.append(Paragraph("estimated annual savings with solar", big_label))

    # ── Key metrics table ────────────────────────────────────────────────────
    story.append(Paragraph("Your System at a Glance", section_heading))

    metrics = [
        ["Metric", "Value"],
        ["Roof area analysed", f"{roof_area_m2} m²"],
        ["Recommended system size", f"{system_capacity_kw:.1f} kWp"],
        ["Estimated annual production", f"{annual_kwh:,.0f} kWh"],
        ["Your annual consumption", f"{annual_consumption_kwh:,.0f} kWh"],
        ["Self-consumed solar", f"{savings['self_consumed_kwh']:,.0f} kWh/yr"],
        ["Exported to grid", f"{savings['exported_kwh']:,.0f} kWh/yr"],
        ["Savings on electricity bill", f"€{savings['savings_self_eur']:,.2f}/yr"],
        ["Feed-in revenue", f"€{savings['savings_export_eur']:,.2f}/yr"],
        ["Estimated payback period", f"{payback_years} years"],
    ]

    table = Table(metrics, colWidths=[95 * mm, 65 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), GREEN),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 11),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
        ("FONTSIZE", (0, 1), (-1, -1), 10),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E0E0E0")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(table)

    # ── Monthly production (preview shows 3 months only) ────────────────────
    story.append(Paragraph("Monthly Solar Production (kWh)", section_heading))

    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    monthly = pvwatts.get("monthly_kwh", [0] * 12)

    if is_preview:
        # Show only summer months as a teaser
        preview_months = list(zip(month_names[4:7], monthly[4:7]))
        monthly_data = [["Month", "Production (kWh)", ""]] + [
            [m, f"{v:.0f}", ""] for m, v in preview_months
        ] + [["...", "🔒 Full data in paid report", ""]]
    else:
        monthly_data = [["Month", "Production (kWh)"]] + [
            [m, f"{v:.0f}"] for m, v in zip(month_names, monthly)
        ]

    mtable = Table(monthly_data, colWidths=[40 * mm, 60 * mm] + ([60 * mm] if is_preview else []))
    mtable.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), GREEN),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E0E0E0")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(mtable)

    # ── What's in the full report ────────────────────────────────────────────
    if is_preview:
        story.append(Paragraph("What's in the Full Report", section_heading))
        full_report_items = [
            "✅  Complete 12-month production breakdown",
            "✅  Battery storage recommendation & sizing",
            "✅  EV charging integration analysis",
            "✅  Grid feed-in optimisation strategy",
            "✅  3 installer quotes (certified NL installers)",
            "✅  SDE++ subsidy eligibility check",
            "✅  Net metering vs. saldering transition planning",
            "✅  10-year financial model with IRR/NPV",
            "✅  Personalised installation timeline",
        ]
        for item in full_report_items:
            story.append(Paragraph(item, body))

        story.append(Spacer(1, 12))
        story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceAfter=8))
        story.append(Paragraph(
            "🔒  <b>Unlock your full report for €500</b> — includes a 30-minute consultation with Hendrik.",
            ParagraphStyle("CTA", parent=body, fontSize=12, textColor=DARK,
                           fontName="Helvetica-Bold", alignment=TA_CENTER),
        ))

    # ── Footer ───────────────────────────────────────────────────────────────
    story.append(Spacer(1, 16))
    story.append(HRFlowable(width="100%", thickness=1, color=GRAY))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "Hendrik De Keyzer Energy Consultancy · hendrik@dekeyzer.energy · dekeyzer.energy",
        ParagraphStyle("Footer", parent=body, fontSize=8, textColor=GRAY, alignment=TA_CENTER),
    ))
    story.append(Paragraph(
        "This report is based on NREL PVWatts v8 modelling data. Actual results may vary. "
        "Report is confidential and prepared exclusively for the named recipient.",
        ParagraphStyle("FooterSmall", parent=body, fontSize=7, textColor=GRAY, alignment=TA_CENTER),
    ))

    doc.build(story)
    return buffer.getvalue()
