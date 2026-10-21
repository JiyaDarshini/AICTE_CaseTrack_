"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { AlertStrip } from "@/components/AlertStrip";
import { StatusBadge } from "@/components/StatusBadge";
import { apiRequest } from "@/lib/api";
import { CaseDetail } from "@/lib/types";
import {
  ArrowLeft, Building, Calendar, Clock, AlertTriangle,
  ArrowRightLeft, ShieldAlert, Send
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
      setFeedbackMsg({ text: "Case status and audit history updated successfully." });
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
      setFeedbackMsg({ text: `Case successfully transferred to ${transferAction.to_bureau_code}.` });
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
      setFeedbackMsg({ text: "Case escalated to Senior Management." });
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

        <main className="p-8 space-y-8 max-w-[1280px] w-full mx-auto overflow-y-auto">
          {/* 1. Unified PageHeader */}
          <PageHeader
            title={`Case ${caseData.case_number}`}
            description={`${caseData.category} • ${caseData.institution_name} (${caseData.aicte_permanent_id})`}
            actions={[
              {
                label: "Back to Cases",
                href: "/cases",
                variant: "secondary",
                icon: <ArrowLeft className="w-4 h-4" />,
              },
            ]}
          />

          {/* 2. Compact Alert Strip (Max 1) if Overlaps Exist */}
          {caseData.overlapping_cases && caseData.overlapping_cases.length > 0 && (
            <AlertStrip
              title={`${caseData.overlapping_cases.length} Potential Overlapping Case${caseData.overlapping_cases.length > 1 ? "s" : ""} Detected`}
              description="Review matched institutional complaints to prevent duplicated investigation."
              actionText="Review Overlap"
              actionHref={`/overlaps#group-${caseData.overlapping_cases[0].group_id}`}
            />
          )}

          {/* 3. KPI / Summary Row: Equal height 96px */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard
              label="Current Status"
              value={caseData.status}
              icon={<Clock className="w-4 h-4" />}
            />
            <KpiCard
              label="Holding Bureau"
              value={caseData.current_bureau_code || "Unassigned"}
              icon={<Building className="w-4 h-4" />}
            />
            <KpiCard
              label="Lodged Date"
              value={new Date(caseData.received_date).toLocaleDateString()}
              icon={<Calendar className="w-4 h-4" />}
            />
            <KpiCard
              label="SLA Remaining"
              value={
                caseData.status === "Disposed"
                  ? "Disposed"
                  : caseData.is_overdue
                  ? `${Math.abs(caseData.days_remaining || 0)}d Overdue`
                  : `${caseData.days_remaining}d remaining`
              }
              alert={caseData.is_overdue}
              icon={<AlertTriangle className="w-4 h-4" />}
            />
          </div>

          {/* 4. Main Content: 2 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 Cols: Details & Timeline */}
            <div className="lg:col-span-2 space-y-8">
              {/* Institution & Overview Card */}
              <div className="p-[20px] bg-white rounded-[8px] border border-[#FED7AA] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-[#FED7AA] pb-4 gap-2">
                  <div>
                    <span className="text-[13px] text-[#6B7280] block font-medium">
                      Subject Institution
                    </span>
                    <h2 className="text-[18px] font-bold text-[#1F2937] leading-[1.5] m-0">
                      {caseData.institution_name}
                    </h2>
                    <p className="text-[13px] text-[#6B7280] leading-[1.5] mt-0.5 m-0">
                      AICTE Permanent ID: <strong className="text-[#1F2937]">{caseData.aicte_permanent_id}</strong>
                      {caseData.institution_region && ` • ${caseData.institution_region} Region`}
                    </p>
                  </div>
                  <Link
                    href={`/institutions/${caseData.institution_id}`}
                    className="text-[13px] font-semibold text-[#C2410C] hover:underline shrink-0"
                  >
                    View Institution Profile &rarr;
                  </Link>
                </div>

                <div>
                  <span className="text-[13px] text-[#6B7280] block font-medium">
                    Grievance Subject
                  </span>
                  <h3 className="text-[15px] font-bold text-[#1F2937] leading-[1.5] mt-0.5 m-0">
                    {caseData.title}
                  </h3>
                  <p className="text-[14px] text-[#1F2937] mt-2 leading-[1.5] whitespace-pre-line p-3 rounded-[8px] bg-white border border-[#FED7AA]">
                    {caseData.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[13px] pt-2">
                  <div className="p-3 bg-white rounded-[8px] border border-[#FED7AA]">
                    <span className="text-[#6B7280] block text-[13px]">Complainant</span>
                    <span className="font-semibold text-[#1F2937] text-[14px]">{caseData.complainant_type || "Direct Public"}</span>
                  </div>
                  <div className="p-3 bg-white rounded-[8px] border border-[#FED7AA]">
                    <span className="text-[#6B7280] block text-[13px]">Category</span>
                    <span className="font-semibold text-[#1F2937] text-[14px]">{caseData.category}</span>
                  </div>
                  <div className="p-3 bg-white rounded-[8px] border border-[#FED7AA]">
                    <span className="text-[#6B7280] block text-[13px]">Expected Disposal</span>
                    <span className={`font-semibold text-[14px] ${caseData.is_overdue ? "text-[#C2410C]" : "text-[#1F2937]"}`}>
                      {caseData.expected_disposal_date ? new Date(caseData.expected_disposal_date).toLocaleDateString() : "—"}
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-[8px] border border-[#FED7AA]">
                    <span className="text-[#6B7280] block text-[13px]">Holding Cell</span>
                    <span className="font-semibold text-[#1F2937] text-[14px]">
                      {caseData.current_bureau_code}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action History Timeline */}
              <div className="p-[20px] bg-white rounded-[8px] border border-[#FED7AA] space-y-4">
                <div className="border-b border-[#FED7AA] pb-3">
                  <h2 className="text-[18px] font-bold text-[#1F2937] leading-[1.5] m-0">
                    Action Timeline & Audit Trail
                  </h2>
                  <p className="text-[13px] text-[#6B7280] leading-[1.5] mt-0.5 m-0">
                    Chronological record of official hearings, transfers, and directives ({caseData.actions.length} events)
                  </p>
                </div>

                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#FED7AA]">
                  {caseData.actions.map((act) => (
                    <div key={act.id} className="relative">
                      <div className="absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full bg-[#C2410C]" />
                      <div className="p-3 bg-white rounded-[8px] border border-[#FED7AA] text-[14px]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-[#1F2937]">
                            {act.action_type}
                          </span>
                          <span className="text-[13px] text-[#6B7280]">
                            {new Date(act.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[#1F2937] mt-1 leading-[1.5] m-0 line-clamp-2">
                          {act.remarks}
                        </p>
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#FED7AA] text-[13px] text-[#6B7280]">
                          <span>Officer: <strong className="text-[#1F2937] font-semibold">{act.officer_name || "Official"}</strong></span>
                          {act.bureau_code && <span>• Bureau: <strong className="text-[#1F2937] font-semibold">{act.bureau_code}</strong></span>}
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
              <div className="p-[20px] bg-white rounded-[8px] border border-[#FED7AA]">
                <h2 className="text-[18px] font-bold text-[#1F2937] leading-[1.5] m-0">
                  Officer Action Center
                </h2>
                <p className="text-[13px] text-[#6B7280] leading-[1.5] mt-0.5 mb-4 m-0">
                  Update status, route to another bureau, or escalate
                </p>

                {feedbackMsg && (
                  <div
                    className={`mb-4 p-3 rounded-[8px] text-[14px] border ${
                      feedbackMsg.error
                        ? "bg-white border-[#C2410C] text-[#C2410C]"
                        : "bg-white border-[#FED7AA] text-[#1F2937]"
                    }`}
                  >
                    {feedbackMsg.text}
                  </div>
                )}

                {/* Tabs */}
                <div className="flex border-b border-[#FED7AA] text-[14px] font-semibold mb-4">
                  <button
                    onClick={() => setActiveTab("status")}
                    className={`py-2 px-3 border-b-2 transition-colors ${
                      activeTab === "status"
                        ? "border-[#C2410C] text-[#C2410C]"
                        : "border-transparent text-[#6B7280] hover:text-[#1F2937]"
                    }`}
                  >
                    Status
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
                  <form onSubmit={handleStatusSubmit} className="space-y-4 text-[14px]">
                    <div>
                      <label className="block text-[13px] font-semibold text-[#1F2937] mb-1">
                        New Status
                      </label>
                      <select
                        value={statusAction.status}
                        onChange={(e) => setStatusAction({ ...statusAction, status: e.target.value })}
                        className="w-full h-[38px] px-3 border border-[#FED7AA] rounded-[8px] text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316] bg-white"
                      >
                        <option value="Under Process">Under Process</option>
                        <option value="Pending">Pending Inquiry</option>
                        <option value="Disposed">Disposed (Resolution Finalized)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[13px] font-semibold text-[#1F2937] mb-1">
                        Official Remarks (Mandatory) *
                      </label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Details of inquiry, hearing proceedings, or directives issued..."
                        value={statusAction.remarks}
                        onChange={(e) => setStatusAction({ ...statusAction, remarks: e.target.value })}
                        className="w-full p-3 border border-[#FED7AA] rounded-[8px] text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316] bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[13px] font-semibold text-[#1F2937] mb-1">
                        Next Action Directive
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Schedule hearing on 25th May..."
                        value={statusAction.next_action}
                        onChange={(e) => setStatusAction({ ...statusAction, next_action: e.target.value })}
                        className="w-full h-[38px] px-3 border border-[#FED7AA] rounded-[8px] text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316] bg-white"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2.5 bg-[#C2410C] text-white font-semibold rounded-[8px] hover:bg-[#EA580C] transition-colors disabled:opacity-50 text-[14px]"
                    >
                      {submitting ? "Recording..." : "Record Status Update"}
                    </button>
                  </form>
                )}

                {/* Tab 2: Transfer Case */}
                {activeTab === "transfer" && (
                  <form onSubmit={handleTransferSubmit} className="space-y-4 text-[14px]">
                    <div>
                      <label className="block text-[13px] font-semibold text-[#1F2937] mb-1">
                        Target Bureau / Cell
                      </label>
                      <select
                        value={transferAction.to_bureau_code}
                        onChange={(e) => setTransferAction({ ...transferAction, to_bureau_code: e.target.value })}
                        className="w-full h-[38px] px-3 border border-[#FED7AA] rounded-[8px] text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316] bg-white"
                      >
                        <option value="RB">Regulation Bureau (RB)</option>
                        <option value="PGRC">Public Grievance Redressal Cell (PGRC)</option>
                        <option value="AB">Approval Bureau (AB)</option>
                        <option value="PAPB">Policy & Academic Planning Bureau</option>
                        <option value="LC">Legal Cell (LC)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[13px] font-semibold text-[#1F2937] mb-1">
                        Transfer Justification *
                      </label>
                      <textarea
                        required
                        rows={3}
                        placeholder="State legal or jurisdictional grounds for routing..."
                        value={transferAction.remarks}
                        onChange={(e) => setTransferAction({ ...transferAction, remarks: e.target.value })}
                        className="w-full p-3 border border-[#FED7AA] rounded-[8px] text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316] bg-white"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2.5 bg-[#C2410C] text-white font-semibold rounded-[8px] hover:bg-[#EA580C] transition-colors disabled:opacity-50 text-[14px] flex items-center justify-center gap-2"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                      <span>{submitting ? "Transferring..." : "Execute Case Transfer"}</span>
                    </button>
                  </form>
                )}

                {/* Tab 3: Escalate Case */}
                {activeTab === "escalate" && (
                  <form onSubmit={handleEscalateSubmit} className="space-y-4 text-[14px]">
                    <div>
                      <label className="block text-[13px] font-semibold text-[#1F2937] mb-1">
                        Escalation Trigger
                      </label>
                      <select
                        value={escalateAction.escalation_reason}
                        onChange={(e) => setEscalateAction({ ...escalateAction, escalation_reason: e.target.value })}
                        className="w-full h-[38px] px-3 border border-[#FED7AA] rounded-[8px] text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316] bg-white"
                      >
                        <option value="SLA / Inaction">Imminent / Existing SLA Breach</option>
                        <option value="Inter-Bureau Deadlock">Inter-Bureau Deadlock / Jurisdiction Conflict</option>
                        <option value="Severe Regulatory Violation">Severe Statutory Non-Compliance</option>
                        <option value="High Public Grievance">High Visibility / Public Grievance</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[13px] font-semibold text-[#1F2937] mb-1">
                        Escalation Briefing Notes *
                      </label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Comprehensive briefing note for Member Secretary / Director..."
                        value={escalateAction.remarks}
                        onChange={(e) => setEscalateAction({ ...escalateAction, remarks: e.target.value })}
                        className="w-full p-3 border border-[#FED7AA] rounded-[8px] text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316] bg-white"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2.5 bg-[#C2410C] text-white font-semibold rounded-[8px] hover:bg-[#EA580C] transition-colors disabled:opacity-50 text-[14px] flex items-center justify-center gap-2"
                    >
                      <ShieldAlert className="w-4 h-4" />
                      <span>{submitting ? "Escalating..." : "Escalate to Senior Management"}</span>
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
