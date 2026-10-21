"use client";

import React, { useState, useRef, useEffect } from "react";
import { Filter, X, ChevronDown, RotateCcw } from "lucide-react";

export interface FilterItem {
  key: string;
  label: string;
  type?: "select" | "text" | "date";
  value: string;
  onChange: (value: string) => void;
  options?: { label: string; value: string }[];
  placeholder?: string;
}

interface FilterBarProps {
  filters: FilterItem[];
  onReset?: () => void;
  className?: string;
  maxVisible?: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onReset,
  className = "",
  maxVisible = 4,
}) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const visibleFilters = filters.slice(0, maxVisible);
  const extraFilters = filters.slice(maxVisible);

  const activeExtraCount = extraFilters.filter((f) => f.value && f.value.trim() !== "").length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setPopoverOpen(false);
      }
    };
    if (popoverOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [popoverOpen]);

  const renderFilterInput = (f: FilterItem, isPopover = false) => {
    if (f.type === "select") {
      return (
        <div key={f.key} className={isPopover ? "space-y-1" : "min-w-[140px] flex-1"}>
          {isPopover && (
            <label className="block text-[13px] font-medium text-[#6B7280]">
              {f.label}
            </label>
          )}
          <select
            value={f.value}
            onChange={(e) => f.onChange(e.target.value)}
            className="w-full h-[38px] px-3 text-[14px] bg-white border border-[#FED7AA] rounded-[8px] text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316] leading-[1.5]"
          >
            <option value="">{f.placeholder || `All ${f.label}`}</option>
            {f.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (f.type === "date") {
      return (
        <div key={f.key} className={isPopover ? "space-y-1" : "min-w-[130px] flex-1"}>
          {isPopover && (
            <label className="block text-[13px] font-medium text-[#6B7280]">
              {f.label}
            </label>
          )}
          <input
            type="date"
            value={f.value}
            onChange={(e) => f.onChange(e.target.value)}
            className="w-full h-[38px] px-3 text-[14px] bg-white border border-[#FED7AA] rounded-[8px] text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316] leading-[1.5]"
          />
        </div>
      );
    }

    return (
      <div key={f.key} className={isPopover ? "space-y-1" : "min-w-[160px] flex-1"}>
        {isPopover && (
          <label className="block text-[13px] font-medium text-[#6B7280]">
            {f.label}
          </label>
        )}
        <input
          type="text"
          value={f.value}
          onChange={(e) => f.onChange(e.target.value)}
          placeholder={f.placeholder || f.label}
          className="w-full h-[38px] px-3 text-[14px] bg-white border border-[#FED7AA] rounded-[8px] text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316] leading-[1.5]"
        />
      </div>
    );
  };

  return (
    <div className={`flex flex-wrap items-center gap-3 w-full bg-white ${className}`}>
      {visibleFilters.map((f) => renderFilterInput(f))}

      {extraFilters.length > 0 && (
        <div className="relative shrink-0" ref={popoverRef}>
          <button
            type="button"
            onClick={() => setPopoverOpen(!popoverOpen)}
            className={`inline-flex items-center gap-1.5 h-[38px] px-3 text-[14px] font-semibold rounded-[8px] border transition-colors ${
              activeExtraCount > 0
                ? "bg-[#FFF7ED] border-[#F97316] text-[#C2410C]"
                : "bg-white border-[#FED7AA] text-[#1F2937] hover:bg-[#FFF7ED]"
            }`}
          >
            <Filter className="w-4 h-4 text-[#C2410C]" />
            <span>More filters</span>
            {activeExtraCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#C2410C] text-white text-[11px] font-bold flex items-center justify-center">
                {activeExtraCount}
              </span>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" />
          </button>

          {popoverOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white border border-[#FED7AA] rounded-[8px] shadow-lg p-4 z-30 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#FED7AA]">
                <span className="text-[14px] font-bold text-[#1F2937]">
                  Additional Filters
                </span>
                <button
                  type="button"
                  onClick={() => setPopoverOpen(false)}
                  className="text-[#6B7280] hover:text-[#1F2937]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto">
                {extraFilters.map((f) => renderFilterInput(f, true))}
              </div>
            </div>
          )}
        </div>
      )}

      {onReset && (
        <button
          type="button"
          onClick={onReset}
          title="Reset all filters"
          className="inline-flex items-center gap-1 h-[38px] px-3 text-[13px] font-semibold text-[#6B7280] hover:text-[#C2410C] bg-white border border-[#FED7AA] rounded-[8px] transition-colors shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      )}
    </div>
  );
};
