"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { apiRequest } from "@/lib/api";
import { Notification } from "@/lib/types";
import {
  BellRing, AlertTriangle, ShieldAlert, CheckCircle2,
  RefreshCw, Clock, ExternalLink
} from "lucide-react";
import Link from "next/link";

export default function AlertsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<Notification[]>(`/notifications?unread_only=${unreadOnly}`);
      setNotifications(data || []);
    } catch (_) {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [unreadOnly]);

  const triggerScan = async () => {
    setScanning(true);
    try {
      const res = await apiRequest("/alerts/sla");
      setScanResult(res.results);
      fetchNotifications();
    } catch (_) {}
    finally {
      setScanning(false);
    }
  };

  const markRead = async (id: string) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (_) {}
  };

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />

        <main className="p-6 space-y-6 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#FED7AA] gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#C2410C]">
                SLA Compliance & Automated Warning Engine
              </span>
              <h2 className="text-xl font-bold text-[#1F2937]">
                Regulatory Alerts & Notifications
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={triggerScan}
                disabled={scanning}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[6px] bg-[#C2410C] text-white hover:bg-[#EA580C] shadow-sm transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`} />
                {scanning ? "Scanning SLA Dates..." : "Run Real-Time SLA Scan"}
              </button>
            </div>
          </div>

          {/* Scan Result Banner */}
          {scanResult && (
            <div className="p-4 bg-[#FFF7ED] rounded-[8px] border border-[#F97316] text-xs space-y-1">
              <div className="font-bold text-[#C2410C]">SLA Scan Complete</div>
              <div className="text-[#1F2937]">
                Identified: <strong>{scanResult.warnings}</strong> approaching deadline warning(s), <strong>{scanResult.breaches}</strong> overdue breach(es), and <strong>{scanResult.escalations}</strong> auto-escalation(s) to Senior Management.
              </div>
            </div>
          )}

          {/* Notifications List Card */}
          <div className="bg-white rounded-[8px] border border-[#FED7AA] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#FED7AA] bg-[#FFF7ED] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-[#C2410C]" />
                <h3 className="font-bold text-sm text-[#1F2937]">Alert Feed</h3>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-[#1F2937] cursor-pointer">
                <input
                  type="checkbox"
                  checked={unreadOnly}
                  onChange={(e) => setUnreadOnly(e.target.checked)}
                  className="rounded border-[#FED7AA] text-[#C2410C] focus:ring-[#F97316]"
                />
                Unread alerts only
              </label>
            </div>

            <div className="divide-y divide-[#FED7AA]/60">
              {loading ? (
                <div className="p-8 text-center text-[#6B7280]">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#C2410C] border-t-transparent rounded-full animate-spin" />
                    <span>Loading alerts...</span>
                  </div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#6B7280]">
                  No notifications found matching filter.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      !n.is_read ? "bg-[#FFF7ED]/50" : "bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 rounded-full bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] shrink-0 mt-0.5">
                        {n.type === "ESCALATION" ? (
                          <ShieldAlert className="w-4 h-4" />
                        ) : n.type === "SLA_BREACH" ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : (
                          <Clock className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs text-[#1F2937]">{n.title}</h4>
                          {!n.is_read && (
                            <span className="w-2 h-2 rounded-full bg-[#C2410C]" />
                          )}
                        </div>
                        <p className="text-xs text-[#6B7280] mt-0.5 leading-relaxed">
                          {n.body}
                        </p>
                        <span className="text-[10px] text-[#9A3412] mt-1 block">
                          {new Date(n.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      {n.case_id && (
                        <Link
                          href={`/cases/${n.case_id}`}
                          className="px-2.5 py-1 text-xs font-bold rounded bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] hover:bg-[#FFEDD5]"
                        >
                          View Case
                        </Link>
                      )}
                      {!n.is_read && (
                        <button
                          onClick={() => markRead(n.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-[#6B7280] hover:text-[#1F2937] border border-[#FED7AA] rounded bg-white hover:bg-[#FFF7ED]"
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
