"use client";

import React from "react";
import { X, ExternalLink, Building, Calendar, UserCheck, AlertCircle } from "lucide-react";
import { Case } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import Link from "next/link";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  caseItem: Case | null;
}

export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, caseItem }) => {
  if (!isOpen || !caseItem) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="pointer-events-auto w-screen max-w-md bg-white shadow-xl border-l border-[#FED7AA] flex flex-col">
          {/* Header */}
          <div className="p-4 bg-[#FFF7ED] border-b border-[#FED7AA] flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#C2410C] uppercase tracking-wide">
                Case Quick Preview
              </span>
              <h2 id="slide-over-title" className="text-base font-bold text-[#1F2937]">
                {caseItem.case_number}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white text-[#6B7280] hover:text-[#1F2937]"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm text-[#1F2937]">
            {/* Status & SLA */}
            <div className="flex items-center justify-between p-3 rounded-[8px] bg-[#FFF7ED] border border-[#FED7AA]">
              <div>
                <span className="text-xs text-[#6B7280] block mb-1">Current Status</span>
                <StatusBadge status={caseItem.status} isOverdue={caseItem.is_overdue} />
              </div>
              <div className="text-right">
                <span className="text-xs text-[#6B7280] block mb-1">Bureau Holding Case</span>
                <span className="font-bold text-xs px-2.5 py-1 rounded-full bg-white border border-[#FED7AA] text-[#C2410C]">
                  {caseItem.current_bureau_code || "Unassigned"}
                </span>
              </div>
            </div>

            {/* Institution Info */}
            <div className="space-y-1 border-b border-[#FED7AA] pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">Institution</span>
              <div className="font-bold text-[#1F2937] flex items-center gap-1.5">
                <Building className="w-4 h-4 text-[#C2410C]" />
                {caseItem.institution_name}
              </div>
              <div className="text-xs text-[#6B7280]">
                AICTE Permanent ID: <strong className="text-[#1F2937]">{caseItem.aicte_permanent_id}</strong>
                {caseItem.institution_region && ` • ${caseItem.institution_region} Region`}
              </div>
            </div>

            {/* Title & Description */}
            <div className="space-y-1 border-b border-[#FED7AA] pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">Grievance Details</span>
              <h3 className="font-bold text-[#C2410C] text-sm">{caseItem.title}</h3>
              <p className="text-xs text-[#1F2937] leading-relaxed whitespace-pre-line mt-2">
                {caseItem.description}
              </p>
            </div>

            {/* Key Meta */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded bg-[#FFF7ED] border border-[#FED7AA]">
                <span className="text-[#6B7280] block">Category</span>
                <span className="font-semibold text-[#1F2937]">{caseItem.category}</span>
              </div>
              <div className="p-2.5 rounded bg-[#FFF7ED] border border-[#FED7AA]">
                <span className="text-[#6B7280] block">Complainant Type</span>
                <span className="font-semibold text-[#1F2937]">{caseItem.complainant_type || "General Public"}</span>
              </div>
              <div className="p-2.5 rounded bg-[#FFF7ED] border border-[#FED7AA]">
                <span className="text-[#6B7280] block">Lodged Date</span>
                <span className="font-semibold text-[#1F2937]">
                  {new Date(caseItem.received_date).toLocaleDateString()}
                </span>
              </div>
              <div className="p-2.5 rounded bg-[#FFF7ED] border border-[#FED7AA]">
                <span className="text-[#6B7280] block">Expected Disposal</span>
                <span className={`font-semibold ${caseItem.is_overdue ? "text-[#C2410C]" : "text-[#1F2937]"}`}>
                  {caseItem.expected_disposal_date
                    ? new Date(caseItem.expected_disposal_date).toLocaleDateString()
                    : "Not Specified"}
                </span>
              </div>
            </div>

            {/* Next Action */}
            {caseItem.next_action && (
              <div className="p-3 bg-[#FFEDD5] border border-[#FDBA74] rounded-[8px] text-xs">
                <span className="font-bold text-[#9A3412] block">Next Action Required:</span>
                <p className="text-[#1F2937] mt-0.5">{caseItem.next_action}</p>
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="p-4 bg-[#FFF7ED] border-t border-[#FED7AA]">
            <Link
              href={`/cases/${caseItem.id}`}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-[6px] bg-[#C2410C] text-white hover:bg-[#EA580C] shadow-sm transition-colors"
            >
              Open Full Case Dossier & Action Timeline
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
