import { Sidebar } from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar className="flex-shrink-0 bg-gray-50" />
      <main className="flex-1 overflow-hidden relative bg-white">
        {children}
      </main>
    </div>
  );
}
