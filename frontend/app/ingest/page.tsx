"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { apiRequest } from "@/lib/api";
import { IngestionJob } from "@/lib/types";
import {
  UploadCloud, FileSpreadsheet, Download, CheckCircle2,
  AlertCircle, History, RefreshCw, FileText
} from "lucide-react";

export default function IngestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [currentJob, setCurrentJob] = useState<IngestionJob | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

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
    fetchJobs();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMsg(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
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

  const downloadTemplate = async () => {
    try {
      const blob = await apiRequest<Blob>("/ingest/template");
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "aicte_casetrack_template.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (_) {}
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
                Batch Ingestion & Normalization Engine
              </span>
              <h2 className="text-xl font-bold text-[#1F2937]">
                Complaint Data Intake Portal
              </h2>
            </div>

            <button
              onClick={downloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[6px] bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] hover:bg-[#FFEDD5] transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Official CSV Template
            </button>
          </div>

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

            <form onSubmit={handleUpload} className="space-y-4">
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
        </main>
      </div>
    </div>
  );
}
