"""
Email Service — sends HTML ticket confirmation emails.
Set EMAIL_HOST in .env to send real emails.
Without it, tickets are printed to stdout (dev mode).
"""
import os, smtplib, ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime

EMAIL_HOST     = os.environ.get("EMAIL_HOST", "")
EMAIL_PORT     = int(os.environ.get("EMAIL_PORT", "587"))
EMAIL_USER     = os.environ.get("EMAIL_USER", "")
EMAIL_PASSWORD = os.environ.get("EMAIL_PASSWORD", "")
EMAIL_FROM     = os.environ.get("EMAIL_FROM", "EventHub <noreply@eventhub.in>")


def send_ticket_email(to_email, user_name, booking_id, event_title,
                      event_date, venue, seats, total_amount,
                      is_group=False, group_id=None):
    date_str  = event_date.strftime("%A, %B %d %Y · %I:%M %p") if event_date else "TBD"
    seat_pills = "".join(
        f'<span style="display:inline-block;background:#f59e0b;color:#1c1917;'
        f'font-family:monospace;font-weight:700;padding:4px 10px;border-radius:6px;margin:3px;">{s}</span>'
        for s in seats
    ) or '<span style="color:#9ca3af;">Seats assigned to group</span>'

    group_row = (
        '<tr><td style="padding:8px 0;color:#9ca3af;font-size:13px;">Booking Type</td>'
        '<td style="padding:8px 0;font-weight:600;color:#a78bfa;">Group Booking</td></tr>'
    ) if is_group else ""

    html = f"""<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0c0a09;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0c0a09;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0"
       style="background:#1c1917;border-radius:16px;overflow:hidden;border:1px solid #292524;">
<tr><td style="background:linear-gradient(135deg,#d97706,#f59e0b);padding:32px 40px;text-align:center;">
  <div style="font-size:28px;font-weight:700;color:#1c1917;">🎟 EventHub</div>
  <div style="font-size:14px;color:#451a03;margin-top:4px;">Your Ticket Confirmation</div>
</td></tr>
<tr><td style="padding:32px 40px 0;">
  <p style="color:#e7e5e4;font-size:16px;margin:0;">Hi <strong style="color:#f59e0b;">{user_name}</strong> 👋</p>
  <p style="color:#a8a29e;font-size:14px;margin:8px 0 0;">Your booking is confirmed! See you there.</p>
</td></tr>
<tr><td style="padding:24px 40px;">
  <div style="background:#292524;border-radius:12px;padding:24px;border:1px solid #44403c;">
    <div style="font-size:20px;font-weight:700;color:#fafaf9;margin-bottom:4px;">{event_title}</div>
    <div style="color:#f59e0b;font-size:13px;margin-bottom:16px;">📍 {venue}</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:8px 0;color:#9ca3af;font-size:13px;">Date &amp; Time</td>
          <td style="padding:8px 0;font-weight:600;color:#e7e5e4;">{date_str}</td></tr>
      <tr><td style="padding:8px 0;color:#9ca3af;font-size:13px;">Booking ID</td>
          <td style="padding:8px 0;font-family:monospace;color:#f59e0b;font-weight:700;">#{booking_id[:8].upper()}</td></tr>
      {group_row}
      <tr><td style="padding:8px 0;color:#9ca3af;font-size:13px;">Total Paid</td>
          <td style="padding:8px 0;font-weight:700;color:#34d399;font-size:16px;">₹{total_amount:,.2f}</td></tr>
    </table>
    <div style="margin-top:16px;border-top:1px solid #44403c;padding-top:16px;">
      <div style="color:#9ca3af;font-size:12px;margin-bottom:8px;text-transform:uppercase;">Your Seats</div>
      <div>{seat_pills}</div>
    </div>
  </div>
</td></tr>
<tr><td style="padding:0 40px 32px;">
  <div style="background:#1c1917;border:1px solid #44403c;border-radius:10px;padding:16px;">
    <div style="color:#78716c;font-size:12px;">
      📌 Please arrive 30 minutes before the event<br/>
      📵 Keep this email as your ticket confirmation<br/>
      🔒 Non-transferable — booked under {user_name}
    </div>
  </div>
</td></tr>
<tr><td style="background:#0c0a09;padding:20px 40px;text-align:center;border-top:1px solid #292524;">
  <div style="color:#57534e;font-size:12px;">EventHub · Bengaluru, India</div>
</td></tr>
</table></td></tr></table></body></html>"""

    if not EMAIL_HOST:
        print(f"\n{'='*60}\n📧  [EMAIL — dev mode]\n  To: {to_email}\n  Subject: Your ticket for {event_title}")
        print(f"  Booking: #{booking_id[:8].upper()}  |  Seats: {', '.join(seats) if seats else 'group seats'}")
        print(f"  Total: ₹{total_amount:,.2f}\n{'='*60}\n")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"🎟 Your ticket for {event_title}"
        msg["From"]    = EMAIL_FROM
        msg["To"]      = to_email
        msg.attach(MIMEText(f"Booking confirmed! {event_title} on {date_str}. ID: #{booking_id[:8].upper()}", "plain"))
        msg.attach(MIMEText(html, "html"))
        ctx = ssl.create_default_context()
        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as s:
            s.ehlo(); s.starttls(context=ctx); s.login(EMAIL_USER, EMAIL_PASSWORD)
            s.sendmail(EMAIL_FROM, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"[email] failed: {e}")
        return False
