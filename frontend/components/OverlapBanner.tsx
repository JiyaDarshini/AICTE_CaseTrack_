import React from "react";
import { AlertTriangle, ExternalLink, Link2, GitMerge, XCircle } from "lucide-react";
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
  explanation,
  rulesFired = [],
  groupId,
  onActionClick
}) => {
  return (
    <div
      className="p-4 mb-4 rounded-[8px] border border-[#EA580C] bg-[#FFF7ED] shadow-sm text-[#1F2937]"
      role="alert"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#FED7AA]">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-full bg-[#C2410C] text-white">
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="font-bold text-base text-[#C2410C]">
              Potential Overlapping Cases – Coordination Required
            </h3>
            <p className="text-xs text-[#6B7280]">
              Matched Institution: <strong className="text-[#1F2937]">{institutionName}</strong> (AICTE Permanent ID: <strong className="text-[#1F2937]">{aictePermanentId}</strong>)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#FFEDD5] text-[#9A3412] border border-[#FED7AA]">
            {severity} Severity ({(score * 100).toFixed(1)}% Match)
          </span>
          <Link
            href={`/overlaps#group-${groupId}`}
            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-[6px] bg-[#C2410C] text-white hover:bg-[#EA580C] transition-colors"
          >
            Review Overlap
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <div className="pt-2 text-xs text-[#1F2937] space-y-1">
        {explanation && <p className="font-medium text-[#C2410C]">{explanation}</p>}
        {rulesFired.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="text-[#6B7280]">Rules Triggered:</span>
            {rulesFired.map((rule, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded bg-white border border-[#FED7AA] text-[11px] text-[#9A3412]"
              >
                {rule}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
