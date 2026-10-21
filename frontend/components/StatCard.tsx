import React from "react";

interface StatCardProps {
  label: string;
  value: number | string;
  subValue?: string;
  icon?: React.ReactNode;
  highlight?: boolean;
  alert?: boolean;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  icon,
  highlight = false,
  alert = false,
  onClick
}) => {
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-[8px] border transition-all duration-150 ${
        alert
          ? "bg-[#FFF7ED] border-[#C2410C] shadow-sm hover:border-[#EA580C]"
          : highlight
          ? "bg-[#FFF7ED] border-[#F97316] shadow-sm"
          : "bg-white border-[#FED7AA] hover:border-[#FDBA74]"
      } ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
          {label}
        </span>
        {icon && <div className="text-[#C2410C]">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-bold ${alert ? "text-[#C2410C]" : "text-[#1F2937]"}`}>
          {value}
        </span>
        {subValue && (
          <span className="text-xs font-normal text-[#6B7280]">
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
};
