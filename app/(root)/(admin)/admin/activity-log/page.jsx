"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Eye, History, RotateCcw, Search } from "lucide-react";

import { showToast } from "@/lib/showToast";
import {
  ExportButtons,
  ListCard,
  Pagination,
  btn,
  exportExcel,
  exportPdf,
  inputClass,
  printTable,
  tdClass,
  thClass,
  theadRow,
} from "@/components/ui/Application/Admin/supplier/supplierKit";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const EMPTY = { userId: "", module: "", action: "", from: "", to: "", search: "" };

const ACTION_TONE = { created: "bg-[#10a54a]", updated: "bg-[#188ae2]", deleted: "bg-[#e5484d]" };
const ACTIONS = [
  ["", "Everything"],
  ["created", "Created"],
  ["updated", "Updated"],
  ["deleted", "Deleted"],
];

const fmtTime = (value) => {
  const d = new Date(value);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

// "purchaseNumber" -> "Purchase Number", "supplierId" -> "Supplier"
const nice = (key) =>
  key
    .replace(/Id$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());

const show = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const describe = (r) => `${r.module}${r.label ? ` ${r.label}` : ""} ${r.action}`;

/** Activity Log, like 360's: who created, changed or deleted what, with the before/after */
export default function ActivityLogPage() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, pages: 1, from: 0 });
  const [modules, setModules] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState(null);

  const [filters, setFilters] = useState(EMPTY);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState("25");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim() !== filters.search) {
        setPage(1);
        setFilters((f) => ({ ...f, search: search.trim() }));
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [search, filters.search]);

  const params = useCallback(
    (extra) => ({ ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), ...extra }),
    [filters],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/activity-logs", { params: params({ page, limit }) });
      if (!data.success) return showToast("error", data.message || "Could not load the activity log");
      setRows(data.data);
      setModules(data.modules);
      setUsers(data.users);
      setMeta({ total: data.total, pages: data.pages, from: data.from });
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not load the activity log");
    } finally {
      setLoading(false);
    }
  }, [params, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (key) => (value) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  };

  const reset = () => {
    setFilters(EMPTY);
    setSearch("");
    setPage(1);
  };

  const filtered = Object.values(filters).some(Boolean);

  const withAllRows = async (handle) => {
    setBusy(true);
    try {
      const all = [];
      for (let p = 1; p <= 20; p++) {
        const { data } = await axios.get("/api/activity-logs", { params: params({ page: p, limit: 500 }) });
        if (!data.success) throw new Error(data.message);
        all.push(...data.data);
        if (!data.hasMore) break;
      }
      await handle(all.map((r, i) => [i + 1, r.userName || "System", r.module, describe(r), r.action, fmtTime(r.createdAt)]));
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message || "Could not export");
    } finally {
      setBusy(false);
    }
  };

  const COLUMNS = ["SL", "User", "Module", "Details", "Action", "Date"];

  return (
    <ListCard title="Activity Logs">
      <div className="grid grid-cols-2 gap-[12px] bg-[#f4f6f8] p-[14px] md:grid-cols-4 xl:grid-cols-[90px_1.2fr_1.2fr_140px_140px_1.4fr_auto] xl:items-end dark:bg-muted">
        <label className="text-[13px] font-medium">
          Per Page
          <select
            value={limit}
            onChange={(e) => {
              setLimit(e.target.value);
              setPage(1);
            }}
            className={`${inputClass} mt-1`}
          >
            {["25", "50", "100"].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[13px] font-medium">
          User
          <select value={filters.userId} onChange={(e) => set("userId")(e.target.value)} className={`${inputClass} mt-1`}>
            <option value="">All Users</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[13px] font-medium">
          Module
          <select value={filters.module} onChange={(e) => set("module")(e.target.value)} className={`${inputClass} mt-1`}>
            <option value="">All Modules</option>
            {modules.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[13px] font-medium">
          From Date
          <input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => set("from")(e.target.value)} className={`${inputClass} mt-1`} />
        </label>
        <label className="text-[13px] font-medium">
          To Date
          <input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => set("to")(e.target.value)} className={`${inputClass} mt-1`} />
        </label>
        <label className="col-span-2 text-[13px] font-medium md:col-span-1">
          Search
          <span className="relative mt-1 block">
            <Search size={15} className="pointer-events-none absolute left-[10px] top-1/2 -translate-y-1/2 text-[#8a939c]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Invoice no, name…" className={`${inputClass} !pl-[32px]`} />
          </span>
        </label>
        <button type="button" onClick={reset} disabled={!filtered && !search} className={`${btn.danger} col-span-2 !h-[38px] md:col-span-1`}>
          <RotateCcw size={14} /> Reset
        </button>
      </div>

      <div className="mt-[10px] flex flex-wrap items-center gap-[6px] text-[13px]">
        <span className="text-[#6b7785]">Show:</span>
        {ACTIONS.map(([value, text]) => (
          <button
            key={text}
            type="button"
            onClick={() => set("action")(value)}
            className={`border px-[10px] py-[4px] transition-colors ${
              filters.action === value ? "border-[#188ae2] bg-[#188ae2] text-white" : "border-[#dfe3e8] bg-white text-[#3b4652] hover:border-[#188ae2] dark:bg-transparent dark:text-foreground"
            }`}
          >
            {text}
          </button>
        ))}
        <div className="ml-auto">
          <ExportButtons
            disabled={busy || !rows.length}
            onPdf={() => withAllRows((body) => exportPdf("Activity Log Report", COLUMNS, body))}
            onExcel={() => withAllRows((body) => exportExcel("ActivityLog.xlsx", COLUMNS, body))}
            onPrint={() =>
              withAllRows((body) => {
                if (!printTable("Activity Log Report", COLUMNS, body)) showToast("error", "Allow pop-ups to print");
              })
            }
          />
        </div>
      </div>

      <div className="mt-[14px] overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className={theadRow}>
              {["SL", "User", "Module", "Details", "Action", "Date", "View"].map((h) => (
                <th key={h} className={thClass}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading &&
              [1, 2, 3, 4].map((n) => (
                <tr key={n}>
                  <td colSpan={7} className={tdClass}>
                    <div className="h-5 animate-pulse bg-slate-100 dark:bg-muted" />
                  </td>
                </tr>
              ))}
            {!loading && !rows.length && (
              <tr>
                <td colSpan={7} className={tdClass}>
                  <div className="flex flex-col items-center gap-[6px] py-[30px] text-center">
                    <History size={26} className="text-[#b5c0ca]" />
                    <p className="m-0 text-[15px]">{filtered ? "No activity matches these filters" : "No activity recorded yet"}</p>
                  </div>
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((r, i) => (
                <tr key={r._id} className={`${i % 2 ? "" : "bg-[#f8fafb] dark:bg-muted/40"} hover:bg-[#eef6fd] dark:hover:bg-muted`}>
                  <td className={tdClass}>{meta.from + i}</td>
                  <td className={tdClass}>
                    {r.userName || <span className="text-[#8a939c]">System</span>}
                    {r.role && <span className="block text-[11px] capitalize text-[#8a939c]">{r.role}</span>}
                  </td>
                  <td className={tdClass}>
                    <span className="whitespace-nowrap bg-[#35b8e0] px-[6px] py-[2px] text-[12.5px] font-semibold text-white">{r.module}</span>
                  </td>
                  <td className={tdClass}>{describe(r)}</td>
                  <td className={tdClass}>
                    <span className={`px-[6px] py-[2px] text-[12.5px] font-semibold capitalize text-white ${ACTION_TONE[r.action]}`}>{r.action}</span>
                  </td>
                  <td className={`${tdClass} whitespace-nowrap`}>{fmtTime(r.createdAt)}</td>
                  <td className={`${tdClass} text-center`}>
                    <button type="button" onClick={() => setViewing(r)} aria-label={`View ${describe(r)}`} className="text-[#188ae2] hover:text-[#1379c7]">
                      <Eye size={17} />
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pages={meta.pages} from={meta.from} count={rows.length} total={meta.total} onPage={setPage} />

      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        {viewing && <Details key={viewing._id} log={viewing} />}
      </Dialog>
    </ListCard>
  );
}

function Details({ log }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    axios
      .get(`/api/activity-logs/${log._id}`)
      .then(({ data: res }) => setData(res.success ? res.data : { changes: {} }))
      .catch(() => setData({ changes: {} }));
  }, [log._id]);

  const oldV = data?.changes?.old || {};
  const newV = data?.changes?.new || {};
  const keys = [...new Set([...Object.keys(oldV), ...Object.keys(newV)])].filter((k) => k !== "_id");
  const changed = log.action === "updated";

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{describe(log)}</DialogTitle>
        <DialogDescription>
          {log.module} · by {log.userName || "System"} · {fmtTime(log.createdAt)}
        </DialogDescription>
      </DialogHeader>
      {!data ? (
        [1, 2, 3].map((n) => <div key={n} className="h-7 animate-pulse bg-slate-100 dark:bg-muted" />)
      ) : !keys.length ? (
        <p className="m-0 text-[14px] text-muted-foreground">No details were recorded.</p>
      ) : (
        <table className="w-full border-collapse text-[13.5px]">
          <thead>
            <tr className="bg-[#f3f6f9] text-left dark:bg-muted [&>th]:border [&>th]:px-[8px] [&>th]:py-[7px]">
              <th className="w-[28%]">Field</th>
              {changed ? (
                <>
                  <th>Before</th>
                  <th>After</th>
                </>
              ) : (
                <th>{log.action === "deleted" ? "Deleted value" : "Value"}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k} className="[&>td]:border [&>td]:px-[8px] [&>td]:py-[6px] [&>td]:align-top">
                <td className="font-medium">{nice(k)}</td>
                {changed ? (
                  <>
                    <td className="break-all bg-[#fff5f5] text-[#b42318] dark:bg-red-500/10">{show(oldV[k])}</td>
                    <td className="break-all bg-[#f0fbf4] text-[#067647] dark:bg-emerald-500/10">{show(newV[k])}</td>
                  </>
                ) : (
                  <td className="break-all">{show(log.action === "deleted" ? oldV[k] : newV[k])}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </DialogContent>
  );
}
