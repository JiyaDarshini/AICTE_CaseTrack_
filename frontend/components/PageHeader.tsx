import React from "react";

export interface PageHeaderAction {
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: React.ReactNode;
  variant?: "primary" | "secondary";
}

interface PageHeaderProps {
  title: string;
  description: string;
  actions?: PageHeaderAction[];
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions = [],
}) => {
  // Enforce max 2 action buttons
  const visibleActions = actions.slice(0, 2);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#FED7AA] gap-4">
      <div>
        <h1 className="text-[28px] font-bold text-[#1F2937] leading-[1.5] m-0">
          {title}
        </h1>
        <p className="text-[15px] text-[#6B7280] leading-[1.5] mt-1 m-0">
          {description}
        </p>
      </div>

      {visibleActions.length > 0 && (
        <div className="flex items-center gap-3 shrink-0">
          {visibleActions.map((action, idx) => {
            const isPrimary = action.variant !== "secondary";
            const className = `inline-flex items-center gap-2 px-4 py-2 text-[14px] font-semibold rounded-[8px] transition-colors leading-[1.5] ${
              isPrimary
                ? "bg-[#C2410C] text-white hover:bg-[#EA580C]"
                : "bg-white text-[#1F2937] border border-[#FED7AA] hover:bg-[#FFF7ED]"
            }`;

            if (action.href) {
              return (
                <a key={idx} href={action.href} className={className}>
                  {action.icon}
                  <span>{action.label}</span>
                </a>
              );
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={action.onClick}
                className={className}
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
