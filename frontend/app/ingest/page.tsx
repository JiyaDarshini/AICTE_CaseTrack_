"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { DataTable, Column } from "@/components/DataTable";
import { apiRequest } from "@/lib/api";
import { IngestionJob, InstitutionImportResult, User } from "@/lib/types";
import {
  UploadCloud, FileSpreadsheet, Download, CheckCircle2,
  AlertCircle, RefreshCw, Building2, ShieldCheck,
  ShieldAlert, ArrowRight, History
} from "lucide-react";
import Link from "next/link";

export default function IngestPage() {
  const [activeTab, setActiveTab] = useState<"complaints" | "institutions">("complaints");
  const [user, setUser] = useState<User | null>(null);

  // Complaints Ingest state
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [currentJob, setCurrentJob] = useState<IngestionJob | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  // Institutions Ingest state
  const [instFile, setInstFile] = useState<File | null>(null);
  const [instUploading, setInstUploading] = useState(false);
  const [instErrorMsg, setInstErrorMsg] = useState<string | null>(null);
  const [instResult, setInstResult] = useState<InstitutionImportResult | null>(null);

  const fetchJobs = async () => {
    try {
      const data = await apiRequest<IngestionJob[]>("/ingest/jobs");
      setJobs(data || []);
    } catch (_) {
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("casetrack_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (_) {}
    }
    fetchJobs();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMsg(null);
    }
  };

  const handleInstFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setInstFile(e.target.files[0]);
      setInstErrorMsg(null);
    }
  };

  const handleUploadComplaints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg("Please select a CSV or Excel file to upload.");
      return;
    }

    setUploading(true);
    setErrorMsg(null);
    setCurrentJob(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const job = await apiRequest<IngestionJob>("/ingest/file", {
        method: "POST",
        body: formData,
      });

      setCurrentJob(job);
      setFile(null);
      fetchJobs();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to process ingestion file.");
    } finally {
      setUploading(false);
    }
  };

  const handleUploadInstitutions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instFile) {
      setInstErrorMsg("Please select an Institutions CSV or Excel file to upload.");
      return;
    }

    setInstUploading(true);
    setInstErrorMsg(null);
    setInstResult(null);

    const formData = new FormData();
    formData.append("file", instFile);

    try {
      const res = await apiRequest<InstitutionImportResult>("/institutions/import", {
        method: "POST",
        body: formData,
      });
      setInstResult(res);
      setInstFile(null);
    } catch (err: any) {
      setInstErrorMsg(err.message || "Failed to import institutions.");
    } finally {
      setInstUploading(false);
    }
  };

  const downloadComplaintsTemplate = async () => {
    try {
      const blob = await apiRequest<Blob>("/ingest/template");
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "aicte_casetrack_complaints_template.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (_) {}
  };

  const downloadInstitutionsTemplate = () => {
    const csvContent =
      "aicte_permanent_id,name,address,city,state,region,type\n" +
      "1-1002341,Delhi Technological Institute,Bawana Road,New Delhi,Delhi,Northern,Engineering & Technology\n" +
      "1-1002342,Maharashtra Institute of Applied Sciences,Shivaji Nagar,Pune,Maharashtra,Western,Management\n" +
      "1-1002343,Karnataka College of Pharmacy,MG Road,Bengaluru,Karnataka,South-Western,Pharmacy\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aicte_institutions_import_template.csv";
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadErrors = async (jobId: string) => {
    try {
      const blob = await apiRequest<Blob>(`/ingest/jobs/${jobId}/errors`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ingest_errors_${jobId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (_) {}
  };

  const isAdmin = user?.role === "Admin";

  const totalAcceptedRows = jobs.reduce((acc, j) => acc + (j.accepted || 0), 0);
  const totalRejectedRows = jobs.reduce((acc, j) => acc + (j.rejected || 0), 0);

  const jobColumns: Column<IngestionJob>[] = [
    {
      key: "filename",
      header: "Batch Filename",
      render: (job) => (
        <span className="font-semibold text-[#1F2937]">{job.filename}</span>
      ),
    },
    {
      key: "total",
      header: "Rows Evaluated",
      align: "center",
      render: (job) => <span>{job.total}</span>,
    },
    {
      key: "accepted",
      header: "Accepted",
      align: "center",
      render: (job) => (
        <span className="font-semibold text-[#1F2937]">{job.accepted}</span>
      ),
    },
    {
      key: "rejected",
      header: "Rejected",
      align: "center",
      render: (job) => (
        <span className={job.rejected > 0 ? "font-semibold text-[#C2410C]" : "text-[#6B7280]"}>
          {job.rejected}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      render: (job) => (
        <span className="inline-block text-[13px] px-2.5 py-0.5 rounded-[8px] bg-white border border-[#D1D5DB] text-[#1F2937]">
          {job.status}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Processed At",
      render: (job) => (
        <span className="text-[#6B7280] text-[13px]">
          {new Date(job.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      key: "action",
      header: "Audit / Errors",
      align: "right",
      render: (job) =>
        job.rejected > 0 ? (
          <button
            onClick={() => downloadErrors(job.id)}
            className="font-semibold text-[#C2410C] hover:underline text-[13px] inline-flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Errors</span>
          </button>
        ) : (
          <span className="text-[#6B7280] text-[13px]">Clean Batch</span>
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
            title="Complaint & Institution Data Intake"
            description="Batch CSV/Excel ingestion, permanent ID validation, and data normalization."
            actions={[
              {
                label: activeTab === "institutions" ? "Download Institutions Template" : "Download Complaints Template",
                onClick: activeTab === "institutions" ? downloadInstitutionsTemplate : downloadComplaintsTemplate,
                variant: "secondary",
                icon: <Download className="w-4 h-4" />,
              },
            ]}
          />

          {/* 2. KPI / Summary Row: Equal height 96px */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard
              label="Ingestion Batches"
              value={jobs.length}
              icon={<History className="w-4 h-4" />}
            />
            <KpiCard
              label="Total Rows Ingested"
              value={totalAcceptedRows}
              icon={<CheckCircle2 className="w-4 h-4" />}
            />
            <KpiCard
              label="Rejected / Error Rows"
              value={totalRejectedRows}
              alert={totalRejectedRows > 0}
              icon={<AlertCircle className="w-4 h-4" />}
            />
            <KpiCard
              label="Intake Target"
              value={activeTab === "complaints" ? "Grievances" : "Institutions"}
              icon={<FileSpreadsheet className="w-4 h-4" />}
            />
          </div>

          {/* 3. Navigation Tabs */}
          <div className="flex border-b border-[#FED7AA] gap-2 text-[14px] font-semibold">
            <button
              onClick={() => setActiveTab("complaints")}
              className={`pb-2.5 px-4 border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "complaints"
                  ? "border-[#C2410C] text-[#C2410C]"
                  : "border-transparent text-[#6B7280] hover:text-[#1F2937]"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Grievance Complaints Intake</span>
            </button>
            <button
              onClick={() => setActiveTab("institutions")}
              className={`pb-2.5 px-4 border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "institutions"
                  ? "border-[#C2410C] text-[#C2410C]"
                  : "border-transparent text-[#6B7280] hover:text-[#1F2937]"
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Institutions Master Import</span>
              <span className="px-2 py-0.5 text-[11px] font-normal rounded-[8px] bg-white border border-[#D1D5DB] text-[#1F2937]">
                Admin
              </span>
            </button>
          </div>

          {/* 4. Tab 1: Grievance Complaints Upload */}
          {activeTab === "complaints" && (
            <div className="space-y-8">
              <div className="p-[20px] bg-white rounded-[8px] border border-[#FED7AA] space-y-4">
                <div>
                  <h2 className="text-[18px] font-bold text-[#1F2937] leading-[1.5] m-0">
                    Upload External Grievance Records
                  </h2>
                  <p className="text-[13px] text-[#6B7280] leading-[1.5] mt-0.5 m-0">
                    Upload CSV or Excel (.xlsx). System validates each record strictly against recognized AICTE Permanent IDs.
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-[8px] bg-white border border-[#C2410C] text-[14px] text-[#C2410C] flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleUploadComplaints} className="space-y-4">
                  <div className="border border-dashed border-[#FED7AA] bg-white rounded-[8px] p-8 text-center hover:border-[#F97316] transition-colors">
                    <input
                      type="file"
                      id="file-upload"
                      accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                    >
                      <div className="p-3 rounded-[8px] bg-white border border-[#FED7AA] text-[#C2410C]">
                        <UploadCloud className="w-8 h-8" />
                      </div>
                      <span className="text-[14px] font-semibold text-[#1F2937]">
                        {file ? file.name : "Click to select CSV or Excel file"}
                      </span>
                      <span className="text-[13px] text-[#6B7280]">
                        {file
                          ? `${(file.size / 1024).toFixed(1)} KB`
                          : "Supports .csv, .xlsx up to 10MB"}
                      </span>
                    </label>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={uploading || !file}
                      className="px-5 py-2.5 text-[14px] font-semibold rounded-[8px] bg-[#C2410C] text-white hover:bg-[#EA580C] transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {uploading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Parsing & Normalizing...</span>
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="w-4 h-4" />
                          <span>Upload & Run Ingestion</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Current Job Summary if finished */}
              {currentJob && (
                <div className="p-[20px] bg-white rounded-[8px] border border-[#FED7AA] space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-[#FED7AA]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-[#C2410C]" />
                      <h3 className="font-bold text-[15px] text-[#1F2937] m-0">
                        Batch Finished: {currentJob.filename}
                      </h3>
                    </div>
                    <span className="px-2.5 py-0.5 text-[13px] rounded-[8px] bg-white border border-[#D1D5DB] text-[#1F2937]">
                      {currentJob.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-[14px]">
                    <div className="p-3 rounded-[8px] bg-white border border-[#FED7AA]">
                      <span className="text-[#6B7280] block text-[13px]">Total Rows</span>
                      <span className="text-[20px] font-bold text-[#1F2937]">{currentJob.total}</span>
                    </div>
                    <div className="p-3 rounded-[8px] bg-white border border-[#FED7AA]">
                      <span className="text-[#6B7280] block text-[13px]">Accepted</span>
                      <span className="text-[20px] font-bold text-[#1F2937]">{currentJob.accepted}</span>
                    </div>
                    <div className="p-3 rounded-[8px] bg-white border border-[#FED7AA]">
                      <span className="text-[#6B7280] block text-[13px]">Rejected</span>
                      <span className={`text-[20px] font-bold ${currentJob.rejected > 0 ? "text-[#C2410C]" : "text-[#1F2937]"}`}>
                        {currentJob.rejected}
                      </span>
                    </div>
                  </div>

                  {currentJob.rejected > 0 && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => downloadErrors(currentJob.id)}
                        className="px-4 py-2 text-[13px] font-semibold text-[#C2410C] hover:underline inline-flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Rejected Rows CSV</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Ingestion Batch History */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-[18px] font-bold text-[#1F2937] leading-[1.5] m-0">
                    Ingestion Batch History
                  </h2>
                  <p className="text-[13px] text-[#6B7280] leading-[1.5] mt-0.5 m-0">
                    Audit log of recent data intake operations
                  </p>
                </div>

                <DataTable
                  columns={jobColumns}
                  data={jobs}
                  keyExtractor={(j) => j.id}
                  emptyMessage={loadingJobs ? "Loading batch records..." : "No intake batches processed yet."}
                />
              </div>
            </div>
          )}

          {/* 5. Tab 2: Institutions Directory Import */}
          {activeTab === "institutions" && (
            <div className="space-y-8">
              <div className="p-[20px] bg-white rounded-[8px] border border-[#FED7AA] space-y-4">
                <div>
                  <h2 className="text-[18px] font-bold text-[#1F2937] leading-[1.5] m-0">
                    Institutions Master Directory CSV Import
                  </h2>
                  <p className="text-[13px] text-[#6B7280] leading-[1.5] mt-0.5 m-0">
                    Upload a CSV or Excel file containing institutions. Records are automatically upserted by aicte_permanent_id.
                  </p>
                </div>

                {!isAdmin && user && (
                  <div className="p-3 bg-white border border-[#FED7AA] rounded-[8px] flex items-center gap-2 text-[14px] text-[#1F2937]">
                    <ShieldAlert className="w-5 h-5 shrink-0 text-[#C2410C]" />
                    <span>
                      Logged in as <strong>{user.role}</strong>. Admin authorization required to import institutional directory masters.
                    </span>
                  </div>
                )}

                {instErrorMsg && (
                  <div className="p-3 rounded-[8px] bg-white border border-[#C2410C] text-[14px] text-[#C2410C] flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{instErrorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleUploadInstitutions} className="space-y-4">
                  <div className="border border-dashed border-[#FED7AA] bg-white rounded-[8px] p-8 text-center hover:border-[#F97316] transition-colors">
                    <input
                      type="file"
                      id="inst-file-upload"
                      accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                      onChange={handleInstFileChange}
                      disabled={!isAdmin && !!user}
                      className="hidden"
                    />
                    <label
                      htmlFor="inst-file-upload"
                      className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                    >
                      <div className="p-3 rounded-[8px] bg-white border border-[#FED7AA] text-[#C2410C]">
                        <Building2 className="w-8 h-8" />
                      </div>
                      <span className="text-[14px] font-semibold text-[#1F2937]">
                        {instFile ? instFile.name : "Click to select Institutions CSV file"}
                      </span>
                      <span className="text-[13px] text-[#6B7280]">
                        Expected columns: aicte_permanent_id, name, address, city, state, region, type
                      </span>
                    </label>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={instUploading || !instFile || (!isAdmin && !!user)}
                      className="px-5 py-2.5 text-[14px] font-semibold rounded-[8px] bg-[#C2410C] text-white hover:bg-[#EA580C] transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {instUploading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Importing Institutions...</span>
                        </>
                      ) : (
                        <>
                          <Building2 className="w-4 h-4" />
                          <span>Import Institutions</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Institution Import Result Summary */}
              {instResult && (
                <div className="p-[20px] bg-white rounded-[8px] border border-[#FED7AA] space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-[#FED7AA]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-[#C2410C]" />
                      <h3 className="font-bold text-[15px] text-[#1F2937] m-0">
                        Institutions Import Completed
                      </h3>
                    </div>
                    <Link
                      href="/institutions"
                      className="text-[13px] font-semibold text-[#C2410C] hover:underline inline-flex items-center gap-1"
                    >
                      <span>View Directory</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-[14px]">
                    <div className="p-3 rounded-[8px] bg-white border border-[#FED7AA]">
                      <span className="text-[#6B7280] block text-[13px]">Total Evaluated</span>
                      <span className="text-[20px] font-bold text-[#1F2937]">{instResult.total}</span>
                    </div>
                    <div className="p-3 rounded-[8px] bg-white border border-[#FED7AA]">
                      <span className="text-[#6B7280] block text-[13px]">Accepted</span>
                      <span className="text-[20px] font-bold text-[#1F2937]">{instResult.accepted}</span>
                    </div>
                    <div className="p-3 rounded-[8px] bg-white border border-[#FED7AA]">
                      <span className="text-[#6B7280] block text-[13px]">Created / Updated</span>
                      <span className="text-[14px] font-bold text-[#1F2937] mt-1 block">
                        +{instResult.created} New • {instResult.updated} Updated
                      </span>
                    </div>
                    <div className="p-3 rounded-[8px] bg-white border border-[#FED7AA]">
                      <span className="text-[#6B7280] block text-[13px]">Rejected</span>
                      <span className={`text-[20px] font-bold ${instResult.rejected > 0 ? "text-[#C2410C]" : "text-[#1F2937]"}`}>
                        {instResult.rejected}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
