import React from "react";
import { AlertTriangle, ChevronRight, X } from "lucide-react";
import Link from "next/link";

interface AlertStripProps {
  title: string;
  description?: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const AlertStrip: React.FC<AlertStripProps> = ({
  title,
  description,
  actionText,
  actionHref,
  onAction,
  onDismiss,
  className = "",
}) => {
  return (
    <div
      role="alert"
      className={`p-3.5 bg-white border border-[#FED7AA] rounded-[8px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[#1F2937] ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <AlertTriangle className="w-4 h-4 text-[#C2410C] shrink-0" aria-hidden="true" />
        <div className="flex flex-wrap items-center gap-x-2 text-[14px] min-w-0 leading-[1.5]">
          <span className="font-bold text-[#1F2937]">{title}</span>
          {description && (
            <span className="text-[#6B7280] truncate">{description}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
        {actionText && (
          actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#C2410C] hover:text-[#EA580C] hover:underline"
            >
              <span>{actionText}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#C2410C] hover:text-[#EA580C] hover:underline"
            >
              <span>{actionText}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-[#6B7280] hover:text-[#1F2937] p-1"
            aria-label="Dismiss alert"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
