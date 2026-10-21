import io
import pytest
import pandas as pd
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.auth_service import create_access_token


@pytest.mark.asyncio
async def test_institutions_import_unauthorized():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Non-admin or unauthenticated
        res = await client.post("/api/v1/institutions/import")
        assert res.status_code in (401, 403)


@pytest.mark.asyncio
async def test_institutions_import_non_admin_forbidden():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # User with 'PGRC' role instead of Admin
        token = create_access_token({"sub": "00000000-0000-0000-0000-000000000001", "role": "PGRC"})
        res = await client.post(
            "/api/v1/institutions/import",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res.status_code in (401, 403)
