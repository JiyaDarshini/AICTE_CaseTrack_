"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, Shield, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await apiRequest<{ access_token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem("casetrack_token", data.access_token);

      // Fetch user profile
      const user = await apiRequest("/auth/me");
      localStorage.setItem("casetrack_user", JSON.stringify(user));

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid credentials or account unapproved.");
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#FFF7ED] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex p-3 bg-[#F97316] rounded-xl text-white shadow-md mb-3">
          <Landmark className="w-8 h-8" />
        </div>
        <span className="block text-xs font-bold tracking-widest uppercase text-[#C2410C]">
          All India Council for Technical Education
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-[#1F2937] mt-1">
          AICTE CaseTrack
        </h1>
        <p className="mt-1 text-xs text-[#6B7280]">
          Integrated Institution Complaint Monitoring and Status Dashboard
        </p>
      </div>

      {/* Login Card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-md rounded-[8px] border border-[#FED7AA] sm:px-10">
          {error && (
            <div className="mb-4 p-3 rounded-[6px] bg-[#FFF7ED] border border-[#C2410C] flex items-start gap-2 text-xs text-[#C2410C]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-[#1F2937]">
                Official Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@aicte.gov.in"
                className="mt-1 block w-full px-3 py-2 text-sm bg-white border border-[#FED7AA] rounded-[6px] text-[#1F2937] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#F97316]"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-[#1F2937]">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 block w-full px-3 py-2 text-sm bg-white border border-[#FED7AA] rounded-[6px] text-[#1F2937] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#F97316]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold rounded-[6px] bg-[#C2410C] text-white hover:bg-[#EA580C] shadow-sm transition-colors disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Sign In to CaseTrack"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 pt-5 border-t border-[#FED7AA]">
            <span className="block text-[11px] font-bold text-[#C2410C] uppercase tracking-wider mb-2">
              Quick Select Demo Persona (SIH Evaluation)
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDemoCredentials("admin@aicte.gov.in", "Admin@123456")}
                className="p-2 text-left rounded border border-[#FED7AA] bg-[#FFF7ED] hover:bg-[#FFEDD5] transition-colors"
              >
                <div className="font-bold text-[#1F2937]">Admin</div>
                <div className="text-[10px] text-[#6B7280]">Full System Access</div>
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials("seniormanager@aicte.gov.in", "Senior@123456")}
                className="p-2 text-left rounded border border-[#FED7AA] bg-[#FFF7ED] hover:bg-[#FFEDD5] transition-colors"
              >
                <div className="font-bold text-[#1F2937]">Senior Manager</div>
                <div className="text-[10px] text-[#6B7280]">Grievance Directorate</div>
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials("pgrc.officer@aicte.gov.in", "Pgrc@123456")}
                className="p-2 text-left rounded border border-[#FED7AA] bg-[#FFF7ED] hover:bg-[#FFEDD5] transition-colors"
              >
                <div className="font-bold text-[#1F2937]">PGRC Officer</div>
                <div className="text-[10px] text-[#6B7280]">Public Grievance Cell</div>
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials("rb.officer@aicte.gov.in", "Rb@123456")}
                className="p-2 text-left rounded border border-[#FED7AA] bg-[#FFF7ED] hover:bg-[#FFEDD5] transition-colors"
              >
                <div className="font-bold text-[#1F2937]">RB Officer</div>
                <div className="text-[10px] text-[#6B7280]">Regulation Bureau</div>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setDemoCredentials("ro.north@aicte.gov.in", "North@123456")}
              className="mt-2 w-full p-2 text-left rounded border border-[#FED7AA] bg-[#FFF7ED] hover:bg-[#FFEDD5] text-xs transition-colors"
            >
              <div className="font-bold text-[#1F2937]">Regional Officer (Northern)</div>
              <div className="text-[10px] text-[#6B7280]">Region-scoped Access (Northern Region)</div>
            </button>
          </div>

          {/* Registration link */}
          <div className="mt-4 text-center text-xs text-[#6B7280]">
            Don't have an approved account?{" "}
            <Link href="/register" className="font-bold text-[#C2410C] hover:underline">
              Register New Official
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
