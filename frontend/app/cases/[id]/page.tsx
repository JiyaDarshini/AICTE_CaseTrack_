"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { StatusBadge } from "@/components/StatusBadge";
import { OverlapBanner } from "@/components/OverlapBanner";
import { apiRequest } from "@/lib/api";
import { CaseDetail, CaseAction } from "@/lib/types";
import {
  ArrowLeft, Building, Calendar, Clock, AlertTriangle,
  UserCheck, ArrowRightLeft, ShieldAlert, FileText, CheckCircle2, Send
} from "lucide-react";
import Link from "next/link";

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;

  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Action forms state
  const [statusAction, setStatusAction] = useState({ status: "Under Process", remarks: "", next_action: "" });
  const [transferAction, setTransferAction] = useState({ to_bureau_code: "RB", remarks: "" });
  const [escalateAction, setEscalateAction] = useState({ remarks: "", escalation_reason: "SLA / Inaction" });
  const [activeTab, setActiveTab] = useState<"status" | "transfer" | "escalate">("status");
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const fetchCase = async () => {
    try {
      const data = await apiRequest<CaseDetail>(`/cases/${caseId}`);
      setCaseData(data);
      if (data) {
        setStatusAction((prev) => ({ ...prev, status: data.status }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (caseId) fetchCase();
  }, [caseId]);

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusAction.remarks.trim()) return;
    setSubmitting(true);
    setFeedbackMsg(null);
    try {
      await apiRequest(`/cases/${caseId}/status`, {
        method: "PATCH",
        body: JSON.stringify(statusAction),
      });
      setFeedbackMsg({ text: "Case status and audit history updated!" });
      setStatusAction((prev) => ({ ...prev, remarks: "" }));
      fetchCase();
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || "Failed to update status", error: true });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferAction.remarks.trim()) return;
    setSubmitting(true);
    setFeedbackMsg(null);
    try {
      await apiRequest(`/cases/${caseId}/transfer`, {
        method: "POST",
        body: JSON.stringify(transferAction),
      });
      setFeedbackMsg({ text: `Case transferred to ${transferAction.to_bureau_code}!` });
      setTransferAction((prev) => ({ ...prev, remarks: "" }));
      fetchCase();
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || "Failed to transfer case", error: true });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEscalateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalateAction.remarks.trim()) return;
    setSubmitting(true);
    setFeedbackMsg(null);
    try {
      await apiRequest(`/cases/${caseId}/escalate`, {
        method: "POST",
        body: JSON.stringify(escalateAction),
      });
      setFeedbackMsg({ text: "Case escalated to Senior Management!" });
      setEscalateAction((prev) => ({ ...prev, remarks: "" }));
      fetchCase();
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || "Failed to escalate case", error: true });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !caseData) {
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
          {/* Back button and Case Number */}
          <div className="flex items-center justify-between pb-4 border-b border-[#FED7AA]">
            <div className="flex items-center gap-3">
              <Link
                href="/cases"
                className="p-1.5 rounded-full hover:bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <span className="text-xs font-bold text-[#C2410C] uppercase tracking-wide">
                  Case Record & Official Dossier
                </span>
                <h2 className="text-xl font-bold text-[#1F2937]">
                  {caseData.case_number}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <StatusBadge status={caseData.status} isOverdue={caseData.is_overdue} />
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#FFF7ED] border border-[#FED7AA] text-[#C2410C]">
                Bureau: {caseData.current_bureau_code || "Unassigned"}
              </span>
            </div>
          </div>

          {/* Overlapping cases banner if detected */}
          {caseData.overlapping_cases && caseData.overlapping_cases.length > 0 && (
            <div className="space-y-3">
              {caseData.overlapping_cases.map((ov, idx) => (
                <OverlapBanner
                  key={idx}
                  groupId={ov.group_id}
                  institutionName={caseData.institution_name || ""}
                  aictePermanentId={caseData.aicte_permanent_id || ""}
                  severity={ov.severity}
                  score={ov.score}
                  explanation={ov.explanation}
                  rulesFired={ov.rules_fired}
                />
              ))}
            </div>
          )}

          {/* Dossier Grid: 2 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Details & Timeline */}
            <div className="lg:col-span-2 space-y-6">
              {/* Institution & Overview Card */}
              <div className="p-5 bg-white rounded-[8px] border border-[#FED7AA] shadow-sm space-y-4">
                <div className="flex items-start justify-between border-b border-[#FED7AA] pb-3">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                      Subject Institution
                    </span>
                    <h3 className="font-bold text-base text-[#1F2937]">
                      {caseData.institution_name}
                    </h3>
                    <p className="text-xs text-[#6B7280]">
                      AICTE Permanent ID: <strong className="text-[#1F2937]">{caseData.aicte_permanent_id}</strong>
                      {caseData.institution_region && ` • ${caseData.institution_region} Region`}
                    </p>
                  </div>
                  <Link
                    href={`/institutions/${caseData.institution_id}`}
                    className="text-xs font-bold text-[#C2410C] hover:underline"
                  >
                    View All Cases for this Institution &rarr;
                  </Link>
                </div>

                <div>
                  <span className="text-xs font-bold text-[#C2410C] uppercase tracking-wide">
                    {caseData.category}
                  </span>
                  <h4 className="text-sm font-bold text-[#1F2937] mt-0.5">
                    {caseData.title}
                  </h4>
                  <p className="text-xs text-[#1F2937] mt-2 leading-relaxed whitespace-pre-line bg-[#FFF7ED]/50 p-3 rounded border border-[#FED7AA]/50">
                    {caseData.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
                  <div className="p-2.5 bg-[#FFF7ED] rounded border border-[#FED7AA]">
                    <span className="text-[#6B7280] block">Complainant</span>
                    <span className="font-semibold text-[#1F2937]">{caseData.complainant_type || "Direct Public"}</span>
                  </div>
                  <div className="p-2.5 bg-[#FFF7ED] rounded border border-[#FED7AA]">
                    <span className="text-[#6B7280] block">Received On</span>
                    <span className="font-semibold text-[#1F2937]">
                      {new Date(caseData.received_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="p-2.5 bg-[#FFF7ED] rounded border border-[#FED7AA]">
                    <span className="text-[#6B7280] block">Expected Disposal</span>
                    <span className={`font-semibold ${caseData.is_overdue ? "text-[#C2410C]" : "text-[#1F2937]"}`}>
                      {caseData.expected_disposal_date ? new Date(caseData.expected_disposal_date).toLocaleDateString() : "—"}
                    </span>
                  </div>
                  <div className="p-2.5 bg-[#FFF7ED] rounded border border-[#FED7AA]">
                    <span className="text-[#6B7280] block">SLA Status</span>
                    <span className={`font-bold ${caseData.is_overdue ? "text-[#C2410C]" : "text-[#1F2937]"}`}>
                      {caseData.status === "Disposed" ? "Disposed" : caseData.is_overdue ? `${Math.abs(caseData.days_remaining || 0)}d Overdue` : `${caseData.days_remaining}d remaining`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Chronological Action History Timeline */}
              <div className="p-5 bg-white rounded-[8px] border border-[#FED7AA] shadow-sm">
                <h3 className="font-bold text-sm text-[#1F2937] mb-4 pb-2 border-b border-[#FED7AA]">
                  Chronological Action Timeline & Audit Log ({caseData.actions.length} Events)
                </h3>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#FED7AA]">
                  {caseData.actions.map((act) => (
                    <div key={act.id} className="relative">
                      {/* Timeline dot */}
                      <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-[#C2410C] border-2 border-white" />
                      <div className="p-3 bg-[#FFF7ED] rounded-[6px] border border-[#FED7AA]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-[#C2410C]">
                            {act.action_type}
                          </span>
                          <span className="text-[10px] text-[#6B7280]">
                            {new Date(act.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-[#1F2937] mt-1 leading-relaxed">
                          {act.remarks}
                        </p>
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#FED7AA]/60 text-[10px] text-[#6B7280]">
                          <span>Logged by: <strong className="text-[#1F2937]">{act.officer_name || "Official"}</strong></span>
                          {act.bureau_code && <span>• Bureau: <strong className="text-[#1F2937]">{act.bureau_code}</strong></span>}
                          {act.from_bureau_code && act.to_bureau_code && (
                            <span>• Transferred: <strong>{act.from_bureau_code} &rarr; {act.to_bureau_code}</strong></span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Col: Officer Action Controls */}
            <div className="space-y-6">
              {/* Officer Action Box */}
              <div className="p-5 bg-white rounded-[8px] border border-[#FED7AA] shadow-sm">
                <h3 className="font-bold text-sm text-[#1F2937] mb-3">
                  Officer Action Center
                </h3>

                {feedbackMsg && (
                  <div
                    className={`mb-3 p-2.5 rounded text-xs border ${
                      feedbackMsg.error
                        ? "bg-[#FFF7ED] border-[#C2410C] text-[#C2410C]"
                        : "bg-[#FFF7ED] border-[#F97316] text-[#C2410C] font-semibold"
                    }`}
                  >
                    {feedbackMsg.text}
                  </div>
                )}

                {/* Tabs */}
                <div className="flex border-b border-[#FED7AA] text-xs font-bold mb-3">
                  <button
                    onClick={() => setActiveTab("status")}
                    className={`py-2 px-3 border-b-2 transition-colors ${
                      activeTab === "status"
                        ? "border-[#C2410C] text-[#C2410C]"
                        : "border-transparent text-[#6B7280] hover:text-[#1F2937]"
                    }`}
                  >
                    Status Update
                  </button>
                  <button
                    onClick={() => setActiveTab("transfer")}
                    className={`py-2 px-3 border-b-2 transition-colors ${
                      activeTab === "transfer"
                        ? "border-[#C2410C] text-[#C2410C]"
                        : "border-transparent text-[#6B7280] hover:text-[#1F2937]"
                    }`}
                  >
                    Transfer
                  </button>
                  <button
                    onClick={() => setActiveTab("escalate")}
                    className={`py-2 px-3 border-b-2 transition-colors ${
                      activeTab === "escalate"
                        ? "border-[#C2410C] text-[#C2410C]"
                        : "border-transparent text-[#6B7280] hover:text-[#1F2937]"
                    }`}
                  >
                    Escalate
                  </button>
                </div>

                {/* Tab 1: Update Status */}
                {activeTab === "status" && (
                  <form onSubmit={handleStatusSubmit} className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-[#1F2937] mb-1">New Status</label>
                      <select
                        value={statusAction.status}
                        onChange={(e) => setStatusAction({ ...statusAction, status: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-[#FED7AA] rounded text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                      >
                        <option value="Under Process">Under Process</option>
                        <option value="Pending">Pending Inquiry</option>
                        <option value="Disposed">Disposed (Resolution Finalized)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-[#1F2937] mb-1">Official Remarks (Mandatory) *</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Details of inquiry, hearing proceedings, or directives issued..."
                        value={statusAction.remarks}
                        onChange={(e) => setStatusAction({ ...statusAction, remarks: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-[#FED7AA] rounded text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-[#1F2937] mb-1">Next Action Directive</label>
                      <input
                        type="text"
                        placeholder="e.g. Schedule hearing on 25th May..."
                        value={statusAction.next_action}
                        onChange={(e) => setStatusAction({ ...statusAction, next_action: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-[#FED7AA] rounded text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2 bg-[#C2410C] text-white font-bold rounded hover:bg-[#EA580C] transition-colors disabled:opacity-50"
                    >
                      {submitting ? "Recording..." : "Record Status Update"}
                    </button>
                  </form>
                )}

                {/* Tab 2: Transfer Case */}
                {activeTab === "transfer" && (
                  <form onSubmit={handleTransferSubmit} className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-[#1F2937] mb-1">Target Bureau / Cell</label>
                      <select
                        value={transferAction.to_bureau_code}
                        onChange={(e) => setTransferAction({ ...transferAction, to_bureau_code: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-[#FED7AA] rounded text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                      >
                        <option value="RB">Regulation Bureau (RB)</option>
                        <option value="PGRC">Public Grievance Redressal Cell (PGRC)</option>
                        <option value="AB">Approval Bureau (AB)</option>
                        <option value="PAPB">Policy & Academic Planning Bureau</option>
                        <option value="LC">Legal Cell (LC)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-[#1F2937] mb-1">Transfer Justification *</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="State legal or jurisdictional grounds for routing to another Bureau..."
                        value={transferAction.remarks}
                        onChange={(e) => setTransferAction({ ...transferAction, remarks: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-[#FED7AA] rounded text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2 bg-[#EA580C] text-white font-bold rounded hover:bg-[#C2410C] transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      {submitting ? "Transferring..." : "Execute Case Transfer"}
                    </button>
                  </form>
                )}

                {/* Tab 3: Escalate Case */}
                {activeTab === "escalate" && (
                  <form onSubmit={handleEscalateSubmit} className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-[#1F2937] mb-1">Escalation Trigger</label>
                      <select
                        value={escalateAction.escalation_reason}
                        onChange={(e) => setEscalateAction({ ...escalateAction, escalation_reason: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-[#FED7AA] rounded text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                      >
                        <option value="SLA / Inaction">Imminent / Existing SLA Breach</option>
                        <option value="Inter-Bureau Deadlock">Inter-Bureau Deadlock / Jurisdiction Conflict</option>
                        <option value="Severe Regulatory Violation">Severe Statutory Non-Compliance</option>
                        <option value="High Public Grievance">High Visibility / Media Inquiry</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-[#1F2937] mb-1">Escalation Notes for Senior Management *</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Comprehensive briefing note for Member Secretary / Director..."
                        value={escalateAction.remarks}
                        onChange={(e) => setEscalateAction({ ...escalateAction, remarks: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-[#FED7AA] rounded text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2 bg-[#C2410C] text-white font-bold rounded hover:bg-[#9A3412] transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      {submitting ? "Escalating..." : "Escalate to Senior Management"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
