"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { EmptyState } from "@/components/EmptyState";
import { apiRequest } from "@/lib/api";
import { OverlapGroup, OverlapMember } from "@/lib/types";
import {
  GitCompare, Link2, GitMerge, XCircle, AlertTriangle,
  Building, CheckCircle2, ChevronRight, Eye, X, ChevronDown
} from "lucide-react";
import Link from "next/link";

export default function OverlapsPage() {
  const [overlaps, setOverlaps] = useState<OverlapGroup[]>([]);
  const [statusFilter, setStatusFilter] = useState("Open");
  const [loading, setLoading] = useState(true);
  const [expandedRules, setExpandedRules] = useState<Record<string, boolean>>({});

  // Resolution Modal State
  const [activeGroup, setActiveGroup] = useState<OverlapGroup | null>(null);
  const [actionType, setActionType] = useState<"Link" | "Merge" | "Dismiss">("Link");
  const [primaryCaseId, setPrimaryCaseId] = useState<string>("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null);

  const fetchOverlaps = async () => {
    setLoading(true);
    try {
      const url = statusFilter ? `/overlaps?status=${statusFilter}` : "/overlaps";
      const data = await apiRequest<OverlapGroup[]>(url);
      setOverlaps(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverlaps();
  }, [statusFilter]);

  const toggleRules = (groupId: string) => {
    setExpandedRules((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const openActionModal = (grp: OverlapGroup, type: "Link" | "Merge" | "Dismiss") => {
    setActiveGroup(grp);
    setActionType(type);
    setRemarks("");
    setFeedback(null);
    if (grp.members && grp.members.length > 0) {
      setPrimaryCaseId(grp.members[0].case_id);
    }
  };

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup) return;
    if (!remarks.trim() || remarks.trim().length < 5) {
      setFeedback({ text: "Please enter a mandatory justification (min 5 characters) for audit trail.", error: true });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const endpoint = `/overlaps/${activeGroup.id}/${actionType.toLowerCase()}`;
      await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify({
          action: actionType,
          primary_case_id: actionType === "Merge" ? primaryCaseId : undefined,
          remarks: remarks.trim(),
        }),
      });

      setFeedback({ text: `Overlap resolved: Marked as ${actionType}ed successfully!` });
      setTimeout(() => {
        setActiveGroup(null);
        fetchOverlaps();
      }, 1200);
    } catch (err: any) {
      setFeedback({ text: err.message || "Failed to resolve overlap", error: true });
    } finally {
      setSubmitting(false);
    }
  };

  const openCount = overlaps.filter((o) => o.status === "Open").length;
  const linkedCount = overlaps.filter((o) => o.status === "Linked").length;
  const mergedCount = overlaps.filter((o) => o.status === "Merged").length;
  const highSevCount = overlaps.filter((o) => o.severity === "High").length;

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />

        <main className="p-8 space-y-8 max-w-[1280px] w-full mx-auto overflow-y-auto">
          {/* 1. Unified PageHeader */}
          <PageHeader
            title="Potential Overlapping Cases Queue"
            description="Duplicate action prevention, semantic grievance matching, and cross-bureau coordination."
          />

          {/* 2. KPI / Summary Row: Equal height 96px */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <KpiCard
              label="Total Clusters"
              value={overlaps.length}
              icon={<GitCompare className="w-4 h-4" />}
            />
            <KpiCard
              label="Open Action Required"
              value={openCount}
              alert={openCount > 0}
              icon={<AlertTriangle className="w-4 h-4" />}
            />
            <KpiCard
              label="Linked Groups"
              value={linkedCount}
              icon={<Link2 className="w-4 h-4" />}
            />
            <KpiCard
              label="Merged Clusters"
              value={mergedCount}
              icon={<GitMerge className="w-4 h-4" />}
            />
            <KpiCard
              label="High Severity"
              value={highSevCount}
              alert={highSevCount > 0}
              icon={<AlertTriangle className="w-4 h-4" />}
            />
          </div>

          {/* 3. Filter Tabs */}
          <div className="flex items-center gap-2 border-b border-[#FED7AA] pb-3 text-[14px]">
            {["Open", "Linked", "Merged", "Dismissed", ""].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-[8px] font-semibold transition-colors ${
                  statusFilter === st
                    ? "bg-[#C2410C] text-white"
                    : "bg-white text-[#1F2937] border border-[#FED7AA] hover:bg-[#FFF7ED]"
                }`}
              >
                {st || "All Clusters"}
              </button>
            ))}
          </div>

          {/* 4. Overlap Clusters List */}
          {loading ? (
            <div className="p-12 text-center text-[#6B7280]">
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-[#C2410C] border-t-transparent rounded-full animate-spin" />
                <span className="text-[14px]">Evaluating semantic overlaps...</span>
              </div>
            </div>
          ) : overlaps.length === 0 ? (
            <EmptyState
              title={`No ${statusFilter ? statusFilter.toLowerCase() : ""} overlap clusters`}
              description="No cases meet the threshold criteria for cross-bureau overlap in this view."
            />
          ) : (
            <div className="space-y-6">
              {overlaps.map((grp) => {
                const isRulesExpanded = !!expandedRules[grp.id];
                return (
                  <div
                    key={grp.id}
                    id={`group-${grp.id}`}
                    className="bg-white rounded-[8px] border border-[#FED7AA] p-[20px] space-y-4"
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#FED7AA] pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-[18px] font-bold text-[#1F2937] leading-[1.5] m-0">
                            {grp.institution_name}
                          </h2>
                          <span className="text-[13px] px-2.5 py-0.5 rounded-[8px] bg-white border border-[#D1D5DB] text-[#1F2937]">
                            {grp.severity} Severity ({(grp.score * 100).toFixed(0)}% Match)
                          </span>
                        </div>
                        <p className="text-[13px] text-[#6B7280] leading-[1.5] mt-0.5 m-0">
                          AICTE Permanent ID: <strong className="text-[#1F2937]">{grp.aicte_permanent_id}</strong>
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {grp.status === "Open" ? (
                          <>
                            <button
                              onClick={() => openActionModal(grp, "Link")}
                              className="px-3 py-1.5 text-[13px] font-semibold rounded-[8px] bg-white text-[#1F2937] border border-[#FED7AA] hover:bg-[#FFF7ED] transition-colors flex items-center gap-1.5"
                            >
                              <Link2 className="w-3.5 h-3.5" />
                              <span>Link</span>
                            </button>
                            <button
                              onClick={() => openActionModal(grp, "Merge")}
                              className="px-3 py-1.5 text-[13px] font-semibold rounded-[8px] bg-[#C2410C] text-white hover:bg-[#EA580C] transition-colors flex items-center gap-1.5"
                            >
                              <GitMerge className="w-3.5 h-3.5" />
                              <span>Merge</span>
                            </button>
                            <button
                              onClick={() => openActionModal(grp, "Dismiss")}
                              className="px-3 py-1.5 text-[13px] font-semibold rounded-[8px] bg-white text-[#6B7280] border border-[#FED7AA] hover:text-[#1F2937] transition-colors flex items-center gap-1.5"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Dismiss</span>
                            </button>
                          </>
                        ) : (
                          <span className="px-3 py-1 text-[13px] font-semibold rounded-[8px] bg-white border border-[#D1D5DB] text-[#1F2937]">
                            Status: {grp.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Explanation & Collapsible Rule Details */}
                    <div className="text-[14px] text-[#1F2937] space-y-2">
                      <p className="m-0 leading-[1.5] line-clamp-2">{grp.explanation}</p>
                      {grp.rules_fired && grp.rules_fired.length > 0 && (
                        <div>
                          <button
                            type="button"
                            onClick={() => toggleRules(grp.id)}
                            className="text-[13px] text-[#6B7280] hover:text-[#1F2937] inline-flex items-center gap-1"
                          >
                            <span>{isRulesExpanded ? "Hide" : "Show"} Triggered Rules ({grp.rules_fired.length})</span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isRulesExpanded ? "rotate-180" : ""}`} />
                          </button>
                          {isRulesExpanded && (
                            <div className="flex flex-wrap gap-1.5 pt-2">
                              {grp.rules_fired.map((rf, i) => (
                                <span
                                  key={i}
                                  className="px-2.5 py-0.5 rounded-[8px] bg-white border border-[#D1D5DB] text-[13px] text-[#1F2937]"
                                >
                                  {rf}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Member Cases (Grid) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      {grp.members.map((mem, idx) => (
                        <div
                          key={mem.id}
                          className="p-4 rounded-[8px] bg-white border border-[#FED7AA] space-y-2"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-[#FED7AA]">
                            <span className="font-bold text-[14px] text-[#1F2937]">
                              Case {idx + 1}: {mem.case_number}
                            </span>
                            <span className="px-2 py-0.5 rounded-[8px] text-[12px] font-medium bg-white border border-[#D1D5DB] text-[#1F2937]">
                              Bureau: {mem.bureau_code}
                            </span>
                          </div>

                          <div className="text-[13px] text-[#6B7280]">{mem.category}</div>
                          <h3 className="font-bold text-[15px] text-[#1F2937] leading-[1.5] m-0 line-clamp-1">
                            {mem.case_title}
                          </h3>
                          {mem.similarity_score !== undefined && (
                            <p className="text-[13px] text-[#6B7280] leading-[1.5] m-0">
                              Relevance: {(mem.similarity_score * 100).toFixed(0)}% • Role: {mem.role}
                            </p>
                          )}

                          <div className="pt-2 flex justify-between items-center text-[13px]">
                            <span className="text-[#6B7280]">
                              Status: <strong className="text-[#1F2937]">{mem.case_status || "Open"}</strong>
                            </span>
                            <Link
                              href={`/cases/${mem.case_id}`}
                              className="font-semibold text-[#C2410C] hover:underline"
                            >
                              View Dossier &rarr;
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Action Modal */}
      {activeGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-[#FED7AA] rounded-[8px] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#FED7AA]">
              <div>
                <h2 className="text-[18px] font-bold text-[#1F2937] leading-[1.5] m-0">
                  {actionType} Overlap Cluster
                </h2>
                <p className="text-[13px] text-[#6B7280] leading-[1.5] mt-0.5 m-0">
                  Resolution for {activeGroup.institution_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveGroup(null)}
                className="p-1 rounded hover:bg-[#FFF7ED] text-[#6B7280] hover:text-[#1F2937]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-[8px] text-[14px] border ${
                  feedback.error
                    ? "bg-white border-[#C2410C] text-[#C2410C]"
                    : "bg-white border-[#FED7AA] text-[#1F2937]"
                }`}
              >
                {feedback.text}
              </div>
            )}

            <form onSubmit={handleExecuteAction} className="space-y-4 text-[14px]">
              {actionType === "Merge" && (
                <div>
                  <label className="block text-[13px] font-semibold text-[#1F2937] mb-1">
                    Designate Primary Master Case *
                  </label>
                  <select
                    value={primaryCaseId}
                    onChange={(e) => setPrimaryCaseId(e.target.value)}
                    className="w-full h-[38px] px-3 bg-white border border-[#FED7AA] rounded-[8px] text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                  >
                    {activeGroup.members.map((m) => (
                      <option key={m.case_id} value={m.case_id}>
                        {m.case_number} ({m.bureau_code}) — {m.case_title?.slice(0, 40) || "Case"}...
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[13px] font-semibold text-[#1F2937] mb-1">
                  Justification & Audit Remarks (Mandatory) *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder={`Explain the regulatory basis for ${actionType.toLowerCase()}ing these cases...`}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full p-3 bg-white border border-[#FED7AA] rounded-[8px] text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#FED7AA]">
                <button
                  type="button"
                  onClick={() => setActiveGroup(null)}
                  className="px-4 py-2 text-[14px] font-semibold rounded-[8px] bg-white border border-[#FED7AA] text-[#1F2937] hover:bg-[#FFF7ED]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-[14px] font-semibold rounded-[8px] bg-[#C2410C] text-white hover:bg-[#EA580C] disabled:opacity-50"
                >
                  {submitting ? "Processing..." : `Confirm ${actionType}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
