"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { DataTable, Column } from "@/components/DataTable";
import { apiRequest } from "@/lib/api";
import { User, BureauCell } from "@/lib/types";
import {
  ShieldCheck, UserCheck, Clock, CheckCircle2,
  AlertTriangle, Settings, Sliders, Save, Building
} from "lucide-react";

interface SLAConfigItem {
  id: string;
  category: string;
  sla_days: number;
  warn_before_days: number;
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [bureaus, setBureaus] = useState<BureauCell[]>([]);
  const [slaConfigs, setSlaConfigs] = useState<SLAConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  // New SLA Config form
  const [newSLA, setNewSLA] = useState({ category: "", sla_days: 30, warn_before_days: 5 });

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [u, b, s] = await Promise.all([
        apiRequest<User[]>("/users"),
        apiRequest<BureauCell[]>("/bureaus"),
        apiRequest<SLAConfigItem[]>("/sla-configs"),
      ]);
      setUsers(u || []);
      setBureaus(b || []);
      setSlaConfigs(s || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleApproveUser = async (user: User, approved: boolean) => {
    try {
      await apiRequest(`/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_approved: approved }),
      });
      setFeedback(`User ${user.name} has been ${approved ? "approved" : "revoked"} successfully.`);
      loadAdminData();
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback(err.message || "Failed to update user approval.");
    }
  };

  const handleSaveSLA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSLA.category) return;
    try {
      await apiRequest("/sla-configs", {
        method: "POST",
        body: JSON.stringify(newSLA),
      });
      setFeedback(`SLA configured for ${newSLA.category}.`);
      setNewSLA({ category: "", sla_days: 30, warn_before_days: 5 });
      loadAdminData();
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback(err.message || "Failed to save SLA configuration.");
    }
  };

  const pendingApprovals = users.filter((u) => !u.is_approved).length;

  const userColumns: Column<User>[] = [
    {
      key: "name",
      header: "Official Name",
      render: (u) => <span className="font-bold text-[#1F2937]">{u.name}</span>,
    },
    {
      key: "email",
      header: "Email Address",
      render: (u) => <span className="text-[#6B7280]">{u.email}</span>,
    },
    {
      key: "role",
      header: "Assigned Role",
      render: (u) => (
        <span className="inline-block text-[13px] px-2.5 py-0.5 rounded-[8px] bg-white border border-[#D1D5DB] text-[#1F2937]">
          {u.role}
        </span>
      ),
    },
    {
      key: "region",
      header: "Region",
      render: (u) => <span className="text-[#6B7280]">{u.region || "All India"}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (u) =>
        u.is_approved ? (
          <span className="text-[13px] font-semibold text-[#1F2937] inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#C2410C]" /> Approved
          </span>
        ) : (
          <span className="text-[13px] font-semibold text-[#C2410C]">
            Pending Approval
          </span>
        ),
    },
    {
      key: "action",
      header: "Approval Action",
      align: "right",
      render: (u) =>
        !u.is_approved ? (
          <button
            onClick={() => handleApproveUser(u, true)}
            className="px-3 py-1.5 bg-[#C2410C] text-white font-semibold rounded-[8px] hover:bg-[#EA580C] text-[13px] transition-colors"
          >
            Approve Account
          </button>
        ) : (
          <button
            onClick={() => handleApproveUser(u, false)}
            className="text-[13px] text-[#6B7280] hover:text-[#C2410C] hover:underline"
          >
            Revoke
          </button>
        ),
    },
  ];

  const slaColumns: Column<SLAConfigItem>[] = [
    {
      key: "category",
      header: "Grievance Category",
      render: (s) => <span className="font-semibold text-[#1F2937]">{s.category}</span>,
    },
    {
      key: "sla_days",
      header: "Max SLA Timeline",
      align: "center",
      render: (s) => <span>{s.sla_days} Days</span>,
    },
    {
      key: "warn_before_days",
      header: "Early Warning Window",
      align: "center",
      render: (s) => <span className="text-[#6B7280]">{s.warn_before_days} Days Before</span>,
    },
    {
      key: "status",
      header: "Engine Status",
      align: "right",
      render: () => (
        <span className="text-[13px] text-[#1F2937] font-medium">Active Policy</span>
      ),
    },
  ];

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />

        <main className="p-8 space-y-8 max-w-[1280px] w-full mx-auto overflow-y-auto">
          {/* 1. Unified PageHeader */}
          <PageHeader
            title="System Administration Console"
            description="User RBAC account verification, bureau configuration, and statutory SLA thresholds."
          />

          {feedback && (
            <div className="p-3.5 bg-white border border-[#FED7AA] text-[14px] text-[#1F2937] rounded-[8px]">
              {feedback}
            </div>
          )}

          {/* 2. KPI / Summary Row: Equal height 96px */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard
              label="Registered Users"
              value={users.length}
              icon={<UserCheck className="w-4 h-4" />}
            />
            <KpiCard
              label="Pending Approvals"
              value={pendingApprovals}
              alert={pendingApprovals > 0}
              icon={<Clock className="w-4 h-4" />}
            />
            <KpiCard
              label="Active Bureaus"
              value={bureaus.length}
              icon={<Building className="w-4 h-4" />}
            />
            <KpiCard
              label="SLA Categories"
              value={slaConfigs.length}
              icon={<Sliders className="w-4 h-4" />}
            />
          </div>

          {/* 3. Section 1: User Account Approvals */}
          <div className="space-y-4">
            <div>
              <h2 className="text-[18px] font-bold text-[#1F2937] leading-[1.5] m-0">
                Official Accounts & RBAC Verification Queue
              </h2>
              <p className="text-[13px] text-[#6B7280] leading-[1.5] mt-0.5 m-0">
                Validate and approve incoming officer signups across bureaus
              </p>
            </div>

            <DataTable
              columns={userColumns}
              data={users}
              keyExtractor={(u) => u.id}
              emptyMessage={loading ? "Loading users..." : "No user accounts registered."}
            />
          </div>

          {/* 4. Section 2: SLA Configuration & Category Parameters */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="p-[20px] bg-white rounded-[8px] border border-[#FED7AA] space-y-4">
              <div>
                <h2 className="text-[18px] font-bold text-[#1F2937] leading-[1.5] m-0">
                  Configure Category SLA
                </h2>
                <p className="text-[13px] text-[#6B7280] leading-[1.5] mt-0.5 m-0">
                  Define resolution thresholds for compliance triggers
                </p>
              </div>

              <form onSubmit={handleSaveSLA} className="space-y-4 text-[14px]">
                <div>
                  <label className="block text-[13px] font-semibold text-[#1F2937] mb-1">
                    Grievance Category *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Faculty & Staff Grievance"
                    value={newSLA.category}
                    onChange={(e) => setNewSLA({ ...newSLA, category: e.target.value })}
                    className="w-full h-[38px] px-3 bg-white border border-[#FED7AA] rounded-[8px] text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-semibold text-[#1F2937] mb-1">
                      Max Days
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={newSLA.sla_days}
                      onChange={(e) => setNewSLA({ ...newSLA, sla_days: parseInt(e.target.value) || 30 })}
                      className="w-full h-[38px] px-3 bg-white border border-[#FED7AA] rounded-[8px] text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-[#1F2937] mb-1">
                      Warning Days
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={newSLA.warn_before_days}
                      onChange={(e) => setNewSLA({ ...newSLA, warn_before_days: parseInt(e.target.value) || 5 })}
                      className="w-full h-[38px] px-3 bg-white border border-[#FED7AA] rounded-[8px] text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#C2410C] text-white font-semibold rounded-[8px] hover:bg-[#EA580C] transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save SLA Threshold</span>
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div>
                <h2 className="text-[18px] font-bold text-[#1F2937] leading-[1.5] m-0">
                  Active SLA Threshold Policies
                </h2>
                <p className="text-[13px] text-[#6B7280] leading-[1.5] mt-0.5 m-0">
                  Current statutory resolution guidelines applied by scanner
                </p>
              </div>

              <DataTable
                columns={slaColumns}
                data={slaConfigs}
                keyExtractor={(s) => s.id}
                emptyMessage="No SLA configurations saved."
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
