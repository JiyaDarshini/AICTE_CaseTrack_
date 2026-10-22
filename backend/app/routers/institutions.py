import io
from typing import List, Optional, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import Institution, Case, BureauCell, User, OverlapGroup
from app.schemas import (
    InstitutionResponse, InstitutionDetailResponse, InstitutionCreate,
    InstitutionImportResponse
)
from app.services.auth_service import get_current_user, require_roles
from app.cache import ensure_utc

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
        .options(selectinload(Case.current_bureau))
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
        bureau = c.current_bureau
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


@router.post("/import", response_model=InstitutionImportResponse)
async def import_institutions_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles(["Admin"])),
    db: AsyncSession = Depends(get_db)
):
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    filename = (file.filename or "").lower()
    try:
        if filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            try:
                df = pd.read_csv(io.BytesIO(contents), encoding="utf-8")
            except UnicodeDecodeError:
                df = pd.read_csv(io.BytesIO(contents), encoding="latin-1")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV file: {str(e)}")

    if df.empty:
        return InstitutionImportResponse(
            accepted=0,
            rejected=0,
            total=0,
            created=0,
            updated=0,
            errors=[]
        )

    # Standardize column names
    df.columns = [str(c).strip().lower().replace(" ", "_").replace("-", "_") for c in df.columns]

    # Map column aliases
    alias_map = {
        "institution_name": "name",
        "institution": "name",
        "inst_name": "name",
        "permanent_id": "aicte_permanent_id",
        "aicte_id": "aicte_permanent_id",
        "pid": "aicte_permanent_id",
        "institution_type": "type",
        "category": "type"
    }
    df.rename(columns=alias_map, inplace=True)

    required_cols = ["aicte_permanent_id", "name"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required CSV columns: {', '.join(missing)}. Required columns: aicte_permanent_id, name, address, city, state, region, type"
        )

    df = df.fillna("")

    accepted = 0
    rejected = 0
    created = 0
    updated = 0
    errors = []

    for idx, row in df.iterrows():
        row_num = int(idx) + 2  # 1-indexed (header is line 1)
        raw_pid = str(row.get("aicte_permanent_id", "")).strip()
        raw_name = str(row.get("name", "")).strip()

        if not raw_pid or raw_pid.lower() in ("nan", "none", "null"):
            rejected += 1
            errors.append({
                "row": row_num,
                "aicte_permanent_id": raw_pid,
                "error": "Missing or empty aicte_permanent_id"
            })
            continue

        if not raw_name or raw_name.lower() in ("nan", "none", "null"):
            rejected += 1
            errors.append({
                "row": row_num,
                "aicte_permanent_id": raw_pid,
                "error": "Missing or empty institution name"
            })
            continue

        pid = raw_pid.upper()
        name = raw_name
        address = str(row.get("address", "")).strip() or None
        city = str(row.get("city", "")).strip() or None
        state = str(row.get("state", "")).strip() or None
        region = str(row.get("region", "")).strip() or "Northern"
        inst_type = str(row.get("type", "")).strip() or "Engineering & Technology"

        # Check if institution already exists by aicte_permanent_id (upsert)
        stmt = select(Institution).where(Institution.aicte_permanent_id == pid)
        res = await db.execute(stmt)
        existing = res.scalar_one_or_none()

        if existing:
            existing.name = name
            if address is not None:
                existing.address = address
            if city is not None:
                existing.city = city
            if state is not None:
                existing.state = state
            if region:
                existing.region = region
            if inst_type is not None:
                existing.type = inst_type
            existing.is_deleted = False
            updated += 1
        else:
            new_inst = Institution(
                aicte_permanent_id=pid,
                name=name,
                address=address,
                city=city,
                state=state,
                region=region,
                type=inst_type,
                status="Active",
                is_deleted=False
            )
            db.add(new_inst)
            created += 1

        accepted += 1

    await db.commit()

    return InstitutionImportResponse(
        accepted=accepted,
        rejected=rejected,
        total=len(df),
        created=created,
        updated=updated,
        errors=errors[:100]
    )
