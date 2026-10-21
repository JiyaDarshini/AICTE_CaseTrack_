"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Bell, Clock, AlertCircle, LogIn, UserPlus } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { Notification, User } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";

export const TopNav: React.FC = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const data = await apiRequest<Notification[]>("/notifications?limit=5");
      setNotifications(data || []);
      setUnreadCount(data ? data.filter((n) => !n.is_read).length : 0);
    } catch (_) {}
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("casetrack_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (_) {}
    }

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifMenu(false);
      }
    };
    if (showNotifMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifMenu]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    router.push(`/cases?case_number=${encodeURIComponent(searchTerm.trim())}`);
  };

  const markAllRead = async () => {
    try {
      await apiRequest("/notifications/read-all", { method: "POST" });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (_) {}
  };

  return (
    <header className="h-16 bg-white border-b border-[#FED7AA] px-8 flex items-center justify-between sticky top-0 z-20 gap-4">
      {/* Global Case Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md relative">
        <label htmlFor="topnav-search" className="sr-only">
          Search Case Number
        </label>
        <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          id="topnav-search"
          type="text"
          placeholder="Search Case Number (e.g. AICTE/PGRC/2026/001)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 h-[38px] text-[14px] bg-white border border-[#FED7AA] rounded-[8px] text-[#1F2937] placeholder-[#6B7280] focus:outline-none focus:ring-1 focus:ring-[#F97316] leading-[1.5]"
        />
      </form>

      {/* Right Controls: Clock, Notifications, Persona */}
      <div className="flex items-center gap-4">
        {/* Clock */}
        <div className="hidden lg:flex items-center gap-1.5 text-[13px] text-[#6B7280] leading-[1.5]">
          <Clock className="w-4 h-4 text-[#6B7280]" />
          <span>New Delhi (IST)</span>
        </div>

        {/* Notifications Icon & Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="p-2 text-[#6B7280] hover:text-[#1F2937] rounded-[8px] hover:bg-[#FFF7ED] transition-colors relative"
            aria-label="View notifications"
          >
            <Bell className="w-5 h-5 text-[#6B7280]" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#C2410C]" />
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-[#FED7AA] rounded-[8px] shadow-lg py-2 z-30">
              <div className="px-4 py-2 border-b border-[#FED7AA] flex items-center justify-between">
                <span className="text-[14px] font-bold text-[#1F2937]">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[13px] text-[#C2410C] hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-[13px] text-[#6B7280]">
                    No notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`px-4 py-2.5 border-b border-[#FED7AA] last:border-0 hover:bg-[#FFF7ED] transition-colors ${
                        !n.is_read ? "bg-[#FFF7ED]/50" : ""
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-[#C2410C] shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-[#1F2937] leading-[1.5]">
                            {n.title}
                          </p>
                          <p className="text-[13px] text-[#6B7280] leading-[1.5] truncate">
                            {n.message || n.body}
                          </p>
                          <span className="text-[12px] text-[#6B7280]">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="px-4 pt-2 border-t border-[#FED7AA] text-center">
                <Link
                  href="/alerts"
                  onClick={() => setShowNotifMenu(false)}
                  className="text-[13px] font-semibold text-[#C2410C] hover:underline block"
                >
                  View All Alerts & SLA Scanner
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Vertical divider */}
        <div className="h-6 w-[1px] bg-[#FED7AA]" />

        {/* User Persona & Login / Register */}
        {user ? (
          <div className="flex items-center">
            <div className="px-3 py-1 bg-white rounded-[8px] border border-[#FED7AA] flex flex-col justify-center">
              <span className="text-[13px] font-bold text-[#1F2937] leading-tight truncate max-w-[130px] sm:max-w-[180px]">
                {user.name}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="px-2 py-0.5 text-[11px] font-medium rounded-[8px] bg-white border border-[#D1D5DB] text-[#1F2937] leading-none">
                  {user.role}
                </span>
                {user.region && (
                  <span className="text-[12px] text-[#6B7280] hidden md:inline">
                    • {user.region}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold rounded-[8px] bg-[#C2410C] text-white hover:bg-[#EA580C] transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold rounded-[8px] bg-white text-[#1F2937] border border-[#FED7AA] hover:bg-[#FFF7ED] transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5 text-[#6B7280]" />
              <span className="hidden sm:inline">Register</span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
