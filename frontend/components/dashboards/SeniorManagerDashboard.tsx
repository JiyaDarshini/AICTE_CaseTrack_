"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { AlertStrip } from "@/components/AlertStrip";
import { DataTable, Column } from "@/components/DataTable";
import { WorkloadBarChart } from "@/components/Charts/WorkloadBarChart";
import { TrendLineChart } from "@/components/Charts/TrendLineChart";
import { AgeingChart } from "@/components/Charts/AgeingChart";
import { apiRequest } from "@/lib/api";
import {
  DashboardSummary,
  BureauWorkload,
  AgeingBucket,
  TopInstitution,
  User,
  Case
} from "@/lib/types";
import {
  FolderOpen,
  Clock,
  CheckCircle2,
  AlertTriangle,
  GitCompare,
  ExternalLink,
  ShieldAlert,
  TrendingUp,
  Hourglass
} from "lucide-react";
import Link from "next/link";

interface SeniorManagerDashboardProps {
  user?: User | null;
}

export const SeniorManagerDashboard: React.FC<SeniorManagerDashboardProps> = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [workload, setWorkload] = useState<BureauWorkload[]>([]);
  const [ageing, setAgeing] = useState<AgeingBucket[]>([]);
  const [trends, setTrends] = useState<{ month: string; received: number; disposed: number }[]>([]);
  const [topInstitutions, setTopInstitutions] = useState<TopInstitution[]>([]);
  const [escalatedCases, setEscalatedCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [sum, wl, age, tr, topInst, esc] = await Promise.all([
          apiRequest<DashboardSummary>("/dashboard/summary"),
          apiRequest<BureauWorkload[]>("/dashboard/bureau-workload"),
          apiRequest<AgeingBucket[]>("/dashboard/ageing"),
          apiRequest<{ month: string; received: number; disposed: number }[]>("/dashboard/trends"),
          apiRequest<TopInstitution[]>("/dashboard/institution-status?limit=5"),
          apiRequest<Case[]>("/dashboard/escalated-cases?limit=10"),
        ]);
        setSummary(sum);
        setWorkload(wl || []);
        setAgeing(age || []);
        setTrends(tr || []);
        setTopInstitutions(topInst || []);
        setEscalatedCases(esc || []);
      } catch (err) {
        console.error("Senior Manager dashboard data load error", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const escalatedColumns: Column<Case>[] = [
    {
      key: "case_number",
      header: "Case Number",
      render: (c) => (
        <span className="font-bold text-[#1F2937]">{c.case_number}</span>
      ),
    },
    {
      key: "title",
      header: "Subject / Title",
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
      key: "current_bureau_code",
      header: "Origin Bureau",
      align: "center",
      render: (c) => (
        <span className="px-2 py-0.5 text-[11px] font-bold rounded-[8px] bg-white border border-[#D1D5DB] text-[#1F2937]">
          {c.current_bureau_code || "General"}
        </span>
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
      key: "days_remaining",
      header: "SLA Tracker",
      align: "center",
      render: (c) => (
        <span className={`text-[12px] font-bold ${c.is_overdue ? "text-[#C2410C]" : "text-[#1F2937]"}`}>
          {c.is_overdue ? "Overdue" : `${c.days_remaining ?? 0}d rem.`}
        </span>
      ),
    },
    {
      key: "action",
      header: "Action",
      align: "right",
      render: (c) => (
        <Link
          href={`/cases/${c.id}`}
          className="font-semibold text-[#C2410C] hover:underline text-[13px]"
        >
          Review & Decision &rarr;
        </Link>
      ),
    },
  ];

  const institutionColumns: Column<TopInstitution>[] = [
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
      key: "open_cases",
      header: "Open Cases",
      align: "center",
      render: (inst) => (
        <span className="font-bold text-[#1F2937]">{inst.open_cases}</span>
      ),
    },
    {
      key: "total_cases",
      header: "Total Cases",
      align: "center",
      render: (inst) => <span className="text-[#6B7280]">{inst.total_cases}</span>,
    },
    {
      key: "active_overlaps",
      header: "Active Overlaps",
      align: "center",
      render: (inst) =>
        inst.active_overlaps > 0 ? (
          <span className="font-semibold text-[#C2410C]">{inst.active_overlaps} Active</span>
        ) : (
          <span className="text-[#6B7280]">0</span>
        ),
    },
    {
      key: "action",
      header: "Action",
      align: "right",
      render: (inst) => (
        <Link
          href={`/institutions/${inst.id}`}
          className="font-semibold text-[#C2410C] hover:underline"
        >
          View Profile &rarr;
        </Link>
      ),
    },
  ];

  return (
    <main className="p-8 space-y-8 max-w-[1280px] w-full mx-auto overflow-y-auto">
      {/* 1. PageHeader */}
      <PageHeader
        title="Senior Manager Dashboard"
        description="Executive supervisory dashboard for cross-bureau grievance monitoring, SLA escalation handling, and systemic dispute resolution."
        badge="Senior Management"
        actions={[
          { label: "Export Reports", href: "/reports", variant: "secondary" },
        ]}
      />

      {/* 2. Alert Strip if Escalations or Overlaps exist */}
      {escalatedCases.length > 0 && (
        <AlertStrip
          title={`${escalatedCases.length} Escalated Grievance${escalatedCases.length > 1 ? "s" : ""} Pending Management Direction`}
          description="Immediate executive intervention is requested to provide direction or resolve cross-bureau impasses."
          actionText="Review Escalations"
          actionHref="/cases?status=Escalated"
        />
      )}

      {/* 3. 6 Key Performance Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard
          label="Total Cases"
          value={summary?.total_cases ?? "—"}
          icon={<FolderOpen className="w-4 h-4" />}
        />
        <KpiCard
          label="Overdue SLA"
          value={summary?.overdue_cases ?? "—"}
          alert={(summary?.overdue_cases ?? 0) > 0}
          icon={<AlertTriangle className="w-4 h-4" />}
        />
        <KpiCard
          label="Escalated"
          value={summary?.escalated_cases ?? "—"}
          alert={(summary?.escalated_cases ?? 0) > 0}
          icon={<ShieldAlert className="w-4 h-4" />}
        />
        <KpiCard
          label="Active Overlaps"
          value={summary?.active_overlaps ?? "—"}
          alert={(summary?.active_overlaps ?? 0) > 0}
          icon={<GitCompare className="w-4 h-4" />}
        />
        <KpiCard
          label="Disposal Rate %"
          value={`${summary?.disposal_rate ?? 100}%`}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <KpiCard
          label="Avg Days to Dispose"
          value={`${summary?.avg_days_to_dispose ?? 0}d`}
          icon={<Hourglass className="w-4 h-4" />}
        />
      </div>

      {/* 4. Bureau-Wise Workload Comparison Chart (RB vs PGRC vs others) */}
      <div className="p-[20px] bg-white rounded-[8px] border border-[#FED7AA]">
        <div className="mb-4">
          <h2 className="text-[18px] font-bold text-[#1F2937] leading-[1.5] m-0">
            Bureau-Wise Workload Comparison (RB vs PGRC vs Others)
          </h2>
          <p className="text-[13px] text-[#6B7280] leading-[1.5] mt-0.5 m-0">
            Comparative case pendency, processing, and disposal across AICTE cells
          </p>
        </div>
        <WorkloadBarChart data={workload} />
      </div>

      {/* 5. Escalated Cases Needing Decision (10 rows) */}
      <div className="p-[20px] bg-white rounded-[8px] border border-[#FED7AA] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-[18px] font-bold text-[#1F2937] leading-[1.5] m-0">
              Escalated Cases Needing Decision
            </h2>
            <p className="text-[13px] text-[#6B7280] leading-[1.5] mt-0.5 m-0">
              High-priority grievances requiring senior executive direction and inter-bureau instructions
            </p>
          </div>
          <Link
            href="/cases?status=Escalated"
            className="text-[13px] font-semibold text-[#C2410C] hover:underline inline-flex items-center gap-1 shrink-0"
          >
            <span>View All Escalations</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        <DataTable
          columns={escalatedColumns}
          data={escalatedCases}
          keyExtractor={(c) => c.id}
          emptyMessage="No escalated grievances currently awaiting executive decision."
        />
      </div>

      {/* 6. Top 5 Institutions With Most Open Cases */}
      <div className="p-[20px] bg-white rounded-[8px] border border-[#FED7AA] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-[18px] font-bold text-[#1F2937] leading-[1.5] m-0">
              Top 5 Institutions by Open Grievance Volume
            </h2>
            <p className="text-[13px] text-[#6B7280] leading-[1.5] mt-0.5 m-0">
              Institutions with repeated grievances across multiple academic and regulatory categories
            </p>
          </div>
          <Link
            href="/institutions"
            className="text-[13px] font-semibold text-[#C2410C] hover:underline inline-flex items-center gap-1 shrink-0"
          >
            <span>Full Directory</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        <DataTable
          columns={institutionColumns}
          data={topInstitutions.slice(0, 5)}
          keyExtractor={(inst) => inst.id}
          emptyMessage="No institution data available."
        />
      </div>

      {/* 7. Monthly Trend & Ageing Buckets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 p-[20px] bg-white rounded-[8px] border border-[#FED7AA]">
          <div className="mb-4">
            <h2 className="text-[18px] font-bold text-[#1F2937] leading-[1.5] m-0">
              Monthly Influx vs Disposal Trends
            </h2>
            <p className="text-[13px] text-[#6B7280] leading-[1.5] mt-0.5 m-0">
              Six-month historical trajectory of grievance receipt against official disposal
            </p>
          </div>
          <TrendLineChart data={trends} />
        </div>

        <div className="p-[20px] bg-white rounded-[8px] border border-[#FED7AA]">
          <div className="mb-4">
            <h2 className="text-[18px] font-bold text-[#1F2937] leading-[1.5] m-0">
              Ageing Buckets
            </h2>
            <p className="text-[13px] text-[#6B7280] leading-[1.5] mt-0.5 m-0">
              Pendency duration brackets for active open grievances
            </p>
          </div>
          <AgeingChart data={ageing} />
        </div>
      </div>
    </main>
  );
};
