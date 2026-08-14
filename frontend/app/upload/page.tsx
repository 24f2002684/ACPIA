"use client";

import { useState, useEffect, useCallback, ChangeEvent, DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Upload,
  Image as ImageIcon,
  MessageSquare,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  RefreshCw,
  FolderOpen,
  ArrowLeft,
  Cpu,
  Trash2,
  Code,
  ShieldCheck,
  Play
} from "lucide-react";
import PageTransition from "../../components/PageTransition";
import { useToast } from "../../components/ToastContext";

interface EvidenceItem {
  id: string;
  type: "image" | "chat_log" | "file" | string;
  filename?: string;
  url?: string;
  size_bytes?: number;
  mime_type?: string;
  count?: number;
  logs?: Array<{ sender: string; message: string; timestamp: string }>;
  uploaded_at: string;
}

interface CaseData {
  case_id: string;
  status: string;
  evidence_items: EvidenceItem[];
  created_at: string;
}

const SAMPLE_CHAT_LOG = JSON.stringify(
  [
    {
      sender: "user_john",
      message: "Hey, I noticed suspicious authorization attempts on my account.",
      timestamp: "2026-08-13T14:32:00Z"
    },
    {
      sender: "support_agent",
      message: "Thank you for reporting. Let me check the auth logs for your IP.",
      timestamp: "2026-08-13T14:33:15Z"
    },
    {
      sender: "system_alert",
      message: "Multiple failed password attempts detected from IP 192.168.1.105 (Location: Unknown)",
      timestamp: "2026-08-13T14:33:20Z"
    }
  ],
  null,
  2
);

export default function EvidenceUploadPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [caseId, setCaseId] = useState<string>("case_demo_01");
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // File Upload States
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState<boolean>(false);

  // JSON Chat Logs State
  const [chatLogJson, setChatLogJson] = useState<string>("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Upload Submission Status
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

  // Fetch Existing Case Evidence
  const fetchCaseDetails = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/cases/${caseId}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setCaseData(data);
      }
    } catch {
      // Ignore if new case
    } finally {
      setLoading(false);
    }
  }, [BACKEND_URL, caseId]);

  useEffect(() => {
    fetchCaseDetails();
  }, [fetchCaseDetails]);

  // File Drop Handlers
  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const newFiles = Array.from(e.dataTransfer.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Evidence Package
  const handleUploadSubmit = async () => {
    if (selectedFiles.length === 0 && !chatLogJson.trim()) {
      addToast("warning", "No Evidence Selected", "Please attach files or paste chat log JSON before submitting.");
      return;
    }

    if (chatLogJson.trim()) {
      try {
        JSON.parse(chatLogJson);
        setJsonError(null);
      } catch (err: any) {
        setJsonError("Invalid JSON syntax: " + err.message);
        addToast("error", "Invalid Chat Log JSON", err.message);
        return;
      }
    }

    setUploading(true);
    const formData = new FormData();

    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });

    if (chatLogJson.trim()) {
      formData.append("chat_logs", chatLogJson.trim());
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/cases/${caseId}/evidence`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Evidence upload failed");
      }

      const responseData = await res.json();
      setCaseData(responseData.case);
      setSelectedFiles([]);
      setChatLogJson("");
      setJsonError(null);
      addToast("success", "Evidence Ingested", `Successfully uploaded ${responseData.added_count} evidence item(s). Draft cleared.`);
    } catch (err: any) {
      addToast("error", "Upload Failed", err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <PageTransition>
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
        {/* Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 pitch-card border-[#97BC62]/30">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-[#97BC62]/20 border border-[#97BC62]/40 flex items-center justify-center text-[#97BC62]">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#97BC62]/20 text-[#97BC62] text-[11px] font-mono mb-1">
                Evidence Ingestion Engine
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#F0F5F0]">Evidence Package Upload</h1>
              <p className="text-xs text-[#F0F5F0]/70 mt-0.5">
                Ingest digital forensic artifacts (images, EXIF metadata, and chat transcripts) into case repository.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/cases/${caseId}/analysis`)}
              className="px-4 py-2.5 rounded-xl bg-[#97BC62] text-[#1A3A2A] font-bold text-xs flex items-center gap-2 hover:bg-[#85a854] transition-all shadow-md shadow-[#97BC62]/20"
            >
              <Play className="w-4 h-4" />
              Proceed to Analysis Pipeline
            </button>
          </div>
        </div>

        {/* Form Container Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* File Drag-and-Drop Dropzone Card */}
          <div className="p-6 pitch-card space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#97BC62]" />
              Image & Media Files Dropzone
            </h3>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                dragActive
                  ? "border-[#97BC62] bg-[#97BC62]/10 scale-[0.99]"
                  : "border-[#97BC62]/30 bg-[#1A3A2A]/50 hover:border-[#97BC62]/60"
              }`}
            >
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload-input"
              />
              <label htmlFor="file-upload-input" className="cursor-pointer block">
                <ImageIcon className="w-10 h-10 text-[#97BC62] mx-auto mb-2 opacity-80" />
                <p className="text-xs font-semibold text-[#F0F5F0]">
                  Drag and drop image files here, or <span className="text-[#97BC62] underline">browse files</span>
                </p>
                <p className="text-[10px] text-[#F0F5F0]/50 mt-1">Supports PNG, JPG, WEBP, and EXIF media</p>
              </label>
            </div>

            {/* Selected File List */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-[#1A3A2A]/80 border border-white/5 text-xs">
                    <div className="flex items-center space-x-2 truncate">
                      <ImageIcon className="w-4 h-4 text-[#97BC62] flex-shrink-0" />
                      <span className="truncate text-white font-mono">{file.name}</span>
                      <span className="text-[10px] text-[#F0F5F0]/50 font-mono">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button onClick={() => removeSelectedFile(idx)} className="text-red-400 hover:text-red-300">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* JSON Chat Logs Textarea Card */}
          <div className="p-6 pitch-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#97BC62]" />
                Mock Chat Transcript JSON
              </h3>
              <button
                onClick={() => setChatLogJson(SAMPLE_CHAT_LOG)}
                className="text-[11px] font-mono text-[#97BC62] hover:underline flex items-center gap-1"
              >
                <Code className="w-3 h-3" />
                Load Sample
              </button>
            </div>

            <textarea
              value={chatLogJson}
              onChange={(e) => {
                setChatLogJson(e.target.value);
                setJsonError(null);
              }}
              placeholder={`Paste mock chat logs JSON array... \n[\n  {"sender": "user_john", "message": "...", "timestamp": "..."}\n]`}
              className="w-full h-44 p-3 rounded-xl bg-[#1A3A2A]/90 border border-[#97BC62]/30 text-xs font-mono text-[#97BC62] focus:outline-none focus:border-[#97BC62] resize-none"
            />

            <button
              onClick={handleUploadSubmit}
              disabled={uploading}
              className="w-full py-3 rounded-xl bg-[#97BC62] text-[#1A3A2A] font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#85a854] transition-all shadow-md shadow-[#97BC62]/20 active:scale-98 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Ingesting Evidence Package...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Submit Evidence Package to Case
                </>
              )}
            </button>
          </div>
        </div>

        {/* Existing Case Evidence Display Card */}
        {caseData && caseData.evidence_items && caseData.evidence_items.length > 0 && (
          <div className="p-6 pitch-card space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-[#97BC62]" />
              Ingested Evidence Package Inventory ({caseData.evidence_items.length} Items)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {caseData.evidence_items.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-[#1A3A2A]/80 border border-white/5 flex items-start gap-3">
                  {item.type === "image" ? (
                    <ImageIcon className="w-6 h-6 text-[#97BC62] flex-shrink-0 mt-0.5" />
                  ) : (
                    <MessageSquare className="w-6 h-6 text-[#38bdf8] flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-mono font-bold text-xs text-white truncate">{item.filename || item.id}</div>
                    <div className="text-[10px] text-[#F0F5F0]/60 font-mono mt-0.5">
                      Type: <span className="text-[#97BC62] uppercase">{item.type}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </PageTransition>
  );
}
