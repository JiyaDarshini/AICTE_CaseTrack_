"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { DataTable, Column } from "@/components/DataTable";
import { TrendLineChart } from "@/components/Charts/TrendLineChart";
import { apiRequest } from "@/lib/api";
import {
  DashboardSummary,
  TopInstitution,
  User,
  Case
} from "@/lib/types";
import {
  FolderOpen,
  Clock,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Plus,
  ExternalLink
} from "lucide-react";
import Link from "next/link";

interface RegionalOfficeDashboardProps {
  user?: User | null;
}

export const RegionalOfficeDashboard: React.FC<RegionalOfficeDashboardProps> = ({ user }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trends, setTrends] = useState<{ month: string; received: number; disposed: number }[]>([]);
  const [institutions, setInstitutions] = useState<TopInstitution[]>([]);
  const [actionNeededCases, setActionNeededCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  const regionName = user?.region || "Regional";

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [sum, tr, inst, act] = await Promise.all([
          apiRequest<DashboardSummary>("/dashboard/summary"),
          apiRequest<{ month: string; received: number; disposed: number }[]>("/dashboard/trends"),
          apiRequest<TopInstitution[]>("/dashboard/institution-status?limit=10"),
          apiRequest<Case[]>("/dashboard/action-needed?limit=10"),
        ]);
        setSummary(sum);
        setTrends(tr || []);
        setInstitutions(inst || []);
        setActionNeededCases(act || []);
      } catch (err) {
        console.error("Regional Office dashboard data load error", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

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
      key: "action",
      header: "Action",
      align: "right",
      render: (inst) => (
        <Link
          href={`/institutions/${inst.id}`}
          className="font-semibold text-[#C2410C] hover:underline text-[13px]"
        >
          View Status &rarr;
        </Link>
      ),
    },
  ];

  const actionNeededColumns: Column<Case>[] = [
    {
      key: "case_number",
      header: "Case Number",
      render: (c) => <span className="font-bold text-[#1F2937]">{c.case_number}</span>,
    },
    {
      key: "title",
      header: "Grievance Title & Category",
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
      header: "SLA Status",
      align: "center",
      render: (c) => (
        <span className={`text-[12px] font-bold ${c.is_overdue ? "text-[#C2410C]" : "text-[#1F2937]"}`}>
          {c.is_overdue ? "Overdue" : `${c.days_remaining ?? 0}d rem.`}
        </span>
      ),
    },
    {
      key: "action",
      header: "Regional Actions",
      align: "right",
      render: (c) => (
        <div className="flex items-center justify-end gap-3">
          <Link
            href={`/cases/${c.id}`}
            className="font-semibold text-[#C2410C] hover:underline text-[13px]"
          >
            View / Escalate &rarr;
          </Link>
        </div>
      ),
    },
  ];

  return (
    <main className="p-8 space-y-8 max-w-[1280px] w-full mx-auto overflow-y-auto">
      {/* 1. PageHeader with Register New Case primary action */}
      <PageHeader
        title="Regional Office Dashboard"
        description={`Regional intake monitoring, jurisdictional pendency, and grievance escalation for the ${regionName} Region.`}
        badge={`${regionName} Region`}
        actions={[
          {
            label: "+ Register New Case",
            href: "/cases/new",
            variant: "primary",
            icon: <Plus className="w-4 h-4" />
          },
          {
            label: "Export Reports",
            href: "/reports",
            variant: "secondary"
          },
        ]}
      />

      {/* 2. 5 Key Performance Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Region total"
          value={summary?.total_cases ?? "—"}
          icon={<FolderOpen className="w-4 h-4" />}
        />
        <KpiCard
          label="Pending"
          value={summary?.pending_cases ?? "—"}
          icon={<Clock className="w-4 h-4" />}
        />
        <KpiCard
          label="Overdue"
          value={summary?.overdue_cases ?? "—"}
          alert={(summary?.overdue_cases ?? 0) > 0}
          icon={<AlertTriangle className="w-4 h-4" />}
        />
        <KpiCard
          label="Escalated by me"
          value={summary?.escalated_by_me ?? summary?.escalated_cases ?? 0}
          alert={(summary?.escalated_by_me ?? 0) > 0}
          icon={<ShieldAlert className="w-4 h-4" />}
        />
        <KpiCard
          label="Disposed"
          value={summary?.disposed_cases ?? "—"}
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
      </div>

      {/* 3. Panel 1: Institution-wise case status in my region (table) */}
      <div className="p-[20px] bg-white rounded-[8px] border border-[#FED7AA] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-[18px] font-bold text-[#1F2937] leading-[1.5] m-0">
              Institution-Wise Case Status ({regionName} Region)
            </h2>
            <p className="text-[13px] text-[#6B7280] leading-[1.5] mt-0.5 m-0">
              Approved institutions under regional oversight with active or disposed grievances
            </p>
          </div>
          <Link
            href="/institutions"
            className="text-[13px] font-semibold text-[#C2410C] hover:underline inline-flex items-center gap-1 shrink-0"
          >
            <span>Regional Directory</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        <DataTable
          columns={institutionColumns}
          data={institutions}
          keyExtractor={(inst) => inst.id}
          emptyMessage="No institutions with active grievance records in this region."
        />
      </div>

      {/* 4. Panel 2: Cases from my region needing action */}
      <div className="p-[20px] bg-white rounded-[8px] border border-[#FED7AA] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-[18px] font-bold text-[#1F2937] leading-[1.5] m-0">
              Cases Needing Regional Follow-Up & Action
            </h2>
            <p className="text-[13px] text-[#6B7280] leading-[1.5] mt-0.5 m-0">
              Pending or overdue cases registered in your region (Authorized actions: Register New Case, Escalate)
            </p>
          </div>
          <Link
            href="/cases"
            className="text-[13px] font-semibold text-[#C2410C] hover:underline inline-flex items-center gap-1 shrink-0"
          >
            <span>All Regional Cases</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        <DataTable
          columns={actionNeededColumns}
          data={actionNeededCases}
          keyExtractor={(c) => c.id}
          emptyMessage="All regional complaints are up to date."
        />
      </div>

      {/* 5. Panel 3: Region trend chart */}
      <div className="p-[20px] bg-white rounded-[8px] border border-[#FED7AA]">
        <div className="mb-4">
          <h2 className="text-[18px] font-bold text-[#1F2937] leading-[1.5] m-0">
            {regionName} Region Grievance Influx & Disposal Trajectory
          </h2>
          <p className="text-[13px] text-[#6B7280] leading-[1.5] mt-0.5 m-0">
            6-month historical receipt and resolution timeline within this jurisdiction
          </p>
        </div>
        <TrendLineChart data={trends} />
      </div>
    </main>
  );
};
