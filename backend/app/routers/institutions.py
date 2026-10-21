from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.database import get_db
from app.models import Institution, Case, BureauCell, User, OverlapGroup
from app.schemas import InstitutionResponse, InstitutionDetailResponse, InstitutionCreate
from app.services.auth_service import get_current_user, require_roles

router = APIRouter(prefix="/institutions", tags=["Institutions"])


@router.get("", response_model=List[InstitutionResponse])
async def list_institutions(
    q: Optional[str] = Query(None, description="Search by name or AICTE Permanent ID"),
    region: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Institution).where(Institution.is_deleted == False)

    # Regional Office filter
    if current_user.role == "Regional Office" and current_user.region:
        query = query.where(Institution.region == current_user.region)
    elif region:
        query = query.where(Institution.region.ilike(f"%{region.strip()}%"))

    if q:
        term = f"%{q.strip()}%"
        query = query.where((Institution.name.ilike(term)) | (Institution.aicte_permanent_id.ilike(term)))
    if state:
        query = query.where(Institution.state.ilike(f"%{state.strip()}%"))

    query = query.order_by(Institution.name).limit(limit)
    res = await db.execute(query)
    return res.scalars().all()


@router.get("/{id}", response_model=InstitutionDetailResponse)
async def get_institution(id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    institution = await db.get(Institution, id)
    if not institution or institution.is_deleted:
        raise HTTPException(status_code=404, detail="Institution not found")

    if current_user.role == "Regional Office" and current_user.region and institution.region != current_user.region:
        raise HTTPException(status_code=403, detail="Access denied for institutions outside your assigned region.")

    # Fetch cases
    cases_res = await db.execute(
        select(Case)
        .where(Case.institution_id == id, Case.is_deleted == False)
        .order_by(desc(Case.received_date))
    )
    cases = cases_res.scalars().all()

    total_cases = len(cases)
    open_cases = sum(1 for c in cases if c.status != "Disposed")
    disposed_cases = sum(1 for c in cases if c.status == "Disposed")

    bureaus_set = set()
    case_items = []
    for c in cases:
        bureau = await db.get(BureauCell, c.current_bureau_id) if c.current_bureau_id else None
        b_code = bureau.code if bureau else "Unassigned"
        if bureau:
            bureaus_set.add(bureau.name)

        case_items.append({
            "id": str(c.id),
            "case_number": c.case_number,
            "title": c.title,
            "status": c.status,
            "category": c.category,
            "bureau_code": b_code,
            "received_date": c.received_date.isoformat() if c.received_date else None,
            "expected_disposal_date": c.expected_disposal_date.isoformat() if c.expected_disposal_date else None
        })

    return InstitutionDetailResponse(
        id=institution.id,
        aicte_permanent_id=institution.aicte_permanent_id,
        name=institution.name,
        address=institution.address,
        city=institution.city,
        state=institution.state,
        region=institution.region,
        type=institution.type,
        status=institution.status,
        created_at=institution.created_at,
        total_cases=total_cases,
        open_cases=open_cases,
        disposed_cases=disposed_cases,
        bureaus_involved=sorted(list(bureaus_set)),
        cases=case_items
    )


@router.post("", response_model=InstitutionResponse, status_code=201)
async def create_institution(
    req: InstitutionCreate,
    current_user: User = Depends(require_roles(["Admin", "PGRC", "RB"])),
    db: AsyncSession = Depends(get_db)
):
    pid = req.aicte_permanent_id.strip().upper()
    chk = await db.execute(select(Institution).where(Institution.aicte_permanent_id == pid))
    if chk.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Institution with Permanent ID '{pid}' already exists.")

    new_inst = Institution(
        aicte_permanent_id=pid,
        name=req.name.strip(),
        address=req.address,
        city=req.city,
        state=req.state,
        region=req.region.strip(),
        type=req.type,
        status=req.status or "Active"
    )
    db.add(new_inst)
    await db.commit()
    await db.refresh(new_inst)
    return new_inst
