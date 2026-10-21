"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export interface Column<T = any> {
  key: string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  align?: "left" | "center" | "right";
  width?: string;
}

interface DataTableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  maxVisibleColumns?: number;
  className?: string;
}

export function DataTable<T = any>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No records found.",
  onRowClick,
  maxVisibleColumns = 8,
  className = "",
}: DataTableProps<T>) {
  const [expandedRows, setExpandedRows] = useState<Record<string | number, boolean>>({});

  const hasOverflow = columns.length > maxVisibleColumns;
  const visibleColumns = hasOverflow ? columns.slice(0, maxVisibleColumns) : columns;
  const hiddenColumns = hasOverflow ? columns.slice(maxVisibleColumns) : [];

  const toggleExpand = (rowKey: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRows((prev) => ({
      ...prev,
      [rowKey]: !prev[rowKey],
    }));
  };

  return (
    <div className={`overflow-x-auto border border-[#FED7AA] rounded-[8px] bg-white ${className}`}>
      <table className="casetrack-table">
        <thead>
          <tr>
            {hasOverflow && (
              <th className="w-10 px-2 text-center" aria-label="Expand row"></th>
            )}
            {visibleColumns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={
                  col.align === "right"
                    ? "text-right"
                    : col.align === "center"
                    ? "text-center"
                    : "text-left"
                }
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={visibleColumns.length + (hasOverflow ? 1 : 0)}
                className="text-center py-8 text-[#6B7280] text-[14px]"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, index) => {
              const rowKey = keyExtractor(item, index);
              const isExpanded = !!expandedRows[rowKey];

              return (
                <React.Fragment key={rowKey}>
                  <tr
                    onClick={() => onRowClick && onRowClick(item)}
                    className={`${onRowClick ? "cursor-pointer" : ""}`}
                  >
                    {hasOverflow && (
                      <td className="w-10 px-2 text-center">
                        <button
                          type="button"
                          onClick={(e) => toggleExpand(rowKey, e)}
                          className="p-1 text-[#6B7280] hover:text-[#1F2937] rounded"
                          aria-label={isExpanded ? "Collapse row details" : "Expand row details"}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    )}
                    {visibleColumns.map((col) => {
                      const value = (item as any)[col.key];
                      return (
                        <td
                          key={col.key}
                          className={
                            col.align === "right"
                              ? "text-right"
                              : col.align === "center"
                              ? "text-center"
                              : "text-left"
                          }
                        >
                          {col.render ? col.render(item, index) : value ?? "—"}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row expansion for columns beyond 8 */}
                  {hasOverflow && isExpanded && (
                    <tr className="bg-[#FFF7ED]">
                      <td
                        colSpan={visibleColumns.length + 1}
                        className="p-4 border-b border-[#FED7AA]"
                      >
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-[13px]">
                          {hiddenColumns.map((col) => {
                            const value = (item as any)[col.key];
                            return (
                              <div key={col.key} className="space-y-0.5">
                                <span className="block text-[12px] font-bold text-[#6B7280] uppercase tracking-wider">
                                  {col.header}
                                </span>
                                <div className="text-[14px] text-[#1F2937]">
                                  {col.render ? col.render(item, index) : value ?? "—"}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
