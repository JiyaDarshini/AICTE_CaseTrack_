"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { apiRequest } from "@/lib/api";
import { IngestionJob, InstitutionImportResult, User } from "@/lib/types";
import {
  UploadCloud, FileSpreadsheet, Download, CheckCircle2,
  AlertCircle, History, RefreshCw, Building2, ShieldCheck,
  ShieldAlert, ArrowRight
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
    } catch (_) {}
    finally {
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

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />

        <main className="p-6 space-y-6 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#FED7AA] gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#C2410C]">
                Batch Ingestion & Normalization Engine
              </span>
              <h2 className="text-xl font-bold text-[#1F2937]">
                Complaint & Institution Data Intake
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveTab("institutions")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[6px] transition-colors shadow-sm ${
                  activeTab === "institutions"
                    ? "bg-[#C2410C] text-white"
                    : "bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] hover:bg-[#FFEDD5]"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Upload Institutions {isAdmin ? "(Admin)" : ""}
              </button>

              <button
                onClick={activeTab === "institutions" ? downloadInstitutionsTemplate : downloadComplaintsTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[6px] bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] hover:bg-[#FFEDD5] transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                {activeTab === "institutions" ? "Institutions Template" : "Complaints Template"}
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-[#FED7AA] gap-2">
            <button
              onClick={() => setActiveTab("complaints")}
              className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "complaints"
                  ? "border-[#C2410C] text-[#C2410C]"
                  : "border-transparent text-[#6B7280] hover:text-[#1F2937]"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Grievance Complaints Intake
            </button>
            <button
              onClick={() => setActiveTab("institutions")}
              className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "institutions"
                  ? "border-[#C2410C] text-[#C2410C]"
                  : "border-transparent text-[#6B7280] hover:text-[#1F2937]"
              }`}
            >
              <Building2 className="w-4 h-4" />
              Institutions Directory Master Import
              <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]">
                Admin Only
              </span>
            </button>
          </div>

          {/* TAB 1: INSTITUTIONS IMPORT (ADMIN ONLY) */}
          {activeTab === "institutions" && (
            <div className="space-y-6">
              {/* Info banner */}
              <div className="p-4 bg-[#FFF7ED] rounded-[8px] border border-[#FED7AA] flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#C2410C] shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-bold text-[#1F2937]">
                    Institutions Master Directory CSV Import (Admin Privileges Required)
                  </div>
                  <div className="text-[#6B7280]">
                    Upload a CSV or Excel file containing institutions. Records are automatically{" "}
                    <span className="font-bold text-[#C2410C]">upserted by aicte_permanent_id</span>. Existing institutions will have their details updated, and new ones will be registered.
                  </div>
                  <div className="mt-2 text-[#1F2937] font-semibold flex flex-wrap gap-1.5 items-center">
                    <span className="text-[#6B7280]">Expected Columns:</span>
                    {["aicte_permanent_id", "name", "address", "city", "state", "region", "type"].map((col) => (
                      <code key={col} className="px-1.5 py-0.5 bg-white border border-[#FED7AA] rounded text-[11px] font-mono text-[#C2410C]">
                        {col}
                      </code>
                    ))}
                  </div>
                </div>
              </div>

              {!isAdmin && user && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-[8px] flex items-center gap-3 text-xs text-amber-800">
                  <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600" />
                  <span>
                    You are currently logged in as <strong>{user.role}</strong>. Only users with the <strong>Admin</strong> role can import institutions. Please log in as an Admin to perform this action.
                  </span>
                </div>
              )}

              {instErrorMsg && (
                <div className="p-3 rounded bg-white border border-[#C2410C] text-xs text-[#C2410C] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{instErrorMsg}</span>
                </div>
              )}

              {/* Upload Box */}
              <div className="p-6 bg-[#FFF7ED] rounded-[8px] border border-[#FED7AA] shadow-sm">
                <h3 className="font-bold text-sm text-[#1F2937] mb-1">
                  Upload Institutions CSV / Excel File
                </h3>
                <p className="text-xs text-[#6B7280] mb-4">
                  Select a CSV or Excel file conforming to the 7 required institutional columns.
                </p>

                <form onSubmit={handleUploadInstitutions} className="space-y-4">
                  <div className="border-2 border-dashed border-[#FED7AA] bg-white rounded-[8px] p-8 text-center hover:border-[#F97316] transition-colors">
                    <input
                      type="file"
                      id="inst-file-upload"
                      accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                      onChange={handleInstFileChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="inst-file-upload"
                      className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                    >
                      <div className="p-3 rounded-full bg-[#FFF7ED] text-[#C2410C]">
                        <Building2 className="w-8 h-8" />
                      </div>
                      <span className="text-xs font-bold text-[#1F2937]">
                        {instFile ? instFile.name : "Click to select Institutions CSV file"}
                      </span>
                      <span className="text-[11px] text-[#6B7280]">
                        {instFile
                          ? `${(instFile.size / 1024).toFixed(1)} KB`
                          : "Columns: aicte_permanent_id, name, address, city, state, region, type"}
                      </span>
                    </label>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button
                      type="button"
                      onClick={downloadInstitutionsTemplate}
                      className="text-xs font-bold text-[#C2410C] hover:underline inline-flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Institutions Sample CSV
                    </button>

                    <button
                      type="submit"
                      disabled={instUploading || !instFile || !isAdmin}
                      className="px-5 py-2 text-xs font-bold rounded-[6px] bg-[#C2410C] text-white hover:bg-[#EA580C] transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                    >
                      {instUploading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Importing & Upserting Institutions...
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-4 h-4" />
                          Upload Institutions
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Institutions Import Result Summary */}
              {instResult && (
                <div className="p-5 bg-white rounded-[8px] border border-[#FED7AA] shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#FED7AA]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-[#C2410C]" />
                      <h4 className="font-bold text-sm text-[#1F2937]">
                        Institutions Import Completed
                      </h4>
                    </div>
                    <Link
                      href="/institutions"
                      className="text-xs font-bold text-[#C2410C] hover:underline inline-flex items-center gap-1"
                    >
                      View Institutions Directory <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Counts Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded bg-[#FFF7ED] border border-[#FED7AA]">
                      <span className="text-[#6B7280] block">Total Evaluated</span>
                      <span className="text-xl font-bold text-[#1F2937]">{instResult.total}</span>
                    </div>
                    <div className="p-3 rounded bg-[#FFF7ED] border border-[#FED7AA]">
                      <span className="text-[#C2410C] block font-semibold">Accepted (Total)</span>
                      <span className="text-xl font-bold text-[#C2410C]">{instResult.accepted}</span>
                    </div>
                    <div className="p-3 rounded bg-[#FFF7ED] border border-[#FED7AA]">
                      <span className="text-emerald-700 block font-semibold">Created / Updated</span>
                      <span className="text-sm font-bold text-[#1F2937] mt-1 block">
                        +{instResult.created} New • {instResult.updated} Updated
                      </span>
                    </div>
                    <div className="p-3 rounded bg-[#FFF7ED] border border-[#FED7AA]">
                      <span className="text-[#9A3412] block font-semibold">Rejected</span>
                      <span className="text-xl font-bold text-[#9A3412]">{instResult.rejected}</span>
                    </div>
                  </div>

                  {/* Rejected Details List */}
                  {instResult.errors && instResult.errors.length > 0 && (
                    <div className="pt-2">
                      <h5 className="font-bold text-xs text-[#9A3412] mb-2">
                        Rejected Rows Details ({instResult.errors.length})
                      </h5>
                      <div className="max-h-48 overflow-y-auto rounded border border-[#FED7AA]">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#FFF7ED] text-[#C2410C] font-bold">
                            <tr>
                              <th className="py-2 px-3">CSV Row</th>
                              <th className="py-2 px-3">AICTE Permanent ID</th>
                              <th className="py-2 px-3">Rejection Reason</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#FED7AA]">
                            {instResult.errors.map((err, idx) => (
                              <tr key={idx} className="bg-white">
                                <td className="py-1.5 px-3 font-semibold text-[#1F2937]">Row {err.row}</td>
                                <td className="py-1.5 px-3 font-mono text-[#6B7280]">{err.aicte_permanent_id || "None"}</td>
                                <td className="py-1.5 px-3 text-[#9A3412]">{err.error}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: COMPLAINTS INTAKE (ORIGINAL) */}
          {activeTab === "complaints" && (
            <div className="space-y-6">
              {/* Upload Box */}
              <div className="p-6 bg-[#FFF7ED] rounded-[8px] border border-[#FED7AA] shadow-sm">
                <h3 className="font-bold text-sm text-[#1F2937] mb-1">
                  Upload External Grievance Records
                </h3>
                <p className="text-xs text-[#6B7280] mb-4">
                  Upload CSV or Excel (.xlsx). System validates each record strictly against recognized AICTE Permanent IDs. Unrecognized IDs are safely isolated into an error report.
                </p>

                {errorMsg && (
                  <div className="mb-4 p-3 rounded bg-white border border-[#C2410C] text-xs text-[#C2410C] flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleUploadComplaints} className="space-y-4">
                  <div className="border-2 border-dashed border-[#FED7AA] bg-white rounded-[8px] p-8 text-center hover:border-[#F97316] transition-colors">
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
                      <div className="p-3 rounded-full bg-[#FFF7ED] text-[#C2410C]">
                        <UploadCloud className="w-8 h-8" />
                      </div>
                      <span className="text-xs font-bold text-[#1F2937]">
                        {file ? file.name : "Click to select CSV or Excel file"}
                      </span>
                      <span className="text-[11px] text-[#6B7280]">
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
                      className="px-5 py-2 text-xs font-bold rounded-[6px] bg-[#C2410C] text-white hover:bg-[#EA580C] transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {uploading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Parsing & Normalizing...
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="w-4 h-4" />
                          Upload & Run Ingestion
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Current Job Summary */}
              {currentJob && (
                <div className="p-5 bg-white rounded-[8px] border border-[#FED7AA] shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#FED7AA]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-[#C2410C]" />
                      <h4 className="font-bold text-sm text-[#1F2937]">
                        Ingestion Batch Completed: {currentJob.filename}
                      </h4>
                    </div>
                    <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]">
                      {currentJob.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded bg-[#FFF7ED] border border-[#FED7AA]">
                      <span className="text-[#6B7280] block">Total Rows Evaluated</span>
                      <span className="text-xl font-bold text-[#1F2937]">{currentJob.total}</span>
                    </div>
                    <div className="p-3 rounded bg-[#FFF7ED] border border-[#FED7AA]">
                      <span className="text-[#C2410C] block font-semibold">Accepted & Ingested</span>
                      <span className="text-xl font-bold text-[#C2410C]">{currentJob.accepted}</span>
                    </div>
                    <div className="p-3 rounded bg-[#FFF7ED] border border-[#FED7AA]">
                      <span className="text-[#9A3412] block font-semibold">Rejected / Invalid AICTE ID</span>
                      <span className="text-xl font-bold text-[#9A3412]">{currentJob.rejected}</span>
                    </div>
                  </div>

                  {currentJob.rejected > 0 && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => downloadErrors(currentJob.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded bg-[#C2410C] text-white hover:bg-[#EA580C]"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download Validation Error Report (.CSV)
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Ingestion History */}
              <div className="bg-white rounded-[8px] border border-[#FED7AA] shadow-sm overflow-hidden">
                <div className="p-4 border-b border-[#FED7AA] bg-[#FFF7ED] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-[#C2410C]" />
                    <h3 className="font-bold text-sm text-[#1F2937]">Ingestion Batch History</h3>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs casetrack-table">
                    <thead>
                      <tr>
                        <th className="py-2.5 px-3 font-bold text-[#C2410C]">Job ID / File</th>
                        <th className="py-2.5 px-3 font-bold text-[#C2410C]">Status</th>
                        <th className="py-2.5 px-3 font-bold text-[#C2410C] text-center">Total Rows</th>
                        <th className="py-2.5 px-3 font-bold text-[#C2410C] text-center">Accepted</th>
                        <th className="py-2.5 px-3 font-bold text-[#C2410C] text-center">Rejected</th>
                        <th className="py-2.5 px-3 font-bold text-[#C2410C]">Ingestion Date</th>
                        <th className="py-2.5 px-3 font-bold text-[#C2410C] text-right">Error Report</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#FED7AA]">
                      {jobs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-[#6B7280]">
                            No previous ingestion jobs found.
                          </td>
                        </tr>
                      ) : (
                        jobs.map((j) => (
                          <tr key={j.id} className="transition-colors">
                            <td className="py-2.5 px-3 font-bold text-[#1F2937]">{j.filename}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]">
                                {j.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-semibold text-[#1F2937]">{j.total}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-[#C2410C]">{j.accepted}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-[#9A3412]">{j.rejected}</td>
                            <td className="py-2.5 px-3 text-[#6B7280]">
                              {new Date(j.created_at).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {j.rejected > 0 ? (
                                <button
                                  onClick={() => downloadErrors(j.id)}
                                  className="font-bold text-[#C2410C] hover:underline inline-flex items-center gap-1"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  Errors CSV
                                </button>
                              ) : (
                                <span className="text-[#6B7280]">None</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
