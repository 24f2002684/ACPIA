"use client";

import React from "react";
import Link from "next/link";
import { FolderPlus, Upload, Shield } from "lucide-react";

interface EmptyStateProps {
  onCreateCase?: () => void;
}

export default function EmptyState({ onCreateCase }: EmptyStateProps) {
  return (
    <div className="p-12 text-center rounded-2xl bg-[#11261C] border border-[#97BC62]/20 shadow-xl max-w-lg mx-auto flex flex-col items-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-[#97BC62]/10 border border-[#97BC62]/30 flex items-center justify-center text-[#97BC62]">
        <FolderPlus className="w-8 h-8" />
      </div>

      <h3 className="text-xl font-bold text-white">No Forensic Cases Created Yet</h3>

      <p className="text-xs text-emerald-200/70 max-w-sm leading-relaxed">
        Start by initializing a new investigation case package or uploading evidence items to trigger automated 6-agent forensic pipeline analysis.
      </p>

      <div className="flex items-center gap-3 pt-2">
        <Link
          href="/upload"
          className="px-4 py-2.5 rounded-xl bg-[#97BC62] text-[#1A3A2A] font-bold text-xs flex items-center gap-2 hover:bg-[#85a854] transition-all shadow-md shadow-[#97BC62]/20"
        >
          <Upload className="w-4 h-4" />
          Upload Evidence
        </Link>
      </div>
    </div>
  );
}
