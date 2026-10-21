import React from "react";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "neutral" | "critical" | "muted";
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "neutral",
  icon,
  className = "",
}) => {
  const variantStyles = {
    neutral: "bg-white border-[#D1D5DB] text-[#1F2937]",
    critical: "bg-white border-[#C2410C] text-[#C2410C] font-semibold",
    muted: "bg-white border-[#E5E7EB] text-[#6B7280]",
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[13px] leading-[1.5] rounded-[8px] border ${variantStyles} ${className}`}
    >
      {icon}
      <span>{children}</span>
    </span>
  );
};
