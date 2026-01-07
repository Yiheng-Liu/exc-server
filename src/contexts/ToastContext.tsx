"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toasts: ToastMessage[];
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        removeToast(id);
    }, 3000);
  }, [removeToast]);

  const success = useCallback((msg: string) => addToast(msg, "success"), [addToast]);
  const error = useCallback((msg: string) => addToast(msg, "error"), [addToast]);
  const info = useCallback((msg: string) => addToast(msg, "info"), [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, info }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// Internal Toast UI Component
function ToastContainer({ toasts, removeToast }: { toasts: ToastMessage[]; removeToast: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div 
          key={toast.id}
          className={`
            pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md transition-all animate-in slide-in-from-right-full duration-300
            ${toast.type === 'success' ? 'bg-green-50/90 border-green-200 text-green-800' : ''}
            ${toast.type === 'error' ? 'bg-red-50/90 border-red-200 text-red-800' : ''}
            ${toast.type === 'info' ? 'bg-blue-50/90 border-blue-200 text-blue-800' : ''}
          `}
          role="alert"
        >
          {toast.type === 'success' && <CheckCircle size={18} className="text-green-600" />}
          {toast.type === 'error' && <AlertCircle size={18} className="text-red-600" />}
          {toast.type === 'info' && <Info size={18} className="text-blue-600" />}
          
          <span className="text-sm font-medium">{toast.message}</span>
          
          <button 
            onClick={() => removeToast(toast.id)}
            className="ml-2 hover:opacity-70 transition-opacity"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
