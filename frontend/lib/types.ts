export type Role = "Admin" | "Senior Manager" | "PGRC" | "RB" | "Regional Office";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  bureau_cell_id?: string | null;
  region?: string | null;
  is_active: boolean;
  is_approved: boolean;
  created_at: string;
}

export interface BureauCell {
  id: string;
  code: string;
  name: string;
  created_at: string;
}

export interface Case {
  id: string;
  case_number: string;
  institution_id: string;
  institution_name?: string;
  aicte_permanent_id?: string;
  institution_region?: string;
  category: string;
  title: string;
  description: string;
  complainant_type?: string;
  received_date: string;
  status: "Pending" | "Under Process" | "Disposed" | "Transferred" | "Escalated";
  current_bureau_id?: string | null;
  current_bureau_code?: string | null;
  assigned_officer_id?: string | null;
  assigned_officer_name?: string | null;
  last_action?: string | null;
  next_action?: string | null;
  last_action_date?: string | null;
  expected_disposal_date?: string | null;
  sla_days: number;
  source: string;
  is_overdue: boolean;
  days_remaining?: number | null;
  overlap_count: number;
  created_at: string;
  updated_at: string;
}

export interface CaseAction {
  id: string;
  case_id: string;
  bureau_id?: string | null;
  officer_id?: string | null;
  officer_name?: string | null;
  bureau_code?: string | null;
  from_bureau_code?: string | null;
  to_bureau_code?: string | null;
  action_type: string;
  remarks: string;
  document_url?: string | null;
  created_at: string;
}

export interface CaseDetail extends Case {
  actions: CaseAction[];
  overlapping_cases: {
    group_id: string;
    case_id: string;
    case_number: string;
    title: string;
    status: string;
    bureau_code: string;
    score: number;
    severity: string;
    rules_fired?: string[];
    explanation?: string;
  }[];
}

export interface Institution {
  id: string;
  aicte_permanent_id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  region: string;
  type?: string | null;
  status: string;
  created_at: string;
}

export interface InstitutionDetail extends Institution {
  total_cases: number;
  open_cases: number;
  disposed_cases: number;
  bureaus_involved: string[];
  cases: {
    id: string;
    case_number: string;
    title: string;
    status: string;
    category: string;
    bureau_code: string;
    received_date?: string;
    expected_disposal_date?: string;
  }[];
}

export interface OverlapMember {
  id: string;
  case_id: string;
  case_number?: string;
  case_title?: string;
  case_status?: string;
  bureau_code?: string;
  category?: string;
  role: "primary" | "secondary";
  similarity_score?: number;
}

export interface OverlapGroup {
  id: string;
  institution_id: string;
  institution_name?: string;
  aicte_permanent_id?: string;
  score: number;
  rule_score: number;
  semantic_score: number;
  severity: "High" | "Medium";
  status: "Open" | "Linked" | "Merged" | "Dismissed";
  explanation?: string;
  rules_fired?: string[];
  dismiss_reason?: string;
  created_at: string;
  members: OverlapMember[];
}

export interface DashboardSummary {
  total_cases: number;
  pending_cases: number;
  under_process_cases: number;
  disposed_cases: number;
  transferred_cases: number;
  escalated_cases: number;
  overdue_cases: number;
  active_overlaps: number;
  sla_compliance_rate: number;
}

export interface BureauWorkload {
  bureau_code: string;
  bureau_name: string;
  total: number;
  pending: number;
  under_process: number;
  disposed: number;
  transferred: number;
  escalated: number;
  overdue: number;
}

export interface AgeingBucket {
  bucket: string;
  count: number;
}

export interface TopInstitution {
  id: string;
  aicte_permanent_id: string;
  name: string;
  region: string;
  open_cases: number;
  total_cases: number;
  active_overlaps: number;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  message?: string;
  case_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface IngestionJob {
  id: string;
  filename: string;
  total: number;
  accepted: number;
  rejected: number;
  status: string;
  created_at: string;
}

export interface InstitutionImportResult {
  accepted: number;
  rejected: number;
  total: number;
  created: number;
  updated: number;
  errors: {
    row: number;
    aicte_permanent_id?: string;
    error: string;
  }[];
}
