import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime,
    ForeignKey, Enum, Index, func
)
from sqlalchemy.orm import relationship
from sqlalchemy.types import TypeDecorator, CHAR, JSON
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB as PG_JSONB
from app.database import Base
import enum


class GUID(TypeDecorator):
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        return value if dialect.name == "postgresql" else str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if not isinstance(value, uuid.UUID):
            try:
                return uuid.UUID(str(value))
            except Exception:
                return value
        return value


class UUID(GUID):
    cache_ok = True

    def __init__(self, as_uuid=True, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.as_uuid = as_uuid


class UniversalJSON(TypeDecorator):
    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_JSONB())
        return dialect.type_descriptor(JSON())


class JSONB(UniversalJSON):
    pass


class UniversalVector(TypeDecorator):
    impl = JSON
    cache_ok = True

    def __init__(self, dim=384, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.dim = dim

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            try:
                from pgvector.sqlalchemy import Vector as PG_Vector
                return dialect.type_descriptor(PG_Vector(self.dim))
            except Exception:
                pass
        return dialect.type_descriptor(JSON())


class Vector(UniversalVector):
    pass


class RoleEnum(str, enum.Enum):
    ADMIN = "Admin"
    SENIOR_MANAGER = "Senior Manager"
    PGRC = "PGRC"
    RB = "RB"
    REGIONAL_OFFICE = "Regional Office"


class CaseStatusEnum(str, enum.Enum):
    PENDING = "Pending"
    UNDER_PROCESS = "Under Process"
    DISPOSED = "Disposed"
    TRANSFERRED = "Transferred"
    ESCALATED = "Escalated"


class OverlapStatusEnum(str, enum.Enum):
    OPEN = "Open"
    LINKED = "Linked"
    MERGED = "Merged"
    DISMISSED = "Dismissed"


class OverlapRoleEnum(str, enum.Enum):
    PRIMARY = "primary"
    SECONDARY = "secondary"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # Admin, Senior Manager, PGRC, RB, Regional Office
    bureau_cell_id = Column(UUID(as_uuid=True), ForeignKey("bureaus_cells.id", ondelete="SET NULL"), nullable=True)
    region = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_approved = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)

    bureau = relationship("BureauCell", back_populates="users")
    actions = relationship("CaseAction", back_populates="officer")
    notifications = relationship("Notification", back_populates="user")


class BureauCell(Base):
    __tablename__ = "bureaus_cells"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(50), unique=True, nullable=False)  # RB, PGRC, etc.
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)

    users = relationship("User", back_populates="bureau")
    cases = relationship("Case", foreign_keys="Case.current_bureau_id", back_populates="current_bureau")


class Institution(Base):
    __tablename__ = "institutions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    aicte_permanent_id = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    region = Column(String(100), nullable=False)
    type = Column(String(100), nullable=True)  # Engineering, Management, Pharmacy, etc.
    status = Column(String(50), default="Active", nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)

    cases = relationship("Case", back_populates="institution")
    overlap_groups = relationship("OverlapGroup", back_populates="institution")


class Case(Base):
    __tablename__ = "cases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_number = Column(String(100), unique=True, nullable=False, index=True)
    institution_id = Column(UUID(as_uuid=True), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    complainant_type = Column(String(100), nullable=True)  # Student, Faculty, Parent, Anonymous, Other
    complainant_name = Column(String(255), nullable=True)
    received_date = Column(DateTime(timezone=True), nullable=False, index=True)
    status = Column(String(50), default="Pending", nullable=False, index=True)
    current_bureau_id = Column(UUID(as_uuid=True), ForeignKey("bureaus_cells.id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_officer_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    last_action = Column(String(255), nullable=True)
    next_action = Column(String(255), nullable=True)
    last_action_date = Column(DateTime(timezone=True), nullable=True)
    expected_disposal_date = Column(DateTime(timezone=True), nullable=True, index=True)
    sla_days = Column(Integer, default=30, nullable=False)
    embedding = Column(Vector(384), nullable=True)
    source = Column(String(100), default="Direct Intake", nullable=False)  # Portal, Ingestion, API
    merged_into_case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="SET NULL"), nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)

    institution = relationship("Institution", back_populates="cases")
    current_bureau = relationship("BureauCell", foreign_keys=[current_bureau_id], back_populates="cases")
    assigned_officer = relationship("User", foreign_keys=[assigned_officer_id])
    actions = relationship("CaseAction", back_populates="case", cascade="all, delete-orphan", order_by="CaseAction.created_at.desc()")
    overlap_memberships = relationship("OverlapMember", back_populates="case", cascade="all, delete-orphan")


class CaseAction(Base):
    __tablename__ = "case_actions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    bureau_id = Column(UUID(as_uuid=True), ForeignKey("bureaus_cells.id", ondelete="SET NULL"), nullable=True)
    officer_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action_type = Column(String(100), nullable=False)  # Status Update, Transfer, Escalation, Document Upload, Overlap Resolution
    remarks = Column(Text, nullable=False)
    document_url = Column(String(500), nullable=True)
    from_bureau_id = Column(UUID(as_uuid=True), ForeignKey("bureaus_cells.id", ondelete="SET NULL"), nullable=True)
    to_bureau_id = Column(UUID(as_uuid=True), ForeignKey("bureaus_cells.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False, index=True)

    case = relationship("Case", back_populates="actions")
    officer = relationship("User", back_populates="actions")
    bureau = relationship("BureauCell", foreign_keys=[bureau_id])
    from_bureau = relationship("BureauCell", foreign_keys=[from_bureau_id])
    to_bureau = relationship("BureauCell", foreign_keys=[to_bureau_id])


class OverlapGroup(Base):
    __tablename__ = "overlap_groups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    institution_id = Column(UUID(as_uuid=True), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    score = Column(Float, nullable=False)
    rule_score = Column(Float, default=0.0, nullable=False)
    semantic_score = Column(Float, default=0.0, nullable=False)
    severity = Column(String(50), nullable=False)  # High, Medium
    status = Column(String(50), default="Open", nullable=False, index=True)  # Open, Linked, Merged, Dismissed
    explanation = Column(Text, nullable=True)
    rules_fired = Column(JSONB, nullable=True)
    dismiss_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)

    institution = relationship("Institution", back_populates="overlap_groups")
    members = relationship("OverlapMember", back_populates="group", cascade="all, delete-orphan")


class OverlapMember(Base):
    __tablename__ = "overlap_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey("overlap_groups.id", ondelete="CASCADE"), nullable=False, index=True)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(50), default="secondary", nullable=False)  # primary, secondary
    similarity_score = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

    group = relationship("OverlapGroup", back_populates="members")
    case = relationship("Case", back_populates="overlap_memberships")


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=True)
    user_email = Column(String(255), nullable=True)
    role = Column(String(100), nullable=True)
    entity = Column(String(100), nullable=False)
    entity_id = Column(String(100), nullable=False)
    action = Column(String(100), nullable=False)
    old_value = Column(JSONB, nullable=True)
    new_value = Column(JSONB, nullable=True)
    ip = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False, index=True)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(100), nullable=False)  # SLA_WARNING, SLA_BREACH, OVERLAP_ALERT, REMINDER, ESCALATION
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=True)
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

    user = relationship("User", back_populates="notifications")
    case = relationship("Case")


class SLAConfig(Base):
    __tablename__ = "sla_config"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category = Column(String(100), unique=True, nullable=False)
    sla_days = Column(Integer, default=30, nullable=False)
    warn_before_days = Column(Integer, default=5, nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)


class IngestionJob(Base):
    __tablename__ = "ingestion_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    filename = Column(String(255), nullable=False)
    total = Column(Integer, default=0, nullable=False)
    accepted = Column(Integer, default=0, nullable=False)
    rejected = Column(Integer, default=0, nullable=False)
    error_report_url = Column(String(500), nullable=True)
    error_details = Column(JSONB, nullable=True)
    status = Column(String(50), default="Processing", nullable=False)  # Processing, Completed, Failed
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)


# Required Indexes
Index("ix_cases_current_bureau_status", Case.current_bureau_id, Case.status)
Index("ix_case_actions_case_created", CaseAction.case_id, CaseAction.created_at)
Index("ix_notifications_user_read", Notification.user_id, Notification.is_read)
