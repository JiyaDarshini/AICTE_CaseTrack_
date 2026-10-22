import pytest
from starlette.testclient import TestClient
from app.main import app
from app.database import SyncSessionLocal
from app.models import User, Case, BureauCell, Institution
from app.services.auth_service import create_access_token


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_pgrc_rbac_scoping(client):
    with SyncSessionLocal() as db:
        pgrc_user = db.query(User).filter_by(role="PGRC").first()
        rb_bureau = db.query(BureauCell).filter_by(code="RB").first()
        rb_case = db.query(Case).filter_by(current_bureau_id=rb_bureau.id, is_deleted=False).first()
        user_id = str(pgrc_user.id)
        role = pgrc_user.role
        email = pgrc_user.email
        rb_case_id = str(rb_case.id)

    token = create_access_token({"sub": user_id, "role": role, "email": email})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Dashboard summary
    sum_res = client.get("/api/v1/dashboard/summary", headers=headers)
    assert sum_res.status_code == 200
    sum_data = sum_res.json()
    assert "total_cases" in sum_data
    assert "due_in_5_days" in sum_data

    # 2. Cases list - only PGRC cases returned
    cases_res = client.get("/api/v1/cases?limit=25", headers=headers)
    assert cases_res.status_code == 200
    cases_data = cases_res.json()
    for c in cases_data:
        assert c["current_bureau_code"] == "PGRC"

    # 3. Reading out-of-scope RB case directly MUST return 403 Forbidden
    detail_res = client.get(f"/api/v1/cases/{rb_case_id}", headers=headers)
    assert detail_res.status_code == 403

    # 4. Updating status on out-of-scope RB case MUST return 403 Forbidden
    status_res = client.patch(
        f"/api/v1/cases/{rb_case_id}/status",
        json={"status": "Under Process", "remarks": "Unauthorized status update test"},
        headers=headers
    )
    assert status_res.status_code == 403


def test_rb_rbac_scoping(client):
    with SyncSessionLocal() as db:
        rb_user = db.query(User).filter_by(role="RB").first()
        pgrc_bureau = db.query(BureauCell).filter_by(code="PGRC").first()
        pgrc_case = db.query(Case).filter_by(current_bureau_id=pgrc_bureau.id, is_deleted=False).first()
        user_id = str(rb_user.id)
        role = rb_user.role
        email = rb_user.email
        pgrc_case_id = str(pgrc_case.id)

    token = create_access_token({"sub": user_id, "role": role, "email": email})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Dashboard summary
    sum_res = client.get("/api/v1/dashboard/summary", headers=headers)
    assert sum_res.status_code == 200

    # 2. Cases list - only RB cases returned
    cases_res = client.get("/api/v1/cases?limit=25", headers=headers)
    assert cases_res.status_code == 200
    cases_data = cases_res.json()
    for c in cases_data:
        assert c["current_bureau_code"] == "RB"

    # 3. Reading out-of-scope PGRC case directly MUST return 403 Forbidden
    detail_res = client.get(f"/api/v1/cases/{pgrc_case_id}", headers=headers)
    assert detail_res.status_code == 403

    # 4. Updating status on out-of-scope PGRC case MUST return 403 Forbidden
    status_res = client.patch(
        f"/api/v1/cases/{pgrc_case_id}/status",
        json={"status": "Under Process", "remarks": "Unauthorized status update test"},
        headers=headers
    )
    assert status_res.status_code == 403


def test_regional_office_rbac_scoping(client):
    with SyncSessionLocal() as db:
        ro_user = db.query(User).filter_by(role="Regional Office", region="Northern").first()
        other_inst = db.query(Institution).filter(Institution.region != "Northern", Institution.is_deleted == False).first()
        other_case = db.query(Case).filter_by(institution_id=other_inst.id, is_deleted=False).first()
        user_id = str(ro_user.id)
        role = ro_user.role
        email = ro_user.email
        other_case_id = str(other_case.id)

    token = create_access_token({"sub": user_id, "role": role, "email": email})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Dashboard summary
    sum_res = client.get("/api/v1/dashboard/summary", headers=headers)
    assert sum_res.status_code == 200

    # 2. Cases list - only Northern cases returned
    cases_res = client.get("/api/v1/cases?limit=25", headers=headers)
    assert cases_res.status_code == 200
    cases_data = cases_res.json()
    for c in cases_data:
        assert c["institution_region"] == "Northern"

    # 3. Reading out-of-region case directly MUST return 403 Forbidden
    detail_res = client.get(f"/api/v1/cases/{other_case_id}", headers=headers)
    assert detail_res.status_code == 403

    # 4. Regional Office cannot update status directly -> 403 Forbidden
    status_res = client.patch(
        f"/api/v1/cases/{other_case_id}/status",
        json={"status": "Under Process", "remarks": "Regional office status change"},
        headers=headers
    )
    assert status_res.status_code == 403


def test_senior_manager_and_admin_scoping(client):
    with SyncSessionLocal() as db:
        admin_user = db.query(User).filter_by(role="Admin").first()
        sm_user = db.query(User).filter_by(role="Senior Manager").first()
        admin_info = (str(admin_user.id), admin_user.role, admin_user.email)
        sm_info = (str(sm_user.id), sm_user.role, sm_user.email)

    for uid, role, email in [admin_info, sm_info]:
        token = create_access_token({"sub": uid, "role": role, "email": email})
        headers = {"Authorization": f"Bearer {token}"}

        sum_res = client.get("/api/v1/dashboard/summary", headers=headers)
        assert sum_res.status_code == 200

        cases_res = client.get("/api/v1/cases?limit=50", headers=headers)
        assert cases_res.status_code == 200
        bureaus = set(c["current_bureau_code"] for c in cases_res.json() if c["current_bureau_code"])
        assert len(bureaus) >= 1
