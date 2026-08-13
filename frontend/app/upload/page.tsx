"use client";

import { useState, useEffect, useCallback, ChangeEvent, DragEvent } from "react";
import Link from "next/link";
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
  Eye,
  Trash2,
  Code
} from "lucide-react";

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

export default function UploadPage() {
  const [caseId, setCaseId] = useState<string>("case_demo_01");
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [chatLogJson, setChatLogJson] = useState<string>("");
  const [jsonValidationError, setJsonValidationError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [mounted, setMounted] = useState<boolean>(false);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch current case data
  const fetchCaseDetails = useCallback(async (id: string) => {
    if (!id.trim()) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/cases/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCaseData(data);
      } else if (res.status === 404) {
        setCaseData(null);
      }
    } catch (err) {
      console.error("Failed to fetch case details:", err);
    }
  }, [BACKEND_URL]);

  useEffect(() => {
    if (caseId) {
      fetchCaseDetails(caseId);
    }
  }, [caseId, fetchCaseDetails]);

  // Validate JSON live
  const handleChatJsonChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setChatLogJson(val);
    if (!val.trim()) {
      setJsonValidationError(null);
      return;
    }
    try {
      const parsed = JSON.parse(val);
      if (!Array.isArray(parsed) && !(typeof parsed === "object" && parsed !== null)) {
        setJsonValidationError("JSON must be an array of objects or a log container object");
      } else {
        setJsonValidationError(null);
      }
    } catch (err: any) {
      setJsonValidationError(err.message || "Invalid JSON syntax");
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setSelectedFiles((prev) => [...prev, ...droppedFiles]);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const chosenFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...chosenFiles]);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload handler
  const handleUploadSubmit = async () => {
    if (selectedFiles.length === 0 && !chatLogJson.trim()) {
      setUploadError("Please select at least one file or enter mock chat log JSON.");
      return;
    }

    if (jsonValidationError) {
      setUploadError("Please fix the JSON syntax error before submitting.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const formData = new FormData();

    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });

    if (chatLogJson.trim()) {
      formData.append("chat_logs", chatLogJson.trim());
    }

    try {
      const targetCaseId = caseId.trim() || `case_${Date.now()}`;
      const res = await fetch(`${BACKEND_URL}/api/cases/${targetCaseId}/evidence`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || `Upload failed with status ${res.status}`);
      }

      const result = await res.json();
      setUploadSuccess(`Successfully uploaded ${result.added_count} evidence item(s) to case ${targetCaseId}!`);
      setSelectedFiles([]);
      setChatLogJson("");
      setCaseData(result.case);
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadError(err.message || "Failed to upload evidence to backend");
    } finally {
      setUploading(false);
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <main className="min-h-screen bg-[#1A3A2A] text-[#E6F0EA] flex flex-col justify-between p-4 sm:p-8 md:p-12 relative overflow-hidden">
      {/* Background Decorative Glows */}
      <div className="absolute top-0 right-1/3 w-[500px] h-[500px] bg-[#97BC62]/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-[#97BC62]/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Header Bar */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between py-4 border-b border-[#2D5941] mb-8 relative z-10">
        <div className="flex items-center space-x-3">
          <Link
            href="/"
            className="w-10 h-10 rounded-xl bg-[#234935] border border-[#97BC62]/40 flex items-center justify-center text-[#97BC62] hover:bg-[#97BC62] hover:text-[#132B1F] transition-all"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-xl tracking-tight text-white">Evidence Upload</h1>
              <span className="text-[10px] font-mono uppercase bg-[#234935] text-[#97BC62] px-2 py-0.5 rounded-md border border-[#97BC62]/30">
                Stage 1: Ingestion
              </span>
            </div>
            <p className="text-xs text-[#A3C2B0]">Upload images & mock chat logs to case persistence database</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/"
            className="px-3 py-1.5 rounded-xl bg-[#234935] text-xs font-mono text-[#A3C2B0] hover:text-[#97BC62] border border-[#2D5941] transition-all"
          >
            System Status
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto w-full flex-1 space-y-8 relative z-10">

        {/* Case ID Selection & Status Bar */}
        <div className="bg-[#132B1F]/90 backdrop-blur-md rounded-2xl p-6 border border-[#2D5941] shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <label className="block text-xs font-mono uppercase tracking-wider text-[#A3C2B0] mb-2">
              Target Case ID
            </label>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={caseId}
                  onChange={(e) => setCaseId(e.target.value)}
                  placeholder="e.g. case_demo_01"
                  className="w-full bg-[#1A3A2A] border border-[#2D5941] focus:border-[#97BC62] focus:outline-none rounded-xl px-4 py-2 text-sm font-mono text-white placeholder-gray-500 transition-all"
                />
              </div>
              <button
                onClick={() => setCaseId(`case_${Date.now().toString().slice(-6)}`)}
                className="px-3 py-2 bg-[#234935] hover:bg-[#97BC62]/20 border border-[#2D5941] text-[#97BC62] rounded-xl text-xs font-mono transition-all flex items-center space-x-1"
                title="Generate new Case ID"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-4 border-t sm:border-t-0 sm:border-l border-[#2D5941] pt-3 sm:pt-0 sm:pl-6">
            <div>
              <span className="text-[10px] text-[#A3C2B0] uppercase font-mono">Case Status</span>
              <div className="text-sm font-bold font-mono text-[#97BC62] flex items-center space-x-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-[#97BC62] animate-pulse" />
                <span>{caseData?.status || "Ready for Upload"}</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] text-[#A3C2B0] uppercase font-mono">Stored Evidence</span>
              <div className="text-sm font-bold font-mono text-white mt-0.5">
                {caseData?.evidence_items?.length || 0} item(s)
              </div>
            </div>
          </div>
        </div>

        {/* Upload Form Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Drag & Drop Image Upload Zone */}
          <div className="bg-[#132B1F]/90 backdrop-blur-md rounded-2xl p-6 border border-[#2D5941] shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-[#A3C2B0]">
                  <ImageIcon className="w-4 h-4 text-[#97BC62]" />
                  <span>Image Evidence Upload</span>
                </div>
                <span className="text-[11px] font-mono text-[#A3C2B0]/80">PNG, JPG, WEBP, SVG</span>
              </div>

              {/* Drag Drop Box */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? "border-[#97BC62] bg-[#97BC62]/10 scale-[1.01]"
                    : "border-[#2D5941] bg-[#1A3A2A]/60 hover:border-[#97BC62]/60 hover:bg-[#1A3A2A]"
                }`}
              >
                <input
                  type="file"
                  id="imageFileInput"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label htmlFor="imageFileInput" className="cursor-pointer flex flex-col items-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#234935] border border-[#97BC62]/30 flex items-center justify-center text-[#97BC62] mb-3 shadow-lg shadow-[#97BC62]/10">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-white mb-1">
                    Drag & drop evidence images here
                  </p>
                  <p className="text-xs text-[#A3C2B0]">
                    or <span className="text-[#97BC62] underline font-medium">browse from your device</span>
                  </p>
                </label>
              </div>

              {/* Selected Files Staging List */}
              {selectedFiles.length > 0 && (
                <div className="mt-4 space-y-2 max-h-48 overflow-y-auto pr-1">
                  <span className="text-[11px] font-mono text-[#A3C2B0] uppercase">Selected Image Files ({selectedFiles.length})</span>
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#1A3A2A] border border-[#2D5941] text-xs font-mono"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <ImageIcon className="w-4 h-4 text-[#97BC62] shrink-0" />
                        <span className="truncate text-white">{file.name}</span>
                        <span className="text-[10px] text-[#A3C2B0] bg-[#234935] px-1.5 py-0.5 rounded shrink-0">
                          {formatBytes(file.size)}
                        </span>
                      </div>
                      <button
                        onClick={() => removeSelectedFile(idx)}
                        className="text-gray-400 hover:text-red-400 p-1 rounded-lg transition-colors cursor-pointer"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 text-[11px] text-[#A3C2B0] font-mono">
              Files are stored in <code className="bg-[#1A3A2A] px-1.5 py-0.5 rounded border border-[#2D5941] text-[#97BC62]">/backend/uploads/{caseId}/</code>
            </div>
          </div>

          {/* Mock Chat Log JSON Editor */}
          <div className="bg-[#132B1F]/90 backdrop-blur-md rounded-2xl p-6 border border-[#2D5941] shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-[#A3C2B0]">
                  <MessageSquare className="w-4 h-4 text-[#97BC62]" />
                  <span>Mock Chat Log JSON</span>
                </div>
                <button
                  onClick={() => {
                    setChatLogJson(SAMPLE_CHAT_LOG);
                    setJsonValidationError(null);
                  }}
                  className="text-[11px] font-mono text-[#97BC62] hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>Insert Sample JSON</span>
                </button>
              </div>

              {/* Textarea */}
              <div className="relative">
                <textarea
                  value={chatLogJson}
                  onChange={handleChatJsonChange}
                  rows={8}
                  placeholder={`[\n  {\n    "sender": "user_id",\n    "message": "Chat message text",\n    "timestamp": "2026-08-13T16:00:00Z"\n  }\n]`}
                  className="w-full bg-[#0D1C14] border border-[#2D5941] focus:border-[#97BC62] focus:outline-none rounded-xl p-3.5 text-xs font-mono text-[#97BC62] placeholder-gray-600 transition-all resize-none"
                />
              </div>

              {/* JSON Error Callout */}
              {jsonValidationError ? (
                <div className="mt-2 p-2.5 rounded-lg bg-red-950/50 border border-red-800/60 text-red-300 text-xs font-mono flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="truncate">{jsonValidationError}</span>
                </div>
              ) : chatLogJson.trim() ? (
                <div className="mt-2 text-[11px] font-mono text-[#97BC62] flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Valid JSON payload ready</span>
                </div>
              ) : null}
            </div>

            <div className="mt-4 text-[11px] text-[#A3C2B0] font-mono">
              Parses array of <code className="bg-[#1A3A2A] px-1 rounded text-[#97BC62]">{`{sender, message, timestamp}`}</code> objects.
            </div>
          </div>

        </div>

        {/* Global Error & Success Banners */}
        {uploadError && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs font-mono flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{uploadError}</span>
            </div>
            <button onClick={() => setUploadError(null)} className="text-red-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {uploadSuccess && (
          <div className="p-4 rounded-xl bg-[#132B1F] border border-[#97BC62]/60 text-[#97BC62] text-xs font-mono flex items-center justify-between shadow-[0_0_20px_rgba(151,188,98,0.2)]">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-[#97BC62] shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
            <button onClick={() => setUploadSuccess(null)} className="text-[#97BC62] hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Submit Upload Action Button */}
        <div className="flex justify-end">
          <button
            onClick={handleUploadSubmit}
            disabled={uploading || (selectedFiles.length === 0 && !chatLogJson.trim())}
            className="flex items-center space-x-2 px-8 py-3.5 rounded-xl bg-[#97BC62] hover:bg-[#A7CC72] active:bg-[#7A9E48] text-[#132B1F] font-bold text-sm tracking-wide transition-all shadow-xl shadow-[#97BC62]/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Upload className={`w-4 h-4 ${uploading ? "animate-bounce" : ""}`} />
            <span>{uploading ? "Uploading Evidence..." : "Submit Evidence Package"}</span>
          </button>
        </div>

        {/* Uploaded Evidence Items List */}
        <div className="bg-[#132B1F]/90 backdrop-blur-md rounded-2xl p-6 border border-[#2D5941] shadow-2xl">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#2D5941]">
            <div className="flex items-center space-x-2">
              <FolderOpen className="w-5 h-5 text-[#97BC62]" />
              <h2 className="font-bold text-lg text-white">Stored Case Evidence</h2>
              <span className="text-xs font-mono bg-[#234935] text-[#97BC62] px-2 py-0.5 rounded-full border border-[#97BC62]/30">
                {caseData?.evidence_items?.length || 0}
              </span>
            </div>

            <button
              onClick={() => fetchCaseDetails(caseId)}
              className="p-2 rounded-xl bg-[#1A3A2A] text-[#A3C2B0] hover:text-[#97BC62] border border-[#2D5941] transition-all cursor-pointer"
              title="Refresh evidence list"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {!caseData?.evidence_items || caseData.evidence_items.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-[#2D5941] rounded-xl bg-[#1A3A2A]/40">
              <FileText className="w-10 h-10 text-[#A3C2B0]/40 mx-auto mb-2" />
              <p className="text-sm font-semibold text-white">No evidence uploaded yet</p>
              <p className="text-xs text-[#A3C2B0] mt-1">
                Upload image screenshots or mock chat log JSON above for case <span className="font-mono text-[#97BC62]">{caseId}</span>.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {caseData.evidence_items.map((item, index) => (
                <div
                  key={item.id || index}
                  className="bg-[#1A3A2A] border border-[#2D5941] hover:border-[#97BC62]/50 rounded-xl p-4 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  {/* Left: Icon & Item Info */}
                  <div className="flex items-start space-x-3.5">
                    {item.type === "image" ? (
                      <div className="w-10 h-10 rounded-xl bg-[#97BC62]/10 border border-[#97BC62]/40 flex items-center justify-center text-[#97BC62] shrink-0">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    ) : item.type === "chat_log" ? (
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-[#234935] border border-[#2D5941] flex items-center justify-center text-[#A3C2B0] shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-white">
                          {item.type === "image"
                            ? item.filename || "Uploaded Image"
                            : item.type === "chat_log"
                            ? `Chat Log Payload (${item.count || item.logs?.length || 0} messages)`
                            : "Evidence File"}
                        </span>
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                            item.type === "image"
                              ? "bg-[#97BC62]/10 text-[#97BC62] border-[#97BC62]/40"
                              : "bg-emerald-950/60 text-emerald-300 border-emerald-800/60"
                          }`}
                        >
                          {item.type}
                        </span>
                      </div>

                      <div className="text-xs text-[#A3C2B0] font-mono mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>ID: {item.id}</span>
                        {item.size_bytes && <span>Size: {formatBytes(item.size_bytes)}</span>}
                        {mounted && item.uploaded_at && (
                          <span suppressHydrationWarning>Uploaded: {new Date(item.uploaded_at).toLocaleTimeString()}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Preview Actions / Chat preview */}
                  <div className="flex items-center space-x-2">
                    {item.type === "image" && item.url && (
                      <button
                        onClick={() => setPreviewImage(`${BACKEND_URL}${item.url}`)}
                        className="px-3 py-1.5 rounded-lg bg-[#234935] hover:bg-[#97BC62] hover:text-[#132B1F] text-[#97BC62] text-xs font-mono transition-all flex items-center space-x-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Image</span>
                      </button>
                    )}

                    {item.type === "chat_log" && item.logs && (
                      <details className="w-full sm:w-auto">
                        <summary className="px-3 py-1.5 rounded-lg bg-[#234935] hover:bg-[#97BC62] hover:text-[#132B1F] text-[#97BC62] text-xs font-mono transition-all cursor-pointer">
                          View Log Array ({item.logs.length})
                        </summary>
                        <div className="mt-3 p-3 rounded-lg bg-[#0D1C14] border border-[#2D5941] font-mono text-xs text-[#97BC62] max-h-48 overflow-y-auto space-y-2">
                          {item.logs.map((log, idx) => (
                            <div key={idx} className="border-b border-[#2D5941]/40 pb-1.5 last:border-0">
                              <span className="text-white font-bold">{log.sender}</span>: {log.message}{" "}
                              <span className="text-[10px] text-[#A3C2B0]">({log.timestamp})</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#132B1F] border border-[#2D5941] rounded-2xl p-4 max-w-3xl w-full relative shadow-2xl">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#2D5941]">
              <span className="text-xs font-mono text-[#97BC62]">Image Preview</span>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg bg-[#1A3A2A] text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex justify-center bg-[#0D1C14] rounded-xl p-2 max-h-[70vh] overflow-hidden">
              <img src={previewImage} alt="Evidence preview" className="max-h-[65vh] object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full text-center py-4 border-t border-[#2D5941]/50 text-xs text-[#A3C2B0] relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2 mt-12">
        <div>ACPIA Evidence Management &bull; FastAPI + Next.js 14</div>
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-[#97BC62]" />
          <span>Stage 1: Upload Only (No AI Analysis Yet)</span>
        </div>
      </footer>
    </main>
  );
}
