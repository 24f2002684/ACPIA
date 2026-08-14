"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Radio, ToggleLeft, ToggleRight } from "lucide-react";
import { useToast } from "./ToastContext";

export default function Navbar() {
  const pathname = usePathname();
  const { addToast } = useToast();
  const [demoMode, setDemoMode] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch current Demo Mode state from backend
  useEffect(() => {
    async function fetchDemoConfig() {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/config/demo");
        if (res.ok) {
          const data = await res.json();
          setDemoMode(data.demo_mode);
        }
      } catch (err) {
        console.error("Could not fetch demo mode config:", err);
      }
    }
    fetchDemoConfig();
  }, []);

  // Handle Demo Mode Live Toggle Switch
  const toggleDemoMode = async () => {
    const nextState = !demoMode;
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/config/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demo_mode: nextState }),
      });

      if (res.ok) {
        const data = await res.json();
        setDemoMode(data.demo_mode);
        addToast(
          "info",
          `Demo Mode ${data.demo_mode ? "Enabled (ON)" : "Disabled (OFF)"}`,
          data.demo_mode
            ? "External API calls will be simulated with mock data."
            : "Live API key calls (Gemini/Vision/HuggingFace) activated."
        );
      }
    } catch (err: any) {
      addToast("error", "Failed to update Demo Mode", err.message);
    } finally {
      setLoading(false);
    }
  };

  const navLinks = [
    { href: "/", label: "Dashboard" },
    { href: "/upload", label: "Upload Evidence" },
    { href: "/analysis", label: "Analysis Pipeline" },
    { href: "/cases/case_demo_01/results", label: "Case Results" },
  ];

  return (
    <header className="border-b border-[#97BC62]/20 bg-[#1A3A2A]/90 backdrop-blur-md sticky top-0 z-50 print:hidden">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo with Shield Icon */}
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-xl bg-[#97BC62] flex items-center justify-center font-bold text-[#1A3A2A] shadow-md shadow-[#97BC62]/20 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5 text-[#1A3A2A]" />
            </div>
            <div>
              <span className="font-bold tracking-wider text-[#97BC62] text-lg">ACPIA</span>
              <span className="text-[10px] text-[#F0F5F0]/60 ml-2 border-l border-[#97BC62]/30 pl-2 font-mono uppercase">
                AI Forensics Platform
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-[#2C5F2D] text-[#97BC62] border border-[#97BC62]/40 shadow-sm"
                    : "text-[#F0F5F0]/70 hover:text-white hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Presenter Live "Demo Mode: ON/OFF" Toggle Switch */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#2C5F2D]/60 border border-[#97BC62]/30 shadow-inner">
            <Radio className={`w-3.5 h-3.5 ${demoMode ? "text-amber-400 animate-pulse" : "text-[#97BC62]"}`} />
            <span className="text-xs font-mono font-semibold text-white">
              Demo Mode: <span className={demoMode ? "text-amber-300" : "text-[#97BC62]"}>{demoMode ? "ON" : "OFF"}</span>
            </span>

            <button
              onClick={toggleDemoMode}
              disabled={loading}
              className="ml-1 text-[#97BC62] hover:text-[#A7CC72] transition-colors focus:outline-none"
              title="Toggle Live Presenter Demo Mode"
            >
              {demoMode ? (
                <ToggleRight className="w-6 h-6 text-amber-400" />
              ) : (
                <ToggleLeft className="w-6 h-6 text-emerald-500" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
