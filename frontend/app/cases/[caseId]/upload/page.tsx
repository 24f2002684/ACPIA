"use client";

import { use } from "react";
import UploadPage from "@/app/upload/page";

export default function CaseUploadPage({ params }: { params: Promise<{ caseId: string }> }) {
  const resolvedParams = use(params);
  return <UploadPage />;
}
