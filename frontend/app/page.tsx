"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Activity, CheckCircle2, XCircle, RefreshCw, Server, ShieldCheck, Cpu, ArrowUpRight, Radio, Upload, Play, FolderPlus } from "lucide-react";
import PageTransition from "../components/PageTransition";

interface HealthData {
  status: string;
  demo_mode?: boolean;
}

interface RootData {
  name: string;
  version: string;
  status: string;
  timestamp: string;
}

export default function Home() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [rootData, setRootData] = useState<RootData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<string>("");
  const [currentIsoTimestamp, setCurrentIsoTimestamp] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    const startTime = performance.now();

    try {
      const healthRes = await fetch(`${BACKEND_URL}/api/health`, { cache: "no-store" });
      const duration = Math.round(performance.now() - startTime);
      setLatency(duration);

      if (!healthRes.ok) {
        throw new Error(`HTTP error! status: ${healthRes.status}`);
      }

      const data: HealthData = await healthRes.json();
      setHealthData(data);

      try {
        const rootRes = await fetch(`${BACKEND_URL}/`, { cache: "no-store" });
        if (rootRes.ok) {
          const rData = await rootRes.json();
          setRootData(rData);
        }
      } catch {
        // Fallback root data
      }

      setLastCheckTime(new Date().toLocaleTimeString());
      setCurrentIsoTimestamp(new Date().toISOString());
    } catch (err: any) {
      setError(err.message || "Failed to connect to backend");
      setHealthData(null);
      setRootData(null);
    } finally {
      setLoading(false);
    }
  }, [BACKEND_URL]);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchHealth();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchHealth]);

  return (
    <PageTransition>
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
        {/* Pitch Deck Title Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 pitch-card border-[#97BC62]/30">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-[#97BC62]/20 border border-[#97BC62]/40 flex items-center justify-center text-[#97BC62]">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#97BC62]/20 text-[#97BC62] text-[11px] font-mono mb-1">
                Multi-Agent AI Forensics
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#F0F5F0]">ACPIA Intelligence Control Panel</h1>
              <p className="text-xs text-[#F0F5F0]/70 mt-0.5">
                FastAPI + Next.js full-stack autonomous evidence correlation & executive reporting engine.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/upload"
              className="px-4 py-2.5 rounded-xl bg-[#97BC62] text-[#1A3A2A] font-bold text-xs flex items-center gap-2 hover:bg-[#85a854] transition-all shadow-md shadow-[#97BC62]/20"
            >
              <Upload className="w-4 h-4" />
              Upload Evidence
            </Link>
            <Link
              href="/analysis"
              className="px-4 py-2.5 rounded-xl bg-[#2C5F2D] text-white border border-[#97BC62]/40 font-bold text-xs flex items-center gap-2 hover:bg-[#97BC62]/20 transition-all"
            >
              <Play className="w-4 h-4 text-[#97BC62]" />
              Run Pipeline
            </Link>
          </div>
        </div>

        {/* Top Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Health Status Card */}
          <div className="p-6 pitch-card pitch-card-hover flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono text-[#97BC62] uppercase tracking-wider">Health Status</span>
              <div className="w-2.5 h-2.5 rounded-full bg-[#97BC62] animate-ping" />
            </div>
            <div className="flex items-center space-x-3 mb-2">
              {healthData?.status === "ok" ? (
                <CheckCircle2 className="w-8 h-8 text-[#97BC62]" />
              ) : (
                <XCircle className="w-8 h-8 text-red-400" />
              )}
              <div>
                <h3 className="text-xl font-bold">{healthData?.status === "ok" ? "ONLINE" : "OFFLINE"}</h3>
                <span className="text-[11px] font-mono text-[#F0F5F0]/60">HTTP 200 GET /api/health</span>
              </div>
            </div>
            <div className="text-[11px] text-[#F0F5F0]/60 font-mono mt-2 pt-2 border-t border-white/5 flex justify-between">
              <span>Latency:</span>
              <span className="text-[#97BC62] font-bold">{latency ? `${latency} ms` : "--"}</span>
            </div>
          </div>

          {/* Core Framework Card */}
          <div className="p-6 pitch-card pitch-card-hover flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono text-[#97BC62] uppercase tracking-wider">Backend Architecture</span>
              <Server className="w-4 h-4 text-[#97BC62]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">FastAPI (Python 3.11+)</h3>
              <p className="text-xs text-[#F0F5F0]/70 mt-1">SQLite Persistence & Pydantic Validation</p>
            </div>
            <div className="text-[11px] text-[#F0F5F0]/60 font-mono mt-2 pt-2 border-t border-white/5 flex justify-between">
              <span>Status:</span>
              <span className="text-[#97BC62]">CORS & Swagger Ready</span>
            </div>
          </div>

          {/* AI Orchestration Card */}
          <div className="p-6 pitch-card pitch-card-hover flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono text-[#97BC62] uppercase tracking-wider">AI Pipeline</span>
              <Cpu className="w-4 h-4 text-[#97BC62]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">6 Multi-Agent Engine</h3>
              <p className="text-xs text-[#F0F5F0]/70 mt-1">Gemini, Claude, Vision & HuggingFace</p>
            </div>
            <div className="text-[11px] text-[#F0F5F0]/60 font-mono mt-2 pt-2 border-t border-white/5 flex justify-between">
              <span>Validation:</span>
              <span className="text-[#97BC62]">Contradiction Verification</span>
            </div>
          </div>
        </div>

        {/* Live System Diagnostics Box */}
        <div className="p-6 pitch-card border-[#97BC62]/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#97BC62]" />
              Live Backend System Diagnostics
            </h3>
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-[#2C5F2D] text-xs font-semibold text-[#97BC62] border border-[#97BC62]/30 hover:bg-[#97BC62]/20 transition-all flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          <div className="bg-[#1A3A2A]/80 p-4 rounded-xl font-mono text-xs text-[#97BC62] border border-[#97BC62]/20 shadow-inner overflow-x-auto">
            <pre>
              {JSON.stringify(
                {
                  endpoint: `${BACKEND_URL}/api/health`,
                  connected: !error,
                  status_code: error ? 500 : 200,
                  health_payload: healthData,
                  root_payload: rootData,
                  latency_ms: latency,
                  last_ping: lastCheckTime,
                },
                null,
                2
              )}
            </pre>
          </div>
        </div>
      </main>
    </PageTransition>
  );
}
