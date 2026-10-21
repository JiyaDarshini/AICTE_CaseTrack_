"""Initial schema with vector and case tables

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-21 19:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB
from pgvector.sqlalchemy import Vector

revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    # 1. bureaus_cells
    op.create_table(
        'bureaus_cells',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('code', sa.String(50), nullable=False, unique=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    # 2. users
    op.create_table(
        'users',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('role', sa.String(50), nullable=False),
        sa.Column('bureau_cell_id', UUID(as_uuid=True), sa.ForeignKey('bureaus_cells.id', ondelete='SET NULL'), nullable=True),
        sa.Column('region', sa.String(100), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('is_approved', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_users_email', 'users', ['email'])

    # 3. institutions
    op.create_table(
        'institutions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('aicte_permanent_id', sa.String(100), nullable=False, unique=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('city', sa.String(100), nullable=True),
        sa.Column('state', sa.String(100), nullable=True),
        sa.Column('region', sa.String(100), nullable=False),
        sa.Column('type', sa.String(100), nullable=True),
        sa.Column('status', sa.String(50), server_default='Active', nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_institutions_aicte_permanent_id', 'institutions', ['aicte_permanent_id'])
    op.create_index('ix_institutions_name', 'institutions', ['name'])

    # 4. cases
    op.create_table(
        'cases',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('case_number', sa.String(100), nullable=False, unique=True),
        sa.Column('institution_id', UUID(as_uuid=True), sa.ForeignKey('institutions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('category', sa.String(100), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('complainant_type', sa.String(100), nullable=True),
        sa.Column('complainant_name', sa.String(255), nullable=True),
        sa.Column('received_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('status', sa.String(50), server_default='Pending', nullable=False),
        sa.Column('current_bureau_id', UUID(as_uuid=True), sa.ForeignKey('bureaus_cells.id', ondelete='SET NULL'), nullable=True),
        sa.Column('assigned_officer_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('last_action', sa.String(255), nullable=True),
        sa.Column('next_action', sa.String(255), nullable=True),
        sa.Column('last_action_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expected_disposal_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('sla_days', sa.Integer(), server_default='30', nullable=False),
        sa.Column('embedding', Vector(384), nullable=True),
        sa.Column('source', sa.String(100), server_default='Direct Intake', nullable=False),
        sa.Column('merged_into_case_id', UUID(as_uuid=True), sa.ForeignKey('cases.id', ondelete='SET NULL'), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_cases_case_number', 'cases', ['case_number'])
    op.create_index('ix_cases_institution_id', 'cases', ['institution_id'])
    op.create_index('ix_cases_status', 'cases', ['status'])
    op.create_index('ix_cases_current_bureau_id', 'cases', ['current_bureau_id'])
    op.create_index('ix_cases_received_date', 'cases', ['received_date'])
    op.create_index('ix_cases_expected_disposal_date', 'cases', ['expected_disposal_date'])
    op.create_index('ix_cases_current_bureau_status', 'cases', ['current_bureau_id', 'status'])

    # 5. case_actions
    op.create_table(
        'case_actions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('case_id', UUID(as_uuid=True), sa.ForeignKey('cases.id', ondelete='CASCADE'), nullable=False),
        sa.Column('bureau_id', UUID(as_uuid=True), sa.ForeignKey('bureaus_cells.id', ondelete='SET NULL'), nullable=True),
        sa.Column('officer_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('action_type', sa.String(100), nullable=False),
        sa.Column('remarks', sa.Text(), nullable=False),
        sa.Column('document_url', sa.String(500), nullable=True),
        sa.Column('from_bureau_id', UUID(as_uuid=True), sa.ForeignKey('bureaus_cells.id', ondelete='SET NULL'), nullable=True),
        sa.Column('to_bureau_id', UUID(as_uuid=True), sa.ForeignKey('bureaus_cells.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_case_actions_case_id', 'case_actions', ['case_id'])
    op.create_index('ix_case_actions_case_created', 'case_actions', ['case_id', 'created_at'])

    # 6. overlap_groups
    op.create_table(
        'overlap_groups',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('institution_id', UUID(as_uuid=True), sa.ForeignKey('institutions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('score', sa.Float(), nullable=False),
        sa.Column('rule_score', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('semantic_score', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('severity', sa.String(50), nullable=False),
        sa.Column('status', sa.String(50), server_default='Open', nullable=False),
        sa.Column('explanation', sa.Text(), nullable=True),
        sa.Column('rules_fired', JSONB, nullable=True),
        sa.Column('dismiss_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_overlap_groups_institution_id', 'overlap_groups', ['institution_id'])
    op.create_index('ix_overlap_groups_status', 'overlap_groups', ['status'])

    # 7. overlap_members
    op.create_table(
        'overlap_members',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('group_id', UUID(as_uuid=True), sa.ForeignKey('overlap_groups.id', ondelete='CASCADE'), nullable=False),
        sa.Column('case_id', UUID(as_uuid=True), sa.ForeignKey('cases.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(50), server_default='secondary', nullable=False),
        sa.Column('similarity_score', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_overlap_members_group_id', 'overlap_members', ['group_id'])
    op.create_index('ix_overlap_members_case_id', 'overlap_members', ['case_id'])

    # 8. audit_log
    op.create_table(
        'audit_log',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), nullable=True),
        sa.Column('user_email', sa.String(255), nullable=True),
        sa.Column('role', sa.String(100), nullable=True),
        sa.Column('entity', sa.String(100), nullable=False),
        sa.Column('entity_id', sa.String(100), nullable=False),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('old_value', JSONB, nullable=True),
        sa.Column('new_value', JSONB, nullable=True),
        sa.Column('ip', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_audit_log_created_at', 'audit_log', ['created_at'])

    # 9. notifications
    op.create_table(
        'notifications',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('type', sa.String(100), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('case_id', UUID(as_uuid=True), sa.ForeignKey('cases.id', ondelete='CASCADE'), nullable=True),
        sa.Column('is_read', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])
    op.create_index('ix_notifications_user_read', 'notifications', ['user_id', 'is_read'])

    # 10. sla_config
    op.create_table(
        'sla_config',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('category', sa.String(100), nullable=False, unique=True),
        sa.Column('sla_days', sa.Integer(), server_default='30', nullable=False),
        sa.Column('warn_before_days', sa.Integer(), server_default='5', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    # 11. ingestion_jobs
    op.create_table(
        'ingestion_jobs',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('total', sa.Integer(), server_default='0', nullable=False),
        sa.Column('accepted', sa.Integer(), server_default='0', nullable=False),
        sa.Column('rejected', sa.Integer(), server_default='0', nullable=False),
        sa.Column('error_report_url', sa.String(500), nullable=True),
        sa.Column('error_details', JSONB, nullable=True),
        sa.Column('status', sa.String(50), server_default='Processing', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('ingestion_jobs')
    op.drop_table('sla_config')
    op.drop_table('notifications')
    op.drop_table('audit_log')
    op.drop_table('overlap_members')
    op.drop_table('overlap_groups')
    op.drop_table('case_actions')
    op.drop_table('cases')
    op.drop_table('institutions')
    op.drop_table('users')
    op.drop_table('bureaus_cells')
