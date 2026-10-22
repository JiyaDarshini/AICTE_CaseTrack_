"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, AlertCircle, ArrowRight } from "lucide-react";
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

  return (
    <div
      className="relative min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: "url('/aicte-bg.jpg')" }}
    >
      {/* Dark gradient overlay for optimal readability, contrast & scenic balance */}
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] pointer-events-none" />

      <div className="relative z-10 w-full">
        {/* Header */}
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="inline-flex p-3 bg-[#C2410C] rounded-[10px] text-white mb-3 shadow-lg ring-2 ring-white/30">
            <Landmark className="w-8 h-8" />
          </div>
          <h1 className="text-[30px] font-bold text-white tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-[1.3] m-0">
            AICTE CaseTrack
          </h1>
          <p className="mt-1.5 text-[15px] font-medium text-white/95 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] leading-[1.4] m-0">
            Integrated Institution Complaint Monitoring and Status Dashboard
          </p>
        </div>

        {/* Login Card */}
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white/95 backdrop-blur-md p-6 sm:p-8 rounded-[12px] border border-[#FED7AA] shadow-[0_20px_50px_rgba(0,0,0,0.35)] space-y-6">
            {error && (
              <div className="p-3 rounded-[8px] bg-white border border-[#C2410C] flex items-start gap-2 text-[14px] text-[#C2410C]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-[13px] font-semibold text-[#1F2937] mb-1">
                Official Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@aicte.gov.in"
                className="w-full h-[38px] px-3 text-[14px] bg-white border border-[#FED7AA] rounded-[8px] text-[#1F2937] placeholder-[#6B7280] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[13px] font-semibold text-[#1F2937] mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-[38px] px-3 text-[14px] bg-white border border-[#FED7AA] rounded-[8px] text-[#1F2937] placeholder-[#6B7280] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-[14px] font-semibold rounded-[8px] bg-[#C2410C] text-white hover:bg-[#EA580C] transition-colors disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Sign In to CaseTrack"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Registration link */}
          <div className="text-center text-[13px] text-[#6B7280]">
            Don't have an approved account?{" "}
            <Link href="/register" className="font-semibold text-[#C2410C] hover:underline">
              Register New Official
            </Link>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}
