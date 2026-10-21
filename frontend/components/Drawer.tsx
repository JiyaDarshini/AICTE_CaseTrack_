"use client";

import React from "react";
import { X, ExternalLink, Building } from "lucide-react";
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
          <div className="p-6 bg-white border-b border-[#FED7AA] flex items-center justify-between">
            <div>
              <span className="text-[13px] font-medium text-[#6B7280] block">
                Case Preview
              </span>
              <h2 id="slide-over-title" className="text-[18px] font-bold text-[#1F2937] leading-[1.5] mt-0.5 m-0">
                {caseItem.case_number}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-[8px] hover:bg-[#FFF7ED] text-[#6B7280] hover:text-[#1F2937]"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-[15px] text-[#1F2937] leading-[1.5]">
            {/* Status & SLA */}
            <div className="flex items-center justify-between p-4 rounded-[8px] bg-white border border-[#FED7AA]">
              <div>
                <span className="text-[13px] text-[#6B7280] block mb-1">Status</span>
                <StatusBadge status={caseItem.status} isOverdue={caseItem.is_overdue} />
              </div>
              <div className="text-right">
                <span className="text-[13px] text-[#6B7280] block mb-1">Bureau</span>
                <span className="inline-block text-[13px] px-2.5 py-0.5 rounded-[8px] bg-white border border-[#D1D5DB] text-[#1F2937]">
                  {caseItem.current_bureau_code || "Unassigned"}
                </span>
              </div>
            </div>

            {/* Institution Info */}
            <div className="space-y-1 border-b border-[#FED7AA] pb-4">
              <span className="text-[13px] text-[#6B7280] block">Institution</span>
              <div className="font-bold text-[15px] text-[#1F2937] flex items-center gap-2">
                <Building className="w-4 h-4 text-[#6B7280]" />
                <span>{caseItem.institution_name}</span>
              </div>
              <div className="text-[13px] text-[#6B7280]">
                AICTE Permanent ID: <strong className="text-[#1F2937]">{caseItem.aicte_permanent_id}</strong>
                {caseItem.institution_region && ` • ${caseItem.institution_region} Region`}
              </div>
            </div>

            {/* Title & Description */}
            <div className="space-y-1 border-b border-[#FED7AA] pb-4">
              <span className="text-[13px] text-[#6B7280] block">Grievance Details</span>
              <h3 className="font-bold text-[15px] text-[#1F2937] m-0">{caseItem.title}</h3>
              <p className="text-[14px] text-[#1F2937] leading-[1.5] mt-2 m-0 line-clamp-3">
                {caseItem.description}
              </p>
            </div>

            {/* Key Meta */}
            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <div className="p-3 rounded-[8px] bg-white border border-[#FED7AA]">
                <span className="text-[#6B7280] block text-[13px]">Category</span>
                <span className="font-semibold text-[#1F2937] text-[14px]">{caseItem.category}</span>
              </div>
              <div className="p-3 rounded-[8px] bg-white border border-[#FED7AA]">
                <span className="text-[#6B7280] block text-[13px]">Complainant Type</span>
                <span className="font-semibold text-[#1F2937] text-[14px]">{caseItem.complainant_type || "General Public"}</span>
              </div>
              <div className="p-3 rounded-[8px] bg-white border border-[#FED7AA]">
                <span className="text-[#6B7280] block text-[13px]">Lodged Date</span>
                <span className="font-semibold text-[#1F2937] text-[14px]">
                  {new Date(caseItem.received_date).toLocaleDateString()}
                </span>
              </div>
              <div className="p-3 rounded-[8px] bg-white border border-[#FED7AA]">
                <span className="text-[#6B7280] block text-[13px]">Expected Disposal</span>
                <span className={`font-semibold text-[14px] ${caseItem.is_overdue ? "text-[#C2410C]" : "text-[#1F2937]"}`}>
                  {caseItem.expected_disposal_date
                    ? new Date(caseItem.expected_disposal_date).toLocaleDateString()
                    : "Not Specified"}
                </span>
              </div>
            </div>

            {/* Next Action */}
            {caseItem.next_action && (
              <div className="p-4 bg-white border border-[#FED7AA] rounded-[8px] text-[14px]">
                <span className="font-bold text-[#1F2937] block">Next Action Required:</span>
                <p className="text-[#1F2937] mt-1 m-0">{caseItem.next_action}</p>
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="p-6 bg-white border-t border-[#FED7AA]">
            <Link
              href={`/cases/${caseItem.id}`}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-[14px] font-semibold rounded-[8px] bg-[#C2410C] text-white hover:bg-[#EA580C] transition-colors leading-[1.5]"
            >
              <span>Open Case Dossier & Action Timeline</span>
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
