"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { AlertStrip } from "@/components/AlertStrip";
import { EmptyState } from "@/components/EmptyState";
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
    } catch (_) {
    } finally {
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
    } catch (_) {
    } finally {
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

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const escalationCount = notifications.filter((n) => n.type === "ESCALATION").length;
  const breachCount = notifications.filter((n) => n.type === "SLA_BREACH").length;

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />

        <main className="p-8 space-y-8 max-w-[1280px] w-full mx-auto overflow-y-auto">
          {/* 1. Unified PageHeader */}
          <PageHeader
            title="Regulatory Alerts & Notifications"
            description="Automated SLA breach detection, escalation triggers, and compliance alerts."
            actions={[
              {
                label: scanning ? "Scanning SLA..." : "Run Real-Time SLA Scan",
                onClick: triggerScan,
                icon: <RefreshCw className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />,
              },
            ]}
          />

          {/* 2. Compact Alert Strip (Max 1 per page) */}
          {scanResult && (
            <AlertStrip
              title="Real-Time SLA Scan Complete"
              description={`Identified ${scanResult.warnings} approaching deadline warning(s), ${scanResult.breaches} overdue breach(es), and ${scanResult.escalations} auto-escalation(s).`}
              onDismiss={() => setScanResult(null)}
            />
          )}

          {/* 3. KPI / Summary Row: Equal height 96px */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard
              label="Total Notifications"
              value={notifications.length}
              icon={<BellRing className="w-4 h-4" />}
            />
            <KpiCard
              label="Unread Alerts"
              value={unreadCount}
              alert={unreadCount > 0}
              icon={<Clock className="w-4 h-4" />}
            />
            <KpiCard
              label="Escalations"
              value={escalationCount}
              alert={escalationCount > 0}
              icon={<ShieldAlert className="w-4 h-4" />}
            />
            <KpiCard
              label="SLA Breaches"
              value={breachCount}
              alert={breachCount > 0}
              icon={<AlertTriangle className="w-4 h-4" />}
            />
          </div>

          {/* 4. Main Content: Notifications Feed Card */}
          <div className="bg-white rounded-[8px] border border-[#FED7AA] p-[20px] space-y-4">
            <div className="flex items-center justify-between border-b border-[#FED7AA] pb-4">
              <div>
                <h2 className="text-[18px] font-bold text-[#1F2937] leading-[1.5] m-0">
                  Compliance & Alert Feed
                </h2>
                <p className="text-[13px] text-[#6B7280] leading-[1.5] mt-0.5 m-0">
                  Real-time regulatory events, approaching deadlines, and reminders
                </p>
              </div>

              <label className="flex items-center gap-2 text-[14px] font-semibold text-[#1F2937] cursor-pointer">
                <input
                  type="checkbox"
                  checked={unreadOnly}
                  onChange={(e) => setUnreadOnly(e.target.checked)}
                  className="rounded border-[#FED7AA] text-[#C2410C] focus:ring-[#F97316]"
                />
                <span>Unread alerts only</span>
              </label>
            </div>

            {loading ? (
              <div className="p-8 text-center text-[#6B7280]">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#C2410C] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[14px]">Loading notifications...</span>
                </div>
              </div>
            ) : notifications.length === 0 ? (
              <EmptyState
                title="No alerts found"
                description={unreadOnly ? "No unread notifications at this time." : "No regulatory notifications on record."}
              />
            ) : (
              <div className="divide-y divide-[#FED7AA]">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[14px]"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-1.5 rounded-[8px] bg-white border border-[#D1D5DB] text-[#1F2937] shrink-0 mt-0.5">
                        {n.type === "ESCALATION" ? (
                          <ShieldAlert className="w-4 h-4 text-[#C2410C]" />
                        ) : n.type === "SLA_BREACH" ? (
                          <AlertTriangle className="w-4 h-4 text-[#C2410C]" />
                        ) : (
                          <Clock className="w-4 h-4 text-[#6B7280]" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${!n.is_read ? "text-[#1F2937]" : "text-[#6B7280]"}`}>
                            {n.title}
                          </span>
                          {!n.is_read && (
                            <span className="w-2 h-2 rounded-full bg-[#C2410C]" />
                          )}
                        </div>
                        <p className="text-[13px] text-[#6B7280] leading-[1.5] mt-0.5 m-0 line-clamp-2">
                          {n.message || n.body}
                        </p>
                        <span className="text-[12px] text-[#6B7280] block mt-1">
                          {new Date(n.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                      {!n.is_read && (
                        <button
                          onClick={() => markRead(n.id)}
                          className="text-[13px] font-semibold text-[#6B7280] hover:text-[#1F2937] hover:underline"
                        >
                          Mark as read
                        </button>
                      )}
                      {n.case_id && (
                        <Link
                          href={`/cases/${n.case_id}`}
                          className="font-semibold text-[#C2410C] hover:underline text-[13px] inline-flex items-center gap-1"
                        >
                          <span>View Case</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
