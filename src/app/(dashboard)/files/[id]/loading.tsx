import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex items-center justify-center h-full text-gray-500">
      <Loader2 className="animate-spin mr-2" />
      <span>Loading canvas...</span>
    </div>
  );
}
