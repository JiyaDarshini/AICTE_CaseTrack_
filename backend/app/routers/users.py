from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.database import get_db
from app.models import User, BureauCell, SLAConfig, AuditLog
from app.schemas import UserResponse, UserApprovalUpdate, BureauCellResponse, SLAConfigResponse, SLAConfigCreate
from app.services.auth_service import get_current_user, require_roles
from app.services.audit_service import create_audit_log

router = APIRouter(tags=["User & System Administration"])


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    pending_only: bool = Query(False),
    current_user: User = Depends(require_roles(["Admin", "Senior Manager"])),
    db: AsyncSession = Depends(get_db)
):
    query = select(User)
    if pending_only:
        query = query.where(User.is_approved == False)
    query = query.order_by(desc(User.created_at))
    res = await db.execute(query)
    return res.scalars().all()


@router.patch("/users/{id}", response_model=UserResponse)
async def update_user(
    id: UUID,
    req: UserApprovalUpdate,
    request: Request,
    current_user: User = Depends(require_roles(["Admin"])),
    db: AsyncSession = Depends(get_db)
):
    user = await db.get(User, id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    old_values = {
        "is_approved": user.is_approved,
        "role": user.role,
        "bureau_cell_id": str(user.bureau_cell_id) if user.bureau_cell_id else None,
        "region": user.region
    }

    user.is_approved = req.is_approved
    if req.role:
        user.role = req.role
    if req.bureau_cell_id is not None:
        user.bureau_cell_id = req.bureau_cell_id
    if req.region is not None:
        user.region = req.region

    await create_audit_log(
        db=db,
        user=current_user,
        entity="User",
        entity_id=str(user.id),
        action="User Approval/Role Update",
        old_value=old_values,
        new_value={"is_approved": user.is_approved, "role": user.role, "region": user.region},
        ip=request.client.host if request.client else None
    )

    await db.commit()
    await db.refresh(user)
    return user


@router.get("/bureaus", response_model=List[BureauCellResponse])
async def list_bureaus(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(BureauCell).order_by(BureauCell.code))
    return res.scalars().all()


@router.get("/sla-configs", response_model=List[SLAConfigResponse])
async def list_sla_configs(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SLAConfig).order_by(SLAConfig.category))
    return res.scalars().all()


@router.post("/sla-configs", response_model=SLAConfigResponse)
async def create_or_update_sla_config(
    req: SLAConfigCreate,
    current_user: User = Depends(require_roles(["Admin"])),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(SLAConfig).where(SLAConfig.category == req.category.strip()))
    config = res.scalar_one_or_none()

    if config:
        config.sla_days = req.sla_days
        config.warn_before_days = req.warn_before_days
    else:
        config = SLAConfig(
            category=req.category.strip(),
            sla_days=req.sla_days,
            warn_before_days=req.warn_before_days
        )
        db.add(config)

    await db.commit()
    await db.refresh(config)
    return config
