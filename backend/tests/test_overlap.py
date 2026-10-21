import pytest
from app.services.overlap_service import compute_embedding, cosine_similarity, compute_rule_score
from app.models import Case
from datetime import datetime, timezone, timedelta
import uuid


def test_embedding_generation():
    text = "Students complaining about arbitrary fee hikes and withholding semester hall tickets"
    vec = compute_embedding(text)
    assert isinstance(vec, list)
    assert len(vec) == 384
    assert any(x != 0 for x in vec)


def test_cosine_similarity_identical_and_orthogonal():
    v1 = [1.0] * 384
    assert abs(cosine_similarity(v1, v1) - 1.0) < 1e-4

    v_zero = [0.0] * 384
    assert cosine_similarity(v1, v_zero) == 0.0


def test_rule_score_same_institution_and_different_bureau():
    inst_id = uuid.uuid4()
    bureau1 = uuid.uuid4()
    bureau2 = uuid.uuid4()
    now = datetime.now(timezone.utc)

    case1 = Case(
        id=uuid.uuid4(),
        case_number="AICTE-PGRC-001",
        institution_id=inst_id,
        current_bureau_id=bureau1,
        status="Under Process",
        category="Admission & Capitation Fee",
        complainant_type="Student",
        received_date=now
    )

    case2 = Case(
        id=uuid.uuid4(),
        case_number="AICTE-RB-002",
        institution_id=inst_id,
        current_bureau_id=bureau2,
        status="Under Process",
        category="Admission & Capitation Fee",
        complainant_type="Student",
        received_date=now + timedelta(days=10)
    )

    score, rules = compute_rule_score(case1, case2)
    # Same inst (0.2) + Diff bureau (0.25) + Both open (0.2) + Same cat (0.15) + Within 180d (0.1) + Same complainant (0.1) = 1.0
    assert score == 1.0
    assert len(rules) == 6
    assert any("Different Bureau" in r for r in rules)
    assert any("Exact Institution Match" in r for r in rules)


def test_rule_score_different_category_and_distant_date():
    inst_id = uuid.uuid4()
    bureau1 = uuid.uuid4()
    now = datetime.now(timezone.utc)

    case1 = Case(
        id=uuid.uuid4(),
        case_number="AICTE-PGRC-003",
        institution_id=inst_id,
        current_bureau_id=bureau1,
        status="Under Process",
        category="Faculty Grievance",
        complainant_type="Faculty",
        received_date=now
    )

    case2 = Case(
        id=uuid.uuid4(),
        case_number="AICTE-PGRC-004",
        institution_id=inst_id,
        current_bureau_id=bureau1,
        status="Disposed",
        category="Ragging",
        complainant_type="Student",
        received_date=now - timedelta(days=300)
    )

    score, rules = compute_rule_score(case1, case2)
    # Only Same institution matches (0.20)
    assert score == 0.20
