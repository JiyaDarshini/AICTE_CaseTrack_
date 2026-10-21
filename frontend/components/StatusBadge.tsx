import React from "react";
import { Clock, RefreshCw, CheckCircle2, ArrowRightLeft, AlertTriangle } from "lucide-react";

interface StatusBadgeProps {
  status: "Pending" | "Under Process" | "Disposed" | "Transferred" | "Escalated" | string;
  isOverdue?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, isOverdue = false, className = "" }) => {
  if (isOverdue || status === "Escalated") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full bg-[#C2410C] text-white shadow-sm ${className}`}
        role="status"
        aria-label={isOverdue ? `Overdue: ${status}` : status}
      >
        <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
        {isOverdue ? "OVERDUE" : "ESCALATED"}
      </span>
    );
  }

  switch (status) {
    case "Pending":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] ${className}`}
          role="status"
        >
          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
          Pending
        </span>
      );
    case "Under Process":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-[#FFEDD5] text-[#9A3412] border border-[#FDBA74] ${className}`}
          role="status"
        >
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#EA580C]" aria-hidden="true" style={{ animationDuration: '3s' }} />
          Under Process
        </span>
      );
    case "Disposed":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-[#FFF7ED] text-[#1F2937] border border-[#FED7AA] ${className}`}
          role="status"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-[#C2410C]" aria-hidden="true" />
          Disposed
        </span>
      );
    case "Transferred":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-[#FED7AA] text-[#7C2D12] border border-[#FDBA74] ${className}`}
          role="status"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" aria-hidden="true" />
          Transferred
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] ${className}`}
          role="status"
        >
          {status}
        </span>
      );
  }
};
