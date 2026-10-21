"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { AlertStrip } from "@/components/AlertStrip";
import { DataTable, Column } from "@/components/DataTable";
import { WorkloadBarChart } from "@/components/Charts/WorkloadBarChart";
import { StatusDonutChart } from "@/components/Charts/StatusDonutChart";
import { TrendLineChart } from "@/components/Charts/TrendLineChart";
import { AgeingChart } from "@/components/Charts/AgeingChart";
import { apiRequest } from "@/lib/api";
import {
  DashboardSummary,
  BureauWorkload,
  AgeingBucket,
  TopInstitution,
  OverlapGroup
} from "@/lib/types";
import {
  FolderOpen,
  Clock,
  RefreshCw,
  CheckCircle2,
  ArrowRightLeft,
  AlertTriangle,
  GitCompare,
  ExternalLink
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [workload, setWorkload] = useState<BureauWorkload[]>([]);
  const [ageing, setAgeing] = useState<AgeingBucket[]>([]);
  const [trends, setTrends] = useState<{ month: string; received: number; disposed: number }[]>([]);
  const [topInstitutions, setTopInstitutions] = useState<TopInstitution[]>([]);
  const [topOverlaps, setTopOverlaps] = useState<OverlapGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [sum, wl, age, tr, topInst, ov] = await Promise.all([
          apiRequest<DashboardSummary>("/dashboard/summary"),
          apiRequest<BureauWorkload[]>("/dashboard/bureau-workload"),
          apiRequest<AgeingBucket[]>("/dashboard/ageing"),
          apiRequest<{ month: string; received: number; disposed: number }[]>("/dashboard/trends"),
          apiRequest<TopInstitution[]>("/dashboard/institution-status?limit=5"),
          apiRequest<OverlapGroup[]>("/overlaps?status=Open&limit=5"),
        ]);
        setSummary(sum);
        setWorkload(wl || []);
        setAgeing(age || []);
        setTrends(tr || []);
        setTopInstitutions(topInst || []);
        setTopOverlaps(ov || []);
      } catch (err) {
        console.error("Dashboard data load error", err);
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
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />

        <main className="p-8 space-y-8 max-w-[1280px] w-full mx-auto overflow-y-auto">
          {/* 1. Unified PageHeader */}
          <PageHeader
            title="Regulatory Executive Dashboard"
            description="Integrated complaint monitoring, overlap detection, and SLA compliance status across AICTE bureaus."
            actions={[
              { label: "Export Reports", href: "/reports", variant: "secondary" },
            ]}
          />

          {/* 2. Compact Alert Strip (Max 1 per page) */}
          {topOverlaps.length > 0 && (
            <AlertStrip
              title={`${topOverlaps.length} Active Overlap Group${topOverlaps.length > 1 ? "s" : ""} Detected`}
              description="Institutions with duplicate or cross-bureau grievances require priority coordination."
              actionText="Review Overlaps"
              actionHref="/overlaps"
            />
          )}

          {/* 3. KPI / Summary Row: Equal height 96px */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            <KpiCard
              label="Total Cases"
              value={summary?.total_cases ?? "—"}
              icon={<FolderOpen className="w-4 h-4" />}
            />
            <KpiCard
              label="Pending"
              value={summary?.pending_cases ?? "—"}
              icon={<Clock className="w-4 h-4" />}
            />
            <KpiCard
              label="Under Process"
              value={summary?.under_process_cases ?? "—"}
              icon={<RefreshCw className="w-4 h-4" />}
            />
            <KpiCard
              label="Overdue SLA"
              value={summary?.overdue_cases ?? "—"}
              alert
              icon={<AlertTriangle className="w-4 h-4" />}
            />
            <KpiCard
              label="Disposed"
              value={summary?.disposed_cases ?? "—"}
              icon={<CheckCircle2 className="w-4 h-4" />}
            />
            <KpiCard
              label="Transferred"
              value={summary?.transferred_cases ?? "—"}
              icon={<ArrowRightLeft className="w-4 h-4" />}
            />
            <KpiCard
              label="Active Overlaps"
              value={summary?.active_overlaps ?? "—"}
              alert={(summary?.active_overlaps ?? 0) > 0}
              icon={<GitCompare className="w-4 h-4" />}
            />
          </div>

          {/* 4. Charts Section 1: Bureau Workload & Overall Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 p-[20px] bg-white rounded-[8px] border border-[#FED7AA]">
              <div className="mb-4">
                <h2 className="text-[18px] font-bold text-[#1F2937] leading-[1.5] m-0">
                  Bureau-Wise Workload & Pendency
                </h2>
                <p className="text-[13px] text-[#6B7280] leading-[1.5] mt-0.5 m-0">
                  Distribution across Regulation, PGRC, Approval, PAPB & Legal cells
                </p>
              </div>
              <WorkloadBarChart data={workload} />
            </div>

            <div className="p-[20px] bg-white rounded-[8px] border border-[#FED7AA]">
              <div className="mb-4">
                <h2 className="text-[18px] font-bold text-[#1F2937] leading-[1.5] m-0">
                  Overall Status Breakdown
                </h2>
                <p className="text-[13px] text-[#6B7280] leading-[1.5] mt-0.5 m-0">
                  SLA Compliance: <strong className="text-[#1F2937]">{summary?.sla_compliance_rate ?? 100}%</strong>
                </p>
              </div>
              {summary && <StatusDonutChart summary={summary} />}
            </div>
          </div>

          {/* 5. Charts Section 2: Monthly Trends & Ageing Brackets */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 p-[20px] bg-white rounded-[8px] border border-[#FED7AA]">
              <div className="mb-4">
                <h2 className="text-[18px] font-bold text-[#1F2937] leading-[1.5] m-0">
                  Monthly Influx vs Disposal Trends
                </h2>
                <p className="text-[13px] text-[#6B7280] leading-[1.5] mt-0.5 m-0">
                  Historical comparison over the past 6-month cycle
                </p>
              </div>
              <TrendLineChart data={trends} />
            </div>

            <div className="p-[20px] bg-white rounded-[8px] border border-[#FED7AA]">
              <div className="mb-4">
                <h2 className="text-[18px] font-bold text-[#1F2937] leading-[1.5] m-0">
                  Case Ageing Analysis
                </h2>
                <p className="text-[13px] text-[#6B7280] leading-[1.5] mt-0.5 m-0">
                  Pendency brackets for active open grievances
                </p>
              </div>
              <AgeingChart data={ageing} />
            </div>
          </div>

          {/* 6. Top Institutions Section (Limited to top 5 with View all link) */}
          <div className="p-[20px] bg-white rounded-[8px] border border-[#FED7AA] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-[18px] font-bold text-[#1F2937] leading-[1.5] m-0">
                  Top Institutions by Active Grievance Volume
                </h2>
                <p className="text-[13px] text-[#6B7280] leading-[1.5] mt-0.5 m-0">
                  Priority monitoring based on unresolved grievances
                </p>
              </div>
              <Link
                href="/institutions"
                className="text-[13px] font-semibold text-[#C2410C] hover:underline inline-flex items-center gap-1 shrink-0"
              >
                <span>View Complete Directory</span>
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
        </main>
      </div>
    </div>
  );
}
