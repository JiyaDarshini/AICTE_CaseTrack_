"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { apiRequest } from "@/lib/api";
import { User, BureauCell } from "@/lib/types";
import {
  ShieldCheck, UserCheck, Clock, CheckCircle2,
  AlertTriangle, Settings, Sliders, Save
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
      setFeedback(`User ${user.name} has been ${approved ? "approved" : "revoked"}!`);
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
      setFeedback(`SLA configured for ${newSLA.category}!`);
      setNewSLA({ category: "", sla_days: 30, warn_before_days: 5 });
      loadAdminData();
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback(err.message || "Failed to save SLA configuration.");
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />

        <main className="p-6 space-y-6 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#FED7AA]">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#C2410C]">
                Security, RBAC & Parameter Tuning
              </span>
              <h2 className="text-xl font-bold text-[#1F2937]">
                System Administration Console
              </h2>
            </div>
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]">
              Admin Privilege Enforced
            </span>
          </div>

          {feedback && (
            <div className="p-3 rounded-[6px] bg-[#FFF7ED] border border-[#F97316] text-xs font-bold text-[#C2410C]">
              {feedback}
            </div>
          )}

          {/* Section 1: User Approval & Role Management */}
          <div className="bg-white rounded-[8px] border border-[#FED7AA] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#FED7AA] bg-[#FFF7ED] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#C2410C]" />
                <h3 className="font-bold text-sm text-[#1F2937]">Official Accounts & RBAC Verification Queue</h3>
              </div>
              <span className="text-xs font-semibold text-[#6B7280]">
                {users.filter((u) => !u.is_approved).length} Pending Approvals
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs casetrack-table">
                <thead>
                  <tr>
                    <th className="py-2.5 px-3 font-bold text-[#C2410C]">Official Name</th>
                    <th className="py-2.5 px-3 font-bold text-[#C2410C]">Email Address</th>
                    <th className="py-2.5 px-3 font-bold text-[#C2410C]">Assigned Role</th>
                    <th className="py-2.5 px-3 font-bold text-[#C2410C]">Region</th>
                    <th className="py-2.5 px-3 font-bold text-[#C2410C]">Status</th>
                    <th className="py-2.5 px-3 font-bold text-[#C2410C] text-right">Approval Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FED7AA]">
                  {users.map((u) => (
                    <tr key={u.id} className="transition-colors">
                      <td className="py-2.5 px-3 font-bold text-[#1F2937]">{u.name}</td>
                      <td className="py-2.5 px-3 text-[#6B7280]">{u.email}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#6B7280]">{u.region || "All India"}</td>
                      <td className="py-2.5 px-3">
                        {u.is_approved ? (
                          <span className="text-xs font-semibold text-[#1F2937] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#C2410C]" /> Approved
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-[#C2410C] px-2 py-0.5 rounded bg-[#FFF7ED] border border-[#FED7AA]">
                            Pending Approval
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {!u.is_approved ? (
                          <button
                            onClick={() => handleApproveUser(u, true)}
                            className="px-3 py-1 bg-[#C2410C] text-white font-bold rounded hover:bg-[#EA580C] text-xs transition-colors"
                          >
                            Approve Account
                          </button>
                        ) : (
                          <button
                            onClick={() => handleApproveUser(u, false)}
                            className="px-2.5 py-1 text-xs text-[#6B7280] hover:text-[#C2410C] hover:underline"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: SLA Configuration Rules */}
          <div className="bg-white rounded-[8px] border border-[#FED7AA] shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#FED7AA]">
              <Sliders className="w-4 h-4 text-[#C2410C]" />
              <h3 className="font-bold text-sm text-[#1F2937]">Service Level Agreement (SLA) Matrix</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Existing SLA Table */}
              <div className="lg:col-span-2 overflow-x-auto border border-[#FED7AA] rounded-[6px]">
                <table className="w-full text-left text-xs casetrack-table">
                  <thead>
                    <tr>
                      <th className="py-2.5 px-3 font-bold text-[#C2410C]">Category</th>
                      <th className="py-2.5 px-3 font-bold text-[#C2410C] text-center">Max Disposal SLA</th>
                      <th className="py-2.5 px-3 font-bold text-[#C2410C] text-center">Warning Trigger</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#FED7AA]">
                    {slaConfigs.map((cfg) => (
                      <tr key={cfg.id} className="transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-[#1F2937]">{cfg.category}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-[#C2410C]">{cfg.sla_days} Days</td>
                        <td className="py-2.5 px-3 text-center text-[#6B7280]">{cfg.warn_before_days} Days Prior</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add / Update SLA Rule */}
              <div className="p-4 bg-[#FFF7ED] rounded-[6px] border border-[#FED7AA]">
                <h4 className="font-bold text-xs text-[#1F2937] mb-3">Add / Update Category SLA</h4>
                <form onSubmit={handleSaveSLA} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-[#1F2937] mb-1">Category Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Hostels & Infrastructure"
                      value={newSLA.category}
                      onChange={(e) => setNewSLA({ ...newSLA, category: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#FED7AA] rounded focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#1F2937] mb-1">Disposal SLA Target (Days)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={180}
                      value={newSLA.sla_days}
                      onChange={(e) => setNewSLA({ ...newSLA, sla_days: parseInt(e.target.value) || 30 })}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#FED7AA] rounded focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#1F2937] mb-1">Warn Prior to Due Date (Days)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={30}
                      value={newSLA.warn_before_days}
                      onChange={(e) => setNewSLA({ ...newSLA, warn_before_days: parseInt(e.target.value) || 5 })}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#FED7AA] rounded focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-[#C2410C] text-white font-bold rounded hover:bg-[#EA580C] transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save SLA Rule
                  </button>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
