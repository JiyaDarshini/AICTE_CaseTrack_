import io
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, case, desc
from app.database import get_db
from app.models import Case, Institution, BureauCell, OverlapGroup, User
from app.services.auth_service import get_current_user
from app.services.report_service import generate_csv_report, generate_xlsx_report, generate_pdf_report

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])


@router.get("/{report_type}")
async def get_report(
    report_type: str,
    format: str = Query("json", regex="^(json|csv|xlsx|pdf)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    valid_types = ["bureau", "region", "institution", "ageing", "disposal-rate", "overlaps", "monthly", "quarterly"]
    if report_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid report type. Allowed: {', '.join(valid_types)}")

    title = f"{report_type.replace('-', ' ').title()} Report"
    headers = []
    rows = []
    json_data = []

    # 1. BUREAU REPORT
    if report_type == "bureau":
        title = "Bureau-Wise Workload & Pendency Report"
        headers = ["Bureau Code", "Bureau Name", "Total Cases", "Pending", "Under Process", "Disposed", "Transferred", "Escalated", "Overdue"]
        bureaus = (await db.execute(select(BureauCell).order_by(BureauCell.code))).scalars().all()
        for b in bureaus:
            q = (
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
                q = q.where(Institution.region == current_user.region)
            r = (await db.execute(q)).one()
            row = [b.code, b.name, r.total or 0, r.pending or 0, r.under_process or 0, r.disposed or 0, r.transferred or 0, r.escalated or 0, r.overdue or 0]
            rows.append(row)
            json_data.append(dict(zip(headers, row)))

    # 2. REGION REPORT
    elif report_type == "region":
        title = "Regional Distribution & Grievance Statistics"
        headers = ["Region", "Total Institutions", "Total Cases", "Active Overlaps", "Pending", "Under Process", "Disposed", "Overdue"]
        regions_res = await db.execute(select(Institution.region).distinct())
        regions = [reg for reg in regions_res.scalars().all() if reg]
        if current_user.role == "Regional Office" and current_user.region:
            regions = [current_user.region]

        for reg in regions:
            inst_count = (await db.execute(select(func.count(Institution.id)).where(Institution.region == reg))).scalar_one_or_none() or 0
            cq = (
                select(
                    func.count(Case.id).label("total"),
                    func.count(case((Case.status == "Pending", 1))).label("pending"),
                    func.count(case((Case.status == "Under Process", 1))).label("under_process"),
                    func.count(case((Case.status == "Disposed", 1))).label("disposed"),
                    func.count(case((and_(Case.expected_disposal_date < now, Case.status != "Disposed"), 1))).label("overdue")
                )
                .join(Institution, Case.institution_id == Institution.id)
                .where(Institution.region == reg, Case.is_deleted == False)
            )
            cr = (await db.execute(cq)).one()
            ov_cnt = (await db.execute(
                select(func.count(OverlapGroup.id)).join(Institution, OverlapGroup.institution_id == Institution.id).where(Institution.region == reg, OverlapGroup.status == "Open")
            )).scalar_one_or_none() or 0

            row = [reg, inst_count, cr.total or 0, ov_cnt, cr.pending or 0, cr.under_process or 0, cr.disposed or 0, cr.overdue or 0]
            rows.append(row)
            json_data.append(dict(zip(headers, row)))

    # 3. INSTITUTION REPORT
    elif report_type == "institution":
        title = "Institution-Wise Grievance Compliance Report"
        headers = ["AICTE Permanent ID", "Institution Name", "Region", "Total Cases", "Open Cases", "Disposed Cases", "Active Overlaps"]
        q = (
            select(
                Institution.id,
                Institution.aicte_permanent_id,
                Institution.name,
                Institution.region,
                func.count(Case.id).label("total_cases"),
                func.count(case((Case.status != "Disposed", 1))).label("open_cases"),
                func.count(case((Case.status == "Disposed", 1))).label("disposed_cases")
            )
            .outerjoin(Case, and_(Institution.id == Case.institution_id, Case.is_deleted == False))
            .where(Institution.is_deleted == False)
            .group_by(Institution.id, Institution.aicte_permanent_id, Institution.name, Institution.region)
            .order_by(desc("open_cases"))
            .limit(100)
        )
        if current_user.role == "Regional Office" and current_user.region:
            q = q.where(Institution.region == current_user.region)

        for inst in (await db.execute(q)).all():
            ov_c = (await db.execute(select(func.count(OverlapGroup.id)).where(OverlapGroup.institution_id == inst.id, OverlapGroup.status == "Open"))).scalar_one_or_none() or 0
            row = [inst.aicte_permanent_id, inst.name, inst.region, inst.total_cases or 0, inst.open_cases or 0, inst.disposed_cases or 0, ov_c]
            rows.append(row)
            json_data.append(dict(zip(headers, row)))

    # 4. OVERLAPS REPORT
    elif report_type == "overlaps":
        title = "Inter-Bureau Case Overlap & Duplication Audit Report"
        headers = ["Institution Permanent ID", "Institution Name", "Similarity %", "Severity", "Overlap Status", "Rules Fired Summary", "Date Detected"]
        q = (
            select(OverlapGroup, Institution)
            .join(Institution, OverlapGroup.institution_id == Institution.id)
            .order_by(desc(OverlapGroup.score))
        )
        if current_user.role == "Regional Office" and current_user.region:
            q = q.where(Institution.region == current_user.region)

        for og, inst in (await db.execute(q)).all():
            rules_str = ", ".join(og.rules_fired) if og.rules_fired else "Exact Match"
            row = [inst.aicte_permanent_id, inst.name, f"{og.score * 100:.1f}%", og.severity, og.status, rules_str, og.created_at.strftime('%Y-%m-%d')]
            rows.append(row)
            json_data.append(dict(zip(headers, row)))

    # 5. AGEING REPORT
    elif report_type == "ageing":
        title = "Case Ageing and Pendency Bracket Analysis"
        headers = ["Ageing Bracket", "Open Cases Count", "Percentage of Total Pendency"]
        # reuse ageing counts
        cases = (await db.execute(
            select(Case.received_date).join(Institution, Case.institution_id == Institution.id).where(Case.status != "Disposed", Case.is_deleted == False)
        )).scalars().all()
        b_counts = {"0–30 Days": 0, "31–60 Days": 0, "61–90 Days": 0, "90+ Days": 0}
        total_open = len(cases)
        for d in cases:
            if d:
                diff = (now - d).days
                if diff <= 30: b_counts["0–30 Days"] += 1
                elif diff <= 60: b_counts["31–60 Days"] += 1
                elif diff <= 90: b_counts["61–90 Days"] += 1
                else: b_counts["90+ Days"] += 1
        for b_name, count in b_counts.items():
            pct = f"{(count / total_open * 100):.1f}%" if total_open > 0 else "0.0%"
            row = [b_name, count, pct]
            rows.append(row)
            json_data.append(dict(zip(headers, row)))

    # 6. DISPOSAL RATE / MONTHLY / QUARTERLY
    else:
        title = f"{report_type.title()} Performance Evaluation Report"
        headers = ["Period / Metric", "Received Cases", "Disposed Cases", "Pending Clearance Rate", "Overdue Incidents"]
        cases = (await db.execute(select(Case).join(Institution, Case.institution_id == Institution.id).where(Case.is_deleted == False))).scalars().all()
        rec_cnt = len(cases)
        disp_cnt = sum(1 for c in cases if c.status == "Disposed")
        overdue_cnt = sum(1 for c in cases if c.expected_disposal_date and c.expected_disposal_date < now and c.status != "Disposed")
        rate = f"{(disp_cnt / rec_cnt * 100):.1f}%" if rec_cnt > 0 else "100%"
        row = ["Overall Cumulative Track", rec_cnt, disp_cnt, rate, overdue_cnt]
        rows.append(row)
        json_data.append(dict(zip(headers, row)))

    # Format return
    if format == "json":
        return {"report_title": title, "headers": headers, "data": json_data}
    elif format == "csv":
        csv_bytes = generate_csv_report(json_data, headers)
        return StreamingResponse(
            io.BytesIO(csv_bytes),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=report_{report_type}.csv"}
        )
    elif format == "xlsx":
        xlsx_bytes = generate_xlsx_report(title, headers, rows)
        return StreamingResponse(
            io.BytesIO(xlsx_bytes),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=report_{report_type}.xlsx"}
        )
    elif format == "pdf":
        pdf_bytes = generate_pdf_report(title, headers, rows)
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=report_{report_type}.pdf"}
        )
