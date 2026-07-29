"use client";

import PosFooter from "@/components/ui/Application/Admin/PosFooter";

export default function PosLayout({ children }) {
  return (
    <div className="flex h-full flex-col bg-gray-100">
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
