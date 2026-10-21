"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { StatusBadge } from "@/components/StatusBadge";
import { apiRequest } from "@/lib/api";
import { InstitutionDetail } from "@/lib/types";
import { ArrowLeft, Building2, MapPin, Landmark, FolderOpen, ExternalLink, ShieldCheck } from "lucide-react";
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

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />

        <main className="p-6 space-y-6 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#FED7AA]">
            <div className="flex items-center gap-3">
              <Link
                href="/institutions"
                className="p-1.5 rounded-full hover:bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <span className="text-xs font-bold text-[#C2410C] uppercase tracking-wide">
                  Institution Profile & Cross-Bureau Register
                </span>
                <h2 className="text-xl font-bold text-[#1F2937]">
                  {inst.name}
                </h2>
              </div>
            </div>

            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]">
              {inst.status}
            </span>
          </div>

          {/* Profile Overview Card */}
          <div className="p-5 bg-white rounded-[8px] border border-[#FED7AA] shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[#6B7280] block font-semibold">AICTE Permanent ID</span>
              <span className="text-base font-bold text-[#1F2937]">{inst.aicte_permanent_id}</span>
            </div>
            <div>
              <span className="text-[#6B7280] block font-semibold">Region & Campus Location</span>
              <span className="font-semibold text-[#1F2937]">
                {inst.region} Region • {inst.city}, {inst.state}
              </span>
              <p className="text-[11px] text-[#6B7280] mt-0.5">{inst.address}</p>
            </div>
            <div>
              <span className="text-[#6B7280] block font-semibold">Institution Classification</span>
              <span className="font-semibold text-[#1F2937]">{inst.type || "Technical Institute"}</span>
            </div>
            <div>
              <span className="text-[#6B7280] block font-semibold">Bureaus Handling Active Inquiries</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {inst.bureaus_involved.length === 0 ? (
                  <span className="text-[#6B7280]">No open inquiries</span>
                ) : (
                  inst.bureaus_involved.map((bName, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-[#FFF7ED] border border-[#FED7AA] text-[#C2410C] font-bold text-[10px]"
                    >
                      {bName}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Case Statistics Bar */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-[8px] bg-[#FFF7ED] border border-[#FED7AA]">
              <span className="text-xs font-bold text-[#6B7280] uppercase">Total Cases on Record</span>
              <div className="text-2xl font-bold text-[#1F2937] mt-1">{inst.total_cases}</div>
            </div>
            <div className="p-4 rounded-[8px] bg-[#FFF7ED] border border-[#FED7AA]">
              <span className="text-xs font-bold text-[#C2410C] uppercase">Open / Under Process</span>
              <div className="text-2xl font-bold text-[#C2410C] mt-1">{inst.open_cases}</div>
            </div>
            <div className="p-4 rounded-[8px] bg-[#FFF7ED] border border-[#FED7AA]">
              <span className="text-xs font-bold text-[#6B7280] uppercase">Resolved / Disposed</span>
              <div className="text-2xl font-bold text-[#1F2937] mt-1">{inst.disposed_cases}</div>
            </div>
          </div>

          {/* Consolidated Case History Across Bureaus */}
          <div className="bg-white rounded-[8px] border border-[#FED7AA] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#FED7AA] bg-[#FFF7ED] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#1F2937]">Consolidated Case History Across All Bureaus</h3>
                <p className="text-xs text-[#6B7280]">Single-window institutional cross-bureau ledger</p>
              </div>
              <span className="text-xs font-bold text-[#C2410C]">
                {inst.cases.length} Complaints
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs casetrack-table">
                <thead>
                  <tr>
                    <th className="py-2.5 px-3 font-bold text-[#C2410C]">Case Number</th>
                    <th className="py-2.5 px-3 font-bold text-[#C2410C]">Category & Title</th>
                    <th className="py-2.5 px-3 font-bold text-[#C2410C]">Holding Bureau</th>
                    <th className="py-2.5 px-3 font-bold text-[#C2410C]">Status</th>
                    <th className="py-2.5 px-3 font-bold text-[#C2410C]">Lodged Date</th>
                    <th className="py-2.5 px-3 font-bold text-[#C2410C] text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FED7AA]">
                  {inst.cases.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-[#6B7280]">
                        No complaints registered against this institution.
                      </td>
                    </tr>
                  ) : (
                    inst.cases.map((c) => (
                      <tr key={c.id} className="transition-colors">
                        <td className="py-2.5 px-3 font-bold text-[#1F2937]">{c.case_number}</td>
                        <td className="py-2.5 px-3">
                          <div className="text-[10px] uppercase font-bold text-[#C2410C]">{c.category}</div>
                          <div className="font-medium text-[#1F2937]">{c.title}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-[#FFF7ED] border border-[#FED7AA] text-[#9A3412] font-semibold">
                            {c.bureau_code}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="py-2.5 px-3 text-[#6B7280]">
                          {c.received_date ? new Date(c.received_date).toLocaleDateString() : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Link
                            href={`/cases/${c.id}`}
                            className="inline-flex items-center gap-1 font-bold text-[#C2410C] hover:underline"
                          >
                            Dossier <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
