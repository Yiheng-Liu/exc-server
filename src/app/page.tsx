import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Layout, Cloud, Shield } from "lucide-react";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-indigo-50 via-white to-blue-50 text-gray-900 overflow-hidden relative">
      
      {/* Background Decor */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-200/30 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-indigo-200/30 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto w-full z-10">
        <div className="flex items-center gap-2 font-bold text-xl text-gray-800">
           <Layout className="text-blue-600" /> Excalidraw Cloud
        </div>
        <div className="flex gap-4">
          <Link href="/login">
            <Button variant="ghost">Log in</Button>
          </Link>
          <Link href="/register">
            <Button>Sign up free</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-6 border border-blue-100">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          Next.js Edition Available Now
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 mb-6 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
          Your Personal  
          <span className="text-blue-600"> Whiteboard Cloud</span>
        </h1>
        
        <p className="text-xl text-gray-600 max-w-2xl mb-10 leading-relaxed">
          The best open-source whiteboard, supercharged with a personal file system, 
          cloud storage, and folder organization. Built for speed and simplicity.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto shadow-xl shadow-blue-500/20">
                    Get Started for Free <ArrowRight size={18} />
                </Button>
            </Link>
            <Link href="https://github.com/excalidraw/excalidraw" target="_blank">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                    View on GitHub
                </Button>
            </Link>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 max-w-5xl text-left">
            <FeatureCard 
                icon={<Layout className="text-blue-600" />}
                title="Folder Organization"
                description="Stop losing your drawings. Organize them into deeply nested folders just like your computer."
            />
            <FeatureCard 
                icon={<Cloud className="text-indigo-600" />}
                title="Cloud Sync"
                description="Access your whiteboards from anywhere. Changes are auto-saved and synced across devices."
            />
             <FeatureCard 
                icon={<Shield className="text-emerald-600" />}
                title="Private & Secure"
                description="Your data is yours. Authenticated access ensures only you can see and edit your files."
            />
        </div>

      </main>
      
      <footer className="py-8 text-center text-gray-500 text-sm z-10">
        &copy; {new Date().getFullYear()} Excalidraw Personal Cloud. MIT License.
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <div className="p-6 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/40 shadow-sm hover:shadow-md transition-all">
            <div className="mb-4 p-3 bg-white rounded-xl inline-block shadow-sm border border-gray-100">
                {icon}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600 leading-relaxed">{description}</p>
        </div>
    );
}
