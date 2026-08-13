"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextType {
  addToast: (type: ToastType, title: string, description?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: ToastType, title: string, description?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, description }]);

    // Auto remove toast after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Fixed Toast Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto p-4 rounded-xl shadow-2xl border flex items-start gap-3 backdrop-blur-md ${
                toast.type === "success"
                  ? "bg-[#11261C]/95 border-[#97BC62]/40 text-white shadow-[#97BC62]/10"
                  : toast.type === "error"
                  ? "bg-red-950/95 border-red-500/40 text-red-100 shadow-red-500/10"
                  : toast.type === "warning"
                  ? "bg-amber-950/95 border-amber-500/40 text-amber-100"
                  : "bg-slate-900/95 border-blue-500/40 text-blue-100"
              }`}
            >
              {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-[#97BC62] flex-shrink-0 mt-0.5" />}
              {toast.type === "error" && <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />}
              {toast.type === "warning" && <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />}
              {toast.type === "info" && <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />}

              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-xs text-white">{toast.title}</h4>
                {toast.description && <p className="text-[11px] opacity-80 mt-0.5 leading-snug">{toast.description}</p>}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
