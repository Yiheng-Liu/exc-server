"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import "@excalidraw/excalidraw/index.css";
import { useRouter } from "next/navigation";
import { useFileStatus } from "@/contexts/FileStatusContext";
import { useToast } from "@/contexts/ToastContext";

const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  {
    ssr: false,
    loading: () => <div>Loading Editor...</div>,
  }
);

interface ExcalidrawWrapperProps {
  fileId: string;
}

export function ExcalidrawWrapper({ fileId }: ExcalidrawWrapperProps) {
  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const excalidrawAPI = useRef<any>(null);
  const { markDirty, markClean } = useFileStatus();
  const { error } = useToast();
  const router = useRouter(); // Import this at the top level
  
  // Track last saved content string to compare for dirty check
  const lastSavedRef = useRef<string>("");
  // Track current content string in real-time
  const currentContentRef = useRef<string>("");

  useEffect(() => {
    loadContent();
  }, [fileId]);

  const loadContent = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/files/${fileId}/content`);
      if (res.ok) {
        const data = await res.json();
        setInitialData(data);
        
        // Initialize refs
        const contentStr = JSON.stringify(data);
        lastSavedRef.current = contentStr;
        currentContentRef.current = contentStr;
        markClean(fileId);
      } else {
        // Handle API errors
        if (res.status === 404) {
            error("File not found");
            router.replace("/dashboard");
        } else {
             // 500 or other errors
             error("Failed to load file content");
        }
      }
    } catch (e) {
      console.error(e);
      error("Failed to load file content");
    } finally {
      setLoading(false);
    }
  };

  const saveData = async () => {
    console.log("[Wrapper] Attempting save...");
    // If nothing changed effectively, just mark clean and return (unless it was a forced manual save, but logic holds)
    if (currentContentRef.current === lastSavedRef.current) {
        console.log("[Wrapper] No changes detected, skipping save.");
        markClean(fileId);
        return;
    }

    setSaving(true);
    try {
        console.log(`[Wrapper] Sending save request for ${fileId}`);
        const res = await fetch(`/api/files/${fileId}/content`, {
            method: "POST",
            body: currentContentRef.current
        });

        if (!res.ok) {
            if (res.status === 404) {
               console.error("File not found");
               return; 
            }
            throw new Error(`Save failed with status ${res.status}`);
        }
        
        console.log("[Wrapper] Save successful");
        lastSavedRef.current = currentContentRef.current;
        markClean(fileId);
    } catch (e) {
        console.error("Save failed", e);
        error("Failed to save changes");
    } finally {
        setSaving(false);
    }
  };

  // 1. Change Handler: Update Ref and Mark Dirty, but DO NOT SAVE
  const handleChange = useCallback((elements: any, appState: any, files: any) => {
    if (loading) return;
    
    // Full state for saving (keep everything)
    const { collaborators, ...cleanAppState } = appState;
    const payload = {
        elements,
        appState: cleanAppState,
        files
    };
    const content = JSON.stringify(payload);
    currentContentRef.current = content;

    // Comparison state for dirty check (STRICT SUBSET)
    // Only track things that actually matter for the document content
    const comparisonAppState = {
        viewBackgroundColor: cleanAppState.viewBackgroundColor,
        gridModeEnabled: cleanAppState.gridModeEnabled,
        theme: cleanAppState.theme,
    };

    // Robust element comparison (strip unnecessary runtime props if needed, but usually elements are fine)
    // We strictly compare elements, files, and specific appState props.
    const comparisonPayload = {
        elements,
        appState: comparisonAppState,
        files
    };
    const comparisonContent = JSON.stringify(comparisonPayload);
    
    try {
        const lastSavedFull = JSON.parse(lastSavedRef.current || "{}");
        // Reconstruct reference comparison object from last saved
        const lastSavedAppState = lastSavedFull.appState || {};
        const lastSavedComparisonAppState = {
             viewBackgroundColor: lastSavedAppState.viewBackgroundColor,
             gridModeEnabled: lastSavedAppState.gridModeEnabled,
             theme: lastSavedAppState.theme,
        };

        const lastSavedComparisonPayload = {
            elements: lastSavedFull.elements,
            appState: lastSavedComparisonAppState,
            files: lastSavedFull.files
        };

        if (JSON.stringify(lastSavedComparisonPayload) !== comparisonContent) {
            markDirty(fileId);
        } else {
            markClean(fileId);
        }
    } catch (e) {
        // Fallback to strict equality if parse fails
        if (content !== lastSavedRef.current) {
            markDirty(fileId);
        } else {
             markClean(fileId);
        }
    }
  }, [loading, fileId, markDirty, markClean]);

  // 2. Auto-Save Interval (1 Minute)
  useEffect(() => {
     const interval = setInterval(() => {
         if (currentContentRef.current !== lastSavedRef.current) {
             saveData();
         }
     }, 60 * 1000); // 1 minute
     
     return () => clearInterval(interval);
  }, [fileId]);

  // 3. Manual Save (Ctrl/Cmd + S)
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 's') {
              e.preventDefault();
              saveData();
          }
      };
      
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fileId]); // Re-bind if file changes, though logic relies on refs so it handles current content

  if (loading) {
    return <div className="flex h-full items-center justify-center">Loading...</div>;
  }

  return (
    <div className="h-full w-full relative">
       {saving && <div className="absolute top-2 right-2 z-50 text-xs bg-white p-1 rounded shadow">Saving...</div>}
       <Excalidraw
          excalidrawAPI={(api) => (excalidrawAPI.current = api)}
          initialData={initialData}
          onChange={handleChange}
          UIOptions={{
            canvasActions: {
              saveToActiveFile: false,
              loadScene: false,
              export: false
            }
          }}
       />
    </div>
  );
}
