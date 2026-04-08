"""
Simple email sender using SMTP (works with Gmail App Passwords).
Sends PDF reports to clients and lead notifications to Hendrik.
"""

import os
import smtplib
import ssl
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


def send_report_email(
    *,
    to_email: str,
    to_name: str,
    pdf_bytes: bytes,
    report_id: str,
    annual_savings: float,
    is_preview: bool = True,
):
    """Send the PDF report to the client."""
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")
    from_name = "Hendrik De Keyzer Energy"

    subject = (
        f"Your Solar Potential Report — €{annual_savings:,.0f}/yr estimated savings"
        if not is_preview
        else f"Your Solar Preview Report — €{annual_savings:,.0f}/yr potential"
    )

    body_html = f"""
    <html><body style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2E7D32; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">☀️ Your Solar Report</h1>
      </div>
      <div style="padding: 24px; background: #f9f9f9; border-radius: 0 0 8px 8px;">
        <p>Dear {to_name},</p>
        <p>Thank you for using Hendrik's solar consultancy tool. 
        {'Your preview report is attached — unlock the full analysis for €500.' if is_preview else 'Your full report is attached.'}</p>
        <h2 style="color: #2E7D32;">Estimated annual savings: €{annual_savings:,.0f}</h2>
        {'<p><a href="https://hendrikdekeyzer.github.io/hendrik-cto/consultancy?report=' + report_id + '" style="background:#F9A825;color:#1A1A2E;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:bold;">🔒 Unlock Full Report — €500</a></p>' if is_preview else '<p>Your full report is ready. Hendrik will follow up within 24 hours.</p>'}
        <hr>
        <p style="color: #757575; font-size: 12px;">Report ID: {report_id}<br>
        Questions? Reply to this email or call Hendrik directly.</p>
      </div>
    </body></html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{from_name} <{smtp_user}>"
    msg["To"] = f"{to_name} <{to_email}>"

    msg.attach(MIMEText(body_html, "html"))

    # Attach PDF
    pdf_attachment = MIMEApplication(pdf_bytes, _subtype="pdf")
    pdf_attachment.add_header(
        "Content-Disposition",
        "attachment",
        filename=f"solar-report-{report_id}.pdf",
    )
    msg.attach(pdf_attachment)

    context = ssl.create_default_context()
    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.ehlo()
        server.starttls(context=context)
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_user, [to_email], msg.as_string())


def notify_hendrik(
    *,
    client_name: str,
    client_email: str,
    address: str,
    annual_savings: float,
    system_kw: float,
    report_id: str,
    paid: bool = False,
):
    """Send a lead notification to Hendrik."""
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")
    hendrik_email = os.getenv("HENDRIK_EMAIL", smtp_user)

    subject = f"{'💰 PAID LEAD' if paid else '🌱 New lead'}: {client_name} — {address}"

    body = f"""
New {'paid' if paid else 'preview'} report generated.

Client: {client_name} <{client_email}>
Address: {address}
System size: {system_kw:.1f} kWp
Est. savings: €{annual_savings:,.0f}/yr
Report ID: {report_id}
Paid: {'YES ✅' if paid else 'No (preview only)'}

{'Action required: Follow up within 24 hours!' if paid else 'No action needed yet — they may upgrade.'}
    """

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = smtp_user
    msg["To"] = hendrik_email

    context = ssl.create_default_context()
    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.ehlo()
        server.starttls(context=context)
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_user, [hendrik_email], msg.as_string())
