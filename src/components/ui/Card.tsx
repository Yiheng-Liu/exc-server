import React from "react";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl ${className}`}>
      {children}
    </div>
  );
}
