from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import OverlapGroup, OverlapMember, Case, Institution, BureauCell, CaseAction, User
from app.schemas import OverlapGroupResponse, OverlapMemberResponse, OverlapReviewRequest
from app.services.auth_service import get_current_user, require_roles
from app.services.audit_service import create_audit_log
from app.cache import ensure_utc, dashboard_cache

router = APIRouter(prefix="/overlaps", tags=["Overlap Detection"])


@router.get("", response_model=List[OverlapGroupResponse])
async def list_overlaps(
    status_filter: Optional[str] = Query(None, alias="status"),
    severity_filter: Optional[str] = Query(None, alias="severity"),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(OverlapGroup)
        .join(Institution, OverlapGroup.institution_id == Institution.id)
        .options(
            selectinload(OverlapGroup.institution),
            selectinload(OverlapGroup.members).selectinload(OverlapMember.case).selectinload(Case.current_bureau)
        )
    )

    if current_user.role == "Regional Office" and current_user.region:
        query = query.where(Institution.region == current_user.region)

    if status_filter:
        query = query.where(OverlapGroup.status == status_filter)
    if severity_filter:
        query = query.where(OverlapGroup.severity == severity_filter)

    query = query.order_by(desc(OverlapGroup.score), desc(OverlapGroup.created_at)).limit(limit)
    res = await db.execute(query)
    groups = res.scalars().all()

    output = []
    for g in groups:
        inst = g.institution
        mem_items = []
        for mem in (g.members or []):
            c = mem.case
            bureau = c.current_bureau if c else None
            mem_items.append(OverlapMemberResponse(
                id=mem.id,
                case_id=c.id if c else mem.case_id,
                case_number=c.case_number if c else "",
                case_title=c.title if c else "",
                case_status=c.status if c else "",
                bureau_code=bureau.code if bureau else "Unknown",
                category=c.category if c else "",
                role=mem.role,
                similarity_score=mem.similarity_score
            ))

        output.append(OverlapGroupResponse(
            id=g.id,
            institution_id=g.institution_id,
            institution_name=inst.name if inst else "Unknown",
            aicte_permanent_id=inst.aicte_permanent_id if inst else "Unknown",
            score=g.score,
            rule_score=g.rule_score,
            semantic_score=g.semantic_score,
            severity=g.severity,
            status=g.status,
            explanation=g.explanation,
            rules_fired=g.rules_fired,
            dismiss_reason=g.dismiss_reason,
            created_at=ensure_utc(g.created_at),
            members=mem_items
        ))

    return output


@router.get("/{id}", response_model=OverlapGroupResponse)
async def get_overlap(id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(OverlapGroup)
        .where(OverlapGroup.id == id)
        .options(
            selectinload(OverlapGroup.institution),
            selectinload(OverlapGroup.members).selectinload(OverlapMember.case).selectinload(Case.current_bureau)
        )
    )
    g = res.scalar_one_or_none()
    if not g:
        raise HTTPException(status_code=404, detail="Overlap group not found")

    inst = g.institution
    if current_user.role == "Regional Office" and current_user.region and inst and inst.region != current_user.region:
        raise HTTPException(status_code=403, detail="Access denied for institutions outside your assigned region.")

    mem_items = []
    for mem in (g.members or []):
        c = mem.case
        bureau = c.current_bureau if c else None
        mem_items.append(OverlapMemberResponse(
            id=mem.id,
            case_id=c.id if c else mem.case_id,
            case_number=c.case_number if c else "",
            case_title=c.title if c else "",
            case_status=c.status if c else "",
            bureau_code=bureau.code if bureau else "Unknown",
            category=c.category if c else "",
            role=mem.role,
            similarity_score=mem.similarity_score
        ))

    return OverlapGroupResponse(
        id=g.id,
        institution_id=g.institution_id,
        institution_name=inst.name if inst else "Unknown",
        aicte_permanent_id=inst.aicte_permanent_id if inst else "Unknown",
        score=g.score,
        rule_score=g.rule_score,
        semantic_score=g.semantic_score,
        severity=g.severity,
        status=g.status,
        explanation=g.explanation,
        rules_fired=g.rules_fired,
        dismiss_reason=g.dismiss_reason,
        created_at=ensure_utc(g.created_at),
        members=mem_items
    )



@router.post("/{id}/link")
async def link_overlap(
    id: UUID,
    req: OverlapReviewRequest,
    request: Request,
    current_user: User = Depends(require_roles(["Admin", "Senior Manager", "PGRC", "RB"])),
    db: AsyncSession = Depends(get_db)
):
    g = await db.get(OverlapGroup, id)
    if not g:
        raise HTTPException(status_code=404, detail="Overlap group not found")

    old_status = g.status
    g.status = "Linked"
    g.updated_at = datetime.now(timezone.utc)

    # Add audit action to all member cases
    members_res = await db.execute(select(OverlapMember).where(OverlapMember.group_id == g.id))
    for m in members_res.scalars().all():
        c = await db.get(Case, m.case_id)
        if c:
            action = CaseAction(
                case_id=c.id,
                bureau_id=c.current_bureau_id,
                officer_id=current_user.id,
                action_type="Overlap Resolution: Link",
                remarks=f"Cases linked as related coordination cluster by {current_user.name} ({current_user.role}): {req.remarks}"
            )
            db.add(action)

    await create_audit_log(
        db=db,
        user=current_user,
        entity="OverlapGroup",
        entity_id=str(g.id),
        action="Overlap Linked",
        old_value={"status": old_status},
        new_value={"status": "Linked", "remarks": req.remarks},
        ip=request.client.host if request.client else None
    )

    await db.commit()
    return {"message": "Overlap cases linked successfully", "status": "Linked"}


@router.post("/{id}/merge")
async def merge_overlap(
    id: UUID,
    req: OverlapReviewRequest,
    request: Request,
    current_user: User = Depends(require_roles(["Admin", "Senior Manager", "PGRC", "RB"])),
    db: AsyncSession = Depends(get_db)
):
    g = await db.get(OverlapGroup, id)
    if not g:
        raise HTTPException(status_code=404, detail="Overlap group not found")

    if not req.primary_case_id:
        raise HTTPException(status_code=400, detail="primary_case_id is required to merge cases.")

    primary_case = await db.get(Case, req.primary_case_id)
    if not primary_case:
        raise HTTPException(status_code=404, detail="Primary case not found")

    old_status = g.status
    g.status = "Merged"
    g.updated_at = datetime.now(timezone.utc)

    # Process all members
    members_res = await db.execute(select(OverlapMember).where(OverlapMember.group_id == g.id))
    for m in members_res.scalars().all():
        c = await db.get(Case, m.case_id)
        if not c:
            continue
        if c.id == primary_case.id:
            m.role = "primary"
            action = CaseAction(
                case_id=c.id,
                bureau_id=c.current_bureau_id,
                officer_id=current_user.id,
                action_type="Overlap Resolution: Merge Primary",
                remarks=f"Designated as PRIMARY case for consolidated investigation: {req.remarks}"
            )
            db.add(action)
        else:
            m.role = "secondary"
            c.status = "Disposed"
            c.last_action = f"Merged into primary case {primary_case.case_number}"
            c.last_action_date = datetime.now(timezone.utc)
            c.merged_into_case_id = primary_case.id

            action = CaseAction(
                case_id=c.id,
                bureau_id=c.current_bureau_id,
                officer_id=current_user.id,
                action_type="Overlap Resolution: Merged Secondary",
                remarks=f"Merged into Case {primary_case.case_number} to prevent duplicate action. History preserved. Remarks: {req.remarks}"
            )
            db.add(action)

    await create_audit_log(
        db=db,
        user=current_user,
        entity="OverlapGroup",
        entity_id=str(g.id),
        action="Overlap Merged",
        old_value={"status": old_status},
        new_value={"status": "Merged", "primary_case_id": str(primary_case.id), "remarks": req.remarks},
        ip=request.client.host if request.client else None
    )

    await db.commit()
    return {"message": f"Cases merged successfully into Primary Case {primary_case.case_number}", "status": "Merged"}


@router.post("/{id}/dismiss")
async def dismiss_overlap(
    id: UUID,
    req: OverlapReviewRequest,
    request: Request,
    current_user: User = Depends(require_roles(["Admin", "Senior Manager", "PGRC", "RB"])),
    db: AsyncSession = Depends(get_db)
):
    if not req.remarks or len(req.remarks.strip()) < 5:
        raise HTTPException(status_code=400, detail="A mandatory justification reason (min 5 chars) is required to dismiss overlap.")

    g = await db.get(OverlapGroup, id)
    if not g:
        raise HTTPException(status_code=404, detail="Overlap group not found")

    old_status = g.status
    g.status = "Dismissed"
    g.dismiss_reason = req.remarks.strip()
    g.updated_at = datetime.now(timezone.utc)

    # Record action on each member
    members_res = await db.execute(select(OverlapMember).where(OverlapMember.group_id == g.id))
    for m in members_res.scalars().all():
        c = await db.get(Case, m.case_id)
        if c:
            action = CaseAction(
                case_id=c.id,
                bureau_id=c.current_bureau_id,
                officer_id=current_user.id,
                action_type="Overlap Resolution: Dismissed",
                remarks=f"Potential overlap reviewed and dismissed by {current_user.name} ({current_user.role}). Reason: {req.remarks}"
            )
            db.add(action)

    await create_audit_log(
        db=db,
        user=current_user,
        entity="OverlapGroup",
        entity_id=str(g.id),
        action="Overlap Dismissed",
        old_value={"status": old_status},
        new_value={"status": "Dismissed", "reason": req.remarks},
        ip=request.client.host if request.client else None
    )

    await db.commit()
    return {"message": "Overlap dismissed with audit log entry", "status": "Dismissed"}
