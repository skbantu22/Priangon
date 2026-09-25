"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { FileText } from "lucide-react";

import { ADMIN_REPORT, ADMIN_REPORT_DUE, ADMIN_REPORT_PROFIT_LOSS } from "@/Route/Adminpannelroute";
import { ListCard } from "@/components/ui/Application/Admin/listKit";

const tile =
  "flex items-center gap-2 border border-[#e6ebf1] bg-white px-[14px] py-[12px] text-[14px] font-medium text-[#212529] no-underline transition hover:border-[#188ae2] hover:text-[#188ae2] dark:border-border dark:bg-card dark:text-foreground";

/** "All Reports": every report this login may open, grouped like 360's */
export default function AllReportsPage() {
  const [reports, setReports] = useState(null);

  useEffect(() => {
    axios
      .get("/api/reports/list")
      .then(({ data }) => setReports(data.success ? data.data : []))
      .catch(() => setReports([]));
  }, []);

  const groups = [];
  for (const report of reports || []) {
    const group = groups.find(([name]) => name === report.group);
    if (group) group[1].push(report);
    else groups.push([report.group, [report]]);
  }

  return (
    <ListCard title="All Reports">
      {!reports && (
        <div className="grid gap-[8px] sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="h-[46px] animate-pulse bg-slate-100 dark:bg-muted" />
          ))}
        </div>
      )}

      {reports && !reports.length && <p className="m-0 text-[14px] text-muted-foreground">No reports are open to this login.</p>}

      <div className="space-y-[22px]">
        {groups.map(([group, items]) => (
          <section key={group}>
            <h2 className="m-0 mb-[10px] text-[15px] font-semibold text-[#1f2933] dark:text-foreground">{group}</h2>
            <div className="grid gap-[8px] sm:grid-cols-2 lg:grid-cols-3">
              {items.map((r) => (
                <Link key={r.key} href={ADMIN_REPORT(r.key)} className={tile}>
                  <FileText size={15} className="shrink-0 text-[#00801a]" /> {r.title}
                </Link>
              ))}
              {group === "Contacts" && (
                <Link href={ADMIN_REPORT_DUE} className={tile}>
                  <FileText size={15} className="shrink-0 text-[#00801a]" /> Due Report (customers &amp; suppliers)
                </Link>
              )}
              {group === "Money" && (
                <Link href={ADMIN_REPORT_PROFIT_LOSS} className={tile}>
                  <FileText size={15} className="shrink-0 text-[#00801a]" /> Profit &amp; Loss (with showroom and chart)
                </Link>
              )}
            </div>
          </section>
        ))}
      </div>
    </ListCard>
  );
}
