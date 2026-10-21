import asyncio
import logging
from celery import Celery
from celery.schedules import crontab
from app.config import settings

logger = logging.getLogger(__name__)

# Initialize Celery app
celery_app = Celery(
    "aicte_casetrack_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_always_eager=settings.CELERY_TASK_ALWAYS_EAGER,  # Runs synchronously if eager or local fallback
    task_default_retry_delay=60,
    task_max_retries=3,
    beat_schedule={
        "hourly-sla-scan": {
            "task": "app.worker.scan_sla_and_alerts",
            "schedule": crontab(minute=0),  # Every hour on the hour
        },
        "daily-pending-reminder-digest": {
            "task": "app.worker.daily_pending_reminder_digest",
            "schedule": crontab(hour=8, minute=0),  # Daily at 08:00 AM IST
        }
    }
)


def run_async(coro):
    """Helper to run async SQLAlchemy calls inside synchronous Celery worker"""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    if loop.is_running():
        # In case we're nested
        import nest_asyncio
        nest_asyncio.apply()
    return loop.run_until_complete(coro)


@celery_app.task(bind=True, max_retries=3)
def scan_sla_and_alerts(self):
    """Hourly SLA monitoring & Auto-Escalation job"""
    logger.info("Executing Celery SLA Scan Job...")
    try:
        from app.database import AsyncSessionLocal
        from app.services.sla_service import check_sla_and_generate_alerts

        async def _exec():
            async with AsyncSessionLocal() as session:
                return await check_sla_and_generate_alerts(session)

        res = run_async(_exec())
        logger.info(f"SLA Scan completed: {res}")
        return res
    except Exception as exc:
        logger.error(f"Error in Celery SLA Scan: {exc}")
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@celery_app.task(bind=True, max_retries=3)
def daily_pending_reminder_digest(self):
    """Daily 08:00 AM IST pending-case reminder digest per bureau"""
    logger.info("Executing Daily Pending Case Digest...")
    try:
        from app.database import AsyncSessionLocal
        from sqlalchemy import select, func
        from app.models import Case, BureauCell, User, Notification

        async def _exec():
            async with AsyncSessionLocal() as session:
                bureaus = (await session.execute(select(BureauCell))).scalars().all()
                for b in bureaus:
                    count_res = await session.execute(
                        select(func.count(Case.id)).where(Case.current_bureau_id == b.id, Case.status.in_(["Pending", "Under Process"]))
                    )
                    count = count_res.scalar_one_or_none() or 0
                    if count > 0:
                        # Notify bureau users
                        users = (await session.execute(select(User).where(User.bureau_cell_id == b.id, User.is_active == True))).scalars().all()
                        for u in users:
                            notif = Notification(
                                user_id=u.id,
                                type="REMINDER",
                                title=f"Daily Digest: {b.code} Active Cases",
                                body=f"Your bureau currently has {count} open case(s) requiring active attention."
                            )
                            session.add(notif)
                await session.commit()

        run_async(_exec())
        return "Daily digest sent successfully"
    except Exception as exc:
        logger.error(f"Error in Daily Pending Digest: {exc}")
        raise self.retry(exc=exc, countdown=120)


@celery_app.task(bind=True, max_retries=3)
def detect_overlap_async(self, case_id: str):
    """Asynchronous overlap detection triggered on new case creation or update"""
    logger.info(f"Executing async overlap detection for case {case_id}")
    try:
        from app.database import AsyncSessionLocal
        from app.models import Case
        from app.services.overlap_service import detect_overlaps_for_case
        from uuid import UUID

        async def _exec():
            async with AsyncSessionLocal() as session:
                c = await session.get(Case, UUID(case_id))
                if c:
                    return await detect_overlaps_for_case(session, c)
                return None

        grp = run_async(_exec())
        return f"Overlap detection completed. Group: {grp.id if grp else None}"
    except Exception as exc:
        logger.error(f"Error in async overlap detection: {exc}")
        raise self.retry(exc=exc, countdown=30)
