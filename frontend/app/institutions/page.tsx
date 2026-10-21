"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { apiRequest } from "@/lib/api";
import { Institution } from "@/lib/types";
import { Search, Building2, MapPin, Eye, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function InstitutionsPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchInstitutions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("q", search);
      if (region) params.append("region", region);
      const data = await apiRequest<Institution[]>(`/institutions?${params.toString()}`);
      setInstitutions(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstitutions();
  }, [region]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInstitutions();
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
                Official Institutional Directory
              </span>
              <h2 className="text-xl font-bold text-[#1F2937]">
                AICTE Approved Institutions
              </h2>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]">
              {institutions.length} Institutions Registered
            </span>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9A3412]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Institution Name or AICTE Permanent ID (e.g. 1-1002341)..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-[#FED7AA] rounded-[6px] text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
              />
            </div>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="px-3 py-2 text-xs bg-white border border-[#FED7AA] rounded-[6px] text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
            >
              <option value="">All Regions</option>
              <option value="Northern">Northern</option>
              <option value="Southern">Southern</option>
              <option value="Western">Western</option>
              <option value="Eastern">Eastern</option>
              <option value="Central">Central</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold rounded-[6px] bg-[#C2410C] text-white hover:bg-[#EA580C] transition-colors"
            >
              Search
            </button>
          </form>

          {/* Institutions Table */}
          <div className="bg-white rounded-[8px] border border-[#FED7AA] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs casetrack-table">
                <thead>
                  <tr>
                    <th className="py-2.5 px-3 font-bold text-[#C2410C]">AICTE Permanent ID</th>
                    <th className="py-2.5 px-3 font-bold text-[#C2410C]">Institution Name</th>
                    <th className="py-2.5 px-3 font-bold text-[#C2410C]">Type</th>
                    <th className="py-2.5 px-3 font-bold text-[#C2410C]">Location</th>
                    <th className="py-2.5 px-3 font-bold text-[#C2410C]">Region</th>
                    <th className="py-2.5 px-3 font-bold text-[#C2410C]">Status</th>
                    <th className="py-2.5 px-3 font-bold text-[#C2410C] text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FED7AA]">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#6B7280]">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-[#C2410C] border-t-transparent rounded-full animate-spin" />
                          <span>Loading institutions directory...</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    institutions.map((inst) => (
                      <tr key={inst.id} className="transition-colors">
                        <td className="py-2.5 px-3 font-bold text-[#1F2937]">
                          {inst.aicte_permanent_id}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#1F2937]">
                          {inst.name}
                        </td>
                        <td className="py-2.5 px-3 text-[#6B7280]">
                          {inst.type || "Technical"}
                        </td>
                        <td className="py-2.5 px-3 text-[#6B7280]">
                          {inst.city}, {inst.state}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold px-2 py-0.5 rounded bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]">
                            {inst.region}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-xs text-[#1F2937]">
                            {inst.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Link
                            href={`/institutions/${inst.id}`}
                            className="inline-flex items-center gap-1 font-bold text-[#C2410C] hover:underline"
                          >
                            Consolidated History &rarr;
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
