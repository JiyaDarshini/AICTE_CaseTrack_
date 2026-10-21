import React from "react";
import { KpiCard, KpiCardProps } from "./KpiCard";

export interface StatCardProps extends KpiCardProps {}

export const StatCard: React.FC<StatCardProps> = (props) => {
  return <KpiCard {...props} />;
};
