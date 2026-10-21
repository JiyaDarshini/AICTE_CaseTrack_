"use client";

import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { BureauWorkload } from "@/lib/types";

interface Props {
  data: BureauWorkload[];
}

export const WorkloadBarChart: React.FC<Props> = ({ data }) => {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#FED7AA" vertical={false} />
          <XAxis
            dataKey="bureau_code"
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
          <Bar dataKey="pending" name="Pending" fill="#FED7AA" />
          <Bar dataKey="under_process" name="Under Process" fill="#FB923C" />
          <Bar dataKey="overdue" name="Overdue" fill="#C2410C" />
          <Bar dataKey="disposed" name="Disposed" fill="#EA580C" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
