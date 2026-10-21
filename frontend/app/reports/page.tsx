"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { DataTable, Column } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { apiRequest } from "@/lib/api";
import {
  FileBarChart2, Download, FileSpreadsheet, FileText,
  RefreshCw, CheckCircle2
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
    { id: "bureau", label: "Bureau Workload & Pendency" },
    { id: "region", label: "Regional Distribution" },
    { id: "institution", label: "Institution Compliance" },
    { id: "overlaps", label: "Inter-Bureau Overlaps" },
    { id: "ageing", label: "Ageing Brackets" },
    { id: "disposal-rate", label: "Disposal Rate & SLA" },
    { id: "monthly", label: "Monthly Performance" },
    { id: "quarterly", label: "Quarterly Evaluation" },
  ];

  // Dynamic columns for DataTable
  const dynamicColumns: Column[] = (reportData?.headers || []).map((headerKey) => ({
    key: headerKey,
    header: headerKey,
    render: (row) => (
      <span className="whitespace-nowrap text-[#1F2937]">
        {row[headerKey] !== undefined ? String(row[headerKey]) : "—"}
      </span>
    ),
  }));

  const activeReportObj = reportOptions.find((r) => r.id === reportType);

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />

        <main className="p-8 space-y-8 max-w-[1280px] w-full mx-auto overflow-y-auto">
          {/* 1. Unified PageHeader */}
          <PageHeader
            title="Regulatory Reports & Data Exports"
            description="Statutory intelligence, bureau-wise performance audits, and exportable analytics."
            actions={[
              {
                label: downloading === "pdf" ? "Rendering..." : "Export Official PDF",
                onClick: () => handleExport("pdf"),
                icon: <FileText className="w-4 h-4" />,
              },
              {
                label: downloading === "xlsx" ? "Exporting..." : "Export Excel",
                onClick: () => handleExport("xlsx"),
                variant: "secondary",
                icon: <FileSpreadsheet className="w-4 h-4" />,
              },
            ]}
          />

          {/* 2. KPI / Summary Row: Equal height 96px */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard
              label="Selected Report"
              value={activeReportObj?.label || "Report"}
              icon={<FileBarChart2 className="w-4 h-4" />}
            />
            <KpiCard
              label="Compiled Records"
              value={reportData?.data?.length || 0}
              icon={<CheckCircle2 className="w-4 h-4" />}
            />
            <KpiCard
              label="Available Formats"
              value="PDF, XLSX, CSV"
              icon={<Download className="w-4 h-4" />}
            />
            <KpiCard
              label="Export Engine"
              value={downloading ? `Exporting ${downloading.toUpperCase()}...` : "Ready"}
              alert={!!downloading}
              icon={<RefreshCw className={`w-4 h-4 ${downloading ? "animate-spin" : ""}`} />}
            />
          </div>

          {/* 3. Report Selector Row */}
          <div className="flex flex-wrap gap-2 p-3 bg-white rounded-[8px] border border-[#FED7AA]">
            {reportOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setReportType(opt.id)}
                className={`px-3 py-1.5 text-[13px] font-semibold rounded-[8px] transition-colors ${
                  reportType === opt.id
                    ? "bg-[#C2410C] text-white"
                    : "bg-white text-[#1F2937] border border-[#FED7AA] hover:bg-[#FFF7ED]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* 4. Tabular Preview */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-[18px] font-bold text-[#1F2937] leading-[1.5] m-0">
                  {reportData?.report_title || "Report Preview"}
                </h2>
                <p className="text-[13px] text-[#6B7280] leading-[1.5] mt-0.5 m-0">
                  Live tabular preview rendered directly from database aggregate queries ({reportData?.data?.length || 0} records)
                </p>
              </div>

              <button
                onClick={() => handleExport("csv")}
                disabled={!!downloading}
                className="text-[13px] font-semibold text-[#C2410C] hover:underline inline-flex items-center gap-1 shrink-0 self-start sm:self-auto"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download as CSV</span>
              </button>
            </div>

            {loading ? (
              <div className="p-12 text-center text-[#6B7280]">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#C2410C] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[14px]">Compiling report analytics...</span>
                </div>
              </div>
            ) : !reportData || reportData.data.length === 0 ? (
              <EmptyState
                title="No data points recorded"
                description="There are currently no rows matching the query criteria for this report."
              />
            ) : (
              <DataTable
                columns={dynamicColumns}
                data={reportData.data}
                keyExtractor={(_, idx) => idx}
                maxVisibleColumns={8}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
