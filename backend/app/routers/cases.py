from datetime import datetime, timezone, timedelta
from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import Case, CaseAction, Institution, BureauCell, User, OverlapGroup, OverlapMember
from app.schemas import (
    CaseResponse, CaseDetailResponse, CaseCreate, CaseStatusUpdate,
    CaseActionCreate, CaseActionResponse, CaseTransferRequest, CaseEscalateRequest
)
from app.services.auth_service import get_current_user, require_roles
from app.services.audit_service import create_audit_log
from app.services.overlap_service import detect_overlaps_for_case
from app.config import settings
import random

router = APIRouter(prefix="/cases", tags=["Cases"])


@router.get("", response_model=List[CaseResponse])
async def list_cases(
    institution_name: Optional[str] = Query(None),
    aicte_permanent_id: Optional[str] = Query(None),
    case_number: Optional[str] = Query(None),
    bureau_code: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    case_status: Optional[str] = Query(None, alias="status"),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    cursor: Optional[datetime] = Query(None),
    limit: int = Query(25, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(Case)
        .join(Institution, Case.institution_id == Institution.id)
        .outerjoin(BureauCell, Case.current_bureau_id == BureauCell.id)
        .outerjoin(User, Case.assigned_officer_id == User.id)
        .where(Case.is_deleted == False)
    )

    # RBAC Scoping:
    if current_user.role == "Regional Office" and current_user.region:
        query = query.where(Institution.region == current_user.region)
    elif current_user.role == "PGRC":
        query = query.where(BureauCell.code == "PGRC")
    elif current_user.role == "RB":
        query = query.where(BureauCell.code == "RB")

    # Search filters
    if institution_name:
        query = query.where(Institution.name.ilike(f"%{institution_name.strip()}%"))
    if aicte_permanent_id:
        query = query.where(Institution.aicte_permanent_id.ilike(f"%{aicte_permanent_id.strip()}%"))
    if case_number:
        query = query.where(Case.case_number.ilike(f"%{case_number.strip()}%"))
    if bureau_code:
        query = query.where(BureauCell.code == bureau_code.upper())
    if region and current_user.role != "Regional Office":
        query = query.where(Institution.region.ilike(f"%{region.strip()}%"))
    if category:
        query = query.where(Case.category.ilike(f"%{category.strip()}%"))
    if case_status:
        query = query.where(Case.status == case_status)
    if start_date:
        query = query.where(Case.received_date >= start_date)
    if end_date:
        query = query.where(Case.received_date <= end_date)

    # Keyset cursor pagination on received_date
    if cursor:
        query = query.where(Case.received_date < cursor)

    query = query.order_by(desc(Case.received_date)).limit(limit)
    res = await db.execute(query)
    cases = res.scalars().all()

    now = datetime.now(timezone.utc)
    output = []
    for c in cases:
        inst = await db.get(Institution, c.institution_id)
        bureau = await db.get(BureauCell, c.current_bureau_id) if c.current_bureau_id else None
        officer = await db.get(User, c.assigned_officer_id) if c.assigned_officer_id else None

        # Check overdue
        is_overdue = False
        days_rem = None
        if c.expected_disposal_date and c.status not in ["Disposed"]:
            delta = (c.expected_disposal_date - now).total_seconds() / 86400.0
            days_rem = int(delta)
            if delta < 0:
                is_overdue = True

        # Check active overlaps
        overlap_cnt_res = await db.execute(
            select(func.count(OverlapMember.id))
            .join(OverlapGroup, OverlapMember.group_id == OverlapGroup.id)
            .where(OverlapMember.case_id == c.id, OverlapGroup.status == "Open")
        )
        overlap_cnt = overlap_cnt_res.scalar_one_or_none() or 0

        output.append(CaseResponse(
            id=c.id,
            case_number=c.case_number,
            institution_id=c.institution_id,
            institution_name=inst.name if inst else "Unknown",
            aicte_permanent_id=inst.aicte_permanent_id if inst else "Unknown",
            institution_region=inst.region if inst else None,
            category=c.category,
            title=c.title,
            description=c.description,
            complainant_type=c.complainant_type,
            received_date=c.received_date,
            status=c.status,
            current_bureau_id=c.current_bureau_id,
            current_bureau_code=bureau.code if bureau else None,
            assigned_officer_id=c.assigned_officer_id,
            assigned_officer_name=officer.name if officer else None,
            last_action=c.last_action,
            next_action=c.next_action,
            last_action_date=c.last_action_date,
            expected_disposal_date=c.expected_disposal_date,
            sla_days=c.sla_days,
            source=c.source,
            is_overdue=is_overdue,
            days_remaining=days_rem,
            overlap_count=overlap_cnt,
            created_at=c.created_at,
            updated_at=c.updated_at
        ))

    return output


@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(
    req: CaseCreate,
    request: Request,
    current_user: User = Depends(require_roles(["Admin", "PGRC", "RB", "Regional Office"])),
    db: AsyncSession = Depends(get_db)
):
    # Lookup institution strictly by AICTE Permanent ID
    norm_id = req.aicte_permanent_id.strip().upper()
    inst_res = await db.execute(select(Institution).where(Institution.aicte_permanent_id == norm_id, Institution.is_deleted == False))
    institution = inst_res.scalar_one_or_none()
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No institution found with exact AICTE Permanent ID: {norm_id}"
        )

    # Regional Office role check: can only create case for institutions in their region
    if current_user.role == "Regional Office" and current_user.region and institution.region != current_user.region:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Regional Office users can only create cases for institutions in their region ({current_user.region})."
        )

    bureau = None
    if req.current_bureau_code:
        b_res = await db.execute(select(BureauCell).where(BureauCell.code == req.current_bureau_code.upper()))
        bureau = b_res.scalar_one_or_none()
    elif current_user.bureau_cell_id:
        bureau = await db.get(BureauCell, current_user.bureau_cell_id)

    case_number = req.case_number or f"AICTE-{datetime.now().strftime('%Y%m')}-{random.randint(10000, 99999)}"
    received_date = req.received_date or datetime.now(timezone.utc)
    expected_disposal = received_date + timedelta(days=req.sla_days or 30)

    new_case = Case(
        case_number=case_number,
        institution_id=institution.id,
        category=req.category,
        title=req.title.strip(),
        description=req.description.strip(),
        complainant_type=req.complainant_type,
        complainant_name=req.complainant_name,
        received_date=received_date,
        status="Pending",
        current_bureau_id=bureau.id if bureau else None,
        assigned_officer_id=current_user.id,
        last_action="Case registered",
        next_action="Initial Review & Verification",
        last_action_date=datetime.now(timezone.utc),
        expected_disposal_date=expected_disposal,
        sla_days=req.sla_days or 30,
        source=req.source or "Portal Direct Intake"
    )
    db.add(new_case)
    await db.flush()

    action = CaseAction(
        case_id=new_case.id,
        bureau_id=bureau.id if bureau else None,
        officer_id=current_user.id,
        action_type="Registration",
        remarks="Case lodged and registered into AICTE CaseTrack."
    )
    db.add(action)

    # Run Overlap Detection Engine
    overlap_grp = await detect_overlaps_for_case(db, new_case)
    if overlap_grp:
        await create_audit_log(
            db=db,
            user=current_user,
            entity="Case",
            entity_id=str(new_case.id),
            action="Overlap Detected",
            new_value={"overlap_group_id": str(overlap_grp.id), "score": overlap_grp.score, "severity": overlap_grp.severity},
            ip=request.client.host if request.client else None
        )
    else:
        await create_audit_log(
            db=db,
            user=current_user,
            entity="Case",
            entity_id=str(new_case.id),
            action="No Overlap Found",
            new_value={"status": "Normal Case Processing"},
            ip=request.client.host if request.client else None
        )

    await db.commit()
    await db.refresh(new_case)

    return CaseResponse(
        id=new_case.id,
        case_number=new_case.case_number,
        institution_id=new_case.institution_id,
        institution_name=institution.name,
        aicte_permanent_id=institution.aicte_permanent_id,
        institution_region=institution.region,
        category=new_case.category,
        title=new_case.title,
        description=new_case.description,
        complainant_type=new_case.complainant_type,
        received_date=new_case.received_date,
        status=new_case.status,
        current_bureau_id=new_case.current_bureau_id,
        current_bureau_code=bureau.code if bureau else None,
        assigned_officer_id=new_case.assigned_officer_id,
        assigned_officer_name=current_user.name,
        last_action=new_case.last_action,
        next_action=new_case.next_action,
        last_action_date=new_case.last_action_date,
        expected_disposal_date=new_case.expected_disposal_date,
        sla_days=new_case.sla_days,
        source=new_case.source,
        is_overdue=False,
        days_remaining=new_case.sla_days,
        overlap_count=1 if overlap_grp else 0,
        created_at=new_case.created_at,
        updated_at=new_case.updated_at
    )


@router.get("/{id}", response_model=CaseDetailResponse)
async def get_case_detail(id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    case = await db.get(Case, id)
    if not case or case.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    institution = await db.get(Institution, case.institution_id)
    if current_user.role == "Regional Office" and current_user.region and institution.region != current_user.region:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied for cases outside your assigned region.")

    bureau = await db.get(BureauCell, case.current_bureau_id) if case.current_bureau_id else None
    if current_user.role == "PGRC" and (not bureau or bureau.code != "PGRC"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: PGRC officers can only view cases within PGRC cell.")
    if current_user.role == "RB" and (not bureau or bureau.code != "RB"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: RB officers can only view cases within Regulation Bureau.")
    officer = await db.get(User, case.assigned_officer_id) if case.assigned_officer_id else None

    # Fetch chronological timeline actions
    actions_res = await db.execute(
        select(CaseAction)
        .where(CaseAction.case_id == case.id)
        .order_by(desc(CaseAction.created_at))
    )
    raw_actions = actions_res.scalars().all()
    action_items = []
    for a in raw_actions:
        a_officer = await db.get(User, a.officer_id) if a.officer_id else None
        a_bureau = await db.get(BureauCell, a.bureau_id) if a.bureau_id else None
        from_b = await db.get(BureauCell, a.from_bureau_id) if a.from_bureau_id else None
        to_b = await db.get(BureauCell, a.to_bureau_id) if a.to_bureau_id else None

        action_items.append(CaseActionResponse(
            id=a.id,
            case_id=a.case_id,
            bureau_id=a.bureau_id,
            officer_id=a.officer_id,
            officer_name=a_officer.name if a_officer else None,
            bureau_code=a_bureau.code if a_bureau else None,
            from_bureau_code=from_b.code if from_b else None,
            to_bureau_code=to_b.code if to_b else None,
            action_type=a.action_type,
            remarks=a.remarks,
            document_url=a.document_url,
            created_at=a.created_at
        ))

    # Overlapping cases
    overlaps_res = await db.execute(
        select(OverlapGroup, OverlapMember)
        .join(OverlapMember, OverlapGroup.id == OverlapMember.group_id)
        .where(OverlapMember.case_id == case.id, OverlapGroup.status == "Open")
    )
    overlapping_items = []
    for og, om in overlaps_res.all():
        other_members_res = await db.execute(
            select(OverlapMember, Case)
            .join(Case, OverlapMember.case_id == Case.id)
            .where(OverlapMember.group_id == og.id, OverlapMember.case_id != case.id)
        )
        for other_om, other_case in other_members_res.all():
            other_bureau = await db.get(BureauCell, other_case.current_bureau_id) if other_case.current_bureau_id else None
            overlapping_items.append({
                "group_id": str(og.id),
                "case_id": str(other_case.id),
                "case_number": other_case.case_number,
                "title": other_case.title,
                "status": other_case.status,
                "bureau_code": other_bureau.code if other_bureau else "Unknown",
                "score": og.score,
                "severity": og.severity,
                "rules_fired": og.rules_fired,
                "explanation": og.explanation
            })

    now = datetime.now(timezone.utc)
    is_overdue = False
    days_rem = None
    if case.expected_disposal_date and case.status != "Disposed":
        delta = (case.expected_disposal_date - now).total_seconds() / 86400.0
        days_rem = int(delta)
        if delta < 0:
            is_overdue = True

    return CaseDetailResponse(
        id=case.id,
        case_number=case.case_number,
        institution_id=case.institution_id,
        institution_name=institution.name if institution else "Unknown",
        aicte_permanent_id=institution.aicte_permanent_id if institution else "Unknown",
        institution_region=institution.region if institution else None,
        category=case.category,
        title=case.title,
        description=case.description,
        complainant_type=case.complainant_type,
        received_date=case.received_date,
        status=case.status,
        current_bureau_id=case.current_bureau_id,
        current_bureau_code=bureau.code if bureau else None,
        assigned_officer_id=case.assigned_officer_id,
        assigned_officer_name=officer.name if officer else None,
        last_action=case.last_action,
        next_action=case.next_action,
        last_action_date=case.last_action_date,
        expected_disposal_date=case.expected_disposal_date,
        sla_days=case.sla_days,
        source=case.source,
        is_overdue=is_overdue,
        days_remaining=days_rem,
        overlap_count=len(overlapping_items),
        created_at=case.created_at,
        updated_at=case.updated_at,
        actions=action_items,
        overlapping_cases=overlapping_items
    )


@router.patch("/{id}/status")
async def update_case_status(
    id: UUID,
    req: CaseStatusUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    case = await db.get(Case, id)
    if not case or case.is_deleted:
        raise HTTPException(status_code=404, detail="Case not found")

    # RBAC check: PGRC own cell only, RB own bureau only, Regional Office cannot update status
    bureau = await db.get(BureauCell, case.current_bureau_id) if case.current_bureau_id else None
    if current_user.role == "PGRC" and (not bureau or bureau.code != "PGRC"):
        raise HTTPException(status_code=403, detail="PGRC officers can only update cases in their own cell.")
    if current_user.role == "RB" and (not bureau or bureau.code != "RB"):
        raise HTTPException(status_code=403, detail="RB officers can only update cases in their own bureau.")
    if current_user.role == "Regional Office":
        raise HTTPException(status_code=403, detail="Regional officers cannot update case status directly.")

    old_status = case.status
    case.status = req.status
    case.last_action = f"Status updated to {req.status}"
    case.last_action_date = datetime.now(timezone.utc)
    if req.next_action:
        case.next_action = req.next_action

    action = CaseAction(
        case_id=case.id,
        bureau_id=case.current_bureau_id,
        officer_id=current_user.id,
        action_type="Status Update",
        remarks=req.remarks
    )
    db.add(action)

    await create_audit_log(
        db=db,
        user=current_user,
        entity="Case",
        entity_id=str(case.id),
        action="Status Change",
        old_value={"status": old_status},
        new_value={"status": req.status, "remarks": req.remarks},
        ip=request.client.host if request.client else None
    )

    await db.commit()
    return {"message": "Status updated successfully", "status": case.status}


@router.post("/{id}/actions")
async def add_case_action(
    id: UUID,
    req: CaseActionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    case = await db.get(Case, id)
    if not case or case.is_deleted:
        raise HTTPException(status_code=404, detail="Case not found")

    bureau = await db.get(BureauCell, case.current_bureau_id) if case.current_bureau_id else None
    if current_user.role == "PGRC" and (not bureau or bureau.code != "PGRC"):
        raise HTTPException(status_code=403, detail="PGRC officers can only add actions to cases in their own cell.")
    if current_user.role == "RB" and (not bureau or bureau.code != "RB"):
        raise HTTPException(status_code=403, detail="RB officers can only add actions to cases in their own bureau.")
    if current_user.role == "Regional Office":
        raise HTTPException(status_code=403, detail="Regional officers cannot add case actions.")

    action = CaseAction(
        case_id=case.id,
        bureau_id=case.current_bureau_id,
        officer_id=current_user.id,
        action_type=req.action_type,
        remarks=req.remarks,
        document_url=req.document_url
    )
    db.add(action)
    case.last_action = req.remarks
    case.last_action_date = datetime.now(timezone.utc)
    await db.commit()

    return {"message": "Action added successfully", "action_id": str(action.id)}


@router.post("/{id}/transfer")
async def transfer_case(
    id: UUID,
    req: CaseTransferRequest,
    request: Request,
    current_user: User = Depends(require_roles(["Admin", "Senior Manager", "PGRC", "RB"])),
    db: AsyncSession = Depends(get_db)
):
    case = await db.get(Case, id)
    if not case or case.is_deleted:
        raise HTTPException(status_code=404, detail="Case not found")

    bureau = await db.get(BureauCell, case.current_bureau_id) if case.current_bureau_id else None
    if current_user.role == "PGRC" and (not bureau or bureau.code != "PGRC"):
        raise HTTPException(status_code=403, detail="PGRC officers can only transfer cases from their own cell.")
    if current_user.role == "RB" and (not bureau or bureau.code != "RB"):
        raise HTTPException(status_code=403, detail="RB officers can only transfer cases from their own bureau.")

    target_bureau_res = await db.execute(select(BureauCell).where(BureauCell.code == req.to_bureau_code.upper()))
    target_bureau = target_bureau_res.scalar_one_or_none()
    if not target_bureau:
        raise HTTPException(status_code=400, detail=f"Target bureau '{req.to_bureau_code}' not found")

    from_bureau_id = case.current_bureau_id
    case.current_bureau_id = target_bureau.id
    case.status = "Transferred"
    case.last_action = f"Transferred to {target_bureau.code}"
    case.last_action_date = datetime.now(timezone.utc)
    case.next_action = f"Acceptance & Processing by {target_bureau.code}"

    action = CaseAction(
        case_id=case.id,
        bureau_id=target_bureau.id,
        officer_id=current_user.id,
        action_type="Transfer",
        remarks=req.remarks,
        from_bureau_id=from_bureau_id,
        to_bureau_id=target_bureau.id
    )
    db.add(action)

    await create_audit_log(
        db=db,
        user=current_user,
        entity="Case",
        entity_id=str(case.id),
        action="Case Transfer",
        old_value={"bureau_id": str(from_bureau_id)},
        new_value={"bureau_id": str(target_bureau.id), "remarks": req.remarks},
        ip=request.client.host if request.client else None
    )

    await db.commit()
    return {"message": f"Case transferred to {target_bureau.code} successfully"}


@router.post("/{id}/escalate")
async def escalate_case(
    id: UUID,
    req: CaseEscalateRequest,
    request: Request,
    current_user: User = Depends(require_roles(["Admin", "Senior Manager", "PGRC", "RB", "Regional Office"])),
    db: AsyncSession = Depends(get_db)
):
    case = await db.get(Case, id)
    if not case or case.is_deleted:
        raise HTTPException(status_code=404, detail="Case not found")

    bureau = await db.get(BureauCell, case.current_bureau_id) if case.current_bureau_id else None
    inst = await db.get(Institution, case.institution_id)
    if current_user.role == "PGRC" and (not bureau or bureau.code != "PGRC"):
        raise HTTPException(status_code=403, detail="PGRC officers can only escalate cases in their own cell.")
    if current_user.role == "RB" and (not bureau or bureau.code != "RB"):
        raise HTTPException(status_code=403, detail="RB officers can only escalate cases in their own bureau.")
    if current_user.role == "Regional Office" and current_user.region and inst.region != current_user.region:
        raise HTTPException(status_code=403, detail="Regional officers can only escalate cases in their own region.")

    old_status = case.status
    case.status = "Escalated"
    case.last_action = "Escalated to Senior Management"
    case.last_action_date = datetime.now(timezone.utc)
    case.next_action = "Senior Management Review & Inter-Bureau Direction"

    action = CaseAction(
        case_id=case.id,
        bureau_id=case.current_bureau_id,
        officer_id=current_user.id,
        action_type="Escalation",
        remarks=f"{req.remarks} (Reason: {req.escalation_reason or 'Officer Escalation'})"
    )
    db.add(action)

    await create_audit_log(
        db=db,
        user=current_user,
        entity="Case",
        entity_id=str(case.id),
        action="Case Escalation",
        old_value={"status": old_status},
        new_value={"status": "Escalated", "reason": req.escalation_reason, "remarks": req.remarks},
        ip=request.client.host if request.client else None
    )

    await db.commit()
    return {"message": "Case escalated to Senior Management successfully"}


@router.get("/{id}/timeline", response_model=List[CaseActionResponse])
async def get_case_timeline(id: UUID, db: AsyncSession = Depends(get_db)):
    actions_res = await db.execute(
        select(CaseAction)
        .where(CaseAction.case_id == id)
        .order_by(desc(CaseAction.created_at))
    )
    raw_actions = actions_res.scalars().all()
    output = []
    for a in raw_actions:
        a_officer = await db.get(User, a.officer_id) if a.officer_id else None
        a_bureau = await db.get(BureauCell, a.bureau_id) if a.bureau_id else None
        from_b = await db.get(BureauCell, a.from_bureau_id) if a.from_bureau_id else None
        to_b = await db.get(BureauCell, a.to_bureau_id) if a.to_bureau_id else None

        output.append(CaseActionResponse(
            id=a.id,
            case_id=a.case_id,
            bureau_id=a.bureau_id,
            officer_id=a.officer_id,
            officer_name=a_officer.name if a_officer else None,
            bureau_code=a_bureau.code if a_bureau else None,
            from_bureau_code=from_b.code if from_b else None,
            to_bureau_code=to_b.code if to_b else None,
            action_type=a.action_type,
            remarks=a.remarks,
            document_url=a.document_url,
            created_at=a.created_at
        ))
    return output
