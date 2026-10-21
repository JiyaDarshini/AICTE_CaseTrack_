"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { apiRequest } from "@/lib/api";
import {
  FileBarChart2, Download, FileSpreadsheet, FileText,
  RefreshCw, CheckCircle2, ChevronRight
} from "lucide-react";

export default function ReportsPage() {
  const [reportType, setReportType] = useState("bureau");
  const [reportData, setReportData] = useState<{ report_title: string; headers: string[]; data: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  const fetchReportPreview = async (type: string) => {
    setLoading(true);
    try {
      const data = await apiRequest(`/reports/${type}?format=json`);
      setReportData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportPreview(reportType);
  }, [reportType]);

  const handleExport = async (format: "csv" | "xlsx" | "pdf") => {
    setDownloading(format);
    try {
      const blob = await apiRequest<Blob>(`/reports/${reportType}?format=${format}`);
      const ext = format === "xlsx" ? "xlsx" : format === "pdf" ? "pdf" : "csv";
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aicte_report_${reportType}.${ext}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error", err);
    } finally {
      setDownloading(null);
    }
  };

  const reportOptions = [
    { id: "bureau", label: "Bureau-Wise Workload & Pendency" },
    { id: "region", label: "Regional Grievance Distribution" },
    { id: "institution", label: "Institution Compliance & Grievances" },
    { id: "overlaps", label: "Inter-Bureau Overlaps Audit Trail" },
    { id: "ageing", label: "Case Ageing & Pendency Brackets" },
    { id: "disposal-rate", label: "Disposal Rate & SLA Compliance" },
    { id: "monthly", label: "Monthly Performance Track" },
    { id: "quarterly", label: "Quarterly Evaluation Report" },
  ];

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
                Statutory Reporting & Intelligence
              </span>
              <h2 className="text-xl font-bold text-[#1F2937]">
                Regulatory Reports & Data Exports
              </h2>
            </div>

            {/* Export Format Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExport("csv")}
                disabled={!!downloading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[6px] bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] hover:bg-[#FFEDD5] transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                {downloading === "csv" ? "Exporting..." : "Export CSV"}
              </button>
              <button
                onClick={() => handleExport("xlsx")}
                disabled={!!downloading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[6px] bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] hover:bg-[#FFEDD5] transition-colors disabled:opacity-50"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                {downloading === "xlsx" ? "Exporting..." : "Export Excel (XLSX)"}
              </button>
              <button
                onClick={() => handleExport("pdf")}
                disabled={!!downloading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[6px] bg-[#C2410C] text-white hover:bg-[#EA580C] shadow-sm transition-colors disabled:opacity-50"
              >
                <FileText className="w-3.5 h-3.5" />
                {downloading === "pdf" ? "Rendering..." : "Export Official PDF"}
              </button>
            </div>
          </div>

          {/* Report Selector Pills */}
          <div className="flex flex-wrap gap-2 p-3 bg-[#FFF7ED] rounded-[8px] border border-[#FED7AA]">
            {reportOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setReportType(opt.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-[6px] transition-colors ${
                  reportType === opt.id
                    ? "bg-[#C2410C] text-white shadow-sm"
                    : "bg-white text-[#1F2937] border border-[#FED7AA] hover:bg-[#FFEDD5]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Preview Table */}
          <div className="bg-white rounded-[8px] border border-[#FED7AA] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#FED7AA] bg-[#FFF7ED] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#1F2937]">
                  {reportData?.report_title || "Report Preview"}
                </h3>
                <p className="text-xs text-[#6B7280]">
                  Live tabular preview rendered directly from database aggregate queries
                </p>
              </div>
              <span className="text-xs font-bold text-[#C2410C]">
                {reportData?.data?.length || 0} Records
              </span>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              {loading ? (
                <div className="p-12 text-center text-[#6B7280]">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#C2410C] border-t-transparent rounded-full animate-spin" />
                    <span>Compiling report analytics...</span>
                  </div>
                </div>
              ) : !reportData || reportData.data.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#6B7280]">
                  No data points recorded for this report.
                </div>
              ) : (
                <table className="w-full text-left text-xs casetrack-table">
                  <thead>
                    <tr>
                      {reportData.headers.map((h, i) => (
                        <th key={i} className="py-2.5 px-3 font-bold text-[#C2410C] whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#FED7AA]">
                    {reportData.data.map((row, idx) => (
                      <tr key={idx} className="transition-colors">
                        {reportData.headers.map((h, i) => (
                          <td key={i} className="py-2.5 px-3 whitespace-nowrap text-[#1F2937]">
                            {row[h] !== undefined ? String(row[h]) : "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
