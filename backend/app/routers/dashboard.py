from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, case, desc
from app.database import get_db
from app.models import Case, Institution, BureauCell, OverlapGroup, OverlapMember, User
from app.schemas import DashboardSummaryResponse, BureauWorkloadItem, AgeingBucket, TopInstitutionItem
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


async def serialize_case_list(cases: List[Case], db: AsyncSession, now: datetime) -> List[Dict[str, Any]]:
    output = []
    for c in cases:
        inst = await db.get(Institution, c.institution_id)
        bureau = await db.get(BureauCell, c.current_bureau_id) if c.current_bureau_id else None
        officer = await db.get(User, c.assigned_officer_id) if c.assigned_officer_id else None

        is_overdue = False
        days_rem = None
        if c.expected_disposal_date and c.status != "Disposed":
            delta = (c.expected_disposal_date - now).total_seconds() / 86400.0
            days_rem = int(delta)
            if delta < 0:
                is_overdue = True

        output.append({
            "id": str(c.id),
            "case_number": c.case_number,
            "institution_id": str(c.institution_id),
            "institution_name": inst.name if inst else "Unknown",
            "aicte_permanent_id": inst.aicte_permanent_id if inst else "",
            "institution_region": inst.region if inst else "",
            "category": c.category,
            "title": c.title,
            "description": c.description,
            "complainant_type": c.complainant_type,
            "complainant_name": c.complainant_name,
            "received_date": c.received_date.isoformat() if c.received_date else None,
            "status": c.status,
            "current_bureau_id": str(c.current_bureau_id) if c.current_bureau_id else None,
            "current_bureau_code": bureau.code if bureau else None,
            "assigned_officer_id": str(c.assigned_officer_id) if c.assigned_officer_id else None,
            "assigned_officer_name": officer.name if officer else None,
            "last_action": c.last_action,
            "next_action": c.next_action,
            "last_action_date": c.last_action_date.isoformat() if c.last_action_date else None,
            "expected_disposal_date": c.expected_disposal_date.isoformat() if c.expected_disposal_date else None,
            "sla_days": c.sla_days,
            "source": c.source,
            "is_overdue": is_overdue,
            "days_remaining": days_rem,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        })
    return output


@router.get("/summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    now = datetime.now(timezone.utc)
    five_days_ahead = now + timedelta(days=5)
    first_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)

    # Base query for cases
    query = (
        select(
            func.count(Case.id).label("total"),
            func.count(case((Case.status == "Pending", 1))).label("pending"),
            func.count(case((Case.status == "Under Process", 1))).label("under_process"),
            func.count(case((Case.status == "Disposed", 1))).label("disposed"),
            func.count(case((Case.status == "Transferred", 1))).label("transferred"),
            func.count(case((Case.status == "Escalated", 1))).label("escalated"),
            func.count(case((and_(Case.expected_disposal_date < now, Case.status != "Disposed"), 1))).label("overdue"),
            func.count(case((and_(Case.expected_disposal_date >= now, Case.expected_disposal_date <= five_days_ahead, Case.status != "Disposed"), 1))).label("due_in_5_days"),
            func.count(case((and_(Case.status == "Disposed", Case.last_action_date >= first_of_month), 1))).label("disposed_this_month"),
            func.count(case((and_(Case.status == "Escalated", Case.assigned_officer_id == current_user.id), 1))).label("escalated_by_me")
        )
        .join(Institution, Case.institution_id == Institution.id)
        .outerjoin(BureauCell, Case.current_bureau_id == BureauCell.id)
        .where(Case.is_deleted == False)
    )

    if current_user.role == "PGRC":
        query = query.where(BureauCell.code == "PGRC")
    elif current_user.role == "RB":
        query = query.where(BureauCell.code == "RB")
    elif current_user.role == "Regional Office" and current_user.region:
        query = query.where(Institution.region == current_user.region)

    res = await db.execute(query)
    row = res.one()

    total = row.total or 0
    pending = row.pending or 0
    under_process = row.under_process or 0
    disposed = row.disposed or 0
    transferred = row.transferred or 0
    escalated = row.escalated or 0
    overdue = row.overdue or 0
    due_in_5 = row.due_in_5_days or 0
    disposed_month = row.disposed_this_month or 0
    escalated_me = row.escalated_by_me or 0

    # Overlaps query scoped strictly by role
    if current_user.role == "PGRC":
        ov_query = (
            select(func.count(func.distinct(OverlapGroup.id)))
            .join(OverlapMember, OverlapGroup.id == OverlapMember.group_id)
            .join(Case, OverlapMember.case_id == Case.id)
            .outerjoin(BureauCell, Case.current_bureau_id == BureauCell.id)
            .where(OverlapGroup.status == "Open", BureauCell.code == "PGRC")
        )
    elif current_user.role == "RB":
        ov_query = (
            select(func.count(func.distinct(OverlapGroup.id)))
            .join(OverlapMember, OverlapGroup.id == OverlapMember.group_id)
            .join(Case, OverlapMember.case_id == Case.id)
            .outerjoin(BureauCell, Case.current_bureau_id == BureauCell.id)
            .where(OverlapGroup.status == "Open", BureauCell.code == "RB")
        )
    elif current_user.role == "Regional Office" and current_user.region:
        ov_query = (
            select(func.count(OverlapGroup.id))
            .join(Institution, OverlapGroup.institution_id == Institution.id)
            .where(OverlapGroup.status == "Open", Institution.region == current_user.region)
        )
    else:
        ov_query = select(func.count(OverlapGroup.id)).where(OverlapGroup.status == "Open")

    ov_res = await db.execute(ov_query)
    active_overlaps = ov_res.scalar_one_or_none() or 0

    # SLA compliance rate
    sla_compliance = round(((total - overdue) / total * 100.0), 1) if total > 0 else 100.0
    disposal_rate = round((disposed / total * 100.0), 1) if total > 0 else 100.0

    # Average days to dispose for disposed cases
    disp_query = (
        select(Case.received_date, Case.last_action_date)
        .join(Institution, Case.institution_id == Institution.id)
        .outerjoin(BureauCell, Case.current_bureau_id == BureauCell.id)
        .where(Case.status == "Disposed", Case.is_deleted == False, Case.received_date.isnot(None), Case.last_action_date.isnot(None))
    )
    if current_user.role == "PGRC":
        disp_query = disp_query.where(BureauCell.code == "PGRC")
    elif current_user.role == "RB":
        disp_query = disp_query.where(BureauCell.code == "RB")
    elif current_user.role == "Regional Office" and current_user.region:
        disp_query = disp_query.where(Institution.region == current_user.region)

    disp_res = await db.execute(disp_query)
    disp_rows = disp_res.all()
    if disp_rows:
        total_days = sum((r[1] - r[0]).total_seconds() / 86400.0 for r in disp_rows)
        avg_days_to_dispose = round(max(0.0, total_days / len(disp_rows)), 1)
    else:
        avg_days_to_dispose = 0.0

    return DashboardSummaryResponse(
        total_cases=total,
        pending_cases=pending,
        under_process_cases=under_process,
        disposed_cases=disposed,
        transferred_cases=transferred,
        escalated_cases=escalated,
        overdue_cases=overdue,
        active_overlaps=active_overlaps,
        sla_compliance_rate=sla_compliance,
        due_in_5_days=due_in_5,
        disposed_this_month=disposed_month,
        disposal_rate=disposal_rate,
        avg_days_to_dispose=avg_days_to_dispose,
        escalated_by_me=escalated_me
    )


@router.get("/bureau-workload", response_model=List[BureauWorkloadItem])
async def get_bureau_workload(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    now = datetime.now(timezone.utc)
    bureaus_res = await db.execute(select(BureauCell).order_by(BureauCell.code))
    bureaus = bureaus_res.scalars().all()

    workload = []
    for b in bureaus:
        query = (
            select(
                func.count(Case.id).label("total"),
                func.count(case((Case.status == "Pending", 1))).label("pending"),
                func.count(case((Case.status == "Under Process", 1))).label("under_process"),
                func.count(case((Case.status == "Disposed", 1))).label("disposed"),
                func.count(case((Case.status == "Transferred", 1))).label("transferred"),
                func.count(case((Case.status == "Escalated", 1))).label("escalated"),
                func.count(case((and_(Case.expected_disposal_date < now, Case.status != "Disposed"), 1))).label("overdue")
            )
            .join(Institution, Case.institution_id == Institution.id)
            .outerjoin(BureauCell, Case.current_bureau_id == BureauCell.id)
            .where(Case.current_bureau_id == b.id, Case.is_deleted == False)
        )

        if current_user.role == "PGRC":
            query = query.where(BureauCell.code == "PGRC")
        elif current_user.role == "RB":
            query = query.where(BureauCell.code == "RB")
        elif current_user.role == "Regional Office" and current_user.region:
            query = query.where(Institution.region == current_user.region)

        res = await db.execute(query)
        row = res.one()

        workload.append(BureauWorkloadItem(
            bureau_code=b.code,
            bureau_name=b.name,
            total=row.total or 0,
            pending=row.pending or 0,
            under_process=row.under_process or 0,
            disposed=row.disposed or 0,
            transferred=row.transferred or 0,
            escalated=row.escalated or 0,
            overdue=row.overdue or 0
        ))

    return workload


@router.get("/ageing", response_model=List[AgeingBucket])
async def get_ageing_analysis(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Ageing buckets: 0-30, 31-60, 61-90, 90+ days for open cases scoped strictly by role"""
    now = datetime.now(timezone.utc)
    cases_query = (
        select(Case.received_date)
        .join(Institution, Case.institution_id == Institution.id)
        .outerjoin(BureauCell, Case.current_bureau_id == BureauCell.id)
        .where(Case.status != "Disposed", Case.is_deleted == False)
    )

    if current_user.role == "PGRC":
        cases_query = cases_query.where(BureauCell.code == "PGRC")
    elif current_user.role == "RB":
        cases_query = cases_query.where(BureauCell.code == "RB")
    elif current_user.role == "Regional Office" and current_user.region:
        cases_query = cases_query.where(Institution.region == current_user.region)

    res = await db.execute(cases_query)
    dates = res.scalars().all()

    b0_30 = 0
    b31_60 = 0
    b61_90 = 0
    b90_plus = 0

    for d in dates:
        if d:
            age = (now - d).days
            if age <= 30:
                b0_30 += 1
            elif age <= 60:
                b31_60 += 1
            elif age <= 90:
                b61_90 += 1
            else:
                b90_plus += 1

    return [
        AgeingBucket(bucket="0–30 Days", count=b0_30),
        AgeingBucket(bucket="31–60 Days", count=b31_60),
        AgeingBucket(bucket="61–90 Days", count=b61_90),
        AgeingBucket(bucket="90+ Days", count=b90_plus)
    ]


@router.get("/trends")
async def get_trends(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Monthly trends for received and disposed cases over the past 6 months scoped strictly by role"""
    now = datetime.now(timezone.utc)
    six_months_ago = now - timedelta(days=180)

    query = (
        select(Case.received_date, Case.status, Case.last_action_date)
        .join(Institution, Case.institution_id == Institution.id)
        .outerjoin(BureauCell, Case.current_bureau_id == BureauCell.id)
        .where(Case.received_date >= six_months_ago, Case.is_deleted == False)
    )

    if current_user.role == "PGRC":
        query = query.where(BureauCell.code == "PGRC")
    elif current_user.role == "RB":
        query = query.where(BureauCell.code == "RB")
    elif current_user.role == "Regional Office" and current_user.region:
        query = query.where(Institution.region == current_user.region)

    res = await db.execute(query)
    rows = res.all()

    # Aggregate by Month (YYYY-MM)
    months_dict = {}
    for i in range(5, -1, -1):
        m_dt = now - timedelta(days=i * 30)
        m_key = m_dt.strftime("%b %Y")
        months_dict[m_key] = {"month": m_key, "received": 0, "disposed": 0}

    for received_date, status, action_date in rows:
        if received_date:
            m_key = received_date.strftime("%b %Y")
            if m_key in months_dict:
                months_dict[m_key]["received"] += 1
        if status == "Disposed" and action_date:
            m_key = action_date.strftime("%b %Y")
            if m_key in months_dict:
                months_dict[m_key]["disposed"] += 1

    return list(months_dict.values())


@router.get("/institution-status", response_model=List[TopInstitutionItem])
async def get_top_institutions(
    limit: int = Query(5, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    case_conditions = [Case.is_deleted == False]
    if current_user.role == "PGRC":
        pgrc_subq = select(BureauCell.id).where(BureauCell.code == "PGRC")
        case_conditions.append(Case.current_bureau_id.in_(pgrc_subq))
    elif current_user.role == "RB":
        rb_subq = select(BureauCell.id).where(BureauCell.code == "RB")
        case_conditions.append(Case.current_bureau_id.in_(rb_subq))

    query = (
        select(
            Institution.id,
            Institution.aicte_permanent_id,
            Institution.name,
            Institution.region,
            func.count(Case.id).label("total_cases"),
            func.count(case((Case.status != "Disposed", 1))).label("open_cases")
        )
        .outerjoin(Case, and_(Institution.id == Case.institution_id, *case_conditions))
        .where(Institution.is_deleted == False)
    )

    if current_user.role == "Regional Office" and current_user.region:
        query = query.where(Institution.region == current_user.region)
    elif current_user.role in ["PGRC", "RB"]:
        query = query.group_by(Institution.id, Institution.aicte_permanent_id, Institution.name, Institution.region).having(func.count(Case.id) > 0)
    else:
        query = query.group_by(Institution.id, Institution.aicte_permanent_id, Institution.name, Institution.region)

    if current_user.role not in ["PGRC", "RB"]:
        query = query.group_by(Institution.id, Institution.aicte_permanent_id, Institution.name, Institution.region)

    query = query.order_by(desc("open_cases")).limit(limit)
    res = await db.execute(query)
    rows = res.all()

    output = []
    for r in rows:
        ov_res = await db.execute(
            select(func.count(OverlapGroup.id)).where(
                OverlapGroup.institution_id == r.id,
                OverlapGroup.status == "Open"
            )
        )
        active_ov = ov_res.scalar_one_or_none() or 0

        output.append(TopInstitutionItem(
            id=r.id,
            aicte_permanent_id=r.aicte_permanent_id,
            name=r.name,
            region=r.region,
            open_cases=r.open_cases or 0,
            total_cases=r.total_cases or 0,
            active_overlaps=active_ov
        ))

    return output


# ==================== ROLE-SPECIFIC HELPER PANEL ENDPOINTS ====================

@router.get("/escalated-cases")
async def get_escalated_cases(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Escalated cases needing decision (Senior Manager / Admin)"""
    now = datetime.now(timezone.utc)
    query = (
        select(Case)
        .join(Institution, Case.institution_id == Institution.id)
        .outerjoin(BureauCell, Case.current_bureau_id == BureauCell.id)
        .where(Case.status == "Escalated", Case.is_deleted == False)
    )

    if current_user.role == "PGRC":
        query = query.where(BureauCell.code == "PGRC")
    elif current_user.role == "RB":
        query = query.where(BureauCell.code == "RB")
    elif current_user.role == "Regional Office" and current_user.region:
        query = query.where(Institution.region == current_user.region)

    query = query.order_by(desc(Case.last_action_date), desc(Case.received_date)).limit(limit)
    res = await db.execute(query)
    cases = res.scalars().all()
    return await serialize_case_list(cases, db, now)


@router.get("/due-soon")
async def get_due_soon_cases(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cases due soon sorted by expected_disposal_date, strictly scoped by role"""
    now = datetime.now(timezone.utc)
    query = (
        select(Case)
        .join(Institution, Case.institution_id == Institution.id)
        .outerjoin(BureauCell, Case.current_bureau_id == BureauCell.id)
        .where(Case.status != "Disposed", Case.is_deleted == False, Case.expected_disposal_date.isnot(None))
    )

    if current_user.role == "PGRC":
        query = query.where(BureauCell.code == "PGRC")
    elif current_user.role == "RB":
        query = query.where(BureauCell.code == "RB")
    elif current_user.role == "Regional Office" and current_user.region:
        query = query.where(Institution.region == current_user.region)

    query = query.order_by(Case.expected_disposal_date.asc()).limit(limit)
    res = await db.execute(query)
    cases = res.scalars().all()
    return await serialize_case_list(cases, db, now)


@router.get("/my-cases")
async def get_my_cases(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cases assigned to current user, falling back to bureau cases if none directly assigned"""
    now = datetime.now(timezone.utc)
    # 1. Try directly assigned
    query = (
        select(Case)
        .where(Case.assigned_officer_id == current_user.id, Case.is_deleted == False, Case.status != "Disposed")
        .order_by(desc(Case.received_date))
        .limit(limit)
    )
    res = await db.execute(query)
    cases = res.scalars().all()

    # 2. If no directly assigned, query bureau cases
    if not cases and current_user.role in ["PGRC", "RB"]:
        bureau_query = (
            select(Case)
            .join(BureauCell, Case.current_bureau_id == BureauCell.id)
            .where(BureauCell.code == current_user.role, Case.is_deleted == False, Case.status != "Disposed")
            .order_by(desc(Case.received_date))
            .limit(limit)
        )
        b_res = await db.execute(bureau_query)
        cases = b_res.scalars().all()

    return await serialize_case_list(cases, db, now)


@router.get("/cross-bureau-overlaps")
async def get_cross_bureau_overlaps(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Overlaps involving both PGRC and RB cases"""
    # Find all open overlap groups
    groups_res = await db.execute(
        select(OverlapGroup).where(OverlapGroup.status == "Open").order_by(desc(OverlapGroup.score))
    )
    groups = groups_res.scalars().all()

    cross_overlaps = []
    for g in groups:
        inst = await db.get(Institution, g.institution_id)
        if current_user.role == "Regional Office" and current_user.region and inst.region != current_user.region:
            continue

        members_res = await db.execute(
            select(OverlapMember, Case, BureauCell)
            .join(Case, OverlapMember.case_id == Case.id)
            .outerjoin(BureauCell, Case.current_bureau_id == BureauCell.id)
            .where(OverlapMember.group_id == g.id)
        )
        members_data = members_res.all()
        bureaus_in_group = set(b.code for m, c, b in members_data if b)

        # Has both PGRC and RB (or if PGRC/RB role, involves their own bureau and at least one other)
        has_cross = ("PGRC" in bureaus_in_group and "RB" in bureaus_in_group) or len(bureaus_in_group) > 1

        if has_cross:
            member_items = []
            for m, c, b in members_data:
                member_items.append({
                    "id": str(m.id),
                    "case_id": str(c.id),
                    "case_number": c.case_number,
                    "case_title": c.title,
                    "case_status": c.status,
                    "bureau_code": b.code if b else "Unknown",
                    "category": c.category,
                    "role": m.role
                })

            cross_overlaps.append({
                "group_id": str(g.id),
                "institution_id": str(g.institution_id),
                "institution_name": inst.name if inst else "Unknown",
                "aicte_permanent_id": inst.aicte_permanent_id if inst else "",
                "region": inst.region if inst else "",
                "score": g.score,
                "severity": g.severity,
                "status": g.status,
                "explanation": g.explanation,
                "rules_fired": g.rules_fired,
                "created_at": g.created_at.isoformat() if g.created_at else None,
                "bureaus": list(bureaus_in_group),
                "members": member_items
            })

    return cross_overlaps[:10]


@router.get("/cross-bureau-institutions")
async def get_cross_bureau_institutions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Institutions with both RB and PGRC cases (for RB dashboard)"""
    pgrc_subq = select(Case.institution_id).join(BureauCell, Case.current_bureau_id == BureauCell.id).where(BureauCell.code == "PGRC", Case.is_deleted == False)
    rb_subq = select(Case.institution_id).join(BureauCell, Case.current_bureau_id == BureauCell.id).where(BureauCell.code == "RB", Case.is_deleted == False)

    query = (
        select(Institution)
        .where(
            Institution.is_deleted == False,
            Institution.id.in_(pgrc_subq),
            Institution.id.in_(rb_subq)
        )
    )
    if current_user.role == "Regional Office" and current_user.region:
        query = query.where(Institution.region == current_user.region)

    query = query.limit(10)
    res = await db.execute(query)
    institutions = res.scalars().all()

    output = []
    for inst in institutions:
        pgrc_count_res = await db.execute(
            select(func.count(Case.id))
            .join(BureauCell, Case.current_bureau_id == BureauCell.id)
            .where(Case.institution_id == inst.id, BureauCell.code == "PGRC", Case.is_deleted == False, Case.status != "Disposed")
        )
        pgrc_open = pgrc_count_res.scalar_one_or_none() or 0

        rb_count_res = await db.execute(
            select(func.count(Case.id))
            .join(BureauCell, Case.current_bureau_id == BureauCell.id)
            .where(Case.institution_id == inst.id, BureauCell.code == "RB", Case.is_deleted == False, Case.status != "Disposed")
        )
        rb_open = rb_count_res.scalar_one_or_none() or 0

        output.append({
            "id": str(inst.id),
            "aicte_permanent_id": inst.aicte_permanent_id,
            "name": inst.name,
            "region": inst.region,
            "pgrc_open_cases": pgrc_open,
            "rb_open_cases": rb_open,
            "total_cross_open": pgrc_open + rb_open
        })

    return output


@router.get("/action-needed")
async def get_cases_needing_action(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cases needing action (pending, under process, or overdue) scoped strictly by role"""
    now = datetime.now(timezone.utc)
    query = (
        select(Case)
        .join(Institution, Case.institution_id == Institution.id)
        .outerjoin(BureauCell, Case.current_bureau_id == BureauCell.id)
        .where(
            Case.is_deleted == False,
            or_(
                Case.status.in_(["Pending", "Under Process"]),
                and_(Case.expected_disposal_date < now, Case.status != "Disposed")
            )
        )
    )

    if current_user.role == "PGRC":
        query = query.where(BureauCell.code == "PGRC")
    elif current_user.role == "RB":
        query = query.where(BureauCell.code == "RB")
    elif current_user.role == "Regional Office" and current_user.region:
        query = query.where(Institution.region == current_user.region)

    query = query.order_by(Case.expected_disposal_date.asc().nullslast(), desc(Case.received_date)).limit(limit)
    res = await db.execute(query)
    cases = res.scalars().all()
    return await serialize_case_list(cases, db, now)

