import { FileText, FolderPlus, ArrowLeft } from "lucide-react";

export function EmptyDashboard() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-gray-500 bg-gray-50/30">
      <div className="max-w-md text-center space-y-6 p-8">
        <div className="flex justify-center gap-4 mb-8">
            <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 transform rotate-[-6deg]">
                <FileText size={32} className="text-blue-500" />
            </div>
            <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 transform rotate-[6deg]">
                <FolderPlus size={32} className="text-indigo-500" />
            </div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-800">Welcome to Your Cloud</h2>
        <p className="text-gray-600 leading-relaxed">
          Select a file from the sidebar to start drawing, or create a new one using the buttons in the sidebar header.
        </p>
        
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mt-8">
            <ArrowLeft size={16} /> Use the sidebar to transparently organize your workspace
        </div>
      </div>
    </div>
  );
}
