import io
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
import pandas as pd
from app.database import get_db
from app.models import IngestionJob, User
from app.schemas import IngestionJobResponse, IngestAPIRequest
from app.services.auth_service import get_current_user, require_roles
from app.services.ingest_service import process_ingestion_data
from app.services.report_service import generate_csv_report

router = APIRouter(prefix="/ingest", tags=["Data Ingestion"])


@router.post("/api", response_model=IngestionJobResponse)
async def ingest_via_api(
    payload: List[IngestAPIRequest],
    current_user: User = Depends(require_roles(["Admin", "PGRC", "RB", "Regional Office"])),
    db: AsyncSession = Depends(get_db)
):
    records = [item.model_dump() for item in payload]
    job = await process_ingestion_data(
        db=db,
        user=current_user,
        filename=f"API_Batch_{len(records)}_items",
        records=records
    )
    return job


@router.post("/file", response_model=IngestionJobResponse)
async def ingest_via_file(
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles(["Admin", "PGRC", "RB", "Regional Office"])),
    db: AsyncSession = Depends(get_db)
):
    contents = await file.read()
    filename = file.filename.lower()

    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        elif filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload a CSV or Excel (.xlsx) file.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    records = df.to_dict(orient="records")
    job = await process_ingestion_data(
        db=db,
        user=current_user,
        filename=file.filename,
        records=records
    )
    return job


@router.get("/jobs", response_model=List[IngestionJobResponse])
async def list_ingestion_jobs(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(IngestionJob).order_by(desc(IngestionJob.created_at)).limit(limit)
    res = await db.execute(query)
    return res.scalars().all()


@router.get("/jobs/{id}", response_model=IngestionJobResponse)
async def get_ingestion_job(id: UUID, db: AsyncSession = Depends(get_db)):
    job = await db.get(IngestionJob, id)
    if not job:
        raise HTTPException(status_code=404, detail="Ingestion job not found")
    return job


@router.get("/jobs/{id}/errors")
async def download_error_report(id: UUID, db: AsyncSession = Depends(get_db)):
    job = await db.get(IngestionJob, id)
    if not job:
        raise HTTPException(status_code=404, detail="Ingestion job not found")

    errors = job.error_details or []
    if not errors:
        return Response(content="No validation errors recorded for this job.", media_type="text/plain")

    fieldnames = ["row", "aicte_permanent_id", "title", "case_number", "error"]
    csv_bytes = generate_csv_report(errors, fieldnames)

    return StreamingResponse(
        io.BytesIO(csv_bytes),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=ingest_errors_{job.id}.csv"}
    )


@router.get("/template")
async def download_sample_template():
    sample_data = [
        {
            "aicte_permanent_id": "1-1002341",
            "category": "Faculty & Staff Grievance",
            "title": "Non-payment of 7th Pay Commission arrears to faculty",
            "description": "Assistant professors and staff have not received promised arrears for the last 18 months despite multiple representations.",
            "complainant_type": "Faculty",
            "bureau_code": "PGRC",
            "received_date": "2026-03-15"
        },
        {
            "aicte_permanent_id": "1-2004562",
            "category": "Admission & Capitation Fee",
            "title": "Demanding unauthorized capitation fee for B.Tech admission",
            "description": "Institution demands unreceipted fee of Rs. 1,50,000 for NRI quota seats.",
            "complainant_type": "Parent",
            "bureau_code": "RB",
            "received_date": "2026-03-20"
        }
    ]
    fieldnames = ["aicte_permanent_id", "category", "title", "description", "complainant_type", "bureau_code", "received_date"]
    csv_bytes = generate_csv_report(sample_data, fieldnames)

    return StreamingResponse(
        io.BytesIO(csv_bytes),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=aicte_casetrack_template.csv"}
    )
