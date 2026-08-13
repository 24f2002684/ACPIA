"use client";

import React from "react";

export function SkeletonCard() {
  return (
    <div className="p-6 rounded-2xl bg-[#11261C]/50 border border-white/5 animate-pulse space-y-4">
      <div className="h-4 bg-white/10 rounded w-1/3"></div>
      <div className="h-8 bg-white/10 rounded w-2/3"></div>
      <div className="h-3 bg-white/5 rounded w-1/2"></div>
    </div>
  );
}

export function SkeletonPipelineNode() {
  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#11261C]/40 border border-white/5 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-white/10 flex-shrink-0"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-white/10 rounded w-1/4"></div>
        <div className="h-3 bg-white/5 rounded w-3/4"></div>
      </div>
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="space-y-3 p-4 rounded-2xl bg-[#11261C]/40 border border-white/5 animate-pulse">
      <div className="h-4 bg-white/10 rounded w-full"></div>
      <div className="h-4 bg-white/10 rounded w-5/6"></div>
      <div className="h-4 bg-white/10 rounded w-4/6"></div>
    </div>
  );
}
