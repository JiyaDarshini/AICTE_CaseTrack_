"use client";

import React, { useState, useEffect, Suspense } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { StatusBadge } from "@/components/StatusBadge";
import { Drawer } from "@/components/Drawer";
import { apiRequest } from "@/lib/api";
import { Case } from "@/lib/types";
import {
  Search, Filter, Plus, ChevronLeft, ChevronRight,
  RotateCcw, Building, FileText, CheckCircle2, AlertTriangle, Eye
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function CasesContent() {
  const searchParams = useSearchParams();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Filters State
  const [institutionName, setInstitutionName] = useState("");
  const [aictePermanentId, setAictePermanentId] = useState("");
  const [caseNumber, setCaseNumber] = useState(searchParams.get("case_number") || "");
  const [bureauCode, setBureauCode] = useState("");
  const [region, setRegion] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Create Case Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newCase, setNewCase] = useState({
    aicte_permanent_id: "",
    category: "General Grievance",
    title: "",
    description: "",
    complainant_type: "Student",
    current_bureau_code: "PGRC",
    sla_days: 30
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (institutionName) params.append("institution_name", institutionName);
      if (aictePermanentId) params.append("aicte_permanent_id", aictePermanentId);
      if (caseNumber) params.append("case_number", caseNumber);
      if (bureauCode) params.append("bureau_code", bureauCode);
      if (region) params.append("region", region);
      if (category) params.append("category", category);
      if (status) params.append("status", status);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      params.append("limit", "50");

      const data = await apiRequest<Case[]>(`/cases?${params.toString()}`);
      setCases(data || []);
    } catch (err) {
      console.error("Error fetching cases", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [bureauCode, region, status]);

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCases();
  };

  const handleResetFilters = () => {
    setInstitutionName("");
    setAictePermanentId("");
    setCaseNumber("");
    setBureauCode("");
    setRegion("");
    setCategory("");
    setStatus("");
    setStartDate("");
    setEndDate("");
    setTimeout(fetchCases, 50);
  };

  const handleRowClick = (caseItem: Case) => {
    setSelectedCase(caseItem);
    setDrawerOpen(true);
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);
    setSubmitting(true);

    try {
      const created = await apiRequest<Case>("/cases", {
        method: "POST",
        body: JSON.stringify(newCase),
      });

      setCreateSuccess(`Case ${created.case_number} created successfully!`);
      setTimeout(() => {
        setCreateModalOpen(false);
        setCreateSuccess(null);
        fetchCases();
      }, 1500);
    } catch (err: any) {
      setCreateError(err.message || "Failed to create case.");
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
                Centralized Institution Grievance Register
              </span>
              <h2 className="text-xl font-bold text-[#1F2937]">
                Institution Cases & Complaints
              </h2>
            </div>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[6px] bg-[#C2410C] text-white hover:bg-[#EA580C] shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Lodge New Case
            </button>
          </div>

          {/* Advanced Search & Filter Bar (8 Filters) */}
          <div className="p-4 bg-[#FFF7ED] rounded-[8px] border border-[#FED7AA] shadow-sm">
            <div className="flex items-center gap-2 mb-3 text-xs font-bold text-[#C2410C] uppercase tracking-wide">
              <Filter className="w-4 h-4" />
              Advanced Multi-Dimensional Filters
            </div>

            <form onSubmit={handleApplyFilters} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* 1. Case Number */}
              <div>
                <label className="block font-semibold text-[#1F2937] mb-1">Case Number</label>
                <input
                  type="text"
                  placeholder="e.g. AICTE-PGRC-2026..."
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-[#FED7AA] rounded text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                />
              </div>

              {/* 2. AICTE Permanent ID */}
              <div>
                <label className="block font-semibold text-[#1F2937] mb-1">AICTE Permanent ID</label>
                <input
                  type="text"
                  placeholder="e.g. 1-1002341"
                  value={aictePermanentId}
                  onChange={(e) => setAictePermanentId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-[#FED7AA] rounded text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                />
              </div>

              {/* 3. Institution Name */}
              <div>
                <label className="block font-semibold text-[#1F2937] mb-1">Institution Name</label>
                <input
                  type="text"
                  placeholder="Search name keyword..."
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-[#FED7AA] rounded text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                />
              </div>

              {/* 4. Bureau / Cell */}
              <div>
                <label className="block font-semibold text-[#1F2937] mb-1">Holding Bureau / Cell</label>
                <select
                  value={bureauCode}
                  onChange={(e) => setBureauCode(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-[#FED7AA] rounded text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                >
                  <option value="">All Bureaus</option>
                  <option value="RB">Regulation Bureau (RB)</option>
                  <option value="PGRC">Public Grievance Redressal Cell (PGRC)</option>
                  <option value="AB">Approval Bureau (AB)</option>
                  <option value="PAPB">Policy & Academic Planning (PAPB)</option>
                  <option value="LC">Legal Cell (LC)</option>
                </select>
              </div>

              {/* 5. Region */}
              <div>
                <label className="block font-semibold text-[#1F2937] mb-1">Region</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-[#FED7AA] rounded text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                >
                  <option value="">All Regions</option>
                  <option value="Northern">Northern Region</option>
                  <option value="Southern">Southern Region</option>
                  <option value="Western">Western Region</option>
                  <option value="Eastern">Eastern Region</option>
                  <option value="Central">Central Region</option>
                </select>
              </div>

              {/* 6. Category */}
              <div>
                <label className="block font-semibold text-[#1F2937] mb-1">Complaint Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-[#FED7AA] rounded text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                >
                  <option value="">All Categories</option>
                  <option value="Faculty & Staff Grievance">Faculty & Staff Grievance</option>
                  <option value="Admission & Capitation Fee">Admission & Capitation Fee</option>
                  <option value="Infrastructure & Facilities">Infrastructure & Facilities</option>
                  <option value="Ragging & Student Safety">Ragging & Student Safety</option>
                  <option value="Maladministration & Harassment">Maladministration & Harassment</option>
                  <option value="Examination & Degree Malpractice">Examination & Degree Malpractice</option>
                </select>
              </div>

              {/* 7. Status */}
              <div>
                <label className="block font-semibold text-[#1F2937] mb-1">Case Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-[#FED7AA] rounded text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                >
                  <option value="">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Under Process">Under Process</option>
                  <option value="Disposed">Disposed</option>
                  <option value="Transferred">Transferred</option>
                  <option value="Escalated">Escalated</option>
                </select>
              </div>

              {/* 8. Date Range / Actions */}
              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="flex-1 py-1.5 bg-[#C2410C] text-white font-bold rounded hover:bg-[#EA580C] transition-colors flex items-center justify-center gap-1"
                >
                  <Search className="w-3.5 h-3.5" />
                  Apply Filters
                </button>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3 py-1.5 bg-white border border-[#FED7AA] text-[#C2410C] font-semibold rounded hover:bg-[#FFEDD5] transition-colors"
                  title="Reset Filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>

          {/* Cases Table */}
          <div className="bg-white rounded-[8px] border border-[#FED7AA] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#FED7AA] bg-[#FFF7ED] flex items-center justify-between">
              <span className="text-xs font-bold text-[#1F2937]">
                Displaying {cases.length} records • Click any row for details
              </span>
            </div>

            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-left text-xs casetrack-table">
                <thead>
                  <tr>
                    <th className="py-2.5 px-3 font-bold text-[#C2410C]">Case Number</th>
                    <th className="py-2.5 px-3 font-bold text-[#C2410C]">Institution & Region</th>
                    <th className="py-2.5 px-3 font-bold text-[#C2410C]">Category & Title</th>
                    <th className="py-2.5 px-3 font-bold text-[#C2410C]">Bureau</th>
                    <th className="py-2.5 px-3 font-bold text-[#C2410C]">Status</th>
                    <th className="py-2.5 px-3 font-bold text-[#C2410C]">Received Date</th>
                    <th className="py-2.5 px-3 font-bold text-[#C2410C]">SLA Remaining</th>
                    <th className="py-2.5 px-3 font-bold text-[#C2410C] text-center">Overlaps</th>
                    <th className="py-2.5 px-3 font-bold text-[#C2410C] text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FED7AA]">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-[#6B7280]">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-[#C2410C] border-t-transparent rounded-full animate-spin" />
                          <span>Querying case records...</span>
                        </div>
                      </td>
                    </tr>
                  ) : cases.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-[#6B7280]">
                        No matching cases found for the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    cases.map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => handleRowClick(c)}
                        className="cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-3 font-bold text-[#1F2937] whitespace-nowrap">
                          {c.case_number}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-[#1F2937]">{c.institution_name}</div>
                          <div className="text-[10px] text-[#6B7280]">
                            {c.aicte_permanent_id} {c.institution_region && `• ${c.institution_region}`}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 max-w-xs">
                          <div className="text-[10px] uppercase font-bold text-[#C2410C]">{c.category}</div>
                          <div className="font-medium text-[#1F2937] truncate">{c.title}</div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="font-semibold px-2 py-0.5 rounded bg-[#FFF7ED] border border-[#FED7AA] text-[#9A3412]">
                            {c.current_bureau_code || "Unassigned"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <StatusBadge status={c.status} isOverdue={c.is_overdue} />
                        </td>
                        <td className="py-2.5 px-3 text-[#6B7280] whitespace-nowrap">
                          {new Date(c.received_date).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {c.status === "Disposed" ? (
                            <span className="text-[#6B7280]">—</span>
                          ) : c.is_overdue ? (
                            <span className="font-bold text-[#C2410C]">
                              {Math.abs(c.days_remaining || 0)}d Overdue
                            </span>
                          ) : (
                            <span className="text-[#1F2937] font-semibold">
                              {c.days_remaining}d left
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {c.overlap_count > 0 ? (
                            <span className="font-bold text-white px-2 py-0.5 rounded-full bg-[#C2410C]">
                              {c.overlap_count} Linked
                            </span>
                          ) : (
                            <span className="text-[#6B7280]">None</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <Link
                            href={`/cases/${c.id}`}
                            className="inline-flex items-center gap-1 font-bold text-[#C2410C] hover:underline"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Dossier
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

      {/* Case Quick Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        caseItem={selectedCase}
      />

      {/* Create Case Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[8px] border border-[#FED7AA] shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="border-b border-[#FED7AA] pb-3">
              <span className="text-xs font-bold uppercase text-[#C2410C]">Intake Registration</span>
              <h3 className="text-base font-bold text-[#1F2937]">Lodge Formal Complaint</h3>
            </div>

            {createError && (
              <div className="p-3 bg-[#FFF7ED] border border-[#C2410C] text-xs text-[#C2410C] rounded">
                {createError}
              </div>
            )}
            {createSuccess && (
              <div className="p-3 bg-[#FFF7ED] border border-[#F97316] text-xs text-[#C2410C] font-bold rounded">
                {createSuccess}
              </div>
            )}

            <form onSubmit={handleCreateCase} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#1F2937] mb-1">
                  AICTE Permanent ID (Exact Match Required) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1-1002341"
                  value={newCase.aicte_permanent_id}
                  onChange={(e) => setNewCase({ ...newCase, aicte_permanent_id: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-1.5 border border-[#FED7AA] rounded focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1F2937] mb-1">Complaint Category *</label>
                  <select
                    value={newCase.category}
                    onChange={(e) => setNewCase({ ...newCase, category: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#FED7AA] rounded focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                  >
                    <option value="Faculty & Staff Grievance">Faculty & Staff Grievance</option>
                    <option value="Admission & Capitation Fee">Admission & Capitation Fee</option>
                    <option value="Infrastructure & Facilities">Infrastructure & Facilities</option>
                    <option value="Ragging & Student Safety">Ragging & Student Safety</option>
                    <option value="Maladministration & Harassment">Maladministration & Harassment</option>
                    <option value="General Grievance">General Grievance</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#1F2937] mb-1">Initial Bureau Routing *</label>
                  <select
                    value={newCase.current_bureau_code}
                    onChange={(e) => setNewCase({ ...newCase, current_bureau_code: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#FED7AA] rounded focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                  >
                    <option value="PGRC">Public Grievance Redressal Cell (PGRC)</option>
                    <option value="RB">Regulation Bureau (RB)</option>
                    <option value="AB">Approval Bureau (AB)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1F2937] mb-1">Grievance Subject / Title *</label>
                <input
                  type="text"
                  required
                  placeholder="Brief summary of grievance..."
                  value={newCase.title}
                  onChange={(e) => setNewCase({ ...newCase, title: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#FED7AA] rounded focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1F2937] mb-1">Detailed Description *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Complete details, dates, and evidence descriptions..."
                  value={newCase.description}
                  onChange={(e) => setNewCase({ ...newCase, description: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#FED7AA] rounded focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#FED7AA]">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3 py-1.5 border border-[#FED7AA] text-[#6B7280] font-semibold rounded hover:bg-[#FFF7ED]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-[#C2410C] text-white font-bold rounded hover:bg-[#EA580C] disabled:opacity-50"
                >
                  {submitting ? "Analyzing & Saving..." : "Lodge Case & Run Overlap Engine"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CasesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen bg-white">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <TopNav />
            <div className="flex-1 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-[#C2410C] border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        </div>
      }
    >
      <CasesContent />
    </Suspense>
  );
}

