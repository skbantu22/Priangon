"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Clock } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

const SHORTCUTS = [
  ["F1", "Search"],
  ["F2", "Complete Sale"],
  ["F3", "Hold Sale"],
  ["F4", "Print Invoice"],
  ["F6", "Exchange"],
  ["Ctrl + K", "Focus Search"],
];

// Bottom status bar of the POS: keyboard shortcuts, connection and clock
export default function PosFooter({ showroomName }) {
  const isOnline = useNetworkStatus();
  const [now, setNow] = useState(null);

  // clock starts on the client only, so server and client HTML match
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 30 * 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  return (
    <footer className="hidden h-11 shrink-0 lg:flex items-center gap-4 border-t border-gray-200 bg-white px-4 text-xs text-gray-500 select-none dark:border-white/10 dark:bg-card">
      <div className="hidden md:flex items-center gap-4">
        {SHORTCUTS.map(([key, label]) => (
          <span key={key} className="flex items-center gap-1.5">
            <kbd className="rounded-md bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">
              {key}
            </kbd>
            {label}
          </span>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-4">
        {showroomName && (
          <span className="hidden lg:inline font-medium text-gray-700 dark:text-gray-300">
            {showroomName}
          </span>
        )}

        <span
          className={`flex items-center gap-1.5 font-semibold ${
            isOnline ? "text-emerald-600" : "text-red-500"
          }`}
        >
          <span
            className={`size-2.5 rounded-full ${
              isOnline ? "bg-emerald-500" : "bg-red-500 animate-pulse"
            }`}
          />
          {isOnline ? "Online" : "Offline"}
        </span>

        {now && (
          <>
            <span className="hidden sm:flex items-center gap-1">
              <CalendarDays className="size-3.5" />
              {now.toLocaleDateString("en-GB", {
                weekday: "short",
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" />
              {now.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </>
        )}

        <span className="hidden xl:inline text-gray-400">SB Telecom POS v1.0</span>
      </div>
    </footer>
  );
}
