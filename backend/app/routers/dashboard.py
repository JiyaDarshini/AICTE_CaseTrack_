from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, case, desc
from app.database import get_db
from app.models import Case, Institution, BureauCell, OverlapGroup, User
from app.schemas import DashboardSummaryResponse, BureauWorkloadItem, AgeingBucket, TopInstitutionItem
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    now = datetime.now(timezone.utc)

    # Base query for cases
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
        .where(Case.is_deleted == False)
    )

    if current_user.role == "Regional Office" and current_user.region:
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

    # Overlaps query
    ov_query = select(func.count(OverlapGroup.id)).join(Institution, OverlapGroup.institution_id == Institution.id).where(OverlapGroup.status == "Open")
    if current_user.role == "Regional Office" and current_user.region:
        ov_query = ov_query.where(Institution.region == current_user.region)
    ov_res = await db.execute(ov_query)
    active_overlaps = ov_res.scalar_one_or_none() or 0

    # SLA compliance rate
    sla_compliance = round(((total - overdue) / total * 100.0), 1) if total > 0 else 100.0

    return DashboardSummaryResponse(
        total_cases=total,
        pending_cases=pending,
        under_process_cases=under_process,
        disposed_cases=disposed,
        transferred_cases=transferred,
        escalated_cases=escalated,
        overdue_cases=overdue,
        active_overlaps=active_overlaps,
        sla_compliance_rate=sla_compliance
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
            .where(Case.current_bureau_id == b.id, Case.is_deleted == False)
        )

        if current_user.role == "Regional Office" and current_user.region:
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
    """Ageing buckets: 0-30, 31-60, 61-90, 90+ days for open cases"""
    now = datetime.now(timezone.utc)
    cases_query = (
        select(Case.received_date)
        .join(Institution, Case.institution_id == Institution.id)
        .where(Case.status != "Disposed", Case.is_deleted == False)
    )

    if current_user.role == "Regional Office" and current_user.region:
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
    """Monthly trends for received and disposed cases over the past 6 months"""
    now = datetime.now(timezone.utc)
    six_months_ago = now - timedelta(days=180)

    query = (
        select(Case.received_date, Case.status, Case.last_action_date)
        .join(Institution, Case.institution_id == Institution.id)
        .where(Case.received_date >= six_months_ago, Case.is_deleted == False)
    )

    if current_user.role == "Regional Office" and current_user.region:
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
    limit: int = Query(5, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(
            Institution.id,
            Institution.aicte_permanent_id,
            Institution.name,
            Institution.region,
            func.count(Case.id).label("total_cases"),
            func.count(case((Case.status != "Disposed", 1))).label("open_cases")
        )
        .outerjoin(Case, and_(Institution.id == Case.institution_id, Case.is_deleted == False))
        .where(Institution.is_deleted == False)
        .group_by(Institution.id, Institution.aicte_permanent_id, Institution.name, Institution.region)
    )

    if current_user.role == "Regional Office" and current_user.region:
        query = query.where(Institution.region == current_user.region)

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
