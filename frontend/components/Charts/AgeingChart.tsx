"use client";

import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { AgeingBucket } from "@/lib/types";

interface Props {
  data: AgeingBucket[];
}

export const AgeingChart: React.FC<Props> = ({ data }) => {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#FED7AA" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontFamily: '"Times New Roman", Times, serif', fontSize: 11, fill: "#1F2937" }}
            axisLine={{ stroke: "#FED7AA" }}
          />
          <YAxis
            type="category"
            dataKey="bucket"
            tick={{ fontFamily: '"Times New Roman", Times, serif', fontSize: 11, fill: "#1F2937" }}
            axisLine={{ stroke: "#FED7AA" }}
            width={75}
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
          <Bar dataKey="count" name="Open Cases" fill="#F97316" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
