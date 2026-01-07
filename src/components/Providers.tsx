"use client";

import { SessionProvider } from "next-auth/react";
import { FileStatusProvider } from "@/contexts/FileStatusContext";
import { ToastProvider } from "@/contexts/ToastContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <FileStatusProvider>
          {children}
        </FileStatusProvider>
      </ToastProvider>
    </SessionProvider>
  );
}
