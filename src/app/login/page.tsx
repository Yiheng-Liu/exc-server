"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";
import { Layout } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { error: toastError, success } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
        const res = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        if (res?.error) {
            toastError("Invalid email or password");
        } else {
            success("Welcome back!");
            router.push("/dashboard");
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
      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-200/20 rounded-full blur-[80px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-indigo-200/20 rounded-full blur-[80px]" />

      <Card className="w-full max-w-md p-8 relative z-10">
        <div className="flex flex-col items-center mb-8">
            <div className="p-3 bg-blue-100 rounded-xl mb-4 text-blue-600">
                <Layout size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-gray-500 mt-1">Sign in to your account</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
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

            <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                Sign in
            </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500 hover:underline">
                Sign up
            </Link>
        </div>
      </Card>
    </div>
  );
}
