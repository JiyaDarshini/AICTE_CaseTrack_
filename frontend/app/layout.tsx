import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AICTE CaseTrack — Institution Complaint & Overlap Monitoring Dashboard",
  description:
    "Integrated Institution Complaint Monitoring and Status Dashboard for AICTE Bureaus and Cells (Regulation Bureau, PGRC, Approval Bureau)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-[#1F2937] antialiased selection:bg-[#FED7AA] selection:text-[#C2410C]">
        {children}
      </body>
    </html>
  );
}
