"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { FilterBar, FilterItem } from "@/components/FilterBar";
import { DataTable, Column } from "@/components/DataTable";
import { apiRequest } from "@/lib/api";
import { Institution } from "@/lib/types";
import { Building2, MapPin, Eye } from "lucide-react";
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

  const handleSearchSubmit = () => {
    fetchInstitutions();
  };

  const handleResetFilters = () => {
    setSearch("");
    setRegion("");
    setTimeout(fetchInstitutions, 50);
  };

  const filterItems: FilterItem[] = [
    {
      key: "search",
      label: "Search Institution",
      placeholder: "Search by Name or Permanent ID...",
      value: search,
      onChange: (val) => setSearch(val),
    },
    {
      key: "region",
      label: "Region",
      type: "select",
      value: region,
      onChange: (val) => setRegion(val),
      options: [
        { label: "Northern", value: "Northern" },
        { label: "Southern", value: "Southern" },
        { label: "Western", value: "Western" },
        { label: "Eastern", value: "Eastern" },
        { label: "Central", value: "Central" },
      ],
    },
  ];

  const columns: Column<Institution>[] = [
    {
      key: "aicte_permanent_id",
      header: "AICTE Permanent ID",
      render: (inst) => (
        <span className="font-bold text-[#1F2937] whitespace-nowrap">
          {inst.aicte_permanent_id}
        </span>
      ),
    },
    {
      key: "name",
      header: "Institution Name",
      render: (inst) => (
        <span className="font-semibold text-[#1F2937] line-clamp-1">
          {inst.name}
        </span>
      ),
    },
    {
      key: "type",
      header: "Category",
      render: (inst) => (
        <span className="text-[#6B7280]">{inst.type || "Technical"}</span>
      ),
    },
    {
      key: "location",
      header: "Location",
      render: (inst) => (
        <span className="text-[#6B7280]">
          {inst.city}, {inst.state}
        </span>
      ),
    },
    {
      key: "region",
      header: "Region",
      align: "center",
      render: (inst) => (
        <span className="inline-block text-[13px] px-2.5 py-0.5 rounded-[8px] bg-white border border-[#D1D5DB] text-[#1F2937]">
          {inst.region}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      render: (inst) => (
        <span className="inline-block text-[13px] px-2.5 py-0.5 rounded-[8px] bg-white border border-[#D1D5DB] text-[#1F2937]">
          {inst.status}
        </span>
      ),
    },
    {
      key: "action",
      header: "Action",
      align: "right",
      render: (inst) => (
        <Link
          href={`/institutions/${inst.id}`}
          className="font-semibold text-[#C2410C] hover:underline whitespace-nowrap text-[13px]"
        >
          View Profile &rarr;
        </Link>
      ),
    },
  ];

  const northernCount = institutions.filter((i) => i.region === "Northern").length;
  const southernCount = institutions.filter((i) => i.region === "Southern").length;
  const westernCount = institutions.filter((i) => i.region === "Western").length;
  const otherCount = institutions.length - (northernCount + southernCount + westernCount);

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />

        <main className="p-8 space-y-8 max-w-[1280px] w-full mx-auto overflow-y-auto">
          {/* 1. Unified PageHeader */}
          <PageHeader
            title="AICTE Approved Institutions"
            description="Official directory of approved technical institutions, cross-bureau grievance logs, and overlap status."
          />

          {/* 2. KPI / Summary Row: Equal height 96px */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <KpiCard
              label="Total Registered"
              value={institutions.length}
              icon={<Building2 className="w-4 h-4" />}
            />
            <KpiCard
              label="Northern Region"
              value={northernCount}
              icon={<MapPin className="w-4 h-4" />}
            />
            <KpiCard
              label="Southern Region"
              value={southernCount}
              icon={<MapPin className="w-4 h-4" />}
            />
            <KpiCard
              label="Western Region"
              value={westernCount}
              icon={<MapPin className="w-4 h-4" />}
            />
            <KpiCard
              label="Central & Eastern"
              value={otherCount}
              icon={<MapPin className="w-4 h-4" />}
            />
          </div>

          {/* 3. Main Content: FilterBar + DataTable */}
          <div className="space-y-4">
            <div className="p-4 bg-white border border-[#FED7AA] rounded-[8px]">
              <FilterBar
                filters={filterItems}
                onReset={handleResetFilters}
                maxVisible={4}
              />
            </div>

            <DataTable
              columns={columns}
              data={institutions}
              keyExtractor={(inst) => inst.id}
              emptyMessage={loading ? "Loading directory..." : "No institutions found matching criteria."}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
