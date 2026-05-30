import { CheckCircle, RefreshCw, Truck, Clock, XCircle } from "lucide-react";

export function getStatusBadge(status) {
  switch (status) {
    case "Delivered":
      return (
        <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
          <CheckCircle className="w-3.5 h-3.5" />
          Delivered
        </span>
      );

    case "Processing":
      return (
        <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800">
          <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
          Processing
        </span>
      );

    case "Shipped":
      return (
        <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
          <Truck className="w-3.5 h-3.5" />
          Shipped
        </span>
      );

    case "Pending":
      return (
        <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800">
          <Clock className="w-3.5 h-3.5" />
          Pending
        </span>
      );

    default:
      return (
        <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-850 dark:text-slate-400">
          <XCircle className="w-3.5 h-3.5" />
          Cancelled
        </span>
      );
  }
}
