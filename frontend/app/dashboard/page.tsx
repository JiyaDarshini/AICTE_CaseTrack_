"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { StatCard } from "@/components/StatCard";
import { OverlapBanner } from "@/components/OverlapBanner";
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
  TrendingUp,
  Building2,
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
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("casetrack_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (_) {}
    }

    async function loadDashboard() {
      try {
        const [sum, wl, age, tr, topInst, ov] = await Promise.all([
          apiRequest<DashboardSummary>("/dashboard/summary"),
          apiRequest<BureauWorkload[]>("/dashboard/bureau-workload"),
          apiRequest<AgeingBucket[]>("/dashboard/ageing"),
          apiRequest<{ month: string; received: number; disposed: number }[]>("/dashboard/trends"),
          apiRequest<TopInstitution[]>("/dashboard/institution-status?limit=5"),
          apiRequest<OverlapGroup[]>("/overlaps?status=Open&limit=2"),
        ]);
        setSummary(sum);
        setWorkload(wl || []);
        setAgeing(age || []);
        setTrends(tr || []);
        setTopInstitutions(topInst || []);
        setTopOverlaps(ov || []);
      } catch (err) {
        console.error("Dashboard load error", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />

        <main className="p-6 space-y-6 overflow-y-auto">
          {/* Header Title & Date & Persona */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#FED7AA] gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#C2410C]">
                Integrated Monitoring & Status Overview
              </span>
              <h2 className="text-xl font-bold text-[#1F2937]">
                Regulatory Executive Dashboard
              </h2>
            </div>
            
            <div className="flex items-center gap-2">
              <Link
                href="/cases"
                className="px-3 py-1.5 text-xs font-bold rounded-[6px] bg-[#C2410C] text-white hover:bg-[#EA580C] transition-colors"
              >
                + Register New Case
              </Link>
              <Link
                href="/reports"
                className="px-3 py-1.5 text-xs font-bold rounded-[6px] bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] hover:bg-[#FFEDD5] transition-colors"
              >
                Export Reports
              </Link>
            </div>
          </div>

          {/* Prominent Overlap Banner if any active overlaps exist */}
          {topOverlaps.length > 0 && (
            <div className="space-y-2">
              {topOverlaps.map((ov) => (
                <OverlapBanner
                  key={ov.id}
                  groupId={ov.id}
                  institutionName={ov.institution_name || "Unknown Institution"}
                  aictePermanentId={ov.aicte_permanent_id || "N/A"}
                  severity={ov.severity}
                  score={ov.score}
                  explanation={ov.explanation}
                  rulesFired={ov.rules_fired}
                />
              ))}
            </div>
          )}

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <StatCard
              label="Total Cases"
              value={summary?.total_cases ?? "—"}
              icon={<FolderOpen className="w-4 h-4" />}
            />
            <StatCard
              label="Pending"
              value={summary?.pending_cases ?? "—"}
              icon={<Clock className="w-4 h-4 text-[#C2410C]" />}
            />
            <StatCard
              label="Under Process"
              value={summary?.under_process_cases ?? "—"}
              icon={<RefreshCw className="w-4 h-4 text-[#EA580C]" />}
            />
            <StatCard
              label="Overdue SLA"
              value={summary?.overdue_cases ?? "—"}
              alert
              icon={<AlertTriangle className="w-4 h-4 text-[#C2410C]" />}
            />
            <StatCard
              label="Disposed"
              value={summary?.disposed_cases ?? "—"}
              icon={<CheckCircle2 className="w-4 h-4 text-[#C2410C]" />}
            />
            <StatCard
              label="Transferred"
              value={summary?.transferred_cases ?? "—"}
              icon={<ArrowRightLeft className="w-4 h-4 text-[#7C2D12]" />}
            />
            <StatCard
              label="Active Overlaps"
              value={summary?.active_overlaps ?? "—"}
              highlight
              icon={<GitCompare className="w-4 h-4 text-[#C2410C]" />}
            />
          </div>

          {/* Charts Row 1: Bureau Workload & Status Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-5 bg-white rounded-[8px] border border-[#FED7AA] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-sm text-[#1F2937]">Bureau-Wise Workload & Pendency</h3>
                  <p className="text-xs text-[#6B7280]">Distribution across Regulation, PGRC, Approval, PAPB & Legal cells</p>
                </div>
              </div>
              <WorkloadBarChart data={workload} />
            </div>

            <div className="p-5 bg-white rounded-[8px] border border-[#FED7AA] shadow-sm">
              <div className="mb-4">
                <h3 className="font-bold text-sm text-[#1F2937]">Overall Status Breakdown</h3>
                <p className="text-xs text-[#6B7280]">
                  SLA Compliance: <strong className="text-[#C2410C]">{summary?.sla_compliance_rate ?? 100}%</strong>
                </p>
              </div>
              {summary && <StatusDonutChart summary={summary} />}
            </div>
          </div>

          {/* Charts Row 2: Monthly Trend & Ageing Brackets */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-5 bg-white rounded-[8px] border border-[#FED7AA] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-sm text-[#1F2937]">Monthly Influx vs Disposal Trends</h3>
                  <p className="text-xs text-[#6B7280]">Historical comparison over the past 6-month cycle</p>
                </div>
              </div>
              <TrendLineChart data={trends} />
            </div>

            <div className="p-5 bg-white rounded-[8px] border border-[#FED7AA] shadow-sm">
              <div className="mb-4">
                <h3 className="font-bold text-sm text-[#1F2937]">Case Ageing Analysis</h3>
                <p className="text-xs text-[#6B7280]">Pendency brackets for active open grievances</p>
              </div>
              <AgeingChart data={ageing} />
            </div>
          </div>

          {/* Top Institutions by Open Cases */}
          <div className="p-5 bg-white rounded-[8px] border border-[#FED7AA] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm text-[#1F2937]">Top Institutions by Active Grievance Volume</h3>
                <p className="text-xs text-[#6B7280]">Higher volumes require priority regulatory monitoring and inter-bureau coordination</p>
              </div>
              <Link
                href="/institutions"
                className="text-xs font-bold text-[#C2410C] hover:underline flex items-center gap-1"
              >
                View Complete Directory <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-[#FED7AA] casetrack-table">
                <thead>
                  <tr className="border-b border-[#FED7AA]">
                    <th className="py-2.5 px-3 font-bold text-[#C2410C]">AICTE Permanent ID</th>
                    <th className="py-2.5 px-3 font-bold text-[#C2410C]">Institution Name</th>
                    <th className="py-2.5 px-3 font-bold text-[#C2410C]">Region</th>
                    <th className="py-2.5 px-3 font-bold text-[#C2410C] text-center">Open Cases</th>
                    <th className="py-2.5 px-3 font-bold text-[#C2410C] text-center">Total Cases</th>
                    <th className="py-2.5 px-3 font-bold text-[#C2410C] text-center">Active Overlaps</th>
                    <th className="py-2.5 px-3 font-bold text-[#C2410C] text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FED7AA]">
                  {topInstitutions.map((inst) => (
                    <tr key={inst.id} className="transition-colors">
                      <td className="py-2.5 px-3 font-bold text-[#1F2937]">{inst.aicte_permanent_id}</td>
                      <td className="py-2.5 px-3 font-medium text-[#1F2937]">{inst.name}</td>
                      <td className="py-2.5 px-3 text-[#6B7280]">{inst.region}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-bold text-[#C2410C] px-2 py-0.5 rounded-full bg-[#FFF7ED] border border-[#FED7AA]">
                          {inst.open_cases}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-[#1F2937]">{inst.total_cases}</td>
                      <td className="py-2.5 px-3 text-center">
                        {inst.active_overlaps > 0 ? (
                          <span className="font-bold text-white px-2 py-0.5 rounded-full bg-[#C2410C]">
                            {inst.active_overlaps} Active
                          </span>
                        ) : (
                          <span className="text-[#6B7280]">0</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Link
                          href={`/institutions/${inst.id}`}
                          className="font-bold text-[#C2410C] hover:underline"
                        >
                          View Profile &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
