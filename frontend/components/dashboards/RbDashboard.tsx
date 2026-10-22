"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { AlertStrip } from "@/components/AlertStrip";
import { DataTable, Column } from "@/components/DataTable";
import { AgeingChart } from "@/components/Charts/AgeingChart";
import { apiRequest } from "@/lib/api";
import {
  DashboardSummary,
  AgeingBucket,
  User,
  Case
} from "@/lib/types";
import {
  Clock,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ArrowRightLeft,
  Calendar,
  Building2,
  ExternalLink,
  GitCompare
} from "lucide-react";
import Link from "next/link";

interface CrossOverlapItem {
  group_id: string;
  institution_name: string;
  aicte_permanent_id: string;
  score: number;
  severity: string;
  status: string;
  explanation?: string;
  rules_fired?: string[];
  bureaus: string[];
  members: {
    id: string;
    case_number: string;
    case_title: string;
    case_status: string;
    bureau_code: string;
  }[];
}

interface CrossBureauInstitution {
  id: string;
  aicte_permanent_id: string;
  name: string;
  region: string;
  pgrc_open_cases: number;
  rb_open_cases: number;
  total_cross_open: number;
}

interface RbDashboardProps {
  user?: User | null;
}

export const RbDashboard: React.FC<RbDashboardProps> = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [ageing, setAgeing] = useState<AgeingBucket[]>([]);
  const [dueSoonCases, setDueSoonCases] = useState<Case[]>([]);
  const [myCases, setMyCases] = useState<Case[]>([]);
  const [crossOverlaps, setCrossOverlaps] = useState<CrossOverlapItem[]>([]);
  const [crossInstitutions, setCrossInstitutions] = useState<CrossBureauInstitution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [sum, age, due, my, ov, crossInst] = await Promise.all([
          apiRequest<DashboardSummary>("/dashboard/summary"),
          apiRequest<AgeingBucket[]>("/dashboard/ageing"),
          apiRequest<Case[]>("/dashboard/due-soon?limit=10"),
          apiRequest<Case[]>("/dashboard/my-cases?limit=10"),
          apiRequest<CrossOverlapItem[]>("/dashboard/cross-bureau-overlaps"),
          apiRequest<CrossBureauInstitution[]>("/dashboard/cross-bureau-institutions"),
        ]);
        setSummary(sum);
        setAgeing(age || []);
        setDueSoonCases(due || []);
        setMyCases(my || []);
        setCrossOverlaps(ov || []);
        setCrossInstitutions(crossInst || []);
      } catch (err) {
        console.error("RB dashboard data load error", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const dueSoonColumns: Column<Case>[] = [
    {
      key: "case_number",
      header: "Case Number",
      render: (c) => <span className="font-bold text-[#1F2937]">{c.case_number}</span>,
    },
    {
      key: "title",
      header: "Subject / Category",
      render: (c) => (
        <div className="max-w-xs">
          <p className="font-semibold text-[#1F2937] truncate m-0">{c.title}</p>
          <span className="text-[12px] text-[#6B7280]">{c.category}</span>
        </div>
      ),
    },
    {
      key: "institution_name",
      header: "Institution",
      render: (c) => (
        <span className="text-[#1F2937] text-[13px] line-clamp-1">{c.institution_name || "—"}</span>
      ),
    },
    {
      key: "expected_disposal_date",
      header: "Expected Disposal",
      align: "center",
      render: (c) => (
        <span className="text-[13px] text-[#1F2937]">
          {c.expected_disposal_date ? new Date(c.expected_disposal_date).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      key: "days_remaining",
      header: "Days Remaining",
      align: "center",
      render: (c) => (
        <span className={`text-[12px] font-bold ${c.is_overdue ? "text-[#C2410C]" : "text-[#1F2937]"}`}>
          {c.is_overdue ? "Overdue" : `${c.days_remaining ?? 0} days`}
        </span>
      ),
    },
    {
      key: "action",
      header: "Actions",
      align: "right",
      render: (c) => (
        <Link
          href={`/cases/${c.id}`}
          className="font-semibold text-[#C2410C] hover:underline text-[13px]"
        >
          View Case &rarr;
        </Link>
      ),
    },
  ];

  const myCasesColumns: Column<Case>[] = [
    {
      key: "case_number",
      header: "Case Number",
      render: (c) => <span className="font-bold text-[#1F2937]">{c.case_number}</span>,
    },
    {
      key: "title",
      header: "Grievance Title",
      render: (c) => (
        <p className="font-semibold text-[#1F2937] max-w-sm truncate m-0">{c.title}</p>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      render: (c) => (
        <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-[8px] bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]">
          {c.status}
        </span>
      ),
    },
    {
      key: "last_action",
      header: "Last Bureau Action",
      render: (c) => (
        <span className="text-[13px] text-[#6B7280] line-clamp-1">{c.last_action || "Registered"}</span>
      ),
    },
    {
      key: "action",
      header: "Actions",
      align: "right",
      render: (c) => (
        <Link
          href={`/cases/${c.id}`}
          className="font-semibold text-[#C2410C] hover:underline text-[13px]"
        >
          Manage Case &rarr;
        </Link>
      ),
    },
  ];

  const overlapColumns: Column<CrossOverlapItem>[] = [
    {
      key: "institution_name",
      header: "Institution & AICTE ID",
      render: (o) => (
        <div>
          <p className="font-bold text-[#1F2937] m-0">{o.institution_name}</p>
          <span className="text-[12px] text-[#6B7280]">{o.aicte_permanent_id}</span>
        </div>
      ),
    },
    {
      key: "members",
      header: "Cross-Bureau Overlap Cases",
      render: (o) => (
        <div className="space-y-1">
          {o.members.map((m) => (
            <div key={m.id} className="text-[12px] flex items-center gap-1.5">
              <span className="px-1.5 py-0.2 bg-white border border-[#D1D5DB] rounded text-[10px] font-bold">
                {m.bureau_code}
              </span>
              <span className="font-semibold text-[#1F2937]">{m.case_number}:</span>
              <span className="text-[#6B7280] truncate max-w-[200px]">{m.case_title}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: "severity",
      header: "Severity & Score",
      align: "center",
      render: (o) => (
        <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-[8px] bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]">
          {o.severity} ({(o.score * 100).toFixed(0)}%)
        </span>
      ),
    },
    {
      key: "action",
      header: "Action",
      align: "right",
      render: (o) => (
        <Link
          href={`/overlaps/${o.group_id}`}
          className="font-semibold text-[#C2410C] hover:underline text-[13px]"
        >
          Coordinate Overlap &rarr;
        </Link>
      ),
    },
  ];

  const crossInstitutionColumns: Column<CrossBureauInstitution>[] = [
    {
      key: "aicte_permanent_id",
      header: "AICTE Permanent ID",
      render: (inst) => <span className="font-bold text-[#1F2937]">{inst.aicte_permanent_id}</span>,
    },
    {
      key: "name",
      header: "Institution Name",
      render: (inst) => <span className="font-medium text-[#1F2937] line-clamp-1">{inst.name}</span>,
    },
    {
      key: "region",
      header: "Region",
      render: (inst) => <span className="text-[#6B7280]">{inst.region}</span>,
    },
    {
      key: "pgrc_open_cases",
      header: "PGRC Open Cases",
      align: "center",
      render: (inst) => (
        <span className="font-bold text-[#C2410C] bg-[#FFF7ED] px-2 py-0.5 rounded-[8px] border border-[#FED7AA]">
          {inst.pgrc_open_cases} Active
        </span>
      ),
    },
    {
      key: "rb_open_cases",
      header: "RB Open Cases",
      align: "center",
      render: (inst) => (
        <span className="font-bold text-[#1F2937]">{inst.rb_open_cases}</span>
      ),
    },
    {
      key: "action",
      header: "Action",
      align: "right",
      render: (inst) => (
        <Link
          href={`/institutions/${inst.id}`}
          className="font-semibold text-[#C2410C] hover:underline text-[13px]"
        >
          View Institutional Profile &rarr;
        </Link>
      ),
    },
  ];

  return (
    <main className="p-8 space-y-8 max-w-[1280px] w-full mx-auto overflow-y-auto">
      {/* 1. PageHeader */}
      <PageHeader
        title="Regulation Bureau Dashboard"
        description="Regulation Bureau compliance caseload, regulatory enforcement workflows, and inter-bureau coordination."
        badge="Regulation Bureau"
        actions={[
          { label: "Export Reports", href: "/reports", variant: "secondary" },
        ]}
      />

      {/* 2. Overlap Alert Strip */}
      {crossOverlaps.length > 0 && (
        <AlertStrip
          title={`${crossOverlaps.length} Cross-Bureau Overlap${crossOverlaps.length > 1 ? "s" : ""} Involving Regulation Bureau & PGRC`}
          description="Institutions with concurrent regulatory and public grievance cases require coordinated action before issuance of compliance orders."
          actionText="Review Overlaps"
          actionHref="/overlaps"
        />
      )}

      {/* 3. 6 Key Performance Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard
          label="My bureau Pending"
          value={summary?.pending_cases ?? "—"}
          icon={<Clock className="w-4 h-4" />}
        />
        <KpiCard
          label="Under Process"
          value={summary?.under_process_cases ?? "—"}
          icon={<RefreshCw className="w-4 h-4" />}
        />
        <KpiCard
          label="Due in 5 days"
          value={summary?.due_in_5_days ?? 0}
          alert={(summary?.due_in_5_days ?? 0) > 0}
          icon={<Calendar className="w-4 h-4" />}
        />
        <KpiCard
          label="Overdue SLA"
          value={summary?.overdue_cases ?? "—"}
          alert={(summary?.overdue_cases ?? 0) > 0}
          icon={<AlertTriangle className="w-4 h-4" />}
        />
        <KpiCard
          label="Disposed this month"
          value={summary?.disposed_this_month ?? 0}
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
        <KpiCard
          label="Transferred"
          value={summary?.transferred_cases ?? "—"}
          icon={<ArrowRightLeft className="w-4 h-4" />}
        />
      </div>

      {/* 4. Cases Due Soon (sorted by expected_disposal_date) */}
      <div className="p-[20px] bg-white rounded-[8px] border border-[#FED7AA] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-[18px] font-bold text-[#1F2937] leading-[1.5] m-0">
              RB Cases Due Soon
            </h2>
            <p className="text-[13px] text-[#6B7280] leading-[1.5] mt-0.5 m-0">
              Regulatory cases approaching their mandated SLA closure deadline
            </p>
          </div>
          <Link
            href="/cases?sort=expected_disposal_date"
            className="text-[13px] font-semibold text-[#C2410C] hover:underline inline-flex items-center gap-1 shrink-0"
          >
            <span>All Bureau Cases</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        <DataTable
          columns={dueSoonColumns}
          data={dueSoonCases}
          keyExtractor={(c) => c.id}
          emptyMessage="No pending regulatory cases currently nearing SLA deadlines."
        />
      </div>

      {/* 5. Cases Assigned to Me */}
      <div className="p-[20px] bg-white rounded-[8px] border border-[#FED7AA] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-[18px] font-bold text-[#1F2937] leading-[1.5] m-0">
              Active Cases Assigned to My Desk
            </h2>
            <p className="text-[13px] text-[#6B7280] leading-[1.5] mt-0.5 m-0">
              Enforcement and compliance reviews under active officer consideration
            </p>
          </div>
          <Link
            href="/cases"
            className="text-[13px] font-semibold text-[#C2410C] hover:underline inline-flex items-center gap-1 shrink-0"
          >
            <span>Cases Directory</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        <DataTable
          columns={myCasesColumns}
          data={myCases}
          keyExtractor={(c) => c.id}
          emptyMessage="No cases currently assigned to your individual desk."
        />
      </div>

      {/* 6. Panel: Institutions with PGRC Cases Too (Cross-bureau overlap list) */}
      <div className="p-[20px] bg-white rounded-[8px] border border-[#FED7AA] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-[18px] font-bold text-[#1F2937] leading-[1.5] m-0">
              Institutions With PGRC Cases Too (Cross-Bureau Overlap)
            </h2>
            <p className="text-[13px] text-[#6B7280] leading-[1.5] mt-0.5 m-0">
              Institutions concurrently under investigation in both Regulation Bureau (RB) and Public Grievance Redressal Cell (PGRC)
            </p>
          </div>
          <Link
            href="/overlaps"
            className="text-[13px] font-semibold text-[#C2410C] hover:underline inline-flex items-center gap-1 shrink-0"
          >
            <span>Overlap Coordination Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        <DataTable
          columns={crossInstitutionColumns}
          data={crossInstitutions}
          keyExtractor={(inst) => inst.id}
          emptyMessage="No institutions currently have concurrent open cases in both RB and PGRC."
        />
      </div>

      {/* 7. Overlaps Involving RB Cases */}
      <div className="p-[20px] bg-white rounded-[8px] border border-[#FED7AA] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-[18px] font-bold text-[#1F2937] leading-[1.5] m-0">
              Potential Overlaps Involving Regulation Bureau Grievances
            </h2>
            <p className="text-[13px] text-[#6B7280] leading-[1.5] mt-0.5 m-0">
              Cross-bureau duplicate detection groups involving RB cases
            </p>
          </div>
          <Link
            href="/overlaps"
            className="text-[13px] font-semibold text-[#C2410C] hover:underline inline-flex items-center gap-1 shrink-0"
          >
            <span>All Overlaps</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        <DataTable
          columns={overlapColumns}
          data={crossOverlaps}
          keyExtractor={(o) => o.group_id}
          emptyMessage="No active cross-bureau overlaps involving Regulation Bureau."
        />
      </div>

      {/* 8. Ageing of My Bureau Cases */}
      <div className="p-[20px] bg-white rounded-[8px] border border-[#FED7AA]">
        <div className="mb-4">
          <h2 className="text-[18px] font-bold text-[#1F2937] leading-[1.5] m-0">
            Ageing of Regulation Bureau Cases
          </h2>
          <p className="text-[13px] text-[#6B7280] leading-[1.5] mt-0.5 m-0">
            Pendency brackets for active open grievances inside Regulation Bureau
          </p>
        </div>
        <AgeingChart data={ageing} />
      </div>
    </main>
  );
};
