import React from "react";

export interface KpiCardProps {
  label: string;
  value: number | string;
  subValue?: string;
  icon?: React.ReactNode;
  alert?: boolean;
  highlight?: boolean;
  onClick?: () => void;
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  subValue,
  icon,
  alert = false,
  onClick,
  className = "",
}) => {
  return (
    <div
      onClick={onClick}
      className={`h-[96px] bg-white border border-[#FED7AA] rounded-[8px] p-[20px] flex flex-col justify-between transition-colors ${
        onClick ? "cursor-pointer hover:border-[#F97316]" : ""
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] text-[#6B7280] leading-[1.5] truncate font-medium">
          {label}
        </span>
        {icon && (
          <div className={alert ? "text-[#C2410C] shrink-0" : "text-[#6B7280] shrink-0"}>
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span
          className={`text-[22px] font-bold leading-none ${
            alert ? "text-[#C2410C]" : "text-[#1F2937]"
          }`}
        >
          {value}
        </span>
        {subValue && (
          <span className="text-[13px] text-[#6B7280] leading-none truncate">
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
};
