from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import jwt, JWTError
from app.database import get_db
from app.models import User, BureauCell
from app.schemas import UserRegister, UserLogin, Token, UserResponse
from app.services.auth_service import (
    verify_password, get_password_hash,
    create_access_token, create_refresh_token,
    get_current_user
)
from app.services.audit_service import create_audit_log
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(req: UserRegister, request: Request, db: AsyncSession = Depends(get_db)):
    # Check duplicate email
    res = await db.execute(select(User).where(User.email == req.email.lower()))
    if res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    # First user can be auto-approved admin, subsequent users require approval
    count_res = await db.execute(select(User))
    is_first_user = count_res.first() is None

    new_user = User(
        name=req.name,
        email=req.email.lower(),
        password_hash=get_password_hash(req.password),
        role=req.role if not is_first_user else "Admin",
        bureau_cell_id=req.bureau_cell_id,
        region=req.region,
        is_active=True,
        is_approved=is_first_user  # First user auto-approved
    )
    db.add(new_user)
    await db.flush()

    await create_audit_log(
        db=db,
        user=new_user,
        entity="User",
        entity_id=str(new_user.id),
        action="User Registered",
        new_value={"email": new_user.email, "role": new_user.role, "is_approved": new_user.is_approved},
        ip=request.client.host if request.client else None
    )
    await db.commit()
    await db.refresh(new_user)
    return new_user


@router.post("/login", response_model=Token)
async def login(req: UserLogin, request: Request, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.email == req.email.lower()))
    user = res.scalar_one_or_none()

    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated."
        )

    if not user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending Admin approval. Please contact the AICTE system administrator."
        )

    access_token = create_access_token(data={
        "sub": str(user.id),
        "role": user.role,
        "email": user.email,
        "region": user.region,
        "bureau_cell_id": str(user.bureau_cell_id) if user.bureau_cell_id else None
    })
    refresh_token = create_refresh_token(data={
        "sub": str(user.id),
        "role": user.role
    })

    await create_audit_log(
        db=db,
        user=user,
        entity="User",
        entity_id=str(user.id),
        action="User Login",
        ip=request.client.host if request.client else None
    )
    await db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.post("/refresh", response_model=Token)
async def refresh_token(token_data: dict, db: AsyncSession = Depends(get_db)):
    token = token_data.get("refresh_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="refresh_token required")
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("sub")
        token_type = payload.get("type")
        if not user_id or token_type != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Expired or invalid refresh token")

    res = await db.execute(select(User).where(User.id == user_id, User.is_active == True, User.is_approved == True))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    new_access_token = create_access_token(data={
        "sub": str(user.id),
        "role": user.role,
        "email": user.email,
        "region": user.region,
        "bureau_cell_id": str(user.bureau_cell_id) if user.bureau_cell_id else None
    })
    new_refresh_token = create_refresh_token(data={"sub": str(user.id), "role": user.role})

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
