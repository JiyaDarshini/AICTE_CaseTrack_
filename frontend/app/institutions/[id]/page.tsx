"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { DataTable, Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { apiRequest } from "@/lib/api";
import { InstitutionDetail, Case } from "@/lib/types";
import { ArrowLeft, Building2, MapPin, Landmark, FolderOpen } from "lucide-react";
import Link from "next/link";

export default function InstitutionDetailPage() {
  const params = useParams();
  const instId = params.id as string;
  const [inst, setInst] = useState<InstitutionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInstitution() {
      try {
        const data = await apiRequest<InstitutionDetail>(`/institutions/${instId}`);
        setInst(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (instId) loadInstitution();
  }, [instId]);

  if (loading || !inst) {
    return (
      <div className="flex min-h-screen bg-white">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <TopNav />
          <div className="flex-1 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-[#C2410C] border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  const caseColumns: Column<InstitutionDetail["cases"][number]>[] = [
    {
      key: "case_number",
      header: "Case Number",
      render: (c) => (
        <span className="font-bold text-[#1F2937] whitespace-nowrap">
          {c.case_number}
        </span>
      ),
    },
    {
      key: "title",
      header: "Grievance Title",
      render: (c) => (
        <div className="max-w-[320px]">
          <div className="text-[13px] text-[#6B7280]">{c.category}</div>
          <div className="font-semibold text-[#1F2937] line-clamp-2">{c.title}</div>
        </div>
      ),
    },
    {
      key: "bureau_code",
      header: "Holding Bureau",
      align: "center",
      render: (c) => (
        <span className="inline-block text-[13px] px-2.5 py-0.5 rounded-[8px] bg-white border border-[#D1D5DB] text-[#1F2937]">
          {c.bureau_code || "Unassigned"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (c) => <StatusBadge status={c.status} />,
    },
    {
      key: "received_date",
      header: "Lodged Date",
      render: (c) => (
        <span className="text-[#6B7280] text-[13px] whitespace-nowrap">
          {c.received_date ? new Date(c.received_date).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      key: "expected_disposal_date",
      header: "Expected Disposal",
      render: (c) => (
        <span className="text-[13px] whitespace-nowrap text-[#6B7280]">
          {c.expected_disposal_date ? new Date(c.expected_disposal_date).toLocaleDateString() : "—"}
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
          className="font-semibold text-[#C2410C] hover:underline whitespace-nowrap text-[13px]"
        >
          View Dossier &rarr;
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
            title={inst.name}
            description={`Permanent ID: ${inst.aicte_permanent_id} • ${inst.region} Region • ${inst.city}, ${inst.state}`}
            actions={[
              {
                label: "Back to Institutions",
                href: "/institutions",
                variant: "secondary",
                icon: <ArrowLeft className="w-4 h-4" />,
              },
            ]}
          />

          {/* 2. KPI / Summary Row: Equal height 96px */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard
              label="Total Cases on Record"
              value={inst.total_cases}
              icon={<FolderOpen className="w-4 h-4" />}
            />
            <KpiCard
              label="Open / In Process"
              value={inst.open_cases}
              alert={inst.open_cases > 0}
              icon={<Building2 className="w-4 h-4" />}
            />
            <KpiCard
              label="Disposed / Resolved"
              value={inst.disposed_cases}
              icon={<Landmark className="w-4 h-4" />}
            />
            <KpiCard
              label="Accreditation Status"
              value={inst.status}
              icon={<MapPin className="w-4 h-4" />}
            />
          </div>

          {/* 3. Main Content: Profile Details + Case History */}
          <div className="space-y-8">
            <div className="p-[20px] bg-white rounded-[8px] border border-[#FED7AA] grid grid-cols-1 md:grid-cols-4 gap-4 text-[14px]">
              <div>
                <span className="text-[#6B7280] block text-[13px] font-medium">AICTE Permanent ID</span>
                <span className="font-bold text-[#1F2937] text-[16px]">{inst.aicte_permanent_id}</span>
              </div>
              <div>
                <span className="text-[#6B7280] block text-[13px] font-medium">Campus Location</span>
                <span className="font-semibold text-[#1F2937]">
                  {inst.city}, {inst.state} ({inst.region} Region)
                </span>
                <p className="text-[13px] text-[#6B7280] mt-0.5 m-0 truncate">{inst.address}</p>
              </div>
              <div>
                <span className="text-[#6B7280] block text-[13px] font-medium">Classification</span>
                <span className="font-semibold text-[#1F2937]">{inst.type || "Technical Institute"}</span>
              </div>
              <div>
                <span className="text-[#6B7280] block text-[13px] font-medium">Active Inquiries In</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {inst.bureaus_involved.length === 0 ? (
                    <span className="text-[#6B7280] text-[13px]">No open inquiries</span>
                  ) : (
                    inst.bureaus_involved.map((bName, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-0.5 rounded-[8px] bg-white border border-[#D1D5DB] text-[#1F2937] text-[13px]"
                      >
                        {bName}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h2 className="text-[18px] font-bold text-[#1F2937] leading-[1.5] m-0">
                  Consolidated Case History Across Bureaus
                </h2>
                <p className="text-[13px] text-[#6B7280] leading-[1.5] mt-0.5 m-0">
                  Unified cross-bureau grievance registry ({inst.cases.length} records)
                </p>
              </div>

              <DataTable
                columns={caseColumns}
                data={inst.cases}
                keyExtractor={(c) => c.id}
                emptyMessage="No grievances on record for this institution."
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
