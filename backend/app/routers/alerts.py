from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from app.database import get_db
from app.models import Notification, User
from app.schemas import NotificationResponse
from app.services.auth_service import get_current_user
from app.services.sla_service import check_sla_and_generate_alerts

router = APIRouter(tags=["Alerts & Notifications"])


@router.get("/notifications", response_model=List[NotificationResponse])
async def list_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Notification).where(Notification.user_id == current_user.id)
    if unread_only:
        query = query.where(Notification.is_read == False)
    query = query.order_by(desc(Notification.created_at)).limit(limit)

    res = await db.execute(query)
    return res.scalars().all()


@router.patch("/notifications/{id}/read")
async def mark_notification_read(id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    notif = await db.get(Notification, id)
    if not notif or notif.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    await db.commit()
    return {"message": "Notification marked as read"}


@router.post("/notifications/read-all")
async def mark_all_notifications_read(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(Notification).where(Notification.user_id == current_user.id, Notification.is_read == False)
    )
    for n in res.scalars().all():
        n.is_read = True
    await db.commit()
    return {"message": "All notifications marked as read"}


@router.get("/alerts/sla")
async def trigger_sla_scan(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Triggers on-demand SLA scan and returns breach and warning counts"""
    results = await check_sla_and_generate_alerts(db)
    return {"message": "SLA check completed", "results": results}
