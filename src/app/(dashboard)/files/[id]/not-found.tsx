"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";
import { EmptyDashboard } from "@/components/EmptyDashboard";

export default function NotFound() {
  const { error } = useToast();
  const router = useRouter();

  useEffect(() => {
    // Show toast immediately
    error("File not found");
    // Redirect to dashboard, but replace the history entry so the user can't go back to the 404 URL
    router.replace("/dashboard");
  }, [error, router]);

  return <EmptyDashboard />;
}
