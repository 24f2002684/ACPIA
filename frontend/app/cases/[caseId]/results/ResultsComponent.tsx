"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import {
  ShieldCheck,
  FileText,
  GitMerge,
  Calendar,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Printer,
  FileCheck,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  RefreshCw,
  Clock,
  ShieldAlert,
  Info
} from "lucide-react";

import KnowledgeGraphComponent from "./KnowledgeGraphComponent";

export default function ResultsComponent() {
  const params = useParams();
  const router = useRouter();

  const rawCaseId = params?.caseId;
  const caseId = (Array.isArray(rawCaseId) ? rawCaseId[0] : rawCaseId) || "case_demo_01";

  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [reviewSubmitting, setReviewSubmitting] = useState<string | null>(null);
  const [reportGenerating, setReportGenerating] = useState<boolean>(false);
  const [reportText, setReportText] = useState<string | null>(null);

  // Fetch full case data
  const loadCaseData = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/cases/${caseId}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setCaseData(data);
        if (data.final_report) {
          setReportText(data.final_report);
        }
      }
    } catch (err) {
      console.error("Error loading case data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCaseData();
  }, [caseId]);

  // Handle Approve / Reject review decision
  const handleReviewDecision = async (itemId: string, decision: "approved" | "rejected") => {
    setReviewSubmitting(itemId);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/cases/${caseId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: itemId,
          decision,
          reviewer: "Forensic Investigator",
          comments: `Investigator manually ${decision} item ${itemId}.`,
        }),
      });

      if (res.ok) {
        await loadCaseData();
      }
    } catch (err) {
      console.error("Review submission error:", err);
    } finally {
      setReviewSubmitting(null);
    }
  };

  // Handle Executive Report Generation
  const handleGenerateReport = async () => {
    setReportGenerating(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/cases/${caseId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        const data = await res.json();
        setReportText(data.final_report);
        await loadCaseData();
      }
    } catch (err) {
      console.error("Report generation error:", err);
    } finally {
      setReportGenerating(false);
    }
  };

  // Print Report Handler
  const handlePrintReport = () => {
    window.print();
  };

  const agentResults = caseData?.agent_results || {};
  const humanReviews = caseData?.human_reviews || [];
  const contentRes = agentResults.content_analysis || {};
  const metaRes = agentResults.metadata_extraction || {};
  const corrRes = agentResults.correlation || {};
  const timeRes = agentResults.timeline_reconstruction || {};
  const synthRes = agentResults.synthetic_detection || {};
  const valRes = agentResults.validation || {};

  const riskLevel = (contentRes.overall_risk_level || "low").toUpperCase();
  const flagsForReview = valRes.flags_for_human_review || [];
  const contradictions = valRes.contradictions || [];

  return (
    <div className="min-h-screen bg-[#1A3A2A] text-white selection:bg-[#97BC62] selection:text-[#1A3A2A] print:bg-white print:text-black">
      {/* Header Bar */}
      <header className="border-b border-[#97BC62]/20 bg-[#0D1F16]/80 backdrop-blur-md sticky top-0 z-50 print:hidden">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#97BC62] flex items-center justify-center font-bold text-[#1A3A2A] shadow-md">
              A
            </div>
            <div>
              <span className="font-semibold tracking-wider text-[#97BC62]">ACPIA</span>
              <span className="text-xs text-emerald-300/60 ml-2 border-l border-emerald-500/30 pl-2">
                Forensic Intelligence & Findings
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/cases/${caseId}/analysis`)}
              className="text-xs bg-[#11261C] border border-[#97BC62]/30 text-emerald-300 px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-[#97BC62]/10 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Pipeline View
            </button>
            {reportText && (
              <button
                onClick={handlePrintReport}
                className="text-xs bg-[#97BC62] text-[#1A3A2A] font-bold px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-[#85a854] transition-colors shadow-md shadow-[#97BC62]/20"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Executive Report
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-6 py-10 print:p-0 print:max-w-full">
        {loading ? (
          <div className="p-16 text-center text-emerald-300/60 font-mono flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#97BC62]" />
            Loading forensic case findings...
          </div>
        ) : (
          <div className="space-y-8">
            {/* Top Bar / Title */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#97BC62]/20 border border-[#97BC62]/30 text-xs font-mono text-[#97BC62] mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Forensic Assessment Complete
                </div>
                <h1 className="text-3xl font-bold">Case Forensic Dashboard</h1>
                <p className="text-sm text-emerald-200/70 mt-1">
                  Case ID: <span className="font-mono text-white font-bold">{caseId}</span>
                </p>
              </div>

              <button
                onClick={handleGenerateReport}
                disabled={reportGenerating}
                className="px-6 py-3 rounded-xl bg-[#97BC62] text-[#1A3A2A] font-bold text-sm flex items-center gap-2 hover:bg-[#85a854] transition-all shadow-lg shadow-[#97BC62]/20 active:scale-95 disabled:opacity-50"
              >
                {reportGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" />
                    Generate Executive Report
                  </>
                )}
              </button>
            </div>

            {/* 1. Risk Summary Card Banner */}
            <div className="p-6 rounded-2xl bg-[#11261C] border border-[#97BC62]/30 shadow-xl grid grid-cols-1 md:grid-cols-4 gap-6 print:hidden">
              {/* Overall Risk Card */}
              <div className="p-4 rounded-xl bg-[#0D1F16] border border-white/5 flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl ${
                    riskLevel === "HIGH"
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : riskLevel === "MEDIUM"
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "bg-[#97BC62]/20 text-[#97BC62] border border-[#97BC62]/30"
                  }`}
                >
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-emerald-300/60 uppercase font-mono tracking-wider">Overall Risk</div>
                  <div className="text-xl font-bold text-white">{riskLevel}</div>
                </div>
              </div>

              {/* Validation Status Card */}
              <div className="p-4 rounded-xl bg-[#0D1F16] border border-white/5 flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${
                    valRes.validated
                      ? "bg-[#97BC62]/20 text-[#97BC62] border border-[#97BC62]/30"
                      : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  }`}
                >
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-emerald-300/60 uppercase font-mono tracking-wider">Validation Verdict</div>
                  <div className="text-sm font-bold text-white uppercase">
                    {valRes.validated ? "PASSED" : "HUMAN REVIEW"}
                  </div>
                </div>
              </div>

              {/* Entities Discovered Card */}
              <div className="p-4 rounded-xl bg-[#0D1F16] border border-white/5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                  <GitMerge className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-emerald-300/60 uppercase font-mono tracking-wider">Intelligence Graph</div>
                  <div className="text-xl font-bold text-white">{corrRes.total_nodes || 0} Nodes / {corrRes.total_edges || 0} Edges</div>
                </div>
              </div>

              {/* Media Authenticity Card */}
              <div className="p-4 rounded-xl bg-[#0D1F16] border border-white/5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-emerald-300/60 uppercase font-mono tracking-wider">Synthetic Detection</div>
                  <div className="text-xl font-bold text-white">{synthRes.synthetic_images_count || 0} Flagged</div>
                </div>
              </div>
            </div>

            {/* 2. Flagged Items Review Panel */}
            <div className="p-6 rounded-2xl bg-[#11261C] border border-[#97BC62]/20 shadow-xl print:hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  Mandatory Human Review Panel ({flagsForReview.length + contradictions.length})
                </h3>
                <span className="text-xs text-emerald-300/60">
                  {humanReviews.length} decisions recorded
                </span>
              </div>

              {flagsForReview.length === 0 && contradictions.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#0D1F16] text-center text-xs text-emerald-300/60 font-mono">
                  No automated flags or contradictions detected. Case meets confidence threshold (&gt;0.60).
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Low Confidence Flags */}
                  {flagsForReview.map((flag: any, idx: number) => {
                    const itemId = flag.item_id;
                    const existingReview = humanReviews.find((r: any) => r.item_id === itemId);

                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-[#0D1F16] border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono border border-amber-500/30">
                              FLAGGED ITEM
                            </span>
                            <span className="font-mono font-bold text-xs text-white">{itemId}</span>
                          </div>
                          <p className="text-xs text-emerald-200/80">{flag.reason}</p>
                          {existingReview && (
                            <div className="mt-2 text-[11px] font-mono text-emerald-400">
                              Current Status: <span className="font-bold uppercase">{existingReview.decision}</span> by {existingReview.reviewer}
                            </div>
                          )}
                        </div>

                        {/* Approve / Reject Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleReviewDecision(itemId, "approved")}
                            disabled={reviewSubmitting === itemId}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                              existingReview?.decision === "approved"
                                ? "bg-[#97BC62] text-[#1A3A2A]"
                                : "bg-[#97BC62]/20 text-[#97BC62] border border-[#97BC62]/40 hover:bg-[#97BC62]/30"
                            }`}
                          >
                            {reviewSubmitting === itemId ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <ThumbsUp className="w-3.5 h-3.5" />
                            )}
                            Approve
                          </button>

                          <button
                            onClick={() => handleReviewDecision(itemId, "rejected")}
                            disabled={reviewSubmitting === itemId}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                              existingReview?.decision === "rejected"
                                ? "bg-red-500 text-white"
                                : "bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30"
                            }`}
                          >
                            {reviewSubmitting === itemId ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <ThumbsDown className="w-3.5 h-3.5" />
                            )}
                            Reject
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Contradiction Warnings */}
                  {contradictions.map((contra: string, idx: number) => (
                    <div key={idx} className="p-4 rounded-xl bg-red-950/30 border border-red-500/30 text-xs text-red-200">
                      <div className="font-bold text-red-400 flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4" />
                        Cross-Agent Contradiction Warning
                      </div>
                      <p>{contra}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Interactive Knowledge Graph */}
            <div className="p-6 rounded-2xl bg-[#11261C] border border-[#97BC62]/20 shadow-xl print:hidden">
              <h3 className="font-bold text-white text-lg flex items-center gap-2 mb-4">
                <GitMerge className="w-5 h-5 text-[#97BC62]" />
                Interactive Correlation Knowledge Graph (react-force-graph)
              </h3>
              <KnowledgeGraphComponent
                nodes={metaRes.all_entities}
                edges={corrRes.edges}
                graphData={corrRes.graph}
              />
            </div>

            {/* 4. Timeline View */}
            <div className="p-6 rounded-2xl bg-[#11261C] border border-[#97BC62]/20 shadow-xl print:hidden">
              <h3 className="font-bold text-white text-lg flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-[#97BC62]" />
                Chronological Event Timeline
              </h3>
              <div className="space-y-3">
                {(timeRes.timeline || []).map((t: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl bg-[#0D1F16] border border-white/5 flex items-start gap-3 text-xs">
                    <div className="font-mono text-[#97BC62] whitespace-nowrap">{t.time}</div>
                    <div className="flex-1 text-emerald-200/90">{t.event}</div>
                    <span className="px-2 py-0.5 rounded bg-white/5 text-emerald-400/60 font-mono text-[10px]">
                      {t.source_item_id}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Printable Executive Report Display */}
            {reportText && (
              <div className="p-8 rounded-2xl bg-[#0D1F16] border border-[#97BC62]/30 shadow-2xl print:bg-white print:text-black print:p-0 print:border-none print:shadow-none">
                <div className="flex items-center justify-between pb-6 border-b border-white/10 mb-6 print:hidden">
                  <div className="flex items-center gap-3">
                    <FileCheck className="w-6 h-6 text-[#97BC62]" />
                    <h2 className="text-xl font-bold text-white">Synthesized Executive Report</h2>
                  </div>
                  <button
                    onClick={handlePrintReport}
                    className="px-4 py-2 rounded-xl bg-[#97BC62] text-[#1A3A2A] font-bold text-xs flex items-center gap-2 hover:bg-[#85a854] transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    Print PDF Report
                  </button>
                </div>

                {/* Rendered Printable Markdown Document */}
                <article className="prose prose-invert print:prose max-w-none text-emerald-100 text-sm leading-relaxed space-y-4 print:text-black">
                  <ReactMarkdown>{reportText}</ReactMarkdown>
                </article>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
