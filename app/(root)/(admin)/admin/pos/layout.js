"use client";

export default function PosLayout({ children }) {
  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
