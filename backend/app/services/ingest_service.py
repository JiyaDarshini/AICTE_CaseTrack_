import io
import re
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Tuple
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Case, Institution, BureauCell, IngestionJob, CaseAction, User
from app.services.overlap_service import detect_overlaps_for_case
from app.services.audit_service import create_audit_log
import logging

logger = logging.getLogger(__name__)


def normalize_aicte_id(val: Any) -> str:
    if val is None or pd.isna(val):
        return ""
    return str(val).strip().upper()


def normalize_text(val: Any) -> str:
    if val is None or pd.isna(val):
        return ""
    text = str(val).strip()
    return re.sub(r'\s+', ' ', text)


def parse_date(val: Any) -> datetime:
    if val is None or pd.isna(val):
        return datetime.now(timezone.utc)
    if isinstance(val, (datetime, pd.Timestamp)):
        if val.tzinfo is None:
            return val.replace(tzinfo=timezone.utc)
        return val
    try:
        dt = pd.to_datetime(val)
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc).to_pydatetime()
        return dt.to_pydatetime()
    except Exception:
        return datetime.now(timezone.utc)


async def process_ingestion_data(
    db: AsyncSession,
    user: User,
    filename: str,
    records: List[Dict[str, Any]]
) -> IngestionJob:
    """
    Ingests records from CSV, Excel, or API payload.
    Validates AICTE Permanent ID against registered institutions.
    Unmatched records are rejected to error details.
    """
    job = IngestionJob(
        user_id=user.id,
        filename=filename,
        total=len(records),
        accepted=0,
        rejected=0,
        status="Processing"
    )
    db.add(job)
    await db.flush()

    # Pre-fetch institutions and bureaus
    institutions_res = await db.execute(select(Institution).where(Institution.is_deleted == False))
    institutions_by_pid = {inst.aicte_permanent_id.upper(): inst for inst in institutions_res.scalars().all()}

    bureaus_res = await db.execute(select(BureauCell))
    bureaus_by_code = {b.code.upper(): b for b in bureaus_res.scalars().all()}

    # Default fallback bureau if not matched
    default_bureau = bureaus_by_code.get("PGRC") or list(bureaus_by_code.values())[0] if bureaus_by_code else None

    accepted_cases = []
    error_records = []

    for index, row in enumerate(records, start=1):
        aicte_id = normalize_aicte_id(row.get("aicte_permanent_id") or row.get("institution_id") or row.get("permanent_id"))
        title = normalize_text(row.get("title") or row.get("subject") or row.get("complaint_title"))
        description = normalize_text(row.get("description") or row.get("complaint_description") or row.get("details"))
        category = normalize_text(row.get("category") or row.get("complaint_category") or "General Grievance")
        complainant_type = normalize_text(row.get("complainant_type") or "Student")
        bureau_code = normalize_text(row.get("bureau_code") or row.get("bureau") or "PGRC").upper()
        case_number = normalize_text(row.get("case_number"))
        received_date = parse_date(row.get("received_date"))

        # Validation rule 1: Missing AICTE Permanent ID
        if not aicte_id:
            error_records.append({
                "row": index,
                "aicte_permanent_id": aicte_id,
                "title": title,
                "error": "Missing AICTE Permanent ID"
            })
            continue

        # Validation rule 2: AICTE Permanent ID not in institutions (no fuzzy matching!)
        if aicte_id not in institutions_by_pid:
            error_records.append({
                "row": index,
                "aicte_permanent_id": aicte_id,
                "title": title,
                "error": f"Institution with Permanent ID '{aicte_id}' is not recognized in database."
            })
            continue

        # Validation rule 3: Title and description required
        if len(title) < 3 or len(description) < 5:
            error_records.append({
                "row": index,
                "aicte_permanent_id": aicte_id,
                "title": title,
                "error": "Complaint title or description is too short (min 3 chars title, 5 chars description)."
            })
            continue

        institution = institutions_by_pid[aicte_id]
        bureau = bureaus_by_code.get(bureau_code, default_bureau)

        # Generate unique case number if absent
        if not case_number:
            import random
            case_number = f"AICTE-{datetime.now().strftime('%Y%m')}-{random.randint(10000, 99999)}"

        # Check for duplicate case_number
        dup_chk = await db.execute(select(Case).where(Case.case_number == case_number))
        if dup_chk.scalar_one_or_none():
            error_records.append({
                "row": index,
                "aicte_permanent_id": aicte_id,
                "case_number": case_number,
                "error": f"Case number '{case_number}' already exists in system."
            })
            continue

        sla_days = 30
        expected_disposal = received_date + timedelta(days=sla_days)

        new_case = Case(
            case_number=case_number,
            institution_id=institution.id,
            category=category,
            title=title,
            description=description,
            complainant_type=complainant_type,
            received_date=received_date,
            status="Pending",
            current_bureau_id=bureau.id if bureau else None,
            assigned_officer_id=user.id,
            last_action="Ingested into system",
            next_action="Preliminary Verification & Bureau Assignment",
            last_action_date=datetime.now(timezone.utc),
            expected_disposal_date=expected_disposal,
            sla_days=sla_days,
            source=f"Ingestion: {filename}"
        )
        db.add(new_case)
        await db.flush()

        # Append intake action
        action = CaseAction(
            case_id=new_case.id,
            bureau_id=bureau.id if bureau else None,
            officer_id=user.id,
            action_type="Intake",
            remarks=f"Case received and registered via file upload ({filename})."
        )
        db.add(action)

        # Trigger Overlap Detection
        overlap_grp = await detect_overlaps_for_case(db, new_case)
        if overlap_grp:
            await create_audit_log(
                db=db,
                user=user,
                entity="Case",
                entity_id=str(new_case.id),
                action="Overlap Detected",
                new_value={"overlap_group_id": str(overlap_grp.id), "score": overlap_grp.score, "severity": overlap_grp.severity}
            )
        else:
            await create_audit_log(
                db=db,
                user=user,
                entity="Case",
                entity_id=str(new_case.id),
                action="No Overlap Found",
                new_value={"status": "Normal Case Processing"}
            )

        accepted_cases.append(new_case)

    job.accepted = len(accepted_cases)
    job.rejected = len(error_records)
    job.error_details = error_records
    job.status = "Completed" if job.rejected == 0 else "Completed with Errors"
    await db.commit()

    return job
