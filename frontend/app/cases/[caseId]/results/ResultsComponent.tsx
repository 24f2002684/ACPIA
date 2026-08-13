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
  ShieldAlert
} from "lucide-react";
import PageTransition from "../../../../components/PageTransition";
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
    <PageTransition>
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6 print:p-0 print:max-w-full">
        {loading ? (
          <div className="p-16 text-center text-[#F0F5F0]/60 font-mono flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#97BC62]" />
            Loading forensic case findings...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Title Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 pitch-card border-[#97BC62]/30 print:hidden">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-[#97BC62]/20 border border-[#97BC62]/40 flex items-center justify-center text-[#97BC62]">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#97BC62]/20 text-[#97BC62] text-[11px] font-mono mb-1">
                    Assessment & Intelligence Findings
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold text-[#F0F5F0]">Case Forensic Dashboard</h1>
                  <p className="text-xs text-[#F0F5F0]/70 mt-0.5">
                    Case ID: <span className="font-mono text-[#97BC62] font-bold">{caseId}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleGenerateReport}
                  disabled={reportGenerating}
                  className="px-5 py-2.5 rounded-xl bg-[#97BC62] text-[#1A3A2A] font-bold text-xs flex items-center gap-2 hover:bg-[#85a854] transition-all shadow-md shadow-[#97BC62]/20 active:scale-95 disabled:opacity-50"
                >
                  {reportGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Synthesizing...
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4" />
                      Generate Executive Report
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Risk Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden">
              <div className="p-4 pitch-card flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl ${
                    riskLevel === "HIGH"
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : "bg-[#97BC62]/20 text-[#97BC62] border border-[#97BC62]/30"
                  }`}
                >
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] text-[#F0F5F0]/60 uppercase font-mono tracking-wider">Overall Risk</div>
                  <div className="text-lg font-bold text-white">{riskLevel}</div>
                </div>
              </div>

              <div className="p-4 pitch-card flex items-center gap-4">
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
                  <div className="text-[11px] text-[#F0F5F0]/60 uppercase font-mono tracking-wider">Validation Verdict</div>
                  <div className="text-sm font-bold text-white uppercase">
                    {valRes.validated ? "PASSED" : "HUMAN REVIEW"}
                  </div>
                </div>
              </div>

              <div className="p-4 pitch-card flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                  <GitMerge className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] text-[#F0F5F0]/60 uppercase font-mono tracking-wider">Intelligence Graph</div>
                  <div className="text-sm font-bold text-white">{corrRes.total_nodes || 0} Nodes / {corrRes.total_edges || 0} Edges</div>
                </div>
              </div>

              <div className="p-4 pitch-card flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] text-[#F0F5F0]/60 uppercase font-mono tracking-wider">Synthetic Detection</div>
                  <div className="text-sm font-bold text-white">{synthRes.synthetic_images_count || 0} Flagged</div>
                </div>
              </div>
            </div>

            {/* Human Review Panel */}
            <div className="p-6 pitch-card space-y-4 print:hidden">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  Mandatory Human Review Panel ({flagsForReview.length + contradictions.length})
                </h3>
                <span className="text-xs text-[#F0F5F0]/60 font-mono">
                  {humanReviews.length} overrides recorded
                </span>
              </div>

              {flagsForReview.length === 0 && contradictions.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#1A3A2A] text-center text-xs text-[#F0F5F0]/60 font-mono border border-white/5">
                  No automated flags or contradictions detected. Case confidence threshold (&gt;0.60) satisfied.
                </div>
              ) : (
                <div className="space-y-3">
                  {flagsForReview.map((flag: any, idx: number) => {
                    const itemId = flag.item_id;
                    const existingReview = humanReviews.find((r: any) => r.item_id === itemId);

                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-[#1A3A2A]/90 border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono border border-amber-500/30">
                              FLAGGED ITEM
                            </span>
                            <span className="font-mono font-bold text-xs text-white">{itemId}</span>
                          </div>
                          <p className="text-xs text-[#F0F5F0]/80">{flag.reason}</p>
                        </div>

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
                            <ThumbsUp className="w-3.5 h-3.5" />
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
                            <ThumbsDown className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Force Graph */}
            <div className="p-6 pitch-card space-y-4 print:hidden">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <GitMerge className="w-5 h-5 text-[#97BC62]" />
                Interactive Correlation Knowledge Graph (react-force-graph)
              </h3>
              <KnowledgeGraphComponent
                nodes={metaRes.all_entities}
                edges={corrRes.edges}
                graphData={corrRes.graph}
              />
            </div>

            {/* Timeline */}
            <div className="p-6 pitch-card space-y-4 print:hidden">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#97BC62]" />
                Chronological Incident Timeline
              </h3>
              <div className="space-y-2.5">
                {(timeRes.timeline || []).map((t: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl bg-[#1A3A2A]/80 border border-white/5 flex items-start gap-3 text-xs">
                    <div className="font-mono text-[#97BC62] whitespace-nowrap">{t.time}</div>
                    <div className="flex-1 text-[#F0F5F0]/90">{t.event}</div>
                    <span className="px-2 py-0.5 rounded bg-white/5 text-[#97BC62] font-mono text-[10px]">
                      {t.source_item_id}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Report Display */}
            {reportText && (
              <div className="p-8 pitch-card border-[#97BC62]/40 shadow-2xl print:bg-white print:text-black print:p-0 print:border-none print:shadow-none">
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

                <article className="prose prose-invert print:prose max-w-none text-[#F0F5F0] text-sm leading-relaxed space-y-4 print:text-black">
                  <ReactMarkdown>{reportText}</ReactMarkdown>
                </article>
              </div>
            )}
          </div>
        )}
      </main>
    </PageTransition>
  );
}
