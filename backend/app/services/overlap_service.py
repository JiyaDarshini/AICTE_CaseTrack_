from typing import List, Tuple, Dict, Any, Optional
import math
import logging
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from app.models import Case, OverlapGroup, OverlapMember, Institution, BureauCell, CaseAction, AuditLog, User
from app.config import settings
from app.cache import ensure_utc

logger = logging.getLogger(__name__)

# Global cache for SBERT model
_sbert_model = None


def get_sbert_model():
    global _sbert_model
    if _sbert_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info("Loading SBERT model: all-MiniLM-L6-v2")
            _sbert_model = SentenceTransformer("all-MiniLM-L6-v2")
        except Exception as e:
            logger.warning(f"Could not load SentenceTransformer: {e}. Fallback embedding generator will be used.")
            _sbert_model = "fallback"
    return _sbert_model


def compute_embedding(text: str) -> List[float]:
    """Generates 384-dimensional embedding for case title + description"""
    model = get_sbert_model()
    if model != "fallback" and model is not None:
        try:
            embedding = model.encode(text, convert_to_numpy=True).tolist()
            return embedding
        except Exception as e:
            logger.error(f"SBERT encode error: {e}")

    # Deterministic 384-dim semantic hash fallback if PyTorch is warming up
    import hashlib
    vec = [0.0] * 384
    words = text.lower().split()
    for i, w in enumerate(words):
        h = int(hashlib.md5(w.encode('utf-8')).hexdigest(), 16)
        dim = h % 384
        val = ((h >> 8) % 1000) / 1000.0 - 0.5
        vec[dim] += val
    # Normalize
    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 0:
        vec = [x / norm for x in vec]
    return vec


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    val = dot / (norm1 * norm2)
    # Range is -1 to 1; clamp negative to 0 for scoring
    return max(0.0, min(1.0, float(val)))


def compute_rule_score(target_case: Case, candidate: Case) -> Tuple[float, List[str]]:
    """
    Rule score (0-1):
    - same institution (required): 0.20
    - different bureau/cell: +0.25
    - both open: +0.20
    - same or related category: +0.15
    - received within 180 days: +0.10
    - same complainant type: +0.10
    """
    rules_fired = []
    score = 0.0

    # 1. Same institution (candidate blocking already ensures this)
    score += 0.20
    rules_fired.append("Exact Institution Match (AICTE Permanent ID)")

    # 2. Different bureau/cell
    if target_case.current_bureau_id != candidate.current_bureau_id:
        score += 0.25
        rules_fired.append("Different Bureau/Cell Coordination Required")

    # 3. Both open (not disposed)
    if target_case.status != "Disposed" and candidate.status != "Disposed":
        score += 0.20
        rules_fired.append("Both Cases Are Actively Open")

    # 4. Same or related category
    c1 = (target_case.category or "").lower()
    c2 = (candidate.category or "").lower()
    if c1 == c2:
        score += 0.15
        rules_fired.append(f"Identical Complaint Category ({target_case.category})")
    elif any(keyword in c1 and keyword in c2 for keyword in ["fee", "ragging", "infra", "faculty", "admission", "exam", "harassment"]):
        score += 0.10
        rules_fired.append("Related Complaint Domain")

    # 5. Received within 180 days
    if target_case.received_date and candidate.received_date:
        d1 = ensure_utc(target_case.received_date)
        d2 = ensure_utc(candidate.received_date)
        if d1 and d2:
            diff_days = abs((d1 - d2).days)
            if diff_days <= 180:
                score += 0.10
                rules_fired.append(f"Received within 180 days ({diff_days} days apart)")

    # 6. Same complainant type
    if target_case.complainant_type and candidate.complainant_type and target_case.complainant_type == candidate.complainant_type:
        score += 0.10
        rules_fired.append(f"Same Complainant Type ({target_case.complainant_type})")

    return min(1.0, score), rules_fired


async def detect_overlaps_for_case(db: AsyncSession, case: Case) -> Optional[OverlapGroup]:
    """
    Evaluates overlap between the given case and candidate open cases of the same institution.
    Creates or updates OverlapGroup if score >= 0.55.
    """
    if not case.institution_id:
        return None

    # Ensure target case has embedding
    if case.embedding is None:
        text = f"{case.title} {case.description}"
        case.embedding = compute_embedding(text)
        await db.flush()

    # Candidate blocking: fetch other open cases of same institution with different ID
    stmt = (
        select(Case)
        .where(
            and_(
                Case.institution_id == case.institution_id,
                Case.id != case.id,
                Case.status != "Disposed",
                Case.is_deleted == False
            )
        )
    )
    result = await db.execute(stmt)
    candidates = result.scalars().all()

    if not candidates:
        return None

    target_embedding = list(case.embedding) if case.embedding is not None else compute_embedding(f"{case.title} {case.description}")

    best_group = None
    highest_score = 0.0

    for candidate in candidates:
        # Check if already dismissed between these two cases
        check_dismiss = await db.execute(
            select(OverlapGroup)
            .join(OverlapMember, OverlapMember.group_id == OverlapGroup.id)
            .where(
                OverlapGroup.institution_id == case.institution_id,
                OverlapGroup.status == "Dismissed",
                OverlapMember.case_id.in_([case.id, candidate.id])
            )
        )
        if check_dismiss.first():
            continue

        if candidate.embedding is None:
            candidate.embedding = compute_embedding(f"{candidate.title} {candidate.description}")
            await db.flush()

        cand_embedding = list(candidate.embedding)
        semantic_score = cosine_similarity(target_embedding, cand_embedding)
        rule_score, rules_fired = compute_rule_score(case, candidate)

        # Final score = 0.4 * rule + 0.6 * semantic
        final_score = (0.4 * rule_score) + (0.6 * semantic_score)

        if final_score >= settings.SIMILARITY_MEDIUM_THRESHOLD:
            severity = "High" if final_score >= settings.SIMILARITY_HIGH_THRESHOLD else "Medium"
            explanation = (
                f"Overlap detected with {final_score * 100:.1f}% confidence "
                f"(Semantic: {semantic_score * 100:.1f}%, Rule: {rule_score * 100:.1f}%). "
                f"Involves Case {case.case_number} and Case {candidate.case_number}."
            )

            # Check if an existing open overlap group exists for this institution
            existing_grp_res = await db.execute(
                select(OverlapGroup).where(
                    OverlapGroup.institution_id == case.institution_id,
                    OverlapGroup.status == "Open"
                )
            )
            overlap_grp = existing_grp_res.scalars().first()

            if not overlap_grp:
                overlap_grp = OverlapGroup(
                    institution_id=case.institution_id,
                    score=round(final_score, 4),
                    rule_score=round(rule_score, 4),
                    semantic_score=round(semantic_score, 4),
                    severity=severity,
                    status="Open",
                    explanation=explanation,
                    rules_fired=rules_fired
                )
                db.add(overlap_grp)
                await db.flush()

                # Add primary and secondary members
                m1 = OverlapMember(
                    group_id=overlap_grp.id,
                    case_id=candidate.id,
                    role="primary",
                    similarity_score=round(final_score, 4)
                )
                m2 = OverlapMember(
                    group_id=overlap_grp.id,
                    case_id=case.id,
                    role="secondary",
                    similarity_score=round(final_score, 4)
                )
                db.add_all([m1, m2])
                await db.flush()
            else:
                # Add case if not member
                mem_chk = await db.execute(
                    select(OverlapMember).where(
                        OverlapMember.group_id == overlap_grp.id,
                        OverlapMember.case_id == case.id
                    )
                )
                if not mem_chk.scalars().first():
                    m = OverlapMember(
                        group_id=overlap_grp.id,
                        case_id=case.id,
                        role="secondary",
                        similarity_score=round(final_score, 4)
                    )
                    db.add(m)
                    # Update group score if higher
                    if final_score > overlap_grp.score:
                        overlap_grp.score = round(final_score, 4)
                        overlap_grp.severity = severity
                        overlap_grp.explanation = explanation
                    await db.flush()

            if final_score > highest_score:
                highest_score = final_score
                best_group = overlap_grp

    return best_group
