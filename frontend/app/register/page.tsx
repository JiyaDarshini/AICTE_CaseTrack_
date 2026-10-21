"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("PGRC");
  const [region, setRegion] = useState("Northern");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          region: role === "Regional Office" ? region : null,
        }),
      });

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to submit registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF7ED] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex p-3 bg-[#F97316] rounded-xl text-white shadow-md mb-3">
          <Landmark className="w-8 h-8" />
        </div>
        <span className="block text-xs font-bold tracking-widest uppercase text-[#C2410C]">
          All India Council for Technical Education
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-[#1F2937] mt-1">
          Official Registration
        </h1>
        <p className="mt-1 text-xs text-[#6B7280]">
          Requests are reviewed and approved by System Administrators
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-md rounded-[8px] border border-[#FED7AA] sm:px-10">
          {success ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#FFF7ED] text-[#C2410C] flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-[#1F2937]">Registration Submitted</h2>
              <p className="text-xs text-[#6B7280]">
                Your account for <strong className="text-[#1F2937]">{email}</strong> has been created with role <strong className="text-[#1F2937]">{role}</strong> and is currently awaiting Admin approval.
              </p>
              <Link
                href="/login"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-[6px] bg-[#C2410C] text-white hover:bg-[#EA580C] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Return to Sign In
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 rounded-[6px] bg-[#FFF7ED] border border-[#C2410C] flex items-start gap-2 text-xs text-[#C2410C]">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form className="space-y-4" onSubmit={handleRegister}>
                <div>
                  <label htmlFor="name" className="block text-xs font-bold text-[#1F2937]">
                    Full Name & Designation
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dr. Rajesh Sharma"
                    className="mt-1 block w-full px-3 py-2 text-sm bg-white border border-[#FED7AA] rounded-[6px] text-[#1F2937] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                  />
                </div>

                <div>
                  <label htmlFor="reg-email" className="block text-xs font-bold text-[#1F2937]">
                    Official Email Address
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="r.sharma@aicte.gov.in"
                    className="mt-1 block w-full px-3 py-2 text-sm bg-white border border-[#FED7AA] rounded-[6px] text-[#1F2937] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                  />
                </div>

                <div>
                  <label htmlFor="reg-pwd" className="block text-xs font-bold text-[#1F2937]">
                    Password
                  </label>
                  <input
                    id="reg-pwd"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="mt-1 block w-full px-3 py-2 text-sm bg-white border border-[#FED7AA] rounded-[6px] text-[#1F2937] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                  />
                </div>

                <div>
                  <label htmlFor="role" className="block text-xs font-bold text-[#1F2937]">
                    AICTE Cell / Bureau Role
                  </label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 text-sm bg-white border border-[#FED7AA] rounded-[6px] text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                  >
                    <option value="PGRC">Public Grievance Redressal Cell (PGRC)</option>
                    <option value="RB">Regulation Bureau (RB)</option>
                    <option value="Senior Manager">Senior Manager / Grievance Director</option>
                    <option value="Regional Office">Regional Office (RO)</option>
                  </select>
                </div>

                {role === "Regional Office" && (
                  <div>
                    <label htmlFor="region" className="block text-xs font-bold text-[#1F2937]">
                      Assigned AICTE Region
                    </label>
                    <select
                      id="region"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 text-sm bg-white border border-[#FED7AA] rounded-[6px] text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    >
                      <option value="Northern">Northern Region</option>
                      <option value="Southern">Southern Region</option>
                      <option value="Western">Western Region</option>
                      <option value="Eastern">Eastern Region</option>
                      <option value="Central">Central Region</option>
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold rounded-[6px] bg-[#C2410C] text-white hover:bg-[#EA580C] shadow-sm transition-colors disabled:opacity-50"
                >
                  {loading ? "Submitting..." : "Submit Registration Request"}
                </button>

                <div className="text-center pt-2">
                  <Link href="/login" className="text-xs text-[#6B7280] hover:text-[#C2410C]">
                    Already registered? Sign in
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
