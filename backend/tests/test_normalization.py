import pytest
from app.services.ingest_service import normalize_aicte_id, normalize_text, parse_date
from datetime import datetime, timezone


def test_normalize_aicte_id():
    assert normalize_aicte_id(" 1-1002341 ") == "1-1002341"
    assert normalize_aicte_id("1-abc999") == "1-ABC999"
    assert normalize_aicte_id(None) == ""


def test_normalize_text():
    assert normalize_text("  Multiple   whitespace   characters   ") == "Multiple whitespace characters"
    assert normalize_text(None) == ""


def test_parse_date():
    dt = parse_date("2026-04-15")
    assert dt.year == 2026
    assert dt.month == 4
    assert dt.day == 15
    assert dt.tzinfo is not None
