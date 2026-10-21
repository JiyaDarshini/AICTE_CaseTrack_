import React from "react";
import { AlertTriangle, ChevronRight } from "lucide-react";
import Link from "next/link";

interface OverlapBannerProps {
  institutionName: string;
  aictePermanentId: string;
  severity: "High" | "Medium" | string;
  score: number;
  explanation?: string;
  rulesFired?: string[];
  groupId: string;
  onActionClick?: () => void;
}

export const OverlapBanner: React.FC<OverlapBannerProps> = ({
  institutionName,
  aictePermanentId,
  severity,
  score,
  groupId,
}) => {
  return (
    <div
      role="alert"
      className="p-3.5 bg-white border border-[#FED7AA] rounded-[8px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[#1F2937]"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <AlertTriangle className="w-4 h-4 text-[#C2410C] shrink-0" aria-hidden="true" />
        <div className="text-[14px] leading-[1.5] truncate">
          <span className="font-bold text-[#1F2937]">Potential Overlap Detected:</span>{" "}
          <span className="text-[#1F2937] font-semibold">{institutionName}</span>{" "}
          <span className="text-[#6B7280]">({aictePermanentId})</span> •{" "}
          <span className="text-[#C2410C] font-semibold">{severity} Severity ({(score * 100).toFixed(0)}% Match)</span>
        </div>
      </div>

      <div className="shrink-0 self-end sm:self-auto">
        <Link
          href={`/overlaps#group-${groupId}`}
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#C2410C] hover:text-[#EA580C] hover:underline"
        >
          <span>Review Overlap</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
