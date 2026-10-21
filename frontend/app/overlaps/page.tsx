"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { StatusBadge } from "@/components/StatusBadge";
import { apiRequest } from "@/lib/api";
import { OverlapGroup, OverlapMember } from "@/lib/types";
import {
  GitCompare, Link2, GitMerge, XCircle, AlertTriangle,
  Building, CheckCircle2, ChevronRight, Eye, ShieldAlert
} from "lucide-react";
import Link from "next/link";

export default function OverlapsPage() {
  const [overlaps, setOverlaps] = useState<OverlapGroup[]>([]);
  const [statusFilter, setStatusFilter] = useState("Open");
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />

        <main className="p-6 space-y-6 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#FED7AA] gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#C2410C]">
                Duplicate Action Prevention & Cross-Bureau SBERT Engine
              </span>
              <h2 className="text-xl font-bold text-[#1F2937]">
                Potential Overlapping Cases Queue
              </h2>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1.5 p-1 bg-[#FFF7ED] rounded-[6px] border border-[#FED7AA] text-xs font-bold">
              {["Open", "Linked", "Merged", "Dismissed", ""].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded transition-colors ${
                    statusFilter === st
                      ? "bg-[#C2410C] text-white shadow-sm"
                      : "text-[#6B7280] hover:text-[#1F2937]"
                  }`}
                >
                  {st || "All Clusters"}
                </button>
              ))}
            </div>
          </div>

          {/* Queue List */}
          {loading ? (
            <div className="p-12 text-center text-[#6B7280]">
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-[#C2410C] border-t-transparent rounded-full animate-spin" />
                <span>Evaluating semantic overlaps...</span>
              </div>
            </div>
          ) : overlaps.length === 0 ? (
            <div className="p-12 text-center bg-[#FFF7ED] rounded-[8px] border border-[#FED7AA] text-sm text-[#6B7280]">
              No {statusFilter ? statusFilter.toLowerCase() : ""} overlap clusters found in the queue.
            </div>
          ) : (
            <div className="space-y-6">
              {overlaps.map((grp) => (
                <div
                  key={grp.id}
                  id={`group-${grp.id}`}
                  className="bg-white rounded-[8px] border border-[#EA580C] shadow-sm overflow-hidden"
                >
                  {/* Banner Header */}
                  <div className="p-4 bg-[#FFF7ED] border-b border-[#FED7AA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-[#C2410C] text-white">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-[#C2410C]">
                            Potential Overlapping Cases – Coordination Required
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFEDD5] text-[#9A3412] border border-[#FED7AA]">
                            {grp.severity} Severity
                          </span>
                        </div>
                        <p className="text-xs text-[#1F2937] mt-0.5">
                          Matched Institution: <strong className="text-[#C2410C]">{grp.institution_name}</strong> (Permanent ID: <strong>{grp.aicte_permanent_id}</strong>)
                        </p>
                      </div>
                    </div>

                    {/* Confidence Score Pill & Actions */}
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs text-[#6B7280] block">Match Confidence</span>
                        <span className="text-base font-bold text-[#C2410C]">
                          {(grp.score * 100).toFixed(1)}%
                        </span>
                      </div>

                      {grp.status === "Open" ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openActionModal(grp, "Link")}
                            className="px-3 py-1.5 text-xs font-bold rounded-[6px] bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] hover:bg-[#FFEDD5] transition-colors flex items-center gap-1"
                          >
                            <Link2 className="w-3.5 h-3.5" />
                            Link
                          </button>
                          <button
                            onClick={() => openActionModal(grp, "Merge")}
                            className="px-3 py-1.5 text-xs font-bold rounded-[6px] bg-[#C2410C] text-white hover:bg-[#EA580C] transition-colors flex items-center gap-1"
                          >
                            <GitMerge className="w-3.5 h-3.5" />
                            Merge
                          </button>
                          <button
                            onClick={() => openActionModal(grp, "Dismiss")}
                            className="px-3 py-1.5 text-xs font-bold rounded-[6px] bg-white text-[#6B7280] border border-[#FED7AA] hover:text-[#C2410C] transition-colors flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Dismiss
                          </button>
                        </div>
                      ) : (
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-[#FFF7ED] text-[#1F2937] border border-[#FED7AA]">
                          Status: {grp.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rules and Explanation */}
                  <div className="px-4 py-2 bg-[#FFF7ED]/40 border-b border-[#FED7AA] text-xs space-y-1">
                    <p className="text-[#1F2937] font-semibold">{grp.explanation}</p>
                    {grp.rules_fired && grp.rules_fired.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 items-center pt-1">
                        <span className="text-[#6B7280]">Rules Fired:</span>
                        {grp.rules_fired.map((rf, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-white border border-[#FED7AA] text-[11px] text-[#9A3412]"
                          >
                            {rf}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Side-by-Side Cases Comparison */}
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {grp.members.map((mem, idx) => (
                      <div
                        key={mem.id}
                        className={`p-4 rounded-[8px] border text-xs space-y-2.5 ${
                          mem.role === "primary"
                            ? "bg-[#FFF7ED] border-[#F97316]"
                            : "bg-white border-[#FED7AA]"
                        }`}
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-[#FED7AA]">
                          <span className="font-bold text-[#C2410C]">
                            Case {idx + 1}: {mem.case_number}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF7ED] border border-[#FED7AA] text-[#9A3412]">
                            Bureau: {mem.bureau_code}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-bold text-[#6B7280] block">
                            {mem.category}
                          </span>
                          <h4 className="font-bold text-sm text-[#1F2937] mt-0.5">
                            {mem.case_title}
                          </h4>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[#FED7AA]/60">
                          <StatusBadge status={mem.case_status || "Pending"} />
                          <Link
                            href={`/cases/${mem.case_id}`}
                            className="font-bold text-[#C2410C] hover:underline flex items-center gap-1"
                          >
                            View Case Record <Eye className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Dismissed justification if dismissed */}
                  {grp.status === "Dismissed" && grp.dismiss_reason && (
                    <div className="p-3 bg-[#FFF7ED] border-t border-[#FED7AA] text-xs text-[#6B7280]">
                      <strong className="text-[#C2410C]">Dismissal Audit Record:</strong> {grp.dismiss_reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Review & Resolution Modal */}
      {activeGroup && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[8px] border border-[#FED7AA] shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="border-b border-[#FED7AA] pb-3">
              <span className="text-xs font-bold uppercase text-[#C2410C]">
                Inter-Bureau Coordination Action
              </span>
              <h3 className="text-base font-bold text-[#1F2937]">
                Execute Officer Decision: {actionType} Overlap
              </h3>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded text-xs border ${
                  feedback.error
                    ? "bg-[#FFF7ED] border-[#C2410C] text-[#C2410C]"
                    : "bg-[#FFF7ED] border-[#F97316] text-[#C2410C] font-bold"
                }`}
              >
                {feedback.text}
              </div>
            )}

            <form onSubmit={handleExecuteAction} className="space-y-4 text-xs">
              <div className="p-3 bg-[#FFF7ED] rounded border border-[#FED7AA]">
                <span className="font-bold text-[#1F2937]">Action Explanation:</span>
                {actionType === "Link" && (
                  <p className="text-[#6B7280] mt-1">
                    Links both cases as mutually related cluster under different bureaus. Both remain open and require joint inter-bureau coordination.
                  </p>
                )}
                {actionType === "Merge" && (
                  <p className="text-[#6B7280] mt-1">
                    Merges secondary case into the primary case. Secondary case will be marked as Disposed with full historical timeline preserved to prevent duplicate action.
                  </p>
                )}
                {actionType === "Dismiss" && (
                  <p className="text-[#6B7280] mt-1">
                    Dismisses this overlap notification. Both cases will proceed normally. A mandatory reason must be provided for statutory audit records.
                  </p>
                )}
              </div>

              {actionType === "Merge" && (
                <div>
                  <label className="block font-bold text-[#1F2937] mb-1">
                    Select Primary Case to Absorb Investigation *
                  </label>
                  <select
                    value={primaryCaseId}
                    onChange={(e) => setPrimaryCaseId(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#FED7AA] rounded text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                  >
                    {activeGroup.members.map((m) => (
                      <option key={m.case_id} value={m.case_id}>
                        {m.case_number} ({m.bureau_code}) — {m.case_title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-[#1F2937] mb-1">
                  Officer Remarks & Justification (Mandatory for Audit Trail) *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Record justification, hearing numbers, or agreed inter-bureau action protocol..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#FED7AA] rounded text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#FED7AA]">
                <button
                  type="button"
                  onClick={() => setActiveGroup(null)}
                  className="px-3 py-1.5 border border-[#FED7AA] text-[#6B7280] font-semibold rounded hover:bg-[#FFF7ED]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-[#C2410C] text-white font-bold rounded hover:bg-[#EA580C] disabled:opacity-50"
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
