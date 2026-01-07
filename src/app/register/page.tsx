"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";
import { Layout } from "lucide-react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { error: toastError, success } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
        const res = await fetch("/api/auth/register", {
            method: "POST",
            body: JSON.stringify({ email, password, name }),
            headers: { "Content-Type": "application/json" },
        });

        if (res.ok) {
            success("Account created! Redirecting to login...");
            setTimeout(() => router.push("/login"), 1000);
        } else {
            const data = await res.json();
            toastError(data.message || "Registration failed");
        }
    } catch (err) {
        toastError("Something went wrong");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50 p-4 relative overflow-hidden">
      {/* Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-purple-200/20 rounded-full blur-[80px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-200/20 rounded-full blur-[80px]" />

      <Card className="w-full max-w-md p-8 relative z-10">
        <div className="flex flex-col items-center mb-8">
            <div className="p-3 bg-indigo-100 rounded-xl mb-4 text-indigo-600">
                <Layout size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Create an account</h2>
            <p className="text-gray-500 mt-1">Start your personal cloud today</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
            <Input
                label="Full Name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
            />
            <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
            />
            <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
            />

            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500" size="lg" isLoading={isLoading}>
                Create account
            </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500 hover:underline">
                Sign in
            </Link>
        </div>
      </Card>
    </div>
  );
}
