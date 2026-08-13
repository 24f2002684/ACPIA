"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  CheckCircle2,
  Loader2,
  XCircle,
  Clock,
  Shield,
  FileText,
  GitMerge,
  Calendar,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  AlertTriangle
} from "lucide-react";

interface AgentStepDef {
  id: string;
  name: string;
  subtitle: string;
  icon: React.ElementType;
}

const AGENT_STEPS: AgentStepDef[] = [
  {
    id: "content_analysis",
    name: "Content Analysis",
    subtitle: "Classifies risk level, threats, categories, and reasoning via LLM & SafeSearch",
    icon: FileText,
  },
  {
    id: "metadata_extraction",
    name: "Metadata Extraction",
    subtitle: "Extracts EXIF metadata, device IDs, locations, and entity references",
    icon: Shield,
  },
  {
    id: "correlation",
    name: "Correlation Engine",
    subtitle: "Maps entity relationships and generates NetworkX intelligence graph",
    icon: GitMerge,
  },
  {
    id: "timeline_reconstruction",
    name: "Timeline Reconstruction",
    subtitle: "Chronologically orders evidence events into one-line summaries",
    icon: Calendar,
  },
  {
    id: "synthetic_detection",
    name: "Synthetic Detection",
    subtitle: "Analyzes image media for deepfakes using Hugging Face inference models",
    icon: Sparkles,
  },
  {
    id: "validation",
    name: "Validator Agent",
    subtitle: "Cross-validates findings, flags low confidence (<0.6), & scans contradictions",
    icon: ShieldCheck,
  },
];

export default function AnalysisComponent() {
  const router = useRouter();
  const params = useParams();

  // Extract caseId from params or default to case_demo_01
  const rawCaseId = params?.caseId;
  const caseId = (Array.isArray(rawCaseId) ? rawCaseId[0] : rawCaseId) || "case_demo_01";

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressPct, setProgressPct] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<string>("pending");
  const [caseStatus, setCaseStatus] = useState<string>("pending");
  const [agentResults, setAgentResults] = useState<Record<string, any>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Poll progress from backend every 1.5s
  const fetchProgress = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/cases/${caseId}/progress`, {
        cache: "no-store",
      });
      if (!res.ok) return;

      const data = await res.json();
      setProgressPct(data.progress_pct || 0);
      setCurrentStep(data.latest_step || "pending");
      setCaseStatus(data.case_status || "pending");
      if (data.agent_results) {
        setAgentResults(data.agent_results);
      }

      // Check if finished
      if (
        data.progress_pct >= 100 ||
        data.case_status === "completed" ||
        data.case_status === "completed_with_errors" ||
        data.latest_step === "pipeline_finish"
      ) {
        setIsAnalyzing(false);
        setIsFinished(true);
        if (pollRef.current) clearInterval(pollRef.current);

        // Auto-navigate to results page after 1.5s delay for smooth UI completion transition
        setTimeout(() => {
          router.push(`/cases/${caseId}/results`);
        }, 1500);
      }
    } catch (err: any) {
      console.error("Polling error:", err);
    }
  };

  // Trigger analysis pipeline
  const handleRunAnalysis = async () => {
    setErrorMessage(null);
    setIsAnalyzing(true);
    setIsFinished(false);
    setProgressPct(0);
    setCurrentStep("content_analysis");

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/cases/${caseId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        throw new Error(`Failed to initiate analysis pipeline (HTTP ${res.status})`);
      }

      // Start 1.5s polling loop
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(fetchProgress, 1500);
      // Fetch immediately
      fetchProgress();
    } catch (err: any) {
      setErrorMessage(err.message || "Could not connect to backend server");
      setIsAnalyzing(false);
    }
  };

  // Initial check on mount
  useEffect(() => {
    fetchProgress();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [caseId]);

  // Determine state of an agent node
  const getStepState = (stepId: string, index: number) => {
    const result = agentResults[stepId];
    if (result) {
      if (result.status === "failed" || result.error) return "failed";
      if (result.status === "completed") return "completed";
    }

    if (currentStep === stepId) {
      return "running";
    }

    // Check progress index sequence
    const activeIndex = AGENT_STEPS.findIndex((s) => s.id === currentStep);
    if (activeIndex > index) return "completed";
    if (isFinished) return "completed";

    return "pending";
  };

  return (
    <div className="min-h-screen bg-[#1A3A2A] text-white selection:bg-[#97BC62] selection:text-[#1A3A2A]">
      {/* Header Bar */}
      <header className="border-b border-[#97BC62]/20 bg-[#0D1F16]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#97BC62] flex items-center justify-center font-bold text-[#1A3A2A] shadow-md shadow-[#97BC62]/20">
              A
            </div>
            <div>
              <span className="font-semibold tracking-wider text-[#97BC62]">ACPIA</span>
              <span className="text-xs text-emerald-300/60 ml-2 border-l border-emerald-500/30 pl-2">
                Multi-Agent Forensics
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="px-3 py-1 rounded-full bg-[#11261C] border border-[#97BC62]/30 text-xs font-mono text-emerald-300">
              Case ID: <span className="text-white font-bold">{caseId}</span>
            </div>
            <button
              onClick={() => router.push(`/cases/${caseId}/upload`)}
              className="text-xs text-emerald-300/80 hover:text-white transition-colors"
            >
              Upload Evidence
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Page Title & Hero */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              Automated Forensic Pipeline
              {isAnalyzing && (
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
              )}
            </h1>
            <p className="text-sm text-emerald-200/70 mt-1">
              Sequential 6-Agent AI Orchestrator with real-time state synchronization
            </p>
          </div>

          <button
            onClick={handleRunAnalysis}
            disabled={isAnalyzing}
            className={`px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg transition-all transform active:scale-95 ${
              isAnalyzing
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-wait"
                : isFinished
                ? "bg-[#97BC62] text-[#1A3A2A] hover:bg-[#85a854] shadow-[#97BC62]/20"
                : "bg-[#97BC62] text-[#1A3A2A] hover:bg-[#85a854] shadow-[#97BC62]/30"
            }`}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing Pipeline...
              </>
            ) : isFinished ? (
              <>
                <RefreshCw className="w-5 h-5" />
                Re-Run Analysis
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                Run Analysis
              </>
            )}
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 rounded-xl bg-red-950/60 border border-red-500/40 flex items-center gap-3 text-red-200 text-sm"
          >
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </motion.div>
        )}

        {/* Progress Bar Container */}
        <div className="mb-10 p-6 rounded-2xl bg-[#11261C] border border-[#97BC62]/20 shadow-xl">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
              Orchestrator Progress
            </span>
            <span className="text-sm font-mono font-bold text-[#97BC62]">
              {Math.round(progressPct)}%
            </span>
          </div>

          <div className="h-3 w-full bg-[#0D1F16] rounded-full overflow-hidden p-0.5 border border-[#97BC62]/10">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-600 via-[#97BC62] to-emerald-400 rounded-full shadow-lg shadow-[#97BC62]/50"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ ease: "easeInOut", duration: 0.4 }}
            />
          </div>

          <div className="flex justify-between items-center mt-3 text-xs text-emerald-300/60">
            <span>Status: <strong className="text-white capitalize">{caseStatus}</strong></span>
            <span>Step: <strong className="text-[#97BC62]">{currentStep}</strong></span>
          </div>
        </div>

        {/* Vertical Pipeline Agent Nodes */}
        <div className="relative pl-6 md:pl-10 space-y-6">
          {/* Vertical Connecting Line */}
          <div className="absolute left-[1.85rem] md:left-[2.85rem] top-6 bottom-6 w-0.5 bg-[#97BC62]/20 -z-0" />

          {AGENT_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const state = getStepState(step.id, idx);
            const stepResult = agentResults[step.id];

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.08 }}
                className="relative flex items-start gap-4 md:gap-6 group"
              >
                {/* Node Status Circle Badge */}
                <div className="relative z-10 flex-shrink-0">
                  {state === "completed" && (
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#97BC62] text-[#1A3A2A] flex items-center justify-center shadow-lg shadow-[#97BC62]/40 ring-4 ring-[#1A3A2A]"
                    >
                      <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                    </motion.div>
                  )}

                  {state === "running" && (
                    <motion.div
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ repeat: Infinity, duration: 1.2 }}
                      className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-amber-500/20 border-2 border-amber-400 text-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/30 ring-4 ring-[#1A3A2A]"
                    >
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </motion.div>
                  )}

                  {state === "failed" && (
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-red-500/20 border-2 border-red-500 text-red-400 flex items-center justify-center shadow-lg shadow-red-500/30 ring-4 ring-[#1A3A2A]"
                    >
                      <XCircle className="w-6 h-6" />
                    </motion.div>
                  )}

                  {state === "pending" && (
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#11261C] border border-[#97BC62]/30 text-emerald-400/40 flex items-center justify-center ring-4 ring-[#1A3A2A]">
                      <Clock className="w-5 h-5" />
                    </div>
                  )}
                </div>

                {/* Node Detail Card */}
                <div
                  className={`flex-1 p-5 rounded-2xl border transition-all duration-300 ${
                    state === "completed"
                      ? "bg-[#11261C] border-[#97BC62]/40 shadow-md shadow-[#97BC62]/5"
                      : state === "running"
                      ? "bg-[#11261C] border-amber-400/60 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/30"
                      : state === "failed"
                      ? "bg-red-950/30 border-red-500/40"
                      : "bg-[#11261C]/50 border-white/5 opacity-70"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Icon
                        className={`w-4 h-4 ${
                          state === "completed"
                            ? "text-[#97BC62]"
                            : state === "running"
                            ? "text-amber-400"
                            : state === "failed"
                            ? "text-red-400"
                            : "text-emerald-400/50"
                        }`}
                      />
                      <h3 className="font-semibold text-base text-white">{step.name}</h3>
                    </div>

                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-medium ${
                        state === "completed"
                          ? "bg-[#97BC62]/20 text-[#97BC62] border border-[#97BC62]/30"
                          : state === "running"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-400/40 animate-pulse"
                          : state === "failed"
                          ? "bg-red-500/20 text-red-300 border border-red-500/40"
                          : "bg-white/5 text-emerald-300/50 border border-white/10"
                      }`}
                    >
                      {state.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-xs text-emerald-200/70">{step.subtitle}</p>

                  {/* Summary / Result snippet when completed */}
                  {stepResult && (
                    <AnimatePresence>
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-3 pt-3 border-t border-white/5 text-xs text-emerald-300/90 font-mono bg-[#0D1F16]/60 p-3 rounded-lg"
                      >
                        {step.id === "content_analysis" && (
                          <div className="flex items-center justify-between">
                            <span>Overall Risk: <strong className="text-amber-300 uppercase">{stepResult.overall_risk_level || "low"}</strong></span>
                            <span>Items: {stepResult.analyzed_items_count}</span>
                          </div>
                        )}

                        {step.id === "metadata_extraction" && (
                          <div className="flex items-center justify-between">
                            <span>Extracted Items: {stepResult.extracted_items_count}</span>
                            <span>Entities Found: {stepResult.total_entities_found}</span>
                          </div>
                        )}

                        {step.id === "correlation" && (
                          <div className="flex items-center justify-between">
                            <span>Graph Edges: {stepResult.total_edges}</span>
                            <span>Graph Nodes: {stepResult.total_nodes}</span>
                          </div>
                        )}

                        {step.id === "timeline_reconstruction" && (
                          <div className="flex items-center justify-between">
                            <span>Timeline Events: {stepResult.event_count}</span>
                            <span>Chronological Order: Verified</span>
                          </div>
                        )}

                        {step.id === "synthetic_detection" && (
                          <div className="flex items-center justify-between">
                            <span>Images Analyzed: {stepResult.analyzed_images_count}</span>
                            <span>Synthetic Flagged: {stepResult.synthetic_images_count}</span>
                          </div>
                        )}

                        {step.id === "validation" && (
                          <div className="flex items-center justify-between">
                            <span>Validation Result: <strong className={stepResult.validated ? "text-[#97BC62]" : "text-amber-400"}>{stepResult.validated ? "PASSED" : "HUMAN REVIEW"}</strong></span>
                            <span>Flags: {stepResult.total_flags || 0}</span>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Completion Redirect Notification */}
        {isFinished && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-10 p-6 rounded-2xl bg-[#97BC62]/20 border border-[#97BC62]/40 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-[#97BC62]" />
              <div>
                <h4 className="font-bold text-white text-base">Pipeline Analysis Complete</h4>
                <p className="text-xs text-emerald-200/80">
                  Navigating to forensic results & graph visualization...
                </p>
              </div>
            </div>

            <button
              onClick={() => router.push(`/cases/${caseId}/results`)}
              className="px-5 py-2.5 rounded-xl bg-[#97BC62] text-[#1A3A2A] font-semibold text-xs flex items-center gap-2 hover:bg-[#85a854] transition-colors"
            >
              View Full Report
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </main>
    </div>
  );
}
