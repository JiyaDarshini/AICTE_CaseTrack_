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
    <div
      className="relative min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: "url('/aicte-bg.jpg')" }}
    >
      {/* Dark gradient overlay for optimal readability, contrast & scenic balance */}
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] pointer-events-none" />

      <div className="relative z-10 w-full">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="inline-flex p-3 bg-[#C2410C] rounded-[10px] text-white mb-3 shadow-lg ring-2 ring-white/30">
            <Landmark className="w-8 h-8" />
          </div>
          <h1 className="text-[30px] font-bold text-white tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-[1.3] m-0">
            Official Account Registration
          </h1>
          <p className="mt-1.5 text-[15px] font-medium text-white/95 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] leading-[1.4] m-0">
            Account applications are reviewed and activated by System Administrators
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white/95 backdrop-blur-md p-6 sm:p-8 rounded-[12px] border border-[#FED7AA] shadow-[0_20px_50px_rgba(0,0,0,0.35)] space-y-6">
          {success ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-white border border-[#FED7AA] text-[#C2410C] flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-[18px] font-bold text-[#1F2937] leading-[1.5] m-0">
                Registration Submitted
              </h2>
              <p className="text-[14px] text-[#6B7280] leading-[1.5] m-0">
                Your account for <strong className="text-[#1F2937]">{email}</strong> has been submitted with role <strong className="text-[#1F2937]">{role}</strong> and is awaiting Admin authorization.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[14px] font-semibold rounded-[8px] bg-[#C2410C] text-white hover:bg-[#EA580C] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Sign In</span>
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3 rounded-[8px] bg-white border border-[#C2410C] flex items-start gap-2 text-[14px] text-[#C2410C]">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form className="space-y-4 text-[14px]" onSubmit={handleRegister}>
                <div>
                  <label htmlFor="name" className="block text-[13px] font-semibold text-[#1F2937] mb-1">
                    Full Name & Designation
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dr. Rajesh Sharma"
                    className="w-full h-[38px] px-3 bg-white border border-[#FED7AA] rounded-[8px] text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                  />
                </div>

                <div>
                  <label htmlFor="reg-email" className="block text-[13px] font-semibold text-[#1F2937] mb-1">
                    Official Email Address
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="r.sharma@aicte.gov.in"
                    className="w-full h-[38px] px-3 bg-white border border-[#FED7AA] rounded-[8px] text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                  />
                </div>

                <div>
                  <label htmlFor="reg-pwd" className="block text-[13px] font-semibold text-[#1F2937] mb-1">
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
                    className="w-full h-[38px] px-3 bg-white border border-[#FED7AA] rounded-[8px] text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                  />
                </div>

                <div>
                  <label htmlFor="role" className="block text-[13px] font-semibold text-[#1F2937] mb-1">
                    AICTE Cell / Bureau Role
                  </label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full h-[38px] px-3 bg-white border border-[#FED7AA] rounded-[8px] text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                  >
                    <option value="PGRC">Public Grievance Redressal Cell (PGRC)</option>
                    <option value="RB">Regulation Bureau (RB)</option>
                    <option value="AB">Approval Bureau (AB)</option>
                    <option value="PAPB">Policy & Academic Planning (PAPB)</option>
                    <option value="LC">Legal Cell (LC)</option>
                    <option value="Regional Office">Regional Office (RO)</option>
                    <option value="Senior Manager">Senior Management / Director</option>
                  </select>
                </div>

                {role === "Regional Office" && (
                  <div>
                    <label htmlFor="region" className="block text-[13px] font-semibold text-[#1F2937] mb-1">
                      Assigned Region
                    </label>
                    <select
                      id="region"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="w-full h-[38px] px-3 bg-white border border-[#FED7AA] rounded-[8px] text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
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
                  className="w-full py-2.5 px-4 text-[14px] font-semibold rounded-[8px] bg-[#C2410C] text-white hover:bg-[#EA580C] transition-colors disabled:opacity-50"
                >
                  {loading ? "Submitting Application..." : "Submit Registration Application"}
                </button>
              </form>

              <div className="text-center text-[13px] text-[#6B7280]">
                Already registered?{" "}
                <Link href="/login" className="font-semibold text-[#C2410C] hover:underline">
                  Sign in here
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  </div>
);
}
