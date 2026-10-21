from typing import Optional, Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import AuditLog, User
import logging

logger = logging.getLogger(__name__)


async def create_audit_log(
    db: AsyncSession,
    user: Optional[User],
    entity: str,
    entity_id: str,
    action: str,
    old_value: Optional[Dict[str, Any]] = None,
    new_value: Optional[Dict[str, Any]] = None,
    ip: Optional[str] = None
) -> AuditLog:
    """
    Append-only immutable audit trail record.
    Never deleted or updated.
    """
    log_entry = AuditLog(
        user_id=user.id if user else None,
        user_email=user.email if user else "system",
        role=user.role if user else "System",
        entity=entity,
        entity_id=str(entity_id),
        action=action,
        old_value=old_value,
        new_value=new_value,
        ip=ip
    )
    db.add(log_entry)
    await db.flush()
    return log_entry
