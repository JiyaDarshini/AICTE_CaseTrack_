"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { DashboardSummary } from "@/lib/types";

interface Props {
  summary: DashboardSummary;
}

const COLORS = ["#FED7AA", "#FB923C", "#EA580C", "#9A3412", "#C2410C"];

export const StatusDonutChart: React.FC<Props> = ({ summary }) => {
  const data = [
    { name: "Pending", value: summary.pending_cases },
    { name: "Under Process", value: summary.under_process_cases },
    { name: "Disposed", value: summary.disposed_cases },
    { name: "Transferred", value: summary.transferred_cases },
    { name: "Escalated", value: summary.escalated_cases },
  ].filter((item) => item.value > 0);

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            innerRadius={55}
            outerRadius={85}
            paddingAngle={4}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              fontFamily: '"Times New Roman", Times, serif',
              backgroundColor: "#FFF7ED",
              borderColor: "#FED7AA",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Legend
            wrapperStyle={{
              fontFamily: '"Times New Roman", Times, serif',
              fontSize: "11px",
              paddingTop: "8px"
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
