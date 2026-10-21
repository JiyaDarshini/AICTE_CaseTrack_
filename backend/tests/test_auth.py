import pytest
from app.services.auth_service import verify_password, get_password_hash, create_access_token, create_refresh_token
from jose import jwt
from app.config import settings


def test_password_hashing():
    pwd = "SecretPassword123!"
    hashed = get_password_hash(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_jwt_tokens():
    data = {"sub": "user-uuid-123", "role": "Admin", "email": "admin@aicte.gov.in"}
    token = create_access_token(data)
    decoded = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])

    assert decoded["sub"] == "user-uuid-123"
    assert decoded["role"] == "Admin"
    assert decoded["type"] == "access"
    assert "exp" in decoded

    refresh = create_refresh_token(data)
    decoded_refresh = jwt.decode(refresh, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    assert decoded_refresh["type"] == "refresh"
