import time
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.config import settings
from app.database import async_engine, Base
from app.routers import (
    auth, cases, institutions, overlaps,
    dashboard, alerts, reports, ingest, users
)
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("aicte_casetrack")

app = FastAPI(
    title="AICTE CaseTrack API",
    description="Integrated Institution Complaint Monitoring and Status Dashboard for AICTE Bureaus/Cells (SIH PS SIH26264)",
    version="1.0.0",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Security & Timing Middleware
@app.middleware("http")
async def add_security_and_timing_headers(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    return response


# Global Validation Error Handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation Error",
            "message": "Invalid input format or missing required fields",
            "details": exc.errors()
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "message": str(exc)
        }
    )


# Health Check Endpoints
@app.get("/healthz", tags=["Health"])
async def healthz():
    return {"status": "ok", "service": "AICTE CaseTrack API", "timestamp": time.time()}


@app.get("/readyz", tags=["Health"])
async def readyz():
    try:
        from sqlalchemy import text
        async with async_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "ready", "database": "Neon PostgreSQL Connected"}
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "not_ready", "error": str(e)}
        )


# Include Routers under API_V1_PREFIX
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(cases.router, prefix=settings.API_V1_PREFIX)
app.include_router(institutions.router, prefix=settings.API_V1_PREFIX)
app.include_router(overlaps.router, prefix=settings.API_V1_PREFIX)
app.include_router(dashboard.router, prefix=settings.API_V1_PREFIX)
app.include_router(alerts.router, prefix=settings.API_V1_PREFIX)
app.include_router(reports.router, prefix=settings.API_V1_PREFIX)
app.include_router(ingest.router, prefix=settings.API_V1_PREFIX)
app.include_router(users.router, prefix=settings.API_V1_PREFIX)


@app.on_event("startup")
async def on_startup():
    logger.info("Initializing AICTE CaseTrack database schema...")
    try:
        from sqlalchemy import text
        async with async_engine.begin() as conn:
            if async_engine.dialect.name == "postgresql":
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database schema initialized successfully.")

        try:
            from app.database import SyncSessionLocal
            from app.models import User
            from scripts.seed import seed
            import asyncio

            def check_and_seed():
                session = SyncSessionLocal()
                try:
                    has_users = session.query(User).first()
                    if not has_users:
                        logger.info("Empty database detected. Auto-seeding initial demo data...")
                        seed()
                finally:
                    session.close()

            await asyncio.to_thread(check_and_seed)
        except Exception as seed_err:
            logger.warning(f"Auto-seed check: {seed_err}")

    except Exception as e:
        logger.error(f"Error initializing schema: {e}")
