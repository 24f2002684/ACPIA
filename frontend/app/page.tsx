"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Activity, CheckCircle2, XCircle, RefreshCw, Server, ShieldCheck, Cpu, ArrowUpRight, Radio, Terminal, Upload } from "lucide-react";

interface HealthData {
  status: string;
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
      // Fetch health check endpoint
      const healthRes = await fetch(`${BACKEND_URL}/api/health`, { cache: "no-store" });
      const duration = Math.round(performance.now() - startTime);
      setLatency(duration);

      if (!healthRes.ok) {
        throw new Error(`HTTP error! status: ${healthRes.status}`);
      }

      const data: HealthData = await healthRes.json();
      setHealthData(data);

      // Try fetching root info as well
      try {
        const rootRes = await fetch(`${BACKEND_URL}/`, { cache: "no-store" });
        if (rootRes.ok) {
          const rData = await rootRes.json();
          setRootData(rData);
        }
      } catch {
        // Root endpoint fetch is optional fallback
      }

      const now = new Date();
      setLastCheckTime(now.toLocaleTimeString());
      setCurrentIsoTimestamp(now.toISOString());
    } catch (err: any) {
      console.error("Health check failed:", err);
      setError(err.message || "Failed to connect to FastAPI backend server");
      setHealthData(null);
      setLatency(null);
      const now = new Date();
      setLastCheckTime(now.toLocaleTimeString());
      setCurrentIsoTimestamp(now.toISOString());
    } finally {
      setLoading(false);
    }
  }, [BACKEND_URL]);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  // Auto ping every 10 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchHealth();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchHealth]);

  const isConnected = healthData?.status === "ok";

  return (
    <main className="min-h-screen bg-[#1A3A2A] text-[#E6F0EA] flex flex-col justify-between p-4 sm:p-8 md:p-12 relative overflow-hidden">
      {/* Background Decorative Grids & Light Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#97BC62]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#97BC62]/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Header Bar */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between py-4 border-b border-[#2D5941] mb-8 relative z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#234935] border border-[#97BC62]/40 flex items-center justify-center shadow-lg shadow-[#97BC62]/10">
            <Cpu className="w-5 h-5 text-[#97BC62]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-xl tracking-tight text-white">ACPIA</h1>
              <span className="text-[10px] font-mono uppercase bg-[#234935] text-[#97BC62] px-2 py-0.5 rounded-md border border-[#97BC62]/30">
                v1.0.0
              </span>
            </div>
            <p className="text-xs text-[#A3C2B0]">FastAPI + Next.js Full-Stack Application</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/upload"
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-[#97BC62] hover:bg-[#A7CC72] text-[#132B1F] font-bold text-xs transition-all shadow-md shadow-[#97BC62]/20"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Evidence</span>
          </Link>

          {/* Status Badge */}
          <div
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              isConnected
                ? "bg-[#132B1F] text-[#97BC62] border-[#97BC62]/50 shadow-[0_0_15px_rgba(151,188,98,0.2)]"
                : error
                ? "bg-red-950/60 text-red-400 border-red-800/60"
                : "bg-[#234935] text-[#A3C2B0] border-[#2D5941]"
            }`}
          >
            {isConnected ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#97BC62] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#97BC62]"></span>
                </span>
                <span>Backend Online</span>
              </>
            ) : error ? (
              <>
                <XCircle className="w-3.5 h-3.5 text-red-400" />
                <span>Disconnected</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#97BC62]" />
                <span>Checking...</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col justify-center my-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Health Status Card (Main Feature) */}
          <div className="md:col-span-2 bg-[#132B1F]/90 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-[#2D5941] shadow-2xl relative flex flex-col justify-between overflow-hidden group hover:border-[#97BC62]/50 transition-all duration-300">
            {/* Glowing Accent Top Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#97BC62] to-transparent opacity-70" />

            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-[#A3C2B0]">
                  <Activity className="w-4 h-4 text-[#97BC62]" />
                  <span>API Health Check Endpoint</span>
                </div>
                <span className="text-xs font-mono text-[#A3C2B0]/80">GET /api/health</span>
              </div>

              {/* Big Status Display */}
              <div className="my-4 p-6 rounded-xl bg-[#1A3A2A]/80 border border-[#2D5941] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  {isConnected ? (
                    <div className="w-14 h-14 rounded-2xl bg-[#97BC62]/10 border border-[#97BC62]/40 flex items-center justify-center text-[#97BC62] shadow-[0_0_20px_rgba(151,188,98,0.25)]">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-red-950/40 border border-red-800/40 flex items-center justify-center text-red-400">
                      <XCircle className="w-8 h-8" />
                    </div>
                  )}

                  <div>
                    <span className="text-xs font-medium text-[#A3C2B0] uppercase tracking-wider">Returned Payload</span>
                    <div className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
                      {isConnected ? (
                        <>
                          <span className="font-mono text-[#97BC62]">{`{"status": "${healthData?.status}"}`}</span>
                        </>
                      ) : (
                        <span className="font-mono text-red-400">Connection Failed</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Response Code & Latency */}
                {latency !== null && (
                  <div className="flex sm:flex-col items-end justify-between border-t sm:border-t-0 sm:border-l border-[#2D5941] sm:pl-4 pt-3 sm:pt-0">
                    <div className="text-right">
                      <span className="text-[10px] text-[#A3C2B0] uppercase font-mono">Response Time</span>
                      <p className="text-lg font-mono font-bold text-[#97BC62]">{latency} ms</p>
                    </div>
                    <div className="text-right mt-1">
                      <span className="text-[10px] text-[#97BC62] bg-[#97BC62]/10 px-2 py-0.5 rounded font-mono">
                        HTTP 200 OK
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Error Message if Disconnected */}
              {error && (
                <div className="mt-4 p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs font-mono">
                  <p className="font-bold mb-1">Error details:</p>
                  <p>{error}</p>
                  <p className="mt-2 text-[11px] text-red-400/80">
                    Ensure FastAPI backend server is running on <code className="bg-red-900/40 px-1 rounded">{BACKEND_URL}</code>
                  </p>
                </div>
              )}
            </div>

            {/* Actions Bar */}
            <div className="mt-8 pt-4 border-t border-[#2D5941]/60 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <button
                  onClick={fetchHealth}
                  disabled={loading}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#97BC62] hover:bg-[#A7CC72] active:bg-[#7A9E48] text-[#132B1F] font-bold text-xs tracking-wide transition-all shadow-lg shadow-[#97BC62]/20 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                  <span>{loading ? "Ping Backend..." : "Test Health Check"}</span>
                </button>

                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`px-3 py-2 rounded-xl text-xs font-mono border transition-all flex items-center space-x-1.5 cursor-pointer ${
                    autoRefresh
                      ? "bg-[#234935] text-[#97BC62] border-[#97BC62]/40"
                      : "bg-[#1A3A2A] text-[#A3C2B0] border-[#2D5941]"
                  }`}
                >
                  <Radio className={`w-3.5 h-3.5 ${autoRefresh ? "text-[#97BC62] animate-pulse" : ""}`} />
                  <span>Auto-refresh {autoRefresh ? "ON (10s)" : "OFF"}</span>
                </button>
              </div>

              <div className="text-xs text-[#A3C2B0] font-mono" suppressHydrationWarning>
                Last pinged: {mounted ? (lastCheckTime || "Never") : "Initializing..."}
              </div>
            </div>
          </div>

          {/* System Specs & Server Configuration Side Card */}
          <div className="bg-[#132B1F]/90 backdrop-blur-md rounded-2xl p-6 border border-[#2D5941] shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-[#A3C2B0] mb-4">
                <Server className="w-4 h-4 text-[#97BC62]" />
                <span>Backend Config</span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 rounded-lg bg-[#1A3A2A] border border-[#2D5941]">
                  <div className="text-[10px] text-[#A3C2B0] uppercase">Target Endpoint</div>
                  <div className="text-white font-bold truncate mt-0.5 flex items-center justify-between">
                    <span>{BACKEND_URL}/api/health</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#97BC62]" />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#1A3A2A] border border-[#2D5941]">
                  <div className="text-[10px] text-[#A3C2B0] uppercase">Framework</div>
                  <div className="text-[#97BC62] font-bold mt-0.5">FastAPI (Python 3.11+)</div>
                </div>

                <div className="p-3 rounded-lg bg-[#1A3A2A] border border-[#2D5941]">
                  <div className="text-[10px] text-[#A3C2B0] uppercase">CORS Origin</div>
                  <div className="text-white font-bold mt-0.5">Enabled (Allowed)</div>
                </div>

                {rootData && (
                  <div className="p-3 rounded-lg bg-[#1A3A2A] border border-[#97BC62]/30">
                    <div className="text-[10px] text-[#97BC62] uppercase font-bold">Root Info</div>
                    <div className="text-xs text-[#E6F0EA] mt-1 space-y-0.5">
                      <div>Name: {rootData.name}</div>
                      <div>Status: {rootData.status}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#2D5941] flex items-center justify-between text-[11px] text-[#A3C2B0]">
              <div className="flex items-center space-x-1">
                <ShieldCheck className="w-4 h-4 text-[#97BC62]" />
                <span>CORS Ready</span>
              </div>
              <div className="flex items-center space-x-1 font-mono">
                <Terminal className="w-3.5 h-3.5" />
                <span>uvicorn</span>
              </div>
            </div>
          </div>

        </div>

        {/* Payload JSON Inspector Section */}
        <div className="mt-6 bg-[#132B1F]/60 rounded-2xl p-6 border border-[#2D5941]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono uppercase tracking-wider text-[#A3C2B0]">
              Raw Response Inspector
            </span>
            <span className="text-[11px] font-mono text-[#97BC62]">application/json</span>
          </div>

          <div className="bg-[#0D1C14] p-4 rounded-xl border border-[#2D5941] font-mono text-xs text-[#97BC62] overflow-x-auto">
            <pre suppressHydrationWarning>
              {JSON.stringify(
                {
                  endpoint: `${BACKEND_URL}/api/health`,
                  connected: isConnected,
                  status_code: isConnected ? 200 : error ? 500 : "checking",
                  response_body: healthData || { error: error || "Waiting for server response..." },
                  latency_ms: latency,
                  timestamp: mounted ? (currentIsoTimestamp || "pending") : "initializing",
                },
                null,
                2
              )}
            </pre>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full text-center py-4 border-t border-[#2D5941]/50 text-xs text-[#A3C2B0] relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>ACPIA Full-Stack Boilerplate &bull; FastAPI + Next.js 14</div>
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-[#97BC62]" />
          <span>Base Design Theme: Dark Forest Green (#1A3A2A / #97BC62)</span>
        </div>
      </footer>
    </main>
  );
}
