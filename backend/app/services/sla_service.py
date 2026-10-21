from datetime import datetime, timezone, timedelta
from typing import List, Optional
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from app.models import Case, Notification, User, SLAConfig, CaseAction, AuditLog
from app.config import settings

logger = logging.getLogger(__name__)


async def send_notification(
    db: AsyncSession,
    user_id: str,
    notif_type: str,
    title: str,
    body: str,
    case_id: Optional[str] = None
) -> Notification:
    """Creates in-app notification and sends email (or logs if SMTP not configured)"""
    notif = Notification(
        user_id=user_id,
        type=notif_type,
        title=title,
        body=body,
        case_id=case_id,
        is_read=False
    )
    db.add(notif)
    await db.flush()

    # Email notification fallback
    if settings.SMTP_HOST and settings.SMTP_USER:
        try:
            import aiosmtplib
            from email.message import EmailMessage
            msg = EmailMessage()
            msg["From"] = settings.SMTP_FROM
            msg["Subject"] = f"[AICTE CaseTrack] {title}"
            msg.set_content(body)
            # Find user email
            user_res = await db.execute(select(User).where(User.id == user_id))
            user = user_res.scalar_one_or_none()
            if user and user.email:
                msg["To"] = user.email
                await aiosmtplib.send(
                    msg,
                    hostname=settings.SMTP_HOST,
                    port=settings.SMTP_PORT,
                    username=settings.SMTP_USER,
                    password=settings.SMTP_PASSWORD,
                    use_tls=False,
                    start_tls=True
                )
        except Exception as e:
            logger.warning(f"Failed to send email notification: {e}")
    else:
        logger.info(f"[CONSOLE EMAIL NOTIFICATION] To: User({user_id}) | Subject: {title} | Body: {body}")

    return notif


async def check_sla_and_generate_alerts(db: AsyncSession) -> dict:
    """
    Scans all open cases against expected_disposal_date.
    Triggers:
    1. Warning at warn_before_days before due date
    2. Breach on expected_disposal_date
    3. Overdue reminder every 7 days
    4. Auto-escalate to Senior Manager if overdue > 14 days
    """
    now = datetime.now(timezone.utc)
    results = {"warnings": 0, "breaches": 0, "escalations": 0}

    # Fetch default SLA configs
    sla_configs_res = await db.execute(select(SLAConfig))
    sla_configs = {c.category: c for c in sla_configs_res.scalars().all()}

    # Fetch open cases
    stmt = (
        select(Case)
        .where(
            and_(
                Case.status.in_(["Pending", "Under Process", "Transferred"]),
                Case.is_deleted == False
            )
        )
    )
    res = await db.execute(stmt)
    cases = res.scalars().all()

    # Find Senior Manager users for auto-escalations
    senior_mgrs_res = await db.execute(select(User).where(User.role == "Senior Manager", User.is_active == True))
    senior_mgrs = senior_mgrs_res.scalars().all()

    for c in cases:
        if not c.expected_disposal_date:
            continue

        category_config = sla_configs.get(c.category)
        warn_days = category_config.warn_before_days if category_config else 5

        time_to_due = (c.expected_disposal_date - now).total_seconds() / 86400.0

        # Case 1: Warning window (0 < days_remaining <= warn_days)
        if 0 < time_to_due <= warn_days:
            # Check if warning already sent in last 24h
            existing_warn = await db.execute(
                select(Notification).where(
                    and_(
                        Notification.case_id == c.id,
                        Notification.type == "SLA_WARNING",
                        Notification.created_at >= now - timedelta(days=1)
                    )
                )
            )
            if not existing_warn.scalar_one_or_none():
                recipients = []
                if c.assigned_officer_id:
                    recipients.append(str(c.assigned_officer_id))
                # Send to bureau users
                if c.current_bureau_id:
                    b_users = await db.execute(select(User).where(User.bureau_cell_id == c.current_bureau_id))
                    for u in b_users.scalars().all():
                        if str(u.id) not in recipients:
                            recipients.append(str(u.id))

                for uid in recipients:
                    await send_notification(
                        db=db,
                        user_id=uid,
                        notif_type="SLA_WARNING",
                        title=f"SLA Warning: Case {c.case_number}",
                        body=f"Case '{c.title}' is due in {int(time_to_due)} days (expected: {c.expected_disposal_date.strftime('%Y-%m-%d')}). Please take required action.",
                        case_id=c.id
                    )
                results["warnings"] += 1

        # Case 2: Breach (time_to_due <= 0)
        elif time_to_due <= 0:
            overdue_days = abs(int(time_to_due))
            # Check if breach alert sent in last 7 days
            existing_breach = await db.execute(
                select(Notification).where(
                    and_(
                        Notification.case_id == c.id,
                        Notification.type == "SLA_BREACH",
                        Notification.created_at >= now - timedelta(days=7)
                    )
                )
            )
            if not existing_breach.scalar_one_or_none():
                recipients = []
                if c.assigned_officer_id:
                    recipients.append(str(c.assigned_officer_id))
                if c.current_bureau_id:
                    b_users = await db.execute(select(User).where(User.bureau_cell_id == c.current_bureau_id))
                    for u in b_users.scalars().all():
                        if str(u.id) not in recipients:
                            recipients.append(str(u.id))

                for uid in recipients:
                    await send_notification(
                        db=db,
                        user_id=uid,
                        notif_type="SLA_BREACH",
                        title=f"SLA Breach Alert: Case {c.case_number} Overdue",
                        body=f"Case '{c.title}' is {overdue_days} days overdue. Immediate action required.",
                        case_id=c.id
                    )
                results["breaches"] += 1

            # Auto-escalation to Senior Manager if overdue > 14 days and not already escalated
            if overdue_days > 14 and c.status != "Escalated":
                c.status = "Escalated"
                c.last_action = "Auto-Escalated due to SLA breach exceeding 14 days"
                c.last_action_date = now

                action = CaseAction(
                    case_id=c.id,
                    bureau_id=c.current_bureau_id,
                    action_type="Escalation",
                    remarks=f"System auto-escalated case due to SLA breach exceeding 14 days ({overdue_days} days overdue)."
                )
                db.add(action)

                for mgr in senior_mgrs:
                    await send_notification(
                        db=db,
                        user_id=str(mgr.id),
                        notif_type="ESCALATION",
                        title=f"Auto-Escalation: Case {c.case_number}",
                        body=f"Case {c.case_number} ({c.title}) has been escalated to Senior Management due to being {overdue_days} days overdue.",
                        case_id=c.id
                    )
                results["escalations"] += 1

    await db.commit()
    return results
