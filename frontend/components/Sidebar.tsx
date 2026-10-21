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
  Landmark,
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

  if (user?.role === "Admin" || user?.role === "Senior Manager") {
    navItems.push({ label: "Admin & Settings", href: "/admin", icon: ShieldCheck });
  }

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-[#FED7AA] flex flex-col justify-between shrink-0">
      <div>
        {/* Brand: "AICTE CaseTrack" only */}
        <div className="h-16 px-6 border-b border-[#FED7AA] flex items-center gap-3">
          <div className="p-1.5 bg-[#C2410C] rounded-[8px] text-white shrink-0">
            <Landmark className="w-5 h-5" />
          </div>
          <span className="text-[18px] font-bold text-[#1F2937] leading-[1.5] truncate">
            AICTE CaseTrack
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 text-[14px] font-semibold rounded-[8px] transition-colors leading-[1.5] ${
                  isActive
                    ? "bg-[#C2410C] text-white"
                    : "text-[#1F2937] hover:bg-[#FFF7ED] hover:text-[#C2410C]"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-[#6B7280]"}`} />
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
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[13px] font-semibold text-[#1F2937] bg-white hover:bg-[#FFF7ED] border border-[#FED7AA] rounded-[8px] transition-colors leading-[1.5]"
        >
          <LogOut className="w-3.5 h-3.5 text-[#6B7280]" />
          <span>Sign Out</span>
        </button>
        <p className="mt-2 text-[13px] text-center text-[#6B7280] leading-[1.5] m-0">
          SIH 2026 • PS SIH26264
        </p>
      </div>
    </aside>
  );
};
