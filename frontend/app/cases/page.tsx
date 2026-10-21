"use client";

import React, { useState, useEffect, Suspense } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { FilterBar, FilterItem } from "@/components/FilterBar";
import { DataTable, Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Drawer } from "@/components/Drawer";
import { apiRequest } from "@/lib/api";
import { Case } from "@/lib/types";
import { Plus, X, Eye, FolderOpen, Clock, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
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
    sla_days: 30,
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

      setCreateSuccess(`Case ${created.case_number} registered successfully!`);
      setTimeout(() => {
        setCreateModalOpen(false);
        setCreateSuccess(null);
        fetchCases();
      }, 1200);
    } catch (err: any) {
      setCreateError(err.message || "Failed to register case.");
    } finally {
      setSubmitting(false);
    }
  };

  // FilterBar configuration: max 4 visible
  const filterItems: FilterItem[] = [
    {
      key: "caseNumber",
      label: "Case Number",
      placeholder: "Search Case Number...",
      value: caseNumber,
      onChange: (val) => {
        setCaseNumber(val);
      },
    },
    {
      key: "institutionName",
      label: "Institution",
      placeholder: "Search Institution...",
      value: institutionName,
      onChange: (val) => {
        setInstitutionName(val);
      },
    },
    {
      key: "bureauCode",
      label: "Holding Bureau",
      type: "select",
      value: bureauCode,
      onChange: (val) => setBureauCode(val),
      options: [
        { label: "Regulation Bureau (RB)", value: "RB" },
        { label: "Public Grievance Cell (PGRC)", value: "PGRC" },
        { label: "Approval Bureau (AB)", value: "AB" },
        { label: "Policy & Academic Planning (PAPB)", value: "PAPB" },
        { label: "Legal Cell (LC)", value: "LC" },
      ],
    },
    {
      key: "status",
      label: "Case Status",
      type: "select",
      value: status,
      onChange: (val) => setStatus(val),
      options: [
        { label: "Pending", value: "Pending" },
        { label: "Under Process", value: "Under Process" },
        { label: "Disposed", value: "Disposed" },
        { label: "Transferred", value: "Transferred" },
        { label: "Escalated", value: "Escalated" },
      ],
    },
    // Extra filters in popover
    {
      key: "aictePermanentId",
      label: "Permanent ID",
      placeholder: "e.g. 1-1002341",
      value: aictePermanentId,
      onChange: (val) => setAictePermanentId(val),
    },
    {
      key: "region",
      label: "Region",
      type: "select",
      value: region,
      onChange: (val) => setRegion(val),
      options: [
        { label: "Northern", value: "Northern" },
        { label: "Southern", value: "Southern" },
        { label: "Western", value: "Western" },
        { label: "Eastern", value: "Eastern" },
        { label: "Central", value: "Central" },
      ],
    },
    {
      key: "category",
      label: "Grievance Category",
      type: "select",
      value: category,
      onChange: (val) => setCategory(val),
      options: [
        { label: "Faculty & Staff Grievance", value: "Faculty & Staff Grievance" },
        { label: "Admission & Capitation Fee", value: "Admission & Capitation Fee" },
        { label: "Infrastructure & Facilities", value: "Infrastructure & Facilities" },
        { label: "Ragging & Student Safety", value: "Ragging & Student Safety" },
        { label: "Maladministration & Harassment", value: "Maladministration & Harassment" },
        { label: "Examination & Degree Malpractice", value: "Examination & Degree Malpractice" },
      ],
    },
    {
      key: "startDate",
      label: "Start Date",
      type: "date",
      value: startDate,
      onChange: (val) => setStartDate(val),
    },
    {
      key: "endDate",
      label: "End Date",
      type: "date",
      value: endDate,
      onChange: (val) => setEndDate(val),
    },
  ];

  // Quick summary counts
  const pendingCount = cases.filter((c) => c.status === "Pending").length;
  const underProcessCount = cases.filter((c) => c.status === "Under Process").length;
  const overdueCount = cases.filter((c) => c.is_overdue).length;
  const disposedCount = cases.filter((c) => c.status === "Disposed").length;

  // DataTable columns (max 8 visible)
  const columns: Column<Case>[] = [
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
      key: "institution_name",
      header: "Institution",
      render: (c) => (
        <div className="min-w-[180px] max-w-[260px]">
          <div className="font-semibold text-[#1F2937] truncate">{c.institution_name}</div>
          <div className="text-[13px] text-[#6B7280]">
            {c.aicte_permanent_id} {c.institution_region && `• ${c.institution_region}`}
          </div>
        </div>
      ),
    },
    {
      key: "title",
      header: "Grievance Title",
      render: (c) => (
        <div className="min-w-[200px] max-w-[320px]">
          <div className="text-[13px] text-[#6B7280]">{c.category}</div>
          <div className="font-medium text-[#1F2937] line-clamp-2">{c.title}</div>
        </div>
      ),
    },
    {
      key: "current_bureau_code",
      header: "Bureau",
      align: "center",
      render: (c) => (
        <span className="inline-block text-[13px] px-2.5 py-0.5 rounded-[8px] bg-white border border-[#D1D5DB] text-[#1F2937]">
          {c.current_bureau_code || "Unassigned"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (c) => <StatusBadge status={c.status} isOverdue={c.is_overdue} />,
    },
    {
      key: "received_date",
      header: "Lodged Date",
      render: (c) => (
        <span className="text-[#6B7280] text-[13px] whitespace-nowrap">
          {new Date(c.received_date).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "days_remaining",
      header: "SLA Remaining",
      render: (c) => (
        <span className="whitespace-nowrap text-[13px]">
          {c.status === "Disposed" ? (
            <span className="text-[#6B7280]">—</span>
          ) : c.is_overdue ? (
            <span className="font-semibold text-[#C2410C]">
              {Math.abs(c.days_remaining || 0)}d Overdue
            </span>
          ) : (
            <span className="text-[#1F2937] font-medium">
              {c.days_remaining}d left
            </span>
          )}
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
          onClick={(e) => e.stopPropagation()}
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
            title="Institution Cases & Complaints"
            description="Centralized institution grievance register, status tracking, and SLA monitoring across AICTE bureaus."
            actions={[
              {
                label: "+ Lodge New Case",
                onClick: () => setCreateModalOpen(true),
              },
            ]}
          />

          {/* 2. KPI / Summary Row: Equal height 96px */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <KpiCard
              label="Total Matching"
              value={cases.length}
              icon={<FolderOpen className="w-4 h-4" />}
            />
            <KpiCard
              label="Pending"
              value={pendingCount}
              icon={<Clock className="w-4 h-4" />}
            />
            <KpiCard
              label="Under Process"
              value={underProcessCount}
              icon={<RefreshCw className="w-4 h-4" />}
            />
            <KpiCard
              label="Overdue SLA"
              value={overdueCount}
              alert={overdueCount > 0}
              icon={<AlertTriangle className="w-4 h-4" />}
            />
            <KpiCard
              label="Disposed"
              value={disposedCount}
              icon={<CheckCircle2 className="w-4 h-4" />}
            />
          </div>

          {/* 3. Main Content: FilterBar + DataTable */}
          <div className="space-y-4">
            <div className="p-4 bg-white border border-[#FED7AA] rounded-[8px]">
              <FilterBar
                filters={filterItems}
                onReset={handleResetFilters}
                maxVisible={4}
              />
            </div>

            <DataTable
              columns={columns}
              data={cases}
              keyExtractor={(c) => c.id}
              emptyMessage={loading ? "Loading case records..." : "No cases match the selected filters."}
              onRowClick={handleRowClick}
            />
          </div>
        </main>
      </div>

      {/* Drawer for Case Quick Preview */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        caseItem={selectedCase}
      />

      {/* Create Case Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-[#FED7AA] rounded-[8px] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#FED7AA]">
              <div>
                <h2 className="text-[18px] font-bold text-[#1F2937] leading-[1.5] m-0">
                  Lodge New Grievance Case
                </h2>
                <p className="text-[13px] text-[#6B7280] leading-[1.5] mt-0.5 m-0">
                  Register official complaint for regulatory bureau tracking
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded hover:bg-[#FFF7ED] text-[#6B7280] hover:text-[#1F2937]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createSuccess && (
              <div className="p-3 bg-white border border-[#FED7AA] text-[#1F2937] rounded-[8px] text-[14px]">
                {createSuccess}
              </div>
            )}
            {createError && (
              <div className="p-3 bg-white border border-[#C2410C] text-[#C2410C] rounded-[8px] text-[14px]">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateCase} className="space-y-4 text-[14px]">
              <div>
                <label className="block text-[13px] font-semibold text-[#1F2937] mb-1">
                  AICTE Permanent ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1-1002341"
                  value={newCase.aicte_permanent_id}
                  onChange={(e) => setNewCase({ ...newCase, aicte_permanent_id: e.target.value })}
                  className="w-full h-[38px] px-3 bg-white border border-[#FED7AA] rounded-[8px] text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-semibold text-[#1F2937] mb-1">
                    Bureau / Cell
                  </label>
                  <select
                    value={newCase.current_bureau_code}
                    onChange={(e) => setNewCase({ ...newCase, current_bureau_code: e.target.value })}
                    className="w-full h-[38px] px-3 bg-white border border-[#FED7AA] rounded-[8px] text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                  >
                    <option value="PGRC">PGRC</option>
                    <option value="RB">Regulation Bureau</option>
                    <option value="AB">Approval Bureau</option>
                    <option value="PAPB">PAPB</option>
                    <option value="LC">Legal Cell</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-[#1F2937] mb-1">
                    Category
                  </label>
                  <select
                    value={newCase.category}
                    onChange={(e) => setNewCase({ ...newCase, category: e.target.value })}
                    className="w-full h-[38px] px-3 bg-white border border-[#FED7AA] rounded-[8px] text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                  >
                    <option value="General Grievance">General Grievance</option>
                    <option value="Faculty & Staff Grievance">Faculty & Staff</option>
                    <option value="Admission & Capitation Fee">Admission & Fees</option>
                    <option value="Infrastructure & Facilities">Infrastructure</option>
                    <option value="Ragging & Student Safety">Student Safety</option>
                    <option value="Maladministration & Harassment">Maladministration</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#1F2937] mb-1">
                  Grievance Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Summary of complaint..."
                  value={newCase.title}
                  onChange={(e) => setNewCase({ ...newCase, title: e.target.value })}
                  className="w-full h-[38px] px-3 bg-white border border-[#FED7AA] rounded-[8px] text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#1F2937] mb-1">
                  Detailed Description *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Elaborate facts, dates, affected parties..."
                  value={newCase.description}
                  onChange={(e) => setNewCase({ ...newCase, description: e.target.value })}
                  className="w-full p-3 bg-white border border-[#FED7AA] rounded-[8px] text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#FED7AA]">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-[14px] font-semibold rounded-[8px] bg-white border border-[#FED7AA] text-[#1F2937] hover:bg-[#FFF7ED]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-[14px] font-semibold rounded-[8px] bg-[#C2410C] text-white hover:bg-[#EA580C] disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Case"}
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
        <div className="flex h-screen items-center justify-center bg-white text-[#1F2937]">
          <div className="w-5 h-5 border-2 border-[#C2410C] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CasesContent />
    </Suspense>
  );
}
