"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("casetrack_token");
    if (token) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-white text-[#1F2937]">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-[#C2410C] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-semibold">Redirecting to AICTE CaseTrack...</span>
      </div>
    </div>
  );
}
