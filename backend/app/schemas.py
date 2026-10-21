from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID


# ==================== AUTH SCHEMAS ====================
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = Field(..., description="Admin, Senior Manager, PGRC, RB, Regional Office")
    bureau_cell_id: Optional[UUID] = None
    region: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: str
    role: str
    bureau_cell_id: Optional[str] = None
    region: Optional[str] = None
    exp: int


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: str
    role: str
    bureau_cell_id: Optional[UUID] = None
    region: Optional[str] = None
    is_active: bool
    is_approved: bool
    created_at: datetime


class UserApprovalUpdate(BaseModel):
    is_approved: bool
    role: Optional[str] = None
    bureau_cell_id: Optional[UUID] = None
    region: Optional[str] = None


# ==================== BUREAU / CELL SCHEMAS ====================
class BureauCellResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    name: str
    created_at: datetime


# ==================== INSTITUTION SCHEMAS ====================
class InstitutionCreate(BaseModel):
    aicte_permanent_id: str = Field(..., min_length=3, max_length=50)
    name: str = Field(..., min_length=2, max_length=255)
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    region: str
    type: Optional[str] = "Engineering & Technology"
    status: Optional[str] = "Active"


class InstitutionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    aicte_permanent_id: str
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    region: str
    type: Optional[str] = None
    status: str
    created_at: datetime


class InstitutionDetailResponse(InstitutionResponse):
    total_cases: int = 0
    open_cases: int = 0
    disposed_cases: int = 0
    bureaus_involved: List[str] = []
    cases: List[Dict[str, Any]] = []


# ==================== CASE SCHEMAS ====================
class CaseCreate(BaseModel):
    case_number: Optional[str] = None
    aicte_permanent_id: str
    category: str
    title: str = Field(..., min_length=5, max_length=255)
    description: str = Field(..., min_length=10)
    complainant_type: Optional[str] = "Student"
    complainant_name: Optional[str] = None
    received_date: Optional[datetime] = None
    current_bureau_code: Optional[str] = None  # RB, PGRC, etc.
    sla_days: Optional[int] = 30
    source: Optional[str] = "Direct Intake"


class CaseStatusUpdate(BaseModel):
    status: str = Field(..., description="Pending, Under Process, Disposed, Transferred, Escalated")
    remarks: str = Field(..., min_length=3)
    next_action: Optional[str] = None


class CaseActionCreate(BaseModel):
    action_type: str = Field(..., description="Status Update, Transfer, Escalation, Document Upload, Remarks")
    remarks: str = Field(..., min_length=3)
    document_url: Optional[str] = None
    to_bureau_id: Optional[UUID] = None


class CaseTransferRequest(BaseModel):
    to_bureau_code: str  # e.g., "RB" or "PGRC"
    remarks: str = Field(..., min_length=3)


class CaseEscalateRequest(BaseModel):
    remarks: str = Field(..., min_length=3)
    escalation_reason: Optional[str] = None


class CaseActionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    case_id: UUID
    bureau_id: Optional[UUID] = None
    officer_id: Optional[UUID] = None
    officer_name: Optional[str] = None
    bureau_code: Optional[str] = None
    from_bureau_code: Optional[str] = None
    to_bureau_code: Optional[str] = None
    action_type: str
    remarks: str
    document_url: Optional[str] = None
    created_at: datetime


class CaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    case_number: str
    institution_id: UUID
    institution_name: Optional[str] = None
    aicte_permanent_id: Optional[str] = None
    institution_region: Optional[str] = None
    category: str
    title: str
    description: str
    complainant_type: Optional[str] = None
    received_date: datetime
    status: str
    current_bureau_id: Optional[UUID] = None
    current_bureau_code: Optional[str] = None
    assigned_officer_id: Optional[UUID] = None
    assigned_officer_name: Optional[str] = None
    last_action: Optional[str] = None
    next_action: Optional[str] = None
    last_action_date: Optional[datetime] = None
    expected_disposal_date: Optional[datetime] = None
    sla_days: int
    source: str
    is_overdue: bool = False
    days_remaining: Optional[int] = None
    overlap_count: int = 0
    created_at: datetime
    updated_at: datetime


class CaseDetailResponse(CaseResponse):
    actions: List[CaseActionResponse] = []
    overlapping_cases: List[Dict[str, Any]] = []


# ==================== OVERLAP SCHEMAS ====================
class OverlapReviewRequest(BaseModel):
    action: str = Field(..., description="Link, Merge, Dismiss")
    primary_case_id: Optional[UUID] = None  # required for Merge
    remarks: str = Field(..., min_length=3, description="Mandatory remarks/reason for audit log")


class OverlapMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    case_id: UUID
    case_number: Optional[str] = None
    case_title: Optional[str] = None
    case_status: Optional[str] = None
    bureau_code: Optional[str] = None
    category: Optional[str] = None
    role: str
    similarity_score: Optional[float] = None


class OverlapGroupResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    institution_id: UUID
    institution_name: Optional[str] = None
    aicte_permanent_id: Optional[str] = None
    score: float
    rule_score: float
    semantic_score: float
    severity: str
    status: str
    explanation: Optional[str] = None
    rules_fired: Optional[List[str]] = None
    dismiss_reason: Optional[str] = None
    created_at: datetime
    members: List[OverlapMemberResponse] = []


# ==================== NOTIFICATION SCHEMAS ====================
class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    type: str
    title: str
    body: str
    case_id: Optional[UUID] = None
    is_read: bool
    created_at: datetime


# ==================== SLA CONFIG SCHEMAS ====================
class SLAConfigCreate(BaseModel):
    category: str
    sla_days: int
    warn_before_days: int = 5


class SLAConfigResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    category: str
    sla_days: int
    warn_before_days: int
    created_at: datetime


# ==================== INGESTION SCHEMAS ====================
class IngestAPIRequest(BaseModel):
    aicte_permanent_id: str
    category: str
    title: str
    description: str
    complainant_type: Optional[str] = "Student"
    bureau_code: str  # e.g., RB or PGRC
    received_date: Optional[datetime] = None
    source: Optional[str] = "API Ingestion"


class IngestionJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    filename: str
    total: int
    accepted: int
    rejected: int
    error_report_url: Optional[str] = None
    status: str
    created_at: datetime


# ==================== DASHBOARD SCHEMAS ====================
class DashboardSummaryResponse(BaseModel):
    total_cases: int
    pending_cases: int
    under_process_cases: int
    disposed_cases: int
    transferred_cases: int
    escalated_cases: int
    overdue_cases: int
    active_overlaps: int
    sla_compliance_rate: float


class AgeingBucket(BaseModel):
    bucket: str
    count: int


class BureauWorkloadItem(BaseModel):
    bureau_code: str
    bureau_name: str
    total: int
    pending: int
    under_process: int
    disposed: int
    transferred: int
    escalated: int
    overdue: int


class TopInstitutionItem(BaseModel):
    id: UUID
    aicte_permanent_id: str
    name: str
    region: str
    open_cases: int
    total_cases: int
    active_overlaps: int
