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
import PageTransition from "../../../../components/PageTransition";

interface AgentStepDef {
  id: string;
  name: string;
  subtitle: string;
  icon: React.ElementType;
}

const AGENT_STEPS: AgentStepDef[] = [
  { id: "content_analysis", name: "Content Analysis Agent", subtitle: "Gemini / Claude risk classification & Vision API", icon: FileText },
  { id: "metadata_extraction", name: "Metadata Extraction Agent", subtitle: "Entity extraction (Person, Phone, IP, EXIF)", icon: Shield },
  { id: "correlation", name: "Correlation Agent", subtitle: "NetworkX graph generation & entity relationship mapping", icon: GitMerge },
  { id: "timeline_reconstruction", name: "Timeline Reconstruction Agent", subtitle: "Chronological event sorting & descriptions", icon: Calendar },
  { id: "synthetic_detection", name: "Synthetic Detection Agent", subtitle: "Hugging Face deepfake image analysis", icon: Sparkles },
  { id: "validation", name: "Validator Agent", subtitle: "Cross-step contradiction check & low-confidence review", icon: ShieldCheck },
];

export default function AnalysisComponent() {
  const router = useRouter();
  const params = useParams();
  const rawCaseId = params?.caseId;
  const caseId = (Array.isArray(rawCaseId) ? rawCaseId[0] : rawCaseId) || "case_demo_01";

  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [progressPct, setProgressPct] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [stepStates, setStepStates] = useState<Record<string, "pending" | "running" | "completed" | "failed">>({
    content_analysis: "pending",
    metadata_extraction: "pending",
    correlation: "pending",
    timeline_reconstruction: "pending",
    synthetic_detection: "pending",
    validation: "pending",
  });

  const [logs, setLogs] = useState<any[]>([]);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const startAnalysis = async () => {
    setAnalyzing(true);
    setProgressPct(0);
    setLogs([]);
    setStepStates({
      content_analysis: "running",
      metadata_extraction: "pending",
      correlation: "pending",
      timeline_reconstruction: "pending",
      synthetic_detection: "pending",
      validation: "pending",
    });

    try {
      await fetch(`http://127.0.0.1:8000/api/cases/${caseId}/analyze`, { method: "POST" });
    } catch (err) {
      console.error("Failed to start analysis:", err);
    }
  };

  useEffect(() => {
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/cases/${caseId}/progress`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setProgressPct(data.completion_percentage || 0);
          setLogs(data.history || []);

          if (data.agent_results) {
            const nextStates: any = {};
            AGENT_STEPS.forEach((step) => {
              const resObj = data.agent_results[step.id];
              if (resObj) {
                nextStates[step.id] = resObj.status || (resObj.error ? "failed" : "completed");
              } else {
                nextStates[step.id] = "pending";
              }
            });

            const activeStep = data.history?.slice(-1)[0]?.step;
            if (activeStep && nextStates[activeStep] !== "completed") {
              nextStates[activeStep] = "running";
              setCurrentStep(activeStep);
            }

            setStepStates(nextStates);

            if (data.completion_percentage === 100) {
              clearInterval(pollingRef.current!);
              setTimeout(() => {
                router.push(`/cases/${caseId}/results`);
              }, 1200);
            }
          }
        }
      } catch (err) {
        console.error("Polling progress error:", err);
      }
    }, 1500);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [caseId, router]);

  return (
    <PageTransition>
      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
        {/* Banner Card */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 pitch-card border-[#97BC62]/30">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-[#97BC62]/20 border border-[#97BC62]/40 flex items-center justify-center text-[#97BC62]">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#97BC62]/20 text-[#97BC62] text-[11px] font-mono mb-1">
                6-Agent Sequential Pipeline
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#F0F5F0]">Forensic Pipeline Orchestration</h1>
              <p className="text-xs text-[#F0F5F0]/70 mt-0.5">
                Case ID: <span className="font-mono text-[#97BC62] font-bold">{caseId}</span>
              </p>
            </div>
          </div>

          <button
            onClick={startAnalysis}
            disabled={analyzing && progressPct < 100}
            className="px-6 py-3 rounded-xl bg-[#97BC62] text-[#1A3A2A] font-bold text-xs flex items-center gap-2 hover:bg-[#85a854] transition-all shadow-md shadow-[#97BC62]/20 active:scale-95 disabled:opacity-50"
          >
            {analyzing && progressPct < 100 ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Pipeline Executing ({progressPct}%)...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Trigger 6-Agent Pipeline
              </>
            )}
          </button>
        </div>

        {/* Progress Bar Card */}
        <div className="p-6 pitch-card space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-[#F0F5F0]">
            <span className="text-[#97BC62] font-bold">PIPELINE EXECUTION PROGRESS</span>
            <span>{progressPct}% COMPLETE</span>
          </div>
          <div className="w-full h-3 rounded-full bg-[#1A3A2A] border border-[#97BC62]/30 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#2C5F2D] to-[#97BC62]"
              initial={{ width: "0%" }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Animated Pipeline Nodes List */}
        <div className="space-y-3">
          {AGENT_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const state = stepStates[step.id];

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                  state === "completed"
                    ? "bg-[#2C5F2D]/60 border-[#97BC62]/50 shadow-md shadow-[#97BC62]/10"
                    : state === "running"
                    ? "bg-[#2C5F2D]/90 border-amber-400/60 shadow-lg shadow-amber-500/10 animate-pulse"
                    : state === "failed"
                    ? "bg-red-950/40 border-red-500/40"
                    : "bg-[#1A3A2A]/40 border-white/5 opacity-60"
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                      state === "completed"
                        ? "bg-[#97BC62] text-[#1A3A2A]"
                        : state === "running"
                        ? "bg-amber-400 text-[#1A3A2A]"
                        : state === "failed"
                        ? "bg-red-500 text-white"
                        : "bg-white/10 text-white/50"
                    }`}
                  >
                    {state === "completed" ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : state === "running" ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : state === "failed" ? (
                      <XCircle className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center gap-2">
                      {step.name}
                      <span className="text-[10px] font-mono text-[#F0F5F0]/60">Step {idx + 1}/6</span>
                    </h4>
                    <p className="text-xs text-[#F0F5F0]/70 mt-0.5">{step.subtitle}</p>
                  </div>
                </div>

                <div className="font-mono text-xs uppercase font-bold">
                  {state === "completed" && <span className="text-[#97BC62]">Completed</span>}
                  {state === "running" && <span className="text-amber-400">Executing...</span>}
                  {state === "failed" && <span className="text-red-400">Failed</span>}
                  {state === "pending" && <span className="text-white/30">Pending</span>}
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>
    </PageTransition>
  );
}
