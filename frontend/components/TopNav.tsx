"use client";

import React, { useState, useEffect } from "react";
import { Search, Bell, Clock, AlertCircle, LogOut, LogIn, UserPlus } from "lucide-react";
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
    const interval = setInterval(fetchNotifications, 30000); // 30s poll
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    router.push(`/cases?case_number=${encodeURIComponent(searchTerm.trim())}`);
  };

  const handleLogout = () => {
    localStorage.removeItem("casetrack_token");
    localStorage.removeItem("casetrack_user");
    window.location.href = "/login";
  };

  const markAllRead = async () => {
    try {
      await apiRequest("/notifications/read-all", { method: "POST" });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (_) {}
  };

  return (
    <header className="h-16 bg-white border-b border-[#FED7AA] px-6 flex items-center justify-between sticky top-0 z-20 gap-4">
      {/* Global Search Bar */}
      <form onSubmit={handleSearch} className="relative w-80 lg:w-96">
        <label htmlFor="global-search" className="sr-only">
          Search cases by ID or institution
        </label>
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9A3412]" />
        <input
          id="global-search"
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by Case No., Permanent ID, or Institution..."
          className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#FFF7ED] border border-[#FED7AA] rounded-[6px] text-[#1F2937] placeholder-[#6B7280] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F97316]"
        />
      </form>

      {/* Right Section: Clock, Bell, Logged-in Persona & Auth Actions */}
      <div className="flex items-center gap-3">
        {/* Clock */}
        <div className="hidden xl:flex items-center gap-1.5 text-xs text-[#6B7280]">
          <Clock className="w-3.5 h-3.5 text-[#C2410C]" />
          <span>New Delhi (IST)</span>
        </div>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            aria-label="Open notifications"
            className="p-2 rounded-full hover:bg-[#FFF7ED] border border-transparent hover:border-[#FED7AA] relative text-[#1F2937] transition-colors"
          >
            <Bell className="w-5 h-5 text-[#C2410C]" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-[#C2410C] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-[#FED7AA] rounded-[8px] shadow-lg py-2 z-50">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[#FED7AA]">
                <span className="text-xs font-bold text-[#1F2937]">Alerts & SLA Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] font-semibold text-[#C2410C] hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-[#FED7AA]/50">
                {notifications.length === 0 ? (
                  <div className="p-4 text-xs text-center text-[#6B7280]">
                    No recent notifications
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3 text-xs hover:bg-[#FFF7ED] transition-colors ${
                        !notif.is_read ? "bg-[#FFF7ED]/60 font-semibold" : ""
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-[#C2410C] shrink-0 mt-0.5" />
                        <div>
                          <div className="text-[#1F2937] font-bold">{notif.title}</div>
                          <div className="text-[11px] text-[#6B7280] line-clamp-2 mt-0.5">
                            {notif.body}
                          </div>
                          <div className="text-[10px] text-[#C2410C] mt-1">
                            {new Date(notif.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2 border-t border-[#FED7AA] text-center">
                <Link
                  href="/alerts"
                  onClick={() => setShowNotifMenu(false)}
                  className="text-xs font-bold text-[#C2410C] hover:underline"
                >
                  View All Alerts & SLA Scanner
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Vertical divider */}
        <div className="h-6 w-[1px] bg-[#FED7AA]" />

        {/* User Persona & Login / Register / Sign Out Option */}
        {user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Person Card (matches sidebar card design in user screenshot) */}
            <div className="px-3 py-1.5 bg-[#FFF7ED] rounded-[8px] border border-[#FED7AA] shadow-sm flex flex-col justify-center">
              <span className="text-xs font-bold text-[#1F2937] leading-tight truncate max-w-[130px] sm:max-w-[180px]">
                {user.name}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#C2410C] text-white leading-none">
                  {user.role}
                </span>
                {user.region && (
                  <span className="text-[10px] text-[#6B7280] hidden md:inline">
                    • {user.region}
                  </span>
                )}
              </div>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={handleLogout}
              title="Sign Out of CaseTrack"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#C2410C] bg-[#FFF7ED] hover:bg-[#FFEDD5] border border-[#FED7AA] rounded-[6px] transition-colors shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[6px] bg-[#C2410C] text-white hover:bg-[#EA580C] shadow-sm transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </Link>
            <Link
              href="/register"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[6px] bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] hover:bg-[#FFEDD5] transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Register</span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
