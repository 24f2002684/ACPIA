"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ShieldCheck,
  FileText,
  GitMerge,
  Calendar,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();

  const rawCaseId = params?.caseId;
  const caseId = (Array.isArray(rawCaseId) ? rawCaseId[0] : rawCaseId) || "case_demo_01";

  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCaseData() {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/cases/${caseId}`);
        if (res.ok) {
          const data = await res.json();
          setCaseData(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadCaseData();
  }, [caseId]);

  const agentResults = caseData?.agent_results || {};

  return (
    <div className="min-h-screen bg-[#1A3A2A] text-white selection:bg-[#97BC62] selection:text-[#1A3A2A]">
      <header className="border-b border-[#97BC62]/20 bg-[#0D1F16]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#97BC62] flex items-center justify-center font-bold text-[#1A3A2A] shadow-md">
              A
            </div>
            <div>
              <span className="font-semibold tracking-wider text-[#97BC62]">ACPIA</span>
              <span className="text-xs text-emerald-300/60 ml-2 border-l border-emerald-500/30 pl-2">
                Forensic Analysis Results
              </span>
            </div>
          </div>

          <button
            onClick={() => router.push(`/cases/${caseId}/analysis`)}
            className="text-xs bg-[#11261C] border border-[#97BC62]/30 text-emerald-300 px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-[#97BC62]/10 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Pipeline
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#97BC62]/20 border border-[#97BC62]/30 text-xs font-mono text-[#97BC62] mb-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Analysis Completed
            </div>
            <h1 className="text-3xl font-bold">Case Forensic Report</h1>
            <p className="text-sm text-emerald-200/70 mt-1">
              Case Reference ID: <span className="font-mono text-white font-bold">{caseId}</span>
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-emerald-300/60 font-mono">Loading case findings...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Content Analysis Card */}
            <div className="p-6 rounded-2xl bg-[#11261C] border border-[#97BC62]/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#97BC62]" />
                  Content Analysis
                </h3>
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                  Risk: {agentResults.content_analysis?.overall_risk_level || "Low"}
                </span>
              </div>
              <p className="text-xs text-emerald-200/70 mb-3">
                Analyzed {agentResults.content_analysis?.analyzed_items_count || 0} evidence items for threat classification.
              </p>
              <pre className="p-3 rounded-lg bg-[#0D1F16] text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-40">
                {JSON.stringify(agentResults.content_analysis?.item_results || [], null, 2)}
              </pre>
            </div>

            {/* Validator Agent Card */}
            <div className="p-6 rounded-2xl bg-[#11261C] border border-[#97BC62]/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#97BC62]" />
                  Validation Verdict
                </h3>
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-[#97BC62]/20 text-[#97BC62] border border-[#97BC62]/30 uppercase">
                  {agentResults.validation?.validated ? "PASSED" : "HUMAN REVIEW"}
                </span>
              </div>
              <p className="text-xs text-emerald-200/70 mb-3">
                Cross-validated findings across all 5 prior agent steps for logical consistency.
              </p>
              <div className="p-3 rounded-lg bg-[#0D1F16] text-xs font-mono text-emerald-300 space-y-2">
                <div>Human Review Flags: {agentResults.validation?.total_flags || 0}</div>
                <div>Contradictions: {agentResults.validation?.total_contradictions || 0}</div>
              </div>
            </div>

            {/* Correlation Graph Card */}
            <div className="p-6 rounded-2xl bg-[#11261C] border border-[#97BC62]/20 md:col-span-2">
              <h3 className="font-bold text-white flex items-center gap-2 mb-4">
                <GitMerge className="w-5 h-5 text-[#97BC62]" />
                Intelligence Graph & Correlation Edges
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(agentResults.correlation?.edges || []).map((edge: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl bg-[#0D1F16] border border-white/5 text-xs">
                    <div className="font-semibold text-white">{edge.from} → {edge.to}</div>
                    <div className="text-emerald-400/70 text-[11px] mt-1">{edge.relationship_type}</div>
                    <div className="text-emerald-300/50 text-[10px] mt-1">Confidence: {(edge.confidence * 100).toFixed(0)}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
