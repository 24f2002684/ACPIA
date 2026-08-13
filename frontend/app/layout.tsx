import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "../components/ToastContext";
import Navbar from "../components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ACPIA | Multi-Agent AI Forensics System",
  description: "ACPIA FastAPI + Next.js full-stack multi-agent forensic analysis platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[#1A3A2A] text-[#E6F0EA] selection:bg-[#97BC62] selection:text-[#132B1F]" suppressHydrationWarning>
        <ToastProvider>
          <Navbar />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
