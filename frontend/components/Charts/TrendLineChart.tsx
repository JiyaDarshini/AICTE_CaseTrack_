"use client";

import React from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

interface Props {
  data: { month: string; received: number; disposed: number }[];
}

export const TrendLineChart: React.FC<Props> = ({ data }) => {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#FED7AA" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontFamily: '"Times New Roman", Times, serif', fontSize: 11, fill: "#1F2937" }}
            axisLine={{ stroke: "#FED7AA" }}
          />
          <YAxis
            tick={{ fontFamily: '"Times New Roman", Times, serif', fontSize: 11, fill: "#1F2937" }}
            axisLine={{ stroke: "#FED7AA" }}
          />
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
          <Line
            type="monotone"
            dataKey="received"
            name="Cases Received"
            stroke="#F97316"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#C2410C" }}
          />
          <Line
            type="monotone"
            dataKey="disposed"
            name="Cases Disposed"
            stroke="#FB923C"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{ r: 3, fill: "#EA580C" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
