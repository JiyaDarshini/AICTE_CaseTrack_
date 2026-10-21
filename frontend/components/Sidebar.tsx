"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  Building2,
  GitCompare,
  UploadCloud,
  BellRing,
  FileBarChart2,
  ShieldCheck,
  LogOut,
  Landmark
} from "lucide-react";
import { User } from "@/lib/types";

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("casetrack_user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (_) {}
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("casetrack_token");
    localStorage.removeItem("casetrack_user");
    window.location.href = "/login";
  };

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Cases & Complaints", href: "/cases", icon: FolderOpen },
    { label: "Institutions Directory", href: "/institutions", icon: Building2 },
    { label: "Overlap Coordination", href: "/overlaps", icon: GitCompare },
    { label: "Data Ingestion", href: "/ingest", icon: UploadCloud },
    { label: "SLA Alerts & Reminders", href: "/alerts", icon: BellRing },
    { label: "Reports & Analytics", href: "/reports", icon: FileBarChart2 },
  ];

  // Admin access
  if (user?.role === "Admin" || user?.role === "Senior Manager") {
    navItems.push({ label: "Admin & Settings", href: "/admin", icon: ShieldCheck });
  }

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-[#FED7AA] flex flex-col justify-between shrink-0">
      <div>
        {/* Brand / Logo */}
        <div className="p-4 border-b border-[#FED7AA] bg-[#FFF7ED]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#F97316] rounded-md text-white shadow-sm">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-[#C2410C]">
                All India Council for Technical Education
              </span>
              <h1 className="text-lg font-bold tracking-tight text-[#1F2937]">
                CaseTrack
              </h1>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-[#6B7280]">
            Integrated Complaint & Overlap Monitoring System
          </div>
        </div>

        {/* User Card */}
        {user && (
          <div className="p-3 mx-3 my-3 bg-[#FFF7ED] rounded-[8px] border border-[#FED7AA]">
            <div className="text-xs font-bold text-[#1F2937] truncate">{user.name}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#C2410C] text-white">
                {user.role}
              </span>
              {user.region && (
                <span className="text-[10px] text-[#6B7280]">
                  {user.region} Region
                </span>
              )}
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="px-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded-[6px] transition-colors ${
                  isActive
                    ? "bg-[#C2410C] text-white shadow-sm"
                    : "text-[#1F2937] hover:bg-[#FFF7ED] hover:text-[#C2410C]"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-[#C2410C]"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-[#FED7AA]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-[#C2410C] bg-[#FFF7ED] hover:bg-[#FFEDD5] border border-[#FED7AA] rounded-[6px] transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
        <p className="mt-3 text-[10px] text-center text-[#6B7280]">
          SIH 2026 • Problem PS SIH26264
        </p>
      </div>
    </aside>
  );
};
