import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ className = "", label, error, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label className="text-sm font-medium text-gray-700 ml-1">{label}</label>}
      <input 
        className={`
          flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm
          ${error ? "border-red-500 focus-visible:ring-red-500" : "hover:border-gray-300"}
          ${className}
        `}
        {...props}
      />
      {error && <span className="text-xs text-red-500 ml-1">{error}</span>}
    </div>
  );
}
