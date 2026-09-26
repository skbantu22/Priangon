"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Search } from "lucide-react";

import { ADMIN_REPORT, ADMIN_REPORT_DUE, ADMIN_REPORT_PROFIT_LOSS } from "@/Route/Adminpannelroute";
import { inputClass } from "@/components/ui/Application/Admin/supplier/supplierKit";

// pages outside the report engine that belong in these groups
const EXTRA = {
  "Customer Report": [["Due Report (customers & suppliers)", ADMIN_REPORT_DUE]],
  "Profit Loss Report": [["Profit & Loss (with chart)", ADMIN_REPORT_PROFIT_LOSS]],
};

const tile =
  "flex min-h-[40px] items-center border border-[#00801a] bg-white px-[12px] py-[8px] text-[14px] text-[#464646] no-underline transition hover:bg-[#00801a] hover:font-bold hover:text-white dark:bg-card dark:text-foreground";

/** "All Reports", laid out like 360's: a search on top and every report as a tile, grouped */
export default function AllReportsPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    axios
      .get("/api/reports/list")
      .then(({ data: res }) => setData(res.success ? res : { data: [], groups: [] }))
      .catch(() => setData({ data: [], groups: [] }));
  }, []);

  const term = q.trim().toLowerCase();
  const reports = data?.data || [];

  const groups = (data?.groups || [])
    .map((group) => [
      group,
      [
        ...reports.filter((r) => r.group === group).map((r) => [r.title, ADMIN_REPORT(r.key)]),
        ...(EXTRA[group] || []),
      ].filter(([label]) => label.toLowerCase().includes(term)),
    ])
    .filter(([, items]) => items.length);

  const first = groups[0]?.[1][0];

  return (
    <div className="space-y-[18px]">
      <div className="bg-[linear-gradient(135deg,#f3fbf5,#e7f5ea)] px-[16px] pb-[18px] pt-[16px] text-center dark:bg-none dark:bg-muted">
        <h1 className="m-0 text-[24px] font-semibold text-[#343a40] dark:text-foreground">All Reports</h1>
        <div className="relative mx-auto mt-[12px] w-full max-w-[560px]">
          <Search size={16} className="pointer-events-none absolute left-[12px] top-1/2 -translate-y-1/2 text-[#343a40]" />
          <input
            className={`${inputClass} !h-[42px] !pl-[36px] !text-[14px]`}
            placeholder="Search reports"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && first) router.push(first[1]);
            }}
            aria-label="Search reports"
          />
        </div>
      </div>

      <section className="overflow-hidden border border-[#e6ebf1] bg-white shadow-sm dark:border-border dark:bg-card">
        {!data &&
          [1, 2, 3].map((n) => (
            <div key={n} className="m-[16px] h-[60px] animate-pulse bg-slate-100 dark:bg-muted" />
          ))}
        {groups.map(([group, items]) => (
          <div key={group}>
            <h2 className="m-0 bg-[#f5f5f5] px-[20px] py-[8px] text-[16px] font-semibold text-[#343a40] dark:bg-muted dark:text-foreground">{group}</h2>
            <div className="grid grid-cols-1 gap-[12px] p-[16px] sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-6">
              {items.map(([label, href]) => (
                <Link key={group + label} href={href} className={tile}>
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ))}
        {data && !groups.length && <p className="py-[30px] text-center text-[#6c757d]">No report matches &quot;{q}&quot;.</p>}
      </section>
    </div>
  );
}
