import React from "react";
import { FolderOpen } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No data found",
  description = "There are no records matching your criteria.",
  icon,
  action,
  className = "",
}) => {
  return (
    <div
      className={`p-8 border border-[#FED7AA] rounded-[8px] bg-white text-center flex flex-col items-center justify-center ${className}`}
    >
      <div className="text-[#6B7280] mb-3">
        {icon || <FolderOpen className="w-10 h-10 stroke-1" />}
      </div>
      <h3 className="text-[18px] font-bold text-[#1F2937] leading-[1.5] m-0">
        {title}
      </h3>
      <p className="text-[14px] text-[#6B7280] leading-[1.5] mt-1 max-w-md m-0">
        {description}
      </p>
      {action && (
        <div className="mt-4">
          {action.href ? (
            <a
              href={action.href}
              className="inline-flex items-center px-4 py-2 text-[14px] font-semibold rounded-[8px] bg-[#C2410C] text-white hover:bg-[#EA580C] transition-colors"
            >
              {action.label}
            </a>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex items-center px-4 py-2 text-[14px] font-semibold rounded-[8px] bg-[#C2410C] text-white hover:bg-[#EA580C] transition-colors"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
