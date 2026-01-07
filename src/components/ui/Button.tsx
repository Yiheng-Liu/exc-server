import React from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export function Button({ 
  className = "", 
  variant = "primary", 
  size = "md", 
  isLoading, 
  children, 
  disabled,
  ...props 
}: ButtonProps) {
  
  const baseStyles = "inline-flex items-center justify-center font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm active:translate-y-[1px]",
    secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm",
    ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-sm"
  };

  const sizes = {
    sm: "text-xs px-2.5 py-1.5 rounded-lg gap-1.5",
    md: "text-sm px-4 py-2 rounded-xl gap-2",
    lg: "text-base px-6 py-3 rounded-xl gap-2.5"
  };

  const ringColors = {
    primary: "focus:ring-blue-500",
    secondary: "focus:ring-gray-400",
    ghost: "focus:ring-gray-400",
    danger: "focus:ring-red-500"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${ringColors[variant]} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && <Loader2 className="animate-spin" size={size === 'sm' ? 12 : 16} />}
      {children}
    </button>
  );
}
