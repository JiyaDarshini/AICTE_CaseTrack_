"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { User } from "@/lib/types";
import { AdminDashboard } from "@/components/dashboards/AdminDashboard";
import { SeniorManagerDashboard } from "@/components/dashboards/SeniorManagerDashboard";
import { PgrcDashboard } from "@/components/dashboards/PgrcDashboard";
import { RbDashboard } from "@/components/dashboards/RbDashboard";
import { RegionalOfficeDashboard } from "@/components/dashboards/RegionalOfficeDashboard";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("casetrack_user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (_) {}
    }
    setMounted(true);
  }, []);

  const renderDashboardByRole = () => {
    if (!user) {
      return <AdminDashboard user={null} />;
    }

    switch (user.role) {
      case "Senior Manager":
        return <SeniorManagerDashboard user={user} />;
      case "PGRC":
        return <PgrcDashboard user={user} />;
      case "RB":
        return <RbDashboard user={user} />;
      case "Regional Office":
        return <RegionalOfficeDashboard user={user} />;
      case "Admin":
      default:
        return <AdminDashboard user={user} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />
        {mounted ? renderDashboardByRole() : (
          <main className="p-8 max-w-[1280px] w-full mx-auto">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-100 rounded w-1/3" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
              <div className="grid grid-cols-4 gap-4 mt-8">
                <div className="h-24 bg-gray-100 rounded" />
                <div className="h-24 bg-gray-100 rounded" />
                <div className="h-24 bg-gray-100 rounded" />
                <div className="h-24 bg-gray-100 rounded" />
              </div>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
