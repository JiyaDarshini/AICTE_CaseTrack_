import React from "react";
import { Clock, RefreshCw, CheckCircle2, ArrowRightLeft, AlertTriangle } from "lucide-react";

interface StatusBadgeProps {
  status: "Pending" | "Under Process" | "Disposed" | "Transferred" | "Escalated" | string;
  isOverdue?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  isOverdue = false,
  className = "",
}) => {
  const isCritical = isOverdue || status === "Escalated";

  if (isCritical) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[13px] leading-[1.5] font-semibold rounded-[8px] bg-white border border-[#C2410C] text-[#C2410C] ${className}`}
        role="status"
        aria-label={isOverdue ? `Overdue: ${status}` : status}
      >
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#C2410C]" aria-hidden="true" />
        <span>{isOverdue ? "Overdue" : "Escalated"}</span>
      </span>
    );
  }

  const renderIcon = () => {
    switch (status) {
      case "Pending":
        return <Clock className="w-3.5 h-3.5 shrink-0 text-[#6B7280]" aria-hidden="true" />;
      case "Under Process":
        return <RefreshCw className="w-3.5 h-3.5 shrink-0 text-[#6B7280]" aria-hidden="true" />;
      case "Disposed":
        return <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#6B7280]" aria-hidden="true" />;
      case "Transferred":
        return <ArrowRightLeft className="w-3.5 h-3.5 shrink-0 text-[#6B7280]" aria-hidden="true" />;
      default:
        return null;
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[13px] leading-[1.5] font-normal rounded-[8px] bg-white border border-[#D1D5DB] text-[#1F2937] ${className}`}
      role="status"
    >
      {renderIcon()}
      <span>{status}</span>
    </span>
  );
};
