"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface FileStatusContextType {
  dirtyFiles: Set<string>;
  markDirty: (fileId: string) => void;
  markClean: (fileId: string) => void;
  isDirty: (fileId: string) => boolean;
}

const FileStatusContext = createContext<FileStatusContextType | undefined>(undefined);

export function FileStatusProvider({ children }: { children: React.ReactNode }) {
  const [dirtyFiles, setDirtyFiles] = useState<Set<string>>(new Set());

  const markDirty = useCallback((fileId: string) => {
    setDirtyFiles(prev => {
      if (prev.has(fileId)) return prev;
      const next = new Set(prev);
      next.add(fileId);
      return next;
    });
  }, []);

  const markClean = useCallback((fileId: string) => {
    setDirtyFiles(prev => {
      if (!prev.has(fileId)) return prev;
      const next = new Set(prev);
      next.delete(fileId);
      return next;
    });
  }, []);

  const isDirty = useCallback((fileId: string) => {
    return dirtyFiles.has(fileId);
  }, [dirtyFiles]);

  return (
    <FileStatusContext.Provider value={{ dirtyFiles, markDirty, markClean, isDirty }}>
      {children}
    </FileStatusContext.Provider>
  );
}

export function useFileStatus() {
  const context = useContext(FileStatusContext);
  if (context === undefined) {
    throw new Error("useFileStatus must be used within a FileStatusProvider");
  }
  return context;
}
